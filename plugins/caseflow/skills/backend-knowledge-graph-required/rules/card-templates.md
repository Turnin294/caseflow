# 后端知识图谱 — 文档卡片要求

> 子文档 of [backend-knowledge-graph-required/SKILL.md](../SKILL.md)。
> 本文件覆盖后端单服务知识图谱正式落盘的 10 类卡片模板：表逻辑总索引 / SQL 查询索引 / SQL 查询卡 / 原子能力索引 / 表逻辑卡 / 原子能力卡 / 能力卡 / 流程卡 / 表卡 / 枚举卡。
> 写正式图谱时按需选用对应模板；写候选池 `_candidates.md` / `_sql_candidates.md` 时模板更轻，见 SKILL.md「候选沉淀池」节。

## 表逻辑总索引

`07_table_logic_index.md` 至少包含：

```text
- 按业务对象索引：订单 / 退款 / 支付 / 库存 / 会员等
- 按场景索引：部分退、全退、取消、支付成功、补偿重试等
- 每个场景涉及的主表、关联表、状态字段、核心判定、对应 table-logic 卡片
- 常用问题反查：改了什么表、哪些状态会变、是否支持新增接口、应该复用哪个原子能力
```

推荐表格：

```markdown
| 业务对象 | 场景 | 主表 | 关联表 | 状态/金额字段 | 核心判定 | 图谱卡 | 可复用能力 |
|---|---|---|---|---|---|---|---|
| 订单 | 部分退判定 | order | refund_order / order_item | order_status / refund_status / refund_amount | 已退金额 < 可退金额且存在未退商品 | table-logic/order-refund.md | calculateRefundableAmount |
```

## SQL 查询索引

`09_sql_query_index.md` 是项目级"原子能力 ↔ SQL"反查入口，至少包含：

```text
- 按业务问题索引：订单查询 / 退款池 / 账单明细 / 流水聚合等
- 按主表索引：从主表反查有哪些查询能力
- 按原子能力索引：DAO/Mapper/Service 方法对应哪些 SQL 指纹
- 按状态 / 枚举 / 金额字段索引：哪些查询依赖这些关键字段
- SQL 变体：同一查询能力在不同入口下的 where/order/page 差异
```

推荐表格：

```markdown
| 业务问题 | 原子能力 | 主表 | 关联表 | SQL 指纹 | 参数 | 返回字段 | 过滤/聚合语义 | 代码坐标 | 场景卡 |
|---|---|---|---|---|---|---|---|---|---|
| 查询订单可退流水池 | queryRefundableTxPool | order_transaction | refund_transaction / refund_method | `SELECT ... FROM order_transaction tx LEFT JOIN ... WHERE tx.order_id=? AND tx.support_refund=1 ...` | orderId | txId / payAmount / refundedAmount / maxRefundAmount | support_refund=1、已退金额扣减、按云端优先级排序 | RefundEligibilityDao#queryRefundableTxPool | sql-queries/order-refund.md |
```

每行必须能够回答"新接口要查这个业务问题时，应该复用哪个 SQL / 原子能力"。

## SQL 查询卡

`sql-queries/{business-scenario}.md` 至少包含：

```text
- 场景名称
- 回答的业务问题
- Mermaid ER 图或局部 ER 图（主表 + 关联表）
- 标准 SQL 指纹（参数化）
- SQL 变体（不同入口 / 状态 / 排序分页）
- 参数语义
- 返回字段语义
- join/on 业务含义
- where/group by/having/order by 业务含义
- 依赖枚举 / 状态字段
- 对应原子能力 / DAO / Mapper / Repository / Service
- 调用入口
- 索引建议与性能风险
- 与 `tables/`、`table-logic/`、`atomic-capabilities/` 的交叉引用
```

推荐结构（实际文件中可使用 Mermaid / SQL fenced code block；本处只展示骨架）：

