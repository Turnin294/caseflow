---
name: doc-index-required
description: "MUST invoke before creating/writing/editing/moving/renaming ANY AI-generated Markdown — both user knowledge base `{USER_DOCUMENTS}/ai-docs/{project}/` and project `docs/` (v1.20+ 两处索引体系等同)。Phase-A 写前查重 INDEX,Phase-B 写完登记。豁免:索引文件本身(INDEX.md / 00_index.md)、`work-log/` 日期型日志、纯文案不动结构的编辑。详细 Phase-A/B 流程与例外条件见 SKILL.md body。Applies to ALL working directories."
---

# 文档索引优先原则

## 文档输出路径规则

在创建任何 Markdown 文档目录或文件前，必须先确定输出路径。**默认所有 AI 生成 Markdown 都写入用户文档目录下的项目知识库，按主题归属，不写入项目仓库 `docs/`。**

> **v1.20 起的关键变化：** 用户文档目录 `{USER_DOCUMENTS}/ai-docs/{project}/` 不再被视为「草稿堆」，而是承载本项目知识图谱、1-to-N 功能/方案设计文档、bug 分析、现状梳理等长期资产的**项目级知识库**。该目录下的索引体系（INDEX.md / 00_index.md）与项目 `docs/` 享有同等的 Phase-A / Phase-B 待遇，禁止跳过。

### 默认输出路径

AI 生成的设计文档、Bug 分析、API 文档、知识图谱、现状梳理、扫描记录、对照表、排查笔记等，默认全部写入用户文档目录下当前项目的知识库：

```text
{USER_DOCUMENTS}/ai-docs/{project}/{type}/{topic_path}/{filename}
```

| 占位符 | 含义 | 示例 |
|---|---|---|
| `{USER_DOCUMENTS}` | Windows: `%USERPROFILE%\Documents`；macOS/Linux: `~/Documents`；兜底: `~` | |
| `{project}` | 当前项目目录名（避免多项目混淆） | `order-manage`、`order-biz-aggregator` |
| `{type}` | 文档类型，决定走哪份子索引 | `design`、`bug`、`orientation`、`knowledge-graph`、`work-log`、`api`、`scan` |
| `{topic_path}` | 主题路径（按需求/模块/bug 名归集，**不带日期**） | `退款退单逻辑重构/`、`订单履约/订单附加费必填字段缺失/` |
| `{filename}` | 文件名（**不带日期**，使用 `-current` 或固定主题名） | `退款退货逻辑重构-current.md`、`订单附加费必填字段缺失.md` |

> **路径硬约束（v1.20 起）：**
> - 路径中**禁止**出现 `{agent}/` 层（不再按 claude / codex 隔离，所有 agent 共享同一知识库）
> - 路径中**禁止**出现 `{YYYY-MM-DD}/` 层（同一主题跨会话、跨日期必须稳定汇聚在同一目录）
> - 文件名**禁止**带日期后缀（如 `-20260505-v1.md`）；日期信息由文件 mtime / git log / 文件内变更记录承担
> - **唯一例外**：`work-log/{YYYY-MM-DD}.md`（日期型日志，文件名即索引）

### 用户目录知识库结构

```text
{USER_DOCUMENTS}/ai-docs/{project}/
  INDEX.md                           ← 顶层索引：列出本项目下所有 type 子目录
  design/                            ← 功能/方案设计文档
    INDEX.md                         ← 子索引
    {需求名称}/
      {需求名称}-current.md
      {需求名称}-coding.md           ← 完整模版才有
      {需求名称}-api-current.md      ← 涉及对外接口才有
  bug/                               ← bug 分析文档
    INDEX.md
    {模块名}/                        ← 与 design 模块名对齐；无对应模块时退化为一级扁平
      {bug名称}/
        {bug名称}.md
  orientation/                       ← 重构/迁移前现状梳理
    INDEX.md
    {模块名}/
      {模块名}-现状梳理.md
      {模块名}-ai-ref.md
  knowledge-graph/                   ← 后端知识图谱（结构由 backend-knowledge-graph-required 管控）
    00_index.md                      ← 知识图谱自身入口，替代通用 INDEX.md
    _candidates.md
    _sql_candidates.md
    scenarios/
  work-log/                          ← 每日工作日志（结构由 daily-work-log 管控）
    {YYYY-MM-DD}.md                  ← 不需要 INDEX.md，文件名自身即索引
```

### 子目录例外规则

