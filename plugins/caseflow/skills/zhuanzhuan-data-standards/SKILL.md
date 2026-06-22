---
name: zhuanzhuan-data-standards
description: "转转数据存储规范（MySQL/TiDB 数据库设计 + Redis 缓存使用），独立于编码层的数据领域规范。Use when 设计库表/写 DDL、写 SQL/Mapper、设计索引、用 Redis 缓存时。覆盖 MySQL 基础规范（字符集 utf8mb4 / 禁存储过程触发器外键 / 禁存大文件明文密码）、库表设计（dbzz_xxx / t_xxx 命名 / InnoDB / DECIMAL 金额 / 禁保留字 / 字段数与长度控制）、索引设计（idx_/uniq_ 命名 / 主键规则 / 单表≤6 索引·单索引≤4 字段 / 最左前缀 / 区分度 / 索引禁忌）、SQL 优化（拆大 SQL / 禁 SELECT* / OR 改 IN / UNION ALL / 隐式转换 / Limit 分页优化）、DML 限制（insert/update/delete 须带索引条件·影响≤2 万行 / 禁无 where 更新删除）、Redis 缓存（冷热分离 / 业务隔离 / 必设超时 / 大文本压缩 / 禁 keys 正则 / 数据结构选型 / 谨慎全量 HGETALL·SMEMBERS）。与 finance-coding-standards 的金融 SQL 条款互补（本 skill 是全公司 DBA 通用底，金融部门 SQL 在其上叠加）。"
---

# 转转数据存储规范（MySQL/TiDB + Redis）

> 数据领域独立规范，与编码层 skill 正交。涉及库表设计 / SQL / 索引 / 缓存时必须遵守。
>
> 与 [[finance-coding-standards]] 的 SQL/数据库条款互补：本文件是**全公司 DBA 通用底**，金融部门 SQL 条款（禁子查询 / 最多两表关联 / 状态变更带原状态等）在其上叠加，冲突时金融优先。
> 编码层（Mapper/DAO 怎么写）见 [[zhuanzhuan-coding-standards]] 的 MyBatis-Plus 约定。

---

## 1. MySQL 基础规范（强制）

- 数据库字符集默认 `utf8mb4`
- 禁止线上生产做数据库压力测试；禁止测试/开发/本机直连线上生产库
- 禁止在数据库存储明文密码；禁止存储图片、文件等大数据
- 禁止业务日志实时存库（存日志文件，统计结果再入 MySQL）
- 禁止线上核心业务用存储过程、视图、触发器、Event、InnoDB 外键约束（业务逻辑与 DB 耦合，且 MySQL 这些特性有严重 BUG）
- 推广活动前提前通知 DBA 做服务和访问评估

---

## 2. 库表设计（强制）

- 库名/表名/字段名用**小写字母 + 下划线**分割；库名 `dbzz_xxx`，表名 `t_xxx`
- 引擎默认 **InnoDB**，新业务不支持 MyISAM
- 所有表和字段**必须有备注**，说明含义
- 货币金额或精度敏感数据**必须用 `DECIMAL`**，禁止 `FLOAT`/`DOUBLE`
- 库名/表名/字段名**禁止用 MySQL 保留字**（date、like、desc、return、status 慎用等）
- 控制字段数：单表上限 20~50（按存储体积，纯 INT 不超 50 / VARCHAR 不超 20 量级）
- 字段长度只分配真正需要的空间（过大定义列消耗更多内存，内存临时表排序时尤其糟糕）

---

## 3. 索引设计（强制）

> 基本原则：索引不是越多越好，能不加就不加——过多索引严重降低写入/更新效率，带来读写冲突和死锁。

- 索引命名小写：普通索引 `idx_字段名[_字段名]`，唯一索引 `uniq_字段名[_字段名]`
- 表**必须有主键**，推荐独立于业务的 `AUTO_INCREMENT` 列或全局 ID 生成器；禁止多字段联合主键；禁止 UUID/MD5/HASH 等无规则值做主键（效率极差）
- 数量控制：单表索引 **≤6 个**，单索引字段 **≤4 个**；字符串用前缀索引，前缀长度 ≤10 字符
- 联合索引字段顺序：区分度最大（去重后个数最多）的放前面；遵循**最左前缀**——`(a,b,c)` 覆盖 `(a)`/`(a,b)`/`(a,b,c)`
- 需加索引的场景：`ORDER BY`/`GROUP BY`/`DISTINCT` 字段、`UPDATE`/`DELETE` 的 `WHERE` 条件、`JOIN` 字段
- 线上禁用外键（高并发易死锁）；慎用 `FORCE INDEX`（须先与 DBA 沟通测试）
- **索引禁忌**：不用 `%` 前导查询（`like '%ab'`）、不用负向查询（`not in`/`not like`/`<>`）、不在低区分度列（如性别）建索引、不在索引列做数学/函数运算（`id+1>10001` 不走索引，`id>10001-1` 走索引）

