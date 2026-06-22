---
name: zhuanzhuan-coding-standards
description: "转转研发中心通用编码规范（阿里黄山版之上的转转专属约定），叠加在 coding-standards-common + java-coding-standards 之上、finance-coding-standards 之下。Use when writing/reviewing/modifying 转转任意 Java 后端服务代码（SCF/WF/zzjava 工程）。覆盖 RPC 用 ApiResult 包装 + ApiException、ErrorCode 五位错误码枚举、Contract 实体 toString + DesensitizeUtil 脱敏、zzarch-common 工具优先（禁造轮子）、JsonUtil 用 Jackson 禁 FastJson、标准 contract/service 双模块工程结构 + maven 坐标规则、序列化优选 hessian2、long 转前端用 string、对象转换 MapStruct、日志 spring-boot-starter-log4j2 + slf4j 排冲突。金融技术部代码在本层之上再叠加 finance-coding-standards（部门条款优先）。"
---

# 转转研发中心通用编码规范（黄山版之上的转转专属约定）

> **优先级链路（冲突时覆盖顺序）：金融技术部（最高） → 转转研发中心通用（本文件） → caseflow 自有 → 阿里黄山版通用底。**
>
> 通用 7 条铁律见 [[coding-standards-common]]；阿里黄山版 Java 独占条款见 [[java-coding-standards]]；金融技术部独占条款见 [[finance-coding-standards]]。
>
> 触发顺序：`coding-standards-common` → `java-coding-standards` → `zhuanzhuan-coding-standards`（本文件）→ 金融场景再叠加 `finance-coding-standards`。

---

## 1. RPC 返回与异常（强制）

- RPC 服务返回值统一用架构部包装实体 `com.bj58.zhuanzhuan.arch.common.api.ApiResult`
- RPC 调用异常**优先返回已知错误码 + 错误信息**，而非跨服务抛异常
- 确需跨服务抛异常时，用 `com.bj58.zhuanzhuan.arch.common.api.ApiException`
- RPC 方法的返回值和参数**必须用包装数据类型**（`Integer`/`Long` 等），以区分 0 和 null 的不同语义
- RPC 接口入参用最简形式，避免模糊歧义；可选字段须详细注释说明
- Contract 返回值用明确类型（如 `User`），避免 `Object` 这类宽泛类型（防反序列化异常）

---

## 2. ErrorCode 错误码（推荐）

- Contract 中自定义 `ErrorCode` 枚举，作为错误码 + 错误信息的统一定义，填充 `ApiResult`
- 错误码为字符串类型，共 5 位：**错误来源（1 位）+ 四位数字编号**
- 来源前缀：`-1` 用户端错误（参数错误/版本过低/支付超时）、`-2` 当前系统错误（业务逻辑/健壮性）、`-3` 第三方服务错误（CDN/消息投递）
- 四位编号 0001~9999，大类之间步长预留 100
- **错误码不能直接输出给用户**：堆栈 / 错误信息 / 错误码 / 用户提示是互相转义的整体，勿越俎代庖

```java
public enum ErrorCode {
    PARAM_LACK(-10001, "缺少必要的参数"),
    NO_RECORD(-20001, "查询不到数据"),
    SERVICE_404(-30001, "第三方服务不可用"),
    ;
    private final Integer code;
    private final String msg;
    ErrorCode(Integer code, String msg) { this.code = code; this.msg = msg; }
    public Integer code() { return code; }
    public String msg() { return msg; }
}
```

---

## 3. Contract 脱敏（强制）

- Contract 中实体 Bean **必须实现 `toString()`**（Lombok 亦可），便于使用方打日志
- 手机号、银行卡、身份证号等敏感信息必须脱敏，用 `com.bj58.zhuanzhuan.zzarch.common.util.DesensitizeUtil`
- 推荐用架构部 `apt-common` 自动生成 `toString()`，敏感字段加 `@Desensitize` 注解
- 转 JSON 脱敏需求（如大数据日志收集）用 `JsonUtil.object2DesensitizeString`（对 `@Desensitize` 字段脱敏）

```java
public class User {
    private Long id;
    @Desensitize
    private String mobile;
}
// logger.info("user={}", user); → user=User[id=1, mobile=135****5555]
```

---

## 4. 工具包与三方库（推荐）

