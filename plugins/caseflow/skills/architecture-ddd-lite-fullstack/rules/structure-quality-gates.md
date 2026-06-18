# 结构质量门禁

> 子文档 of [architecture-ddd-lite-fullstack/SKILL.md](../SKILL.md)。
> 本文件覆盖编码前的结构质量门禁：清晰 / 易维护 / 低耦合 / 高内聚四原则 + 新代码落点决策 + Service 业务动作扩展铁律 + 跨分支编排 + 横切关注点豁免 + 禁止行为表。

所有业务代码在实现前必须满足以下结构质量要求。若无法满足，必须先调整设计或拆分实现，不能带着明显结构债继续编码。

## 代码结构清晰

- 文件、类、方法命名必须能表达业务意图，而不是技术动作堆叠。
- 一个文件只承载一个清晰职责；超过一个职责时拆分到 UseCase、Domain Rule、Repository 或 Adapter。
- 方法应围绕一个步骤或一个业务判断，复杂流程拆成有语义的私有方法或原子能力。
- 新增代码必须能从目录位置看出所属 feature、层级和责任边界。

## 易于维护

- 新逻辑必须有明确变更点，避免把多个不相关规则揉在同一个 if/else 或 switch 中。
- 未来新增同类规则时，应能通过新增策略、规则、原子能力或配置扩展，而不是修改多个分散位置。
- 对外契约、领域规则、技术适配必须分开，避免一个改动牵动 UI、DB、HTTP 和业务规则多处联动。
- 不为了一次性需求复制旧代码；若复用旧逻辑，应先判断是否需要提取公共能力。

## 低耦合

- 上层依赖抽象和业务语义，不依赖下层实现细节。
- 跨 feature 调用必须通过公开能力、Application Service、Repository 抽象或明确的端口，不直接 import 对方内部实现。
- DTO、Entity、ViewModel、DB Model 不得无边界混用；跨层传递时必须做转换或隔离。
- 外部系统、设备、DB、缓存、文件、HTTP Client 必须隔离在 Infrastructure / Adapter，不得渗透到 Domain / UI。

## 高内聚

- 同一业务能力的状态判断、金额计算、幂等规则、表操作约束应集中在同一能力边界内。
- 一个 Service / UseCase 围绕一个业务流程或能力，不把多个业务场景塞进同一个类。
- 通用原子能力集中沉淀，禁止多个页面、接口、UseCase 各自维护一份类似规则。
- 状态机、动作规范、表操作矩阵等核心业务模型优先集中表达，禁止散落在 UI 判断或临时 SQL 条件里。

## 新代码落点决策（扩展现有功能时不要在旧结构堆叠）

**默认原则：扩展现有能力时，新代码放到新结构（新 service / 新子门面 / 新原子能力）并暴露公开方法，旧代码只调用一行——不要在旧文件里就地堆叠新增逻辑。**

为什么这是默认默认行为而不是可选优化：

| 后果 | 在旧代码就地堆叠 | 新结构暴露 + 旧代码引用 |
|------|------------------|--------------------------|
| 旧文件污染面积 | 持续扩大（每次扩展 +N 行） | 每次只 +1 行调用 |
| 新代码是否符合目标态规范 | 跟旧代码同污染（裸 SQL / 内联决策门 / 巨型方法） | 一开始就符合（DAO 唯一容器 / 私有方法粒度 / 强类型） |
| 后续重构成本 | 新增的 N 行也要再迁一次 | 已经在目标态，无需再迁 |
| 可单元测试粒度 | 与旧巨型方法绑定，只能整体测 | 新方法独立可测 |
| 调用方迁移路径 | 旧代码删除前不能切换 | 新结构稳定后调用方可立刻切换 |

**触发场景（满足任一就必须按本原则落点）**：

- bug 修复需要新增 record 处理、字段映射、决策门或落库段
- 功能扩展要在已有 ~500 行以上的方法/类里追加分支
- 数据同步、事件订阅、状态机等链路要补齐字段、新事件、新副作用
- 即将动 SKILL 已识别为"历史巨型方法 / 待重构骨架"的旧代码
- **扩展既有 service:任何往多分支 god service(如 `OrderService` 已有 `refund/cancel/reject`)追加 public 业务方法的动作——不论是新业务分支(`reverseCheckout`)还是同分支变种(`partialRefund`)** —— 详见下面「Service 业务动作扩展铁律」专节,**god service 不加方法,每个分支去自己的 focused service**

