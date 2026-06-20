---
name: finance-coding-standards
description: "金融技术部 Java 后端编码独占条款，叠加在 coding-standards-common + java-coding-standards 之上且优先级最高。Use when writing/reviewing/modifying 金融技术部 Java 后端代码（SCF 服务 / 聚合层 / FinanceBiz 系列基类）。覆盖接口契约（入参出参禁 Map、继承 FinanceBizBaseReq、ZZOpenScfBaseResult 禁 null、FinanceBizAsserts 断言）、控制流（禁 ≥2 层 if-else 嵌套）、日志分级（info/warn/error）、命名（Enum/Util/Consumer/Producer 后缀、SCF 实现类不加 Impl）、NPE 防护、禁用项（旧 GsonUtil/com.bj58.idc/ImmutablePair 用于 RPC）、数据源主从分离、MyBatis-Plus、枚举英文字符串。冲突时金融条款优先于转转研发中心通用规范，再优先于 caseflow 自有规则。注意区分框架场景导致的伪冲突（SCF 实现类不加 Impl ≠ 普通 Java 类的 ServiceImpl）。"
---

# 金融技术部 Java 编码规范（部门独占强制项）

> **优先级链路（冲突时的覆盖顺序）：金融技术部规范（最高） → 转转研发中心通用规范 → caseflow 自有规则（最低）。**
>
> 通用 7 条铁律见 [[coding-standards-common]]；阿里黄山版 Java 独占条款见 [[java-coding-standards]]。三者叠加：先满足 common，再 java，最后本文件覆盖前两者的冲突项。
>
> 触发顺序：`coding-standards-common` → `java-coding-standards` → `finance-coding-standards`（本文件，金融场景优先）。

---

## 0. 框架场景辨伪冲突（先读）

并非所有"看起来矛盾"的规则都是真冲突。落规则前先判断是否同一框架场景：

| 表面冲突 | 转转研发中心 | 金融技术部 | 真伪 |
|---------|------------|-----------|------|
| Service 实现类命名 | 普通 Java Service/DAO 用 `XxxServiceImpl` | **SCF 接口**实现类不加 `Impl`（`scfProxyFactoryUtil.creat` 源码有坑） | **伪冲突**——前者普通类，后者 SCF 远程代理场景，按场景各用各的 |

判定锚点：**先认框架/场景，再决定用哪条**。普通业务类沿用 `Impl`；SCF 接口实现类不加 `Impl`。

---

## 1. 接口契约（强制）

- 所有接口**入参与出参必须定义对象**，禁止用 `Map` 作入参/出参；即使单个入参也须封装对象（便于扩展与参数校验）
- 入参对象必须继承 `com.zhuanzhuan.zzfinance.springboot.starter.request.FinanceBizBaseReq`
- 所有接口响应必须以 `com.bj58.zhuanzhuan.zzentry.common.service.entity.ZZOpenScfBaseResult` 返回，**不允许返回 null**
- 所有抛业务异常动作使用断言 `com.zhuanzhuan.zzfinance.springboot.starter.asserts.FinanceBizAsserts`
- 所有入参必须校验，优先使用 JSR 参数校验

---

## 2. 控制流（强制）

- **禁止出现两层及两层以上的 if-else 嵌套**，必须用卫语句（guard clause）或策略模式替代
- `switch` 必须有 `default`，每个 `case` 必须有 `break` / `return`

---

## 3. 日志分级（强制）

- 流程日志用 `info`，业务中断用 `warn`，业务异常用 `error`
- 占位符与填充变量必须一一对应（[[java-coding-standards]] §8 SLF4J 占位符之上的金融分级要求）

---

## 4. 命名（金融补充）

- 枚举以 `Enum` 结尾；工具类以 `Util` 结尾
- MQ 消费者以 `Consumer` 结尾，生产者以 `Producer` 结尾
- **SCF 接口与实现类命名按 `IService` + `Service`**（实现类**不加 `Impl`**，否则 `scfProxyFactoryUtil.creat` 会掉坑，见 §0）

---

## 5. NPE 防护（强制）

