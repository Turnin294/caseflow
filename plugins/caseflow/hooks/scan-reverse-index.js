#!/usr/bin/env node
/**
 * scan-reverse-index.js — V1 反向索引冷启动扫描器
 *
 * 配套 skill: reverse-index-required
 * 范围: 扫描 Java / Dart / TypeScript 项目源码,产出 states.md 反向索引;
 *      fields.md / events.md / apis.md 仅生成空模板(后两者需语义理解,扫描器 V1 不覆盖)
 *
 * 用法:
 *   node hooks/scan-reverse-index.js --project=. --output=./docs/knowledge-graph/reverse-index/
 *   node hooks/scan-reverse-index.js --project=. --output=user-candidates
 *   node hooks/scan-reverse-index.js --project=. --lang=java
 *
 * 限制:
 * - 基于正则 + 行级上下文,不做 AST 解析
 * - 漏识别: 动态枚举 / 配置文件中的字面量 / 跨文件继承的枚举
 * - 假阳性: 字面字符串与枚举值同名时会误报(标注为"候选,需人工确认")
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

// ======================================================================
// CLI 参数解析
// ======================================================================

function parseArgs(argv) {
  const args = { project: '.', output: './docs/knowledge-graph/reverse-index/', lang: 'all' };
  for (const a of argv.slice(2)) {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) args[m[1]] = m[2];
    else if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

function printHelp() {
  console.log(`scan-reverse-index.js — 反向索引冷启动扫描器

用法:
  node hooks/scan-reverse-index.js [--project=PATH] [--output=PATH|user-candidates] [--lang=java|dart|ts|all]

选项:
  --project   被扫描项目根目录(默认 ".")
  --output    输出目录;特殊值 "user-candidates" 写入用户文档目录候选池
  --lang      限定语言: java / dart / ts / all (默认 all)
  -h, --help  打印帮助
`);
}

// ======================================================================
// 文件遍历
// ======================================================================

const SKIP_DIRS = new Set([
  'node_modules', '.git', '.dart_tool', '.idea', '.vscode',
  'build', 'dist', 'target', 'out', '.gradle', '.next',
  'coverage', '__pycache__', '.pytest_cache'
]);

const LANG_EXT = {
  java: ['.java'],
  dart: ['.dart'],
  ts:   ['.ts', '.tsx']
};

function* walk(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch (e) { return; }
  for (const e of entries) {
    if (e.name.startsWith('.') && SKIP_DIRS.has(e.name)) continue;
    if (SKIP_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (e.isFile()) yield full;
  }
}

function getLang(file) {
  const ext = path.extname(file);
  for (const [lang, exts] of Object.entries(LANG_EXT)) {
    if (exts.includes(ext)) return lang;
  }
  return null;
}

// ======================================================================
// 枚举定义抽取
// ======================================================================

/**
 * 抽取一个文件中所有 enum 定义。
 * 返回 [{ name, values: [{name, line}], file, defLine }]
 */
