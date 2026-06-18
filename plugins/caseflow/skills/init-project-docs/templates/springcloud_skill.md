# Skill: Spring Cloud 后端规范

> **AI 处理任何 Spring Cloud/Boot 代码任务前必读此文档。**

---

## 分层职责

| 层 | 职责 | 禁止 |
|---|---|---|
| Controller | 参数校验、结果包装 | 写业务逻辑、直接操作数据库 |
| Service 接口 | 定义业务能力契约 | 包含实现细节 |
| Service 实现 | 业务逻辑编排 | 直接操作 HttpServletRequest |
| Mapper/DAO | 数据访问 | 包含业务规则 |
| Entity/Model | 数据库映射 | 包含业务逻辑方法 |

## 命名规范

| 类型 | 规范 | 示例 |
|---|---|---|
| Controller | `{Module}Controller` | `OrderController` |
| Service 接口 | `I{Module}Service` | `IOrderService` |
| Service 实现 | `{Module}ServiceImpl` | `OrderServiceImpl` |
| Mapper | `{Module}Mapper` | `OrderMapper` |
| Entity | `{Module}Entity`/`{Module}` | `OrderEntity` |
| DTO 入参 | `{Action}{Module}Request` | `CreateOrderRequest` |
| DTO 出参 | `{Module}{Scene}Response` | `OrderDetailResponse` |

## 微服务通信

- 服务间调用统一使用 Feign Client
- 异步消息通过消息队列
- 配置统一从注册中心拉取

## 数据库规范

- 表名：snake_case，复数
- 必备字段：`id`、`create_time`、`update_time`
- 禁止使用外键约束（应用层处理）
- 金额字段使用 `DECIMAL`/`BIGINT`，禁止 `FLOAT`/`DOUBLE`
- 查询指定具体列，禁止 `SELECT *`
