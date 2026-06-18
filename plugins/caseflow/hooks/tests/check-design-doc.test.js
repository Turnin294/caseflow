// =============================================================
// 端到端测试 check-design-doc.js
// 用临时目录模拟项目根目录 + 设计文档命中/未命中场景
// =============================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const HOOK = path.resolve(__dirname, '..', 'check-design-doc.js');

function runHook(payload, env = {}) {
  const res = spawnSync('node', [HOOK], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
  return { code: res.status, stderr: res.stderr || '', stdout: res.stdout || '' };
}

function mkTmpProject(name) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `td-${name}-`));
  return root;
}

test('放行：非 Write/Edit/MultiEdit 工具', () => {
  const { code } = runHook({ tool_name: 'Read', tool_input: { file_path: '/tmp/x.dart' } });
  assert.equal(code, 0);
});

test('放行：非源码扩展名 (.md)', () => {
  const { code } = runHook({
    tool_name: 'Write',
    tool_input: { file_path: '/project/docs/note.md', content: '' },
    cwd: '/project',
  });
  assert.equal(code, 0);
});

test('放行：非源码扩展名 (.json / .yml)', () => {
  for (const ext of ['.json', '.yml', '.yaml', '.lock', '.toml', '.txt']) {
    const { code } = runHook({
      tool_name: 'Write',
      tool_input: { file_path: `/project/config${ext}`, content: '' },
      cwd: '/project',
    });
    assert.equal(code, 0, `扩展名 ${ext} 应放行`);
  }
});

test('放行：测试文件 (_test / .test / .spec / /test/ / /tests/)', () => {
  const cases = [
    '/project/test/foo.dart',
    '/project/tests/foo.dart',
    '/project/lib/foo_test.dart',
    '/project/lib/foo.test.ts',
    '/project/lib/foo.spec.ts',
    '/project/src/__tests__/foo.js',
  ];
  for (const fp of cases) {
    const { code } = runHook({
      tool_name: 'Write',
      tool_input: { file_path: fp, content: '' },
      cwd: '/project',
    });
    assert.equal(code, 0, `${fp} 应放行`);
  }
});

test('放行：Dockerfile / Makefile', () => {
  for (const fp of ['/project/Dockerfile', '/project/Makefile']) {
    const { code } = runHook({
      tool_name: 'Write',
      tool_input: { file_path: fp, content: '' },
      cwd: '/project',
    });
    assert.equal(code, 0, `${fp} 应放行`);
  }
});