---

## 4. SQL 优化（强制）

- 少用大 SQL，复杂 SQL 拆成多条简单 SQL（一条 SQL 只在一个 CPU 运算；简单 SQL 缓存命中率高、锁表时间短、利用多核）
- 减少 MySQL 端数学运算和逻辑判断，避免 `md5()`、`order by rand()`
- 尽量少用 `SELECT *`，只取需要的列（避免无谓 IO/CPU/网络开销）
- `WHERE` 中同字段 `OR` 改写为 `IN()`，IN 包含值 ≤200 个，**IN 里禁止子查询**
- 过滤记录合并且不去重时，`UNION` 改 `UNION ALL`
- 减少拼接 SQL，用预编译语句（降低 SQL 注入概率）
- `WHERE` 非等值条件（`IN`/`BETWEEN`/`<`/`<=`/`>`/`>=`）会导致用不了联合索引后续字段，注意避免
- `WHERE` 比较时字段类型与传入值**必须类型一致**，避免隐式转换（`code` 是 varchar 时 `where code=10001` 不走索引，`where code='10001'` 走索引）
- **Limit 分页优化**（`limit 10000,10` 偏移越大越慢）：
  - 方式一（游标）：`WHERE id >= ? limit 11`
  - 方式二（子查询定位）：`WHERE id >= (select id from t limit 10000,1) limit 10`
  - 方式三（延迟关联）：`INNER JOIN (SELECT id from t limit 10000,10) USING(id)`

---

## 5. DML 限制（强制）

- **insert**：须指定具体字段列表，禁 `select *`；`insert...select` 必须带 `where`；not null 字段禁加 null；`values` 单次 ≤20000 行；禁 `load data`
- **update / delete**：**禁止无 where 条件**更新删除；`where` 条件必须包含索引字段；单条 SQL 影响行数 **≤20000 条**
- **replace**：须指定字段列表，禁 `select *`；`replace...select` 必须带 `where`；not null 字段禁加/改 null

---

## 6. Redis 缓存规范（强制）

- **冷热分离**：只把高频热数据（QPS > 5000）放 Redis；低频冷数据用 MySQL/Wtable/WList/MongoDB 等磁盘存储（Redis 全内存，成本昂贵）
- **业务隔离**：不相关业务数据不放同一实例，新业务申请独立实例（单线程处理，隔离减少互相影响、避免单实例内存膨胀）
- **必设超时时间**：缓存用途的 Key 一定设 TTL（否则一直占内存直到打满），TTL 长短按业务评估而非越长越好
- **大文本压缩**：超过 500 字节的大文本压缩后存（否则高访问量打满网卡引发雪崩）
- **禁止线上 `KEYS` 正则匹配**（O(N) 阻塞，高 QPS 直接崩 Redis），用 `SCAN` 代替
- **消息队列/分布式锁优先用专用服务**：消息队列用 zzmq、分布式锁用 zzlock，而非自己用 Redis List/RPOPLPUSH 造
- **谨慎全量操作集合**：`HGETALL`/`SMEMBERS` 在大集合上 O(N) 急剧降效、打满网卡；field 多时拆多个 Hash，或大部分是全取时序列化为 String 存
- **按场景选数据结构**：String（K-V/计数）、Hash（对象多属性）、List（消息队列/关注列表）、Set（推荐/去重）、Sorted Set（排行榜）、Bitmap/HyperLogLog/geo（特定场景）

---

## 违规速查

| 错误写法 | 正确写法 |
|----------|----------|
| 金额字段用 `FLOAT`/`DOUBLE` | `DECIMAL`（金额精度敏感） |
| 表名 `Order` / 字段 `status` 用保留字 | 小写下划线、避开保留字 |
| 多字段联合主键 / UUID 主键 | `AUTO_INCREMENT` 或全局 ID |
| 单表建 10 个索引 | ≤6 个，单索引 ≤4 字段 |
| `like '%关键词'` / `not in (...)` | 避免前导 % 和负向查询 |
| `where code=10001`（code 是 varchar） | `where code='10001'` 类型一致 |
| `limit 100000,10` 深分页 | 游标 / 延迟关联分页 |
| `update t set x=1`（无 where） | 必带 where + 索引字段，≤2 万行 |
| 大集合 `HGETALL` | 拆 Hash 或序列化为 String |
| Redis Key 不设 TTL | 缓存用途必设超时 |
| 线上 `KEYS user:*` | 用 `SCAN` |