**正确决策流程**（编码前必须走完）：

1. 这次新增逻辑是否独立可命名？（"持久化 X 数据" / "校验 Y 合法性" / "派发 Z 副作用"）
2. 是 → 在合适新结构暴露 public 方法（新 service / 子门面 / 原子能力）
3. 旧代码只在原有插入点改 1-3 行：`import` + 调用一行
4. 新方法内部按 SKILL 现行规范实现（分层 / 命名 / 私有方法粒度 / 强类型 / SQL 唯一容器等）
5. 新方法的 dartdoc / 类注释里说明"该段未来可独立替换 / 这是 strangler pattern 第 N 段"

**反模式（即使旧代码本来就乱也不允许）**：在 1500 行的历史方法中再加 95 行新逻辑、跟旧风格混在一起、SQL 内联、决策门 inline、字段名靠字符串 key——只因为"旧代码已经这样了我跟着抄"。这是把新代码的目标态成本一并计入未来重构债。

### Service 业务动作扩展铁律:**每个业务分支一个 focused service,任何新方法都不进 god service**

> **核心一句话**:扩展既有 service 时,**不允许往多分支 god service(如 `OrderService` 同时承载 `refund`/`cancel`/`reject`)里追加任何 public 业务方法**——无论新方法是新业务分支(`reverseCheckout`)还是既有分支的变种(`partialRefund`)。所有新方法必须落到**该分支自己的 focused sub-service** 里。
>
> 上一节「新代码落点决策」是通用兜底,适用所有"扩展旧代码"场景;本节是它在 service 层面的特化与下钻——**判定更硬、零退路**,因为 service 是被惯性追加最严重的容器,每一次"先在原 service 加一个"都会让下一次更难拒绝。

**核心原则**:

1. **每个业务分支聚焦到一个独立 service** —— `RefundService` 只管退款分支,`CancelService` 只管取消分支,`ReverseCheckoutService` 只管反结账分支。
2. **同一分支的所有方法都放在该分支自己的 service 内** —— `refund` + `partialRefund` 都属于退款分支,**两者都放在 `RefundService` 里**,作为该 service 的两个 public 方法(或参数化的同一方法);**不论原入口是不是 `OrderService`,都不该往 `OrderService` 里塞**。
3. **god service 只能做 1 行 delegate 入口** —— 若历史遗留的 `OrderService` 同时承载多个分支动作,新方法**一律**走新建/已有的 focused sub-service;原 `OrderService` 若需要保留统一入口,新方法只能 1 行 `xxxService.execute(req);`,**不允许在 `OrderService` 内写任何业务逻辑**。

**判断哪个分支:新增逻辑是否构成一个独立可命名的业务分支?**

判断"是新业务分支"的识别信号(命中任一即认定为独立分支):

| 信号 | 说明 / 举例 |
|------|-------------|
| 业务语义上是独立动作 | `refund` / `cancel` / `reject` / `reverseCheckout` 是 4 个独立分支 |
| 对应 UI / 流程图上一个独立动作节点 | 用户在前端可单独触发 / 业务流程图上独立的菱形或矩形 |
| 引入新状态机或新状态转换 | 反结账涉及账单状态机 ≠ 订单生命周期状态机 |
| 引入新下游依赖 | 新增对其它 service / 外部 HTTP / 新表的依赖 |
| 引入新事务边界 | 独立事务 / 补偿事务 / 不与原方法共事务 |
| 前置校验 / 权限规则 / 幂等键语义与既有方法不同 | "账单已结+今日内"≠"订单已支付" |

**变种的归属**:`refund` 与 `partialRefund` 共享同一状态机 + 同一下游 + 同一前置校验 → 属于**同一退款分支**,两者都进 `RefundService`,**不进** `OrderService`。

**新方法落点决策表**:

| 新方法是什么 | 已有该分支的 focused service 吗? | 落点 |
|-------------|------------------------------|------|
| 新业务分支(如反结账) | 没有 | **新建** `ReverseCheckoutService`,新方法作为其 public |
| 同一分支的变种(如 partialRefund) | 已有(如 `RefundService`) | 加进该 service,作为它的第 2 个 public 方法或参数化合并 |
| 同一分支的变种(如 partialRefund) | 没有,既有方法 `refund` 还在 god service | **新建** `RefundService`,把变种 + 既有方法**一并迁过去**;god service 内对应方法降级为 1 行 delegate(或彻底删掉让调用方直接注入) |

**正确形态 — 加反结账(新分支)**:

```text
[新建] features/billing/application/ReverseCheckoutService.java
        - public void execute(ReverseCheckoutRequest req) { ... }   // 唯一 public,内部拆 _xxxStep 私有方法
        - 自己注入 BillingDao / OrderDao / 状态机校验

[修改] 调用方(Controller / 上游 UseCase)直接注入 ReverseCheckoutService 调用;
        OrderService 不新增 public 方法。

[或者]  若必须保留 OrderService 作为统一入口:
        - OrderService 注入 ReverseCheckoutService;
        - OrderService 新方法只 1 行: `reverseCheckoutService.execute(req);`
        - 禁止把任何业务逻辑写在该 1 行方法里。
```

**正确形态 — 加 partialRefund(同分支变种,但既有 refund 还在 god service)**:

```text
[新建] features/refund/application/RefundService.java
        - public void refund(RefundRequest req) { ... }                  // 把既有 OrderService.refund 迁过来
        - public void partialRefund(PartialRefundRequest req) { ... }    // 新增的变种
        - (或 refactor 成参数化的单一 refund(RefundRequest req, RefundScope scope))

[修改] 调用方直接注入 RefundService;
        OrderService 中原 refund 方法降级为 1 行 delegate `refundService.refund(req)`,
        或彻底删掉,让调用方切到新 service。
```

**反模式 — 无任何例外**:

```java
// ❌ 反例 1:新业务分支塞进 god service
class OrderService {
    public void refund(...) { ... }
    public void cancel(...) { ... }
    public void reject(...) { ... }
    public void reverseCheckout(...) {  // ❌ 新业务分支 → 必须新建 ReverseCheckoutService
        // 任何业务逻辑都不允许
    }
}

// ❌ 反例 2:同分支变种也不能塞进 god service
class OrderService {
    public void refund(...) { ... }
    public void cancel(...) { ... }
    public void reject(...) { ... }
    public void partialRefund(...) {    // ❌ 即使共享退款状态机,也不放 god service
        // 应该把 refund + partialRefund 一起搬到 RefundService
    }
}
```

**自检两连问**(写第一行前必须答):

1. **"这个新方法属于哪个业务分支?"** — 用前面"识别信号"表认定。
2. **"这个分支有自己的 focused service 吗?"** —
   - 有 → 新方法进该 focused service,作为它的下一个 public 方法或参数化合并。
   - 没有,但既有方法散落在 god service → **新建该分支的 focused service**,把既有方法 + 新方法**一并迁过去**;god service 对应位置降级为 1 行 delegate 或删除。
   - 完全是新分支 → 新建该分支的 focused service,新方法作为它的首个 public。

**任何情况下都不允许往 god service 里加业务方法**——god service 最多保留 1 行 delegate 入口,且禁止写任何业务逻辑。

**常见自我说服话术 → 一律视为违规**:

- "反正只是加个开关 / 一个字段判断 / 几十行"
- "这个 service 才 200 行还没到巨型"
- "和 cancel 长得差不多,放一起也行"
- "先加进来,以后再拆"
- "建新文件太麻烦,审 PR 的人会觉得过度设计"
- "partialRefund 和 refund 共享状态机,所以可以放 OrderService" — **错**,共享状态机说明它们属于同一退款分支,**两者都应该在 `RefundService` 里**,而不是都留在 god service
- "把既有 refund 也迁出去太大动静,先把新方法塞进来" — strangler pattern 的目的就是逐步迁出,**这次扩展就是迁出契机**

以上任何一种,都是把"AI 惯性追加"包装成"合理判断"。**听到自己说这些话时直接停手,新建/复用 focused sub-service**。

**与既有规则的关系**:

- 通用「新代码落点决策」(上一节)兜底所有"扩展旧代码"场景;本节是它在 service 粒度的**硬化下钻**——零退路。
- `coding-standards-common §2 函数原子`(80 行硬阈值)在方法粒度限制单一方法体积;本节在 service 粒度限制每个 service 只服务一个业务分支。两者**正交**。
- `korepos-backend-service` 的"一接口一 service"是 Flutter backend 侧的强约束;本节是它在 Java/Spring + 通用全栈侧的对应规则,本质同向:**业务分支隔离 + god service 只做 delegate 入口**。

### 函数级业务场景分流:分支差异即拆分(不只是 service 级,函数级也要拆)

> **核心一句话**:函数内出现 `if orderType == A then ... else if orderType == B then ...` 这种「按业务类型 / 枚举值分流」的 ≥2 分支时,**先判定分支差异的本质,再决定拆到哪一级**——同业务定位拆函数内私有方法(阶梯 1),不同业务定位升级到 service 级(阶梯 2)。
>
> 上一节「Service 业务动作扩展铁律」管 **service 粒度**:每个业务分支一个 focused service。本节管**函数粒度 → service 粒度的判定阶梯**——AI 在 1-100 期最容易在已有 service 的某个 public 方法里"加个 else if 就好",这种「函数级堆叠」会让两种业务定位的逻辑黏死,未来变更相互波及、无法独立测试。

**核心原则**:函数内出现按业务类型 ≥2 分支时,**禁止在同一 public 方法体内堆叠所有分支的处理逻辑**。先判定分支差异本质,再决定拆分阶梯。

**两级拆分阶梯**(明确不要跳到最重的方案,也不要图省事停在最轻的):

| 阶梯 | 触发条件 | 拆分动作 | 落点 |
|------|---------|---------|------|
| **阶梯 1(函数级)** | 函数内按业务类型 if-else / switch 分流 ≥2 个分支,**但分支共享同一业务定位**(例如 `refund` 的全额 / 部分变种,共享同一状态机和补偿) | 抽 `_handleTypeA()` / `_handleTypeB()` 私有方法,主方法只做分流派发;或重构成参数化的单一方法 | 同一 service 内 |
| **阶梯 2(service 级)** | 分支差异本质是**不同业务定位**——A 订单 vs B 订单是 PRD / 业务概念上的不同业务实体,只是部分技术流程相似 | 升级到 service 级,按上一节「Service 业务动作扩展铁律」拆 `AService` / `BService1` | 不同 service(每个分支自己的 focused service) |

**业务定位 vs 代码相似度——判定锚点表**(命中 ≥3 个倾向阶梯 2 → 升级 service 级):

| 信号 | 阶梯 1 倾向(同业务定位) | 阶梯 2 倾向(不同业务定位) |
|------|-------------------------|---------------------------|
| PRD / 用户视角 | 同一动作的参数化变体 | 用户视角下是两种不同事 |
| 状态机 | 共享同一状态机和状态转换 | 各自有独立状态机 |
| 下游依赖 | 共享同一下游集合 | 引入新表 / 新外部依赖 |
| 校验 / 幂等键语义 | 完全相同或仅参数差 | 校验规则 / 幂等键语义不同 |
| 失败补偿 | 同一套补偿路径 | 各自独立的补偿语义 |
| 团队所属 | 同一团队同一迭代维护 | 不同团队 / 不同迭代单独演进 |

**判定准绳**:只看代码相似度("两段代码长得像")**不是**判定依据——长得像但业务定位不同就是阶梯 2;反过来,业务定位相同即使代码差异较大也归阶梯 1(参数化抽公共方法即可)。

**1-100 期反惯性提醒**:成熟项目扩展期 AI 最容易犯的错——看到 `OrderService.handleOrder()` 已经存在,加 B 订单时在里面 `else if (type == B)` 就完事了,而不是建 `BOrderService`。

**口诀**:写第一行前先答——"这是同一种事的不同形态,还是两种不同的事?"是后者就升级到 service 级,哪怕复用部分逻辑(共享部分沉到原子能力层,而不是塞进同一 public 方法)。

**Java 示例(一个反例 + 阶梯 1 + 阶梯 2)**:

```java
// ❌ 反例:函数内按业务类型堆叠 ≥2 分支
class OrderService {
    public void handle(OrderRequest req) {
        if (req.type == OrderType.NORMAL) {
            // 40 行:校验 + 占库存 + 支付 + 发货
        } else if (req.type == OrderType.PRESALE) {
            // 50 行:校验(含定金)+ 锁库存 + 分期支付 + 延期发货
        }
    }
}
```

**阶梯 1 重构**(若两种订单共享同一业务定位,只是流程参数差):

```java
// ✅ 阶梯 1:同 service 内拆私有方法,主方法只派发
class OrderService {
    public void handle(OrderRequest req) {
        switch (req.type) {
            case NORMAL  -> _handleNormal(req);
            case PRESALE -> _handlePresale(req);
        }
    }
    private void _handleNormal(OrderRequest req)  { /* 40 行 */ }
    private void _handlePresale(OrderRequest req) { /* 50 行 */ }
}
```

**阶梯 2 重构**(若预售是独立业务定位——独立状态机 / 独立 PRD 模块 / 独立团队):

```java
// ✅ 阶梯 2:升级到 service 级,每个业务定位一个 focused service
class NormalOrderService  { public void handle(NormalOrderRequest req)  { /* 40 行 */ } }
class PresaleOrderService { public void handle(PresaleOrderRequest req) { /* 50 行 */ } }

// 调用方按订单类型注入对应 service;或保留 OrderService 作为路由器,内部只 1 行 delegate:
class OrderService {
    public void handle(OrderRequest req) {
        switch (req.type) {
            case NORMAL  -> normalOrderService.handle(req.asNormal());     // 1 行 delegate
            case PRESALE -> presaleOrderService.handle(req.asPresale());   // 1 行 delegate
        }
        // 禁止在 OrderService 内写任何业务逻辑——它只能做派发
    }
}
```

**Dart 示例(对照 korepos 后端典型场景:handler 内按订单类型分流)**:

```dart
// ❌ 反例:handler 内按 itemType 堆叠堂食 / 外卖,业务定位完全不同
class OrderHandler {
  Future<Response> execute(OrderRequest req) async {
    if (req.itemType == ItemType.dineIn) {
      // 50 行:堂食流程(桌号绑定 + 厨房工单 + 桌台计费)
    } else if (req.itemType == ItemType.takeout) {
      // 60 行:外卖流程(配送员调度 + 打包工单 + 配送费计算)
      // 触达通知和包装策略完全不同
    }
  }
}
```

**阶梯 2 重构**(堂食 / 外卖在业务定位上是两类独立动作,触达 / 工单 / 计费规则都各自独立):

```dart
// ✅ 阶梯 2:拆独立 service,共享逻辑沉到原子能力层
class DineInOrderService {
  Future<void> execute(DineInOrderRequest req) async { /* 堂食业务 */ }
}
class TakeoutOrderService {
  Future<void> execute(TakeoutOrderRequest req) async { /* 外卖业务 */ }
}

// 共享的"金额计算 / 库存扣减"沉到 common/backend_infra/services/ 原子能力层,
// 与 korepos-backend-service 的「跨 feature 业务原子能力层」规则对齐——
// 而不是塞进同一个 handler 方法用 if-else 区分
```

**常见自我说服话术 → 一律视为违规**(与上一节 god service 自我说服话术清单同模式,函数级新增):

- "只是多一个 if 分支,不用拆" —— 错,业务定位不同即使一个分支也要拆
- "B 流程 80% 和 A 一样,复用最方便就是写在一起" —— 错,80% 相似是代码视角;PRD 视角是两种动作就要拆,共享部分沉原子能力
- "拆 service 太大动静,先放一起以后再说" —— 与 god service "先加进来,以后再拆"同源,**这次扩展就是迁出契机**
- "都是订单嘛,本来就该在 OrderService 处理" —— 错,"都是订单"是技术分类(同一聚合根),不等于"同一业务定位"
- "新写一个 service 文件审 PR 的人会觉得过度设计" —— 函数内堆叠会让下一次扩展更难拒绝,审阅成本是当下省 5 分钟 vs 半年后改起来 5 天