test('放行：CASEFLOW_DESIGN_DOC_HOOK=off 一次性绕过', () => {
  const root = mkTmpProject('bypass');
  try {
    const { code } = runHook(
      {
        tool_name: 'Write',
        tool_input: { file_path: path.join(root, 'lib', 'main.dart'), content: '' },
        cwd: root,
      },
      { CASEFLOW_DESIGN_DOC_HOOK: 'off' },
    );
    assert.equal(code, 0);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('放行：项目内 docs/design/ 存在 .md', () => {
  const root = mkTmpProject('proj-docs-design');
  try {
    fs.mkdirSync(path.join(root, 'docs', 'design'), { recursive: true });
    fs.writeFileSync(path.join(root, 'docs', 'design', 'feature.md'), '# Design');

    const { code } = runHook({
      tool_name: 'Write',
      tool_input: { file_path: path.join(root, 'lib', 'main.dart'), content: '' },
      cwd: root,
    });
    assert.equal(code, 0);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('放行：项目内 docs/<subdir> 含 "design" 关键字的 .md', () => {
  const root = mkTmpProject('proj-design-subdir');
  try {
    fs.mkdirSync(path.join(root, 'docs', 'feature-design'), { recursive: true });
    fs.writeFileSync(path.join(root, 'docs', 'feature-design', 'spec.md'), '# Spec');

    const { code } = runHook({
      tool_name: 'Edit',
      tool_input: { file_path: path.join(root, 'lib', 'feature.dart'), content: '' },
      cwd: root,
    });
    assert.equal(code, 0);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('阻断：源码改动且无设计文档', () => {
  const root = mkTmpProject('proj-no-design');
  try {
    fs.mkdirSync(path.join(root, 'lib'), { recursive: true });

    const { code, stderr } = runHook({
      tool_name: 'Write',
      tool_input: { file_path: path.join(root, 'lib', 'main.dart'), content: 'void main(){}' },
      cwd: root,
    });
    assert.equal(code, 2);
    assert.match(stderr, /未检测到设计文档|未找到/);
    assert.match(stderr, /design-doc-required/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('阻断：MultiEdit 改动源码且无设计文档', () => {
  const root = mkTmpProject('proj-multiedit');
  try {
    const { code } = runHook({
      tool_name: 'MultiEdit',
      tool_input: { file_path: path.join(root, 'lib', 'svc.dart') },
      cwd: root,
    });
    assert.equal(code, 2);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// v1.28.7 修复 monorepo / Maven 多模块场景 ---------------------------------

test('放行：Maven 多模块 — .git 在仓根，深层 pom.xml 不应被当作项目根', () => {
  const root = mkTmpProject('maven-multi');
  try {
    // 仓根：.git + docs/design/
    fs.mkdirSync(path.join(root, '.git'), { recursive: true });
    fs.mkdirSync(path.join(root, 'docs', 'design'), { recursive: true });
    fs.writeFileSync(path.join(root, 'docs', 'design', 'overview.md'), '# Design');
    // 子模块：tools/tool-treesize/pom.xml + 源码
    fs.mkdirSync(path.join(root, 'tools', 'tool-treesize', 'src', 'main', 'java'), { recursive: true });
    fs.writeFileSync(path.join(root, 'tools', 'tool-treesize', 'pom.xml'), '<project/>');

    const { code, stderr } = runHook({
      tool_name: 'Edit',
      tool_input: {
        file_path: path.join(root, 'tools', 'tool-treesize', 'src', 'main', 'java', 'Foo.java'),
      },
      cwd: path.join(root, 'tools', 'tool-treesize'),
    });
    assert.equal(code, 0, `应放行，但被拦：${stderr}`);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('放行：monorepo 前端子包 — .git 在仓根，frontend/package.json 不应被当作项目根', () => {
  const root = mkTmpProject('monorepo-fe');
  try {
    fs.mkdirSync(path.join(root, '.git'), { recursive: true });
    fs.mkdirSync(path.join(root, 'docs', 'design'), { recursive: true });
    fs.writeFileSync(path.join(root, 'docs', 'design', 'spec.md'), '# Design');
    fs.mkdirSync(path.join(root, 'frontend', 'src'), { recursive: true });
    fs.writeFileSync(path.join(root, 'frontend', 'package.json'), '{}');

    const { code, stderr } = runHook({
      tool_name: 'Write',
      tool_input: {
        file_path: path.join(root, 'frontend', 'src', 'App.tsx'),
        content: 'export default function App(){}',
      },
      cwd: path.join(root, 'frontend'),
    });
    assert.equal(code, 0, `应放行，但被拦：${stderr}`);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('放行：.caseflow-project.json#aiDocsProject 覆盖 ai-docs 子目录名', () => {
  const root = mkTmpProject('repo-rename');
  // 模拟 ai-docs 目录
  const aiDocsHome = fs.mkdtempSync(path.join(os.tmpdir(), 'home-'));
  try {
    fs.mkdirSync(path.join(root, '.git'), { recursive: true });
    fs.mkdirSync(path.join(root, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(root, '.caseflow-project.json'),
      JSON.stringify({ aiDocsProject: 'kai-toolbox' }),
    );
    // 设计文档在 <home>/Documents/ai-docs/kai-toolbox/design 下，但 git 仓名不是 kai-toolbox
    const docsDir = path.join(aiDocsHome, 'Documents', 'ai-docs', 'kai-toolbox', 'design', 'feature');
    fs.mkdirSync(docsDir, { recursive: true });
    fs.writeFileSync(path.join(docsDir, 'spec.md'), '# Spec');

    const { code, stderr } = runHook(
      {
        tool_name: 'Edit',
        tool_input: { file_path: path.join(root, 'src', 'main.ts') },
        cwd: root,
      },
      // 覆盖 home 目录
      process.platform === 'win32' ? { USERPROFILE: aiDocsHome } : { HOME: aiDocsHome },
    );
    assert.equal(code, 0, `应放行，但被拦：${stderr}`);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(aiDocsHome, { recursive: true, force: true });
  }
});

test('阻断：无 .git 时回退到第一个构建文件标记（向后兼容）', () => {
  const root = mkTmpProject('no-git');
  try {
    // 不创建 .git，只有 pom.xml
    fs.writeFileSync(path.join(root, 'pom.xml'), '<project/>');
    fs.mkdirSync(path.join(root, 'src'), { recursive: true });

    const { code, stderr } = runHook({
      tool_name: 'Write',
      tool_input: { file_path: path.join(root, 'src', 'Foo.java'), content: 'class Foo{}' },
      cwd: root,
    });
    assert.equal(code, 2);
    // 错误信息应包含 root（说明回退到 pom.xml 这一级，而不是更深或更浅）
    assert.ok(stderr.includes(root), `stderr 应提到推断项目根 ${root}，实际：${stderr}`);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('放行：.caseflow-project.json 损坏时不应崩溃，退回 basename 行为', () => {
  const root = mkTmpProject('broken-override');
  try {
    fs.mkdirSync(path.join(root, '.git'), { recursive: true });
    fs.mkdirSync(path.join(root, 'docs', 'design'), { recursive: true });
    fs.writeFileSync(path.join(root, 'docs', 'design', 'x.md'), '# x');
    fs.writeFileSync(path.join(root, '.caseflow-project.json'), '{not valid json');
    fs.mkdirSync(path.join(root, 'lib'), { recursive: true });

    const { code } = runHook({
      tool_name: 'Write',
      tool_input: { file_path: path.join(root, 'lib', 'main.dart'), content: '' },
      cwd: root,
    });
    assert.equal(code, 0);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
