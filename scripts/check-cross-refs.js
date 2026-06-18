#!/usr/bin/env node
/**
 * check-cross-refs.js
 *
 * 校验所有 SKILL.md / CLAUDE.md / AGENTS.md / README.md 内的跨 skill 引用:
 *   1. `xxx-skill-name` 反引号引用必须对应到 skills/{name}/SKILL.md 真实存在
 *   2. "详见 ... 「章节名」节" 形式的章节引用必须能在被引文件里找到对应 H2/H3/H4 标题
 *
 * 当前局限(暂不校验):
 *   - § 数字编号引用(如 §5.0)——章节常重排,误报率高,留给人工
 *   - 行内 markdown link [text](path) 已有标准 markdown linter 覆盖
 *
 * 用法:
 *   node scripts/check-cross-refs.js              # 校验全部,失败 exit 1
 *   node scripts/check-cross-refs.js --verbose    # 打印每条解析记录
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SKILLS_DIR = path.join(ROOT, 'plugins', 'caseflow', 'skills');
const VERBOSE = process.argv.includes('--verbose');

function listSkills() {
  return fs.readdirSync(SKILLS_DIR).filter((d) => {
    const p = path.join(SKILLS_DIR, d);
    return fs.statSync(p).isDirectory() && fs.existsSync(path.join(p, 'SKILL.md'));
  });
}

function loadHeadings(file) {
  const content = fs.readFileSync(file, 'utf8');
  const headings = new Set();
  for (const line of content.split('\n')) {
    const m = /^(#{2,4})\s+(.+?)\s*$/.exec(line);
    if (m) {
      let title = m[2];
      // 去掉 "(...)" 之类后缀,保留主体
      title = title.replace(/\s*[(（].*$/, '').trim();
      headings.add(title);
      // 也加上完整标题供精确匹配
      headings.add(m[2].trim());
    }
  }
  return headings;
}

function scanFile(file, allSkills, headingsBySkill) {
  const content = fs.readFileSync(file, 'utf8');
  const errors = [];

  // 1. 跨 skill 引用:`skill-name` 反引号包围的小写连字符串
  //    要求长度 ≥ 4,含至少一个连字符,以排除 `id` / `foo` 等无关 token
  const skillRefRe = /`([a-z][a-z0-9-]{3,})`/g;
  let m;
  while ((m = skillRefRe.exec(content)) !== null) {
    const ref = m[1];
    // 只关心看起来像 skill 名的引用(含连字符且不像文件路径)
    if (!ref.includes('-')) continue;
    if (ref.includes('/') || ref.includes('.')) continue;
    if (ref === 'caseflow') continue;
    // 一些技术词不要误判
    const knownNonSkills = new Set([
      'application/json', 'lib/features', 'lower-camel-case',
      'upper-camel-case', 'kebab-case', 'snake-case',
    ]);
    if (knownNonSkills.has(ref)) continue;
    // 非 skill 但常见的 `xxx-yyy` token 白名单(目录名、产品名、技术词等)
    const NON_SKILL_TOKENS = new Set([
      'work-log', 'kpay-caseflow', 'kpay-pos-topology',
      'kpay-pos-business-app-bff', 'kpay-pos-order-manage',
      'kpay-pos-report', 'kpay-possystem-commodity',
      'pos-store-operation-manage', 'price-calc-sdk', 'pos-config-ts',
      'lib-features', 'json-serializable',
    ]);
    if (NON_SKILL_TOKENS.has(ref)) continue;
    // 看起来像 skill 名(全小写+连字符)但实际不存在 → 报错
    if (!allSkills.includes(ref)) {
      // 仅在紧邻"skill"标识词(±30 字符内)时报错,避免误判普通技术词
      const around = content.slice(Math.max(0, m.index - 30), m.index + ref.length + 30);
      if (/\bskill\b/i.test(around)) {
        errors.push({
          file: path.relative(ROOT, file),
          kind: 'unknown-skill',
          ref,
          hint: `引用 \`${ref}\` 紧邻 "skill" 标识但 skills/${ref}/SKILL.md 不存在`,
        });
      }
    }
  }

  // 2. 「章节名」节引用 — 只校验跨 skill 引用,不校验单文件内部锚点
  //    格式: 详见 `target-skill` 「章节名」节(skill 与 「 之间 ≤60 字符,避免跨段落误匹)
  const sectionRefRe = /(?:详见|见|参考|参见)\s*`([a-z][a-z0-9-]+)`[^「\n]{0,60}「([^」]+)」/g;
  while ((m = sectionRefRe.exec(content)) !== null) {
    const [, targetSkill, sectionName] = m;
    if (!allSkills.includes(targetSkill)) continue; // 上面已报
    const headings = headingsBySkill[targetSkill];
    if (!headings) continue;
    // 章节名可能带「」也可能不带;尝试多种形态
    const candidates = [
      sectionName,
      sectionName.replace(/^「|」$/g, ''),
      `${sectionName} 节`,
    ];
    if (!candidates.some((c) => headings.has(c) || [...headings].some((h) => h.includes(c)))) {
      errors.push({
        file: path.relative(ROOT, file),
        kind: 'unknown-section',
        ref: `${targetSkill}「${sectionName}」`,
        hint: `引用 ${targetSkill} 的「${sectionName}」节,但该 skill 没有此 H2/H3/H4 标题`,
      });
    }
  }

  return errors;
}

function main() {
  const allSkills = listSkills();
  const headingsBySkill = {};
  for (const name of allSkills) {
    headingsBySkill[name] = loadHeadings(path.join(SKILLS_DIR, name, 'SKILL.md'));
  }

  // 扫描所有 SKILL.md + CLAUDE.md / AGENTS.md / README.md + docs/ 下含 skill 引用的关键文档
  const targets = [
    ...allSkills.map((n) => path.join(SKILLS_DIR, n, 'SKILL.md')),
    path.join(ROOT, 'CLAUDE.md'),
    path.join(ROOT, 'AGENTS.md'),
    path.join(ROOT, 'README.md'),
    path.join(ROOT, 'docs', 'skill-flow.md'),
    path.join(ROOT, 'docs', 'skill-dependencies.md'),
    path.join(ROOT, 'docs', 'skill-triggers.md'),
    path.join(ROOT, 'docs', 'anti-pattern-case-library.md'),
  ].filter(fs.existsSync);

  const errors = [];
  for (const f of targets) {
    const fileErrors = scanFile(f, allSkills, headingsBySkill);
    errors.push(...fileErrors);
    if (VERBOSE) {
      console.log(`[scan] ${path.relative(ROOT, f)} — ${fileErrors.length} issue(s)`);
    }
  }

  if (errors.length === 0) {
    console.log(`[check-cross-refs] OK — scanned ${targets.length} files across ${allSkills.length} skills, no broken refs.`);
    return;
  }

  console.error(`[check-cross-refs] ${errors.length} broken reference(s) found:`);
  // 按 kind 聚合
  for (const e of errors) {
    console.error(`  ✖ [${e.kind}] ${e.file}: ${e.hint}`);
  }
  process.exit(1);
}

main();
