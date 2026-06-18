#!/usr/bin/env node
// =============================================================
// PreToolUse hook: 源码 Write/Edit/MultiEdit 之前
//   扫描本次「新增内容」里的注释，命中 coding-standards-common §5.4
//   注释红线时提醒。规则源是 §5.4，本 hook 只做机械兜底。
//
// 默认 block 模式：命中客观红线（变更标记/日期/工单号/分节线/版本流水）即硬阻断（exit 2）。
//   long-block（连续注释块超阈值）是启发式软规则，只提示不阻断——避免误伤公开 API 的长 dartdoc。
// TEAM_STANDARDS_COMMENT_HOOK=warn → 仅 stderr 提示，不阻断（exit 0）
// TEAM_STANDARDS_COMMENT_HOOK=off  → 完全跳过
//
// 抓的是「客观无歧义」的红线（误报极低）：
//   - 变更标记 [BUGFIX]/[DEPRECATED]/[ADDED]/[REWRITTEN]/[MODIFIED]/[FIX]/[FIXED]...
//   - 注释里的日期（2026-04-30 / 2026年4月）
//   - 工单/PR/Issue 号引用（PR #123 / KP-789 / Linear ...）
//   - 带个人或日期的 TODO(name 2026-04)
//   - 带日期/版本/标记的分节线注释（// ===== [ADDED ...] =====）
//   - 版本流水/版本标记措辞（v6 调整流水 / vN 新增·起·上线·移除 / 旧实现…新实现…）
// 外加一道软提醒：单段连续注释块超过阈值（默认 6 行，疑似函数头过载/历史科普）。
//
// 只扫「新增文本」（Edit.new_string / MultiEdit.edits[].new_string / Write.content），
// 不动用户没碰的存量注释。注释判定为去掉字符串字面量后的注释片段，避免
// URL（http://）/ 字符串里的 "//" 误判。
//
// 范围：源码扩展名（.dart/.java/.kt/.ts/.js/.py/.go/.rs/.cs/... 等）。
//   .md/.json/.yaml/配置文件直接放行。
//
// 阈值可调：TEAM_STANDARDS_COMMENT_MAX_BLOCK（默认 6，连续注释块行数上限）
// =============================================================

const MODE = (process.env.TEAM_STANDARDS_COMMENT_HOOK || 'block').toLowerCase();
if (MODE === 'off') process.exit(0);

const MAX_BLOCK = parseInt(process.env.TEAM_STANDARDS_COMMENT_MAX_BLOCK || '6', 10);

// 源码扩展名（注释红线是全语言通用的）
const SOURCE_EXT = /\.(dart|java|kt|kts|ts|tsx|js|jsx|mjs|cjs|py|go|rs|c|cc|cpp|cxx|h|hpp|cs|scala|rb|php|swift|m|mm|vue|lua|sql)$/i;

// 行注释 token 按扩展名区分（# 只对 py/rb 等，-- 只对 sql/lua）
function lineCommentToken(filePath) {
  if (/\.(py|rb)$/i.test(filePath)) return '#';
  if (/\.(sql|lua)$/i.test(filePath)) return '--';
  return '//';
}

