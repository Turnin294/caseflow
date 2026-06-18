# 反模式案例库

> 把"AI / 团队踩过的坑"沉淀成可查询的案例库,让后来人(包括 AI)在遇到类似场景时能直接引用真实案例,而不是只靠抽象规则。
>
> **格式约定**:每个案例固定 5 段——现象 / 根因 / 触发规则的反例 / 对应正确做法 / 关联 skill。新增案例追加到对应分类下,不删旧案例(历史教训保留)。

## 索引

- [A. AI 行为反模式](#a-ai-行为反模式) — AI 写代码 / 写文档时的系统性坏习惯
- [B. 架构反模式](#b-架构反模式) — 业务代码组织结构反模式
- [C. 编码反模式](#c-编码反模式) — 函数 / 命名 / 注释 / 异常等代码层反模式
- [D. 流程反模式](#d-流程反模式) — 设计 / 提交 / 沉淀流程反模式

---

## A. AI 行为反模式

### A1. 沿袭存量文件语言写注释

- **现象**:中文沟通会话里,AI 编辑英文注释为主的存量文件时,新增注释仍然用英文。
- **根因**:旧规则 `coding-standards-common §5.0` 留了"存量文件保持一致"的退路,被 AI 用作"沿袭即合规"的借口。
- **反例**:用户全程中文沟通,AI 在 `OrderService.java` 文件里追加 `// validate refund amount before processing` 而不是 `// 退款前校验金额`。
- **正确做法**:沟通语言一票否决——中文沟通新增注释一律中文,接受单文件中英混杂作为过渡期。
- **关联 skill**:`coding-standards-common` §5.0
- **历史 commit**:`ca27694` (2026-05-09 规则方向反转)

### A2. 把新业务动作惯性追加到 god service

- **现象**:`OrderService` 已有 `refund` / `cancel` / `reject` 三个 public 方法,AI 要加 `reverseCheckout`(反结账)时,直接当作第 4 个 public 方法塞进 `OrderService`。
- **根因**:旧规则只兜底"巨型方法 / 旧骨架文件"(行数 > 500),AI 看到 200-300 行的 service 不命中阈值就放行。AI 默认偏好"在既有容器里继续装",阻力最小。
- **反例**:
  ```java
  class OrderService {
      public void refund(...) { ... }
      public void cancel(...) { ... }
      public void reject(...) { ... }
      public void reverseCheckout(...) { /* 80 行新逻辑 */ }  // ❌
  }
  ```
- **正确做法**:新业务分支必须建独立 `ReverseCheckoutService`,调用方直接注入新 service;若必须保留统一入口,`OrderService` 只能 1 行 delegate。
- **关联 skill**:`architecture-ddd-lite-fullstack`「Service 业务动作扩展铁律」
- **历史 commit**:`c41fe40` → `067276e`(T1-T6 阈值反转为零退路铁律)

### A3. 用"同分支变种"为由把方法塞回 god service

- **现象**:AI 加 `partialRefund` 时声称"和 `refund` 共享退款状态机所以可以放 `OrderService`"。
- **根因**:中间态规则曾允许"同分支参数化变种"作为唯一例外。AI 把"共享状态机"当成合法借口,即使既有方法本身在 god service。
- **反例**:OrderService 已有 `refund`,AI 加 `partialRefund` 后仍然两个都留在 OrderService。
- **正确做法**:同分支变种也不进 god service——本次扩展就是把既有 `refund` + 新增 `partialRefund` 一并迁出到 `RefundService` 的契机(strangler 模式)。
- **关联 skill**:`architecture-ddd-lite-fullstack`「Service 业务动作扩展铁律」
- **历史 commit**:`b28d335`

### A4. 设计未确认就直接改代码

- **现象**:用户说"帮我改一下这段代码",AI 不触发 `design-doc-required`,直接开始 Edit/Write。
- **根因**:`design-doc-required` 触发条件早期写得不够 BLOCKING,AI 默认把"改代码"理解为已经明确的工程任务,跳过设计阶段。
- **反例**:用户「这个方法的退款金额算错了,改一下」→ AI 直接 Edit。
- **正确做法**:任何源码 Edit/Write 之前必须先经 `design-doc-required`(BLOCKING),哪怕用户说"只是改一下"。bug 修复也要有简化版设计文档。
- **关联 skill**:`design-doc-required`
- **历史 commit**:多次强化触发条件,见 `design-doc-required/SKILL.md` 触发清单

### A5. 注释里堆变更日志

- **现象**:AI 修 bug 时在函数头加 `// [BUGFIX 2026-05-12] 修复退款金额计算错误,原来用 amount 现在用 amount - tax`。
- **根因**:AI 训练数据里有大量"代码注释包含变更历史"的样本,默认习得这种模式。
- **反例**:函数头出现 `[REWRITTEN 日期]`、`[DEPRECATED]`、`[ADDED v1.2]`、设计文档第几节引用、旧实现 1/2/3 步骤等。
  - **真实案例 2026-05-29(korepos hotfix)**:AI 给新增的 `migrateToVersion15` 函数写了 11 行 doc comment 讲"v10 失败 / v14 漏补 / refund_confirm_service catch-all 兜底 / UI 弹退款失败",本应在 commit body 承载的全链路 RCA 叙事被塞进了源码注释。用户纠正后简化为 1 行 `/// 退款依赖字段/表兜底:补 ...`。**违规链路根因**:AI 没自动触发 `bugfix-coding-style` / `coding-standards-common`(CLAUDE.md 已声明 bug 修复 / 任何源码改动**必须**触发),沿袭了 `refund_confirm_service.dart` 里满地的 `// [ADDED 2026-04-28]` / `// [MODIFIED v11]` 旧风格(v1.17 之前的写法)。
  - **真实案例 2026-05-29(refund_confirm_service 私有方法 dartdoc)**:私有方法 `_validateMethodsAmountSum` 上 AI 写了 12 行 dartdoc——前 2 行"校验 sum == refundAmount,容差 0.005"是正确职责描述,**后 10 行**全是"前端契约 / 早期版本曾要求 / 现已统一为 / 再加会双计"的契约演变史。当前职责只需要 1-2 行,旧契约 vs 新契约的迁移叙事属于 commit body / bug doc。用户原话:"代码内部不需要一堆废话注释 / 一堆分化注释主要说明函数能力和参数就行"。**判定准绳**:私有方法的 dartdoc 不是公开接口契约,函数名 + 1-2 行职责就够;公开接口方法才需要写参数 / 返回 / 异常的完整契约说明。
  - **真实案例 2026-05-29(refund_confirm_service 行内 5 行 WHY)**:`if (cancelBridgeServiceFeeAmount != null)` 之前堆了 5 行行内注释讲"cancel 桥接路径 / 联台按 scaleRatio 缩 / confirm 兼容路径没有算价权威 / 否则 refund_order / refund_bill 上服务费字段全 0 / 与 order_item_payment_allocate 维度 income_refund_service_fee_amount 口径不一致 / UI 部分退款入口不走本分支"。§5.3 行内注释**硬阈值 1 行**,5 行 = 4 行该删。要么压缩成 1 行 WHY,要么完全删掉让代码 + commit body / bug doc 自承载。
  - **真实案例 2026-05-29(korepos refund/backendv2/service 存量包)**:`lib/features/refund/backendv2/service` 下多处 service/internal 类把设计文档塞进 dartdoc:如 `order_status_resolver_service.dart` 注释约 47.7%、`refund_tip_policy_service.dart` 类头 60+ 行讲关键契约 / SQL 数据源选型 / 复合场景推演、`refund_amount_guard_service.dart` 方法头逐步复述算法、`cancel_refund_planner.dart` 写"新增订单类型时 1/2/3 怎么做"维护指南。问题不是单条 `[ADDED]` 标记,而是**存量源码注释承担设计文档 + 迁移史 + 调试备忘**。正确处理应触发 `comment-cleanup`:逐条 Read,把当前职责/非显然 WHY 压成最短表达,函数体内除核心块外默认删,设计史和未来演进迁到 design doc / commit body。
- **正确做法**:源码只描述**当前正确**逻辑,变更原因 / 旧实现写进 commit body 或 design doc / bug doc;复杂逻辑用 1-2 行 WHY 注释解释 "why this code now",不写 "how we got here"。
- **关联 skill**:`bugfix-coding-style`、`coding-standards-common` §5.4
- **历史 commit**:`9e12fc1`(方向反转)

### A6. 在 focused service 内部手写横切

- **现象**:`RefundService.refund()` 方法第一行 `log.info(...)`,然后 `permissionCheck(...)`,然后 `auditService.record(...)`,然后才是业务逻辑;每个 focused service 都重复一遍。
- **根因**:AI 不清楚"横切关注点应该走 AOP / 中间件 / 装饰器统一注入",默认按"业务方法包含所有相关动作"的线性思维写。
- **反例**:每个 focused service 方法体里前 3 行都是 log / permission / audit 调用。
- **正确做法**:横切由 `@Transactional` / `@PreAuthorize` / `@Audited` 等注解 + AOP,或 FastAPI `Depends`,或 Shelf middleware 统一注入;focused service 只写业务逻辑。
- **关联 skill**:`architecture-ddd-lite-fullstack`「横切关注点不计入 god service 判定」
- **历史 commit**:`333e4f9`

---

## B. 架构反模式

### B1. Controller 直接连续调用多个 focused service

- **现象**:`OrderController.approveAndRefund(req)` 方法里依次调用 `cancelService.cancel(req)` 和 `refundService.refund(req)`,事务边界不清,失败补偿无处归属。
- **根因**:focused service 拆出来之后,跨分支编排逻辑无处安放,AI 默认把它放在调用方(Controller / UseCase / 另一个 service)里。
- **反例**:
  ```java
  class OrderController {
      public void approveAndRefund(Request req) {
          cancelService.cancel(req);   // ❌ 编排在 Controller
          refundService.refund(req);   // ❌ 事务边界不清
      }
  }
  ```
- **正确做法**:建独立 `ApproveAndRefundOrchestrator`,内部只编排(顺序 / `@Transactional` / 补偿动作);Controller 注入 Orchestrator 调用一行。
- **关联 skill**:`architecture-ddd-lite-fullstack`「跨分支编排」
- **历史 commit**:`333e4f9`

### B2. 一个 @Transactional 方法同时修改多个聚合根

- **现象**:`createOrder()` 方法用 `@Transactional` 包,内部同事务修改 `Order` 表 + `Inventory` 表 + `Wallet` 表。
- **根因**:开发者把"事务一致性"等同于"业务原子性",没有意识到跨聚合事务会牺牲扩展性和数据一致性。
- **反例**:
  ```java
  @Transactional
  public void createOrder(req) {
      orderRepo.save(order);
      inventoryRepo.deduct(items);   // ❌ 跨聚合
      walletRepo.charge(amount);     // ❌ 跨聚合
  }
  ```
- **正确做法**:事务内只改一个聚合根(Order),其它聚合通过 `Domain Event`(`OrderCreatedEvent`)+ 异步订阅消费(Inventory / Wallet 各自的 service 监听);跨聚合复合动作走 Saga。
- **关联 skill**:`architecture-ddd-lite-fullstack`「聚合边界与事务一致性」
- **历史 commit**:`333e4f9`

### B3. service 命名混用 XxxService / XxxUseCase / XxxHandler

- **现象**:同一项目里 `RefundService` / `CancelUseCase` / `ReverseCheckoutHandler` 三种命名风格并存。
- **根因**:不同人 / 不同时期参考了不同流派(Spring 习惯 / Clean Architecture / CQRS),没有项目级统一约定。
- **反例**:同一 `application/` 目录下 `RefundService.java` + `CancelUseCase.java` + `ReverseCheckoutHandler.java`。
- **正确做法**:项目级选定一种命名贯彻,默认 `XxxService`(Java/Spring 主流);多语言项目也建议全栈选同一种,而不是按语言切换。
- **关联 skill**:`architecture-ddd-lite-fullstack`「服务命名 taxonomy」
- **历史 commit**:`333e4f9`

### B4. 把多个 SKILL/规则塞到一个 god skill 里

- **现象**:korepos-backend-service(已迁至 kpay-daily-plugin)单 skill 曾达 2373 行,远超其它 skill 平均 350 行;新规则不停往里加,后续维护越来越难。
- **根因**:遇到"项目专属的复杂规则集"时,默认全塞进单个 skill 文件,不考虑拆分模板 / 拆 step 子文档。
- **反例**:`skills/korepos-backend-service/SKILL.md` 包含 Step 1(编辑前自检)+ Step 2(service 实现)+ Step 3(DAO/DTO)+ 各类强约束,全部在一个文件里。
- **正确做法**:按 step 或主题拆 sub-SKILL.md 或拆模板文件,主 SKILL.md 只做路由 / 索引。**注**:本案例当前作为"已知技术债",项目专用 skill 的 trade-off 是可接受的;非项目专用 skill 严禁这样组织。
- **关联 skill**:korepos-backend-service(已迁至 kpay-daily-plugin;本案例)
- **历史 commit**:plugin 评审 H5(用户明确保留)

---

## C. 编码反模式

### C1. 函数体超过 80 行

- **现象**:单个方法体 200+ 行,职责混杂(参数适配 + 校验 + SQL + 业务规则 + 日志)。
- **根因**:AI 默认线性思维,没有主动拆步骤的反射;开发者也常常"写着写着就长了"。
- **正确做法**:按业务步骤拆 `_xxxStep` 私有方法,主方法只做编排 + 事务 + 日志。函数体硬阈值 80 行。
- **关联 skill**:`coding-standards-common` §2

### C2. 业务数字裸字面量

- **现象**:`if (state == 3) { ... }` / `if (item_type == 1) { ... }` 等裸数字判断散落各处。
- **根因**:开发图省事直接对照数据库设计写数字;AI 也常按字面量映射不做枚举抽象。
- **正确做法**:任何与 DB 字段值 / 协议码 / 状态机绑定的数字必须用枚举类引用,如 `if (state == OrderState.CANCELLED.getValue())`。
- **关联 skill**:`coding-standards-common` §4「零魔法值」

### C3. catch 空吞异常

- **现象**:`try { ... } catch (Exception e) { }` 或 `catch (Exception e) { log.error(e.getMessage()); }`(只打 message 不打堆栈)。
- **根因**:AI 看到 catch 块默认要"写点什么",但又不想抛,选择空吞或只打 message。
- **正确做法**:`catch` 必须处理或显式往上抛;日志带完整堆栈 + 现场参数。
- **关联 skill**:`coding-standards-common` §6「异常不静默」

### C4. 函数内按业务类型 if-else 堆叠业务分流

- **现象**:同一 public 方法体内用 `if orderType == A then ... else if orderType == B then ...` 堆叠多种业务类型的处理逻辑,两种业务的校验 / 状态机 / 下游 / 补偿都黏在一起。1-100 期(成熟项目扩展迭代期)特别高发——加新订单类型时阻力最小的方式就是"在已有方法里 +一个 else if",但这会让两种业务定位的逻辑互相波及,变更无法独立测试。
- **根因**:AI 默认偏好"在既有容器里继续装",与 service 级 god service 反模式(A2 / A3)同源,但表现在函数内部。`coding-standards-common §2 函数原子`只管 80 行 / 4 参数 / 3 嵌套硬阈值,语义维度上"按业务类型堆叠"在 v1.26.2 之前完全未覆盖,AI 没有规则可援引来拒绝这种写法。
- **反例**(Java):
  ```java
  class OrderService {
      public void handle(OrderRequest req) {
          if (req.type == OrderType.NORMAL) { /* 40 行 */ }
          else if (req.type == OrderType.PRESALE) { /* 50 行,独立状态机 */ }  // ❌ 业务定位已经不同
      }
  }
  ```
- **反例**(Dart - korepos 场景):handler 内按 `itemType` 分流堂食 / 外卖,每个分支 50+ 行,触达通知和包装策略完全不同——业务定位是两类独立动作,不该共享一个 handler 方法。
- **正确做法**:先用「业务定位 vs 代码相似度判定锚点表」判分支差异本质(PRD 视角 / 状态机 / 下游 / 校验 / 补偿 / 团队 6 个信号,命中 ≥3 个倾向阶梯 2)。
  - 同业务定位(同状态机 / 同补偿)→ **阶梯 1**:抽 `_handleTypeA()` / `_handleTypeB()` 私有方法,主方法只做派发。
  - 不同业务定位 → **阶梯 2**:升级 service 级,建 `NormalOrderService` / `PresaleOrderService`,共享逻辑沉到原子能力层。
  - **判定锚点是业务定位而非代码相似度**——长得像但业务定位不同就要拆。
- **关联 skill**:`architecture-ddd-lite-fullstack` 「函数级业务场景分流」节、`coding-standards-common §2.5`
- **历史 commit**:1.26.3 引入(本案例是 service 级 god service 反模式 A2 / A3 在函数粒度的下钻)

---

## D. 流程反模式

### D1. 规则方向反转后不写 dev-log

- **现象**:本会话连续 5 次规则方向反转,只在 commit body 写明,没有 dev-log 条目。后续维护者看 git log 只能看到"reverse-X"提交,不知道为什么反转 / 反转前是什么 / 哪些其它规则受影响。
- **根因**:"决策型变更必写 dev-log"被 AI 自己绕过——通常理由是"commit body 已经写清楚了"。
- **反例**:连续 4 次方向反转(注释语言豁免取消 / Service 业务动作扩展 / 同分支变种豁免取消 / Python-Dart 三栈拉齐)都没有 dev-log。
- **正确做法**:任何规则方向反转、跨 skill 链路变化、重大原则沉淀必写 dev-log,即使 commit body 已经详细;commit body 是"本次为什么改",dev-log 是"这条规则为什么存在"。
- **关联 skill**:`dev-log`
- **历史 commit**:`abec8f8`(本次补回 2026-05-12.md)

### D2. 改 1 个 skill 要同步 3 处文件,遗漏导致漂移

- **现象**:每次改 skill 描述,要同步 CLAUDE.md / AGENTS.md / README.md 三处索引,实际维护中经常遗漏 1-2 处,造成三个文件描述不一致。
- **根因**:没有自动化同步机制,纯靠人工记忆 + 文档约束;但 AI 协作时常常只改其中一处。
- **反例**:CLAUDE.md 与 AGENTS.md 漂移 5+ 行(不只是 Claude/Codex 字符差异,含真正的规则 delta)。
- **正确做法**:CLAUDE.md 定为 canonical source,通过 `scripts/sync-agents.js` 自动派生 AGENTS.md;README.md 不再重复完整 skill 表,只保留分组速记并指向 CLAUDE.md。CI 校验 `sync-agents.js --check`。
- **关联 skill**:plugin 自身基础设施
- **历史 commit**:`9d3c1d7`

### D3. 跨 skill 引用失效无人发现

- **现象**:SKILL.md A 写"详见 `skill-B` 「章节 X」节",但 skill-B 后来把章节 X 改名了,引用变成 dangling link,AI 读到时找不到对应内容。
- **根因**:跨引用是字符串字面量,没有结构化锚点,被引文件改章节名后引用方无通知。
- **正确做法**:`scripts/check-cross-refs.js` 扫描所有引用,CI 校验;改章节名后跨引用同步更新。
- **关联 skill**:plugin 自身基础设施
- **历史 commit**:`abec8f8`

---

## 如何添加新案例

1. 把案例追加到对应分类(A/B/C/D)下,按编号顺序往后排
2. 严格按 5 段格式(现象 / 根因 / 反例 / 正确做法 / 关联 skill)写
3. 关联到至少 1 个 skill,如果触发了规则方向反转,链接到对应 dev-log 条目
4. 不删旧案例——历史教训保留,旧规则版本号变了也保留(可标注"已通过 1.24.5 规则反转修复")
5. 案例数 > 30 时考虑按"业务领域"再细分(订单 / 支付 / 退款 / 库存等)

## 给 AI 的使用建议

- **写代码前**:遇到熟悉的场景(扩展既有 service / 写新业务动作 / 跨聚合操作 / 修 bug 注释)先扫一遍本库,看是否命中已知反模式
- **遇到用户提出的方案不太对劲时**:在本库找类似案例引用,而不是只引用抽象规则
- **完成代码后**:回扫一遍本库,确认本次没踩 D 类流程反模式(dev-log / 索引同步 / 跨引用)
