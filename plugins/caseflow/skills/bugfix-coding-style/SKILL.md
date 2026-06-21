---
name: bugfix-coding-style
description: "Use when applying any bug fix, alignment correction, redundant-code removal, OR adding missing logic to align with upstream during integration/联调 phase. Trigger when: (1) design-doc-required has routed the change to 「第四·五步：轻量修订流水」 branch, (2) user describes the change as 'fix bug', 'align with upstream', 'add missing piece', '修 bug', '对齐上游', '删冗余', '修正实现', '改回正确逻辑', '补上漏掉的逻辑', '补缺漏', or (3) about to Edit/Write source code with intent of replacing existing erroneous logic OR adding alignment code that was missed in previous iterations. **注释红线不在本 skill 定义** — 唯一规则源是 coding-standards-common §5.4 + §5.4.1(common 触发顺序早于本 skill,不会漏)。本 skill 只承担 bug 修复期独有的应用层指引:v1.17 方向反转的历史背景、推荐写法 java 代码示例、摆放位置、适用范围矩阵、遇到存量 [DEPRECATED]/[ADDED] 注释顺手清理的边界、红色警告对照表。"
---

# Bug 修复 / 联调期编码风格

> **本 skill 自 v1.17.0 起方向反转：禁止把变更历史写进代码内部，禁止保留注释式旧代码。** 之前版本要求的 `[DEPRECATED YYYY-MM-DD]` / `[ADDED YYYY-MM-DD]` / 注释保留旧代码段全部废止。变更历史默认归 git log / commit message 管；bug 文档 / 设计文档只沉淀长期业务事实，不重复源码变更流水。

## 核心原则

**代码只描述当前正确逻辑，只保留对当下读者有意义的"WHY 注释"，禁止任何形式的变更历史叙事和函数头大段说明。** 修改/替换/删除已有代码时直接覆盖，不留旧代码副本；新增对齐补丁时直接添加，不打补丁标记。过气逻辑、曾经的错误实现、某次变更原因、日期、PR/Issue 编号都属于 Git 历史，不属于源码。

| 类型 | 处理方式 |
|------|---------|
| 修改/替换/删除已有代码 | 直接改写。不要 `//` 注释保留旧实现，不要写 `[DEPRECATED]`/`[BUGFIX]`/`[FIXED YYYY-MM-DD]` 等标记。 |
| 新增之前缺漏的对齐代码 | 直接添加。不要写 `[ADDED YYYY-MM-DD]`、不要写"对齐云端 XX 第 N 行"作为头注释，不要引用调整流水编号。 |
| 方法 / 类 doc comment | 只写当前职责、输入输出语义、不变式和容易误用的业务约束；不要把设计文档、bug 复盘、实现步骤流水堆到函数头。 |
| 必要的 WHY 注释 | 复杂逻辑的解释优先贴近对应代码块，用 1-2 行说明"为什么这样做"；只有跨整个方法的不变式才上提到方法 / 类 doc comment。 |

## 为什么反向

| 旧规则的初衷 | 实际产生的问题 |
|-------------|---------------|
| 留对照证据方便快速回滚 | git 本身就是回滚锚点，注释段反而和实际代码脱节、容易腐烂 |
| code review 看"改了什么、为什么" | review 看 PR diff 即可；commit message + bug 文档讲"为什么"更准确 |
| 跨服务联调时直接指原代码作凭据 | 联调结论应沉淀到 bug 文档 / 设计文档，不应靠源码注释当临时白板 |
| 让代码"留下故事" | 故事归 git history。源码每多一行噪声注释，下个读者多一份认知负担 |

## 红线(单一来源:`coding-standards-common` §5.4 + §5.4.1)

