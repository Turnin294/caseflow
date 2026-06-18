# Saga / Outbox / Domain Event 实施模板

> `architecture-ddd-lite-fullstack` 的「跨分支编排」和「聚合边界」两节给出了**原则**(跨聚合走 Domain Event / Saga;Orchestrator 内部只编排不写业务);本文件给出三栈(Java / Python / Dart)的**具体实施模板**。
>
> 何时用本模板:跨 ≥2 个 focused service 的复合动作、跨聚合的最终一致性场景、需要失败补偿 / 异步重试 / 长事务。

## 一、Pattern 选择决策

| 场景 | Pattern | 一致性模型 |
|------|---------|-----------|
| 同事务可完成的 ≥2 个 focused service 编排(同聚合或允许同事务跨聚合的兼容场景) | **Orchestrator + `@Transactional`** | 强一致 |
| 跨聚合,允许最终一致 | **Outbox + Domain Event** | 最终一致 |
| 跨聚合,有失败补偿动作(回滚 / 退还 / 通知) | **Saga(编排式 或 协作式)** | 最终一致 + 显式补偿 |
| 长流程(>30s / 多步异步等待) | **Saga(状态机驱动)** | 显式状态机 + 超时回收 |

## 二、Orchestrator 模板(同事务编排)

适用 O1-O4 触发的最简场景:`approveAndRefund` 同事务调用 cancel + refund。

### Java(Spring)

```java
package com.example.order.application;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 跨分支编排:approve 后 refund,同事务原子完成。
 * 自身不写任何业务规则,只做顺序 + 事务边界声明。
 */
@Service
public class ApproveAndRefundOrchestrator {

    private final CancelService cancelService;
    private final RefundService refundService;

    public ApproveAndRefundOrchestrator(CancelService cancelService, RefundService refundService) {
        this.cancelService = cancelService;
        this.refundService = refundService;
    }

    @Transactional(rollbackFor = Exception.class)
    public void execute(ApproveAndRefundRequest req) {
        cancelService.cancel(req.toCancelRequest());
        refundService.refund(req.toRefundRequest());
        // 任一失败 Spring 自动回滚两步
    }
}
```

### Python(FastAPI + SQLAlchemy)

```python
# application/approve_and_refund_orchestrator.py
from sqlalchemy.orm import Session

class ApproveAndRefundOrchestrator:
    """跨分支编排:approve 后 refund,同事务原子完成。"""

    def __init__(self, cancel_service: CancelService, refund_service: RefundService):
        self._cancel = cancel_service
        self._refund = refund_service

    def execute(self, req: ApproveAndRefundRequest, db: Session) -> None:
        with db.begin():
            self._cancel.cancel(req.to_cancel_request(), db)
            self._refund.refund(req.to_refund_request(), db)
            # 任一异常 sqlalchemy 自动 rollback
```

### Dart(Serverpod / Shelf + Drift)

```dart
// application/approve_and_refund_orchestrator.dart
class ApproveAndRefundOrchestrator {
  final CancelService _cancel;
  final RefundService _refund;

  ApproveAndRefundOrchestrator(this._cancel, this._refund);

  Future<void> execute(ApproveAndRefundRequest req, AppDatabase db) async {
    await db.transaction(() async {
      await _cancel.cancel(req.toCancelRequest());
      await _refund.refund(req.toRefundRequest());
      // 任一抛异常自动 rollback
    });
  }
}
```

## 三、Outbox Pattern(跨聚合最终一致)

适用:订单创建后通知库存 / 钱包 / 物流多个聚合,要求"订单事务提交 ⟹ 事件可靠投递"。

### 关键不变式

1. **事件与业务变更同事务写入** —— Outbox 表是当前服务的内部表,与业务表同库同事务
2. **事件投递与业务事务分离** —— 异步轮询 Outbox 表,投递到 MQ / 直接调用订阅方,投递成功后标记 Outbox 行为 SENT
3. **订阅方幂等消费** —— 用 `event_id` 做幂等键,重复投递不会重复执行

### Outbox 表 DDL

