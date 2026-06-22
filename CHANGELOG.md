# Changelog

> 仅记录每个 plugin 发布版本的**关键变化**(新 skill / 规则方向反转 / 触发链路调整 / 重大基础设施)。逐次 commit 的细节用 `git log` 看。
>
> 版本号约定:`MAJOR.MINOR.PATCH`(SemVer)——`MINOR` 用于新 skill / 触发链路扩展 / 基础设施(hook、CI、sync 脚本),`PATCH` 用于规则微调与版本号同步。

## [1.44.0] - 2026-06-18

**新增第 7 道 PreToolUse hook `check-zzcli-guard`——调用 zz-harness 平台命令（zzcli）前的审查门禁，把「调 z-harness 要审查」从 skill 软提醒升级为机械拦截。**

### Added
- `hooks/check-zzcli-guard.js`：PreToolUse(Bash)。Bash 命令含 `zzcli`（调 apollo/zzlock/zzmq/scf/mysql-check/部署/Beetle 等平台能力）即 exit 2 阻断，stderr 提示 AI 先向用户说明命令影响（查询/修改/部署/上报、哪个环境）、待用户确认后重试。默认开启，`CASEFLOW_ZZCLI_GUARD=off` 本会话关闭（团队插件，同事可自关）。
- `hooks/tests/check-zzcli-guard.test.js`：7 个用例（拦截查询/写操作、放行普通命令/非词边界/env=off/非 Bash/非 JSON）。
- `hooks/hooks.json`：注册到 Bash 组（现 Bash 3 道：git-commit-skill + commit-no-ai-signature + zzcli-guard）。

### Changed
- CLAUDE.md「与 zz-harness 的协作」节补「调用审查门禁」说明；辅助资源表补 `check-zzcli-guard` 与此前漏登的 `check-commit-no-ai-signature` 两行 hook。
- `scripts/check-cross-refs.js`：NON_SKILL_TOKENS 白名单清掉前东家 kpay 残留，加入 zz-harness 外部插件 skill（find-zz-skills/mysql-check/fix-sonar-issues 等），避免 caseflow 引用外部 skill 时被误判为未知内部 skill。
- README hook 计数 6 → 7。

### Motivation
- 用户要求「调用 z-harness 一定要先审查」。skill 文档只能软提醒、无强制力；真正能卡住动作的是 hook。z-harness 平台操作最终都落到 `zzcli` Bash 命令，故在 PreToolUse(Bash) 层拦截 zzcli、回灌提示让 AI 停下来请示用户，实现机械门禁。

## [1.43.0] - 2026-06-18

**caseflow 与转转官方 `zz-harness` marketplace 建立「脑/手分工」协作：caseflow 管规范决策，zz-harness 做平台动作，互相引用不重复。**

### Added
- CLAUDE.md 新增「与 zz-harness 的协作」节：明确 caseflow（脑·规范方法论）与 zz-harness（手·平台动作，zzcommon/zzrd 等插件）并存职责互补，给出 5 个 caseflow skill ↔ zz-harness 能力的衔接映射表，并说明 data-standards/code-review 与 mysql-check/zzcr 的重叠是"规范知识 vs 平台执行"两视角、前后衔接不冲突。
- 5 个 caseflow skill 末尾新增「配套 zz-harness 平台能力」节：
  - `zhuanzhuan-tech-stack-selection` → apollo / zzlock / zzmq / zzschedule / scf / zzjava-init
  - `zhuanzhuan-data-standards` → mysql-check / mysql
  - `zhuanzhuan-code-review` → zzcr / fix-sonar-issues / mysql-check / fix-error-log
  - `backend-knowledge-graph-required` → mysql / scf / find-api-docs / zapi / zgateway
  - `zhuanzhuan-coding-standards` → zzjava-init / zzcli-config-generator / find-zz-skills

### Motivation
- zz-harness 是转转官方按角色分的多插件 marketplace（zzcommon/zzrd/zzfe/zzqa/zzapp），其 zzrd/zzcommon 提供 apollo/zzlock/scf/mysql-check/zzcr/fix-sonar-issues 等**平台操作**能力；caseflow 提供编码/架构/数据/审查**规范**。两者天然脑/手互补——caseflow 决策"该用什么"，zz-harness 执行"真去做"。本版建立引用衔接，避免各做各的或重复实现。

## [1.42.0] - 2026-06-18

**新增 `zhuanzhuan-code-review` skill（金融代码交付前自检清单，增量代码合规收口）。skill 计数 27 → 28。**

### Added
- `skills/zhuanzhuan-code-review/SKILL.md`：提测/commit 前的交付自检清单，**非新规则**——6 类审查项（数据库 SQL / 架构与基础服务交叉调用 / 编码与 SCF 通用性 / 重大漏洞 / 技术风险 / NPE 防护）的判定标准全部引用现有 skill，本 skill 只负责"提交前对照过一遍、揪出不符合项修掉"。明确 AI 承接边界：只做自检与合规判定，团队人工流程（提测前一天审查、指定审查人、TAPD 录工时≤6h、掷色子抽查、周会复盘）不代办；40% 迁移线提示但由人工判断。源出转转金融 RD 技术规范 4.6 代码审查节。

### Changed
- CLAUDE.md / docs/skill-flow.md / README：触发表、分类导航④、核心调用顺序（新增第 14.5 步，提测/commit 前）、Skill 索引、总览表同步；skill 计数 28。

