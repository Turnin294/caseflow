#!/usr/bin/env node
// =============================================================
// PreToolUse hook: 写源码前检查是否存在设计文档
//
// 触发时机: matcher = "Write|Edit|MultiEdit"，且目标文件后缀属于源码扩展名集合
//
// 项目根识别（v1.30.3 修复 monorepo / Maven 多模块）：
//   1) 优先全程向上查找 `.git`（含 worktree 的 .git 文件），命中即返回该目录 —— 这是 git 仓库根，
//      在 Maven 多模块 / npm monorepo / 单仓多语言项目中保证不会被子模块的 pom.xml / package.json
//      过早截胡（旧实现会把 tools/tool-treesize/pom.xml 当作项目根，导致去找
//      ai-docs/tool-treesize 而不是 ai-docs/<repo-name>）。
//   2) 找不到 .git 时，再按构建文件标记找第一个匹配（向后兼容）：
//      pom.xml / build.gradle{.kts} / package.json / pubspec.yaml /
//      Cargo.toml / go.mod / pyproject.toml / setup.py / Gemfile / composer.json
//   3) 仍找不到时退回 payload.cwd
//
// 项目名覆盖：
//   若 projectRoot 下存在 `.team-standards-project.json` 且含 `aiDocsProject` 字段，
//   则用该值作为 ai-docs 子目录名，解决「git 仓名 ≠ ai-docs 子目录名」的情况
//   （例如仓库叫 my-tools，但文档集中放在 ai-docs/kai-toolbox/ 下）。
//
// 检查路径(命中任一即放行):
//   <projectRoot>/docs/design/**/*.md
//   <projectRoot>/docs/**/{design,设计}*.md
//   <USER_HOME>/Documents/ai-docs/<projectName>/design/**/*.md (Windows/macOS)
//   <USER_HOME>/ai-docs/<projectName>/design/**/*.md (Linux 兜底)
//   <projectName> = .team-standards-project.json#aiDocsProject ?? path.basename(projectRoot)
//
// 不触发(放行,不检查):
//   - 非源码扩展名 (.md / .json / .yml / .yaml / .lock / .gitignore / .txt / .toml)
//   - 测试文件 (路径含 /test/ / /tests/ / __tests__ / 文件名 *_test.ext / *.test.ext / *.spec.ext)
//   - 配置/脚本 (.sh / .cmd / .bat / .ps1 / Dockerfile / Makefile / *.yml)
//   - hidden 文件 (以 . 开头)
//
// 旁路:
//   环境变量 TEAM_STANDARDS_DESIGN_DOC_HOOK=off 一次性禁用
//
// 退出码:
//   0 = 放行
//   2 = 阻断,stderr 内容回灌给 Claude
// =============================================================

const fs = require('fs');
const path = require('path');
const os = require('os');

if ((process.env.TEAM_STANDARDS_DESIGN_DOC_HOOK || '').toLowerCase() === 'off') {
  process.exit(0);
}

const SOURCE_EXTS = new Set([
  '.dart', '.java', '.kt', '.kts',
  '.ts', '.tsx', '.js', '.jsx',
  '.py', '.go', '.rs', '.rb', '.php',
  '.swift', '.m', '.mm', '.c', '.cc', '.cpp', '.h', '.hpp',
  '.scala', '.clj', '.cljs', '.ex', '.exs',
  '.vue',
]);

const TEST_PATH_PATTERNS = [
  /[\/](test|tests|__tests__|spec)[\/]/i,
  /(_test|\.test|\.spec)\.[a-z]+$/i,
];

// 构建文件标记。仅在 `.git` 未命中时作为回退使用。
const BUILD_FILE_MARKERS = [
  'pom.xml', 'build.gradle', 'build.gradle.kts',
  'package.json', 'pubspec.yaml', 'Cargo.toml', 'go.mod',
  'pyproject.toml', 'setup.py', 'Gemfile', 'composer.json',
];

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { raw += chunk; });
process.stdin.on('end', () => {
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (e) {
    process.exit(0);
  }

  const toolName = payload.tool_name;
  if (toolName !== 'Write' && toolName !== 'Edit' && toolName !== 'MultiEdit') {
    process.exit(0);
  }

  const filePath = payload.tool_input && payload.tool_input.file_path;
  if (!filePath || typeof filePath !== 'string') {
    process.exit(0);
  }

  if (!isSourceFile(filePath)) {
    process.exit(0);
  }
  if (isTestOrConfigFile(filePath)) {
    process.exit(0);
  }

  const projectRoot = findProjectRoot(filePath) || payload.cwd || process.cwd();
  const projectName = resolveProjectName(projectRoot);

  if (hasDesignDoc(projectRoot, projectName)) {
    process.exit(0);
  }

  const overridden = projectName !== path.basename(projectRoot);
  process.stderr.write(
`[team-standards] 即将编辑源码文件，但未检测到设计文档。

目标文件：${filePath}
推断的项目根：${projectRoot}
ai-docs 子目录名：${projectName}${overridden ? '（来自 .team-standards-project.json）' : ''}

未在以下任一位置找到设计文档：
  • ${path.join(projectRoot, 'docs', 'design')}
  • ${path.join(os.homedir(), 'Documents', 'ai-docs', projectName, 'design')}
  • ${path.join(os.homedir(), 'ai-docs', projectName, 'design')}

请先触发 design-doc-required skill 生成或确认设计文档（极简改动可走「极简跳过」硬清单）。
若 git 仓名与 ai-docs 子目录名不一致（monorepo 文档集中存放场景），
请在项目根创建 .team-standards-project.json：
  {"aiDocsProject": "<ai-docs 下的子目录名>"}

若本次确为极简改动且确认跳过，可设置环境变量绕过本次会话：
  PowerShell: $env:TEAM_STANDARDS_DESIGN_DOC_HOOK = 'off'
  bash/zsh:   export TEAM_STANDARDS_DESIGN_DOC_HOOK=off

模板：参考 skills/design-doc-required/{lightweight-template.md, template.md}
`);
  process.exit(2);
});

