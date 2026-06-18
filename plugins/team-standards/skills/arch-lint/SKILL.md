---
name: arch-lint
description: "当用户要求「架构检查」「lint」「检测架构违规」时触发；当对 Flutter 项目的 presentation/domain/data/infrastructure 层代码执行 Edit/Write 后自动触发一次轻量检查。"
---

# 架构违规检测

## 触发场景

用户说以下任意一种时，**必须**调用本 skill：
- 架构检查 / arch lint / 检测违规
- 帮我看看有没有分层违规
- 检查 presentation 层是否有直接 SQL

**自动触发**：当对 Flutter 项目的 `lib/` 下文件执行 Edit/Write 后，对改动文件所在层进行轻量检查。

---

## 检测规则

### 规则 1：presentation 层禁止直接 SQL

**检测范围**：`lib/**/presentation/**`
**违规特征**：
- `rawQuery`、`.insert(`、`.delete(`、`.update(`、`.query(`
- 直接导入 `sqflite`、`sqlite` 相关包
- 直接持有 `Database` 类型引用

**正确做法**：通过 UseCase 或 Facade 间接访问数据

### 规则 2：presentation 层禁止直接 HTTP

**检测范围**：`lib/**/presentation/**`
**违规特征**：
- `dio.get`、`dio.post`、`dio.put`、`dio.delete`
- `http.get`、`http.post`
- 直接导入 `package:dio` 或 `package:http`

**正确做法**：通过 UseCase 调用 Repository

### 规则 3：domain 层禁止引入技术框架

**检测范围**：`lib/**/domain/**`
**违规特征**：
- `import 'package:sqflite`
- `import 'package:dio`
- `import 'package:flutter/`（允许 `foundation.dart` 用于 `@immutable` 等纯注解）

**正确做法**：domain 层只依赖 Dart 核心库和自身定义的接口

### 规则 4：金额禁止使用 double

**检测范围**：`lib/**/domain/**`、`lib/**/application/**`
**违规特征**：
- 变量名含 `amount`、`price`、`total`、`fee`、`cost`、`balance` 且类型为 `double`
- **需 AI 语义判断**：不是所有 double 都违规，只有金额相关字段

**正确做法**：金额统一用 `int`，单位：分

### 规则 5：DAO 不可被 presentation 直接调用

**检测范围**：`lib/**/presentation/**`
**违规特征**：
- 导入路径含 `dao/` 或 `infrastructure/db/`
- 直接持有 `*Dao` 类型引用

**正确做法**：presentation → UseCase → Repository → Datasource → DAO

---

## 执行流程

### 全量检查模式（用户主动触发）

```mermaid
flowchart TD
    A([收到架构检查指令]) --> B[确认项目包含 lib/ 目录]
    B --> C[按规则 1-5 逐条扫描]
    C --> D{发现违规?}
    D -->|是| E[输出违规报告表格]
    D -->|否| F[输出 "架构检测通过，无违规"]
    E --> G[给出修复建议]
```

### 轻量检查模式（自动触发）

仅检查当前改动文件所在层对应的规则：
- 改了 `presentation/` 下文件 → 检查规则 1、2、5
- 改了 `domain/` 下文件 → 检查规则 3、4
- 改了其他层 → 不自动触发

---

## 输出格式

### 违规报告

| # | 规则 | 文件 | 行号 | 违规代码 | 修复建议 |
|---|---|---|---|---|---|
| 1 | {规则名} | {文件路径} | {行号} | {代码片段} | {建议} |

### 统计摘要

```
检查文件数：{N}
违规数：{N}（严重 {N} / 警告 {N}）
```

- **严重**：规则 1-3、5（分层红线）
- **警告**：规则 4（需人工确认是否为金额字段）

---

## 与其他 Skill 的关系

- **不触发** `design-doc-required`（本 skill 属于检查类，非开发类）
- 全量检查结果可作为 `business-logic-orientation` 的输入（了解哪些模块有架构债务）
- 与 `java-coding-standards` 平行：一个管 Java 代码质量，一个管 Flutter 架构分层
