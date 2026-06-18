---
name: cross-project-locator
description: "Use to (1) locate code/behavior across ≥2 projects in the kpay POS ecosystem (korepos, korepos-refund, BFF, order-manage, commodity, store-operation-manage, report, price-calc-sdk, pos-config-ts), and (2) register cross-project topology into `kpay-pos-topology/`. MUST trigger when user traces call chains across ≥2 of these projects, mentions ≥2 project names in one question, or is about to Write/Edit markdown referencing ≥2 project names. DO NOT route cross-project mapping/flow into Claude memory, individual project's docs/, or team-standards — only into `kpay-pos-topology/`. Single entry point for cross-project topology knowledge. Detailed trigger phrases and ecosystem project list in SKILL.md body."
---

# cross-project-locator — 跨项目业务拓扑定位与登记

## 本 skill 的两种模式

| 模式 | 场景 | 入口动作 |
|---|---|---|
| **查询模式（Read）** | 用户要定位、排查、追踪跨项目的代码 / 行为 / 调用链 | 读 `kpay-pos-topology/CLAUDE.md` § 查找索引表 |
| **登记模式（Write）** | 即将写一份跨 ≥2 个工程的 markdown（对照 / 流程 / 数据流） | 落盘到 `kpay-pos-topology/mapping/` 或 `flows/`，同时更新索引表 |

---

## 覆盖范围：kpay POS 生态工程清单

本 skill 仅路由以下工程之间的关系：

| 项目目录 | 类型 |
|---|---|
| `D:\Users\zhangkai\IdeaProjects\korepos\` | Flutter 终端主端 |
| `D:\Users\zhangkai\IdeaProjects\korepos-refund\` | Flutter 退款子端 |
| `D:\Users\zhangkai\IdeaProjects\kpay-pos-business-app-bff\` | BFF 聚合层（Spring Cloud） |
| `D:\Users\zhangkai\IdeaProjects\kpay-pos-order-manage\` | 订单微服务（Spring Cloud） |
| `D:\Users\zhangkai\IdeaProjects\kpay-possystem-commodity\` | 商品中心 |
| `D:\Users\zhangkai\IdeaProjects\pos-store-operation-manage\` | 门店经营管理 |
| `D:\Users\zhangkai\IdeaProjects\kpay-pos-report\` | 报表 |
| `D:\Users\zhangkai\IdeaProjects\price-calc-sdk\` | Rust 算价 SDK |
| `D:\Users\zhangkai\IdeaProjects\pos-config-ts\` | 配置中心 |

> 权威清单见 `kpay-pos-topology/CLAUDE.md` § kpay POS 生态项目清单。若有新增项目，先在那里登记，再回本 skill 更新。

---

## 查询模式（Read）

### 触发信号（三维匹配，命中任一维即触发）

| 维度 | 关键词 |
|---|---|
| **动作意图** | 定位 / 追 / 查 / 排查 / 从...追到 / 调用链 / 链路 / 哪里处理 / 怎么走的 / 为什么返回 / end-to-end / trace |
| **工程名** | korepos / korepos-refund / bff / order-manage / commodity / store-ops / report / price-calc-sdk / Flutter（代指 korepos）/ 前端 / 终端 / 后端 / server |
| **业务域** | 退款 / 订单 / 支付 / 结账 / 反结账 / 日结 / 开班 / 发票 / 打印 / 购物车 / 算价 / 同步 / 钱箱 / 桌台 / 会员 / 员工 / 商品 / 库存 / 促销 / 报表 |

### 路由逻辑（按顺序尝试，命中即止）

**第一步：必读根索引**

打开 `D:\Users\zhangkai\IdeaProjects\kpay-pos-topology\CLAUDE.md`，读到 § 查找索引表。**不允许跳过这步直接 grep 项目源码**。

**第二步：路由判定**

```
用户提到 A 和 B 两个明确工程名？
   ├─ 是 → 读 mapping/{A}-to-{B}.md（或 {B}-to-{A}.md，按索引表为准）
   └─ 否 ↓

