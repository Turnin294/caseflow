# doc-index-required Skill 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增 `doc-index-required` skill，在编写任何 `docs/` 下文档前强制读取文档索引，分析内容边界，避免重复与混乱，写完后半自动更新索引。

**Architecture:** 新建独立 skill 目录 `skills/doc-index-required/`，编写 `SKILL.md` 定义触发时机与执行流程；同步更新 `CLAUDE.md` 索引表与 `README.md` skill 列表，保持项目文档一致。

**Tech Stack:** Markdown、Claude Code Plugin Skill 机制（YAML frontmatter + Markdown 正文）

---

## 文件清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 新建 | `skills/doc-index-required/SKILL.md` | Skill 主文件 |
| 修改 | `CLAUDE.md` | Skill 索引表追加新行 |
| 修改 | `README.md` | 插件描述 + Skills 表追加新行 |

---

### Task 1：创建 `skills/doc-index-required/SKILL.md`

**Files:**
- Create: `skills/doc-index-required/SKILL.md`

- [ ] **Step 1：创建目录及文件，写入以下完整内容**

```markdown
---
name: doc-index-required
description: Use when about to write, create, or edit any documentation file under docs/. You MUST invoke this skill BEFORE writing any doc content. This includes design docs, bug analysis, API docs, changelogs, and any other markdown files under the docs/ directory. Do NOT invoke for updates to index files themselves (docs/INDEX.md, docs/*/INDEX.md).
---

# 文档索引优先原则

在编写或创建任何 `docs/` 目录下的文档之前，**必须先读取文档索引**，分析现有内容边界，再决定新建还是补充到已有文档。

## 不适用场景

以下情况**不触发**本 skill：
- 修改非 `docs/` 目录下的文件（代码、配置等）
- 对索引文件本身的更新（`docs/INDEX.md`、`docs/*/INDEX.md`）

---

## 执行流程

### 第一步：读取总索引

读取项目根目录下的 `docs/INDEX.md`。

**若 `docs/INDEX.md` 不存在：**
扫描 `docs/` 下的子目录，向用户展示以下初始化模板并请求确认后写入：

```markdown
# 文档索引

| 目录 | 说明 |
|------|------|
| [（子目录名）/](（子目录名）/INDEX.md) | （请补充说明） |
```

**若存在：** 读取并理解各子目录的覆盖范围。

---

### 第二步：读取目标子目录索引

根据本次要写的文档所在子目录（如 `docs/design/`、`docs/bug/`），读取对应的 `docs/{subdir}/INDEX.md`。

**若子目录索引不存在：**
扫描该子目录下现有的 `.md` 文件（排除 `INDEX.md`），向用户展示以下初始化模板并请求确认后写入：

```markdown
# {subdir} 文档索引

## {现有文档标题}
- 文件：`{文件名}.md`
- 摘要：（请补充）
- 大纲：（请补充）
```

若子目录下暂无文档，则初始化为空索引：

```markdown
# {subdir} 文档索引

（暂无文档）
```

**若存在：** 读取并理解已有文档的标题、摘要、大纲。

---

### 第三步：分析内容边界

基于索引内容，判断本次要写的内容：

| 判断项 | 处理方式 |
|--------|---------|
| 是否已有完全对应的文档？ | 有 → 提示用户考虑直接补充到已有文档 |
| 是否与现有文档存在内容重叠？ | 有 → 明确告知重叠范围，建议合并或区分边界后再写 |
| 内容是否全新、无重叠？ | 新建文档，继续执行 |

分析结果必须向用户明确说明，获得确认后再写文档。

---

### 第四步：执行文档写作

按第三步的分析结论执行文档写作。

---

### 第五步：半自动更新索引

文档写作完成后，**生成索引更新内容**，向用户展示并请求确认后写入。

**新增文档时**，在子目录索引末尾追加：

```markdown
## {新文档标题}
- 文件：`{新文件名}.md`
- 摘要：{一句话描述}
- 大纲：{二级标题1} / {二级标题2} / ...
```

同时检查总索引 `docs/INDEX.md` 中是否已有该子目录条目：
- 已有 → 不修改总索引
- 没有 → 在总索引表中追加该子目录行，一并展示给用户确认

**修改已有文档时**，更新子目录索引中对应条目的摘要和大纲（如有变化）。

---

## 索引文件格式参考

### `docs/INDEX.md`（总索引）

```markdown
# 文档索引

| 目录 | 说明 |
|------|------|
| [design/](design/INDEX.md) | 功能设计文档 |
| [bug/](bug/INDEX.md) | Bug 分析与修复记录 |
| [api/](api/INDEX.md) | API 接口文档 |
```

### `docs/{subdir}/INDEX.md`（子目录索引）

```markdown
# {subdir} 文档索引

## 文档标题
- 文件：`文件名.md`
- 摘要：一句话描述文档内容
- 大纲：背景 / 根因分析 / 解决方案 / 验证方式
```
```

- [ ] **Step 2：验证文件内容**

确认以下各项：
- frontmatter 中 `name: doc-index-required` 拼写正确
- `description` 包含 "MUST invoke" 触发语言
- 不适用场景明确排除了索引文件自身（防止递归触发）
- 五个执行步骤完整，顺序与设计文档一致

- [ ] **Step 3：提交**

```bash
git add skills/doc-index-required/SKILL.md
git commit -m "feat(skill): 新增 doc-index-required skill

编写任何 docs/ 目录下文档前，强制读取总索引与子目录索引，
分析内容边界，避免重复与混乱；写完后半自动更新索引。
不适用于索引文件本身的更新，防止递归触发。

Author: 张凯"
```

---

### Task 2：更新 `CLAUDE.md` Skill 索引

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1：在 Skill 索引表末尾追加新行**

在 `CLAUDE.md` 的 Skill 索引表中，找到最后一行（`java-coding-standards` 行），在其后追加：

```markdown
| `doc-index-required` | `skills/doc-index-required/` | 写文档前读取总索引与子目录索引；分析内容边界；半自动更新索引 | 文档、docs、写文档、索引、重复内容 |
```

- [ ] **Step 2：验证索引表格式**

确认表格四列对齐，新行格式与已有行一致，无多余空格。

- [ ] **Step 3：提交**

```bash
git add CLAUDE.md
git commit -m "docs(claude): 更新 Skill 索引，追加 doc-index-required

新增 doc-index-required 条目，补充覆盖范围与关键词列，
保持 CLAUDE.md 索引与实际 skill 文件同步。

Author: 张凯"
```

---

### Task 3：更新 `README.md`

**Files:**
- Modify: `README.md`

- [ ] **Step 1：更新插件顶部描述**

将 `README.md` 第 3-8 行的插件功能列表，在末尾追加新条目：

```markdown
- **文档索引优先约束**（编写任何文档前读取索引，分析内容边界，避免重复，写完后半自动更新索引）
```

- [ ] **Step 2：在 Skills 表追加新行**

在"包含的 Skills"表格的 `git-commit-standards` 行后追加：

```markdown
| `doc-index-required` | 编写/创建 `docs/` 下任何文档时 | 读取总索引与子目录索引，分析内容边界，避免重复；写完后半自动更新索引 |
```

- [ ] **Step 3：验证**

确认描述列表与 Skills 表均已更新，表格格式正确。

- [ ] **Step 4：提交**

```bash
git add README.md
git commit -m "docs(readme): 新增 doc-index-required skill 说明

在插件功能描述和 Skills 表中补充 doc-index-required，
说明触发时机与作用，保持 README 与实际 skill 同步。

Author: 张凯"
```