function extractEnums(file, content, lang) {
  const enums = [];
  const lines = content.split(/\r?\n/);

  if (lang === 'java') {
    // Java: enum X { A, B, C(args), D; ... }
    const enumStart = /^(?:public|private|protected|static|\s)*enum\s+(\w+)\s*(?:implements\s+[\w<>,\s]+)?\s*\{/;
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(enumStart);
      if (!m) continue;
      const enumName = m[1];
      const values = [];
      // 收集到第一个 ; 或 }
      let depth = 0;
      let collecting = true;
      for (let j = i; j < lines.length && collecting; j++) {
        const ln = lines[j];
        for (const ch of ln) {
          if (ch === '{') depth++;
          else if (ch === '}') depth--;
        }
        // 提取标识符 (常量值): 大写开头的 identifier 后跟 , 或 ; 或 ( 或 行尾
        // 先剥离字符串/注释
        const stripped = ln
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\/\/.*$/, '')
          .replace(/"[^"\\]*(?:\\.[^"\\]*)*"/g, '');
        const valRegex = /\b([A-Z][A-Z0-9_]{1,})\b(?=\s*[,;(\s]|$)/g;
        let vm;
        while ((vm = valRegex.exec(stripped)) !== null) {
          // 跳过定义行本身
          if (j === i && vm.index < ln.indexOf('{')) continue;
          values.push({ name: vm[1], line: j + 1 });
        }
        if (depth === 0 && j > i) collecting = false;
        if (ln.includes(';') && j > i) collecting = false;
      }
      // 去重(同一行可能多次匹配大写常量)
      const seen = new Set();
      const dedup = [];
      for (const v of values) {
        const key = `${v.name}@${v.line}`;
        if (!seen.has(key)) { seen.add(key); dedup.push(v); }
      }
      enums.push({ name: enumName, values: dedup, file, defLine: i + 1, lang });
    }
  } else if (lang === 'dart') {
    // Dart: enum X { a, b, c }   或   enum X { a('label'), b('label2'); ... }
    const enumStart = /^\s*enum\s+(\w+)\s*(?:<[^>]+>)?\s*(?:implements\s+[\w<>,\s]+)?\s*\{/;
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(enumStart);
      if (!m) continue;
      const enumName = m[1];
      const values = [];
      let depth = 0;
      let collecting = true;
      for (let j = i; j < lines.length && collecting; j++) {
        const ln = lines[j];
        for (const ch of ln) {
          if (ch === '{') depth++;
          else if (ch === '}') depth--;
        }
        const stripped = ln
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\/\/.*$/, '')
          .replace(/'[^'\\]*(?:\\.[^'\\]*)*'/g, '')
          .replace(/"[^"\\]*(?:\\.[^"\\]*)*"/g, '');
        // Dart 枚举值: 小驼峰
        const valRegex = /\b([a-z][A-Za-z0-9_]*)\b(?=\s*[,;(\s]|$)/g;
        let vm;
        while ((vm = valRegex.exec(stripped)) !== null) {
          if (j === i && vm.index < ln.indexOf('{')) continue;
          // 过滤 dart 关键字
          if (['if', 'for', 'while', 'return', 'this', 'super', 'final', 'const', 'var', 'true', 'false', 'null', 'enum', 'class', 'implements', 'extends', 'with'].includes(vm[1])) continue;
          values.push({ name: vm[1], line: j + 1 });
        }
        if (depth === 0 && j > i) collecting = false;
      }
      const seen = new Set();
      const dedup = [];
      for (const v of values) {
        const key = `${v.name}@${v.line}`;
        if (!seen.has(key)) { seen.add(key); dedup.push(v); }
      }
      enums.push({ name: enumName, values: dedup, file, defLine: i + 1, lang });
    }
  } else if (lang === 'ts') {
    // TS: enum X { A, B = 'b', C }   或   const enum
    const enumStart = /^\s*(?:export\s+)?(?:const\s+)?enum\s+(\w+)\s*\{/;
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(enumStart);
      if (!m) continue;
      const enumName = m[1];
      const values = [];
      let depth = 0;
      let collecting = true;
      for (let j = i; j < lines.length && collecting; j++) {
        const ln = lines[j];
        for (const ch of ln) {
          if (ch === '{') depth++;
          else if (ch === '}') depth--;
        }
        const stripped = ln
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\/\/.*$/, '')
          .replace(/'[^'\\]*(?:\\.[^'\\]*)*'/g, '')
          .replace(/"[^"\\]*(?:\\.[^"\\]*)*"/g, '');
        const valRegex = /\b([A-Za-z_][A-Za-z0-9_]*)\b(?=\s*[=,}\s])/g;
        let vm;
        while ((vm = valRegex.exec(stripped)) !== null) {
          if (j === i) continue;
          if (['enum', 'const', 'export', 'as'].includes(vm[1])) continue;
          values.push({ name: vm[1], line: j + 1 });
        }
        if (depth === 0 && j > i) collecting = false;
      }
      const seen = new Set();
      const dedup = [];
      for (const v of values) {
        const key = `${v.name}@${v.line}`;
        if (!seen.has(key)) { seen.add(key); dedup.push(v); }
      }
      enums.push({ name: enumName, values: dedup, file, defLine: i + 1, lang });
    }
  }

  return enums;
}

// ======================================================================
// 枚举使用点扫描
// ======================================================================

/**
 * 在所有源码文件中搜索 EnumName.VALUE 引用,并分类上下文。
 */
function scanUsages(allEnums, allSourceFiles, projectRoot) {
  const results = []; // {enum, value, file, line, context, snippet}

  // 构建 enum 名 → values 的反查
  const enumByName = new Map();
  for (const e of allEnums) enumByName.set(e.name, e);

  for (const file of allSourceFiles) {
    let content;
    try { content = fs.readFileSync(file, 'utf8'); }
    catch (e) { continue; }
    const lines = content.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];

      // 1) EnumName.VALUE 形式(Java/Dart/TS 通用)
      const refRegex = /\b([A-Z][A-Za-z0-9_]*)\s*\.\s*([A-Za-z_][A-Za-z0-9_]*)\b/g;
      let m;
      while ((m = refRegex.exec(ln)) !== null) {
        const enumName = m[1];
        const valueName = m[2];
        const e = enumByName.get(enumName);
        if (!e) continue;
        if (!e.values.find(v => v.name === valueName)) continue;
        // 排除 enum 定义文件自身
        if (path.resolve(file) === path.resolve(e.file)) continue;

        const ctx = classifyContext(lines, i);
        results.push({
          enum: enumName,
          value: valueName,
          file: path.relative(projectRoot, file),
          line: i + 1,
          context: ctx.kind,
          snippet: ctx.snippet
        });
      }

      // 2) SQL 字符串字面量内的枚举值(候选,标 needsReview)
      const sqlLit = /['"]([A-Z][A-Z0-9_]{2,})['"]/g;
      let sm;
      while ((sm = sqlLit.exec(ln)) !== null) {
        const litVal = sm[1];
        // 看 SQL 上下文(WHERE / IN / SELECT)
        if (!/\b(where|WHERE|in|IN|select|SELECT|status|state|type)\b/.test(ln)) continue;
        // 找哪个 enum 含此值
        for (const e of allEnums) {
          if (e.lang !== 'java' && e.lang !== 'dart' && e.lang !== 'ts') continue;
          if (e.values.find(v => v.name === litVal)) {
            results.push({
              enum: e.name,
              value: litVal,
              file: path.relative(projectRoot, file),
              line: i + 1,
              context: 'sql-literal',
              snippet: ln.trim().slice(0, 120),
              needsReview: true
            });
            break;
          }
        }
      }
    }
  }

  return results;
}

/**
 * 根据当前行附近上下文,分类判断点种类。
 */
function classifyContext(lines, idx) {
  const ln = lines[idx];
  const around = (lines[idx - 1] || '') + ' ' + ln + ' ' + (lines[idx + 1] || '');

  if (/\bcase\s/.test(ln)) return { kind: 'switch-case', snippet: ln.trim().slice(0, 120) };
  if (/==\s*[A-Z][\w.]*$/.test(ln) || /==\s*[A-Z][\w.]*\s*[)&|]/.test(ln) ||
      /\b(if|while)\s*\([^)]*==/.test(around)) return { kind: 'equality-check', snippet: ln.trim().slice(0, 120) };
  if (/\.equals\s*\(/.test(ln)) return { kind: 'equals-call', snippet: ln.trim().slice(0, 120) };
  if (/\bif\s*\(/.test(around)) return { kind: 'if-condition', snippet: ln.trim().slice(0, 120) };
  if (/\b(return|=)\s/.test(ln)) return { kind: 'assignment', snippet: ln.trim().slice(0, 120) };
  return { kind: 'reference', snippet: ln.trim().slice(0, 120) };
}

// ======================================================================
// 输出 markdown
// ======================================================================

const CONTEXT_LABEL = {
  'switch-case': 'switch case',
  'equality-check': 'if/== 比较',
  'equals-call': '.equals() 调用',
  'if-condition': 'if 分支',
  'assignment': '赋值/返回',
  'reference': '引用',
  'sql-literal': 'SQL 字面量(候选,需人工确认)'
};

function renderStatesMd(allEnums, usages, projectName, scanInfo) {
  const lines = [];
  lines.push(`# ${projectName} 状态/枚举反向索引`);
  lines.push('');
  lines.push(`> 由 \`reverse-index-required\` skill + \`hooks/scan-reverse-index.js\` 自动生成。`);
  lines.push(`> 维护规则: 每次新增 / 删除 / 修改枚举值时,**同回合**回写本表。`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // 按 enum 名排序
  const sortedEnums = [...allEnums].sort((a, b) => a.name.localeCompare(b.name));

  for (const e of sortedEnums) {
    lines.push(`## ${e.name} (${e.lang})`);
    lines.push('');
    lines.push(`定义位置: \`${path.relative(scanInfo.projectRoot, e.file)}:${e.defLine}\``);
    lines.push('');
    lines.push('枚举值清单:');
    lines.push('');
    lines.push('| 枚举值 | 定义行 |');
    lines.push('|---|---|');
    for (const v of e.values) lines.push(`| ${v.name} | ${v.line} |`);
    lines.push('');

    // 该 enum 的所有使用点
    const usagesForEnum = usages.filter(u => u.enum === e.name);
    if (usagesForEnum.length === 0) {
      lines.push('> 未发现外部判断点(可能未被引用,或扫描器漏识别)');
      lines.push('');
      continue;
    }

    lines.push('判断点反向索引:');
    lines.push('');
    lines.push('| 枚举值 | 判断点(file:line) | 上下文类型 | 代码片段 | 业务语义(需人工补) | 新增态时是否需要补判断(需人工补) | 候选? |');
    lines.push('|---|---|---|---|---|---|---|');

    // 按 value 分组,按 file:line 排序
    usagesForEnum.sort((a, b) => {
      if (a.value !== b.value) return a.value.localeCompare(b.value);
      if (a.file !== b.file) return a.file.localeCompare(b.file);
      return a.line - b.line;
    });

    for (const u of usagesForEnum) {
      const review = u.needsReview ? '⚠️ 候选' : '';
      const snippet = u.snippet.replace(/\|/g, '\\|');
      lines.push(`| ${u.value} | \`${u.file}:${u.line}\` | ${CONTEXT_LABEL[u.context] || u.context} | \`${snippet}\` |  |  | ${review} |`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('## 维护元数据');
  lines.push('');
  lines.push('```yaml');
  lines.push(`last_scanned_at: ${scanInfo.scannedAt}`);
  lines.push(`schema_version: 1`);
  lines.push(`scanner_version: scan-reverse-index.js v1`);
  lines.push(`project_root: ${scanInfo.projectRoot}`);
  lines.push(`enums_count: ${allEnums.length}`);
  lines.push(`usages_count: ${usages.length}`);
  lines.push('```');
  lines.push('');

  return lines.join('\n');
}

function renderStubMd(kind, projectName) {
  const lines = [];
  lines.push(`# ${projectName} ${kind} 反向索引`);
  lines.push('');
  lines.push(`> 由 \`reverse-index-required\` skill 维护。**冷启动扫描器 V1 不覆盖 ${kind},此为待人工填充模板。**`);
  lines.push('');
  lines.push(`请参考 \`skills/reverse-index-required/templates/${kind}.md\` 的格式逐项补全。`);
  lines.push('');
  return lines.join('\n');
}

// ======================================================================
// 输出路径决策
// ======================================================================

function resolveOutputDir(args, projectName) {
  if (args.output === 'user-candidates') {
    const docs = process.env.USERPROFILE
      ? path.join(process.env.USERPROFILE, 'Documents')
      : path.join(os.homedir(), 'Documents');
    const fallback = path.join(os.homedir(), 'ai-docs');
    const base = fs.existsSync(docs)
      ? path.join(docs, 'ai-docs')
      : fallback;
    return path.join(base, projectName, 'knowledge-graph', 'reverse-index');
  }
  return path.resolve(args.output);
}

// ======================================================================
// 主流程
// ======================================================================

function main() {
  const args = parseArgs(process.argv);
  if (args.help) { printHelp(); return 0; }

  const projectRoot = path.resolve(args.project);
  if (!fs.existsSync(projectRoot)) {
    console.error(`项目目录不存在: ${projectRoot}`);
    return 1;
  }
  const projectName = path.basename(projectRoot);
  const targetLangs = args.lang === 'all'
    ? Object.keys(LANG_EXT)
    : args.lang.split(',').map(s => s.trim());

  console.log(`[scan] 扫描 ${projectRoot}, 语言: ${targetLangs.join(', ')}`);

  // 1) 收集所有源码文件
  const sourceFiles = [];
  for (const f of walk(projectRoot)) {
    const lang = getLang(f);
    if (lang && targetLangs.includes(lang)) sourceFiles.push(f);
  }
  console.log(`[scan] 找到 ${sourceFiles.length} 个源码文件`);

  // 2) 抽取 enum
  const allEnums = [];
  for (const f of sourceFiles) {
    let content;
    try { content = fs.readFileSync(f, 'utf8'); }
    catch (e) { continue; }
    const lang = getLang(f);
    const enums = extractEnums(f, content, lang);
    allEnums.push(...enums);
  }
  console.log(`[scan] 抽取到 ${allEnums.length} 个 enum 定义`);

  // 3) 扫描使用点
  const usages = scanUsages(allEnums, sourceFiles, projectRoot);
  console.log(`[scan] 找到 ${usages.length} 个使用点`);

  // 4) 输出
  const outputDir = resolveOutputDir(args, projectName);
  fs.mkdirSync(outputDir, { recursive: true });

  const scanInfo = {
    projectRoot,
    scannedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
  };

  const statesMd = renderStatesMd(allEnums, usages, projectName, scanInfo);
  fs.writeFileSync(path.join(outputDir, 'states.md'), statesMd, 'utf8');
  console.log(`[scan] 写入 ${path.join(outputDir, 'states.md')}`);

  // fields/events/apis: 写存根
  for (const kind of ['fields', 'events', 'apis']) {
    const stubPath = path.join(outputDir, `${kind}.md`);
    if (!fs.existsSync(stubPath)) {
      fs.writeFileSync(stubPath, renderStubMd(kind, projectName), 'utf8');
      console.log(`[scan] 写入存根 ${stubPath}`);
    } else {
      console.log(`[scan] 保留已有 ${stubPath}(不覆盖)`);
    }
  }

  console.log('[scan] 完成');
  return 0;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = { extractEnums, scanUsages, classifyContext };
