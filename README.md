# caseflow

> **30 秒 TL;DR**:Claude Code 插件,把"AI 协作开发"从"凭运气"变成"按流程"——24 个 skill + 6 道 hook 强制执行从需求分析 → 设计文档 → 代码定位 → 架构门禁 → 编码规范 → 提交规范 → 知识沉淀的完整链路。让 AI 改代码前先想清楚,改完后留下可追溯的痕迹。

**它解决什么问题:**
- AI 一上来就改代码,绕过设计 / 不查既有 / 不沉淀 → 强制 `design-doc-required` + `pre-implementation-code-orientation` 门禁
- AI 在 god service 里继续追加方法 → `architecture-ddd-lite-fullstack` 的"业务分支 = 新 focused service"铁律
- AI 在源码注释里堆变更历史 / 旧实现复盘 → `bugfix-coding-style` 禁止变更日志注释
- 团队 AI 协作经验不沉淀 / 每个新人重复踩坑 → 知识图谱三件套(backend / reverse-index / glossary)
- AI 改完代码不会自己合规 commit → `hooks/check-git-commit-skill.js` 拦截大改、强制走五步流程

## 快速上手(5 分钟试用)

装完插件后,在 Claude Code 中开一个项目,试这个流程感受规则生效:

```
你: "帮我加一个订单退款接口"
Claude: (触发 design-doc-required) 我需要先和你确认设计...
        (生成 ai-docs/{project}/design/订单退款/订单退款-current.md)
你: 确认设计
Claude: (触发 pre-implementation-code-orientation) 我会先 Read 这些关键文件...
        (触发 architecture-ddd-lite-fullstack) 落点判定:RefundService 新建...
        (触发 coding-standards-common) 命名 / 函数原子 / 注释三档自检...
        (开始写代码)
你: 提交
Claude: (触发 git-commit-standards 五步流程) 生成规范 commit
```

如果你看到 AI 跳过其中任何一步(比如想直接改代码而没有设计文档),说明 hook 或 skill 触发被绕过——可以提:"你跳过了 design-doc-required",AI 会立刻回到该 skill。

