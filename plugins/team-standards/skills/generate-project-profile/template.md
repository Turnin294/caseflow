# {项目名} 项目画像

> 自动生成于 {YYYY-MM-DD HH:mm} | 生成工具：{tool_name}
> 项目路径：`{project_path}`
> 服务注册名称：`{service_name}`
>
> 本画像由 3 份文件组成，按消费阶段物理隔离，避免无关信息干扰 LLM 产生幻觉。
>
> | 文件 | 消费阶段 | 内容 |
> |------|---------|------|
> | 本文件 | 每次 | 项目概述 + 技术栈 |
> | [business-context.md](business-context.md) | 需求分析 / 方案设计 | 数据模型、业务能力、流程、约束、接口、服务调用、事件 |
> | [coding-conventions.md](coding-conventions.md) | 代码生成 | 编码约定、配置概要 |

---

## 1. 项目概述

- **项目名称**：{name}
- **服务注册名称**：{spring.application.name / 服务发现中的名称}
- **项目用途**：{一句话描述核心业务}
- **构建工具**：{Maven / Gradle / npm / pnpm / Go Modules / ...}
- **语言与版本**：{Java 17 / TypeScript 5.x / Go 1.21 / ...}
- **模块列表**：

| 模块名 | 职责 |
|--------|------|
| {module-a} | {一句话说明} |
| {module-b} | {一句话说明} |

---

## 2. 技术栈

| 分类 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 框架 | Spring Boot | 3.2.x | Web 应用框架 |
| ORM | MyBatis-Plus | 3.5.x | 数据访问 |
| 缓存 | Redis | 7.x | 分布式缓存 |
| 消息队列 | RabbitMQ | 3.x | 异步消息 |
| ... | ... | ... | ... |
