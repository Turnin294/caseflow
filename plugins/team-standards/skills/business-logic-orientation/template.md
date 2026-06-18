# {业务模块} 现状梳理

> 梳理时间：{YYYY-MM-DD}
> 梳理目的：{重构 / 迁移 / 回归测试 / 新人 onboarding}
> 技术栈：{前端 / 后端 / 全栈}
> 关联设计文档：{链接}（如有）

---

## 1. 场景总览矩阵

| # | {维度 A} | {维度 B} | {维度 C} | 关键差异 | 图组 |
|---|---------|---------|---------|---------|------|
| 1 | ... | ... | ... | ... | A 组 |
| 2 | ... | ... | ... | ... | A 组(标注差异) |

### 场景决策树

```mermaid
flowchart TD
    ROOT(["业务请求"]) --> Q1{"{维度A}?"}
    Q1 -->|"{值1}"| Q2{"{维度B}?"}
    Q1 -->|"{值2}"| Q3{"{维度B}?"}
    Q2 -->|"{值1}"| S1["场景1\nA组"]
    Q2 -->|"{值2}"| S2["场景2\nA组"]
    Q3 -->|"{值1}"| S3["场景3\nB组"]
    Q3 -->|"{值2}"| S4["场景4\nB组"]
```

---

## 2. 核心代码索引

### 2.1 文件清单

| 层 | 文件路径 | 核心类 | 行数 | 职责 |
|----|---------|--------|------|------|
| Presentation | `{path}` | {ClassName} | {N} | {一句话} |
| Application | `{path}` | {ClassName} | {N} | {一句话} |
| Data | `{path}` | {ClassName} | {N} | {一句话} |
| Domain | `{path}` | {ClassName} | {N} | {一句话} |

### 2.2 关键方法速查

| 方法签名 | 文件 | 行号 | 关联场景 |
|---------|------|------|---------|
| `{methodName()}` | {file} | {line} | 场景 1,2,3 |

---

## 3. 各场景详细分析

### 3.X {图组名}：{场景组描述}

> 覆盖场景 {N}（...）、场景 {M}（...）

#### 时序图

> **规范：** 属于同一服务/系统的参与者用 `box` 包裹分组；所有接口调用必须标注实际接口地址（通过 Grep 确认，禁止推测）。

```mermaid
sequenceDiagram
    box rgb(245, 245, 245) 用户界面
        participant U as "用户"
        participant UI as "{页面/控制器}"
    end

    box rgb(232, 245, 253) Application 层
        participant SVC as "{Service}"
    end

    box rgb(255, 243, 224) {内部服务名}
        participant REPO as "{Repository}"
        participant LR as "{LocalRepository}"
    end

    box rgb(232, 245, 233) 外部依赖
        participant DB as "{数据库}"
        participant CLOUD as "{云端服务}"
    end

    box rgb(255, 235, 238) {第三方系统名}
        participant EXT as "{外部API}"
    end

    U->>UI: "{用户操作}"
    UI->>SVC: "{方法名()} :{行号}"

    rect rgb(220, 240, 255)
        Note over SVC,DB: "{阶段名称}"
        SVC->>REPO: "{方法名()} :{行号}"
        REPO->>LR: "{内部路由} /actual/endpoint/path"
        LR->>DB: "{DB操作描述} :{行号}"
        DB-->>SVC: "{返回}"
    end

    SVC->>CLOUD: "{方法名()} :{行号}<br/>POST /v1/actual/api/path"
    SVC->>EXT: "{方法名()} :{行号}<br/>POST /v1/external/api/path"

    alt "{成功条件}"
        SVC-->>UI: "{成功结果}"
    else "{失败条件}"
        SVC-->>UI: "{失败结果}"
    end
```

#### 流程图

```mermaid
flowchart TD
    START(["入口"]) --> STEP1["{步骤1}\n{文件名}:{行号}"]
    STEP1 --> CHECK{"{判断条件}"}
    CHECK -->|"是"| STEP2["{正常路径}\n{文件名}:{行号}"]
    CHECK -->|"否"| STEP3["{异常路径}"]
    STEP2 --> END(["完成"])
    STEP3 --> END
```

#### 泳道图

```mermaid
flowchart LR
    subgraph "{层级1}"
        direction TB
        A1["{步骤}"]
    end

    subgraph "{层级2}"
        direction TB
        B1["{步骤}"]
        B2["{步骤}"]
    end

    subgraph "{层级3}"
        direction TB
        C1["{步骤}"]
    end

    A1 --> B1
    B1 --> B2
    B2 --> C1
```

