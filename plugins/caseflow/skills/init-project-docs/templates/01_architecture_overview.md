# 架构总览

> 最后更新：{YYYY-MM-DD}

<!-- AI 生成提示：扫描项目目录结构，识别分层模式（MVC/DDD/Clean Architecture） -->

---

## 项目分层结构

<!-- 根据实际项目类型选择适用的分层描述 -->

### 方式 A：Spring Boot 后端（Controller-Service-Mapper）

```
src/main/java/
├── controller/         # API 层：参数校验、结果返回
├── service/            # 业务逻辑层
│   ├── I*Service.java  # 接口
│   └── impl/           # 实现
├── mapper/dao/         # 数据访问层
├── entity/model/       # 数据实体
├── dto/                # 传输对象
├── config/             # 配置类
└── common/             # 通用工具
```

### 方式 B：Flutter 移动端（Clean Architecture）

```
lib/
├── presentation/       # UI 层：pages/widgets/state
├── application/        # 应用层：usecase/facade
├── domain/             # 领域层：entity/rule/repository接口
├── data/               # 数据层：repository实现/datasource
└── infrastructure/     # 基础设施：db/network/device
```

### 方式 C：Vue 前端

```
src/
├── views/              # 页面
├── components/         # 通用组件
├── composables/        # 业务 Hook
├── store/              # 全局状态
├── api/                # 接口封装
└── utils/              # 工具函数
```

---

## 依赖方向

{根据项目实际情况描述层间依赖规则}

---

## 服务清单（微服务项目适用）

| 服务 | 端口 | 职责 | 依赖服务 |
|---|---|---|---|
| {service-name} | {port} | {职责} | {依赖} |

<!-- AI 生成提示：扫描 application.yml/bootstrap.yml 获取端口和服务名 -->

---

## 跨端/跨服务数据流向

{描述数据在各层/服务之间的流动方式}

---

## 全局约定

| 约定 | 规则 |
|---|---|
| API 响应格式 | {格式} |
| 金额 | {规则} |
| 时间 | {规则} |
