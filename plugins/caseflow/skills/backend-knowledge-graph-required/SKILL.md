---
name: backend-knowledge-graph-required
description: "Use BEFORE answering single-service backend questions about table relations / ER / SQL / state transitions / atomic capabilities or project-level technical pain points (subprocess, concurrency, perf, external deps); BEFORE Write/Edit any .md describing such content (anywhere — docs/, ai-docs/, scenarios/, work-log/). Auto-append candidates to `_candidates.md` after investigation discovers reusable facts, or when same tech concern raised ≥3 rounds in one session. Knowledge graph ownership = investigated service, not cwd. Detailed triggers (7 BLOCKING conditions) and scope boundaries listed in `## BLOCKING 强触发清单` section of SKILL.md body."
---

# 后端单服务知识图谱

## 定位

本 skill 负责 **后端单服务业务图谱 + 项目级技术难点图谱** 双重职责：

1. **后端业务图谱**（原有职责）：接口开发中反复使用的 **表逻辑关系、全景 ER、SQL 查询逻辑、状态判定规则、业务流程读写顺序、可复用原子函数**。
2. **项目级技术难点图谱**（v1.21+ 扩展）：会话中**反复出现的非业务技术陷阱** —— 子进程编排、并发模型、性能瓶颈、资源争夺、外部依赖编排、运维边界、JVM/进程生命周期、缓存键策略、超时与回收机制等。这类陷阱不是 SQL 也不是表关系，但同样需要沉淀，避免下次同坑再踩。

目标是让 AI 在后端接口开发前先理解：

- 这个服务有哪些领域能力、原子能力、编排能力
- 哪些 API、Service、Repository、Mapper 是入口
- 涉及哪些表、表关系、枚举、状态机、事务边界、外部依赖
- 一个业务流程如何读写表、调用能力、流转状态、判定业务结果
- 订单部分退、订单业务状态判定、可退金额/可退商品等链式规则是否已有沉淀
- 某个业务查询到底由哪些表 join、哪些过滤条件、哪些聚合字段组成，是否已有 SQL 指纹可复用
- 当前需求是否应该复用已有原子能力，而不是重新写一遍 SQL / 判定逻辑
- **本服务有哪些已知的技术陷阱、性能边界、并发约束**（本次需求会不会再踩）

**长对话识别**是项目级技术难点的最重要触发信号：用户在同一会话中对同一技术点反复疑问 / 多轮验证 / 出现回归性措辞，就是该技术点应当沉淀的强证据。AI **不必等用户显式说"记到知识图谱"**，命中长对话模式即自动追加候选记录。

不处理前端 UI 或跨项目全局拓扑。

## BLOCKING 强触发清单（写前 / 答前拦截）

下列任一场景命中即必须**第一时间**调起本 skill，先做候选沉淀路由判定，再继续答题或落盘。错过这些时机就是流程违反。

| 触发场景 | 命中信号 | 必做动作 |
|---|---|---|
| **Write/Edit 一份描述后端表关系 / ER / SQL / 状态扭转 / 业务流程 → 表 CRUD 的 .md**（无论路径，包括 `ai-docs/`、`work-log/`、`scenarios/` 而不仅 `docs/`） | 文档主体含表名 + 关联键 + SQL / DAO / Mapper + state/字段判定 + 数据流箭头 | 先按本 skill 决定归属命名空间和模板，再 Write |
| **用户问询表关系 / SQL 查询逻辑类问题** | "X 与 Y 是 1:1 还是 1:N"、"改这个动哪些表"、"字段从哪来"、"这个业务怎么查"、"这个 SQL 怎么写/完善"、"退款/订单/流水/分摊怎么算"、"是新建快照还是引用原表"、"哪个状态会变" | 答题同时把事实追加到候选沉淀池；涉及查询时同步记录 SQL 指纹候选 |
| **AI 已完成后端代码调查并发现 ≥1 条可复用事实**（含跨项目"以另一服务为调查对象"的场景） | 调查报告里出现具体表/SQL/DAO/Mapper/Service/枚举/状态值 | 调查结论给用户的同一回合，必须将事实候选追加到被调查项目命名空间下的候选池；有 SQL 时同步到查询索引候选 |
| 用户主动要求 | "建知识图谱"、"整理图谱"、"更新图谱"、"归档" | 先读候选池 + 现有正式图谱 + 代码证据，再写正式图谱 |
| 项目已有正式图谱 | 存在 `docs/knowledge-graph/backend/` | 编码前必先回顾相关卡片，编码后必同步回写 |
| 后端代码变更 | 新增/修改 API、Service、DAO、SQL、表、枚举、状态机、事务边界、MQ、外部依赖 | 同步更新对应卡片或候选池 |
| **同一技术主题反复疑问 ≥3 轮**（项目级技术难点） | 用户在同一会话中对同一技术点重复提问 / 验证 / 担忧 ≥3 次；或出现回归性措辞："为什么...还" / "怎么又..." / "上次说..." / "是不是...占用了" / "现在又卡了"；或修复后 ≥2 轮验证性追问 | 答题同一回合**自动追加候选**到 `_candidates.md`，分类标记 `技术难点`；超过 5 轮反复或用户显式提示"这是核心点"时主动起 `scenarios/` 场景卡 |
| **AI 完成涉及子进程 / 并发 / 性能 / 资源边界的代码改动** | 修复 transferTo 阻塞、Semaphore 限流、孤儿进程清理、缓存键策略、超时回收、磁盘/CPU 争夺等"非业务技术陷阱" | 编码后必候选记录；用户提示"这是难点要登记"时立刻整理为正式场景卡 |
| **会话首次 Write/Edit 后端业务源码**（路径含 `src/main/java/**/service/**/*.java` 或 `src/main/java/**/(dao|mapper)/**/*.java`，非测试文件，非 ≤1 文件 ∧ ≤20 行的小改） | hook `check-backend-kg-readiness.js` PreToolUse 兜底（v1.28 起默认 warn 模式 exit 0 + stderr 提示，`CASEFLOW_BACKEND_KG_HOOK=block` 升级硬阻断、=off 关闭）；transcript 内 0 次 Read `**/knowledge-graph/00_index.md` 或 `**/knowledge-graph/scenarios/*.md` 或 `**/knowledge-graph/ddl-baseline.md` | 立即停止 Edit，先 Read 项目对应 `knowledge-graph/00_index.md` 按关键词反查命中场景卡再继续；命中场景卡也读完后才回到原 Edit |
| **即将写 SQL / 改 DAO / Mapper / Repository / JPA @Query / MyBatis SqlMap XML**，但项目 `knowledge-graph/ddl-baseline.md` 不存在 | 项目存在持久层代码（grep 任一命中：`@Query` / `@Repository` / `@Mapper` / `mysql.createConnection` / `pg.Client`；MyBatis 的 `<select`/`<insert`/`<update`/`<sqlMap`/`<mapper` 或 `*Mapper.xml`/`*Dao.xml`/`maps/*.xml`；Java/Kotlin 的 `*Dao.java`/`*Mapper.java`/`*Repository.*`；`.sql` 文件），但用户目录 + 项目 docs 两处的 `knowledge-graph/ddl-baseline.md` 都查不到 | **先 dump DDL 基线再写 SQL**——按项目 DB 引擎选 dump 命令（详见下方「DDL 基线」节；Oracle 用 `expdp ... CONTENT=METADATA_ONLY` 或查 `ALL_TAB_COLUMNS`/`ALL_CONSTRAINTS`），把 schema 全景落到 `knowledge-graph/ddl-baseline.md`；不要凭 ORM 实体类 / model POJO 反推 schema（只展示子集，DEFAULT/INDEX/CHECK/可空 等元信息容易丢失） |
| **即将写/改任何带 SQL 的文件**（MyBatis XML、`.sql`、`*Dao`/`*Mapper`/`*Repository`、含裸 SQL 或 ORM raw query 的源码），**无论改动大小**（1 行字段名改动也算） | hook `check-sql-ddl-readiness.js` PreToolUse 兜底（默认 warn 模式 exit 0 + stderr 提示，`CASEFLOW_SQL_DDL_HOOK=block` 升级硬阻断、=off 关闭）；transcript 内 0 次 Read `**/knowledge-graph/ddl-baseline.md` | **改前必先 Read `ddl-baseline.md`**，按目标表名核对字段名/类型/默认值/索引，再 Read 命中的 `scenarios/*.md` 确认取数口径（如某时间字段取 `make_date` 还是 `check_date`），然后才动 SQL；未核对 DDL 凭记忆写字段名 = 流程违反，是 `Unknown column` / 取错字段口径 类连环 bug 的根因 |

