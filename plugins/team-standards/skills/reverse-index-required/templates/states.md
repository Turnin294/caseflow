# {project} 状态/枚举反向索引

> 由 `reverse-index-required` skill 维护。每个枚举类一个 H2,每个枚举值占 N 行(每个判断点 1 行)。
>
> 用途:回答「新增 / 修改 X 枚举值会破坏哪些旧逻辑」类问题的权威源。
>
> 维护规则:每次新增 / 删除 / 修改枚举值时,**同回合**回写本表;每条已存在判断点须复核「新增态时是否需要补判断」。

---

## OrderStatus(订单状态)

定义位置:`{填写实际路径}:{行号}`

枚举值清单与业务语义:

| 枚举值 | 业务语义 | 终态? |
|---|---|---|
| PENDING | 已创建未支付 | 否 |
| PAID | 支付成功 | 否 |
| SHIPPED | 已发货 | 否 |
| COMPLETED | 已完成 | 是 |
| CANCELLED | 已取消(未支付前) | 是 |
| REFUNDED | 已全额退款 | 是 |

判断点反向索引:

| 枚举值 | 判断点(file:line) | 判断语义 | 新增态时是否需要补判断 | 备注 |
|---|---|---|---|---|
| PENDING | `OrderService.java:142` (canCancel) | 仅 PENDING 可取消 | 是(新中间态可能也需要可取消) |  |
| PAID | `OrderService.java:178` (canRefund) | 仅 PAID 可发起退款 | 是 |  |
| PAID | `BillSyncJob.java:88` (shouldSync) | 仅 PAID 触发账单同步到云端 | 是 |  |
| PAID | `OrderQueryDao.java:55` SQL `WHERE status = 'PAID'` | 报表只统计 PAID 订单 | 是(新成功态可能也要纳入统计) | SQL 字面量,扫描器可能漏识别 |

---

## RefundStatus(退款状态)

(按上表格式补充)

---

## PaymentChannel(支付渠道)

(按上表格式补充)

---

## 候选区(扫描器输出但需人工确认的判断点)

| 枚举值 | 候选判断点 | 来源 | 备注 |
|---|---|---|---|
| OrderStatus.PAID | `BillExportService.java:88` SQL `IN ('PAID','SHIPPED')` | 扫描器 v1 | 需人工确认是否为状态判断 |

---

## 维护元数据

```yaml
last_scanned_commit: {git_sha}
last_scanned_at: {YYYY-MM-DD HH:mm}
schema_version: 1
scanner_version: scan-reverse-index.js v1
```