// 去掉字符串字面量，避免 "http://" / "[FIXED]" 等出现在字符串里被误判
function stripStrings(line) {
  return line
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/`(?:\\.|[^`\\])*`/g, '``');
}

// 红线规则：对「注释文本」匹配
const RULES = [
  {
    id: 'change-marker',
    desc: '变更标记（属于 git commit body / bug doc，不进源码）',
    re: /\[\s*(BUGFIX|DEPRECATED|ADDED|REWRITTEN|MODIFIED|FIX|FIXED|CHANGED|REMOVED|REFACTORED)\b/i,
  },
  {
    id: 'date',
    desc: '注释里的日期（变更时间属于 git log）',
    re: /\b(?:19|20)\d{2}[-/.](?:0?[1-9]|1[0-2])[-/.](?:0?[1-9]|[12]\d|3[01])\b|\b(?:19|20)\d{2}\s*年\s*\d{1,2}\s*月/,
  },
  {
    id: 'ticket-ref',
    desc: '工单/PR/Issue 号引用（易失效，归外部文档）',
    re: /\b(?:PR|MR|issue|ticket|jira|linear)\b\s*#?\s*\d+/i,
  },
  {
    id: 'ticket-code',
    desc: '工单编号（如 KP-789，归 design/bug doc）',
    // 2-5 个大写字母 + 短横 + ≥3 位数字；排除 ISO/RFC/UTF 等常见技术标准前缀，避免误判
    re: /\b(?!(?:ISO|RFC|UTF|ASCII|SHA|AES|RSA|IEEE|ANSI|IEC|ITU|GMT|UTC|PEP|ECMA|JIS|DIN|EN|GB|X)-?\d)[A-Z]{2,5}-\d{3,}\b/,
  },
  {
    id: 'todo-person-date',
    desc: 'TODO/FIXME 带个人或日期（应匿名写原因或开任务）',
    re: /\b(?:TODO|FIXME|HACK|XXX)\s*\([^)]*(?:\d{4}|[A-Za-z]{2,})[^)]*\)/,
  },
  {
    id: 'version-flow',
    desc: '版本流水/实现演变叙事（属于 design/bug doc）',
    re: /\bv\d+(?:\.\d+)*\b[^\n]{0,16}(?:流水|调整|改动|历史|计划|重写|迭代|新增|引入|上线|移除|删除|废弃|弃用|起|及以前|及以后)|(?:旧|新)实现/,
  },
];

// 分节线 + 元信息（日期/版本/方括号标记）→ section divider 注释
const DIVIDER_RE = /(={4,}|-{5,}|—{3,}|\*{4,}|#{4,})/;
const META_RE = /\[[A-Z]+|\b(?:19|20)\d{2}[-/.]|\bv\d+(?:\.\d+)*\b/;

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', () => {
  let payload;
  try { payload = JSON.parse(raw); } catch (e) { process.exit(0); }

  const tool = payload.tool_name;
  if (tool !== 'Write' && tool !== 'Edit' && tool !== 'MultiEdit') process.exit(0);

  const input = payload.tool_input || {};
  const filePath = input.file_path;
  if (typeof filePath !== 'string' || !SOURCE_EXT.test(filePath)) process.exit(0);

  const added = extractAddedText(tool, input);
  if (!added) process.exit(0);

  const findings = scan(added, filePath);
  if (findings.length === 0) process.exit(0);

  const lines = [
    '[team-standards] 本次新增内容的注释疑似命中 coding-standards-common §5.4 注释红线：',
    `  文件：${filePath}`,
  ];
  for (const f of findings) {
    lines.push(`  - [${f.id}] ${f.desc}`);
    if (f.sample) lines.push(`      行内样例：${f.sample}`);
  }
  lines.push('  红线规则源：skills/coding-standards-common/SKILL.md §5.4 / §5.4.1');
  lines.push('  处置：变更历史/标记/日期进 git commit body 或 design/bug doc；行内 WHY 压成 1 行；私有方法 1 行职责即可。');
  lines.push('  旁路：TEAM_STANDARDS_COMMENT_HOOK=warn 仅提示 / =off 关闭；TEAM_STANDARDS_COMMENT_MAX_BLOCK 调注释块行数阈值。');

  // long-block 是启发式软规则（公开 API 长 dartdoc 易误伤），只提示不阻断；其余客观红线在 block 模式下硬阻断。
  const hasHardFinding = findings.some((f) => f.id !== 'long-block');
  process.stderr.write(lines.join('\n') + '\n');
  process.exit(MODE === 'block' && hasHardFinding ? 2 : 0);
});

function extractAddedText(tool, input) {
  if (tool === 'Write') return typeof input.content === 'string' ? input.content : '';
  if (tool === 'Edit') return typeof input.new_string === 'string' ? input.new_string : '';
  if (tool === 'MultiEdit' && Array.isArray(input.edits)) {
    return input.edits.map((e) => (e && typeof e.new_string === 'string' ? e.new_string : '')).join('\n');
  }
  return '';
}

// 返回去重后的命中规则列表 + 注释块超长
function scan(text, filePath) {
  const token = lineCommentToken(filePath);
  const rawLines = text.split(/\r?\n/);

  const found = new Map(); // id -> {id, desc, sample}
  let inBlock = false;      // 处于 /* ... */ 块内
  let blockRun = 0;         // 连续「整行即注释」的行数
  let blockReported = false;

  for (const original of rawLines) {
    const stripped = stripStrings(original);
    const { commentText, wholeLineComment, blockState } = commentOf(stripped, original, token, inBlock);
    inBlock = blockState;

    if (commentText !== null) {
      // 规则匹配
      for (const rule of RULES) {
        if (!found.has(rule.id) && rule.re.test(commentText)) {
          found.set(rule.id, { id: rule.id, desc: rule.desc, sample: trim(original) });
        }
      }
      if (!found.has('section-divider') && DIVIDER_RE.test(commentText) && META_RE.test(commentText)) {
        found.set('section-divider', {
          id: 'section-divider',
          desc: '带日期/版本/标记的分节线注释（用方法分组表达结构，不画注释分割线）',
          sample: trim(original),
        });
      }
    }

    // 连续注释块计数
    if (wholeLineComment) {
      blockRun += 1;
      if (blockRun > MAX_BLOCK && !blockReported) {
        found.set('long-block', {
          id: 'long-block',
          desc: `连续注释块超过 ${MAX_BLOCK} 行（疑似函数头过载/业务科普/实现史，请自检；公开 API 的当前职责 dartdoc 可忽略）`,
          sample: null,
        });
        blockReported = true;
      }
    } else {
      blockRun = 0;
      blockReported = false;
    }
  }

  return Array.from(found.values());
}

// 解析一行的注释片段。返回 { commentText, wholeLineComment, blockState }
// commentText 为 null 表示该行不含注释。
function commentOf(stripped, original, token, inBlock) {
  const t = stripped.trim();

  if (inBlock) {
    // 块注释内部
    const end = stripped.indexOf('*/');
    if (end === -1) {
      return { commentText: original, wholeLineComment: t.length > 0, blockState: true };
    }
    // 块注释在本行结束；结束后若还有 token 行注释暂不细究
    return { commentText: original.slice(0, end), wholeLineComment: t.startsWith('*') || t.startsWith('/*'), blockState: false };
  }

  // 单行块注释 /* ... */
  const blockStart = stripped.indexOf('/*');
  if (blockStart !== -1) {
    const blockEnd = stripped.indexOf('*/', blockStart + 2);
    const wholeLine = t.startsWith('/*');
    if (blockEnd === -1) {
      return { commentText: original.slice(blockStart), wholeLineComment: wholeLine, blockState: true };
    }
    return { commentText: original.slice(blockStart, blockEnd + 2), wholeLineComment: wholeLine, blockState: false };
  }

  // 行注释 token
  const idx = stripped.indexOf(token);
  if (idx !== -1) {
    const before = stripped.slice(0, idx).trim();
    return { commentText: original.slice(idx), wholeLineComment: before.length === 0, blockState: false };
  }

  // 块注释续行（以 * 开头，虽未在 inBlock，但容错）
  if (t.startsWith('*') && !t.startsWith('*/')) {
    return { commentText: original, wholeLineComment: true, blockState: false };
  }

  return { commentText: null, wholeLineComment: false, blockState: false };
}

function trim(s) {
  const v = s.trim();
  return v.length > 80 ? v.slice(0, 77) + '...' : v;
}