用户提到明确业务域（退款/日结/支付/...）？
   ├─ 是 → 读 flows/{业务域}-flow.md；若索引表标"部分/缺"，同时读涉及的 mapping/*.md
   └─ 否 ↓

用户只提到一个工程名 + 动作意图？
   ├─ 是 → 读 project-graph.md 定位该工程的上下游，再按"两工程名"分支重试
   └─ 否 ↓

当前工作目录在某个生态工程下？
   ├─ 是 → 把该工程当作起点，读 project-graph.md 找上下游，再按"两工程名"分支重试
   └─ 否 ↓

未命中 → STOP，告知用户未找到对应拓扑文档，询问是否需要新建（转登记模式）
```

**第三步：顺拓扑追代码**

拿到对照文档后，按 **上游 → 下游** 顺序 Read / Grep 各项目的源码。不要跳层。

### 查询模式下禁止的行为

- ❌ 跨项目排查时直接到某个项目源码里猜对照，跳过 `kpay-pos-topology/`
- ❌ 基于 Claude memory 里的旧对照做结论（memory 记录可能已过期，以 `kpay-pos-topology/` 为准）
- ❌ 把临时查到的对照结果只告诉用户，不回写拓扑仓库（发现差异必须当场修正）

---

## 登记模式（Write）

### 触发信号（满足任一即触发登记模式）

即将 Write / Edit 一份 markdown 文件，且：

1. 文档内容**同时提到 ≥2 个** kpay POS 生态工程名（见上方清单）
2. 或标题 / 正文含 **「对照」「映射」「调用链」「链路」「数据流」「拓扑」「跨项目」「前后端追踪」** 等词
3. 或包含 Mermaid 图，其节点代表 **项目 / 服务 / 工程**（不是类 / 方法 / 模块）
4. 或文档要回答 **"A 项目里的 X 对应 B 项目里的哪个"** 这类问题

### 硬规则

**只要命中登记模式触发信号，STOP 当前写入路径，强制走以下流程：**

1. **不准**写到 Claude memory（`~/.claude/projects/*/memory/*.md`）
2. **不准**写到单个项目的 `docs/`
3. **不准**写到 `team-standards/` 里任何位置
4. **必须**写到 `D:\Users\zhangkai\IdeaProjects\kpay-pos-topology\` 下对应目录

### 子目录选择

| 内容形态 | 落盘位置 | 命名 |
|---|---|---|
| 两项目间接口 / 类 / 表的字面对照 | `mapping/` | `{上游}-to-{下游}.md`（短名，例：`bff-to-server.md`、`korepos-to-bff.md`） |
| 跨 ≥3 工程的业务全链路（含时序图 + 数据流图） | `flows/` | `{业务域}-flow.md`（例：`refund-flow.md`、`shift-flow.md`） |
| 整体项目关系 / 新工程接入 | 追加到 `project-graph.md` | — |

### 登记流程（必须按顺序执行）

1. **判定类型**：mapping 还是 flows 还是 project-graph 补充？
2. **读现状**：若目标文件已存在 → Read，在现有结构上追加 / 合并，不要覆盖重写
3. **写入**：按 `mapping/bff-to-server.md` 的结构做范本（元信息头 + Controller 级概览 + 接口级明细 + 未解项 + 更新指南）
4. **同步索引**：打开 `kpay-pos-topology/CLAUDE.md`，**立即**更新 § 查找索引表对应业务域行的"对照文档" / "流程文档" / "状态"列
5. **回头核对**：`project-graph.md` § 二. 按业务域的项目参与度 如果业务域新增或项目参与度变化，同步更新

### 登记模式下禁止的行为

- ❌ 拿到跨项目对照后只更新 mapping 文件但不更新索引表（索引过期 = skill 下次查询模式会漏）
- ❌ 在 mapping / flows 里写解释性的分析文字（mapping 只记事实；分析放到 bug / design 文档里，那是另外的 skill 管）
- ❌ 一份文档塞两个业务域（每份 flows/*.md 只管一个业务域）

---

## 与其他 skill 的协作

| 场景 | 协作 skill | 关系 |
|---|---|---|
| 跨项目 bug 排查 | `bug-doc-required` | 先用本 skill 定位代码坐标，再由 `bug-doc-required` 生成 bug 分析文档（bug 文档仍然落到出问题的项目 `docs/bug/`，不落本仓库） |
| 跨项目新功能 | `design-doc-required` | 先用本 skill 理解现状拓扑，再由 `design-doc-required` 生成设计文档（设计文档落主要项目 `docs/design/`） |
| 写 Markdown 图表 | `markdown-writing-standards` | 写 mermaid 图时遵守 markdown-writing-standards 的语法规范 |
| 项目内知识图谱 | `init-project-docs` / `project-docs-update` | 那两个管单项目内，本 skill 管跨项目，不冲突 |
| 写 korepos backend | `korepos-backend-service` | 若 UI 对接手册含跨项目调用（比如 BFF 作为 UI 调用方），UI 对接手册仍然留在 korepos `docs/`，但跨项目对照部分应提取到本仓库 mapping |

---

## 自检清单（每次使用后核对）

### 查询模式后

- [ ] 是否第一步就读了 `kpay-pos-topology/CLAUDE.md`？
- [ ] 是否按路由逻辑命中具体 mapping 或 flows 文件？
- [ ] 追代码时是否按上游→下游顺序？
- [ ] 如果发现对照文档与实际源码不一致，是否就地修正了？

### 登记模式后

- [ ] 文档是否落到了 `kpay-pos-topology/` 下，而不是 memory / 项目 docs / team-standards？
- [ ] 是否更新了 `kpay-pos-topology/CLAUDE.md` § 查找索引表？
- [ ] 状态列从「缺」改到「部分」或「完整」？
- [ ] 涉及新项目或新业务域时，`project-graph.md` 是否也同步了？

---

## 维护本 skill

- 新增 kpay POS 生态工程 → 同步更新本 SKILL.md § 覆盖范围 + `kpay-pos-topology/CLAUDE.md` § 项目清单 + `project-graph.md`
- 新增业务域 → 更新本 SKILL.md § 触发信号.业务域 + `kpay-pos-topology/CLAUDE.md` § 查找索引表
- 路由逻辑调整 → 更新本 SKILL.md § 路由逻辑 + `team-standards/docs/skill-flow.md`