#### 场景差异标注

| 维度 | 场景 {N} | 场景 {M} |
|------|---------|---------|
| {差异点} | ... | ... |

#### 核心代码片段

**{描述}** -- `{文件名}:{起始行}-{结束行}`

```{language}
// 提取核心逻辑，省略日志等无关代码
{code}
```

---

## 4. 知识图谱

### 4.1 实体关系图

```mermaid
graph TD
    subgraph "{实体组}"
        E1["{实体1}\n{表名}"]
        E2["{实体2}\n{表名}"]
    end
    E1 -->|"{关系}"| E2
```

### 4.2 状态机图

```mermaid
stateDiagram-v2
    state "{实体}状态" as ES {
        [*] --> S1: "{初始事件}"
        S1: "{状态名}={值}"
        S2: "{状态名}={值}"
        S1 --> S2: "{转换条件}"
        S2 --> S1: "{回滚条件}"
    }
```

### 4.3 调用链图

```mermaid
graph LR
    subgraph "{入口层}"
        E1["{入口}"]
    end

    subgraph "{编排层}"
        O1["{方法}:{行号}"]
        O2{"{路由判断}"}
    end

    subgraph "{操作层}"
        OP1["{操作1}"]
        OP2["{操作2}"]
    end

    subgraph "{基础设施层}"
        I1["{DB/API/FFI}"]
    end

    E1 --> O1 --> O2
    O2 -->|"{条件1}"| OP1
    O2 -->|"{条件2}"| OP2
    OP1 --> I1
    OP2 --> I1
```

### 4.4 数据流图

```mermaid
graph TB
    subgraph "{输入}"
        IN1["{参数1}"]
        IN2["{参数2}"]
    end

    subgraph "{计算}"
        C1["{计算节点}"]
    end

    subgraph "{写入}"
        W1["{写操作}"]
    end

    subgraph "{同步}"
        S1["{同步操作}"]
    end

    IN1 --> C1
    IN2 --> C1
    C1 --> W1
    W1 --> S1
```

---

## 5. 业务规则速查表

| 规则名称 | 规则描述 | 代码位置 | 适用场景 |
|---------|---------|---------|---------|
| {规则名} | {公式/条件/约束} | `{file}:{line}` | 场景 {N} |

---

## 6. 代码核实差异说明

> 基于 {YYYY-MM-DD} 代码阅读

| # | 文档/预期描述 | 实际代码 | 影响 |
|---|-------------|---------|------|
| 1 | {描述} | {实际} | {影响} |

---

## 7. 回归测试检查表

### {图组} 场景

- [ ] {检查项}：{预期行为}

---

<!-- 以下为后端附加章节，前端项目可删除 -->

## B1. 数据库表清单与 ER 图

| 表名 | 操作类型 | 说明 |
|------|---------|------|
| {table} | INSERT / UPDATE | {说明} |

```mermaid
erDiagram
    TABLE_A ||--o{ TABLE_B : "关联关系"
    TABLE_A {
        int id PK
        string name
    }
```

## B2. 表操作矩阵

| 步骤 | 表 | 操作 | 场景 1 | 场景 2 | 行号 |
|------|-----|------|--------|--------|------|
| 1 | {table} | INSERT | Y | N | {line} |

## B3. 表状态扭转明细

### {表名}.{字段名} 状态机

```mermaid
stateDiagram-v2
    [*] --> V1: "{初始}"
    V1: "{字段}={值1} {含义}"
    V2: "{字段}={值2} {含义}"
    V1 --> V2: "{触发条件}"
    V2 --> V1: "{回滚条件}"
```

| 表.字段 | 原值 | 新值 | 触发条件 | 代码位置 |
|---------|------|------|---------|---------|
| {table.field} | {old} | {new} | {condition} | `{file}:{line}` |

## B4. 事务边界与并发控制

| 事务范围 | 包含操作 | 隔离级别 | 失败策略 | 代码位置 |
|---------|---------|---------|---------|---------|
| {描述} | {N 张表/N 步} | {级别} | 回滚/重试/忽略 | `{file}:{line}` |

## B5. SQL / ORM 关键查询清单

```sql
-- {查询名称} | {文件}:{行号}
SELECT ...
FROM {table}
WHERE {conditions};
```
