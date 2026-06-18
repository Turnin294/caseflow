#!/usr/bin/env node
/**
 * check-version-sync.js
 *
 * 校验三处插件 manifest 的版本号保持一致:
 *   - .claude-plugin/plugin.json#version
 *   - .claude-plugin/marketplace.json#plugins[0].version
 *   - .codex-plugin/plugin.json#version
 *
 * 任一不一致时退出码 1,在 CI 上阻断 PR。
 *
 * 用法:
 *   node scripts/check-version-sync.js           # 校验,失败 exit 1
 *   node scripts/check-version-sync.js --verbose # 打印每处的版本值
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const VERBOSE = process.argv.includes('--verbose');

const targets = [
  {
    name: 'plugins/caseflow/.claude-plugin/plugin.json',
    file: path.join(ROOT, 'plugins', 'caseflow', '.claude-plugin', 'plugin.json'),
    extract: (json) => json.version,
  },
  {
    name: '.claude-plugin/marketplace.json (plugins[0])',
    file: path.join(ROOT, '.claude-plugin', 'marketplace.json'),
    extract: (json) => json.plugins && json.plugins[0] && json.plugins[0].version,
  },
  {
    name: 'plugins/caseflow/.codex-plugin/plugin.json',
    file: path.join(ROOT, 'plugins', 'caseflow', '.codex-plugin', 'plugin.json'),
    extract: (json) => json.version,
  },
];

function main() {
  const found = [];
  const missing = [];

  for (const t of targets) {
    if (!fs.existsSync(t.file)) {
      missing.push(t.name);
      continue;
    }
    const raw = fs.readFileSync(t.file, 'utf8');
    let json;
    try {
      json = JSON.parse(raw);
    } catch (e) {
      console.error(`[check-version-sync] ✖ ${t.name}: invalid JSON — ${e.message}`);
      process.exit(1);
    }
    const v = t.extract(json);
    if (!v) {
      console.error(`[check-version-sync] ✖ ${t.name}: version field missing or empty`);
      process.exit(1);
    }
    found.push({ name: t.name, version: v });
  }

  if (missing.length > 0) {
    console.error('[check-version-sync] ✖ 以下 manifest 文件缺失:');
    for (const m of missing) console.error(`    - ${m}`);
    process.exit(1);
  }

  if (VERBOSE) {
    console.log('[check-version-sync] versions found:');
    for (const f of found) console.log(`    ${f.name.padEnd(48)} ${f.version}`);
  }

  const versions = found.map((f) => f.version);
  const allEqual = versions.every((v) => v === versions[0]);

  if (!allEqual) {
    console.error('[check-version-sync] ✖ 三处 manifest 版本号不一致:');
    for (const f of found) console.error(`    ${f.name.padEnd(48)} ${f.version}`);
    console.error('');
    console.error('修复: 把三处都同步到目标版本号(发版前必须一致,否则 /plugin update 检测不到变更)。');
    process.exit(1);
  }

  console.log(`[check-version-sync] OK — all 3 manifests at ${versions[0]}`);
}

main();