## [1.41.0] - 2026-06-18

**新增 `zhuanzhuan-tech-stack-selection` skill（转转技术栈选型决策，场景→自研组件决策表 + 反模式）。skill 计数 26 → 27。**

### Added
- `skills/zhuanzhuan-tech-stack-selection/SKILL.md`：编码/设计时「该用哪个自研组件、别造什么轮子」的选型决策层。场景→组件决策表（同步调用 SCF / 异步解耦 ZZMQ / 分布式锁 zzlock / 配置 Apollo / 定时 zzschedule / 限流熔断 Sentinel / 缓存 Redis·ZZ-KV / HTTP·JSON·脱敏·告警 zzarch-common / 分布式 ID ZZIdcClient / 文件 zzmedia / 对象转换 MapStruct）+ 反模式（Redis 造锁→zzlock / 硬编码→Apollo / 轮询 DB→ZZMQ / @Scheduled 写死→zzschedule / restTemplate 调内网→SCF）。**只管选型决策这一层**——组件 API 用法 delegate 到 `mcp__arch-kb` 知识库与运维 skill（/scf /zzmq /apollo /zzschedule /prometheus /k8s），不重复抄组件清单、不与外部全局 rules 漂移。

### Changed
- CLAUDE.md / docs/skill-flow.md / README：触发表、分类导航③、核心调用顺序（新增第 8.5 步，架构后编码前）、Skill 索引、总览表同步；skill 计数 27。

## [1.40.0] - 2026-06-18

**新增 `zhuanzhuan-data-standards` skill（转转数据存储规范，MySQL/TiDB + Redis，数据领域独立 skill）。skill 计数 25 → 26。**

### Added
- `skills/zhuanzhuan-data-standards/SKILL.md`：转转数据存储规范，与编码层正交。覆盖 MySQL 基础（utf8mb4 / 禁存储过程触发器外键 / 禁存大文件明文密码）、库表设计（dbzz_/t_ 命名 / InnoDB / DECIMAL 金额 / 禁保留字 / 字段数与长度控制）、索引设计（idx_/uniq_ 命名 / 主键 AUTO_INCREMENT 禁联合主键禁 UUID / 单表≤6 索引·单索引≤4 字段 / 最左前缀 / 区分度 / 索引禁忌）、SQL 优化（拆大 SQL / 禁 SELECT* / OR 改 IN / UNION ALL / 隐式转换 / Limit 深分页优化）、DML 限制（禁无 where 更新删除 / 须带索引字段 / 影响≤2 万行）、Redis 缓存（冷热分离 / 业务隔离 / 必设 TTL / 大文本压缩 / 禁 KEYS 用 SCAN / MQ 用 zzmq 锁用 zzlock / 谨慎全量 HGETALL·SMEMBERS / 数据结构选型）。
- 与 `backend-knowledge-graph-required` 正交（通用规范 vs 项目级表知识），与 `finance-coding-standards` SQL 条款互补（DBA 通用底 vs 部门叠加），均在冲突解决表与各 skill 内说明。

### Changed
- `finance-coding-standards` §8 SQL 节：补一句指向 `zhuanzhuan-data-standards`（通用库表/索引/SQL/DML 见数据 skill，本节只列金融叠加约束）。
- CLAUDE.md / docs/skill-flow.md / README：触发表、分类导航③、核心调用顺序（新增第 12.6 步）、冲突解决表（新增 2 行）、Skill 索引、总览表（顺带补回上版漏加的 zhuanzhuan-coding-standards 总览行）；skill 计数 26。

## [1.39.0] - 2026-06-18

**新增 `zhuanzhuan-coding-standards` skill（转转研发中心通用编码层，黄山版之上、金融层之下）；删除前东家 `cross-project-locator`（kpay POS 专用）并全面清洗 Flutter/Dart/POS 痕迹。skill 计数 24 → 25。**

### Added
- `skills/zhuanzhuan-coding-standards/SKILL.md`：转转研发中心通用编码约定，适用转转任意 Java 后端（SCF/WF/zzjava）。覆盖 RPC 用 ApiResult 包装 + ApiException + 优先错误码、ErrorCode 五位错误码枚举、Contract 实体 toString + DesensitizeUtil 脱敏、zzarch-common 工具优先（禁造轮子）、JsonUtil 用 Jackson 禁 FastJson、序列化优选 hessian2、long 转前端用 string、contract/service 双模块工程结构 + maven 坐标规则、对象转换 MapStruct、日志 spring-boot-starter-log4j2 + slf4j 排冲突。四层编码链路定型：`coding-standards-common → java-coding-standards → zhuanzhuan-coding-standards → finance-coding-standards`（越靠后优先级越高）。

### Removed
- `skills/cross-project-locator/`：kpay POS 生态跨项目拓扑专用，转转不适用。
- `skills/dart-coding-standards/`、`skills/arch-lint/`、`flutter_skill.md`（上一版已删，本版完成全仓痕迹清洗）。

### Changed
- 全仓清洗前东家痕迹：korepos/kpay POS 业务示例 → 中性通用示例（通用 skill）；Flutter/Dart → 删除；前端保留 React/Vue。术语口径分层：通用 skill 用中性词（订单/退款/支付），finance-coding-standards 用金融专属词。
- `java-coding-standards` / `finance-coding-standards`：补四层链路叠加指引。
- CLAUDE.md / docs/skill-flow.md / README：触发表、分类导航③、核心调用顺序（新增第 12.3 步）、冲突解决表、Skill 索引、FAQ 同步；skill 计数 25。