> **常见误判反例（已发生过的踩坑）**：
> - ❌ "用户只是问云端逻辑，没让我建图谱，所以不用触发" → **错**，问询场景必触发并候选沉淀
> - ❌ "用户只是让我完善 SQL，所以只回答 SQL 就行" → **错**，必须归档查询逻辑、涉及表、join/where/group by/order by、业务语义和复用原子能力
> - ❌ "本地工程没有 `docs/knowledge-graph/backend/`，所以 skill 不适用" → **错**，没有就先写候选池
> - ❌ "主目录是 A，调查的是 B 云端，所以归属也按主目录算" → **错**，单服务图谱归属 = 被调查的那个服务，与 cwd 无关
> - ❌ "我直接 Write 一份图谱文档就行了" → **错**，写前必经本 skill 决定归属和模板
> - ❌ "技术难点（子进程 / 并发 / 性能）不是表关系，所以不归本 skill" → **错**，本 skill v1.21 起范围已扩到项目级技术难点；用户反复疑问的技术陷阱必须沉淀
> - ❌ "用户没显式说'记到知识图谱'，所以不用沉淀" → **错**，会话同主题反复疑问 ≥3 轮即自动触发，无需用户提醒；事后才记容易丢上下文
> - ❌ "技术难点等下次会话再说" → **错**，当场记录，错过即流程违反；会话结束后重新还原难点上下文成本极高
> - ❌ "改 bug 直接 grep + Read 源码就够了，不需要先读图谱" → **错**，v1.28 起 `check-backend-kg-readiness.js` 在 PreToolUse 兜底提示；非小改的后端业务源码 Edit 前未读过 `knowledge-graph/00_index.md` 或场景卡即 hook 告警；图谱里的金额口径 / 状态判定 / SQL 指纹 / 原子能力索引能省去 grep 重复发明的轮次
## 调查对象与图谱归属路由

**核心规则：图谱归属永远 = 被调查的后端单服务项目，与当前主工作目录无关。**

| 主目录 | 调查对象 | 图谱归属命名空间 |
|---|---|---|
| 本服务自身 | 本服务自身 | 本服务 |
| 项目 A（前端 / 调用方） | 项目 B（云端单服务） | **项目 B** |
| 项目 A（前端） | 同时跨 A+B | A 的归 A、B 的归 B；各自服务内部图谱分别沉淀到各自命名空间 |

候选池默认路径（被调查项目命名空间下）：

```text
{USER_DOCUMENTS}/ai-docs/{被调查项目}/knowledge-graph/_candidates.md
{USER_DOCUMENTS}/ai-docs/{被调查项目}/knowledge-graph/scenarios/{场景}.md
{USER_DOCUMENTS}/ai-docs/{被调查项目}/knowledge-graph/00_index.md
```

正式图谱路径（用户明确要求"上传终版到项目内"才走）：

```text
{被调查项目根目录}/docs/knowledge-graph/backend/...
```

