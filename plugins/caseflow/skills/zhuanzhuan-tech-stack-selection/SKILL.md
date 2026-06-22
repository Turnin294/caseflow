---
name: zhuanzhuan-tech-stack-selection
description: "转转技术栈选型决策（编码/设计时该用哪个自研组件、别造什么轮子）。Use when 做技术方案设计、架构选型、或写代码遇到「异步解耦 / 分布式锁 / 配置管理 / 定时任务 / 限流熔断 / 缓存 / RPC 调用 / HTTP 调用 / JSON / 文件存储」等需求时。核心是场景→组件决策表 + 反模式（别用 Redis 造锁→用 zzlock、别硬编码配置→用 Apollo、别自己轮询→用 ZZMQ、别 new Thread 定时→用 zzschedule、别造 HTTP/JSON 工具→用 zzarch-common）。具体组件 API 用法 delegate 到 mcp__arch-kb 知识库与各运维 skill（/scf /zzmq /apollo /zzschedule /prometheus /k8s），本 skill 不重复抄组件清单，只管「选型决策」这一层。"
---

# 转转技术栈选型决策

> **本 skill 只解决一件事：编码/设计时「这个场景该用哪个组件、别造什么轮子」。**
>
> 组件的具体 API 用法（SCF Provider 怎么写、ZZMQ 消费幂等怎么做等）不在这里——查 `mcp__arch-kb__query_knowledge_base` 知识库，或对应运维 skill（`/scf` `/zzmq` `/apollo` `/zzschedule` `/prometheus` `/k8s`）。
>
> 本 skill 与 [[zhuanzhuan-coding-standards]]（zzarch-common 工具优先）、[[zhuanzhuan-data-standards]]（Redis 用法）、[[architecture-ddd-lite-fullstack]]（分层）互补，不重复。

---

## 选型决策表（先查表，再动手）

| 需求场景 | 用转转组件 | 禁止的造轮子 |
|---------|-----------|-------------|
| 服务间同步调用 | **SCF**（contract 定义接口，返回 ApiResult） | 自己拉 HTTP/Feign 调内部服务 |
| 异步解耦 / 削峰 / 事件通知 | **ZZMQ**（RocketMQ，平台注册生产/消费组） | 自己轮询 DB、用 Redis List 当队列 |
| 分布式锁 | **zzlock**（etcd） | 用 Redis `SETNX` 自己造锁 |
| 配置管理 / 开关 / 灰度 | **Apollo**（按 namespace，热更新） | 硬编码常量、配置写死在代码/properties |
| 定时任务 | **zzschedule**（cron 平台配置） | `new Thread` / `ScheduledExecutorService` 自己跑 |
| 限流 / 熔断 / 降级 | **Sentinel** | 自己写计数器限流 |
| 缓存（高频热数据 QPS>5000） | **Redis（Lettuce）/ ZZ-KV** | 见 [[zhuanzhuan-data-standards]] §6 冷热分离 |
| 配置型多读 KV | **ZZ-KV** / Apollo | 大对象塞 Redis |
| HTTP 客户端（调外部） | **zzarch-common `HttpClientUtil`**（带连接池） | 裸 `HttpURLConnection`、自己建连接池 |
| JSON 序列化 | **zzarch-common `JsonUtil`**（Jackson） | FastJson、老 `GsonUtil.fromJson`（有 bug） |
| 分布式 ID | **`com.bj58.zhuanzhuan.idc.ZZIdcClient`** | `com.bj58.idc`（有 bug）、自己拼时间戳 |
| 文件上传 / 下载 | **zzmedia** | 自己存本地磁盘 / 塞 DB |
| 企微告警 / 群机器人 | **zzarch-common `WxmsgUtil`** | 自己拼企微 webhook |
| 数据脱敏 | **zzarch-common `DesensitizeUtil` / `@Desensitize`** | 自己写正则脱敏 |
| 对象转换 | **MapStruct** | 手写 getter/setter 搬运 |
| 监控指标 / 告警 | **Prometheus（计算型）/ AlertManager（非计算型）** | 增量告警直接走企微推送（禁止） |
| 日志 | **slf4j-api + log4j2**（spring-boot-starter-log4j2） | 直接用 logback/log4j API，见 [[zhuanzhuan-coding-standards]] §7 |

---

## 决策原则

1. **先查 zzarch-common 再写工具**：任何"通用工具"（HTTP/JSON/时间/环境/脱敏/告警）动手前先确认 zzarch-common 是否已有，禁止重复造轮子（见 [[zhuanzhuan-coding-standards]] §4）。
2. **基础设施能力一律用平台组件**：锁/队列/配置/定时/限流这些，转转都有成熟自研组件且在平台统一管理（注册、监控、降级）。自己造的轮子没有平台治理能力，线上出问题无法排查。
3. **方案设计阶段就标注选型**：写设计文档时（[[design-doc-required]]）涉及上述场景，明确写用哪个组件，而不是编码时临时拍。
4. **不确定 API 用法就查知识库**：选型定了之后，具体怎么接入查 `mcp__arch-kb__query_knowledge_base` 或对应运维 skill，不要凭记忆写。

---

## 反模式速查

| 反模式 | 正确做法 | 为什么 |
|--------|---------|--------|
| `redisTemplate.opsForValue().setIfAbsent(key, val)` 当分布式锁 | zzlock | Redis 锁无续租/防误删治理，etcd 锁有平台保障 |
| `@Scheduled(cron=...)` 写死在服务里 | zzschedule | 多实例重复执行、无法平台化触发/查日志 |
| 配置写 `application.properties` 改了要重启 | Apollo | Apollo 热更新、灰度、多环境 namespace |
| 业务表加 `status` 字段轮询扫"待处理" | ZZMQ | 轮询压 DB、延迟高，MQ 实时解耦 |
| 内部服务调用拼 `restTemplate.getForObject(内网URL)` | SCF | 绕过服务注册/限流/降级治理 |
| 自己 `new ThreadPoolExecutor` 跑异步还手动建 | 评估是否该走 ZZMQ；必须本地线程池见 [[java-coding-standards]] §6 | 异步解耦优先平台组件 |

---

## 配套 zz-harness 平台能力（选型定了去真操作）

> 本 skill 只管「选哪个组件」。选型定了之后，**查/改/排查这些组件的真实平台操作**用 zz-harness（`zzrd` 插件）的对应 skill——caseflow 负责决策、zz-harness 负责执行，脑/手分工。

| 选了组件 | 用 zz-harness skill | 能做什么 |
|---------|---------------------|---------|
| Apollo 配置 | `apollo` | 查/对比/创建/更新/发布配置项、查发布历史 |
| 分布式锁 zzlock | `zzlock` | 查锁状态/锁列表、排查锁超时/竞争/死锁 |
| ZZMQ 消息队列 | `zzmq` | 按 msgId 查消息、查消费组状态/消费堆积 |
| 定时任务 zzschedule | `zzschedule` | 查/搜任务、排查未触发/执行问题 |
| SCF 调用 | `scf` | srvmgr 查/申请/改调用关系、`zzcli scf invoke` 调用 |
| 新建 zzjava 工程 | `zzjava-init` | 初始化 blank/web/scf 标准脚手架 |

具体 API 用法仍可查 `mcp__arch-kb__query_knowledge_base` 知识库。