## [1.38.0] - 2026-06-18

**新增 `finance-coding-standards` skill（金融技术部 Java 后端独占条款，部门优先）；移除 `dart-coding-standards` 与 `arch-lint`（Flutter 相关，本团队不涉及）。skill 计数 26 → 25。**

### Added
- `skills/finance-coding-standards/SKILL.md`：金融技术部 Java 后端编码独占条款，叠加在 `coding-standards-common` + `java-coding-standards` 之上，**冲突时金融优先**（优先级链路：金融 → 转转研发中心通用 → caseflow 自有）。覆盖接口契约（入参出参禁 Map / 继承 FinanceBizBaseReq / ZZOpenScfBaseResult 禁 null / FinanceBizAsserts 断言）、控制流（禁 ≥2 层 if-else 嵌套）、日志分级、命名（Enum/Util/Consumer/Producer，SCF 实现类不加 Impl）、NPE 防护、禁用项、主从数据源、MyBatis-Plus、SQL/事务/数据库设计/安全。开篇 §0「框架场景辨伪冲突」明确区分 SCF 实现类不加 Impl 与普通 Java ServiceImpl。
- `architecture-ddd-lite-fullstack`：新增「金融技术部聚合层分层结构」节（contract: common/facade/request/response；service: common/config/facade/mq/helper/service/repository/task/utils），金融场景优先覆盖通用 DDD-lite。

### Removed
- `skills/dart-coding-standards/`、`skills/arch-lint/`、`skills/init-project-docs/templates/flutter_skill.md`：Flutter / Dart 相关，本团队为 Java 后端，不涉及。

### Changed
- `coding-standards-common` / `java-coding-standards`：补「金融层叠加」触发指引。
- CLAUDE.md / docs/skill-flow.md / README：触发表、分类导航③、核心调用顺序（新增第 12.4 步）、冲突解决表、Skill 索引、FAQ 同步；skill 计数同步为 25。

## [1.37.0] - 2026-06-17

**新增第 6 道 PreToolUse hook `check-commit-no-ai-signature`——`git commit` 落盘前机械拦截「AI 工具署名」，把 git-commit-standards 的"禁止 AI 署名"从 SKILL 层规则升级为不可绕过的机械红线。**

### Added
- `hooks/check-commit-no-ai-signature.js`：PreToolUse（Bash）。扫描 `git commit` 提交信息（`-m` 内联 / heredoc / `-F` 文件），命中 `Co-Authored-By:` 指向 AI、`noreply@anthropic.com`、机器人 emoji、`Generated with/by <AI>` 等署名即 `exit 2` 阻断。**与改动大小、是否走 skill 无关**——专防小改不走 git-commit-standards skill 时、宿主/IDE 默认指令擅自追加签名。默认 `block`，`CASEFLOW_AI_SIGNATURE_HOOK=warn` 仅提示、`=off` 关闭。正文里普通提及 "claude" 不误伤（仅匹配 trailer 形态 / 机器邮箱 / emoji）。
- `hooks/hooks.json`：注册到 `Bash` 组（现 Bash 2 道 + Write 4 道）。

### Changed
- `git-commit-standards`：「何时进入本 skill」补一条——禁止 AI 署名现由 `check-commit-no-ai-signature.js` 机械兜底，不再仅靠 skill 自觉。

### Motivation
- 实战暴露：宿主默认指令要求每条 commit 追加 `Co-Authored-By: Claude`，小改动不触发 git-commit-standards 完整流程时该签名被默认带上，违反 caseflow「Author 只填真实提交者」红线。规则早有（§Author/§Red Flags），但只是 SKILL 层自觉、缺机械强制。故加 hook 在 commit 层兜底。

## [1.36.0] - 2026-06-17

**新增第 5 道 PreToolUse hook `check-sql-ddl-readiness`——写/改任何带 SQL 的文件前，强制本会话已读 `knowledge-graph/ddl-baseline.md`；语言无关、不豁免小改，补 `check-backend-kg-readiness` 只覆盖 Dart 路径的洞。**

### Added
- `hooks/check-sql-ddl-readiness.js`：PreToolUse（Write/Edit/MultiEdit）。按「文件是否承载 SQL」判定（iBatis/MyBatis SqlMap XML、`.sql`、`*Dao`/`*Mapper`/`*Repository`、含裸 SQL 或 ORM raw query 的源码），命中且本会话未 Read 过 `ddl-baseline.md` 即 stderr 提示。默认 `warn`，`CASEFLOW_SQL_DDL_HOOK=block` 升级硬阻断、`=off` 关闭。**不豁免小改**——1 行字段名改动也拦。
- `hooks/hooks.json`：注册新 hook 到 `Write|Edit|MultiEdit` 组。

### Changed
- `backend-knowledge-graph-required`：BLOCKING 触发清单的「写 SQL 前缺 DDL 基线」一行，信号扩到 **iBatis/MyBatis SqlMap XML、Java/Kotlin `*Dao`/`*Mapper`/`*Repository`、`.sql`、Oracle**（原仅 Dart/Prisma/JPA 系）；新增一行「即将写/改任何带 SQL 的文件，无论改动大小 → 改前必先 Read `ddl-baseline.md` 核对字段、再看场景卡确认取数口径」。「hook 集成」节补 `check-sql-ddl-readiness.js` 说明。