**单服务图谱的边界**：
- 描述对象是**单一后端服务内部**的表 / 状态 / 能力 → 本 skill
- 描述对象是**两个工程之间**的接口对照、调用链、数据流方向 → 不在本 skill 范围，本 skill 只在单服务图谱中保留「外部依赖」视角
- 同一会话可能涉及多个服务：先用本 skill 分别沉淀各自服务内部图谱，服务间链路只在「外部依赖」节点到为止

## 核心原则

**后端接口开发不是只写接口文档，还必须沉淀表逻辑知识。**

凡是本次开发涉及 DAO/Mapper/SQL、表状态、订单/退款/支付等业务判定、事务、锁、幂等或跨表组合查询，AI 必须把这些关系纳入后端知识图谱闭环：

```text
编码前：先回顾表逻辑图谱 + 原子能力索引
编码中：优先复用已有原子能力 / DAO 原子查询
编码后：把新增或变更的表读写、状态变化、判定逻辑同步回图谱
```

如果项目尚无正式图谱，也不能让事实散落在会话里。必须写入用户目录候选池，至少沉淀“表逻辑候选记录”，后续确认或代码验证后再整理进正式图谱。

**SQL 是后端知识图谱的一等资产。** 只要会话中提到了某个业务查询逻辑、SQL、DAO/Mapper 方法、join 关系、过滤条件、聚合条件或排序分页规则，就必须沉淀为可合并的 SQL 指纹：

```text
业务问题 → 涉及表/ER → SQL 指纹 → 原子能力 → 代码坐标 → 复用建议
```

SQL 图谱不追求保存一堆一次性 SQL 字符串，而是归档“业务查询能力”：

- 这个查询回答什么业务问题
- 从哪些表取数，主表和关联表是什么关系
- join/on、where、group by、having、order by、limit 的业务语义是什么
- 读取了哪些状态/金额/时间字段，是否依赖枚举
- 对应 DAO/Mapper/Repository/Service 原子能力在哪里
- 后续新增接口能否直接复用，不能复用时缺什么字段/索引/原子能力

## 推荐目录（渐进式三层骨架）

**核心理念：第一份图谱只要 1 份场景卡 + 1 份扁平索引就算建立。** 不要求 8 文件齐全才叫图谱——通过多个细小场景小卡渐进汇总成全景，是这套图谱的设计目标。

### Tier 1 — 起步（必须，最小可用）

新建图谱时只需要这几个文件即可投入使用：

```text
{命名空间根}/knowledge-graph/
  00_index.md                        # 扁平索引：每个场景一行 + 关键词反查表
  scenarios/{业务场景}.md            # 一图一表的场景小卡（一图一表是底线）
  _candidates.md                     # 候选沉淀池（未代码验证的会话事实）
  _sql_candidates.md                 # SQL / 查询逻辑候选池（未正式合并的查询指纹）
  ddl-baseline.md                    # ⭐ DDL 基线（涉及任何 DB 表读写的项目必有）
```

**`ddl-baseline.md` 是涉及 DB 操作项目的硬必需，不是可选。** 详见下方「DDL 基线」专节——
凡是项目里有 SQL / DAO / Mapper / Repository / JPA Entity 等
持久层代码，都必须配套有一份从**真实 schema 源**（pg_dump / mysqldump 等）
dump 出来的 DDL 全景，让 AI 编写 SQL 前能一站式速查字段名 / 类型 / 默认值 / 索引，
避免凭记忆写出错误字段名引发的连环 bug。

每张场景小卡至少包含：

- 一句话总述
- 一张关系图（mermaid，遵守 `markdown-writing-standards`）
- 表/字段速查表（每张表 1-2 行）
- 核心规则（图里看不出的语义，每条带代码坐标）
- 已知疑点（如有）
- 与其他场景的交叉引用（如有）

`00_index.md` 至少包含：

```markdown
| 场景 | 主表 | 一句话 | 关键词 | 文件 |
|---|---|---|---|---|
| 订单分摊数据模型 | order_main / order_item / order_item_allocate / order_discount | 1 order + N 明细 + 按明细生成分摊项 + 按比例分摊优惠 | 订单 / 分摊 / 明细 / 流水 | scenarios/订单分摊数据模型.md |
```

### Tier 2 — 成熟（≥3 个场景后再细分，按需新增）

当已有 ≥3 张场景小卡，且发现表 / 枚举 / 流程 / 原子能力被多个场景共享时，再单独建以下卡片：

```text
{命名空间根}/knowledge-graph/
  tables/{table-name}.md             # 高频被多场景引用的表
  enums/{enum-name}.md               # 高频枚举字典
  flows/{flow-name}.md               # 跨多场景的业务流程
  atomic-capabilities/{cap}.md       # 被多接口复用的原子能力
  07_table_logic_index.md            # 表逻辑反查索引（场景多了再建）
  08_atomic_capability_index.md      # 原子能力索引（能力多了再建）
  09_sql_query_index.md              # 原子能力 ↔ SQL 查询逻辑索引（查询多了再建）
  sql-queries/{business-scenario}.md # 按业务场景合并后的 SQL 查询卡
```

### Tier 3 — 全景（≥10 个场景或正式发版前再建，可选）

仅在图谱规模足够大、需要给 AI 做"先读图谱再读代码"门控时再补：

```text
{命名空间根}/knowledge-graph/
  00_backend_service_profile.md      # 服务画像
  01_domain_capability_map.md        # 领域能力地图
  02_data_model_map.md               # 数据模型总览
  03_enum_dictionary.md              # 枚举总字典
  04_api_entrypoints.md              # API 入口总表
  05_external_dependencies.md        # 外部依赖
  06_business_flow_index.md          # 流程总索引
```

### 命名空间路径选择

| 阶段 | 命名空间根 | 何时使用 |
|---|---|---|
| 候选 / 草稿 | `{USER_DOCUMENTS}/ai-docs/{被调查项目}/knowledge-graph/` | 默认；AI 起草、未确认、未代码验证 |
| 正式 | `{被调查项目根目录}/docs/knowledge-graph/backend/` | 用户明确要求"上传终版到项目内"才走，遵循 `doc-index-required` |

