# 编码摘要文档

> 本文档由完整设计文档精简而来，供 AI 辅助编码时使用，聚焦实现所需的最小必要信息。
> 对应完整文档：`{需求名称}-{YYYYMMDD}-v{N}.md`
>
> **职责边界**：设计文档回答"为什么这样做、核心逻辑是什么、风险在哪里、代码大概落哪"，本文档回答"每个方法怎么写"。
> 方法签名、方法职责、参数/返回值说明、实现伪代码等**只在本文档中维护**，设计文档不展开。

---

## 变更记录

| 版本 | 日期 | 变更内容摘要 |
|------|------|--------------|
| v1 | YYYY-MM-DD | 初始版本 |

---

## 1. 核心业务规则

> 列出所有必须遵守的业务规则，编码时不得违反。每条规则一行，简洁明确。

- 规则1：
- 规则2：
- 规则N：

---

## 2. 接口入口指针

> 字段级契约见 `{需求}-api-{YYYYMMDD}-v{N}.md`。
> 本节只列接口入口与对应实现类，方便代码定位，不展开 Headers / 字段表 / 示例。

| 接口 | 实现类 #方法 |
|------|-------------|
| `POST /api/xxx` | `com.example.XxxController#create` |
| `GET /api/xxx/{id}` | `com.example.XxxController#getById` |

---

## 3. 涉及类清单（全路径）

> 展开每个类的具体操作：新增/修改了哪些方法，每个方法的签名和职责。
> 这是编码的核心参考——设计文档只列类名和一句话职责，本节展开实现细节。

| 全路径 | 操作 | 说明 |
|--------|------|------|
| `com.example.xxx.XxxController` | 新建 | |
| `com.example.xxx.XxxServiceImpl` | 修改 | 新增 method1、method2 |
| `com.example.xxx.domain.XxxDO` | 新增字段 | 新增 status 字段 |
| `com.example.xxx.convert.XxxConvert` | 新建 | DO→VO 转换 |

### 关键方法签名与职责

> 列出所有新增/修改的方法签名，附一句话说明。
> 格式：`全路径#方法名(参数): 返回值` — 职责说明

```
// 示例
com.example.order.service.OrderService#createOrder(OrderCreateDTO dto): OrderVO — 创建订单主流程
com.example.order.service.impl.OrderServiceImpl#validateStock(Long skuId, Integer qty): void — 校验库存
```

---

## 4. 数据结构

### 关键表及字段

```
表名：xxx_order
新增字段：status tinyint(2) NOT NULL DEFAULT 0 COMMENT '状态 0待支付 1已支付 2已取消'
新增索引：idx_user_id (user_id)
```

### 关键 DTO/DO 字段

```java
// XxxCreateDTO
String orderNo;      // 订单号，非空
Long userId;         // 用户ID，非空
BigDecimal amount;   // 金额，精度2位
```

---

## 5. 重要约束与边界

- 幂等键：`{字段名}`，重复请求直接返回原结果
- 并发控制：`{乐观锁/分布式锁/数据库锁}`，锁粒度 `{说明}`
- 事务范围：`{哪些操作在同一事务内}`
- 不处理的场景：`{明确排除在外的情况}`

---

## 6. 下游依赖调用

```
// FeignClient / RPC / 内部 Service 调用
com.example.pay.feign.PayFeignClient#pay(PayDTO): PayResultDTO
com.example.inventory.feign.InventoryFeignClient#deduct(DeductDTO): Boolean
```

---

## 7. 异常处理要点

- `{场景}` → 抛出 `{全类名异常}` / 返回错误码 `{CODE}`
- `{场景}` → 返回 `{默认值/空列表}`
