# 数据模型总表

> 最后更新：{YYYY-MM-DD}
> 新增表/字段必须在此登记。

<!-- AI 生成提示：扫描 Entity/Model 类 + Mapper XML/注解提取表结构 -->
<!-- Flutter 项目：扫描 table_definitions/ 或 DAO 中的建表语句 -->

---

## 数据库概况

| 数据库 | 类型 | 用途 |
|---|---|---|
| {db_name} | {PostgreSQL/MySQL/SQLite} | {用途} |

---

## {模块名} 相关表

### {表名}

| 字段 | 类型 | 说明 | 约束 |
|---|---|---|---|
| id | {BIGINT/INTEGER} PK | 主键 | 自增 |
| {field} | {type} | {说明} | {约束} |
| create_time | {TIMESTAMP/INTEGER} | 创建时间 | NOT NULL |
| update_time | {TIMESTAMP/INTEGER} | 更新时间 | NOT NULL |

### 状态机（如有）

| 状态值 | 枚举/常量 | 含义 | 可执行操作 |
|---|---|---|---|
| {value} | {enum} | {含义} | {允许的状态流转} |
