# {项目名} 编码规范

> 自动生成于 {YYYY-MM-DD HH:mm}
> 服务注册名称：`{service_name}`
>
> 本文件供代码生成阶段消费。
> 索引文件：[project-profile.md](project-profile.md)

---

## 10. 编码约定

### 命名规范

| 类型 | 规则 | 示例 |
|------|------|------|
| Controller | {规则} | `UserController` |
| Service | {规则} | `UserService` / `IUserService` |
| Repository | {规则} | `UserRepository` / `UserMapper` |
| DTO | {规则} | `CreateUserDTO` / `UserVO` |
| 常量 | {规则} | `MAX_RETRY_COUNT` |

### 异常处理模式

```java
// 从项目中提取的真实代码示例
{粘贴项目中典型的异常处理代码片段}
```

### 返回值包装

```java
// 从项目中提取的真实代码示例
{粘贴项目中典型的返回值包装代码片段}
```

### 通用基类与工具类

| 类名 | 用途 | 说明 |
|------|------|------|
| {BaseEntity} | {所有实体基类} | {含 id / createTime / updateTime} |
| {Result} | {统一返回包装} | {含 code / message / data} |
| ... | ... | ... |

> 本节内容从代码中归纳而来，如项目无明显约定则标注「未检测到统一约定」。

---

## 11. 配置概要

> 仅列业务相关配置（功能开关、限额、超时、重试等），跳过纯基础设施配置。

| 配置项 | 值 | 说明 |
|--------|-----|------|
| {order.max-items} | 50 | 单笔订单最大商品数 |
| {payment.timeout-seconds} | 1800 | 支付超时时间 |
| {order.cancel.auto-cancel-minutes} | 30 | 未支付自动取消时间 |
| ... | ... | ... |

> 敏感值一律用 `***` 替代。
> 无业务配置时标注「未检测到业务相关配置」。