/**
 * 从目标文件路径向上查找项目根。
 * 优先策略：全程向上查找 `.git`（git 文件或目录均可），命中即返回该目录。
 * 这样 Maven 多模块 / monorepo 下不会被深层子模块的构建文件过早截胡。
 * 回退策略：未找到 `.git` 时，再走构建文件标记。
 * 跨平台：使用 path.parse(dir).root 作为停止条件（Windows 'C:\\' / POSIX '/'）。
 */
function findProjectRoot(filePath) {
  const startDir = path.dirname(filePath);
  const fsRoot = path.parse(startDir).root;

  let cursor = startDir;
  while (cursor && cursor !== fsRoot) {
    try {
      if (fs.existsSync(path.join(cursor, '.git'))) {
        return cursor;
      }
    } catch (e) { /* skip */ }
    const parent = path.dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }

  cursor = startDir;
  while (cursor && cursor !== fsRoot) {
    for (const marker of BUILD_FILE_MARKERS) {
      try {
        if (fs.existsSync(path.join(cursor, marker))) {
          return cursor;
        }
      } catch (e) { /* skip */ }
    }
    const parent = path.dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }
  return null;
}

/**
 * 解析 ai-docs 子目录名。优先读取 projectRoot/.team-standards-project.json#aiDocsProject，
 * 没有则用 path.basename(projectRoot)。
 */
function resolveProjectName(projectRoot) {
  const overrideFile = path.join(projectRoot, '.team-standards-project.json');
  try {
    if (fs.existsSync(overrideFile)) {
      const cfg = JSON.parse(fs.readFileSync(overrideFile, 'utf8'));
      if (cfg && typeof cfg.aiDocsProject === 'string' && cfg.aiDocsProject.trim()) {
        return cfg.aiDocsProject.trim();
      }
    }
  } catch (e) { /* 损坏的 JSON：忽略，退回默认 */ }
  return path.basename(projectRoot);
}

function isSourceFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return SOURCE_EXTS.has(ext);
}

function isTestOrConfigFile(filePath) {
  const base = path.basename(filePath);
  if (base.startsWith('.')) return true;
  if (/^(Dockerfile|Makefile|CMakeLists\.txt)$/i.test(base)) return true;
  for (const re of TEST_PATH_PATTERNS) {
    if (re.test(filePath)) return true;
  }
  return false;
}

function hasDesignDoc(projectRoot, projectName) {
  const projectPaths = [
    path.join(projectRoot, 'docs', 'design'),
  ];
  for (const p of projectPaths) {
    if (dirHasMarkdown(p, /\.md$/i)) return true;
  }

  if (dirHasMarkdownRecursive(path.join(projectRoot, 'docs'), /design|设计/i, 2)) return true;

  const userHome = os.homedir();
  if (!userHome) return false;

  const userPaths = [
    path.join(userHome, 'Documents', 'ai-docs', projectName, 'design'),
    path.join(userHome, 'ai-docs', projectName, 'design'),
  ];
  for (const p of userPaths) {
    if (dirHasMarkdownRecursive(p, /\.md$/i, 3)) return true;
  }

  return false;
}

function dirHasMarkdown(dir, namePattern) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return false;
  }
  for (const entry of entries) {
    if (entry.isFile() && namePattern.test(entry.name)) return true;
  }
  return false;
}

function dirHasMarkdownRecursive(dir, namePattern, maxDepth) {
  if (maxDepth < 0) return false;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return false;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isFile() && entry.name.endsWith('.md') && (namePattern.test(entry.name) || namePattern.test(dir))) {
      return true;
    }
    if (entry.isDirectory()) {
      if (dirHasMarkdownRecursive(full, namePattern, maxDepth - 1)) return true;
    }
  }
  return false;
}
