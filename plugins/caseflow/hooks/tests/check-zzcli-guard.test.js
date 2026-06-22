// =============================================================
// 端到端测试 check-zzcli-guard.js
// 通过 spawnSync + stdin JSON payload 模拟 PreToolUse(Bash) 调用，
// 验证 zzcli 命令拦截 / 放行 / env 关闭行为。
// =============================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const HOOK = path.resolve(__dirname, '..', 'check-zzcli-guard.js');

function runHook(payload, env = {}) {
  const res = spawnSync('node', [HOOK], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
  return { code: res.status, stderr: res.stderr || '', stdout: res.stdout || '' };
}

const bash = (command) => ({ tool_name: 'Bash', tool_input: { command } });

test('拦截：zzcli 查询命令 → exit 2 + 提示', () => {
  const { code, stderr } = runHook(bash('zzcli --sys-env online apollo namespace list'));
  assert.equal(code, 2);
  assert.match(stderr, /审查门禁/);
  assert.match(stderr, /zzcli/);
});

test('拦截：zzcli 写操作命令 → exit 2', () => {
  const { code } = runHook(bash('zzcli apollo item update appid env'));
  assert.equal(code, 2);
});

test('放行：普通命令（非 zzcli） → exit 0', () => {
  assert.equal(runHook(bash('git status')).code, 0);
  assert.equal(runHook(bash('ls -la')).code, 0);
});

test('放行：含 zzcli 子串但非词边界（zzclixxx） → exit 0', () => {
  assert.equal(runHook(bash('echo zzclixxx')).code, 0);
});

test('放行：CASEFLOW_ZZCLI_GUARD=off → exit 0', () => {
  const { code } = runHook(bash('zzcli apollo item update'), { CASEFLOW_ZZCLI_GUARD: 'off' });
  assert.equal(code, 0);
});

test('放行：非 Bash 工具 → exit 0', () => {
  const { code } = runHook({ tool_name: 'Write', tool_input: { file_path: 'a.txt', content: 'zzcli' } });
  assert.equal(code, 0);
});

test('放行：非 JSON stdin 不崩溃 → exit 0', () => {
  const res = spawnSync('node', [HOOK], { input: 'not json', encoding: 'utf8', env: process.env });
  assert.equal(res.status, 0);
});
