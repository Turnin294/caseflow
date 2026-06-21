# {project} API 调用方反向索引

> 由 `reverse-index-required` skill 维护。每个 API endpoint 一个 H2。
>
> 用途:回答「这个 API 谁在调」「改入参 / 出参哪些调用方需协同」「这个 endpoint 是否还在用」类问题。
>
> 范围:**单服务内部** API 的调用方;服务间调用方在本服务侧登记到本表的调用方清单。
>
> 维护规则:每次新增 / 修改 / 删除 endpoint 时,**同回合**回写本表。

---

## POST /api/loan/repay

定义位置:`LoanRepayController.java:45`

### 契约

**请求**:
```json
{
  "billId": "string",
  "amount": "number(2 decimals)",
  "channel": "string"
}
```

**响应**:
```json
{
  "repayFlowId": "string",
  "status": "string(enum RepayStatus)"
}
```

**幂等键**:`billId + amount + channel` 哈希;重复提交返回原还款流水

### 调用方清单

| 调用方 | 调用位置(file:line) | 调用语境 | 失败处理 | 改契约时风险 |
|---|---|---|---|---|
| 前端 H5 | 经网关转发 `/repay/submit` | 用户主动还款 | toast 错误 + 用户重试 | 高(直接面向用户) |
| 内部聚合层 / finance-aggregate-service | `/repay/proxy` 透传 | 聚合层转发 | 透传错误 | 中(字段名不变即无感) |
| 定时任务 RepayRetryJob | `RepayRetryJob.java:120` | 失败重试 | 重试 3 次后告警 | 中 |

### 入参 / 出参变更影响速查

| 改动类型 | 调用方协同清单 |
|---|---|
| 加 RepayRequest 字段 | 前端 H5 + 聚合层透传可能需扩(若需要新字段值);定时任务**必须**改 |
| 删 RepayRequest 字段 | 前端 + 聚合层 + 定时任务全部协同 |
| 改 RepayResponse 字段 | 前端 + 聚合层全部协同(聚合层透传)+ 定时任务忽略响应可豁免 |
| 改 endpoint URL | 全部调用方 + 网关路由 |

---

## GET /api/bill/{id}

(按上节格式补充)

---

## POST /api/loan/disburse

(按上节格式补充)

---

## 已废弃 / Deprecated APIs

| API | 废弃日期 | 替代品 | 旧调用方迁移状态 |
|---|---|---|---|
| `POST /api/v1/loan/repay-old` | 2025-10-01 | `POST /api/loan/repay` | 已全部迁移,可删除 |

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