**入门门槛兜底**：项目尚未有任何图谱时，本 skill 第一次落盘只产出 Tier 1 的最小文件即可（`00_index.md` + 1 张 `scenarios/{xxx}.md` + `_candidates.md`；若本次涉及 SQL，再加 `_sql_candidates.md`），不要一次性铺满 Tier 3。

### SQL 图谱渐进规则

SQL 图谱同样按渐进方式建立：

| 阶段 | 文件 | 何时创建 |
|---|---|---|
| 候选 | `_sql_candidates.md` | 任意会话提到业务查询、SQL、DAO/Mapper 查询逻辑时立即追加 |
| 索引 | `09_sql_query_index.md` | 同一项目累计 ≥3 条 SQL 候选，或用户要求“整理 SQL / 完善 SQL / 归档查询逻辑”时创建 |
| 场景卡 | `sql-queries/{business-scenario}.md` | 同一业务场景存在 ≥2 条查询，或一个 SQL 涉及 ≥3 张表 / 聚合 / 状态判定时创建 |
| 全景 ER | `02_data_model_map.md` + `tables/{table}.md` | 累计 ≥5 张核心表，或用户要求“全景 ER 图”时创建 / 更新 |

**SQL 候选不可长期散落。** 当用户要求“整理 / 归档 / 完善 SQL”时，必须先读取 `_sql_candidates.md`、`09_sql_query_index.md`、命中的 `sql-queries/` 与表卡，然后去重合并，更新正式索引和场景卡。

### DDL 基线（涉及 DB 操作的项目硬必需）

**核心约定**：凡是项目里有任何持久层代码（SQL / DAO / Mapper / Repository / JPA Entity 等），知识图谱**必须**配套一份 `knowledge-graph/ddl-baseline.md`，作为 SQL 编写、字段语义、索引信息的权威源。

**Why（为什么是 DDL 而不是 ORM 实体类）**：

- **ORM 实体类只展示子集**：JPA `@Entity` / MyBatis-Plus `@TableName` 通常只声明列名 + 类型，`DEFAULT` 值、`NULL` 约束、复合索引、CHECK 约束、FOREIGN KEY 行为等 schema 元信息容易遗漏或脱节
- **靠 grep ORM 类难以一站式速查**：项目里 80 张表分散在 80 个文件，写一次 SQL 要跳 N 次；一份 DDL dump 是 70KB 单文件，AI 一次 Read 就拿到全景
- **DB 迁移后 ORM 与真实 schema 可能漂移**：DDL 直接从 DB 引擎的 schema 系统表（information_schema / pg_catalog）dump，是**事实**而非**意图**
- **避免凭记忆写字段名引发的连环 bug**：本规则的诞生背景就是订单分摊场景反复出现"`order_item` 表无 `order_id` 字段"等踩坑案例

**触发条件**：

| 项目特征 | 是否需要 ddl-baseline.md |
|---|---|
| 项目有任何 `customSelect` / 裸 SQL 字符串 | 需要 |
| 项目用 ORM 但 service 偶尔写 raw query | 需要 |
| 项目纯 ORM、所有查询走 typed query builder | 强烈推荐（仍能从 DDL 看到索引、默认值、约束） |
| 项目无 DB（如纯计算服务） | 不需要 |

**标准路径与命名**：

```text
{命名空间根}/knowledge-graph/ddl-baseline.md
```

不要拆 `ddl/{table}.md`——分散后失去"一次 Read 拿全景"的核心价值。表多到一份文件不便读时，可在文档内按业务域分章节，但单文件原则不变。

**权威源 = 团队集中知识库，不是个人 ai-docs、也不是各业务项目自己的 docs/（避免每人/每项目各一份漂移）**：

- 本团队集中库 = **`project-domain-knowledge` 仓**（domain-knowledge MCP 生态，owner 统一维护、全员同步）。单项目实现知识放其**实现知识区 `knowledge/{project}/impl/`**：
  - 全量 `ddl-baseline.md` = **不带 `id` 的仓库资产**（不入 MCP 索引，按表名 grep），随仓分发；
  - 小导引/查询卡（带 `id`，`module: impl`，`type: reference|sql`）入 MCP 索引，`search("DDL"/表名)` 可命中。
- 个人 `{USER_DOCUMENTS}/ai-docs/{项目}/knowledge-graph/` 只作**草稿/候选**；dump 或更正后**必须 promote 到集中库 `impl/`**，并在 ai-docs 标注"以集中库为准"。
- ❌ 反例（已踩坑）：把 dump 出的真实 DDL 只留个人 ai-docs（或只塞进某业务项目自己的 docs/）就收工 → 各存一份、随时间漂移、彼此矛盾，正是"专人集中维护"要消灭的。
- 退化场景：团队没有集中 PDK 仓时，才退回项目自带 `docs/knowledge-graph/`。

**dump 命令模板（按 DB 引擎）**：

| DB 引擎 | dump 命令 |
|---|---|
| MySQL | `mysqldump --no-data --skip-add-drop-table --compact $DATABASE > schema.sql` |
| PostgreSQL | `pg_dump --schema-only --no-owner --no-privileges $DATABASE_URL` |
| MSSQL | `sqlcmd -S server -d db -Q "..." -E -o schema.sql`（按需写脚本） |
| Oracle | `expdp ... CONTENT=METADATA_ONLY` 或 SQL Developer 导出 schema |

如果项目用 MyBatis-Plus / JPA 等通过实体类映射 schema 的框架，原则上 source of truth 仍是真实 DB——必须 dump 一份**真实 DB 实例**（dev 或 test 环境）的 schema 作为 ddl-baseline，因为实体类不展示 schema 历史迁移叠加后的真实形态。

**文档结构要求**：

