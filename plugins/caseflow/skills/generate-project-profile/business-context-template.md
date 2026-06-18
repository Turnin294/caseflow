# {项目名} 业务上下文

> 自动生成于 {YYYY-MM-DD HH:mm}
> 服务注册名称：`{service_name}`
>
> 本文件供需求分析和方案设计阶段消费。
> 索引文件：[project-profile.md](project-profile.md)

---

## 3. 数据模型与状态机

### 实体清单

| 实体/表名 | 核心字段 | 关联关系 | 说明 |
|-----------|---------|---------|------|
| Order / t_order | id, user_id, amount, status | 1:N -> OrderItem, N:1 -> User | 订单主表 |
| OrderItem / t_order_item | id, order_id, sku_id, qty, price | N:1 -> Order | 订单明细 |
| Payment / t_payment | id, order_id, amount, status, channel | N:1 -> Order | 支付记录 |
| ... | ... | ... | ... |

> 只列核心实体，辅助表可省略。关联关系用 `1:N` / `N:1` / `M:N` 标注。

### 状态机

| 实体 | 状态枚举类 | 状态值 | 流转路径 | 说明 |
|------|-----------|--------|---------|------|
| Order | OrderStatus | CREATED -> PAID -> SHIPPED -> COMPLETED | 正常流程 | |
| Order | OrderStatus | PAID -> REFUNDING -> REFUNDED | 退款流程 | |
| Order | OrderStatus | CREATED -> CANCELLED | 超时/用户取消 | |
| Payment | PaymentStatus | PENDING -> SUCCESS | 支付成功 | |
| Payment | PaymentStatus | PENDING -> FAILED | 支付失败 | |
| ... | ... | ... | ... | ... |

> 证据来源：{OrderStatus.java, PaymentStatus.java}

---

## 4. 业务能力清单

> 按业务域分组。每个能力附一句话业务语义说明。

### {业务域1：如 订单域}

| 能力 | Service#Method | 说明 |
|------|---------------|------|
| 创建订单 | OrderService#placeOrder | 校验库存 -> 锁库存 -> 创建订单 -> 发布 ORDER_CREATED |
| 取消订单 | OrderService#cancelOrder | 仅 CREATED 状态可取消 -> 释放库存 -> ORDER_CANCELLED |
| 查询订单 | OrderService#getOrderDetail | 按 ID / 用户 / 状态查询 |
| ... | ... | ... |

### {业务域2：如 支付域}

| 能力 | Service#Method | 说明 |
|------|---------------|------|
| 发起支付 | PaymentService#createPayment | 调用支付网关 -> 创建 Payment 记录 -> 状态 PENDING |
| 支付回调 | PaymentService#handleCallback | 验签 -> 更新 Payment 状态 -> 更新 Order 为 PAID |
| ... | ... | ... |

> Service 接口优先，无接口则读实现类。只列公开方法。

---

## 5. 核心业务流程

> 用编号列表描述 2-5 个核心业务流程。每步标注涉及的 Service、状态变迁和事件。
> 每个流程末尾必须附证据来源。

### {流程1：如 下单流程}

1. 用户提交订单 -> `OrderController#placeOrder`
2. `OrderService` 校验参数 + 校验库存
3. 调用 `inventory-service`（Feign）锁定库存
4. 创建 Order 记录（状态：CREATED）-> 写入 `t_order` + `t_order_item`
5. 发布事件 `ORDER_CREATED`（orderId, userId, amount）
6. 返回订单详情

> 证据来源：OrderServiceImpl#placeOrder, InventoryFeignClient#lockStock, OrderEventPublisher#publishCreated

### {流程2：如 支付回调流程}

1. 第三方支付回调 -> `PaymentController#callback`
2. `PaymentService` 验签 + 幂等校验（paymentId）
3. 更新 Payment 状态 PENDING -> SUCCESS
4. 更新 Order 状态 CREATED -> PAID
5. 发布事件 `ORDER_PAID`（orderId, paymentId）

> 证据来源：PaymentServiceImpl#handleCallback, PaymentController#callback

---

## 6. 关键约束与扩展点

> 回答"这个需求该插在哪、最容易炸在哪、改动半径有多大"。

### 事务边界

