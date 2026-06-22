#!/usr/bin/env node
// =============================================================
// PreToolUse hook: 调用 zz-harness 平台命令（zzcli）前拦截，交用户审查
//
//   caseflow ↔ zz-harness 协作：caseflow 是「脑」（规范决策），
//   zz-harness 是「手」（zzcli 真操作转转平台：apollo/zzlock/zzmq/
//   scf/mysql-check/部署/Beetle 等）。本 hook 在 zzcli 命令落地前
//   拦下，让 AI 停下来向用户说明将执行什么、等用户确认后再重试。
//
// 触发时机：matcher = "Bash"
// 拦截对象：命令行包含 zzcli 调用
// 退出码：
//   0 = 放行（非 zzcli / guard 关闭 / 已确认）
//   2 = 阻断，stderr 回灌给 Claude，提示先向用户请示
//
// 生效范围（团队插件，默认开但可关）：
//   CASEFLOW_ZZCLI_GUARD=off  → 完全关闭，不拦截
//   默认（未设或非 off）       → 开启拦截
//
// 跨平台：Node.js（Claude Code 自带运行时）
// =============================================================

const GUARD = (process.env.CASEFLOW_ZZCLI_GUARD || 'on').toLowerCase();

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { raw += chunk; });
process.stdin.on('end', () => {
  // guard 关闭 → 直接放行
  if (GUARD === 'off') {
    process.exit(0);
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (e) {
    process.exit(0);
  }

  if (payload.tool_name !== 'Bash') {
    process.exit(0);
  }

  const command = (payload.tool_input && payload.tool_input.command) || '';

  // 仅拦截 zzcli 调用（词边界，避免误伤 zzclixxx 之类）
  if (!/\bzzcli\b/.test(command)) {
    process.exit(0);
  }

  // 命中 → 阻断并提示 AI 先向用户请示
  process.stderr.write(
    [
      '【caseflow 审查门禁】检测到即将调用 zz-harness 平台命令（zzcli）。',
      '',
      `待执行命令：${command}`,
      '',
      '按团队约定，调用 zz-harness 平台能力前必须经用户审查。请：',
      '  1. 停止本次执行；',
      '  2. 向用户说明这条 zzcli 命令将做什么（查询/修改/部署/上报，影响哪个环境）；',
      '  3. 等用户明确确认后再重试该命令。',
      '',
      '（本次会话临时关闭审查：设 CASEFLOW_ZZCLI_GUARD=off）',
    ].join('\n')
  );
  process.exit(2);
});
