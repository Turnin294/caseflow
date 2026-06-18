# Skill: Vue 开发规范

> **AI 处理任何 Vue 代码任务前必读此文档。**

---

## 分层职责

| 层 | 职责 | 禁止 |
|---|---|---|
| views/ | 页面布局和路由入口 | 写业务逻辑、直接调 API |
| components/ | 纯 UI 组件 | 包含业务逻辑 |
| composables/ | 业务 Hook（逻辑单元） | 直接操作 DOM |
| store/ | 全局状态管理 | 包含 UI 逻辑 |
| api/ | Axios 封装、接口定义 | 包含业务规则 |

## 命名规范

| 类型 | 规范 | 示例 |
|---|---|---|
| 页面 | PascalCase | `OrderList.vue` |
| 组件 | PascalCase | `OrderCard.vue` |
| Composable | `use` 前缀 | `useOrderList.ts` |
| Store | `{module}Store` | `orderStore.ts` |
| API 文件 | `{module}Api` | `orderApi.ts` |

## API 调用规范

- 所有 HTTP 请求必须通过 `api/` 目录封装
- 禁止在 `views/` 或 `components/` 中直接调用 axios
- 接口返回值统一解构：`const { data } = await orderApi.getList(params)`