| 方法 | 事务范围 | 说明 |
|------|---------|------|
| OrderService#placeOrder | 创建订单 + 订单明细在同一事务 | 库存锁定通过 Feign 调用，不在事务内 |
| PaymentService#handleCallback | 更新 Payment + 更新 Order 在同一事务 | 事件发布在事务提交后 |
| ... | ... | ... |

### 幂等点

| 接口/方法 | 幂等键 | 机制 |
|-----------|--------|------|
| PaymentController#callback | paymentId | 数据库唯一索引 |
| OrderService#cancelOrder | orderId + status | 状态守卫 |
| ... | ... | ... |

### 鉴权入口

| 接口范围 | 鉴权方式 | 说明 |
|---------|---------|------|
| /api/orders/** | JWT Token | SecurityFilter 统一校验 |
| /api/internal/** | 服务间签名 | 仅内部调用 |
| ... | ... | ... |

### 状态变更守卫

| 实体 | 守卫规则 | 违反后果 |
|------|---------|---------|
| Order | CREATED -> CANCELLED 仅允许用户主动或超时 | 抛 IllegalStateException |
| Order | PAID 后不可直接 CANCELLED，必须走退款流程 | 抛 BusinessException |
| ... | ... | ... |

### 外部依赖失败补偿

| 外部依赖 | 失败处理 | 说明 |
|---------|---------|------|
| inventory-service 锁库存 | 失败则订单创建失败，无需补偿 | 强依赖 |
| payment-gateway | 超时标记 PENDING，定时任务轮询查询 | 最终一致 |
| ... | ... | ... |

### 不可轻易改动的核心规则

- {规则1：如 订单金额一旦创建不可修改（审计要求）}
- {规则2：如 支付回调必须验签（安全要求）}
- ...

> 证据来源：{OrderServiceImpl#placeOrder, SecurityConfig, PaymentCallbackController#callback}
> 未检测到显式约束时标注「未检测到」，不编造。

---

## 7. 对外暴露接口

> 本服务暴露给其他服务或前端调用的接口。按业务域分组。

### {业务域1}

| Method | URL | 入参 | 出参 | 说明 |
|--------|-----|------|------|------|
| POST | /api/orders | PlaceOrderDTO | OrderVO | 创建订单 |
| GET | /api/orders/{id} | PathVariable: id | OrderDetailVO | 查询订单详情 |
| PUT | /api/orders/{id}/cancel | PathVariable: id | void | 取消订单 |
| ... | ... | ... | ... | ... |

---

## 8. 对外调用服务

> 本服务作为客户端，调用了哪些其他服务。这是知识图谱的「出边」。

| 目标服务 | 调用方式 | 接口 | 用途 | 触发场景 |
|---------|---------|------|------|---------|
| inventory-service | Feign | POST /api/inventory/lock | 锁定库存 | 创建订单时 |
| inventory-service | Feign | POST /api/inventory/release | 释放库存 | 取消订单时 |
| payment-gateway | HTTP | POST /api/pay/create | 发起支付 | 用户确认支付时 |
| ... | ... | ... | ... | ... |

> 目标服务名必须与对方 profile 中的服务注册名称一致。
> 未检测到时标注「未检测到对外调用」。

---

## 9. 事件与消息契约

> 本服务发布和消费的异步事件/消息。这是知识图谱的「事件边」。

### 发布的事件

| Topic/Exchange | 事件类型 | Payload 关键字段 | 触发条件 |
|----------------|---------|-----------------|---------|
| order-events | ORDER_CREATED | orderId, userId, amount | 订单创建成功 |
| order-events | ORDER_PAID | orderId, paymentId | 支付回调成功 |
| order-events | ORDER_CANCELLED | orderId, reason | 用户取消订单 |
| ... | ... | ... | ... |

### 消费的事件

| Topic/Exchange | 事件类型 | 来源服务 | 处理逻辑 |
|----------------|---------|---------|---------|
| payment-events | PAYMENT_SUCCESS | payment-service | 更新订单状态为 PAID |
| payment-events | PAYMENT_FAILED | payment-service | 标记支付失败，释放库存 |
| ... | ... | ... | ... |

> 未检测到时标注「未检测到事件/消息」。