```sql
CREATE TABLE outbox_event (
    id            BIGINT      PRIMARY KEY AUTO_INCREMENT,
    aggregate_id  VARCHAR(64) NOT NULL,           -- 聚合根 ID,如 order_id
    aggregate     VARCHAR(64) NOT NULL,           -- 聚合名,如 'Order'
    event_type    VARCHAR(64) NOT NULL,           -- 'OrderCreated' / 'OrderRefunded' 等
    payload       JSON        NOT NULL,           -- 事件 payload
    created_at    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at       TIMESTAMP   NULL,               -- NULL = 待投递,非 NULL = 已投递
    retry_count   INT         NOT NULL DEFAULT 0,
    INDEX idx_pending (sent_at, created_at)       -- 投递轮询用
);
```

### Java(Spring)

```java
// 业务侧:订单创建同时写 Outbox 行
@Service
public class CreateOrderService {

    private final OrderRepository orderRepo;
    private final OutboxRepository outboxRepo;
    private final ObjectMapper objectMapper;

    @Transactional
    public Order createOrder(CreateOrderRequest req) {
        Order order = Order.fromRequest(req);
        orderRepo.save(order);

        // 同事务写 outbox,业务事务提交即事件落地
        OutboxEvent event = OutboxEvent.builder()
            .aggregateId(order.getId().toString())
            .aggregate("Order")
            .eventType("OrderCreated")
            .payload(toJson(order))
            .build();
        outboxRepo.save(event);

        return order;
    }
}

// 投递侧:定时任务轮询未发送事件
@Component
public class OutboxRelay {

    private final OutboxRepository outboxRepo;
    private final EventPublisher publisher;       // MQ producer 或直接 HTTP 调用

    @Scheduled(fixedDelay = 500)                  // 每 500ms 拉一次
    @Transactional
    public void relay() {
        List<OutboxEvent> pending = outboxRepo.findPending(100);  // 批量,加 FOR UPDATE SKIP LOCKED
        for (OutboxEvent ev : pending) {
            try {
                publisher.publish(ev.getEventType(), ev.getPayload());
                ev.markSent();                    // sent_at = now
            } catch (Exception e) {
                ev.incrementRetry();              // 退避重试,超过 N 次进死信
            }
        }
        outboxRepo.saveAll(pending);
    }
}
```

### Python(FastAPI + SQLAlchemy + Celery)

```python
# application/create_order_service.py
class CreateOrderService:
    def __init__(self, order_repo, outbox_repo):
        self._orders = order_repo
        self._outbox = outbox_repo

    def create_order(self, req: CreateOrderRequest, db: Session) -> Order:
        with db.begin():
            order = Order.from_request(req)
            self._orders.save(order, db)
            # 同事务写 outbox
            self._outbox.save(
                aggregate_id=str(order.id),
                aggregate="Order",
                event_type="OrderCreated",
                payload=order.model_dump_json(),
                db=db,
            )
            return order

# infrastructure/outbox_relay.py — Celery beat 每 500ms 跑
@celery_app.task
def relay_outbox():
    with SessionLocal() as db, db.begin():
        pending = outbox_repo.find_pending(db, limit=100, for_update_skip_locked=True)
        for ev in pending:
            try:
                publisher.publish(ev.event_type, ev.payload)
                ev.mark_sent()
            except Exception:
                ev.increment_retry()
```

## 四、Saga(显式补偿)

适用:跨聚合且**任一失败都需要回滚已成功步骤**的场景。

### 编排式 Saga(中央协调器)

```text
        CreateOrderSaga
        ┌──────────────┐
        │ Start         │
        └──────┬───────┘
               ↓
       1. createOrder()  ────失败──→ END(NoCompensation)
               ↓ 成功
       2. reserveInventory()  ────失败──→ compensate: cancelOrder()
               ↓ 成功
       3. chargeWallet()  ────失败──→ compensate: releaseInventory() + cancelOrder()
               ↓ 成功
        ┌──────────────┐
        │ End(Success)  │
        └──────────────┘
```

### Java(伪代码,可对接 Camunda / Axon / 自研)

