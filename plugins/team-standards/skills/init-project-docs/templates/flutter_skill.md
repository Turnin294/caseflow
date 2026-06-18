# Skill: Flutter 开发规范

> **AI 处理任何 Flutter 代码任务前必读此文档。**

---

## 分层与职责

| 层 | 允许 | 禁止 |
|---|---|---|
| presentation | 页面展示、UI 交互、调用 usecase | 写 SQL、调 HTTP、写业务规则 |
| application | 编排业务流程、调用 domain 接口 | 直接操作 DB、写 UI 逻辑 |
| domain | 业务实体、状态机、规则、Repository 接口 | import sqflite/dio/flutter |
| data | 实现 Repository、调用 DAO/HTTP client | 写业务规则 |
| infrastructure | SQLite 连接、HTTP 客户端、设备驱动 | 写任何业务逻辑 |

## 依赖方向

```
presentation → application → domain ← data → infrastructure
```

## 命名速查

| 类型 | 命名 | 位置 |
|---|---|---|
| DAO | `{Module}Dao` | `infrastructure/db/dao/` |
| LocalDatasource | `{Module}LocalDatasource` | `data/local/` |
| RemoteDatasource | `{Module}RemoteDatasource` | `data/remote/` |
| Repository 接口 | `{Module}Repository` | `domain/repository/` |
| Repository 实现 | `{Module}RepositoryImpl` | `data/repository_impl/` |
| UseCase | `{Verb}{Object}UseCase` | `application/usecase/` |
| 业务规则 | `{Module}Rule` | `domain/rule/` |
| Entity | `{Module}` | `domain/entity/` |

## AI 代码生成规则

**禁止出现：**
- Widget 内的 `rawQuery`/`db.insert`/`db.delete`/`db.update`
- Widget 内的 `dio.get`/`dio.post`/`http.get`
- `domain/` 层的 `import 'package:sqflite'` 或 `import 'package:dio'`
- 金额用 `double` 类型（改用 `int`，单位：分）
- 状态用整数魔法数字（改用枚举）

## 当前重构状态

| 模块 | DAO | Repository | UseCase | 状态 |
|---|---|---|---|---|
| {模块} | {✅/❌} | {✅/❌} | {✅/❌} | {状态} |
