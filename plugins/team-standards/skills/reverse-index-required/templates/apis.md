# {project} API 调用方反向索引

> 由 `reverse-index-required` skill 维护。每个 API endpoint 一个 H2。
>
> 用途:回答「这个 API 谁在调」「改入参 / 出参哪些调用方需协同」「这个 endpoint 是否还在用」类问题。
>
> 范围:**单服务内部** API 的调用方;**跨项目**调用方对照走 `cross-project-locator` 的 `{ecosystem}-topology/`。
>
> 维护规则:每次新增 / 修改 / 删除 endpoint 时,**同回合**回写本表。

---

## POST /api/order/refund

定义位置:`OrderRefundController.java:45`

### 契约

**请求**:
```json
{
  "orderId": "string",
  "amount": "number(2 decimals)",
  "reason": "string"
}
```

**响应**:
```json
{
  "refundOrderId": "string",
  "status": "string(enum RefundStatus)"
}
```

**幂等键**:`orderId + amount + reason` 哈希;重复提交返回原退款单

### 调用方清单

| 调用方 | 调用位置(file:line) | 调用语境 | 失败处理 | 改契约时风险 |
|---|---|---|---|---|
| 前端 PWA | `lib/features/refund/data/refund_api.dart:88` | 用户主动退款 | toast 错误 + 用户重试 | 高(直接面向用户) |
| 内部 BFF / kpay-pos-business-app-bff | `/refund/proxy` 透传 | BFF 转发 | 透传错误 | 中(字段名不变即无感) |
| 定时任务 RefundRetryJob | `RefundRetryJob.java:120` | 失败重试 | 重试 3 次后告警 | 中 |

### 入参 / 出参变更影响速查

| 改动类型 | 调用方协同清单 |
|---|---|
| 加 RefundRequest 字段 | 前端 PWA + BFF 透传可能需扩(若需要新字段值);定时任务**必须**改 |
| 删 RefundRequest 字段 | 前端 + BFF + 定时任务全部协同 |
| 改 RefundResponse 字段 | 前端 + BFF 全部协同(BFF 透传)+ 定时任务忽略响应可豁免 |
| 改 endpoint URL | 全部调用方 + Nginx / 网关路由 |

---

## GET /api/order/{id}

(按上节格式补充)

---

## POST /api/order/cancel

(按上节格式补充)

---

## 已废弃 / Deprecated APIs

| API | 废弃日期 | 替代品 | 旧调用方迁移状态 |
|---|---|---|---|
| `POST /api/v1/order/refund-old` | 2025-10-01 | `POST /api/order/refund` | 已全部迁移,可删除 |

---

## 候选区

| API | 候选调用方 | 来源 | 备注 |
|---|---|---|---|

---

## 维护元数据

```yaml
last_scanned_commit: {git_sha}
last_scanned_at: {YYYY-MM-DD HH:mm}
schema_version: 1
```