### Motivation
- 实战暴露：Java 项目改 SQL 时，把字段口径误取错值，绕了多轮才修回知识库早已记载的正确字段。根因有二：① 既有 hook 路径白名单是 Dart 专用，对 iBatis XML / `.sql` 完全不触发；② 它豁免 ≤20 行小改，而字段口径错误恰是 1 行改动。故新增语言无关、不豁免小改的 SQL→DDL 前置校验，并为涉 DB 项目落地 `ddl-baseline.md` 作为字段级权威源。

## [1.35.0] - 2026-06-15

**注释红线机械兜底 `check-comment-density` 默认从 `warn` 反转为 `block`——客观红线（工单号/日期/变更标记/分节线/版本流水）命中即 exit 2 硬阻断，护栏在插件里统一做死，安装者无需各自配 settings。**

### Changed
- `hooks/check-comment-density.js`：默认模式 `warn` → `block`。命中客观红线即 `exit 2` 阻断 Write/Edit/MultiEdit；`long-block`（连续注释块超阈值）保留为**启发式软规则只提示不阻断**，避免误伤公开 API 的长 dartdoc。降级路径 `CASEFLOW_COMMENT_HOOK=warn`（仅提示）/ `=off`（关闭）。
- 同步文档：`coding-standards-common` §5.4 机械兜底注、`hooks/hooks.json` `_comment`、CLAUDE.md / AGENTS.md / README.md 辅助资源表。

### Motivation
- 实战暴露：某 Java 项目里模型写出 `// PM-IT-2607 6.6 dye factory delivery time`（工单号 + 英文注释），同时违反 §5.4（禁工单号）与 §5.0（注释用沟通语言）。插件规则本就禁止，hook 也能命中 `ticket-code`，但默认 `warn` 模式只提示不阻断，模型遂照样落盘。
- 团队诉求：护栏应在通用插件里统一约束，而非让每人在各自项目 settings 里写一套。故把默认值反转为 `block`，让"装了插件即强制"。`long-block` 因属启发式、易误伤合法长文档，单独留在只提示档。



**新增 `llm-agent-coding-standards` skill（LLM/Agent 集成编码铁律）；`coding-standards-common` §7 补强「知识 vs 逻辑」DRY 二分 + §7.5 外部 API 核验。**

### Added
- `skills/llm-agent-coding-standards/SKILL.md` — 编写/修改"接 LLM 或做 agent"的代码时触发（import langchain4j / spring-ai / openai / anthropic；定义 `@Tool` / AiService；拼 prompt；解析 LLM 输出），叠加在 `coding-standards-common` 之上。7 条独占铁律：① 确定性优先（能代码算/查/校验的不给 LLM）② LLM 输出当不可信入参（解析后校验+归一化+失败降级）③ 模糊→结构化用受控枚举（枚举输出不穷举输入，禁 contains 追无限说法）④ 约定单一来源（枚举含义/状态映射只存一处，prompt 与工具注解不复读）⑤ 工具描述是运行时契约（@Tool·参数 description 是模型选工具依据、load-bearing，工具集小而精）⑥ Agent 循环必须兜底（maxToolCallingRoundTrips 防死循环、工具异常可读、每步可观测）⑦ 上下文由代码注入（带时区当前时间等）。

### Changed
- `coding-standards-common` §7：从「DRY but rule of 3」改为「先分知识还是逻辑」——**知识/约定/常量/契约**第一次出现就单一来源（SSOT），**逻辑/代码结构**才走 rule of 3（两处容忍、三处再抽）；纠正把 DRY 误读为"消灭重复代码"或"两处才算重复、约定也容忍复制"。新增 §7.5「外部 API / 不熟悉的库先核验不臆造」（用前查文档/源码/javap，不凭记忆拼方法名 import）。自检清单同步两条。

### Motivation
- 实战暴露：在 kai-toolbox AI 秘书（LangChain4j + 本地 Ollama）开发中反复踩到几类"接 LLM"特有的编码反模式——让 LLM 算时区/金额而不校验、用 `contains` 穷举中文时间说法（打地鼠）、把同一映射约定抄进 prompt+多个工具注解、凭记忆写不存在的 API。这些都不在传统 7 铁律覆盖范围内。其中"知识 SSOT vs 逻辑 rule-of-3"是语言无关的通用准则（归 common），"确定性优先/枚举输出/工具描述契约"等是 LLM 集成独占（归新 skill）。

## [1.33.0] - 2026-06-07

**支持 Codex 插件市场:仓库重构为「marketplace 根 + 子目录单插件」布局,同一仓库双端(Claude Code + Codex)可装可更新。**

### Changed
- **目录重构**:插件载荷(`skills/`、`hooks/`、`.claude-plugin/plugin.json`、`.codex-plugin/plugin.json`)收进 `plugins/caseflow/` 子目录;仓库根保留 marketplace 清单与 CI/docs。原「根即插件」(`source: "./"`)只有 Claude 认,Codex `plugin add` 会整目录拷贝、要求插件自包含于子目录。
- `.claude-plugin/marketplace.json`:`source` 由 `"./"` 改为 `"./plugins/caseflow"`。
- **新增 `.agents/plugins/marketplace.json`**:Codex 市场清单,枚举 `caseflow` 插件指向同一子目录。
- CI 脚本基准路径同步:`check-version-sync` / `check-cross-refs` / `audit-skills` 指向 `plugins/caseflow/`(`sync-agents` 不变,CLAUDE.md/AGENTS.md 留根)。

