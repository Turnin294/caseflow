---
name: zhuanzhuan-code-review
description: "转转金融代码交付前自检清单（增量代码合规收口）。Use when 完成一段业务代码准备提测/提交前，对照审查范围逐项自检。本 skill 是「收口 checklist」——审查项规则全部引用现有 skill（数据→zhuanzhuan-data-standards、架构/基础服务交叉调用→architecture-ddd-lite-fullstack、编码/SCF 通用性→四层编码 skill、技术风险→事务发 MQ·线程安全·慢 SQL·连接打满），本 skill 不重写规则、只做交付前过一遍并标注不符合项。团队人工流程（提测前一天审查、指定审查人、TAPD 录工时、掷色子抽查、周会复盘、40% 迁移衡量）不在 AI 承接范围，由人工执行。核心原则：增量代码不符合规范即标出并修正，不符合不交付。"
---

# 转转金融代码交付前自检

> **本 skill 是「交付前收口清单」，不是新规则。** 每个审查项的判定标准都引用对应 skill，本文件只负责"提交/提测前对照过一遍、把不符合项揪出来修掉"。
>
> 触发：完成一段业务代码、准备提测或 `git commit` 前。与 [[git-commit-standards]]（commit 规范）互补——本 skill 管"代码本身合不合规"，git-commit 管"提交信息怎么写"。

---

## 适用边界

- **AI 承接**：审查范围逐项自检 + 增量代码合规判定（下方清单）。
- **人工执行，不在本 skill**：提测前一天 / 自测当天的时间节点、指定审查人、TAPD 录工时（≤6h）、掷色子抽查、周会复盘、改动超 40% 按新架构迁移的衡量——这些是团队协作流程，AI 不代办。
- **只审增量**：审查对象是本次新增/修改的代码，不是全量历史。

---

## 自检清单（提交前逐项过）

> 每项命中即停下修正，规则细节进对应 skill。

### 1. 数据库 / SQL（→ [[zhuanzhuan-data-standards]] + [[finance-coding-standards]] §8）
- [ ] 无慢 SQL：无 `SELECT *`、无 `%` 前导 like、无负向查询、WHERE 走索引
- [ ] update/delete 带 where + 索引字段，影响行 ≤2 万
- [ ] 无子查询 / 联查不超两表（金融）；状态变更 SQL 带原状态条件
- [ ] 金额字段 DECIMAL / 分；枚举英文字符串

### 2. 架构 / 基础服务交叉调用（→ [[architecture-ddd-lite-fullstack]]）
- [ ] 无基础服务交叉调用（基础层提供的 SCF 接口须有通用性，不为单一调用方定制）
- [ ] 分层正确：Controller/Facade 不写业务逻辑，业务不写在 Mapper/DAO
- [ ] 业务分支落 focused service，未往 god service 堆方法

### 3. 编码 / SCF 通用性（→ [[coding-standards-common]] / [[java-coding-standards]] / [[zhuanzhuan-coding-standards]] / [[finance-coding-standards]]）
- [ ] SCF 接口入参/出参定义对象（禁 Map）、响应 ZZOpenScfBaseResult 不返回 null
- [ ] 包装类型、不吞异常、日志占位符对应、switch 带 default
- [ ] 无魔法值、命名规范（Enum/Util/Consumer/Producer）、清理黄色告警和无用 import

### 4. 重大漏洞（→ 技术风险，本 skill 直接列）
- [ ] 无慢 SQL 打满数据库连接
- [ ] 线程池使用合理（不 new Thread、不 Executors 直建）
- [ ] 批量接口入参有上限保护（pageSize 等），防内存溢出
- [ ] 触发短信/OCR/人脸的操作有防重复调用

### 5. 技术风险（→ [[finance-coding-standards]] §9 事务 + 并发）
- [ ] 事务中无 RPC/HTTP 调用，**不在事务中发 MQ**（事务失效风险）
- [ ] 并发安全：共享状态有锁（分布式锁走 zzlock，见 [[zhuanzhuan-tech-stack-selection]]）
- [ ] NPE 防护到位（拆箱 / RPC 返回 / 集合元素 / 级联调用）

### 6. NPE 与防御（→ [[finance-coding-standards]] §5）
- [ ] 远程调用返回对象先判空；equals 调用方非 null；级联调用拆开判空

---

## 判定原则

- **增量代码不符合规范 = 不交付**：自检命中的项必须当场修正，不能"先提了再说"。
- **不确定算不算违规**：对照对应 skill 的违规速查表逐字面比对，仍不确定时保守按违规处理、修正。
- **40% 迁移线由人工判断**：本次改动占原文件比例若较大，提醒用户"可能需要按新架构迁移"，但是否迁移、比例怎么算由人工（需求负责人）决定，AI 不强制、不自行迁移。

---

## 配套 zz-harness 平台能力（自检后跑真审查）

> 本 skill 是「交付前对照规范自检」的清单。自检通过后，**完整的本地 CR / 静态扫描 / SQL 校验**用 zz-harness 的 skill——caseflow 自检是前置，zz-harness 做正式审查与上报。

| 场景 | 用 zz-harness skill | 能做什么 |
|------|---------------------|---------|
| 跑完整本地代码审查 + 出报告 + 传 Beetle | `zzcr`（zzcommon） | 多视角分析 diff、生成标准化 Markdown 报告、上传 Beetle |
| 查/修当前分支 Sonar 静态扫描问题 | `fix-sonar-issues`（zzrd） | 查 BUG/代码异味/安全漏洞，自动修复 |
| 校验本次 SQL 是否合规 | `mysql-check`（zzrd） | 审查 DDL/DML 是否符合转转数据库规范 |
| 扫错误日志定位根因并修复 | `fix-error-log` / `error-fix-pipeline` | 查异常聚合、堆栈，定位并生成修复 |

> 分工：caseflow `zhuanzhuan-code-review` 是**编码当下的自检前置**（不符合不交付），`zzcr` 是**提交前的正式审查与上报**，两者前后衔接。