- 返回类型为基本数据类型时，`return` 包装类型对象会自动拆箱，可能产生 NPE
- `equals` 调用方不能为 null（用常量或确定有值的对象在左，见 [[java-coding-standards]]）
- 集合元素即使 `isNotEmpty`，取出的元素也可能为 null
- 远程调用返回对象一律做非空判断
- 禁止 `obj.getA().getB().getC()` 级联调用（易产生 NPE）

---

## 6. 禁用项（强制）

- 老工程 `GsonUtil.fromJson` 禁止再使用（有 bug），用公司架构的 `JsonUtil`
- 分布式 id 禁止用 `com.bj58.idc` 包（有 bug），必须用 `com.bj58.zhuanzhuan.idc.ZZIdcClient`
- `org.apache.commons.lang3.tuple.ImmutablePair` / `ImmutableTriple` **禁止用于 RPC 响应参数**（内部方法返回多值可用）

---

## 7. 数据源与 ORM（推荐）

- 单服务配置主从数据源：读走从库，写和事务走主库
- 数据库访问统一用 **MyBatis-Plus**，特殊情况可通过注解写在 mapper 层
- `@TableName` / `@TableField` 等 MyBatis-Plus 注解仅限 DO 层，禁止出现在 contract 模块

---

## 8. SQL 规范（强制）

- 能在业务代码解决的逻辑禁止联合查询、子查询；特殊情况最多两张表关联，按查询条件有选择性关联
- 代码中**禁止子查询**
- 更新语句无固定条件时，代码层须严格校验条件参数
- 查询语句无固定条件时，须加 `limit` 兜底，避免扫表
- 高风险业务 SQL 单独配置、固定条件；更新操作必须更新时间及操作人
- 涉及状态变更的 SQL，须加原状态值作为条件，避免状态错误扭转

---

## 9. 事务规范

- 【推荐】尽量减少事务方法的业务处理逻辑，缩小事务范围
- 【推荐】能不用事务就不用，避免影响数据库 QPS
- 【强制】事务中不能有复杂业务逻辑和远程（RPC / HTTP）调用
- 【推荐】注解方式严禁用到接口、类上（只用于方法）

---

## 10. 数据库设计（强制）

- 所有表禁止添加与当前表非直接相关字段（如订单表加入审核结果）
- 同一字段在不同表必须同类型、同长度（如 `order_no` 在所有表都是 `varchar(64)`）
- 字段必须见名知意；枚举类型字段必须指明所对应含义
- 金额字段统一为**分**；枚举类型定义英文字符串、见名知意、**禁止用数字**
- 是否类型固定用 `yes` / `no`（基础组件 starter 已提供是否枚举，禁止单独新增）
- 用内部业务表主键作其他表的业务虚拟外键（如租赁库存操作日志用库存 ID，而非 SKU ID）

---

## 11. 安全（强制）

- 隶属用户个人的页面/功能必须做权限控制校验（`@ZZMethod` 接口需登录权限时 `publicAccess=false`）
- 用户输入参数做有效性校验（如 `pageSize` 校验不能大于阈值，防内存溢出）
- 触发短信/OCR/人脸等的操作须防重复无效调用（验证码校验、次数限制，防攻击）

---

## 违规速查

| 错误写法 | 正确写法 |
|----------|----------|
| `Map<String,Object>` 作接口入参 | 定义对象继承 `FinanceBizBaseReq` |
| 接口返回 `null` | 返回 `ZZOpenScfBaseResult` |
| 两层 if-else 嵌套 | 卫语句 / 策略模式 |
| `GsonUtil.fromJson(...)` | `JsonUtil`（架构封装） |
| `com.bj58.idc` 生成 id | `ZZIdcClient` |
| `ImmutablePair` 作 RPC 响应 | 定义响应对象 |
| SCF 实现类 `XxxServiceImpl` | `XxxService`（不加 Impl） |
| 金额字段 `元` / 枚举用数字 | 金额用分 / 枚举用英文字符串 |
| SQL 子查询 / 三表联查 | 业务代码拆解，最多两表关联 |