### Motivation
- Codex(`@openai/codex-sdk` / `codex plugin marketplace`)与 Claude Code 的插件市场模型不同:Codex 要求每个插件位于市场下的独立子目录且自包含。为让同一 GitHub 仓库同时供两端 `marketplace update/upgrade` + `install/add`,采用通用的「monorepo marketplace + 子目录插件」标准布局。
- **对 Claude 端用户**:下次 `claude plugin marketplace update caseflow` + `install` 会从新子目录路径重装,透明无感。
- **Codex 端**:`codex plugin marketplace add owner/repo` + `plugin add caseflow@caseflow` 即可安装,`marketplace upgrade` + `plugin add` 更新。

## [1.30.3] - 2026-05-31

**`check-design-doc` hook 修复 monorepo / Maven 多模块项目根错判。**

### Changed
- `hooks/check-design-doc.js` 项目根识别策略调整：**优先全程向上找 `.git`**（git 仓库根），命中即返回；未找到时再回退到第一个构建文件标记（pom.xml / package.json / pubspec.yaml 等）。修复深层子模块的 pom.xml / package.json 被当作项目根的问题——以前在 `kai-toolbox/tools/tool-treesize/src/.../Foo.java` 上 Edit 会被识别为项目 `tool-treesize`，去找 `ai-docs/tool-treesize/design`，永远拦截；现在正确识别为仓根 `kai-toolbox`，去找 `ai-docs/kai-toolbox/design`。
- 新增 `.caseflow-project.json` 项目级覆盖文件：根目录放置 `{"aiDocsProject": "<name>"}` 可覆盖 ai-docs 子目录名，解决「git 仓名 ≠ ai-docs 子目录名」（如仓库叫 my-tools 但文档集中放在 ai-docs/kai-toolbox/ 下）。损坏 JSON 不崩溃，安静退回 `path.basename(projectRoot)`。
- `hooks/tests/check-design-doc.test.js` 新增 5 例：Maven 多模块、monorepo 前端子包、`.caseflow-project.json` 覆盖、无 `.git` 时回退构建文件标记的向后兼容、损坏 JSON 不崩溃。总用例 10 → 15，全 PASS。

### Motivation
- 实战暴露：Maven 多模块 + 文档集中放 `~/Documents/ai-docs/<repo-name>/design/` 的项目（典型布局：kai-toolbox 仓内多个 Java 子工具 + 一个前端包），每次写源码都被 hook 误拦——因为旧实现按构建文件标记找根，子模块的 `pom.xml` 总比根的 `.git` 先命中，把 `tool-treesize` 当成项目名找文档，必然落空。`.git` 优先 + 显式 `.caseflow-project.json` 覆盖两手解决：99% 情况自动适配（git 仓根即项目根），剩余 1% 通过覆盖文件显式声明。

## [1.30.0] - 2026-05-29

**新增 `comment-cleanup` skill：用户主动发起的存量注释批量清理；hook 补 `vN 新增` 类版本标记。**

### Added
- `skills/comment-cleanup/SKILL.md` — 用户要求「清理这个文件/类的注释 / 删 vN 新增等版本变更注释 / 注释太多帮我精简 / clean up comments」时触发，对**存量**文件/类/模块成批清理违反注释红线的注释。多语言（按扩展名识别 `//` `/* */` `///` `#` `--` `<!-- -->`）。红线规则**单一来源引用 `coding-standards-common` §5.4 + §5.4.1**，本 skill 只承担：范围圈定、分类决策（删 / 改写 / 保留 / 待定）、安全边界（只动注释不动逻辑、待定项必问、不扩范围）、提交纪律（单独 commit、不夹带逻辑、message 不罗列）。与 §5.5「改到哪清到哪」顺手清理、`check-comment-density` hook 写入新内容拦截互补——本 skill 抓 regex 抓不到的 prose 实现史 / 私有方法契约史，靠语义判断。

### Changed
- `hooks/check-comment-density.js` — version-flow 正则补 `新增 / 引入 / 上线 / 移除 / 删除 / 废弃 / 弃用 / 起 / 及以前 / 及以后`，修复 `v13 新增` / `v14 起` / `v12 及以前` 这类最常见中文版本标记此前漏抓的问题；测试 23 → 27 例（含 `v3 协议` / `IPv6 上线` 不误报）。
- `CLAUDE.md`（触发表 + 分类导航 ⑥ + Skill 索引表，skill 计数 24 → 25）/ `docs/skill-flow.md`（Skill 总览 + FAQ 新增「三套注释机制分工」）/ `README.md`（Skills 列表 + TL;DR 计数）/ `AGENTS.md`（重生成）同步登记新 skill。

### Motivation
- v1.29.0 落地 `check-comment-density` 后暴露两件事：(1) hook 只能 warn**新写入**内容，对**存量**满是 `vN 新增` 的老文件无能为力；(2) §5.5 只规定「改到哪清到哪」+「大量历史垃圾单独开 PR」，但没有执行这条「单独清理」的标准流程。`comment-cleanup` 补上这个 workflow：用户主动发起、语义判断（覆盖 regex 抓不到的 prose 史）、只动注释不动逻辑、单独提交。同时把 hook 漏抓的 `vN 新增` 顺带补上，让写入侧 warn 也更完整。

