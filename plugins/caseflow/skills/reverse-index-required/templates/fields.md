# {project} 字段读写点反向索引

> 由 `reverse-index-required` skill 维护。每个表 / Entity 一个 H2,字段表格列出读 / 写点。
>
> 用途:回答「这个字段哪里在用」「改字段类型 / 改名会影响什么」「加字段是否需扩同步报文」类问题。
>
> 维护规则:每次新增 / 修改 / 删除字段时,**同回合**回写本表。

---

## bill 表 / `Bill` 实体

DDL:`{填写实际路径}`
Entity:`{填写实际路径}`

| 字段名 | 字段语义 | 读点(file:line) | 写点(file:line) | 同步报文是否包含 | 备注 |
|---|---|---|---|---|---|
| `total_amount` | 账单总金额 | `BillReport.java:42` 报表汇总 | `BillService.java:88` 创建账单 / `RefundService.java:120` 退款扣减 | 是(`BillSyncEvent.totalAmount`) | 改字段需同步报表口径与云端报文 |
| `currency` | 货币代码 | `BillExportService.java:33` 导出 | `BillCreateService.java:55` 默认 CNY | 否 | 加多币种时需扩同步 |
| `status` | 账单状态 | (见 `states.md` Bill 部分) | (见 `states.md` Bill 部分) | 是 | 状态字段读写交叉到 states.md |

---

## refund_order 表 / `RefundOrder` 实体

(按上表格式补充)

---

## 候选区

| 字段名 | 候选读 / 写点 | 来源 | 备注 |
|---|---|---|---|

---

## 字段类型变更影响速查

> 改字段类型 / 改名时优先看本节,这里登记了"字段是否暴露在外部契约"。

| 字段 | 是否在 API 出参 | 是否在同步报文 | 是否在 DDL 主键 / 索引 | 改名风险等级 |
|---|---|---|---|---|
| `bill.total_amount` | 是(`/api/bill/{id}` 出参) | 是 | 否 | 高(影响前端 + 云端) |
| `bill.currency` | 是 | 否 | 否 | 中 |

---

## 维护元数据

```yaml
last_scanned_commit: {git_sha}
last_scanned_at: {YYYY-MM-DD HH:mm}
schema_version: 1
```