```markdown
# DDL 基线 · {项目名} {DB 类型} schema

> 用途：编写 SQL / 改 DAO / 设计接口前 **必读** 的权威 schema 源。
> 数据源：{真实 DB 路径 / 连接信息（脱敏）}，按 {pg_dump / mysqldump} 实时 dump。
> 表数量：{N} 张表 + {M} 个索引
> 更新时机：项目 schema 迁移后重新 dump（脚本见文末「维护脚本」段）
>
> **强约束**：编写任何 SQL 前必须先读本文档对应表段——确认字段名 / 类型 / 默认值 / 索引；
> 不要凭记忆写表/字段名。

## 表清单（按字母序 / 按业务域）
... TOC 链接 ...

## {table-name}

\`\`\`sql
CREATE TABLE ... ;
CREATE INDEX ... ON ... ;
\`\`\`

## 维护脚本

\`\`\`bash
{dump 命令}
\`\`\`
```

**维护时机**：

- **schema 迁移上线后**（新增表 / 删除列 / 改索引 / 改 DEFAULT 等）必须立即重新 dump，否则 AI 编码时按过期 DDL 写 SQL 会爆 `no such column`
- 与 `tables/{table}.md`（业务语义注解卡，Tier 2）的关系：**DDL 是源，tables 卡是注解**——tables/{table}.md 引用 DDL 中相应字段并补业务含义、读写能力、状态语义等，禁止重复抄一份 CREATE TABLE
- 推荐把 dump 脚本放在用户本机 `~/scripts/` 或 IDE workspace 根目录（**不入 git 仓库**），避免脚本里硬编码 DB 连接信息泄漏

**hook 集成**：

两道 PreToolUse hook 协同兜底：

- `check-backend-kg-readiness.js`（默认启用）的"已读图谱"字面量白名单包含 `knowledge-graph/ddl-baseline.md`——但它只匹配 **Java 后端 service 路径**（`src/main/java/**/service/**/*.java`）且豁免 ≤20 行小改，对 MyBatis XML、`.sql` 等不触发。
- `check-sql-ddl-readiness.js`（默认启用，**语言无关**）补这个洞：在写/改**任何带 SQL 的文件**（MyBatis XML、`.sql`、`*Dao`/`*Mapper`/`*Repository`、含裸 SQL/ORM raw query 的源码）之前，检查本会话是否 Read 过 `ddl-baseline.md`；**不豁免小改**（1 行 SQL 字段名改动也拦）。AI 写 SQL 前 Read 一次 DDL 基线即满足。`CASEFLOW_SQL_DDL_HOOK=block|warn|off` 调档。

## 后端接口开发强制闭环

### 编码前：表逻辑回顾

开始分析或实现后端接口前，只要本次涉及数据库读写、状态判定、订单/退款/支付等业务对象，必须先按顺序回顾：

1. **`ddl-baseline.md`**：按目标表名直接定位 CREATE TABLE / INDEX，确认字段名 / 类型 / 默认值 / 索引（涉及 DB 操作的项目此项跳不过）
2. `07_table_logic_index.md`：按业务对象/场景反查表关系和判定规则
3. `08_atomic_capability_index.md`：按业务关键词反查可复用原子能力
4. `09_sql_query_index.md`：按业务关键词 / 表名 / DAO 方法反查已有 SQL 查询逻辑
5. 命中的 `table-logic/{scenario}.md`
6. 命中的 `atomic-capabilities/{capability}.md`
7. 命中的 `sql-queries/{business-scenario}.md`
8. 相关 `tables/{table-name}.md`、`flows/{flow-name}.md`、`enums/{enum-name}.md`
9. 最后才读 DAO/Mapper/Service 代码

若上述文件不存在，应在设计/编码过程中创建用户目录候选记录，不得因为“还没建图谱”就跳过沉淀。

### 编码中：原子能力复用

写后端 Service / Handler / UseCase 主流程时，必须主动判断：

| 问题 | 正确动作 |
|------|----------|
| 已有表逻辑图谱说明了该判定 | 按图谱回到代码坐标复用，不重新发明规则 |
| 已有原子能力覆盖该计算/查询 | 注入/调用原子能力，禁止复制 SQL 或业务计算 |
| 只有 DAO 原子查询，没有业务原子能力 | 优先复用 DAO；若本次组合逻辑会被多接口复用，沉淀新原子能力 |
| 发现旧代码有重复判定 | 本次改动范围允许时抽出原子函数；否则登记“待抽取原子能力”候选 |
| 已有 `09_sql_query_index.md` 命中类似 SQL | 复用现有 DAO/Mapper/SQL 指纹，只补差异条件，不重新拼一份相似查询 |

典型原子能力包括但不限于：

- 按订单计算可退金额
- 判定订单是否部分退 / 全退 / 不可退
- 聚合订单商品退款状态
- 按支付流水查原支付记录
- 判定订单业务状态展示码
- 按表组合判断是否允许取消、退款、改价、重试

### 编码中：SQL 复用与完善

当用户要求“完善 SQL”或 AI 需要新增 / 修改查询时，必须按以下顺序处理：

1. **先查图谱**：`09_sql_query_index.md` → `sql-queries/` → `tables/` / `02_data_model_map.md`
2. **定位原子能力**：确认是否已有 DAO/Mapper/Repository/Service 方法覆盖同一业务问题
3. **对比差异**：新增条件是过滤字段、状态枚举、聚合字段、排序分页还是权限租户边界
4. **完善 SQL 指纹**：只补必要字段 / join / where / group by / having / order by，不复制一份语义相近的新 SQL
5. **回写图谱**：把最终 SQL、业务语义、参数、返回字段、索引建议、代码坐标写回 `_sql_candidates.md` 或正式 `09_sql_query_index.md` / `sql-queries/`

SQL 完善输出时必须显式说明：

```text
SQL 完善依据：
- 业务问题：
- 复用 / 参考的原子能力：
- 涉及表与 ER 关系：
- 新增或调整的 join / where / group by / order by：
- 状态 / 枚举 / 金额字段语义：
- 索引风险：
- 需回写图谱：
```