更详细的链路图见 [docs/skill-flow.md](docs/skill-flow.md);完整 skill 索引见 [CLAUDE.md](CLAUDE.md#skill-索引)。

---

团队 Claude Code 开发规范插件，包含：

- **跨语言通用编码规范**（命名表意 / 函数原子 80 行硬阈值 / 层次分明单向依赖 / 零魔法值强制枚举 / 注释三档 / 异常不静默 / DRY rule of 3；任何源码语言 Edit/Write 前先于具体语言 skill 触发）
- **Java 编码规范**（阿里巴巴黄山版·强制项精简版，仅保留 Java 独占条款，通用部分由跨语言规范承载）
- **功能设计文档强制约束**（开发前必须有设计文档，否则引导创建）
- **方案审视与更优建议**（用户提出具体方案或要求参考现有代码时，先判断目标、代码质量、风险和更优做法，再实施）
- **DDD-lite 全栈架构约束**（编码前默认判断分层、Feature 模块、原子能力和结构质量）
- **后端单服务知识图谱**（沉淀全景 ER、SQL 查询逻辑、表逻辑、状态判定、订单/退款/支付规则、原子能力、API 与代码坐标）
- **Bug 分析文档规范**（报告 Bug 时强制规范章节结构、Mermaid 图、根因表格）
- **Git 提交规范**（基于实际 diff 分析生成标准化中文提交信息；**v1.18.1 起 hook 按改动大小放行**：`hooks/check-git-commit-skill.js` 看 staged diff，小改 ≤2 文件 ∧ ≤30 行 ∧ 仅 `M` 修改时直接放行让模型写 commit message，大改才强制走 skill 五步；git push 不门禁）
- **文档索引优先约束**（编写任何文档前读取索引，分析内容边界，避免重复，写完后半自动更新索引）
- **文档输出路径规则**（AI 生成 Markdown 默认进用户 Documents 下的 `ai-docs/{project}/{type}/{topic}/{filename}`，按类型 + 主题归档，无日期/agent 目录层；**v1.20 起用户目录知识库与项目 `docs/` 索引等同**，必须经 Phase-A/B 查重和登记）
- **Markdown 编写规范**（Mermaid 图表语法、表格、代码块等）
- **业务逻辑现状梳理**（重构/迁移前按场景维度产出流程图、知识图谱、代码索引）
- **实施前代码定位**（从文档坐标表精准定位关键文件，禁止重新扫描）
- **源码注释风格约束**（源码只描述当前正确逻辑，禁止变更历史和函数头大段复盘，复杂逻辑在对应代码块写短 WHY）
- **每日工作日志**（业务项目源码改动后按 bug / 功能 分类沉淀到 `docs/work-log/{YYYY-MM-DD}.md`，同主题合并、工时累计叠加）
- **业务术语会话级强制登记**（PRD / 设计 / 对话中出现业务领域名词且术语表未登记时必须候选追加；用户与 AI 同义词错位必须主动对齐到规范术语；与 init-project-docs 的批量初始化术语表分工互补）
- **反向影响索引强制维护**（4 类索引：状态判断点 / 字段读写点 / 同步事件订阅 / API 调用方；冷启动用 `hooks/scan-reverse-index.js` 扫描 Java/TS 枚举与 SQL 字面量产出 states 初版；增量维护规则：变更枚举/字段/事件/API 同回合必须回写）
- **caseflow 源码仓库自动提交推送**（仅插件源码仓库规则变更完成后自动小步 commit + push，业务项目不触发）

## 项目结构

```text
caseflow/
  .claude-plugin/       Claude Code 插件元数据与 marketplace 配置
  .codex-plugin/        Codex 插件元数据
  skills/               各个 Skill 的规则、模板和辅助资料
  hooks/                可选 Hook 脚本，用于更强的写入前校验
  docs/                 插件维护文档、skill-flow 链路图和决策日志（历史由 git 管理，不保留文件快照）
  AGENTS.md             Codex 入口规范，定义主动触发规则和 Skill 索引
  CLAUDE.md             Claude 入口规范，定义主动触发规则和 Skill 索引
  README.md             对外安装、使用、维护说明
```

### 顶层目录

| 路径 | 作用 | 维护要点 |
|------|------|----------|
| `.claude-plugin/` | Claude Code 插件声明目录，包含插件版本、展示信息和 marketplace 条目 | 发布前必须同步递增 `plugin.json` 与 `marketplace.json` 的 `version` |
| `.codex-plugin/` | Codex 插件声明目录，包含 Codex 侧插件元数据 | 维护 Codex 分发时同步递增 `plugin.json` 的 `version` |
| `skills/` | 插件核心目录，每个子目录是一个独立 Skill，至少包含 `SKILL.md` | 新增或修改 Skill 后，同步更新 `AGENTS.md`、`CLAUDE.md`、README 的 Skills 表和 `docs/skill-flow.md` |
| `hooks/` | 强制拦截脚本目录：`check-git-commit-skill.js` 默认启用（拦截未调用 git-commit-standards skill 的大改 git commit）；`check-design-doc.js` **v1.26 起默认启用**（项目级设计文档存在性兜底——源码 Edit/Write 前在项目 `docs/design/` + 用户目录 `ai-docs/{project}/design/` 任一位置找不到 `.md` 则阻断；`CASEFLOW_DESIGN_DOC_HOOK=off` 一次性绕过） | 新增 hook 时同步更新 `hooks.json`、CLAUDE.md/AGENTS.md 辅助资源表 |
| `docs/` | 维护文档目录，记录 Skill 链路、配置机制和决策型变更背景 | 链路结构变化时直接更新 `skill-flow.md`，历史由 git log 承担，不再创建文件式快照（v21.1 起反转） |

### 关键文件

| 文件 | 作用 | 什么时候改 |
|------|------|------------|
| `AGENTS.md` | Codex 读取的插件开发规范入口，包含 Skill 主动触发表、Skill 索引、维护规则 | Skill 覆盖范围、触发条件、辅助资源或维护规则变化时 |
| `CLAUDE.md` | Claude Code 读取的插件开发规范入口，内容与 `AGENTS.md` 保持同类同步 | 与 `AGENTS.md` 同步维护，避免两个入口规则不一致 |
| `README.md` | 面向使用者和维护者的安装、升级、结构和能力说明 | 对外说明、安装方式、Skills 总览、发版规则变化时 |
| `docs/skill-flow.md` | Skill 调用链路全景图，解释什么时候调哪个 Skill、顺序是什么 | Skill 新增/删除、触发顺序、维护链路或 FAQ 变化时直接更新；历史由 git log 承担，不再建文件快照 |
| `docs/dev-log/YYYY-MM-DD.md` | 决策型变更日志，只记录长期背景 | 新增/删除 Skill、规则方向反转、触发链路变化、重大团队原则沉淀时 |
| `hooks/hooks.json` | Hook 注册配置，控制是否启用写入前脚本校验 | 需要启用或调整 Hook 时 |
| `hooks/check-git-commit-skill.js` | git commit 前按 staged diff 大小判定的拦截脚本（Node 跨平台，默认启用） | 调整阈值或拦截逻辑时（环境变量 `CASEFLOW_TRIVIAL_FILES` / `CASEFLOW_TRIVIAL_LINES` 也可调） |
| `hooks/scan-reverse-index.js` | 反向索引冷启动扫描器（Node 跨平台，**手工运行，未注册到 hooks.json**）：扫描项目 Java / TS 源码，识别 enum 定义 + `EnumName.VALUE` 引用 + SQL 字面量候选，产出 `states.md`；fields / events / apis 仅生成存根需人工填充；用法 `node hooks/scan-reverse-index.js --project=. --output=./docs/knowledge-graph/reverse-index/`；`--output=user-candidates` 写入用户文档目录候选池 | 项目首次接入反向索引时一次性运行；后续由 `reverse-index-required` skill 增量维护 |
| `hooks/check-design-doc.js` | **项目级设计文档存在性兜底**（Node 跨平台，**v1.26 起默认启用**，PreToolUse Write/Edit/MultiEdit）：仅对源码扩展名触发（`.java` / `.kt` / `.ts` / `.py` 等），跳过 `.md` / `.json` / 测试 / Dockerfile / Makefile；在项目 `docs/design/`、用户目录 `~/Documents/ai-docs/{project}/design/`、`~/ai-docs/{project}/design/` 任一位置找到 `.md` 即放行；**只兜底"项目里存在任何设计文档"，不强校验"本次需求对应文档"**——后者由 `design-doc-required` skill 承担。环境变量 `CASEFLOW_DESIGN_DOC_HOOK=off` 一次性禁用 | 调整源码扩展名集合 / 测试文件识别 / 路径查找规则时 |
| `hooks/check-comment-density.js` | **源码注释红线机械兜底（§5.4）**（Node 跨平台，**v1.29 起默认启用，v1.35 起默认 block 硬阻断**，PreToolUse Write/Edit/MultiEdit）：仅对源码扩展名触发，`.md` / `.json` / 配置文件跳过；只扫本次新增文本（去字符串字面量后判定注释），命中变更标记 / 日期 / 工单·PR·Issue 号 / 带个人或日期的 TODO / 带元信息分节线 / 版本流水措辞等客观红线即 exit 2 硬阻断；`long-block` 连续注释块超阈值是启发式软规则只提示不阻断（避免误伤公开 API 长文档注释）；规则源是 `coding-standards-common` §5.4，hook 只抓客观无歧义项；环境变量 `CASEFLOW_COMMENT_HOOK=warn` 降级仅提示、=off 关闭，`CASEFLOW_COMMENT_MAX_BLOCK` 调注释块行数阈值 | 调整注释红线机械规则 / 阈值时 |
| `.claude-plugin/plugin.json` | Claude 插件基础元数据 | 每次发布前递增版本 |
| `.claude-plugin/marketplace.json` | Claude marketplace 入口 | 每次发布前与 `.claude-plugin/plugin.json` 保持版本一致 |
| `.codex-plugin/plugin.json` | Codex 插件基础元数据 | 每次发布前递增版本 |

### Skill 目录约定

每个 Skill 使用独立目录：

```text
skills/
  {skill-name}/
    SKILL.md              必须存在，定义触发时机、执行流程、红线
    *.md                  可选模板、参考资料或辅助说明
```

维护 Skill 时遵循三条原则：

1. `SKILL.md` 的 frontmatter `name` 必须与目录名一致。
2. 新增或修改 Skill 覆盖范围后，编辑 **`CLAUDE.md`**（canonical source），然后运行 `node scripts/sync-agents.js` 同步生成 `AGENTS.md`（不要手动编辑 AGENTS.md，CI 会校验）。
3. 若影响触发链路或调用顺序，必须同步 `docs/skill-flow.md`；链路结构变化时直接更新该文件，历史由 git log 承担，不再创建文件式快照。

## 前置依赖

- **Claude Code** ≥ 当前稳定版（Skill / Hook 机制基于 Claude Code 插件接口）
- **Node.js ≥ 18**（hooks/check-git-commit-skill.js、scan-reverse-index.js 用 Node 写,Claude Code 自带运行时通常即满足。若用宿主 Node,执行 `node --version` 确认）
- **Git ≥ 2.20**（hook 内用 `git diff --staged --name-status` 等命令）

## 维护者本地开发

```bash
# 拉源码后,运行 hook 单元测试(无第三方依赖,只用 Node 内置 node --test)
cd hooks && npm test

# 修改 CLAUDE.md 后必须重新同步 AGENTS.md(CI 会校验)
node scripts/sync-agents.js

# CI 校验 AGENTS.md 是否同步:
node scripts/sync-agents.js --check

# 校验跨 skill / 跨章节引用是否全部解析(被引文件改章节名会被检出,扫描 SKILL.md +
# CLAUDE.md / AGENTS.md / README.md + docs/skill-flow.md / skill-dependencies.md / skill-triggers.md
# / anti-pattern-case-library.md):
node scripts/check-cross-refs.js

# 校验三处插件 manifest 的 version 一致(.claude-plugin/plugin.json,
# .claude-plugin/marketplace.json#plugins[0], .codex-plugin/plugin.json):
node scripts/check-version-sync.js --verbose

# Skill 健康度审计(描述长度 / 文件大小 / 引用次数 / 最近修改时间 / dev-log 提及次数):
node scripts/audit-skills.js                # 全表 + 警告(exit 0)
node scripts/audit-skills.js --warnings     # 只输出有警告的 skill
node scripts/audit-skills.js --markdown     # 输出 markdown 表(贴 issue 用)
node scripts/audit-skills.js --warnings --ci # CI 守卫模式,有警告则 exit 1
```

CI(GitHub Actions)在 push / PR 时自动跑(v1.26.2 起 5 个 job):
- Hook 单测矩阵(Linux/macOS/Windows × Node 18/20/22)
- AGENTS.md 同步校验
- 跨引用解析校验
- **插件 manifest 版本一致性校验**(v1.26.2 新增)
- **Skill 健康度守卫**(v1.26.2 新增,任一 skill 描述 > 800 字 / SKILL.md > 800 行 / 零引用 / stale 即阻断)

## 安装

在 Claude Code 中依次执行以下三步：

**第一步：注册 marketplace（指向 Github 仓库）**

```
/plugin marketplace add https://github.com/Turnin294/caseflow.git
```

> 此命令会将 Gitee 仓库克隆到本地插件缓存目录，无需手动 `git clone`。

**第二步：安装插件**

```
/plugin install caseflow@caseflow
```

安装时选择作用域（推荐 user 级别，全局生效）。

**第三步：重载生效**

```
/reload-plugins
```

完成后可通过 `/plugin` → Installed 标签页确认插件已安装。

### 备选：本地目录安装

如果已手动克隆仓库到本地，也可以用本地路径注册：

```bash
git clone https://github.com/Turnin294/caseflow.git
```

```
/plugin marketplace add /path/to/caseflow
/plugin install caseflow@caseflow
/reload-plugins
```

## 升级

```
/plugin marketplace update caseflow
/plugin update caseflow
/reload-plugins
```

> 如果是本地目录安装方式，需先进入仓库目录执行 `git pull`，再执行 `/reload-plugins`。

### ⚠️ 从 v1.25.x 或更早版本升级到 v1.26+ 的注意事项

v1.26 起 **`check-design-doc.js` hook 默认启用**（[hooks/hooks.json](hooks/hooks.json)）。升级后第一次在源码上执行 `Write` / `Edit` / `MultiEdit` 时，若项目内 `docs/design/` 与用户目录 `~/Documents/ai-docs/{project}/design/`、`~/ai-docs/{project}/design/` 都找不到任何 `.md`，**hook 会阻断**操作并提示先建立项目设计文档基线。这不是 bug，是有意的"项目级设计文档存在性兜底"。

| 你的项目情况 | 推荐处置 |
|---|---|
| 已经有 `docs/design/` 且至少有 1 份 `.md`（常见） | 不用动，hook 自动放行 |
| 新项目 / 还没建立 `docs/design/` | 先 `mkdir docs/design && echo "# 设计文档目录" > docs/design/README.md`，即可解除阻断 |
| 紧急 hotfix / 实验性脚本，临时不想被拦 | 当前会话 `$env:CASEFLOW_DESIGN_DOC_HOOK = 'off'`（PowerShell）或 `export CASEFLOW_DESIGN_DOC_HOOK=off`（bash） |

`check-design-doc.js` 只校验"项目级是否存在任意设计文档"，**不**强校验"本次需求对应文档存在"——后者由 `design-doc-required` skill 配合 S/M/L 档位分流承担。两者协同详见 [CLAUDE.md § 改动规模 → 链路档位](CLAUDE.md#改动规模--链路档位sml-三档对照表)。

## 包含的 Skills

> **完整 skill 索引（含触发时机、覆盖范围、关键词）见 [CLAUDE.md](CLAUDE.md#skill-索引)；调用链路图见 [docs/skill-flow.md](docs/skill-flow.md)。** 本节只列名称 + 一句话用途，避免与 CLAUDE.md 重复维护。

按使用阶段分 8 组：

### ① 方案 / 需求分析（动手前）
- `solution-review-required` — 分离用户的真实目标与候选方案，识别风险与更优建议，反迎合
- `design-doc-required` — 写代码前强制设计文档（极简跳过 / 轻量 / 完整 三档模版分级）
- `bug-doc-required` — bug 分析文档规范（章节 + Mermaid + 根因表）
- `business-logic-orientation` — 重构 / 迁移前梳理现状（流程图 + 知识图谱 + AI 索引）

### ② 实施前定位
- `pre-implementation-code-orientation` — 从文档坐标表精准 Read 关键文件，禁重新扫描
- `doc-index-required` — Phase-A 写前查重 + Phase-B 写完登记（用户目录 / 项目 docs 等同）

### ③ 架构与编码（实施时）
- `architecture-ddd-lite-fullstack` — DDD-lite 分层 + Feature 模块 + 每分支一 focused service + **函数级业务场景分流（分支差异即拆分）** + 跨分支编排 + 横切关注点豁免 + 命名 taxonomy + 聚合边界（**Java / Python 后端 + Vue / React 前端一致适用**）
- `coding-standards-common` — 跨语言通用 7 条铁律 + 注释三档（沟通语言一票否决）
- `java-coding-standards` — Java 独占条款（Javadoc / Integer 比较 / SLF4J / HashMap 容量等）
- `finance-coding-standards` — 金融技术部 Java 后端独占条款（部门优先，叠加在 common + java 之上）：接口契约（禁 Map / FinanceBizBaseReq / ZZOpenScfBaseResult / FinanceBizAsserts）/ 禁 ≥2 层 if-else 嵌套 / 日志分级 / SCF 实现类不加 Impl / 主从数据源 / 金额用分 + 枚举英文字符串。优先级链路：金融 → 转转研发中心通用 → caseflow 自有
- `llm-agent-coding-standards` — LLM / Agent 集成独占条款（确定性优先 / LLM 输出当不可信入参 / 模糊→结构化用受控枚举 / 约定 SSOT / 工具描述是运行时契约 / Agent 循环兜底 / 上下文代码注入）；叠加在 `coding-standards-common` 之上
- `bugfix-coding-style` — 源码只描述当前逻辑，禁变更日志注释 / 函数头复盘

> **想调整注释规范改哪里**（注释规则跨语言统一，不按语言各写一套）：
> - **唯一规则源 = `skills/coding-standards-common/SKILL.md §5`** —— §5.1-5.3 三档 + §5.1.5 字段档 + §5.2.1 职责边界注释 + §5.4/§5.4.1 红线与反例 + 放置原则 + §5.0 注释语言。**对 Java / TS / JS / Python / Kotlin / Go 一视同仁**，调注释规范只改这一处。
> - **语言专属只补 doc 注释语法**：`java-coding-standards`（Javadoc）。非 Java 语言无需单独条款，直接套 §5 + 自身 doc 语法（TSDoc / docstring）。
> - **机械兜底阈值**（连续注释块行数等）改 `hooks/check-comment-density.js`；**存量批量清理流程**在 `comment-cleanup`（只引用 §5，不重定义）。

### ④ 提交与日志
- `git-commit-standards` — 规范 commit（type 前缀 + 中文 body + diff 分析，hook 按改动大小放行）
- `daily-work-log` — 业务项目源码改动后按 Bug / 功能分类沉淀工作日志

### ⑤ 知识图谱（沉淀）
- `backend-knowledge-graph-required` — 后端单服务业务图谱 + 项目级技术难点图谱
- `reverse-index-required` — 反向影响索引 4 类（状态 / 字段 / 事件 / API）
- `glossary-required` — 业务术语会话级登记 + 同义词归一

### ⑥ 质量回路
- `coding-violation-log` — 编码违规登记 + 编码前回顾防重犯
- `comment-cleanup` — 存量注释批量清理（用户主动发起，多语言，红线规则单一引用 `coding-standards-common` §5.4）
- `markdown-writing-standards` — Mermaid 语法 + 表格 + 目录复核
- `project-docs-update` — 项目结构变更后同步知识图谱文档

### ⑦ 项目初始化（一次性）
- `init-project-docs` — 4 阶段渐进式构建知识图谱
- `generate-project-profile` — 生成 AI Agent 消费的 10 维度项目画像

### ⑧ plugin 自身维护
- `dev-log` — caseflow 决策型变更记录长期背景

## 设计文档模板

模版分两档，根据改动规模选择，由 `design-doc-required` 第一·七步硬清单兜底判定。

### 完整模版（`skills/design-doc-required/template.md`）

适用：超出轻量范围的方案/接口设计，例如新增表/字段/对外契约入口、复杂事务/分布式锁、状态机调整、跨服务风险等。

包含 8 个章节，聚焦编码依据：

- 目标与边界、接口 / 入口契约
- 核心流程（必填 1 张核心图，主流程和异常流程优先合并）
- 核心业务规则、编码落点
- 数据与依赖变更（只写本次变化，不复写项目全集资料）
- 风险与待确认、验证要点

完整模版必须配套 `-coding.md`（基于 `coding-template.md`）作为编码摘要。

### 轻量模版（`skills/design-doc-required/lightweight-template.md`）

适用：在已有架构内新增/调整单接口、单接口的库表读写流程描述、入参出参微调、同模块内业务规则修正。

包含 7 个章节，以「接口自身核心流程图」为主轴：

- 代码入口、接口契约
- 核心流程图（接口自身流程 / 库表读写顺序，flowchart 或 sequenceDiagram 二选一）
- 关键过滤/写入规则、失败行为
- 升级到完整模版的触发条件、修订记录

轻量模版**不需要**配套 `-coding.md`，核心流程图 + 规则表已涵盖编码所需信息。

项目内正式设计文档进入 Git 后，默认维护稳定文档（如 `{需求}-current.md` / `{需求}-coding.md`），普通迭代直接更新原文件，历史和变更原因写入 git commit body。只有重大架构基线、发布快照、非 Git 管理文档或用户明确要求时，才创建 `YYYYMMDD-vN` 快照文件。

## 脚本级拦截（默认启用）

**v1.26 起，两道 PreToolUse hook 默认启用**（跨平台 Node 脚本，无需平台分支）：

| Hook | 触发 matcher | 默认启用 | 旁路 |
|---|---|---|---|
| `check-git-commit-skill.js` | `Bash`（仅命中 `git commit`） | ✅ | 小改自动放行（≤2 文件 ∧ ≤30 行 ∧ 仅 M）；`CASEFLOW_TRIVIAL_FILES` / `CASEFLOW_TRIVIAL_LINES` 可调阈值 |
| `check-design-doc.js` | `Write` / `Edit` / `MultiEdit` | ✅ | 跳过 .md / .json / 测试 / Dockerfile；项目 `docs/design/` 或用户目录 `ai-docs/{project}/design/` 存在任意 `.md` 即放行；`CASEFLOW_DESIGN_DOC_HOOK=off` 一次性关闭 |

**check-design-doc.js 的语义边界**：它是**项目级设计文档存在性兜底**——只要项目里有任何一份设计文档就放行，不验证"本次需求对应文档"。"本次需求是否真的有设计"由 `design-doc-required` skill 负责（软门禁，依赖 AI 自律 + S/M/L 档位分流）。两者协同：skill 决定"该不该写设计"，hook 兜底"项目至少要有设计文档存在"。

**新项目首次接入插件后第一次写源码会被 hook 阻断**——这是设计内行为，提醒你先建立项目设计文档体系（最低只需要在 `docs/design/` 下放一份 README 占位）；或用 `CASEFLOW_DESIGN_DOC_HOOK=off` 跳过本次会话。

如需临时禁用某个 hook（debug / 实验），编辑 `hooks/hooks.json` 把对应行注释掉即可，无需重装插件——hook 配置随 `/reload-plugins` 立即生效。

## 配置个人 Git 署名

`git-commit-standards` Skill 会自动读取署名配置。在你的全局 `~/.claude/CLAUDE.md` 中添加：

```text
Git 提交署名
Author: 你的姓名 <你的邮箱>
```

## 发版规则

通过 `.claude-plugin/plugin.json` 中的 `version` 字段判断是否有更新。**每次发布必须递增版本号**，否则升级无法检测到变更。

仅在维护 caseflow 插件源码仓库时，仓库自身变更完成后默认自动执行 `git add -A`、规范 commit 和 `git push`，以小步提交方式及时分发规则调整。业务项目即使安装本 plugin，也不会因此自动提交、推送或修改版本号。若某次插件仓库维护只想保留本地变更，需要明确说明“不要提交”或“不要 push”。

是否每次 `git push` 都弹授权由 Codex / Claude / IDE 宿主的命令审批策略决定；本插件只能规定“需要自动 push”，不能绕过宿主授权。若宿主支持保存 `git push` 授权，保存后后续才可免重复确认。

版本号遵循语义化版本（SemVer）：

| 变更类型 | 版本递增 | 示例 |
|---------|---------|------|
| 新增 Skill、新增模板 | Minor（中位） | `1.0.0` → `1.1.0` |
| 修复 Bug、调整措辞 | Patch（末位） | `1.1.0` → `1.1.1` |
| 不兼容的结构变更 | Major（首位） | `1.1.1` → `2.0.0` |

发版流程：

1. 修改 `.claude-plugin/plugin.json` 中的 `version` 字段
2. 提交并推送到 GitLab
3. 团队成员执行 `/plugin marketplace update caseflow` → `/plugin update caseflow` → `/reload-plugins`