**自检三连问**(写第一行前必须答):

1. **"我要加的代码处理的是同一种业务的形态 / 参数差,还是另一种业务?"** —— 用上面判定锚点表过一遍
2. **"若是另一种业务,它有独立的状态机 / 校验 / 补偿 / 团队吗?"** —— 命中 ≥3 个 → 阶梯 2,新建 focused service
3. **"共享的部分能不能沉到原子能力层而不是塞进同一 public 方法?"** —— 能就升级到 service 级;共享逻辑走 `common/backend_infra/services/` 或等价原子能力目录,不进任一 focused service 内部

**与既有规则的关系**:

- 通用「新代码落点决策」(上一节)兜底所有"扩展旧代码"场景。
- 「Service 业务动作扩展铁律」(上一节)管 **service 粒度**的拆分(每业务分支一 focused service)。
- **本节**管「函数粒度 → service 粒度」之间的判定阶梯——函数内出现 ≥2 业务类型分流时先用本节判定,是同业务定位则函数内拆私有方法(阶梯 1),是不同业务定位则升级到 Service 业务动作扩展铁律的 service 级拆分(阶梯 2)。
- `coding-standards-common §2 函数原子`(80 行硬阈值)从**代码量**约束;`coding-standards-common §2.5 业务场景分流拆分`(本次新增)从**业务语义**约束。两者叠加:先按业务场景拆,再看每个分支是否还需要按代码量拆。

### 跨分支编排(同一回合调用 ≥2 个 focused service 时的归属)

> 一旦"focused service per branch"落实,新的问题就来了:用户点一个按钮"批准并退款",对应 cancel + refund 两个分支需要在同一事务 / 同一回合内顺序执行——这段编排代码**不能**写在 `RefundService` 里(它就该只管退款分支),也**不能**写在 `CancelService` 里,更**不能**留在 Controller / UI 里。它有自己的归属。

**核心原则**:**跨分支编排逻辑(顺序、事务、补偿、回滚)走独立的上层 Orchestrator / UseCase / Saga**,不进任何一个 focused service 内部。

**判定 — 何时必须建独立 orchestrator**:

满足以下**任一**条件,跨分支调用必须收敛到独立 orchestrator,而不是让上游(Controller / 上层 UseCase / 另一个 focused service)直接连续调用 ≥2 个 focused service:

| # | 条件 | 举例 |
|---|------|------|
| O1 | 调用 ≥2 个 focused service 且需要**原子事务边界** | `approveAndRefund`:cancel + refund 必须同事务,任一失败全部回滚 |
| O2 | 调用 ≥2 个 focused service 且有**顺序依赖**或**条件分支** | "先校验是否可退,再决定走全额退还是部分退" |
| O3 | 调用 ≥2 个 focused service 且需要**失败补偿**(Saga 模式) | "退款成功但通知失败 → 不回滚退款,补一条异步重试" |
| O4 | 业务概念本身就是**一个独立可命名的复合动作** | "审核通过 + 通知卖家 + 释放库存"在 UI 上是一个按钮、一个流程节点 |

**正确形态**:

```text
[新建] features/order/application/ApproveAndRefundOrchestrator.java
        - public void execute(ApproveAndRefundRequest req) {
              cancelService.cancel(...);       // 调用 CancelService 的 focused 能力
              refundService.refund(...);       // 调用 RefundService 的 focused 能力
              // orchestrator 只编排:顺序 / 事务声明 / 失败补偿 / 编排日志
              // 不写任何 cancel 或 refund 的业务逻辑(那些归 focused service)
          }

[调用方] Controller / 上层 UseCase 注入 ApproveAndRefundOrchestrator 调用,
        不再直接连续调用 CancelService + RefundService。
```

**Orchestrator 内部职责清单**(只允许这些):

- 调用顺序编排
- 事务边界声明(`@Transactional` / 显式事务管理)
- 失败补偿 / 回滚 / Saga 补偿动作触发
- 跨分支幂等键的协调
- 编排级别的流程日志(不是分支内部日志,那归 focused service)

**Orchestrator 内部禁止**:

- **业务规则**(状态判断 / 金额计算 / 校验逻辑)——这些归对应 focused service 或 Domain
- **数据访问**(SQL / DAO / Repository 直接调用)——必须经过 focused service
- **协议适配**(HTTP / DTO 转换)——归 Controller
- **业务方法 ≥ 2 个 public**——一个 orchestrator 一个复合动作;多个复合动作建多个 orchestrator(与"每分支一 service"原则同向)

**反模式**:

```java
// ❌ 反例 1:Controller 直接连续调用 ≥2 个 focused service,编排逻辑漏到 Controller
class OrderController {
    public void approveAndRefund(Request req) {
        cancelService.cancel(req);    // ❌ 编排在 Controller
        refundService.refund(req);    // ❌ 事务边界不清
    }
}

// ❌ 反例 2:把编排塞进其中一个 focused service
class RefundService {
    public void refundWithApprove(Request req) {
        cancelService.cancel(req);    // ❌ RefundService 不该知道 cancel 分支
        // refund 逻辑...
    }
}

// ✅ 正确:独立 orchestrator
class ApproveAndRefundOrchestrator {
    @Transactional
    public void execute(ApproveAndRefundRequest req) {
        cancelService.cancel(req);
        refundService.refund(req);
    }
}
```

**自检**:写第一行前问——本次新代码是否要在同一回合调用 ≥2 个 focused service?是 → 必须落到独立 orchestrator,不进任何 focused service 内部。

### 横切关注点不计入 god service 判定(AOP / 拦截器 / 事务声明的豁免)

> 容易混淆的边界:日志、审计、权限、事务声明、metrics、缓存、限流、链路追踪——这些**横切关注点**如果按"每个 focused service 各自实现一遍"就重复污染;但它们的**集中实现类**(`AuditAspect` / `LoggingInterceptor` / `SecurityFilter`)看起来像 god class(一个类切到所有 service)。**这种集中实现不算 god service,不受本节约束**,因为它们处理的不是业务分支,是横切机制。

**横切关注点的归属(Java / Python / Dart 三栈对照)**:

| 横切类别 | Java(Spring) | Python(FastAPI / Django) | Dart(Flutter / Shelf / Serverpod) |
|---------|-------------|--------------------------|-----------------------------------|
| 日志 / 审计 | Spring AOP `@Aspect` / Servlet Filter / Interceptor | `@audit` decorator / FastAPI `Depends` / Django middleware | Shelf middleware / Riverpod ProviderObserver / Serverpod future hooks |
| 权限 / 鉴权 | Spring Security / `@PreAuthorize` + AOP | FastAPI `Depends(get_current_user)` / Django `@login_required` / DRF `permission_classes` | Shelf middleware / Serverpod auth handler / Flutter route guard |
| 事务声明 | `@Transactional` | SQLAlchemy `with session.begin():` / Django `@transaction.atomic` / 上下文管理器 | Drift `transaction()` / SQLite `db.transaction()` / Serverpod `db.transaction()` |
| Metrics / 链路追踪 | Micrometer / OpenTelemetry / AOP | OpenTelemetry / Prometheus client + middleware / `@trace` decorator | OpenTelemetry Dart SDK / Riverpod observer |
| 缓存 | `@Cacheable` + AOP | `functools.lru_cache` / `@cache` decorator / Redis client + middleware | `package:cache` / Riverpod `AsyncValue` cache |
| 限流 / 熔断 | Resilience4j / Sentinel / 网关层 | `slowapi` / `aiolimiter` / API Gateway | Shelf rate-limiter middleware / API Gateway |
| 入参校验 | `@Valid` + Bean Validation | Pydantic models / FastAPI 自动校验 / Django Form | freezed + json_serializable / built_value / 手动 assert |
| 错误统一处理 | `@ControllerAdvice` + `@ExceptionHandler` | FastAPI `@app.exception_handler` / Django middleware | Shelf middleware / Serverpod endpoint error handler |

**强制规则**:

- **focused service 内部不重复实现横切**——不在每个 service 方法里手写 `log.info(...)` + `auditService.record(...)` + `permissionCheck(...)`;这些走 AOP / 拦截器统一注入。
- **横切实现类不计入业务 service**——`AuditAspect` 切到 100 个 service 也不是 god service;它是**横切机制**,不是**业务容器**。判定 god service 的标准是"承载多个业务分支的业务方法",不是"被很多人调用"。
- **事务边界归 orchestrator / Application 层**,不归 Domain / focused service 内部;focused service 的方法应该可以脱离事务运行(便于单测)。
- **横切关注点不算"新下游依赖"**——focused service 上加 `@Transactional` / `@Cacheable` / `@PreAuthorize` 不触发"引入新下游 → 拆分支"的判定,因为它们是机制不是业务依赖。

**反模式与正确形态对照(Java / Python / Dart 三栈写法等价)**:

```java
// Java ❌ — focused service 内手写横切
class RefundService {
    public void refund(req) {
        log.info("refund start, req={}", req);      // ❌ 横切走 AOP
        permissionCheck(req.userId, "REFUND");       // ❌ 走 @PreAuthorize
        auditService.record("refund", req);          // ❌ 走 @Audited + AOP
        // ... 业务逻辑
    }
}

// Java ✅ — 横切由注解 + AOP 统一注入
@Audited @PreAuthorize("hasPermission('REFUND')")
class RefundService {
    @Transactional
    public void refund(req) { /* 只写退款业务 */ }
}
```

```python
# Python ❌ — focused service 内手写横切
class RefundService:
    def refund(self, req):
        logger.info("refund start, req=%s", req)              # ❌ 走 middleware/decorator
        if not has_permission(req.user_id, "REFUND"): raise   # ❌ 走 Depends 注入
        audit_service.record("refund", req)                   # ❌ 走 @audit decorator
        # ... 业务逻辑

# Python ✅ — 横切由 decorator + Depends 统一注入
@audit("refund")
@require_permission("REFUND")
class RefundService:
    @transactional
    def refund(self, req): pass  # 只写退款业务
```

```dart
// Dart ❌ — focused service 内手写横切
class RefundService {
  Future<void> refund(req) async {
    logger.info('refund start, req=$req');                    // ❌ 走 middleware
    if (!hasPermission(req.userId, 'REFUND')) throw ...;      // ❌ 走 auth guard
    await auditService.record('refund', req);                 // ❌ 走 middleware
    // ... 业务逻辑
  }
}

// Dart ✅ — 横切由 middleware / interceptor 统一注入
// (在 endpoint 注册时挂上 auth/audit/logging middleware)
class RefundService {
  Future<void> refund(req) async {
    await db.transaction(() async {
      // 只写退款业务
    });
  }
}
```

## 禁止行为

| 禁止行为 | 正确处理 |
|----------|----------|
| 为了快，直接复制一个相似文件再改几行 | 先识别可复用能力，必要时抽象公共能力或拆分职责 |
| 一个方法同时处理参数适配、业务判断、SQL、HTTP、日志流水 | 按 Presentation / Application / Domain / Infrastructure 拆分 |
| 为了少建文件，把多个业务场景塞进一个 Service | 按 UseCase 或原子能力拆分，保持单一职责 |
| 上层直接依赖 DAO / HTTP Client / 其它 feature 内部类 | 通过 Repository、Application Service 或能力端口隔离 |
| 继续沿用低质量旧结构，只因为项目里已有类似写法 | 先评估现有代码质量；差结构只能提取业务事实，不能扩散 |
| 在已有的巨型方法 / 旧骨架文件里就地追加新逻辑（新增 N 行内联在旧代码段里） | 新逻辑放到新 service / 新子门面 / 新原子能力暴露 public 方法，旧文件只 +1 行调用，详见「新代码落点决策」节 |
| 往多分支 god service（如 `OrderService` 同时承载 `refund`/`cancel`/`reject`）里追加**任何** public 业务方法——不论新方法是新业务分支（`reverseCheckout`）还是同分支变种（`partialRefund`） | **新业务分支** → 新建该分支的 focused service（`ReverseCheckoutService`），作为其 public 方法；**同分支变种** → 若该分支已有 focused service（`RefundService`）则加进去，若分支仍散落在 god service 则新建 focused service 并把既有方法+变种**一并迁过去**。任何情况下 god service 都不新增业务方法，最多保留 1 行 delegate 入口，且禁止写任何业务逻辑。详见「Service 业务动作扩展铁律」节 |
