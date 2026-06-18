---
name: llm-agent-coding-standards
description: Use when writing or modifying code that integrates an LLM or builds an agent —— imports langchain4j / spring-ai / openai / anthropic 等 SDK；定义 @Tool / AiService / function-calling 工具；拼装 prompt；解析 LLM 输出。在 coding-standards-common 之上叠加的 LLM/Agent 集成编码铁律：确定性优先、LLM 输出当不可信入参、模糊→结构化用受控枚举、约定单一来源、工具描述是运行时契约、Agent 循环必须兜底、上下文由代码注入。MUST 自动触发，先满足 coding-standards-common 再走本 skill。
---

# LLM / Agent 集成编码规范

> 叠加在 `coding-standards-common`(通用 7 条铁律)之上。当代码"接 LLM / 做 agent"时,除通用铁律外再守以下条款。
> 触发链路:`coding-standards-common` → `{language}-coding-standards` → **本 skill**。
>
> **核心立场:LLM 是不确定的概率组件,把它当"会犯错的外部依赖"对待——不是函数,是会幻觉的下游。**
>
> 这些条款几条与语言无关的成熟来源一致(Anthropic《Building Effective Agents》、社区《12-Factor Agents》、OpenAI / LangChain4j / Spring AI 文档),此处落成团队编码铁律 + Java 栈落点。

---

## 1. 确定性优先(deterministic-first, LLM-last)

- 能用代码**稳定算 / 查 / 校验**的,**不交给 LLM**:时间换算、金额 / 数字解析、聚合统计、查库、格式校验、ID 生成、排序去重。
- LLM 只承担真正"模糊"的理解判断:意图识别、分类、自然语言→结构化、摘要、改写。
- 反例:让 LLM 把"明天下午3点"算成绝对时间(它会错时区 / 错日期);"上周"让 LLM 写带日期的 SQL。→ 改为**代码**注入带时区的当前时间、代码做相对→绝对换算、代码把"上周"换成时间区间。
- 收益:省 token、降延迟、可单测、少幻觉。判据:**后果大 × LLM 爱错 × 校验便宜**,三高才上代码护栏。

## 2. LLM 输出 = 不可信入参

- 模型返回的一切(文本 / JSON / 工具参数)一律当**外部不可信输入**:解析后**必须代码校验 + 归一化 + 兜底**,不可直接落库 / 直接下游。
- 结构化输出**解析失败 → 重试 N 次 → 降级**(绝不丢用户数据,不把未处理异常甩给用户)。
- 数值 / 枚举 / 时间等字段在落库 / 调下游前过校验(范围、合法值、可解析);越界 / 非法归一化到兜底值并标记。
- 呼应 `coding-standards-common` §6(异常不静默)。一句话:**LLM 提议,代码裁决**。

## 3. 模糊 → 结构化:用受控枚举(枚举输出,不穷举输入)

- 把模糊表达收敛到**封闭枚举 / 词表**,让 LLM 把无限说法**归类**到有限桶;**禁**在代码里用 `contains` / 正则去穷举无限的自然语言说法(打地鼠,永远补不完)。
- 枚举值进 schema(function-calling 参数用**枚举类型**、structured output 用**枚举字段**),模型只能从合法值里选一个。
- 适用:类目、状态、优先级、时间范围、情绪、意图类型……凡是有限词表。
- 代码只在**有限枚举**上做确定性映射(枚举 → 时间戳 / SQL 条件 / 处理分支)。新增说法由 LLM 自动归桶,**零代码维护**。

## 4. 约定单一来源(SSOT)—— 别在 prompt 和注解里复读

- 枚举含义 / 状态映射 / 同义词 / 默认值,只存**一处**(枚举定义 + 其常量描述,如 LangChain4j `@Description`、Spring AI 等价),system prompt 和工具 / 参数 description **引用而不复写**。
- 反例:把"最近 → LAST_7_DAYS"同时写进 2 个工具 description + system prompt,改一次约定要改 3 处。
- 这是 `coding-standards-common` §7「知识 SSOT」在 LLM 场景的具体落点:**约定是知识,第一次出现就单源**。

## 5. 工具描述是运行时契约(不是给人看的注释)

- `@Tool` / 函数 / 参数的 `description` 是**模型选工具、填参数的依据**(load-bearing),写烂 = 路由错;它进 schema、是契约,**不是普通注释**(注释三档管不到它,反而要写清楚)。
- 工具参数当**不可信入参**校验(见 §2);工具方法抛出的异常信息要**可读**(模型要据此纠正重试)。
- 工具集**小而精**:全部工具 schema **每轮都发**给模型,工具越多越费 token、模型越容易选错;到几十个以上才考虑工具检索 / 分组(tool-RAG),否则全发即可。

## 6. Agent 循环必须有兜底

- tool-loop / ReAct 循环**必须设最大步数 / 轮数上限**(LangChain4j `maxToolCallingRoundTrips`、Spring AI 等价配置),防模型抽风死循环烧 token。
- 工具调用失败 → **捕获 + 把可读错误回喂模型**让它纠正,而不是整体崩。
- 每一步(思考 / 调工具 / 结果)**可观测**(日志 / `ChatModelListener` / SSE 推前端),便于回放调试;黑盒循环出问题无从查。

## 7. 上下文由代码注入,别假设模型知道

- 相对时间解析必须注入**带时区的当前时间**(模型不知道"现在几点""哪个时区""今天星期几")。
- 受控词表、用户偏好、当前状态、业务规则等"模型无从知道"的事实,由**代码注入** prompt,不要指望模型凭空知道或猜对。

---

## 自检清单

写 / 改"接 LLM"的代码前过一遍,有 ❌ 必须改:

- [ ] 这步能不能用代码确定性完成?能就别给 LLM(§1)
- [ ] LLM 的输出有没有当**不可信入参**校验 + 失败兜底降级?(§2)
- [ ] 模糊 → 结构化是不是用了**封闭枚举**(而不是 `contains` 穷举说法)?(§3)
- [ ] 同一**约定**有没有在 prompt / 注解 / 代码里复写?应只存一处(§4)
- [ ] 工具 / 参数 `description` 是否清晰(模型靠它路由)?工具集是否小而精?(§5)
- [ ] Agent 循环有没有**最大步数兜底**?工具异常信息可读吗?每步可观测吗?(§6)
- [ ] "当前时间 / 时区"等模型无从知道的上下文,有没有由代码注入?(§7)

---

## 与其它 skill 的关系

| 通用 / 语言 skill | 本 skill(LLM/Agent 叠加) |
|---|---|
| `coding-standards-common`:7 条铁律(§7 知识 SSOT、§6 异常不静默是本 skill §4 / §2 的母原则) | 在其之上加 LLM 集成独占条款 |
| `java-coding-standards`:语言独占条款 | 与语言专属正交,叠加不替代 |

**触发顺序**:任何"接 LLM"的源码 Edit/Write → 先 `coding-standards-common` → 再 `{language}-coding-standards` → 最后本 skill。