## [1.29.0] - 2026-05-29

**新增第五道 PreToolUse hook `check-comment-density.js`：为 `coding-standards-common` §5.4 注释红线提供机械兜底。**

### Added
- `hooks/check-comment-density.js` — 源码 Write/Edit/MultiEdit 前扫本次**新增内容**的注释，命中 §5.4 红线即 stderr 提示（默认 warn）。抓客观无歧义项：变更标记（`[BUGFIX]` / `[DEPRECATED]` / `[ADDED]`...）、注释里的日期、工单·PR·Issue 号、带个人或日期的 TODO、带元信息的分节线、版本流水措辞，外加连续注释块超阈值（`CASEFLOW_COMMENT_MAX_BLOCK` 默认 6）的软提醒。去字符串字面量判定注释避免 `http://` / 字符串里 `[FIXED]` 误判；ISO/RFC/UTF 等技术标准前缀排除避免误判工单号。`CASEFLOW_COMMENT_HOOK=block` 升级硬阻断、=off 关闭。
- `hooks/tests/check-comment-density.test.js` — 23 例端到端覆盖（各红线命中 + 干净放行 + 误报边界 + warn/block/off + Write/Edit/MultiEdit + Python `#` 注释）。

### Changed
- `hooks/hooks.json` — Write|Edit|MultiEdit 链新增第五道 hook，`_comment` 更新为「五道」。
- `skills/coding-standards-common/SKILL.md` §5.4.1 — 补「机械兜底」说明：hook 只抓客观项，prose 式实现史 / 私有方法契约史仍靠规则 + 评审，不能因「hook 没报」放行。
- `CLAUDE.md` 辅助资源表新增 `check-comment-density.js` 行；`AGENTS.md` 同步重生成。

### Motivation
- 实战暴露：注释红线（§5.4）此前只在 skill 文档里，纯靠模型自觉触发 `coding-standards-common`，会话漏触发时变更历史 / 多行 prose 仍写进源码。新增 hook 把「客观无歧义」的红线做成机械兜底，与 skill 形成「文档定规则 + hook 实施兜底」的双层防护（同 `check-backend-kg-readiness` 模式）。判定有品味成分的部分（prose 史、私有方法契约史）仍留给 skill + 评审，故默认 warn 而非 block，便于评估误报率。

## [1.28.2] - 2026-05-15

**`backend-knowledge-graph-required` 升级：`ddl-baseline.md` 成为涉及 DB 操作项目的硬必需。**

### Changed
- `skills/backend-knowledge-graph-required/SKILL.md`：
  - Tier 1 起步树新增 `ddl-baseline.md`，标注涉及 DB 操作项目硬必需（不是可选）
  - BLOCKING 强触发清单新增"项目存在持久层代码但 `ddl-baseline.md` 缺失即必须先 dump 再写 SQL"一条
  - 编码前必读列表把 `ddl-baseline.md` 提到第 1 位，其余顺移
  - 新增独立小节「DDL 基线（涉及 DB 操作的项目硬必需）」，覆盖：Why（ORM 实体类只展示子集 + 难一站式速查 + 迁移后可能漂移 + 凭记忆易踩坑）/ 触发条件矩阵 / 标准路径与命名（不拆 `ddl/{table}.md`）/ 5 个 DB 引擎 dump 命令模板（SQLite / PostgreSQL / MySQL / MSSQL / Oracle）/ 文档结构骨架 / 维护时机（schema 迁移后立即重新 dump）/ 与 `tables/{table}.md` 关系（DDL 是源、tables 卡是注解）/ hook 集成（白名单已含 ddl-baseline.md）
- `CLAUDE.md`：主 Skill 索引表 `backend-knowledge-graph-required` 行描述新增"DDL 基线"段；关键词补 `DDL 基线 / ddl-baseline / CREATE TABLE / sqlite_master / pg_dump / mysqldump / 字段名速查`

### Motivation
- korepos-refund 案例验证：`order_transaction` 无 `order_id`、`bill` 无 `order_id`、`orders.pay_amount` 不含 tip 等 schema 事实反复踩坑，靠 grep `lib/common/services/database/tables/*.dart` 不够顺手；本次实测 `ddl-baseline.md` 70KB 单文件一次 Read 拿到 84 张表 + 48 索引全貌，效率提升明显
- 把"涉及 DB 项目必须有 DDL 基线"从项目级 memory 升级到 plugin 级硬约束——所有团队成员的所有项目都受益，不只 korepos
- 与 `check-backend-kg-readiness.js` hook（v1.28 引入、v1.28.1 字面量白名单加 ddl-baseline.md）协同：skill 文档定规则、hook 实施兜底

## [1.28.1] - 2026-05-15

**`check-backend-kg-readiness.js` 字面量白名单扩展：`knowledge-graph/ddl-baseline.md` 也算"已读图谱"。**

### Changed
- `hooks/check-backend-kg-readiness.js` — `hasReadKnowledgeGraph` 增加 `knowledge-graph/ddl-baseline.md` 字面量识别（Linux/Windows 双路径），AI 直接 Read DDL 基线也满足兜底，不必额外读 `00_index.md`
- `hooks/tests/check-backend-kg-readiness.test.js` — 新增 1 例覆盖（11/11 通过）