### 编码后：图谱回写

后端源码改动完成后，只要命中以下任一项，必须更新正式图谱或候选池：

- 新增/修改 SQL、DAO、Mapper、Repository
- 新增/修改表过滤条件、join 关系、聚合逻辑
- 新增/修改订单/退款/支付等业务状态判定
- 新增/修改枚举值、状态流转、字段含义
- 新增/修改事务边界、锁、幂等、补偿
- 新增可复用原子能力，或发现应抽取但暂未抽取的重复逻辑

回写最少包含：

```text
- 本次接口 / 能力名称
- 涉及表与读写动作
- 表之间业务关系
- 状态字段变化或判定规则
- 可复用原子能力 / DAO 方法
- 代码坐标
- 对后续新增接口的支持判断
```

## 候选沉淀池

为避免会话中的业务事实遗漏，后端知识图谱采用“两段式沉淀”：

```text
会话提及 / 代码分析发现
  → 自动记录到候选沉淀池
  → 用户确认或证据校验
  → 整理进入正式知识图谱
```

候选沉淀池默认写入用户目录被调查项目命名空间下，不写项目 `docs/`：

```text
{USER_DOCUMENTS}/ai-docs/{被调查项目}/knowledge-graph/_candidates.md
{USER_DOCUMENTS}/ai-docs/{被调查项目}/knowledge-graph/_sql_candidates.md
```

> 说明：v1.18.7 起候选池路径精简为 `_candidates.md`（按被调查项目而非按日期/agent 分），便于跨日期跨会话累积同主题事实并最终归并到 scenarios 卡。旧版 `{agent}/{YYYY-MM-DD}/backend-kg-candidates.md` 路径仅作向后兼容，不再推荐新增。

**自动追加规则（强制）**：

AI 在会话中只要回答了任何关于后端表关系 / 业务判定 / 状态扭转 / 字段语义的问题，**即便用户没要求"建图谱"**，回答的同一回合内必须自动追加 1 条候选记录到 `_candidates.md`。这是本 skill 的最低收口动作——错过即流程违反。

AI 在会话中只要回答了任何关于 SQL / DAO / Mapper / 查询逻辑 / 过滤条件 / join / 聚合的问题，**同一回合还必须自动追加 1 条 SQL 候选记录到 `_sql_candidates.md`**。如果答案里出现了 SQL 代码块、伪 SQL、查询字段清单、表 join 说明或 DAO 方法名，就视为命中。

候选池用于防遗漏，正式图谱用于可信引用。二者职责必须分开。

每条候选记录最少格式：

```markdown
## YYYY-MM-DD HH:MM | {场景关键词}
- 事实：{一句话业务事实}
- 涉及：{表/枚举/状态字段}
- 来源：{代码坐标 or 用户描述 or 设计文档 or 调查报告}
- 可信度：待确认 / 已确认 / 已代码验证
- 后续动作：{待用户确认 / 待代码核验 / 可整理入正式 scenarios 卡}
```

SQL 候选记录最少格式：

```markdown
## YYYY-MM-DD HH:MM | {业务问题 / 查询能力}
- 业务问题：{这个 SQL 回答什么问题}
- SQL 指纹：{SELECT 主字段 FROM 主表 JOIN ... WHERE ... GROUP BY ... ORDER BY ...，可脱敏 / 参数化}
- 参数：{入参及业务含义}
- 返回字段：{字段及业务含义}
- 涉及表：{主表、关联表、关联键}
- 过滤 / 聚合 / 排序：{where/group by/having/order by 的业务语义}
- 状态 / 枚举：{字段值与枚举含义}
- 原子能力：{DAO/Mapper/Repository/Service 方法，未知则写待定位}
- 代码坐标：{文件:行 / 方法名，未知则写待定位}
- 索引建议：{可能需要的索引，未知则写待评估}
- 可信度：待确认 / 已确认 / 已代码验证
- 合并目标：`09_sql_query_index.md` / `sql-queries/{场景}.md` / `tables/{table}.md`
```

### SQL 自动归档与合并规则

整理 SQL 图谱时，必须先按“SQL 指纹”去重，而不是按原始字符串去重：

| 合并维度 | 说明 |
|---|---|
| 业务问题 | 同样回答“订单可退金额 / 退款流水池 / 订单明细查询”等问题的 SQL 归为同一查询能力 |
| 主表 + 关联表 | 主表相同、join 链路相同，只是 where 条件不同，合并为同一 SQL 卡的变体 |
| 过滤语义 | `deleted=0`、租户/机构、状态枚举、时间范围、金额方向等按语义归并 |
| 聚合语义 | `sum/count/max` 等聚合按“业务指标”命名，避免只写表达式 |
| 原子能力 | 同一 DAO/Mapper/Service 方法产生的 SQL 必须归到同一原子能力下 |

合并后保留：

- 标准 SQL 指纹（参数化、格式化、去掉一次性临时条件）
- 查询变体（不同状态、不同入口、不同排序分页）
- 代码坐标和调用入口
- 适用场景 / 禁用场景
- 索引建议和性能风险

## 分析前读取顺序

分析后端需求前，按图谱所在层级读取（命名空间 = 草稿 `ai-docs/{项目}/knowledge-graph/` 或 正式 `docs/knowledge-graph/backend/`）：

**Tier 1 起步阶段**（仅有 `00_index.md` + `scenarios/` + `_candidates.md`）：

1. `00_index.md`：按关键词反查命中的场景小卡
2. 命中的 `scenarios/{业务场景}.md`
3. `_candidates.md`：扫一遍候选池，看本次主题是否已有未确认事实
4. 最后再读代码文件

**Tier 2/3 成熟阶段**（已有细分卡片）按以下顺序：