```text
# 订单退款查询 SQL

## 业务问题
- 查询某订单当前还可以退款的原支付流水池。

## ER
- order_transaction ||--o{ refund_transaction : original_transaction_id

## 标准 SQL 指纹
- SELECT ...
- FROM order_transaction tx
- LEFT JOIN refund_transaction rt ON rt.original_transaction_id = tx.id
- WHERE tx.order_id = :orderId AND tx.support_refund = 1
- GROUP BY tx.id

## 字段语义
| 字段 | 来源 | 业务含义 |
|---|---|---|

## 原子能力
| 方法 | 说明 | 代码坐标 |
|---|---|---|
```

## 原子能力索引

`08_atomic_capability_index.md` 至少包含：

```text
- 原子能力名称
- 业务关键词
- 入参 / 出参
- 读写表
- SQL 指纹 / 查询卡
- 状态/金额/枚举规则
- 代码坐标
- 被哪些 API / Service 复用
- 新接口复用建议
```

推荐表格：

```markdown
| 能力 | 关键词 | 入参 | 出参 | 涉及表 | SQL / 查询卡 | 代码坐标 | 复用入口 |
|---|---|---|---|---|---|---|---|
| 计算订单可退金额 | 退款 / 可退 / 部分退 | orderId | amount | order / refund_order / order_item | sql-queries/order-refund.md | XxxService#calculateRefundableAmount | 退款申请 / 退款预览 |
```

## 表逻辑卡

`table-logic/{business-object-or-scenario}.md` 至少包含：

```text
- 场景名称
- 业务问题：这张卡回答什么问题
- 涉及表关系：主表、关联表、join/关联字段
- 核心判定矩阵：条件 → 业务含义 → 结果
- 状态变化矩阵：表.字段 原值 → 新值 → 触发动作 → 代码坐标
- 金额/数量聚合规则：字段来源、加减方向、过滤条件
- 可复用原子能力：Service/DAO/Mapper 方法
- 新接口支持判断：现有表/能力是否支持，缺口是什么
- 代码坐标与证据：SQL、DAO、枚举、设计文档、测试
```

推荐结构：

```markdown
标题：订单部分退表逻辑

回答的问题：
- 如何判断订单是未退、部分退、全退？
- 新增退款相关接口时应该复用哪些表和原子能力？

表关系：
| 表 | 角色 | 关联字段 | 说明 |
|---|---|---|---|

判定矩阵：
| 条件 | 业务含义 | 判定结果 | 代码坐标 |
|---|---|---|---|

状态变化矩阵：
| 动作 | 表 | 字段 | 变化 | 触发条件 | 代码坐标 |
|---|---|---|---|---|---|

原子能力：
| 能力 | 方法 | 说明 |
|---|---|---|
```

## 原子能力卡

`atomic-capabilities/{capability-name}.md` 至少包含：

```text
- 能力名称
- 业务语义
- 入参 / 出参
- 读取表 / 写入表
- 依赖枚举 / 状态字段
- 过滤条件
- 事务要求
- 复用入口
- 禁止重复实现的位置
- 代码坐标
```

## 能力卡

`capabilities/{capability-name}.md` 至少包含：

```text
- 能力名称
- 能力类型：原子能力 / 领域能力 / 编排能力
- 业务目标
- 入口 API / Service / UseCase
- 调用的原子能力
- 涉及表
- 涉及枚举
- 状态流转
- 事务边界
- 幂等规则
- 外部依赖
- 失败与补偿
- 代码坐标
```

## 流程卡

`flows/{flow-name}.md` 至少包含：

```text
- 流程目标
- 触发入口
- Mermaid 时序图
- 表读写顺序
- 能力调用链
- 枚举/状态变化
- 外部系统调用
- 异常分支
- 日志与观测关键字
```

## 表卡

`tables/{table-name}.md` 至少包含：

```text
- 表职责
- 主键 / 唯一键 / 关键索引
- 核心字段业务含义
- 状态字段解释
- 金额 / 数量 / 业务状态字段的计算来源
- 读它的能力
- 写它的能力
- 与其它表关系
- 参与的业务场景与 table-logic 卡片
- Mermaid ER 图
- 数据一致性约束
```

## 枚举卡

`enums/{enum-name}.md` 至少包含：

```text
- 枚举类路径
- 数据库存储值
- 中文业务含义
- 可进入条件
- 可流转目标
- 禁止流转
- 前端展示含义（如已知）
- 历史兼容值（如存在）
```
