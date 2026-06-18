# {project} 同步事件订阅反向索引

> 由 `reverse-index-required` skill 维护。每个事件类型一个 H2。
>
> 用途:回答「这个事件订阅了哪些场景」「新业务场景是否需要扩订阅」「改 payload 哪些消费方需协同」类问题。
>
> 维护规则:每次新增 / 修改 / 删除事件类型 / 订阅场景 / payload 字段时,**同回合**回写本表。

---

## OrderSyncEvent(订单云端同步事件)

事件定义:`{填写实际路径}`

**触发链路**:本地业务操作 → MQ topic `order.sync` → 云端 receiver `/api/cloud/order/sync` + 报表 `report-service` 订阅

### 订阅场景(已覆盖)

| 业务场景 | 触发位置(file:line) | 触发条件 | 报文字段 |
|---|---|---|---|
| 订单创建成功 | `OrderCreateService.java:200` | `orderStatus = PAID` (创建即支付) | orderId, totalAmount, status, items[], createdAt |
| 订单完成 | `OrderCompleteService.java:88` | `orderStatus = COMPLETED` 时 | (同上) + completedAt |
| 订单作废 | `OrderVoidService.java:55` | 管理员手动作废 | (同上) + voidReason, voidedBy |

### 报文字段清单

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| orderId | string | 是 | 订单主键 |
| totalAmount | number(2 decimals) | 是 | 总金额 |
| status | string(enum OrderStatus) | 是 | 订单状态 |
| items | array | 否 | 商品明细 |
| createdAt | timestamp | 是 |  |
| completedAt | timestamp | 否 | 仅完成时上传 |
| voidReason | string | 否 | 仅作废时上传 |

### 消费方清单

| 消费方 | 接口 / Topic | 接收后动作 | 失败处理 |
|---|---|---|---|
| 云端 cloud-order-receiver | `POST /api/cloud/order/sync` | 写云端订单库 | 重试 3 次 + 死信队列 |
| 报表 report-service | MQ topic `order.sync` 消费组 `report-cg` | 写报表宽表 | 重试 5 次 + 告警 |

### 接入清单(回答"新场景是否需要扩订阅"的关键)

- ✅ **已覆盖**:订单创建 / 完成 / 作废
- ❌ **未覆盖,但走其他事件**:订单退款(走 `RefundSyncEvent`)/ 订单部分退款(走 `RefundSyncEvent`)
- ⚠️ **未覆盖,新增需评估**:订单合并 / 订单拆分 / 订单改价(尚未上线,新增前需评估是否扩本事件 OR 新建事件)

### 报文字段缺漏审视

加新字段时检查清单:

- [ ] 云端 receiver 是否能识别新字段?若否,先扩 receiver 再扩报文
- [ ] 报表 ETL 是否需要解析新字段?需协同报表团队
- [ ] 旧消费方对未知字段是否会报错?(JSON 解析容错性)

---

## RefundSyncEvent(退款云端同步事件)

(按上节格式补充)

---

## InventorySyncEvent(库存云端同步事件)

(按上节格式补充)

---

## 候选区

| 事件类型 | 候选订阅场景 / 字段 | 来源 | 备注 |
|---|---|---|---|

---

## 维护元数据

```yaml
last_scanned_commit: {git_sha}
last_scanned_at: {YYYY-MM-DD HH:mm}
schema_version: 1
```