1. `00_index.md` → `00_backend_service_profile.md`（如有）
2. `01_domain_capability_map.md`、`06_business_flow_index.md`（如有）
3. `07_table_logic_index.md`、`08_atomic_capability_index.md`（如有）
4. `09_sql_query_index.md`（如有）
5. 命中的 `scenarios/{场景}.md`
6. 命中的 `table-logic/{scenario}.md`、`atomic-capabilities/{capability}.md`、`sql-queries/{business-scenario}.md`
7. 命中的 `capabilities/{capability}.md`、`flows/{flow}.md`
8. 相关 `tables/{table}.md`、`enums/{enum}.md`、`02_data_model_map.md`
9. `04_api_entrypoints.md`、`05_external_dependencies.md`（如有）
10. `_candidates.md`、`_sql_candidates.md`
11. 最后再读代码文件

不得在已有图谱可定位时直接全量扫描代码。即使图谱只有 Tier 1，也要先读 `00_index.md` 和命中的场景小卡。

## 能力分层

后端能力必须区分三类：

| 类型 | 定义 | 示例 |
|------|------|------|
| 原子能力 | 可复用的最小业务能力 | 生成订单号、校验商品、计算价格、锁库存 |
| 领域能力 | 围绕一个业务对象完成一项完整动作 | 创建订单、取消订单、支付订单 |
| 编排能力 | 跨多个领域能力/外部依赖的流程编排 | 下单流程、支付流程、退款流程 |

能力卡必须写清能力类型，禁止把所有 Service 方法都叫“原子能力”。

## 文档卡片要求

> 后端单服务知识图谱正式落盘的 10 类卡片模板：表逻辑总索引 / SQL 查询索引 / SQL 查询卡 / 原子能力索引 / 表逻辑卡 / 原子能力卡 / 能力卡 / 流程卡 / 表卡 / 枚举卡。
>
> **详细模板见 [rules/card-templates.md](./rules/card-templates.md)**。写正式图谱时按需选用对应模板;写候选池 `_candidates.md` / `_sql_candidates.md` 时模板更轻,见下方「会话沉淀规则」节。

## 会话沉淀规则

用户在会话中经常提到的内容**必须自动记录到候选沉淀池**，但**不能无条件自动写入正式知识图谱**。按以下规则处理：

| 场景 | 处理 |
|------|------|
| 用户明确说“记入知识图谱 / 更新知识图谱 / 归档到后端图谱” | 先检索候选池 + 现有正式图谱，再整理更新正式图谱 |
| 本次后端代码变更新增/修改 API、Service、DAO/Mapper/SQL、表、枚举、状态流转、MQ、外部依赖 | 必须更新相关图谱卡片或候选池 |
| 本次后端代码涉及订单/退款/支付等表逻辑判定 | 必须更新 `07_table_logic_index.md` / `table-logic/` / `08_atomic_capability_index.md` 中至少一处 |
| 会话中反复出现同一后端业务事实，但尚未代码验证 | 自动追加到候选沉淀池，默认写用户目录，不进正式图谱 |
| **同一会话同一技术主题用户反复疑问 ≥3 轮**（含直接提问 / 验证性追问 / 担忧性表达 / 回归性措辞） | 自动追加候选记录，标记 `分类: 技术难点`；超过 5 轮反复或用户显式提示"这是核心点"时直接生成 `scenarios/` 场景卡 |
| 用户出现回归性措辞（"为什么...还"、"怎么又..."、"上次说..."、"是不是...占用了"、"现在又卡了"） | 视为技术难点信号，自动追加候选 |
| 修复后用户提出 ≥2 轮验证性追问（"是不是真的解决了"、"会不会再出现"、"还有没有其它"、"重启后还会有么"） | 答题同回合追加候选，标注 "已修复 + 验证关注点"，便于下次回归测试覆盖 |
| 涉及子进程 / 并发 / 性能 / 资源边界 / 外部依赖编排的非业务代码变更 | 编码后必候选记录到 `_candidates.md`，分类 `技术难点`；本身就是项目重点资产 |
| 事实来自代码、DDL、枚举类、接口契约、已确认设计文档 | 可作为正式图谱依据；更新前仍需合并候选池同主题内容 |
| 只是猜测、临时讨论、未确认方案 | 可记录为“待确认假设”，禁止写入正式图谱 |

正式图谱条目必须能追溯到至少一个来源：代码坐标、表结构、枚举类、接口契约、设计文档或用户明确确认。

候选沉淀池每条记录至少包含：

```text
- 记录时间
- 服务/模块
- 分类：业务事实 / 技术难点 / 性能 / 资源 / 进程 / 并发 / 运维 / 其它
- 会话事实
- 关联能力/流程/表/枚举/外部依赖
- 触发模式：用户主动要求 / 长对话同主题 ≥3 轮 / 修复后验证追问 / 代码改动后自动归档 / ...
- 可信度：待确认 / 已确认 / 已代码验证
- 来源：用户描述 / 代码坐标 / DDL / 枚举类 / API 契约 / 实战 bug
- 后续动作：待用户确认 / 待代码核验 / 可整理入正式图谱
```

当用户后续要求“整理知识图谱 / 更新正式图谱 / 归档”时，必须先读取：

1. 用户目录中的 `_candidates.md`、`_sql_candidates.md`
2. 项目内 `docs/knowledge-graph/backend/` 现有正式图谱
3. 命中主题的 `09_sql_query_index.md`、`sql-queries/`、`02_data_model_map.md`、表卡、原子能力卡
4. 命中主题的代码、DDL、枚举、DAO/Mapper/SQL 或 API 契约

然后去重、合并、补证据，再写正式图谱。

## 更新触发

后端源码出现以下变化时，应同步检查知识图谱：

