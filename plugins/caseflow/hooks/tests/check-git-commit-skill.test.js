// =============================================================
// 端到端测试 check-git-commit-skill.js
// 通过 spawnSync + stdin JSON payload 模拟 PreToolUse(Bash) 调用,
// 验证 git commit 拦截 / 放行行为。
// =============================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync, execSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const HOOK = path.resolve(__dirname, '..', 'check-git-commit-skill.js');

function runHook(payload, env = {}) {
  const res = spawnSync('node', [HOOK], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
  return { code: res.status, stderr: res.stderr || '', stdout: res.stdout || '' };
}

// 建一个临时 git repo + transcript,便于测拦截/放行
function makeRepo(opts = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-hook-'));
  execSync('git init -q', { cwd: dir });
  execSync('git config user.email test@local', { cwd: dir });
  execSync('git config user.name test', { cwd: dir });

  // 先建 baseline commit 让后续 staged diff 有参照
  fs.writeFileSync(path.join(dir, 'README.md'), 'init\n');
  execSync('git add README.md', { cwd: dir });
  // --no-verify 跳过环境里可能存在的全局 commit-msg hook（如转转 ~/.git-hooks），
  // 测试只验证 caseflow hook 逻辑，不应被宿主 git hook 干扰
  execSync('git commit -q --no-verify -m init', { cwd: dir });

  // 制造 staged 变化
  if (opts.files === 'trivial') {
    fs.appendFileSync(path.join(dir, 'README.md'), 'one more line\n');
    execSync('git add README.md', { cwd: dir });
  } else if (opts.files === 'large') {
    // 制造 >2 文件 + >30 行
    for (let i = 0; i < 5; i++) {
      fs.writeFileSync(
        path.join(dir, `f${i}.txt`),
        Array.from({ length: 20 }, (_, j) => `line ${j}`).join('\n') + '\n'
      );
    }
    execSync('git add -A', { cwd: dir });
  } else if (opts.files === 'add_new') {
    // 单个新文件 = A 状态,不算 trivial
    fs.writeFileSync(path.join(dir, 'new.txt'), 'x\n');
    execSync('git add new.txt', { cwd: dir });
  }
  return dir;
}

function makeTranscript(opts = {}) {
  const tmp = path.join(os.tmpdir(), `transcript-${Date.now()}-${Math.random()}.jsonl`);
  const lines = [];
  if (opts.hasSkillCall) {
    lines.push(
      JSON.stringify({
        type: 'tool_use',
        name: 'Skill',
        // 默认完全限定名；测裸名场景时传 opts.skillName 覆盖
        input: { skill: opts.skillName || 'caseflow:git-commit-standards' },
      })
    );
  } else {
    lines.push(JSON.stringify({ type: 'text', text: 'hello' }));
  }
  fs.writeFileSync(tmp, lines.join('\n') + '\n');
  return tmp;
}

function cleanup(dir, transcript) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (e) {}
  if (transcript) {
    try {
      fs.rmSync(transcript, { force: true });
    } catch (e) {}
  }
}

test('放行：非 Bash 工具', () => {
  const { code } = runHook({ tool_name: 'Read', tool_input: {} });
  assert.equal(code, 0);
});

test('放行：Bash 但非 git commit 命令', () => {
  const { code } = runHook({
    tool_name: 'Bash',
    tool_input: { command: 'ls -la' },
  });
  assert.equal(code, 0);
});

test('放行：git push 不再门禁(只拦 commit)', () => {
  const { code } = runHook({
    tool_name: 'Bash',
    tool_input: { command: 'git push origin main' },
  });
  assert.equal(code, 0);
});

test('放行：小改 git commit（≤2 文件 ∧ ≤30 行 ∧ 仅 M 修改）', () => {
  const dir = makeRepo({ files: 'trivial' });
  const transcript = makeTranscript({ hasSkillCall: false });
  try {
    const { code } = runHook({
      tool_name: 'Bash',
      tool_input: { command: 'git commit -m fix' },
      cwd: dir,
      transcript_path: transcript,
    });
    assert.equal(code, 0);
  } finally {
    cleanup(dir, transcript);
  }
});

test('阻断：大改 git commit 但 transcript 无 skill 调用', () => {
  const dir = makeRepo({ files: 'large' });
  const transcript = makeTranscript({ hasSkillCall: false });
  try {
    const { code, stderr } = runHook({
      tool_name: 'Bash',
      tool_input: { command: 'git commit -m big' },
      cwd: dir,
      transcript_path: transcript,
    });
    assert.equal(code, 2);
    assert.match(stderr, /git-commit-standards/);
  } finally {
    cleanup(dir, transcript);
  }
});

test('放行：大改 git commit 且 transcript 已含 skill 调用', () => {
  const dir = makeRepo({ files: 'large' });
  const transcript = makeTranscript({ hasSkillCall: true });
  try {
    const { code } = runHook({
      tool_name: 'Bash',
      tool_input: { command: 'git commit -m big' },
      cwd: dir,
      transcript_path: transcript,
    });
    assert.equal(code, 0);
  } finally {
    cleanup(dir, transcript);
  }
});

test('放行：大改 git commit 且 transcript 含裸名 skill 调用(无 caseflow: 前缀)', () => {
  const dir = makeRepo({ files: 'large' });
  const transcript = makeTranscript({ hasSkillCall: true, skillName: 'git-commit-standards' });
  try {
    const { code } = runHook({
      tool_name: 'Bash',
      tool_input: { command: 'git commit -m big' },
      cwd: dir,
      transcript_path: transcript,
    });
    assert.equal(code, 0);
  } finally {
    cleanup(dir, transcript);
  }
});

test('阻断：新增文件（A 状态）即使行数少也不算 trivial', () => {
  const dir = makeRepo({ files: 'add_new' });
  const transcript = makeTranscript({ hasSkillCall: false });
  try {
    const { code } = runHook({
      tool_name: 'Bash',
      tool_input: { command: 'git commit -m newfile' },
      cwd: dir,
      transcript_path: transcript,
    });
    assert.equal(code, 2);
  } finally {
    cleanup(dir, transcript);
  }
});

test('放行：非 JSON stdin 不崩溃', () => {
  const res = spawnSync('node', [HOOK], { input: 'not json', encoding: 'utf8' });
  assert.equal(res.status, 0);
});
