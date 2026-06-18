// =============================================================
// 端到端测试 check-comment-density.js
// 通过 spawnSync + stdin JSON payload 模拟 PreToolUse(Write/Edit/MultiEdit)，
// 验证注释红线（§5.4）在新增内容里的 warn / block / off 行为与误报边界。
// =============================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const HOOK = path.resolve(__dirname, '..', 'check-comment-density.js');

function runHook(payload, env = {}) {
  const res = spawnSync('node', [HOOK], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
  return { code: res.status, stderr: res.stderr || '', stdout: res.stdout || '' };
}

function edit(filePath, newString) {
  return { tool_name: 'Edit', tool_input: { file_path: filePath, old_string: 'x', new_string: newString } };
}

test('放行：非 Write/Edit/MultiEdit 工具', () => {
  const { code } = runHook({ tool_name: 'Bash', tool_input: {} });
  assert.equal(code, 0);
});

test('放行：非源码扩展名（.md）', () => {
  const { code } = runHook(edit('docs/design/x.md', '// [BUGFIX 2026-04-30] 改了点东西\n'));
  assert.equal(code, 0);
});

test('放行：干净注释（当前职责 1 行 WHY）', () => {
  const { code, stderr } = runHook(
    edit('lib/a.dart', '// 用 .sql 构造器：索引带 WHERE，普通注解不支持 partial index。\nfinal x = 1;\n')
  );
  assert.equal(code, 0);
  assert.equal(stderr, '');
});

test('命中：变更标记 [BUGFIX]（默认 block → exit 2）', () => {
  const { code, stderr } = runHook(edit('lib/a.dart', '// [BUGFIX] 旧实现用 transaction_no 反查\nfinal x = 1;\n'));
  assert.equal(code, 2); // 默认 block，客观红线硬阻断
  assert.match(stderr, /change-marker/);
  assert.match(stderr, /§5\.4/);
});

test('命中：[DEPRECATED] 标记', () => {
  const { stderr } = runHook(edit('lib/a.java', '// [DEPRECATED] 这段以前是 X\nint x;\n'));
  assert.match(stderr, /change-marker/);
});

test('命中：注释里的日期', () => {
  const { stderr } = runHook(edit('lib/a.ts', '// 2026-04-25 对齐云端\nconst x = 1;\n'));
  assert.match(stderr, /\bdate\b/);
});

test('命中：中文年月日期', () => {
  const { stderr } = runHook(edit('lib/a.dart', '/// 2026年4月新增的逻辑\nint x = 1;\n'));
  assert.match(stderr, /\bdate\b/);
});

test('命中：工单/PR 引用', () => {
  const { stderr } = runHook(edit('lib/a.dart', '// 详见 PR #1234\nfinal x = 1;\n'));
  assert.match(stderr, /ticket-ref/);
});

test('命中：工单编号 KP-789', () => {
  const { stderr } = runHook(edit('lib/a.dart', '// 见 KP-789 需求\nfinal x = 1;\n'));
  assert.match(stderr, /ticket-code/);
});

test('命中：带个人/日期的 TODO', () => {
  const { stderr } = runHook(edit('lib/a.dart', '// TODO(zhangkai 2026-04): 以后再优化\nfinal x = 1;\n'));
  assert.match(stderr, /todo-person-date/);
});

test('命中：带元信息的分节线注释', () => {
  const { stderr } = runHook(
    edit('lib/a.dart', '// ===== [ADDED 2026-04-28] 校验链路 =====\nfinal x = 1;\n')
  );
  // 既命中 change-marker / date，也命中 section-divider
  assert.match(stderr, /section-divider/);
});

test('命中：版本流水措辞', () => {
  const { stderr } = runHook(edit('lib/a.dart', '// 详见 v6 调整流水\nfinal x = 1;\n'));
  assert.match(stderr, /version-flow/);
});

test('命中：超长注释块（> 默认 6 行）', () => {
  const block = Array.from({ length: 8 }, (_, i) => `// 第 ${i} 行说明`).join('\n') + '\nfinal x = 1;\n';
  const { stderr } = runHook(edit('lib/a.dart', block));
  assert.match(stderr, /long-block/);
});

test('默认 block：long-block 单独命中只提示不阻断（exit 0）', () => {
  const block = Array.from({ length: 8 }, (_, i) => `// 第 ${i} 行说明`).join('\n') + '\nfinal x = 1;\n';
  const { code, stderr } = runHook(edit('lib/a.dart', block));
  assert.equal(code, 0); // long-block 是软规则，公开 API 长 dartdoc 不应被硬阻断
  assert.match(stderr, /long-block/);
});

test('默认 block：客观红线（工单号）→ exit 2', () => {
  const { code, stderr } = runHook(edit('lib/a.dart', '// 见 KP-789 需求\nfinal x = 1;\n'));
  assert.equal(code, 2);
  assert.match(stderr, /ticket-code/);
});

test('warn 模式降级：客观红线命中仅提示（exit 0）', () => {
  const { code, stderr } = runHook(
    edit('lib/a.dart', '// [ADDED 2026-04-25] 对齐云端\nfinal x = 1;\n'),
    { TEAM_STANDARDS_COMMENT_HOOK: 'warn' }
  );
  assert.equal(code, 0);
  assert.match(stderr, /change-marker/);
});

test('放行：注释块未超阈值（5 行 ≤ 6）', () => {
  const block = Array.from({ length: 5 }, (_, i) => `// 第 ${i} 行`).join('\n') + '\nfinal x = 1;\n';
  const { code, stderr } = runHook(edit('lib/a.dart', block));
  assert.equal(code, 0);
  assert.equal(stderr, '');
});

test('阈值可调：MAX_BLOCK=3 时 4 行注释块命中', () => {
  const block = Array.from({ length: 4 }, (_, i) => `// 第 ${i} 行`).join('\n') + '\nfinal x = 1;\n';
  const { stderr } = runHook(edit('lib/a.dart', block), { TEAM_STANDARDS_COMMENT_MAX_BLOCK: '3' });
  assert.match(stderr, /long-block/);
});

test('不误报：字符串字面量里的标记/URL 不算注释', () => {
  const src = 'final url = "http://x.com/a";\nfinal s = "[FIXED] not a comment";\nprint(s);\n';
  const { code, stderr } = runHook(edit('lib/a.dart', src));
  assert.equal(code, 0);
  assert.equal(stderr, '');
});

test('不误报：UTF-8 / ISO-8601 不当作工单编号', () => {
  const { code, stderr } = runHook(edit('lib/a.dart', '// 编码用 UTF-8，时间走 ISO-8601\nfinal x = 1;\n'));
  assert.equal(code, 0);
  assert.equal(stderr, '');
});

test('block 模式：命中 → exit 2', () => {
  const { code, stderr } = runHook(
    edit('lib/a.dart', '// [ADDED 2026-04-25] 对齐云端\nfinal x = 1;\n'),
    { TEAM_STANDARDS_COMMENT_HOOK: 'block' }
  );
  assert.equal(code, 2);
  assert.match(stderr, /change-marker/);
});

test('off 模式：完全跳过', () => {
  const { code, stderr } = runHook(
    edit('lib/a.dart', '// [BUGFIX 2026-04-30] xxx\nfinal x = 1;\n'),
    { TEAM_STANDARDS_COMMENT_HOOK: 'off' }
  );
  assert.equal(code, 0);
  assert.equal(stderr, '');
});

test('Write 工具：扫 content', () => {
  const { stderr } = runHook({
    tool_name: 'Write',
    tool_input: { file_path: 'lib/a.dart', content: '// [FIXED] something\nfinal x = 1;\n' },
  });
  assert.match(stderr, /change-marker/);
});

test('MultiEdit 工具：扫所有 edits 的 new_string', () => {
  const { stderr } = runHook({
    tool_name: 'MultiEdit',
    tool_input: {
      file_path: 'lib/a.dart',
      edits: [
        { old_string: 'a', new_string: 'final a = 1;' },
        { old_string: 'b', new_string: '// 见 KP-456 需求\nfinal b = 2;' },
      ],
    },
  });
  assert.match(stderr, /ticket-code/);
});

test('Python 文件：# 注释也识别', () => {
  const { stderr } = runHook(edit('a.py', '# [DEPRECATED] old impl\nx = 1\n'));
  assert.match(stderr, /change-marker/);
});

test('命中：版本标记 vN 新增', () => {
  const { stderr } = runHook(edit('lib/a.dart', '/// 退款订单 id（v13 新增，可空）\nint x = 1;\n'));
  assert.match(stderr, /version-flow/);
});

test('命中：版本标记 vN 起', () => {
  const { stderr } = runHook(edit('lib/a.dart', '/// v14 起新登记必须显式传入\nint x = 1;\n'));
  assert.match(stderr, /version-flow/);
});

test('命中：版本标记 vN 及以前', () => {
  const { stderr } = runHook(edit('lib/a.dart', '/// v12 及以前已登记的历史行为 NULL\nint x = 1;\n'));
  assert.match(stderr, /version-flow/);
});

test('不误报：vN 协议/IPv6 等非版本标记', () => {
  const r1 = runHook(edit('lib/a.dart', '// 支持 v3 协议解析\nfinal x = 1;\n'));
  assert.equal(r1.code, 0); assert.equal(r1.stderr, '');
  const r2 = runHook(edit('lib/a.dart', '// IPv6 上线后启用\nfinal x = 1;\n'));
  assert.equal(r2.code, 0); assert.equal(r2.stderr, '');
});

test('放行：非 JSON stdin 不崩溃', () => {
  const res = spawnSync('node', [HOOK], { input: 'not json', encoding: 'utf8' });
  assert.equal(res.status, 0);
});