- 新增/修改 Controller、Endpoint、Feign、DTO
- 新增/修改 Service、UseCase、Domain capability
- 新增/修改 Repository、Mapper、SQL、DAO
- 新增/修改数据库表、字段、索引
- 新增/修改业务查询 SQL、join/on、where、group by、having、order by、分页、排序、聚合字段
- 新增/修改枚举、状态机、状态流转
- 新增/修改跨表判定逻辑、金额/数量聚合规则、订单/退款/支付状态展示规则
- 新增/修改可复用原子能力，或复制了已有表逻辑导致应该抽取复用
- 新增/修改 MQ topic、事件、定时任务、外部 HTTP/RPC 调用
- 修改事务、锁、幂等、补偿逻辑

若项目没有正式 `docs/knowledge-graph/backend/`，先在用户目录生成“知识图谱更新建议”和表逻辑候选池；用户确认后再写正式图谱。

若项目已有正式 `docs/knowledge-graph/backend/`，且本次代码变更已验证事实，应直接更新命中的正式卡片；不确定内容写入候选池。

## 新接口支持性判定

当用户询问或 AI 自己需要判断“新增接口是否支持”时，必须基于表逻辑图谱回答：

1. 现有表是否已有所需字段
2. 现有状态/枚举是否能表达新场景
3. 现有原子能力是否能复用
4. 是否需要新增表/字段/枚举/索引
5. 是否会破坏已有流程的判定矩阵
6. 需要补哪些图谱卡片

输出格式：

```text
后端表逻辑支持性：
- 结论：支持 / 部分支持 / 不支持
- 依据表：
- 依据状态/枚举：
- 可复用原子能力：
- 缺口：
- 需更新图谱：
```

## 多项目边界

多项目知识图谱不做单服务内部能力的重复整理，主要记录服务间关系：

- 调用方向：A 服务调用 B 服务
- 入口契约：HTTP/RPC/MQ/任务调度
- 关键业务对象：订单、退款、支付、库存等
- 数据归属：哪个服务负责哪类主数据
- 失败传播：超时、重试、补偿、幂等边界

本 skill 只在单服务图谱中保留”外部依赖”视角，不把多个项目的内部表、枚举、原子能力混到一起。多个项目之间的内部能力各自沉淀到各自命名空间。

## 输出要求

执行后端知识图谱分析或更新时，必须回显：

```text
后端知识图谱：
- 项目：
- 命中能力：
- 读取图谱：
- 命中 ER / 表关系：
- 命中表逻辑：
- 命中 SQL 查询：
- 可复用原子能力：
- 需更新图谱：
- 更新依据：
- 输出路径：
```

## 红线

| 错误想法 | 正确处理 |
|----------|----------|
| “用户提到了就写入正式图谱” | 先自动进候选沉淀池，确认或代码验证后再整理入正式图谱 |
| “不自动记录，等用户以后想起来再说” | 错。会话中的后端业务事实应自动候选记录，防止遗漏 |
| “一个 plugin 把所有端都做了” | 本 skill 只管后端单服务，不管前端 UI 或跨项目全局拓扑 |
| “先全量扫代码再说” | 有图谱先读图谱，再按代码坐标读文件 |
| “表字段照抄一遍就算图谱” | 必须写字段业务含义、读写能力和一致性约束 |
| “SQL 回答完就结束” | 必须同步沉淀 SQL 指纹、业务问题、涉及表、join/where/group by/order by 语义和原子能力 |
| “全景 ER 等最后再画” | 当用户要求全景 ER 或核心表累计到一定规模时，必须更新 `02_data_model_map.md`，并从 SQL / 表卡反推关系 |
| “同一个业务查询换个 where 就另建一份 SQL” | 按 SQL 指纹合并，作为同一查询能力的变体，不制造重复卡 |
| “订单部分退这类规则问过很多次但不用沉淀” | 错。反复出现的表逻辑、状态判定、金额聚合必须进入表逻辑候选池或正式图谱 |
| “写新接口时直接再查一遍 SQL” | 先查 `07_table_logic_index.md`、`08_atomic_capability_index.md` 和 `09_sql_query_index.md`，已有 SQL / 原子能力直接复用 |
| “Service 里临时复制一段表判定最快” | 应优先复用原子能力；确需临时兼容时登记待抽取原子能力 |
| “枚举值不用单独整理” | 后端需求分析必须显式读取相关枚举卡 |
| “跨项目链路也写这里” | 单服务只记录本服务视角；服务间链路只到”外部依赖”节点为止 |
| “批处理脚本 / 子进程 / 性能 / 资源争夺这些是技术坑，不是表关系，不归图谱” | 错。v1.21 起范围已扩到项目级技术难点；反复出现的非业务技术陷阱同样必须沉淀 |
| “用户没显式说'记到知识图谱'，那就先不记” | 错。同主题 ≥3 轮反复疑问、回归性措辞、修复后验证追问，都是自动触发条件，无需用户提醒 |
| “技术难点等下次会话再说” | 错。当场记录是硬规则，错过即流程违反；会话结束后还原难点上下文成本极高 |
| “修复了就完事了，不用记" | 错。修复后用户多轮验证追问 = 这是项目持续关注的难点，必须沉淀供下次回归参考 |

---

## 配套 zz-harness 平台能力（建图谱时取真实数据）

> 本 skill 是「项目知识图谱的沉淀方法」。建/补图谱时，**取真实表结构、接口契约、调用链**用 zz-harness 的 skill，比凭记忆/翻代码更准。

| 场景 | 用 zz-harness skill | 能做什么 |
|------|---------------------|---------|
| 取真实表 DDL 建 ddl-baseline | `mysql`（zzcommon） | show create table、字段清单 |
| 查 SCF 服务调用方/服务方关系 | `scf`（zzrd） | srvmgr 查调用关系，补图谱的外部依赖 |
| 查接口契约/找 API 文档 | `find-api-docs` / `zapi`（zzcommon） | ZAPI 检索接口定义 |
| 查 SCF 服务对应 HTTP 路由 | `zgateway`（zzrd） | 按服务名/接口类查统一网关路由 |
