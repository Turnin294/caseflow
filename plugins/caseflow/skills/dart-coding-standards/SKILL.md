---
name: dart-coding-standards
description: Use when writing, reviewing, or modifying any Dart / Flutter code. You MUST follow these mandatory rules at all times. Apply automatically without being asked. 通用条款见 coding-standards-common；本文件仅列 Dart 独占规则（Effective Dart 文档注释 dartdoc 语法 + Dart 专属约定）。korepos / korepos-refund 的 backend 接口代码在本文件之上再叠加 korepos-backend-service。
---

# Dart 编码规范（Effective Dart·Dart 专属强制项）

> **本文件只写 Dart 独占条款。** 命名表意、函数原子、层次分明、零魔法值、注释三档（含 §5.1.5 字段档、§5.2.1 职责边界注释）、异常不静默、删冗余 这 7 条通用铁律 + 注释红线（§5.4 / §5.4.1）在 `coding-standards-common/SKILL.md` 中，Dart 编码同时遵守通用 skill + 本文件。
>
> 触发顺序：`coding-standards-common`（通用 7 条 + 注释三档）→ `dart-coding-standards`（本文件 Dart 独占）→（仅 korepos / korepos-refund backend 代码）`korepos-backend-service`。

---

## 1. 文档注释 = dartdoc `///`，不是 `//`

> 注释三档铁律（类 1-3 行 / 方法 1-2 行 / 核心块 1 行 / 字段一行可选）和注释红线见 `coding-standards-common §5`。以下为 Dart 独占语法：

- **类 / 公开方法 / 公开字段的文档注释一律用 `///`（dartdoc），不用 `//`**。`//` 只用于函数体内的 §5.3 核心块行内注释
- **首句是一句完整的摘要**，以句号结尾、独占一行——dartdoc 工具把首句单独抽出来做摘要。后面要展开再空一行写
- **引用其它标识符用方括号 `[identifier]`**（如 `[OrderState.paid]` / `[refund]`），dartdoc 会自动生成跳转链接，比裸文本更准
- 文档注释写在**注解之上**（`///` 在 `@override` / `@JsonSerializable` 等注解的上方）

```dart
/// 退款服务：发起退款与查询退款状态。
///
/// 现金支付直接进终态；在线支付（[PaymentChannel.kpayOnline]）须等异步回调。
class RefundService {
  /// 是否正在执行反结账流程。
  final bool reopenInProgress;
}
```

## 2. 不用 Javadoc 风格的 `@param` / `@return` / `@throws`

- **Dart 不用 `@param` / `@return` / `@throws` 标签**（那是 Javadoc 风格）。参数 / 返回值 / 异常用**散文 + `[参数名]` 引用**自然带过
- 平凡参数不逐个解释；只写非显然的约束（空值规则、取值范围、单位）

```dart
/// 发起退款申请，返回退款流水号。
///
/// [amount] 退款金额，单位分，不能超过原单可退余额。
/// 在线支付下返回的流水号需再轮询 [queryRefundStatus] 确认终态。
Future<String> refund(String orderId, int amount) async {}
```

## 3. 私有成员（`_` 前缀）的文档注释从简

- 私有方法 / 私有字段（`_` 前缀）**不是公开 API**，1 行 `///` 讲当前职责即可，**禁堆契约演变史**（同 §5.4 私有方法 dartdoc 红线）
- 公开 API（无 `_`）才需要完整的散文契约说明

## 4. Flutter Widget 注释写「展示什么 / 何时变化」

- Widget 类的 `///` 讲**它在 UI 上展示什么、关键状态如何影响展示**，不讲 build 实现细节
- `StatelessWidget` / `StatefulWidget` 的回调字段（`onPressed` 等）一行 `///` 说明触发时机

```dart
/// 订单退款状态条：处理中显示加载动画，完成后显示退款金额。
class RefundStatusBar extends StatelessWidget {
  /// 点击「重试」时回调；为 null 时隐藏重试按钮。
  final VoidCallback? onRetry;
}
```

## 5. TODO 格式（对齐 §5.3 / §5.4）

- `// TODO(负责人): 原因`——负责人 + 原因必填、**禁带日期**（同 coding-standards-common §5.4）
- `FIXME` 同理。能开任务的优先开任务，不把 TODO 长期留源码

```dart
// TODO(turnin): 等多次部分退款上线后支持金额累加
```

## 6. 金额禁用 `double`

- 金额 / 数量等需要精确计算的值**禁用 `double`**（浮点精度问题），用 `int`（单位分）或 `Decimal`；与 `arch-lint` 的「金额禁 double」规则一致

---

## 违规示例快查

| 错误写法 | 正确写法 |
|----------|----------|
| `// 退款服务` 作类文档注释 | `/// 退款服务：发起退款与查询状态。`（用 `///`） |
| `/// @param orderId 订单ID` | `/// [orderId] 原订单号。`（Dart 用 `[]` 引用，不用 `@param`） |
| 私有方法 `_validateAmount` 上 10 行 dartdoc 讲契约演变 | 1 行 `/// 校验退款额不超原单余额。`（私有不堆契约史） |
| 字段注释 `// amount: 金额`（复述字段名） | `/// 退款金额，单位分。`（讲业务含义 + 单位，省略自解释字段） |
| `// TODO(turnin 2026-04): 优化` | `// TODO(turnin): 等接口对齐后优化`（去日期） |
| 金额用 `double price` | `int priceInCents` 或 `Decimal price` |
| `// 这是个退款 Widget` | `/// 订单退款状态条：...展示什么、何时变化。` |