> **本 skill 不再独立定义注释红线。** 跨语言通用 + bug 修复 / 联调 / 删冗余 / 重构 / 新功能 / 任何源码改动的注释禁令以 [`coding-standards-common`](../coding-standards-common/SKILL.md) **§5.4 列项清单 + §5.4.1 字面反例对照表**为**唯一来源**。
>
> 触发顺序里 `coding-standards-common` 早就先于 `bugfix-coding-style` 必走(见 `CLAUDE.md` 「核心调用顺序」§11 → §10),不会漏读;以后新增注释反模式**只改 common 一处**,避免双地维护漂移。
>
> 本 skill 只保留下方 **bug 修复期独有**的应用层指引:历史背景(为什么 v1.17 方向反转)、推荐写法 java 代码示例、摆放位置示例、适用范围矩阵、**遇到存量 `[DEPRECATED]` / `[ADDED]` 注释顺手清理的边界**、与其他 skill 的协作、红色警告对照表。

## 推荐写法（WHY 注释只放有当下价值的）

允许且鼓励的注释形式：

| 类型 | 例子 | 摆放位置 |
|------|------|---------|
| 方法/类承担的隐藏不变式 | "字段映射约定：支付回调 outTradeNo 对应本地 out_trade_no 而非 transaction_no" | 方法/类 doc comment |
| 当前行为摘要 | "按用户选择的 refundMethods 将可退池分摊到原支付流水" | 方法 doc comment，最多 1-3 行 |
| 与外部系统的字段语义对齐 | "对齐支付核心 PayV1ServiceImpl#payNotifyForOfflineChannel" | 类 doc comment（不带日期/版本） |
| 单行非显然的业务约束 | `// 加 ±0.005 浮点容差是为了让前端 toFixed(2) 与 BigDecimal 的尾差不报错` | 该行上方 |
| 对易误解参数的语义说明 | `// @param businessDate 业务日（不一定等于 createTime 的日期）` | 参数 doc tag |

判断准绳：**删掉这条注释，下一个改这段代码的人会不会犯错？** 会则保留，不会则删。

## A vs B 不再区分

旧规则的 A 类（DEPRECATED）/ B 类（ADDED）已废止。不论是修改还是新增，写法都一样：直接改、不留痕迹。需要解释 WHY 时，按上节"推荐写法"上提到 doc comment。

## 函数头注释边界

函数 / 类 doc comment 只承担**当前读者理解入口所必需的信息**：

- 当前职责：这个方法现在做什么
- 输入输出语义：参数、返回值、异常或副作用有什么业务含义
- 不变式 / 误用风险：删掉这句后，下个维护者很可能写错的约束

以下内容不要写进函数头注释：

- 历史标记：`[REWRITTEN]`、日期、版本号、PR/Issue、"旧实现 / 新实现"
- 事故复盘：旧逻辑错在哪里、为什么这次改、谁要求对齐
- 实现流水：第 1 步查什么、第 2 步怎么分摊、第 3 步怎么落库
- 文档摘要：设计文档第几节、bug 文档结论、未来版本计划

如果代码块确实复杂，把说明放到**对应代码块上方**，保持短句：

```java
/**
 * 按用户选择的退款方式，将可退池分摊到原支付流水。
 *
 * 分摊结果保留原流水金额，用于后续按流水维度判断撤销资格。
 */
List<RefundTransactionAllocation> allocateByRefundMethods(...) {
    RefundablePool pool = eligibilityDao.queryRefundableTxPool(originalOrderId);

    // 非现金退款只能消耗同 wireType 的原流水，避免跨渠道占用可退额度。
    for (RefundMethod method : nonCashMethods) {
        allocateSameWireType(pool, method);
    }

    // 现金退款先消耗现金池；外溢规则未启用时，剩余金额只记录日志不落库。
    allocateCashPool(pool, cashMethod);
}
```

## 摆放位置

```java
/**
 * 按支付回调的 outTradeNo 反查支付流水。
 *
 * 字段映射约定：支付回调字段 outTradeNo 对应本地 `order_transaction.out_trade_no`，
 * **不是** `transaction_no`（那是本地系统流水号 RTX/T...）。退款场景下两者必然不同。
 *
 * 命中行须满足 `refund_flag=1`，确保只匹配退款流水而非原支付流水。
 */
RefundCallbackLookupResult lookupByOutTradeNo(String outTradeNo) {
    OrderTransaction transaction = orderTransactionMapper.selectOne(
        new LambdaQueryWrapper<OrderTransaction>()
            .eq(OrderTransaction::getOutTradeNo, outTradeNo)
            .eq(OrderTransaction::getRefundFlag, 1)
            .eq(OrderTransaction::getDeleted, 0)
            .last("limit 1"));
    // ...
}
```

