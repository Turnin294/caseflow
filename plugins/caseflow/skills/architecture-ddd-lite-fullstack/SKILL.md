---
name: architecture-ddd-lite-fullstack
description: "Use before writing or reviewing any business code in Java (Spring Boot/Spring Cloud), Python (FastAPI/Django/Flask), React, or Vue. MUST be invoked after design/pre-implementation orientation and before the first source-code edit to decide the target layer, feature module, reusable atomic capability, and maintainability boundaries. Enforces DDD-lite layering, feature-based structure, one-way dependencies, clear code structure, low coupling, high cohesion, and prevents business logic from being written directly in Controller/UI/Page."
---

# DDD-lite 全栈架构编码规范

## 核心哲学

该项目采用 DDD-lite + Feature 模块化架构，目标是：代码结构清晰、易于维护、低耦合、高内聚、可复用、可扩展、适合 AI 协作开发。

**本 SKILL 与语言无关**——所有核心原则（分层+单向依赖 / Feature 模块化 / focused service per branch / 跨分支编排独立 / 横切走中间件 / 命名 taxonomy 项目级统一 / 聚合边界）是 SOLID + Clean Architecture + DDD-lite 的应用级表达，**在 Java、Python、TypeScript 上都一致适用**。SKILL 内的代码示例多用 Java 写法是因为它能精确表达事务/AOP/注解等机制，但**所有规则都有对应的 Python（decorator / contextvar / middleware）、TypeScript（decorator / NestJS Pipe）等价实现**,见各章节后端机制对照表与「Python 后端约束」节。

任何业务代码，必须先判断属于哪一层，再实现；不允许直接写在 Controller / UI / Page 中。

清晰结构不是"代码写完后再优化"的附加项，而是第一行代码前的门禁。AI 不得为了快速完成而新增难读、难测、难替换、职责混杂的实现。

---

## 快速导航