- **优先用架构部 zzarch-common**，编码前先查是否已有封装，禁止重复造轮子。通过 zzsuper-pom 引入（无需单独声明依赖）
- 常用工具：`ApplicationUtil`（应用类型/服务名）、`HttpClientUtil`（带连接池 HTTP）、`JsonUtil`（Jackson）、`SystemEnvUtil`（环境信息）、`WxmsgUtil`（企微告警）、`DesensitizeUtil`（脱敏）、`HolidayUtil`、`CmdbUtil` 等
- JSON 工具用 **Jackson**（`JsonUtil`），**禁用 FastJson**
- HTTP 客户端架构部工具不满足时，用 Apache `HttpClient` / `PoolingHttpClientConnectionManager`
- 对象类型转换用 **MapStruct**；getter/setter/toString 用 **Lombok**

---

## 5. 序列化与数据类型（强制）

- 序列化**优选 hessian2**，尽量避免 SCF 序列化
- `long` / `Long` 输出到前端的 JSON **须用 String 代替**（避免 JS 精度丢失）
- 任何货币金额以最小货币单位 + 长整型存储（与 [[finance-coding-standards]] 金额用分一致）

---

## 6. 标准工程结构（强制）

- 转转工程标准 contract / service 双模块（SIC 脚手架生成）：

```text
demopro
├── service      # 必须包含：业务实现
│   ├── src
│   └── pom.xml
├── contract     # 对外契约：RPC 接口 + Request/Response DTO
│   ├── src
│   └── pom.xml
├── pom.xml      # 项目 pom，定义 modules
├── README.md
└── .gitignore   # 统一用架构提供的模板，避免提交无用文件
```

- **contract 模块约束**：只允许定义 RPC 接口和 DTO，**禁止 Spring 注解**；**禁止用枚举**（不可变常量枚举除外）；入参/出参必须封装为 Request/Response 实体；修改后 `mvn clean deploy` 发布并更新下游依赖版本
- maven 坐标规则：项目 artifactId 为项目名标识，子模块为 `{项目名}.{模块名}`（如 `demopro.service`、`demopro.contract`），groupId 用 `com.zhuanzhuan.xx`
- 除标准目录外不要向 git 提交任何文件，`.gitignore` 统一用架构模板

---

## 7. 日志框架（强制）

- 上层 API 用 **slf4j-api**，底层实现统一 **log4j2**，强烈推荐引 `spring-boot-starter-log4j2`（zzsuper-pom 已指定版本）统一管理
- **必须排除冲突的日志实现与桥接**：`slf4j-log4j12`、`log4j-1.x`、`logback-core`/`logback-classic`、`slf4j-simple`、`log4j-to-slf4j` 等（pom 里 `exclusion`），否则 slf4j 编译期随机绑定导致配置失效甚至启动失败
- 公开 jar 包只引 slf4j-api，不引任何日志实现/配置（交使用方配置），自测可引 `slf4j-simple` 且 `scope=test`
- log4j2.xml 用架构封装组件；线上用 INFO/WARN/ERROR 三级、线下加 DEBUG
- Location 信息（`%C`/`%M`/`%L`）严重影响性能，高吞吐场景去掉或 `includeLocation="false"`
- 日志占位符与填充变量一一对应；异常用 error 级别且带堆栈（与 [[java-coding-standards]] SLF4J 条款一致）

---

## 8. 其他转转约定

- 内网权限控制用公司统一权限系统；前台页面接口用 openentry 对接
- 写操作接口实现幂等；接口做充分入参校验（与 [[finance-coding-standards]] JSR 校验一致）
- 列表查询 `pageNum`/`pageSize` 须有默认值且限上限（如 `pageSize ≤ 50`），防内存溢出
- Excel 上传导出用 zzmedia 文件存储服务；下载服务机器单独分组隔离
- 命名补充：枚举 `Enum` 结尾、工具类 `Util` 结尾、MQ 消费者 `Consumer` / 生产者 `Producer`（与 [[finance-coding-standards]] 一致）

---

## 违规速查

| 错误写法 | 正确写法 |
|----------|----------|
| RPC 直接 `throw new RuntimeException` 跨服务 | 返回 `ApiResult` + ErrorCode，或抛 `ApiException` |
| RPC 出参用 `int`/`long` 基本类型 | 用 `Integer`/`Long` 包装类型 |
| Contract 实体不脱敏直接打日志 | `@Desensitize` + `DesensitizeUtil` |
| 用 FastJson | 用 `JsonUtil`（Jackson） |
| 自己写 HTTP/JSON 工具 | 先查 zzarch-common |
| `Long` id 直接给前端 | 转 String 输出 |
| contract 模块加 `@Service` 注解 | contract 只放接口 + DTO，无 Spring 注解 |
| pom 同时引 logback + log4j2 | 排除冲突，统一 log4j2 |

