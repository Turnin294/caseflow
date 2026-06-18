#!/usr/bin/env node
// =============================================================
// PreToolUse hook: 写/改任何「带 SQL 的文件」之前，
//   检查本会话是否读过项目 knowledge-graph/ddl-baseline.md。
//
// 诞生背景：check-backend-kg-readiness.js 的路径白名单是 Dart/Flutter 专用
//   (lib/features/**/backend/**/*.dart)，对 Java + iBatis / MyBatis XML、
//   .sql、Kotlin/JPA 等项目完全不触发；且它对 ≤20 行小改豁免，而一次
//   「tdate → checkdate」这种 1 行字段名改动恰恰是最该拦的。本 hook 补这个洞：
//     - 语言无关：按「文件是否承载 SQL」判定，不绑定某个技术栈的目录结构
//     - 不豁免小改：1 行 SQL 字段名改动也要先核对 DDL
//     - 专门要求读 ddl-baseline.md（字段名/类型/默认值的权威源），
//       而不是「读过任意一张图谱卡」就算数
//
// 默认 warn 模式（exit 0 + stderr 提示，便于试用期评估误报率）：
//   TEAM_STANDARDS_SQL_DDL_HOOK=block → 硬阻断（exit 2）
//   TEAM_STANDARDS_SQL_DDL_HOOK=off   → 完全跳过
//
// 判定「带 SQL 的文件」（路径或本次新增内容命中任一即算）：
//   - iBatis / MyBatis SqlMap：路径含 /maps/ 的 .xml、*Mapper.xml、*Dao.xml、
//     sqlmap*.xml，或 XML 内容含 <select|<insert|<update|<delete|<sqlMap|<mapper
//   - .sql 文件
//   - 持久层源码：*Dao / *Mapper / *Repository 的 .java/.kt
//   - 内容含裸 SQL / ORM raw query 信号：SELECT..FROM、customSelect(、@Query(、
//     createNativeQuery、$queryRaw、mysql.createConnection、pg.Client 等
//   排除：*_test.* / test 目录
//
// 「已读 DDL 基线」判定：transcript 内出现字面量 ddl-baseline.md
//   （Windows 反斜杠路径同时识别）。读过即放行。
// =============================================================

const fs = require('fs');

const MODE = (process.env.TEAM_STANDARDS_SQL_DDL_HOOK || 'warn').toLowerCase();
if (MODE === 'off') process.exit(0);

const TEST_FILE_PATTERNS = [/_test\.[a-z]+$/i, /[\\/]test[\\/]/i, /[\\/]tests[\\/]/i, /\.spec\.[a-z]+$/i];

// 路径层面的「带 SQL」信号
const SQL_PATH_PATTERNS = [
  /[\\/]maps[\\/][^\\/]+\.xml$/i,        // iBatis 经典布局 .../model/maps/Xxx.xml
  /Mapper\.xml$/i,                        // MyBatis *Mapper.xml
  /Dao\.xml$/i,
  /sqlmap.*\.xml$/i,
  /\.sql$/i,
  /Dao\.(java|kt)$/i,
  /Mapper\.(java|kt)$/i,
  /Repository\.(java|kt)$/i,
];

// 内容层面的「带 SQL」信号（用于命中上面路径之外、但本次改动确实在写 SQL 的情况）
const SQL_CONTENT_SIGNALS = [
  /<\s*(select|insert|update|delete|sqlMap|mapper)\b/i,
  /\bselect\b[\s\S]{0,400}\bfrom\b/i,
  /customSelect\s*\(/i,
  /@Query\s*\(/i,
  /createNativeQuery\s*\(/i,
  /createQuery\s*\(/i,
  /\$queryRaw/i,
  /mysql\.createConnection/i,
  /\bpg\.Client\b/i,
];

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { raw += chunk; });
process.stdin.on('end', () => {
  let payload;
  try { payload = JSON.parse(raw); } catch (e) { process.exit(0); }

  const toolName = payload.tool_name;
  if (toolName !== 'Write' && toolName !== 'Edit' && toolName !== 'MultiEdit') process.exit(0);

  const input = payload.tool_input || {};
  const targetPath = typeof input.file_path === 'string' ? input.file_path : '';
  if (!targetPath) process.exit(0);

  if (TEST_FILE_PATTERNS.some((r) => r.test(targetPath))) process.exit(0);

  const editedText = collectEditedText(input);
  if (!isSqlBearing(targetPath, editedText)) process.exit(0);

  if (hasReadDdlBaseline(payload.transcript_path)) process.exit(0);

  const msg =
    '[team-standards] 即将写/改 SQL / Mapper，但本会话尚未读过项目 DDL 基线。\n' +
    `  目标文件：${targetPath}\n` +
    '  改 SQL 前必做（backend-knowledge-graph-required 规范）：\n' +
    '    1) Read DDL 基线（集中库 project-domain-knowledge 的 knowledge/{project}/impl/ddl-baseline.md，或项目 knowledge-graph/ddl-baseline.md），按目标表名核对字段名 / 类型 / 默认值 / 索引；\n' +
    '    2) 若该文件不存在 → 先 dump DDL 基线再写 SQL（Oracle 可查 ALL_TAB_COLUMNS / expdp METADATA_ONLY）；\n' +
    '    3) Read 命中的 knowledge-graph/scenarios/*.md 确认取数口径（如「某时间字段取 makedate 还是 checkdate」）。\n' +
    '  原因：不核对 DDL 凭记忆写字段名，是 no such column / 取错字段口径 类连环 bug 的根因。\n' +
    '  旁路：TEAM_STANDARDS_SQL_DDL_HOOK=off 关闭 / =block 升级硬阻断。\n';

  process.stderr.write(msg);
  process.exit(MODE === 'block' ? 2 : 0);
});

function collectEditedText(input) {
  const parts = [];
  if (typeof input.content === 'string') parts.push(input.content);
  if (typeof input.new_string === 'string') parts.push(input.new_string);
  if (typeof input.old_string === 'string') parts.push(input.old_string);
  if (Array.isArray(input.edits)) {
    for (const e of input.edits) {
      if (e && typeof e.new_string === 'string') parts.push(e.new_string);
      if (e && typeof e.old_string === 'string') parts.push(e.old_string);
    }
  }
  return parts.join('\n').slice(0, 20000);
}

function isSqlBearing(filePath, text) {
  if (SQL_PATH_PATTERNS.some((r) => r.test(filePath))) return true;
  if (text && SQL_CONTENT_SIGNALS.some((r) => r.test(text))) return true;
  return false;
}

function hasReadDdlBaseline(transcriptPath) {
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return false;
  let content;
  try { content = fs.readFileSync(transcriptPath, 'utf8'); } catch (e) { return false; }
  return content.includes('ddl-baseline.md') || content.includes('ddl-baseline');
}
