# {项目名称}

> AI 入口文件 | 最后更新：{YYYY-MM-DD} | 维护人：{name}
> **AI 第一个读这个文件，然后根据任务类型查阅下方"文档导航"。**

<!-- AI 生成提示：扫描 pom.xml/build.gradle/package.json 获取项目名和技术栈 -->

---

## 项目是什么

{一段话：业务背景 / 目标用户 / 核心价值}

---

## 技术栈

| 类别 | 技术 | 版本 | 说明 |
|---|---|---|---|
| 语言 | {Java/Kotlin/TypeScript} | {版本} | {用途} |
| 框架 | {Spring Boot/Vue/React} | {版本} | {用途} |
| 数据库 | {PostgreSQL/MySQL/SQLite} | {版本} | {用途} |
| 缓存 | {Redis} | — | {用途} |
| 消息队列 | {RabbitMQ/Kafka} | — | {用途} |
| 注册中心 | {Nacos/Eureka} | — | {用途} |

<!-- AI 生成提示：从构建文件提取依赖；版本从 dependency management 获取 -->

---

## 主要业务模块

| 模块 | 职责 | 关键服务/页面 | 状态 |
|---|---|---|---|
| {模块名} | {一句话职责} | {service/page 名} | {✅/🔄/⚠️} |

> 状态说明：✅ 稳定 | 🔄 开发中 | ⚠️ 待迁移/重构

<!-- AI 生成提示：扫描 Controller/Service 包结构按业务域分组 -->

---

## 关键业务链路

1. **{链路名}**：{步骤概要}
2. **{链路名}**：{步骤概要}

<!-- AI 生成提示：需人工确认——业务流程无法纯靠代码推断 -->

---

## 全局技术约定

| 约定 | 规则 |
|---|---|
| API 响应格式 | {统一格式描述} |
| 金额单位 | {分/元，数据类型} |
| 时间格式 | {UTC 时间戳/ISO 8601} |
| 认证方式 | {JWT/Session/OAuth} |

---

## 文档导航（AI 快速定位）

> 以下均为本文件同目录下的兄弟文件（相对引用，不带 `docs/` 前缀）。

| 我想了解… | 读这个文件 |
|---|---|
| 系统分层和架构边界 | `01_architecture_overview.md` |
| 所有模块一览 | `02_module_map.md` |
| 某个业务的完整流程 | `03_business_flow_map.md` |
| 数据库表结构 | `04_data_model_map.md` |
| 后端 API 接口 | `05_api_map.md` |
| 页面/接口/表对应关系 | `06_frontend_backend_mapping.md` |
| 业务术语含义 | `07_glossary.md` |
| 架构红线和禁止规则 | `08_constraints_and_rules.md` |
| 当前重构进度 | `09_refactor_plan.md` |
| 最近改了什么 | `10_change_log.md` |

---

## AI 上下文路由

> **AI 执行任何任务前，先读本文件（Tier 0），再按下表按需加载对应文档。**
> **禁止一次性全部加载，按需读取以节省 token。**

### 按任务类型加载

| 任务类型 | 必读文档 | 按需文档 |
|---|---|---|
| Bug 修复 | `08_constraints_and_rules` + `modules/{受影响模块}` | `04_data_model_map`, `06_frontend_backend_mapping` |
| 新功能开发 | `01_architecture_overview` + `02_module_map` + `05_api_map` | `04_data_model_map`, `08_constraints_and_rules` |
| 重构/迁移 | `08_constraints_and_rules` + `09_refactor_plan` + `skills/{tech}_skill` | `01_architecture_overview`, `02_module_map` |
| 接口变更 | `05_api_map` + `06_frontend_backend_mapping` | `02_module_map`, `08_constraints_and_rules` |
| 数据库变更 | `04_data_model_map` + `08_constraints_and_rules` | `02_module_map`, `06_frontend_backend_mapping` |
| 业务流程理解 | `03_business_flow_map` + `07_glossary` | `modules/{相关模块}` |

### 加载规则

1. **Tier 0（每次必读）**：本文件（`00_project_overview.md`），约 3KB，提供全局索引
2. **Tier 1（按上表必读）**：根据任务类型加载对应文档，通常 2-3 份
3. **Tier 2（实施中按需）**：碰到不确定的术语、表结构、调用关系时再读对应文档
4. **模块定位**：任务涉及具体模块时，读 `modules/{module}.md` 获取该模块的完整上下文（10 节结构）