- **触发与门禁** → [触发时机](#触发时机) / [编码前检查清单](#编码前检查清单) / [输出要求](#输出要求)
- **架构分层** → [标准分层模型](#标准分层模型) / [各层职责](#各层职责)
- **项目组织** → [Feature 模块化结构](#feature-模块化结构) / [原子能力沉淀](#原子能力沉淀) / [聚合边界与事务一致性](#聚合边界与事务一致性) / [结构质量门禁](#结构质量门禁)
- **Service 形态铁律** → [Service 业务动作扩展铁律](#service-业务动作扩展铁律每个业务分支一个-focused-service任何新方法都不进-god-service) / [函数级业务场景分流](#函数级业务场景分流分支差异即拆分不只是-service-级函数级也要拆) / [跨分支编排](#跨分支编排同一回合调用-2-个-focused-service-时的归属) / [横切关注点不计入 god service 判定](#横切关注点不计入-god-service-判定aop--拦截器--事务声明的豁免)
- **技术栈约束** → [前端约束](#前端约束) / [Java 后端约束](#java-后端约束) / [Python 后端约束](#python-后端约束)
- **命名规范** → [服务命名 taxonomy](#服务命名-taxonomyservice--usecase--handler--orchestrator)

---

## 触发时机

在以下场景必须主动调用本 Skill：

| 场景 | 动作 |
|------|------|
| 准备编写 Java / Python / TypeScript / React / Vue 业务代码 | 先判断代码所属层级与 feature 模块 |
| 根据设计文档或 coding.md 开始实现 | 在第一行源码改动前完成分层检查 |
| 新增接口、页面、UseCase、Service、Repository、DAO、HTTP Client | 明确职责边界和调用链 |
| 重构现有业务逻辑 | 先识别现有逻辑应沉到 Application / Domain / Infrastructure 的哪一层 |
| 代码审查发现跨层调用、巨型 Service、重复业务逻辑 | 用本规范判定违规类型 |
| 代码实现可能继续沿用低质量旧结构 | 先判断是否会增加耦合、职责混杂或维护成本 |

---

## 标准分层模型

```text
UI / Controller / Page
        ↓
Application（UseCase / Service）
        ↓
Domain（业务规则）
        ↓
Repository（数据抽象）
        ↓
Infrastructure（DB / HTTP / MQ / Storage）
```

### 强制规则

1. 上层只能依赖下层，依赖方向必须单向。
2. UI / Controller / Page 层不能直接调用 Repository、DAO、DB、HTTP、MQ、Storage。
3. Application 层负责业务流程编排，不直接写技术细节。
4. Domain 层只表达业务规则、状态机、校验逻辑，不依赖 Spring、HTTP、DB、React/Vue 框架。
5. Repository 层只定义数据访问抽象，不写具体 DB / HTTP 实现。
6. Infrastructure 层只做技术实现，包括 DB、Redis、HTTP Client、MQ、Storage、本地缓存。

---

## Feature 模块化结构

所有业务代码必须按 feature 组织，而不是按技术层全局平铺。

```text
features/
  {feature_name}/
    presentation/      # UI / Controller / Page
    application/       # UseCase / Application Service / Composable Service
    domain/            # Entity / Value Object / Rule / Policy / State Machine
    repository/        # Repository 接口定义
    infrastructure/    # Repository 实现、DB、HTTP、MQ、Storage
    api/               # 前端 HTTP 请求封装
    components/        # 前端纯展示组件
    hooks/             # React Hook / Vue Composable / 状态编排
    types/             # DTO / ViewModel / 类型定义
```

### 结构取舍

| 项目复杂度 | 允许简化 | 禁止事项 |
|------------|----------|----------|
| 简单项目 | 可省略独立 Domain 目录，把简单规则放在 Application 内部私有方法 | 不能让 UI / Controller 直接访问 DB / HTTP |
| 中型项目 | 使用完整 DDD-lite 分层 | 不能把所有逻辑塞进单个 Service |
| 复杂系统 | DDD-lite + 状态机 + 领域事件 + 原子能力沉淀 | 不能跨 feature 随意 import 内部实现 |

---

## 各层职责

### Presentation 层

职责：
- 接收用户输入或 HTTP 请求。
- 做轻量参数适配与响应转换。
- 调用 Application 层。
- 渲染结果或返回响应。

禁止：
- 写业务规则。
- 写 SQL、HTTP、MQ、缓存访问。
- 直接调用 Repository / DAO / Infrastructure。

### Application 层

职责：
- 编排业务流程。
- 调用 Domain 规则、Repository 抽象、外部能力接口。
- 处理事务边界、幂等边界、流程日志。

要求：
- 必须体现流程编排，而不是 Controller 的搬运函数。
- 复杂流程拆成多个私有步骤或原子能力，禁止堆成巨型方法。
- 跨 UseCase 复用的能力必须下沉为原子能力。

### Domain 层

职责：
- 表达核心业务规则。
- 表达状态机、合法流转、金额/数量/权限等校验。
- 提供业务语义清晰的 Entity、Value Object、Policy、Rule。

禁止：
- 依赖 Spring、MyBatis、HTTP Client、DB、MQ、React/Vue 框架。
- 读取配置、发请求、写日志流水表。

### Repository 层

职责：
- 定义数据访问抽象。
- 使用业务语义命名查询和保存能力。

示例：
```text
OrderRepository
  findById()
  save()
  findRefundableItems()
```

禁止：
- 泄漏 SQL 细节到上层方法名。
- 把 HTTP / DB 实现写进接口层。

### Infrastructure 层

职责：
- 实现 Repository。
- 调用数据库、Redis、HTTP、MQ、Storage、SQLite、本地文件。
- 做 DTO 与领域对象之间的转换。

禁止：
- 编排完整业务流程。
- 反向调用 Application / Presentation。

---

## 原子能力沉淀

所有通用业务能力必须抽象为可复用的原子能力，避免多个 UseCase 重复实现同一段业务逻辑。

### 判定标准

命中任一条件，应沉淀为原子能力：

| 条件 | 示例 |
|------|------|
| 被两个及以上 UseCase 复用 | 退款金额计算、订单可退校验 |
| 代表稳定业务规则 | 状态流转校验、罚息计算 |
| 需要独立测试 | 手续费分摊、本息拆分 |
| 未来可能被接口、定时任务、消息消费共同调用 | 退款终态登记、库存释放 |

### 命名示例

```text
RefundService
  validateRefundable()
  calculateRefundAmount()
  createRefundTransaction()
  callPayChannel()
  registerRefundFinalState()
```

禁止在多个 UseCase 中重复写同一份退款、支付、库存、订单状态流转逻辑。

---

## 聚合边界与事务一致性

> 立场:focused service 拆分回答的是"**业务分支**怎么分",聚合边界回答的是"**数据一致性边界**怎么分"——这是两个正交但配套的决策。一个 focused service 的方法体内修改了哪些数据、能不能在同事务里完成、跨聚合需要不需要发 Domain Event,**取决于这些数据落在哪几个聚合里**。本节给出实用判定规则,不展开 DDD 教科书全套。

### 核心规则(3 条)

1. **一个事务只修改一个聚合根** —— `@Transactional` 标注的方法,只允许修改一个聚合的状态(及其内部 Entity / VO)。跨聚合的"同时修改"必须改为:**事务内只改一个聚合 + 发 Domain Event + 异步另一聚合订阅消费**。
2. **跨聚合调用走 Domain Event 或 Saga**,不走同事务直接修改。两个聚合之间不互相持有强引用,只持有 ID。
3. **聚合内部 → 强一致** / **聚合之间 → 最终一致**。Saga 模式负责跨聚合编排 + 失败补偿,见上面「跨分支编排」节。

### 判定:Refund 是 Order 聚合内动作还是独立 Refund 聚合?(实用 5 问)

| # | 判定问 | 答 Yes → Refund 是**独立聚合** | 答 No → Refund 是**Order 聚合内动作** |
|---|--------|--------------------------------|---------------------------------------|
| A1 | Refund 有独立生命周期吗?(待退 → 已退 → 已冲正,与 Order 状态机不重合) | ✓ 独立聚合 | 跟 Order 状态机绑死 |
| A2 | Refund 需要独立查询吗?(列表页 / 详情页能脱离 Order 单独打开) | ✓ 独立聚合 | 只通过 Order 详情页展开 |
| A3 | Refund 需要独立审计 / 版本号 / 乐观锁吗? | ✓ 独立聚合 | 跟 Order 共审计 |
| A4 | Refund 会被其它业务流程独立引用吗?(对账 / 财务 / 风控独立拉取) | ✓ 独立聚合 | 只在 Order 流程内使用 |
| A5 | Refund 改动量和频次 ≥ Order 主表?或独立扩展字段持续增加? | ✓ 独立聚合 | 共表或单字段足够 |

**判定输出**:

- ≥3 个 Yes → **独立聚合**:建 `RefundRepository`、`refund_record` 表、`Refund` 实体;`RefundService` 操作 Refund 聚合,与 `OrderService` 通过 `OrderRefundedEvent` / Saga 协同。
- ≤2 个 Yes → **Order 聚合内动作**:Refund 是 Order 的状态变迁,`RefundService` 仍然是 focused branch service,但内部直接通过 `OrderRepository` 修改 Order 聚合,事务内完成。
- 模糊 → 默认按"独立聚合"处理,因为反向重构(独立 → 内置)比正向(内置 → 独立)简单。

### 聚合边界 → focused service 的影响

| 场景 | focused service 的形态 |
|------|------------------------|
| Order 聚合内动作(refund / cancel / reject 都修改 Order 状态) | focused service 直接通过 `OrderRepository` 修改 Order;同事务;不发 Domain Event(除非外部需要监听) |
| Refund 是独立聚合 | `RefundService` 通过 `RefundRepository` 操作 Refund 聚合;不直接修改 Order;Order 状态变化通过订阅 `RefundCompletedEvent` 异步更新 |
| 跨 ≥2 聚合的复合动作(approveAndPay 改 Order + Payment + Inventory) | 走 `Saga` / `Orchestrator`:事务内只改一个聚合,其余通过 Event / 补偿动作 |

### 反模式

- ❌ **一个 `@Transactional` 方法同时修改 ≥2 个聚合根**(`Order` + `Refund` + `Inventory` 同事务硬改) → 走 Domain Event 或 Saga
- ❌ **跨聚合持有强引用 / 同事务 join 修改** → 只持有 ID,通过 Repository 查
- ❌ **业务流程紧耦合聚合**:支付必须等库存扣减完成才返回(同事务) → 库存预占(同事务)+ 库存扣减(异步 / Saga)
- ❌ **没想清楚聚合边界就拆 focused service** → 先按上面 5 问判定聚合,再决定 focused service 的数据访问路径

### 与既有规则的关系

- 「Service 业务动作扩展铁律」回答"业务分支怎么拆 service";本节回答"数据一致性怎么拆事务"。两者**正交且必须同时满足**——focused service 不会自动给出聚合边界,聚合边界也不会自动决定 focused service 数量。
- 「跨分支编排」节的 `Orchestrator` / `Saga` 命名,在本节的"跨聚合协同"语境下复用同一套类——一个 `Saga` 既可能是跨分支编排,也可能是跨聚合最终一致性载体,两者本质同源(都是"协调多个不能放同事务的动作")。
- `backend-knowledge-graph-required` 的全景 ER / 表关系图是聚合判定的输入证据;判定结果反过来更新该图谱(标注哪些表属于同一聚合)。

---

## 结构质量门禁

**详细规则见 [rules/structure-quality-gates.md](./rules/structure-quality-gates.md)**。该子文档覆盖：

- 四原则：代码结构清晰 / 易于维护 / 低耦合 / 高内聚
- 新代码落点决策（扩展现有功能时不要在旧结构堆叠）
- **Service 业务动作扩展铁律**：每个业务分支一个 focused service，god service 不加方法
- 跨分支编排（同一回合调用 ≥2 个 focused service 时落到独立 Orchestrator）
- 横切关注点豁免（AOP / 拦截器 / 事务声明不计入 god service 判定）
- 禁止行为表

**编码前必读**该子文档，再回到下方各栈专属约束。下方仅保留四原则速记，详细规则请翻子文档。

### 四原则速记

- **代码结构清晰**：命名表意 + 文件单一职责 + 方法围绕单一业务步骤 + 目录位置自解释
- **易于维护**：明确变更点 + 扩展优于修改 + 对外契约/领域规则/技术适配分离 + 不复制旧代码
- **低耦合**：上层依赖抽象 + 跨 feature 走能力端口 + DTO/Entity/ViewModel 不混用 + 外部系统隔离在 Infrastructure
- **高内聚**：同业务能力集中 + 一个 Service 一个流程 + 原子能力沉淀 + 状态机集中表达

### 核心铁律（详见子文档）

1. **新代码落点**：扩展功能时新代码放新结构暴露 public 方法，旧代码只 +1 行调用——不在旧文件就地堆叠
2. **Service 业务动作扩展**：每个业务分支一个 focused service，**god service 零业务方法**，任何新 public 方法都不进 god service
3. **函数级业务场景分流**：函数内按业务类型 if-else / switch 分流 ≥2 个分支时，先判定分支差异本质——同业务定位拆函数内私有方法（阶梯 1），不同业务定位升级到 service 级拆分（阶梯 2）。**判定锚点是「业务定位」而非「代码相似度」**——长得像但业务定位不同就要拆
4. **跨分支编排**：同一回合调用 ≥2 个 focused service 时（O1-O4 条件）必须落到独立 Orchestrator / Saga，不进 focused service 内部
5. **横切关注点豁免**：日志/审计/权限/事务/metrics/缓存/限流走 AOP/拦截器/注解统一注入，focused service 内部不重复实现；横切实现类不算 god service

### 函数级业务场景分流（分支差异即拆分，详见子文档）

> 上一条「Service 业务动作扩展」管 **service 粒度**；本条管「函数粒度 → service 粒度」之间的判定阶梯——函数内出现按业务类型 if-else / switch 堆叠 ≥2 分支时，**先判定分支差异本质**：
>
> - **阶梯 1（同业务定位）**：分支共享同一状态机 / 校验 / 补偿 / 团队 → 抽 `_handleTypeA()` / `_handleTypeB()` 私有方法，主方法只做分流派发
> - **阶梯 2（不同业务定位）**：分支差异本质是不同业务实体（独立状态机 / 独立 PRD 模块 / 独立团队）→ 升级到 service 级拆分，按上一条「Service 业务动作扩展铁律」建 `AService` / `BService1`，共享逻辑沉到原子能力层
>
> **判定锚点是「业务定位」而非「代码相似度」**——长得像但业务定位不同就是阶梯 2；业务定位相同即使代码差异较大也是阶梯 1。
>
> 详细判定锚点表（PRD 视角 / 状态机 / 下游 / 校验 / 补偿 / 团队 6 个信号）+ Java 示例 + 1-100 期反惯性话术清单见 [rules/structure-quality-gates.md § 函数级业务场景分流](./rules/structure-quality-gates.md#函数级业务场景分流分支差异即拆分不只是-service-级函数级也要拆)。

---

## 前端约束

适用于 React / Vue。

标准调用链：

```text
Page
  ↓
Hook / Composable
  ↓
Service
  ↓
API
```

强制规则：

1. Page 不能直接调用 API。
2. API 必须封装在 `api/` 层。
3. 业务流程放在 hook / composable / service。
4. UI 组件必须尽量纯展示，不承载业务规则。
5. 跨页面复用的业务逻辑不能复制粘贴，必须沉淀为 service 或 reusable hook。

---

## Java 后端约束

适用于 Spring Boot / Spring Cloud。

标准调用链：

```text
Controller
  ↓
Application Service / UseCase
  ↓
Domain Service / Policy / Entity
  ↓
Repository Interface
  ↓
Infrastructure Mapper / Client / MQ Adapter
```

强制规则：

1. Controller 只处理协议适配、参数校验入口、响应包装。
2. Service 不能变成巨型类；一个 Service 应围绕一个清晰业务能力或流程。**多分支 god service**(如 `OrderService` 同时承载 `refund`/`cancel`/`reject`)**不允许追加任何 public 业务方法**——无论新方法是新业务分支(`reverseCheckout`)还是同分支变种(`partialRefund`)。新业务分支新建该分支的 focused service;同分支变种进该分支的 focused service(若分支散落在 god service 则新建并把既有方法+变种**一并迁过去**)。god service 只保留 1 行 delegate 入口。详见「Service 业务动作扩展铁律」节。
3. 领域规则不能写在 Mapper、Controller、Feign Client 中。
4. Feign / Mapper / Redis / MQ 调用必须隔离到 Infrastructure 或 Adapter。
5. 事务边界放在 Application 层，Domain 不感知事务框架。

---

## 金融技术部聚合层分层结构（金融场景优先，覆盖上方通用 DDD-lite）

> 金融技术部 Java 后端**优先采用本结构**，覆盖上方通用 DDD-lite 调用链。命名/契约细则见 [[finance-coding-standards]]。

**contract 层**（对外契约）：

```text
contract
  common      // 对外暴露的枚举、常量
  facade      // 门面入口
    http      // 对外 http 接口
    rpc       // 对外 scf 接口
    third     // 外部第三方使用（如异步回调）
  request     // 入参对象
  response    // 响应结果
```

**service 层**（业务实现）：

```text
service
  common      // service 内部使用的枚举、常量、自定义异常
  config      // apollo 等相关配置
  facade      // http / rpc / third 实现
  mq          // mq 相关
  helper      // 封装中台 / 其他业务线 rpc 接口
  service     // 主业务逻辑层（逻辑简单也可直接在 facade 层完成）
  repository  // 数据库相关
  task        // 定时任务
  utils       // 常用工具
```

强制规则：

1. 跨业务线 / 中台 RPC 调用统一封装到 `helper`，不散落在 service 主逻辑里。
2. `repository` 是数据库访问的唯一出口，service 不直接写 SQL。
3. contract 只放契约对象（request / response / 对外枚举），禁止出现 MyBatis-Plus 注解（`@TableName` / `@TableField` 仅限 service 层 DO）。
4. focused service 铁律在金融分层下依然成立：`service/` 下按业务能力拆分，不堆 god service。

---

## Python 后端约束

适用于 FastAPI / Django(含 DRF) / Flask。

标准调用链：

```text
Endpoint(FastAPI router / Django view / Flask route)
  ↓
Application Service / UseCase  (XxxService class)
  ↓
Domain Service / Policy / Entity  (纯业务规则,无 IO)
  ↓
Repository Interface(协议 / Protocol / ABC)
  ↓
Infrastructure(SQLAlchemy / Django ORM / httpx / aio-pika)
```

强制规则：

1. Endpoint(`@router.post(...)` / `views.py` / `@app.route(...)`)只处理协议适配、Pydantic / DRF Serializer 校验、响应包装。
2. Service 不能变成巨型类;一个 Service 围绕一个清晰业务分支。**god service 不允许新增业务方法**——铁律与 Java 完全一致,详见「Service 业务动作扩展铁律」节。
3. 领域规则(纯函数 / Pydantic model 方法 / dataclass 行为)**不依赖** FastAPI / Django ORM / SQLAlchemy / Celery 等框架,可脱离 web 框架单测。
4. SQLAlchemy / Django ORM / httpx / redis-py / aio-pika 等技术调用必须隔离到 Infrastructure 或 Adapter。
5. **事务边界放在 Application 层**(`with session.begin():` / `@transaction.atomic` / `async with db.transaction():`),Domain 不感知 session / transaction;事务跨聚合时改走 Domain Event(blinker / Celery / Kafka)+ Saga。
6. **依赖注入用 FastAPI `Depends()` / Django app 配置 / DI 容器**,禁止在 Service 内部 import 具体 Infrastructure 实现;Service 只依赖 Repository 协议(`Protocol` / `ABC`)。
7. **异步与同步分层一致**——同步项目(Django)和异步项目(FastAPI)的分层规则一致,异步项目所有 IO 必须 `async`,Service / Repository 接口同步异步选定一种贯彻。
8. **数据 DTO 用 Pydantic / dataclass**,禁 ORM 模型穿透到 Endpoint / Domain;DTO ↔ Domain ↔ ORM 三态分离,在 Application / Infrastructure 边界做转换。

横切机制对照(同上「横切关注点不计入 god service 判定」节的 Python 列):FastAPI `Depends` / decorator / middleware 等价 Spring 的 `@Aspect` + AOP,**横切实现类不计入 god service**。

---

## 命名规范

### 服务命名 taxonomy(Service / UseCase / Handler / Orchestrator)

> 立场:Application 层的"业务容器类"在不同流派下有不同叫法——CQRS 流派叫 `XxxCommandHandler` / `XxxHandler`、Clean Architecture 流派叫 `XxxUseCase` / `XxxInteractor`、传统 Spring 流派叫 `XxxService`。**三种叫法语义等价**(都是 focused 业务分支容器),但**同一项目内必须选定一种贯彻**,不能 `RefundService` / `CancelUseCase` / `ReverseCheckoutHandler` 三种混用。本节给出选型矩阵 + 强制映射,把"叫法之争"封死。

**1. 选型矩阵(项目级选定一种,后续所有 focused service 沿用)**:

| 项目主流派 | 语言典型框架 | 选用命名 | 理由 |
|-----------|-------------|---------|------|
| 传统 Spring Boot / 主流 Java 后端 | Spring Boot / Spring Cloud | **`XxxService`** | 与 `@Service` 注解 + Spring 教科书 + 团队既有命名一致 |
| Python Web 后端(主流) | FastAPI / Django / Flask | **`XxxService`** | Python 社区主流命名(FastAPI 文档、cosmic-python 等),与 Java 跨栈一致 |
| TypeScript 后端 | NestJS / tRPC | **`XxxService`** | NestJS `@Injectable()` 标准命名 |
| CQRS / 命令-查询分离 / EventSourcing | Axon(Java) / MediatR(.NET) / cqrs(Python) | **`XxxCommandHandler`**(写)/ **`XxxQueryHandler`**(读) | CQRS 教科书命名 |
| Clean Architecture / Hexagonal / 强调用例 | 跨语言通用 | **`XxxUseCase`** / **`XxxInteractor`** | Robert Martin 命名,与 Use Case Driven Design 一致 |

> 多语言项目原则:**全栈选同一种命名**(默认 `XxxService`),避免 Java 项目用 `XxxService`、Python 项目用 `XxxUseCase` 这种"按语言切换叫法"——团队 onboarding 成本太高。CQRS 流派除外(它本身就是跨语言一致的)。

**2. 跨分支编排类(orchestrator)统一叫法**(与上面 focused service 命名解耦):

| 编排类型 | 统一命名 | 用途 |
|---------|---------|------|
| 跨分支同步编排 | **`XxxOrchestrator`** | 调用 ≥2 个 focused service,同事务边界 |
| 跨分支异步编排 / 失败补偿 | **`XxxSaga`** | 长事务 / 补偿动作 / 跨服务最终一致性 |
| Application 层用例聚合(可选) | **`XxxUseCase`** | 注意:若 focused service 已选 `XxxUseCase`,则 orchestrator 用 `XxxOrchestrator` 区分 |

**3. 其它角色命名(全局统一)**:

| 类型 | 命名示例 | 备注 |
|------|----------|------|
| Domain Service / 原子能力(纯业务规则,无 IO) | `RefundCalculator` / `RefundPolicy` / `RefundValidator` | 避免与 focused service 同名;用 `Calculator` / `Policy` / `Validator` / `Resolver` 等表达"纯规则" |
| Repository 接口 | `OrderRepository` | 业务语义命名 |
| Repository 实现 | `OrderRepositoryImpl` / `MybatisOrderRepository` | 实现可带技术前缀 |
| Controller | `RefundController` | RESTful 路由对应 |
| React Hook | `useRefund` | 复用业务流程 |
| Vue Composable | `useRefund` | 同上 |
| 横切实现(AOP / Filter) | `AuditAspect` / `LoggingInterceptor` / `SecurityFilter` | 用 `Aspect` / `Interceptor` / `Filter` / `Middleware` 后缀标明横切机制 |

**4. 反模式(禁止)**:

- ❌ **同一项目混用 focused service 命名**:`RefundService` + `CancelUseCase` + `ReverseCheckoutHandler` 三种叫法并存,后续 AI / 新人不知道该建哪种 → 选定一种贯彻
- ❌ **`XxxApplicationService` 容器化命名**:这个名字暗示"一个 aggregate 一个 service 含多方法"的传统 DDD 模式,与本 SKILL 的"每分支一 focused service"相反,**禁止新建**;若历史代码已有,按 god service 处置(对应分支抽到独立 focused service)
- ❌ **`XxxManager` / `XxxHelper` / `XxxUtil`**:语义模糊,容易演化成 god class → 改用 `XxxService` / `XxxCalculator` / `XxxPolicy` 等表意命名
- ❌ **focused service 与 Domain 原子能力同名**:`RefundService`(application 编排)与 `RefundService`(domain 规则)冲突 → Domain 侧改 `RefundCalculator` / `RefundPolicy` 等

---

## 编码前检查清单

写第一行业务代码前，必须逐项确认：

- [ ] 本次代码属于哪个 feature。
- [ ] 本次代码属于哪一层。
- [ ] 调用方向是否只从上层到下层。
- [ ] UI / Controller / Page 是否没有直接访问 Repository / DB / HTTP。
- [ ] 业务规则是否没有写进 Infrastructure。
- [ ] 可复用业务能力是否已沉淀为原子能力。
- [ ] 是否复用了已有原子能力，而不是重复实现。
- [ ] 是否避免新增巨型 Service。
- [ ] **扩展既有 service 时,是否答了两连问:(1) 新方法属于哪个业务分支?(2) 该分支有 focused service 吗?——任何情况下都不允许往多分支 god service 里加业务方法,新分支新建 focused service,同分支变种进该分支的 focused service(若散落在 god service 则新建并把既有方法一并迁过去),god service 只保留 1 行 delegate 入口。**
- [ ] **本次新代码是否在同一回合调用 ≥2 个 focused service?是 → 必须落到独立 Orchestrator / Saga,不进任一 focused service 内部,Controller 也不直接连续调用。**
- [ ] **横切关注点(日志/审计/权限/事务/metrics/缓存/限流)是否走 AOP / 拦截器 / 注解统一注入,而不是在 focused service 内部手写?横切实现类(`AuditAspect` 等)不算 god service。**
- [ ] **本次新建 / 复用的 focused service / orchestrator 命名是否符合项目选定的 taxonomy(同一项目内 `Service` / `UseCase` / `CommandHandler` 三种叫法只选一种贯彻)?Orchestrator / Saga 命名是否与 focused service 区分?禁止 `XxxApplicationService` / `XxxManager` / `XxxHelper` 等模糊命名。**
- [ ] **本次修改涉及 ≥2 个表 / ≥2 个领域对象时,是否先用「聚合边界 5 问」判定它们是否同聚合?同聚合 → 同事务直接修改;不同聚合 → 走 Domain Event 或 Saga,禁止 `@Transactional` 内硬改 ≥2 个聚合根。**
- [ ] 代码结构是否清晰，文件/类/方法职责是否单一。
- [ ] 新增实现是否易于维护，未来规则扩展是否有稳定落点。
- [ ] 是否保持低耦合，避免跨层、跨 feature 直接依赖内部实现。
- [ ] 是否保持高内聚，同一业务能力的规则和状态处理是否集中表达。
- [ ] 生成代码时能说明每个类/文件属于哪一层。

---

## 输出要求

当本 Skill 参与编码时，AI 在动手前必须先给出简短分层判断：

```text
分层判断：
- Feature：{feature_name}
- Presentation：{是否涉及，文件/类}
- Application：{是否涉及，文件/类}
- Domain：{是否涉及，文件/类}
- Repository：{是否涉及，文件/类}
- Infrastructure：{是否涉及，文件/类}
- 原子能力复用/新增：{说明}
- 结构质量：{清晰性 / 可维护性 / 低耦合 / 高内聚判断}
```

如果无法判断层级，必须先读取项目结构或设计文档；仍无法判断时，向用户确认，不得直接把逻辑写进 UI / Controller。

---

## 红色警告

| 想法 | 正确处理 |
|------|----------|
| "这个逻辑很短，直接写 Controller 里" | 先判断是否是业务规则；是则下沉 Application / Domain |
| "页面直接调 API 更快" | API 封装到 api 层，页面调用 hook / service |
| "Repository 实现里顺便编排业务流程" | 编排放 Application，Infrastructure 只做技术实现 |
| "多个 UseCase 复制一段计算逻辑" | 抽成原子能力并补测试 |
| "Domain 里注入 HTTP Client / Mapper" | Domain 保持纯业务，技术依赖放 Infrastructure |
| "一个 Service 什么都管" | 按 UseCase / 原子能力拆分，职责单一 |
| "原 service 才 200 行,反正还没到巨型,加个 reverseCheckout 没事" | 错。Service 业务动作扩展看的不是行数,是**新方法属于哪个业务分支 + 该分支有没有 focused service**。多分支 god service 一律不允许加业务方法,只允许 1 行 delegate |
| "新增方法只有几十行,先在原 service 加,以后再拆" | "以后再拆"几乎不会发生;一旦塞进去,下次再加新分支时上一个先例就成了借口,会持续向同一容器堆叠。**第一次扩展就建 focused sub-service** |
| "partialRefund 和 refund 共享状态机,所以可以放 OrderService" | 错。共享状态机说明它们属于同一退款分支——**两者都应该在 `RefundService` 里**,不是都留在 god service。若既有 refund 还在 god service,本次扩展就是把它+新变种一并迁出的契机 |
| "把既有 refund 也迁出去太大动静,先把新方法塞 god service" | strangler pattern 的目的就是逐步迁出,**这次扩展就是迁出契机**。如果只迁新方法、既有方法还留在 god service,既有方法以后永远迁不出去 |
| "先能跑，结构以后再说" | 结构质量是编码前门禁，先拆职责和依赖边界再写 |
| "复制旧实现最快" | 先判断旧实现是否值得参考；低质量旧结构不能扩散 |