| 子目录 | 索引文件 | Phase-A | Phase-B |
|---|---|---|---|
| `design/` `bug/` `orientation/` `api/` `scan/` 等通用子目录 | `INDEX.md` | ✅ 必须 | ✅ 必须 |
| `knowledge-graph/` | `00_index.md`（自有结构） | ✅ 必须，但读 `00_index.md` 不读 `INDEX.md` | ✅ 由 backend-knowledge-graph-required 自身负责 |
| `work-log/` | 无（文件名即索引） | ❌ 跳过 | ❌ 跳过；首次创建子目录时仅在顶层 INDEX.md 登记一行 |

### 项目 docs/ 例外

只有以下情况才允许写入项目 `docs/` 并更新项目侧索引：

1. 用户明确给出 `docs/...` 路径
2. 用户明确说"上传终版文档 / 写到项目 docs / 更新项目文档"
3. 当前操作是编辑、移动、整理已有 `docs/` 下的文件

写项目 `docs/` 时按其原有目录约定走，索引格式与用户目录知识库一致（顶层 + 子目录两级 INDEX）。

### 输出路径回显

写文档前必须向用户回显一行：

```text
文档输出路径：{用户目录知识库 / 用户指定项目路径} -> {目标路径}，原因：{一句话}
```

---

## 两阶段流程

无论目标路径是用户目录知识库还是项目 `docs/`，都必须执行 **Phase-A → 文档写作 → Phase-B** 三步流。

| 阶段 | 时机 | 职责 | 包含步骤 |
|------|------|------|---------|
| **Phase-A（前置）** | 文档编写**之前** | 读取索引、分析内容边界、判断新建还是补充 | 第一步 ~ 第三步 |
| **Phase-B（后置）** | 文档编写**之后** | 更新索引，登记新文档或同步变更 | 第五步 |

**调用规则：**
- 调用方（如 `design-doc-required`、`bug-doc-required`、`business-logic-orientation`）写文档前必须调用 Phase-A，写完后必须调用 Phase-B
- 第四步（执行文档写作）由调用方自行完成，本 skill 不负责写作本身
- **`work-log/` 子目录豁免**：`daily-work-log` 写日期型日志时跳过 Phase-A/B；但首次创建 `work-log/` 子目录时仍需在顶层 INDEX.md 登记一行
- **`knowledge-graph/` 子目录半自管**：`backend-knowledge-graph-required` 自管 `00_index.md` 和候选池；本 skill 仅负责在顶层 INDEX.md 登记/更新该子目录条目

## 不适用场景

以下情况**不触发**本 skill：
- 修改非索引、非结构性的文档正文（不增删 `##` 章节、不改首段摘要）
- 对索引文件本身的更新（`INDEX.md`、`{subdir}/INDEX.md`、`knowledge-graph/00_index.md`）
- `work-log/{YYYY-MM-DD}.md` 日志文件的常规追加

---

## Phase-A：前置阶段（文档编写前）

### 第一步：读取顶层索引

读取索引根下的 `INDEX.md`：

| 目标 | 索引根 | 顶层索引文件 |
|---|---|---|
| 用户目录知识库 | `{USER_DOCUMENTS}/ai-docs/{project}/` | `INDEX.md` |
| 项目 docs/ | `{项目根}/docs/` | `INDEX.md` |

**若 `INDEX.md` 不存在：**
扫描索引根下的子目录，向用户展示以下初始化模板请求确认后写入：

```markdown
# {project} 文档索引

| 子目录 | 类型 | 说明 |
|---|---|---|
| [design/](design/INDEX.md) | 设计文档 | 功能/方案/接口设计 |
| [bug/](bug/INDEX.md) | Bug 分析 | bug 复现、根因、修复方案 |
| [orientation/](orientation/INDEX.md) | 现状梳理 | 重构/迁移前的代码现状分析 |
| [knowledge-graph/](knowledge-graph/00_index.md) | 后端知识图谱 | 表关系、SQL、原子能力、状态机 |
| [work-log/](work-log/) | 工作日志 | 每日 Edit/Write 改动记录（无 INDEX，按日期文件） |
```

只列出实际存在的子目录；未来新增 type 时由 Phase-B 追加行。

**若存在：** 读取并理解各子目录的覆盖范围。

---

### 第二步：读取目标子目录索引

根据本次要写的文档所属 `{type}` 子目录，读取对应的索引：

| `{type}` | 索引文件 | 处理 |
|---|---|---|
| `design`、`bug`、`orientation`、`api`、`scan`、其它通用子目录 | `{type}/INDEX.md` | 按下方默认逻辑读取/初始化 |
| `knowledge-graph` | `knowledge-graph/00_index.md` | 由 `backend-knowledge-graph-required` 接管，本 skill 仅做存在性校验 |
| `work-log` | 无 | 跳过本步，直接进入文档写作 |

**若子目录索引不存在：**
扫描该子目录下现有的文档（排除 `INDEX.md`），读取每个主题目录中 `-current.md` 或主文档的首个 H1 标题作为 `{现有文档标题}`（若无 H1 则以目录/文件名去扩展名作为标题），按以下模板初始化：