### Motivation
- 同步 `korepos-refund` 项目落盘 `knowledge-graph/ddl-baseline.md`（84 张表 + 48 索引，`korepos.db` sqlite_master 实时 dump）作为 SQL 编写权威源
- 实际工作流：写 SQL 时直接读 DDL 比读索引再跳转更顺手；hook 兜底逻辑应该承认这条工作流，而不是把所有读取都强制经 `00_index.md`

## [1.28.0] - 2026-05-15

**新增第四道 PreToolUse hook `check-backend-kg-readiness.js`，兜底 `backend-knowledge-graph-required` skill 的"编码前必读图谱"约束。**

### Added
- `hooks/check-backend-kg-readiness.js` — Node 跨平台 PreToolUse Write/Edit/MultiEdit 兜底脚本。路径白名单 `lib/features/{module}/backend(v\d+)?/**/*.dart` 与 `lib/common/backend_infra/(daos|services)/**/*.dart`，命中后扫 transcript 是否 Read 过 `**/knowledge-graph/00_index.md` 或任一 `**/knowledge-graph/scenarios/*.md`；未命中按模式提示
- `hooks/tests/check-backend-kg-readiness.test.js` — 端到端测试 10 例（含 warn / block / off 三模式 + 路径白名单 + 小改豁免 + 已读图谱放行）
- `backend-knowledge-graph-required/SKILL.md` BLOCKING 段补一行"会话首次 Edit 后端业务源码 + 未读图谱即 hook 提示"；误判反例段补一条"改 bug 直接 grep + Read 源码就够了"的反例

### Changed
- `hooks/hooks.json` 注册第四道 hook 与前三道并列；`_comment` 同步
- `CLAUDE.md` 辅助资源表新增 `check-backend-kg-readiness.js` 条目

### Configuration
- `CASEFLOW_BACKEND_KG_HOOK`：`warn`（默认，exit 0 + stderr 提示）/ `block`（exit 2 硬阻断）/ `off`（完全跳过）
- `CASEFLOW_KG_TRIVIAL_FILES`（默认 1）/ `CASEFLOW_KG_TRIVIAL_LINES`（默认 20）—— 小改豁免阈值

### Motivation
- AI 在跨会话编码中反复出现"直接 grep + Read 源码就动手改，跳过项目知识图谱"的偷懒模式，导致重复发明状态判定 / 金额聚合 / SQL 查询逻辑、踩已沉淀过的坑（典型案例：korepos-refund 退款金额双计 tip bug 修复，对应 commit `ff39eccb2`，事后回顾发现 memory 含 tip 矩阵在会话起始就已加载但未主动应用）
- skill 自身已写明 BLOCKING 但靠 AI 自觉判断；与 `check-design-doc` / `check-git-commit-skill` 的成熟拦截范式对齐：v1.28 起加 hook 兜底
- 试用期采用 warn 模式（exit 0）评估误报率，成熟后用户可切换 `=block` 升级为硬阻断

## [1.27.1] - 2026-05-13

**修复 `/reset-kpos-local` 中 korepos.db 路径写死开发者用户名 `turnin` 的问题。**

### Changed
- `commands/reset-kpos-local.md`：第 2 个文件路径 `D:\Users\turnin\Documents\korepos.db` → `D:\Users\$env:USERNAME\Documents\korepos.db`，由 PowerShell 在执行时展开为当前 Windows 登录用户名，其他成员安装后无需改动即可生效
- 路径表下方注释改为明确说明：盘符 `D:` 是团队约定（Documents 统一放 D 盘），**不要**替换为 `$env:USERPROFILE` 或 `MyDocuments`，那些会解析到 C 盘

## [1.27.0] - 2026-05-13

**新增 `/reset-kpos-local` slash command + 配套语义触发 skill，用于一键删除 kpos 本地缓存与本地数据库。**

### Added
- `commands/reset-kpos-local.md` — 首个 plugin 自带 slash command。删除 `$env:APPDATA\com.example\kpos\shared_preferences.json` 与 `D:\Users\turnin\Documents\korepos.db` 两个本地状态文件。显式调用 = 已确认，不再询问；使用 PowerShell `Remove-Item -Force` 实现，逐文件独立成功/失败计数
- `skills/reset-kpos-local-state/SKILL.md` — 配套语义触发 skill。识别"重置 kpos 本地 / 清空 shared_preferences / 删 korepos.db"等狭义短语后**路由到** `/reset-kpos-local`，不自己 `Remove-Item`，所有边界与回报由 slash command 唯一负责

### Notes
- 第 2 个文件路径 `D:\Users\turnin\Documents\korepos.db` 仍是当前开发者本机硬编码——其他成员若 Documents 目录在 C 盘，需要后续扩展为可配置或环境变量化
- 故意**不**用 hook 实现：destructive 操作靠正则/事件匹配自动开火属反模式，必须靠 AI 语义层 + 显式入口

## [1.25.0] - 2026-05-12

**Plugin maintainability 重构。完整设计评审请见 commit `9d3c1d7`。**