对照反例：

```java
// ❌ 禁止：变更日志、deprecated 旧代码、引用文档
//
// [BUGFIX 2026-04-30] 旧实现用 transaction_no 反查，原支付场景因 transaction_no
// 与 out_trade_no 同值（均为 T...）而凑巧命中；退款场景导致全部反查未命中。
// 详见 v6 调整流水 2026-04-30 条目。
// OrderTransaction transaction = orderTransactionMapper.selectOne(
//     new LambdaQueryWrapper<OrderTransaction>()
//         .eq(OrderTransaction::getTransactionNo, outTradeNo)
//         .eq(OrderTransaction::getDeleted, 0)
//         .last("limit 1"));
OrderTransaction transaction = ...; // 新代码
```

## 适用范围

| 场景 | 是否适用 | 处理方式 |
|------|---------|---------|
| 联调期 bug 修复 | ✅ | 直接改写，逻辑说明上提方法 doc |
| 删除明确无效的 if/else 分支 | ✅ | 直接删，不留注释 |
| 方法体内逻辑修正（不改签名） | ✅ | 直接改；复杂代码块只在局部加短 WHY 注释 |
| 补上原本缺漏的对齐代码 | ✅ | 直接加，无需 ADDED 标记 |
| 新功能开发 | ✅ | 同样适用本规范 |
| 纯重命名 / IDE refactor | ✅ | 直接改 |
| 测试代码 / 配置文件 | ✅ | 直接改 |

本 skill 现在适用于**所有源码改动**，不再局限于轻量修订流水。

## 遇到旧的 [DEPRECATED] / [ADDED] 注释怎么办

旧版本（v1.16 及以前）按规范留下的标记注释，**编辑同一段代码时可顺手清理**：

- A 类（`[DEPRECATED]` + 注释保留的旧代码）：删除整段（头注释 + 旧代码）
- B 类（`[ADDED]` 头注释 + 实际代码）：删除头注释，**保留代码本身**

这与旧版"AI 永不主动删除带标记注释"规则相反 —— 因为新规范本身就要求源码内不留这类注释。但仅限于"刚好在改这段代码"时顺手做，不必专开 PR 全仓清理。

## 与其他 Skill 的协作

| Skill | 关系 |
|-------|------|
| `design-doc-required` 第四·五步 | 走轻量修订流水分支时，代码改动遵循本 skill（直接改，不留变更日志） |
| `coding-violation-log` | 用户若纠正本 skill 的执行（如又写了 BUGFIX 标记），由 coding-violation-log 登记 |
| `git-commit-standards` | 变更原因写进 commit message body（中文 body），不入源码 |
| `bug-doc-required` | bug 文档保留完整根因/修复历史；源码不重复这些信息 |

## 红色警告

| 想法 | 正确处理 |
|------|----------|
| "删了改不回去" | git revert 一条命令的事；源码里堆 deprecated 注释才是不可靠的回滚机制 |
| "Reviewer 看不懂为什么改" | 写在 commit message body / PR description / bug 文档里 |
| "我加了 [ADDED 日期] 显得有交代" | 是噪声不是交代；把对齐依据上提到方法 doc 的"对齐说明"段（不带日期） |
| "这段代码以前 bug 过，警示后人" | 加测试用例覆盖、写进 bug 文档；不在源码注释里复述故事 |
| "TODO 想标个日期方便回头查" | 别。开 issue / 任务卡，源码里只留"为什么这里需要 TODO"的内容（且更应避免） |
| "用户没说要清理，那就保留旧 DEPRECATED" | 错。本 skill v1.17 起规则反转，遇到就可以顺手清（限改同一段代码时） |
| "函数上写一大段，后面的人就不用翻文档了" | 错。函数头只写当前行为和必要约束；设计背景、旧实现问题、未来计划归文档和 Git 历史 |