```markdown
# {project} / {type} 文档索引

## {现有文档标题}
- 文件：`{主题名}/{主题名}-current.md`
- 摘要：（请补充）
- 大纲：（请补充）
```

若子目录下暂无文档，则初始化为空索引：

```markdown
# {project} / {type} 文档索引

（暂无文档）
```

**若存在：** 读取并理解已有主题的标题、摘要、大纲。

---

### 第三步：分析内容边界

基于索引内容，判断本次要写的内容：

| 判断项 | 处理方式 |
|---|---|
| 是否已有完全对应的主题文档？ | 有 → 直接更新已有 `-current.md` 或主文档，**不新建主题目录** |
| 是否与现有文档存在内容重叠？ | 有 → 明确告知重叠范围，建议合并或区分边界后再写 |
| 内容是否全新、无重叠？ | 新建主题目录 + 文档 |

分析结果必须向用户明确说明，获得确认后再写文档。

> **重点：** 默认更新 `-current.md` 而不是新建带版本号的快照。版本快照仅用于"重大基线 / 用户明确要求 / 非 Git 管理且需要留痕"三种场景。

---

> **Phase-A 到此结束。** 调用方现在执行文档写作，完成后再调用 Phase-B。

---

## Phase-B：后置阶段（文档编写后）

### 第四步：（由调用方执行文档写作，本 skill 不介入）

---

### 第五步：半自动更新索引

文档写作完成后，**生成索引更新内容**，向用户展示并请求确认后写入。

**新增主题文档时**，在子目录索引末尾追加：

```markdown
## {主题名}
- 文件：`{主题名}/{主题名}-current.md`（或 `{模块名}/{bug名}/{bug名}.md` 等）
- 摘要：{一句话描述}
- 大纲：{二级标题1} / {二级标题2} / ...
```

同时检查顶层 `INDEX.md` 中是否已登记该 `{type}` 子目录：
- 已有 → 不修改顶层索引
- 没有 → 在顶层索引表中追加该子目录行，一并展示给用户确认

**修改已有文档时**，按以下触发规则更新子目录索引中对应条目：
- 文档的 `##` 二级标题结构发生变化（新增、删除或修改标题文字）→ 更新索引中的大纲字段
- 文档第一段（H1 标题后、第一个 `##` 前的引言/摘要段落）内容发生变化 → 更新索引中的摘要字段

若以上两项均未变化，则跳过索引更新。

---

## 索引文件格式参考

### 顶层 `INDEX.md`

```markdown
# {project} 文档索引

| 子目录 | 类型 | 说明 |
|---|---|---|
| [design/](design/INDEX.md) | 设计文档 | 功能/方案/接口设计 |
| [bug/](bug/INDEX.md) | Bug 分析 | bug 复现、根因、修复方案 |
| [orientation/](orientation/INDEX.md) | 现状梳理 | 重构/迁移前的代码现状分析 |
| [knowledge-graph/](knowledge-graph/00_index.md) | 后端知识图谱 | 表关系、SQL、原子能力、状态机 |
| [work-log/](work-log/) | 工作日志 | 每日 Edit/Write 改动记录 |
```

### 子目录 `{type}/INDEX.md`（design / bug / orientation 通用）

```markdown
# {project} / {type} 文档索引

## {主题名}
- 文件：`{主题名}/{主题名}-current.md`
- 摘要：一句话描述文档内容
- 大纲：背景 / 根因分析 / 解决方案 / 验证方式

## {另一主题名}
- 文件：`{模块名}/{bug名}/{bug名}.md`
- 摘要：...
- 大纲：...
```

---

## 红色警告

| 想法 | 正确处理 |
|---|---|
| "写到用户目录就不用查索引了" | **错**。v1.20 起用户目录知识库与项目 docs/ 索引等同看待，必须先 Phase-A 查重 |
| "同一需求每次新建一个 `-{日期}-v1.md`" | **错**。默认更新 `-current.md`；版本快照仅限重大基线 |
| "路径里加 `claude/` 或 `codex/` 隔离一下吧" | **错**。{agent} 层已废除，所有 AI agent 共享同一知识库 |
| "工作日志也加个 INDEX 吧" | **错**。`work-log/` 文件名即索引，加 INDEX 反而冗余 |
| "知识图谱用通用 INDEX.md 吧" | **错**。`knowledge-graph/` 用 `00_index.md`，由 backend-knowledge-graph-required 管控 |
| "doc-index-required 会自动触发" | **错**。调用方（design-doc / bug-doc / orientation 等）必须显式调用 Phase-A 和 Phase-B |