### Added
- `scripts/sync-agents.js`——CLAUDE.md 为 canonical,派生 AGENTS.md(`--check` 模式供 CI 校验)
- `scripts/check-cross-refs.js`——校验所有 SKILL.md / CLAUDE.md / README.md 内的跨 skill 引用与跨章节引用,避免被引文件改章节名后引用失效
- `hooks/package.json`——声明 `engines.node >= 18` 和 `npm test` 入口
- `hooks/tests/`——19 个 hook 端到端测试(`check-dto-annotation` 11 + `check-git-commit-skill` 8),用 Node 18+ 内置 `node --test`,无第三方依赖
- `.github/workflows/ci.yml`——Linux/macOS/Windows × Node 18/20/22 矩阵 + AGENTS.md 同步校验 + 跨引用校验
- `CLAUDE.md` 顶部新增「Skill 分类导航」(8 组)与「Skill 并发触发顺序与冲突解决」两节,把 24 个 skill 的检索成本和并发调用顺序模糊问题封死
- `CHANGELOG.md`(本文件)
- `docs/skill-dependencies.md`——skill 依赖图与冲突说明

### Changed
- README.md 把"包含的 Skills"24 行 markdown 表替换为 8 阶段紧凑列表,完整索引指向 CLAUDE.md(消除三处重复维护)
- 6 个 skill 的 frontmatter `description` 压缩 45%-76%(backend-knowledge-graph-required / reverse-index-required / cross-project-locator / glossary-required / design-doc-required / doc-index-required),完整决策树留在 SKILL.md body
- README.md 新增"前置依赖"(Node ≥18 / Git ≥2.20)和"维护者本地开发"小节

### Deprecated / Removed
- (无)

## [1.24.x] - 2026-05-12

**`architecture-ddd-lite-fullstack` 一连串规则方向反转,把"Service 业务动作扩展"从模糊建议固化为零退路铁律。**

### Changed
- `1.24.7`:把 Python / Dart 提到与 Java 同等公民地位,新增三栈横切关注点对照表 + Python 后端约束 + Dart 后端约束章节(commit `3c50e33`)
- `1.24.6`:补 4 个缺口——跨分支编排 Orchestrator/Saga / 横切关注点豁免 / 服务命名 taxonomy / 聚合边界 5 问(commit `333e4f9`)
- `1.24.5`:取消「同分支变种」对 god service 的豁免,统一为「每个业务分支一个 focused service」(commit `b28d335`)
- `1.24.4`:T1-T6 阈值改为「新业务分支 = 新子 service」铁律,取消 8 条豁免清单(commit `067276e`)
- `1.24.3`:新增「Service 业务动作扩展强制阈值 T1-T6」抑制 AI 惯性追加(commit `c41fe40`)

### Notable rule reversals(规则方向反转)
- 同分支变种豁免 → 取消,所有业务方法都必须落在该分支的 focused sub-service
- 「行数到 1500 才算 god service」→ god service 定义改为"承载多业务分支的 service",与行数无关

## [1.23.x] - 2026-05-09

### Changed
- `1.23.1`:`coding-standards-common` §5.0 注释语言改为「沟通语言一票否决,无存量豁免」(commit `ca27694`)

### Notable rule reversals
- 存量文件豁免 → 取消,中文沟通的会话里新增注释一律中文,短期内单文件可中英混杂

## [1.22.x] - 2026-05-07 ~ 05-08

### Changed
- `1.22.2` ~ `1.22.4`:`git-commit-standards` 重写五步流程为「会话上下文优先 + diff 兜底」并提速 hook;`coding-standards-common` §5.5 新增「修改代码同步清理过期注释 / 历史版本说明 / 废话注释」

## [1.22.0/1] - 2026-05-06

### Added
- `korepos-backend-service` 新增 DTO 字段类型强制约束 + 强化 wire DTO 注解约束 + 新增 `hooks/check-dto-annotation.js` hook 兜底

### Changed
- `backend-knowledge-graph-required` 范围扩展到项目级技术难点 + 长对话识别自动触发

## [1.21.0] - 2026-05-05

### Added
- 新增 `coding-standards-common`——跨语言通用编码 skill(命名表意 / 函数原子 80 行硬阈值 / 层次分明 / 零魔法值 / 注释三档 / 异常不静默 / DRY rule of 3),先于具体语言 skill 触发
- `coding-standards-common` §5.0「注释语言默认 = 当前会话沟通语言」

## [1.20.0] - 2026-05-05

### Changed
- 用户目录 `{USER_DOCUMENTS}/ai-docs/{project}/` 从「草稿堆」升级为**项目级知识库**,与项目 `docs/` 索引体系等同(必须 Phase-A/B)
- `design-doc-required` / `bug-doc-required` / `business-logic-orientation` 输出路径从 `{agent}/{YYYY-MM-DD}/...` 切换到稳定 / current 文档

## [1.19.x] - 2026-05-01 ~ 05-04

### Added
- 新增 `solution-review-required`——用户给出具体方案 / 现有代码作参考时,先审视目标 / 现有代码质量 / 风险 / 更优建议,反迎合
- 新增 `bugfix-coding-style` 注释方向反转(commit `9e12fc1`):禁源码内变更日志注释、函数头不堆复盘

### Changed
- `design-doc-required` 模版分级:极简跳过 / 轻量 / 完整
- `backend-knowledge-graph-required` 升级 SQL 查询逻辑为一等资产 + 强化主动触发 + 简化骨架至 Tier 1/2/3

## [1.18.x] - 2026-05-02

### Added
- 新增 `hooks/check-git-commit-skill.js` —— git commit 前按改动大小自动放行 / 阻断

## [1.17.x] - 2026-04-30

### Notable rule reversals
- `bugfix-coding-style` 方向反转:从"建议禁变更日志"变为"强制禁止源码内变更日志 / 函数头不堆复盘",commit `9e12fc1`

## 早期版本

详见 `git log --oneline --reverse | head -100`。