```java
@Service
public class CreateOrderSaga {

    private final CreateOrderService createOrderService;
    private final InventoryService inventoryService;
    private final WalletService walletService;
    private final SagaStateRepository sagaStateRepo;

    public SagaResult execute(CreateOrderSagaContext ctx) {
        SagaState state = sagaStateRepo.create(ctx);

        try {
            Order order = createOrderService.createOrder(ctx.toOrderRequest());
            state.complete("order_created", order.getId());

            inventoryService.reserve(ctx.toReserveRequest());
            state.complete("inventory_reserved");

            walletService.charge(ctx.toChargeRequest());
            state.complete("wallet_charged");

            return SagaResult.success(order);
        } catch (Exception e) {
            return compensate(state, e);
        }
    }

    private SagaResult compensate(SagaState state, Exception cause) {
        // 反向执行已完成步骤的补偿动作
        if (state.isCompleted("wallet_charged")) {
            walletService.refund(state.getContext().toRefundRequest());
        }
        if (state.isCompleted("inventory_reserved")) {
            inventoryService.release(state.getContext().toReleaseRequest());
        }
        if (state.isCompleted("order_created")) {
            createOrderService.cancel(state.getOrderId());
        }
        state.markFailed(cause);
        return SagaResult.failure(cause);
    }
}
```

### Python(状态机驱动)

```python
class CreateOrderSaga:
    """编排式 Saga: createOrder → reserveInventory → chargeWallet。
    任一失败按反向顺序补偿。"""

    def __init__(self, order_svc, inventory_svc, wallet_svc, state_repo):
        self._order = order_svc
        self._inventory = inventory_svc
        self._wallet = wallet_svc
        self._state = state_repo

    def execute(self, ctx: CreateOrderSagaContext) -> SagaResult:
        state = self._state.create(ctx)
        try:
            order = self._order.create_order(ctx.to_order_request())
            state.complete("order_created", order_id=order.id)

            self._inventory.reserve(ctx.to_reserve_request())
            state.complete("inventory_reserved")

            self._wallet.charge(ctx.to_charge_request())
            state.complete("wallet_charged")

            return SagaResult.success(order)
        except Exception as e:
            return self._compensate(state, e)

    def _compensate(self, state, cause):
        if state.is_completed("wallet_charged"):
            self._wallet.refund(state.context.to_refund_request())
        if state.is_completed("inventory_reserved"):
            self._inventory.release(state.context.to_release_request())
        if state.is_completed("order_created"):
            self._order.cancel(state.order_id)
        state.mark_failed(cause)
        return SagaResult.failure(cause)
```

## 五、最佳实践 / 陷阱

| 项 | 推荐 | 陷阱 |
|----|------|------|
| 业务变更 + 事件落地 | 必须同事务(Outbox 或事件表) | ❌ 业务事务 commit 后再发 MQ —— commit 与发送之间 crash 会丢事件 |
| 订阅方消费 | 必须幂等(用 event_id 去重) | ❌ 不做幂等 —— 重试会重复扣库存 / 重复退款 |
| Saga 补偿动作 | 必须可重入(被多次调用结果一致) | ❌ 补偿动作本身有副作用且不幂等 —— 失败重试反而扩大损失 |
| Saga 状态存储 | 持久化(独立 saga_state 表) | ❌ 仅内存状态 —— 协调器 crash 后无法恢复 |
| Outbox 投递并发 | `FOR UPDATE SKIP LOCKED` 或单线程 relay | ❌ 多 relay 并发不加锁 —— 同事件重复投递 |
| 跨服务调用 | 接收方按 event_id 幂等 + 超时回退 | ❌ 无超时 —— 调用方 hang 住占用线程池 |
| 补偿动作日志 | 完整记录(谁触发 / 补偿到哪一步 / 原因) | ❌ 仅 log.error —— 事后定位无法还原现场 |

## 六、何时**不**用 Saga

- 完全可同事务完成的场景 → 用普通 `@Transactional` Orchestrator,不要过度引入 Saga
- 无业务补偿动作的场景(失败就失败,不需要回滚) → 用 Outbox + 重试即可
- 严格强一致场景(金融核心账务) → 走分布式事务(2PC / TCC),不用最终一致的 Saga
- 单聚合内的多步操作 → 聚合内自管,根本不算"跨服务编排"

## 关联 skill

- `architecture-ddd-lite-fullstack`「跨分支编排」「聚合边界与事务一致性」
- `backend-knowledge-graph-required`(若实施了 Saga,把 Saga 流程登记到正向图谱)
- `reverse-index-required`(事件订阅者要登记到 events 反向索引)
