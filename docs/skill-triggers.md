# Skill 触发关键词反重叠表

> **目的**: 解决 AI 命中多个 skill 时的"乱序触发 / 漏触发 / 重复触发"问题。本文档给出**唯一的关键词 → 主触发 skill 映射**, 重叠场景指明谁主谁辅、谁先谁后。
>
> 与 [CLAUDE.md § Skill 主动触发规范](../CLAUDE.md#skill-主动触发规范) 配套使用: 触发规范定义"何时触发", 本表定义"重叠时怎么办"。

## 重叠典型场景

| 场景 | 关键词 | 主触发 (先调) | 辅触发 (后调或被动) | 不触发 (即使关键词命中) |
|---|---|---|---|---|
| 用户问"加这个状态会破坏哪些旧逻辑" | 加状态 / 状态破坏 / 影响 | `reverse-index-required`(查询模式) | `backend-knowledge-graph-required`(若需正向背景) | `glossary-required`(不涉及业务术语) |
| 改枚举值 / 字段定义 / 同步事件 payload / API endpoint | 改枚举 / 改字段 / 改事件 / 改 API | `design-doc-required` → 编码 → `reverse-index-required`(回写) | `backend-knowledge-graph-required`(若动表关系) | — |
| 用户问表关系 / 字段来源 / SQL 怎么写 / 部分退判定 | 表关系 / ER / SQL / 退款判定 | `backend-knowledge-graph-required` | `glossary-required`(若涉及业务术语未登记) | `reverse-index-required`(查询正向, 非反向) |
| PRD / 设计 / 对话出现未登记的业务领域名词 | 订单 / 账单 / 退款 / 分摊 / 流水 / 快照 / 对账 | `glossary-required`(候选追加) | `backend-knowledge-graph-required`(若已知正向定义) | — |
| 用户与 AI 对同义词使用不一致 ("退货" vs "退款") | 同义词 / 同名异叫 | `glossary-required`(同义词归一) | — | `cross-project-locator`(跨项目才走) |
| 跨项目调用链追踪 (≥2 个 kpay POS 工程) | 跨项目 / 调用链 / 接口对照 / 链路 / korepos+bff | `cross-project-locator` | `reverse-index-required`(若单服务内调用方仍需要) | `backend-knowledge-graph-required`(它管单服务) |
| 重构 / 复写 / 迁移前需要梳理现状 | 重构前分析 / orientation / 现状梳理 / 业务逻辑 | `business-logic-orientation` | `backend-knowledge-graph-required`(若涉及后端) | — |
| 报告 Bug / 描述异常 / 请求分析根因 | bug / OOM / NPE / 异常 / 排查 | `bug-doc-required` → `design-doc-required`(修复方案) | `pre-implementation-code-orientation`(改代码前) | — |
| 用户提出具体方案/参考代码并要求实施 | 按这个思路实施 / 参考现有代码改 / 按这个回复改 | `solution-review-required`(必先于 design-doc) | `design-doc-required`(确认后) | — |
| 写新接口前涉及表读写 / 状态判定 / 金额聚合 | 加接口 / 写 service / 写 DAO | korepos-backend-service(若 korepos,已迁至 kpay-daily-plugin) 或 `architecture-ddd-lite-fullstack`(通用) | `backend-knowledge-graph-required`(读图谱) + `coding-standards-common` | — |
| 函数内按业务类型 if-else / switch 堆叠 ≥2 分支 | if-else 堆叠业务类型 / switch orderType / 不同订单类型同函数处理 / 函数内分流 / A 订单 B 订单同方法 | `architecture-ddd-lite-fullstack`(函数级业务场景分流节,判定阶梯 1/2) | `coding-standards-common §2.5`(通用兜底提醒) | — |
| 改 Flutter 代码 | Flutter / .dart / 退款 UI / pos | (后端) korepos-backend-service(已迁至 kpay-daily-plugin) 或 (前端) `architecture-ddd-lite-fullstack` | `arch-lint`(编码后) + `coding-standards-common` | — |
| 写源码 Edit/Write | .java / .dart / .ts / .py / .kt 任一 | `design-doc-required`(若未触发) → `pre-implementation-code-orientation` → `architecture-ddd-lite-fullstack` | `coding-standards-common`(任何源码必经) + 语言专属 | `bug-doc-required`(无 bug 报告) |
| 提交 commit | git commit / 提交 / push | `git-commit-standards`(大改 hook 强制) | `daily-work-log`(会话末) | — |
| 业务项目源码改动后 | (任何源码 Edit/Write 完毕) | `daily-work-log`(批处理 / 会话末) | `dev-log`(仅 team-standards 自身) | — |
| 修改 team-standards 自身 skill / hook / 规则 | skills/ 下编辑 / 改 SKILL.md / 改触发链路 | `dev-log`(决策型变更) | `git-commit-standards`(自动 push) | `daily-work-log`(它管业务项目) |
| 用户纠正 AI 编码错误 (分层违规 / 命名错 / 依赖方向错) | "这样写不对" / "不能引用这个层" / "改一下依赖方向" | `coding-violation-log`(登记模式, 异步) | — | — |
| 开始编码前 (项目有 coding-violations.md) | (任何源码 Edit/Write 前) | `coding-violation-log`(回顾模式, 静默扫描) | `coding-standards-common` | — |

## 关键词归属总表 (按词反查)

| 关键词 | 唯一主 skill | 备注 |
|---|---|---|
| 设计文档 / 需求 / 方案 / 修改代码 / 帮我改 | `design-doc-required` | 所有源码改动门禁 |
| bug / 异常 / OOM / NPE / 根因分析 | `bug-doc-required` | bug 修复链路入口, 必接 design-doc-required |
| 方案审视 / 现有代码参考 / 反迎合 / 更优建议 | `solution-review-required` | 必先于 design-doc |
| 实施前定位 / 开始写代码 / 读哪些文件 | `pre-implementation-code-orientation` | 文档→代码桥梁 |
| 文档输出路径 / docs / ai-docs / Phase-A / Phase-B / 查重 | `doc-index-required` | 所有 .md Edit 前必经 |
| 分层 / DDD / Feature 模块 / 原子能力 / 单向依赖 / 函数级业务分流 / 业务定位判定 / 阶梯 1 / 阶梯 2 / if-else 堆叠业务类型 | `architecture-ddd-lite-fullstack` | 通用架构门禁 |
| 命名 / 函数原子 / 80 行 / 注释三档 / 单一职责 / DRY / 业务场景分流 | `coding-standards-common` | 任何源码必经 |
| Java / Javadoc / Integer 比较 / HashMap 容量 / SLF4J | `java-coding-standards` | Java 独占 |
| 后端接口 / endpoint / shelf / handler / 加 endpoint | korepos-backend-service（已迁至 kpay-daily-plugin） | korepos 项目专属，本插件不再承载 |
| bug 修复 / 对齐云端 / 删冗余 / 函数头复盘禁令 | `bugfix-coding-style` | 与编码 skill 叠加 |
| commit / git / push / type 前缀 / 中文 body | `git-commit-standards` | hook 兜底大改 |
| 工作日志 / 工时 / daily-log / 业务项目记录 | `daily-work-log` | 业务项目改动后 |
| 后端表关系 / ER / SQL / 状态判定 / 原子能力 / 表逻辑 | `backend-knowledge-graph-required` | 正向单服务图谱 |
| 反向影响 / 这个状态破坏哪些 / 字段在哪用 / 事件订阅 / API 调用方 | `reverse-index-required` | 反向影响索引 |
| 业务术语 / 订单 / 退款 / 分摊 / 同义词 / glossary | `glossary-required` | 仅业务领域词 |
| 跨项目 / 跨工程 / 调用链 / 链路 / end-to-end / kpay-pos-topology | `cross-project-locator` | ≥2 工程才触发 |
| 编码违规 / 分层违规 / 用户纠错 / 防重犯 | `coding-violation-log` | 异步登记 + 编码前回顾 |
| Flutter 架构检查 / arch lint / 5 类规则 | `arch-lint` | Flutter 改完异步 |
| Mermaid / 图表 / 流程图 / 时序图 / 目录复核 / TOC | `markdown-writing-standards` | 任何 .md 改完结构性扫一遍 |
| 现状梳理 / orientation / 重构前分析 / 业务逻辑梳理 | `business-logic-orientation` | 重构/迁移前 |
| 跨项目同名异叫法 (项目 A 叫订单, 项目 B 叫 Order) | `cross-project-locator/shared-glossary.md` | 不进单项目 glossary |
| 通用编程概念 (线程 / 缓存 / 事务 / 子进程) | `backend-knowledge-graph-required`(技术难点) | 不进 glossary |
| 初始化项目文档 / 生成知识图谱 / 4 阶段 | `init-project-docs` | 一次性入口 |
| 项目画像 / project profile / 10 维度 | `generate-project-profile` | 独立扫描 |
| team-standards 自身变更决策 / 新增 / 删除 skill / 链路反转 | `dev-log` | 仅 team-standards 仓库 |

## 互斥与同回合不重叠规则

| 维度 | 规则 |
|---|---|
| `glossary-required` vs `backend-knowledge-graph-required` | 业务领域名词 (订单/退款) → glossary; 通用编程概念 (线程/缓存) → backend-knowledge-graph 的「技术难点」节; 不交叉 |
| `glossary-required` vs `cross-project-locator/shared-glossary.md` | 单项目术语 → glossary; 跨项目同名异叫法对照 → cross-project; 不交叉 |
| `backend-knowledge-graph-required`(正向) vs `reverse-index-required`(反向) | 正向: 这个枚举有什么值 / 这张表有什么字段; 反向: 这个枚举值在哪里被判断 / 这个字段在哪里被读写; 两者文件不同, 同回合可同时触发但不重复维护同一条事实 |
| `daily-work-log` vs `dev-log` | daily-work-log 作用于业务项目; dev-log 作用于 team-standards 插件源码仓库; 不重叠 |
| `business-logic-orientation` vs `pre-implementation-code-orientation` | orientation 是重构前**梳理现状** (产出独立文档); pre-implementation 是基于**已写好的 design 文档**定位代码; 不混用 |
| `coding-standards-common` vs `java-coding-standards` | common 先 (跨语言 7 条铁律); Java 后 (独占条款); 两者叠加不替代 |
| `bugfix-coding-style` vs `coding-standards-common` | bugfix 关注注释 / 历史痕迹清理; common 关注命名 / 函数原子 / 注释三档; 两者叠加 |
| `bug-doc-required` vs `design-doc-required` | bug 修复链路两者都必走; bug 文档负责分析根因, design 文档负责实施方案 |
| `solution-review-required` vs `design-doc-required` | 永远 solution-review 先; review 完成后 design-doc 才进入 |

## 触发主次决策树 (快速判定)

```
用户输入 → 关键词命中
    ↓
是否多个 skill 关键词同时命中?
    ├─ 否 → 直接走对应 skill
    └─ 是 ↓
        按上方「重叠典型场景」表查主辅顺序
            ├─ 找到匹配场景 → 按表执行
            └─ 未找到 ↓
                按以下兜底顺序:
                ① solution-review-required (若用户给具体方案)
                ② glossary-required (若涉及未登记术语)
                ③ backend-knowledge-graph-required (若涉及后端表/状态/原子能力)
                ④ reverse-index-required (若涉及反向影响)
                ⑤ design-doc-required (源码改动门禁)
                ⑥ bug-doc-required (bug 场景额外加)
                ⑦ doc-index-required (写 .md 前)
                ⑧ pre-implementation-code-orientation (改代码前)
                ⑨ architecture-ddd-lite-fullstack (强制门禁)
                ⑩ coding-violation-log (回顾模式)
                ⑪ bugfix-coding-style (bug 修复)
                ⑫ coding-standards-common (任何源码强制)
                ⑬ 语言专属 (java / korepos)
                ⑭ markdown-writing-standards (含 mermaid)
                ⑮ cross-project-locator (跨项目)
                ⑯ arch-lint (Flutter 异步)
                ⑰ git-commit-standards (commit 前)
                ⑱ daily-work-log (会话末)
                ⑲ reverse-index-required (回写模式)
                ⑳ coding-violation-log (登记模式) + dev-log
```

## 修订与维护

- 新增 / 删除 skill 后必须更新本表的「重叠典型场景」与「关键词归属总表」
- 调整 skill 触发条件后必须确认本表的关键词分配是否仍准确
- 与 [CLAUDE.md](../CLAUDE.md) 的「Skill 主动触发规范」「Skill 并发触发顺序与冲突解决」「改动规模 → 链路档位」配套维护
