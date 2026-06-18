# caseflow

> **30-second TL;DR**: A Claude Code plugin that turns AI-assisted development from "luck-based" into "process-driven" — 24 skills + 3 hooks enforce the complete pipeline: requirement analysis → design doc → code orientation → architecture gate → coding standards → commit standards → knowledge sediment. Make AI think before editing, and leave traceable artifacts after.

**What it solves:**
- AI dives straight into code, skipping design / not consulting existing code / not sedimenting knowledge → enforced `design-doc-required` + `pre-implementation-code-orientation` gates
- AI keeps appending methods to god services → `architecture-ddd-lite-fullstack` "new business branch = new focused service" rule
- AI pollutes source comments with change history / old impl recaps → `bugfix-coding-style` bans change-log comments
- Team AI-collaboration experience doesn't accumulate / every newcomer re-hits the same pits → 4-piece knowledge graph (backend / reverse-index / glossary / cross-project)
- AI can't self-comply with commit standards → `hooks/check-git-commit-skill.js` intercepts large changes and enforces the 5-step flow

## Quick start (5-minute trial)

After installing the plugin, open a project in Claude Code and try this flow to feel the rules kick in:

```
You: "Add a refund endpoint for orders."
Claude: (triggers design-doc-required) Let me first confirm the design with you...
        (generates ai-docs/{project}/design/order-refund/order-refund-current.md)
You: Design confirmed.
Claude: (triggers pre-implementation-code-orientation) I will Read these key files first...
        (triggers architecture-ddd-lite-fullstack) Placement decision: new RefundService...
        (triggers coding-standards-common) Naming / function atomicity / comments self-check...
        (starts coding)
You: Commit.
Claude: (triggers git-commit-standards 5-step flow) Generates compliant commit.
```

If you see AI skip any step (e.g., trying to edit code without a design doc), the hook or skill trigger was bypassed — you can say: "you skipped design-doc-required", and AI will return to that skill.

For the full pipeline diagram, see [docs/skill-flow.md](docs/skill-flow.md); the complete skill index lives in [CLAUDE.md](CLAUDE.md#skill-索引).

## Prerequisites

- **Claude Code** ≥ current stable (skill / hook mechanism is based on Claude Code plugin API)
- **Node.js ≥ 18** (hooks/*.js scripts; Claude Code's built-in runtime usually satisfies this)
- **Git ≥ 2.20** (hooks use `git diff --staged --name-status` etc.)

## Documentation language

Skill **frontmatter `description`** (the trigger field Claude reads) is mostly in English to maximize discoverability across LLM training distributions. Skill **body content** is in Chinese, optimized for the Chinese-speaking team that maintains the plugin. This README is bilingual ([README.md](README.md) Chinese, README_en.md English).

PRs welcome for full English translation of SKILL.md bodies if your team needs it.

## Install

In Claude Code, run these three steps:

**Step 1: Register the marketplace** (pointing at the Gitee repository)

```
/plugin marketplace add https://gitee.com/wyoooni/caseflow.git
```

**Step 2: Install the plugin**

```
/plugin install caseflow@caseflow
```

Choose user-scope (recommended) at install time.

**Step 3: Reload**

```
/reload-plugins
```

## Included skills (24 total, grouped by phase)

See [README.md § Included Skills](README.md#包含的-skills) for the complete grouped list, or [CLAUDE.md § Skill Index](CLAUDE.md#skill-索引) for full descriptions.

Brief overview:

- **① Requirement / design analysis** — `solution-review-required` / `design-doc-required` / `bug-doc-required` / `business-logic-orientation`
- **② Pre-implementation orientation** — `pre-implementation-code-orientation` / `doc-index-required`
- **③ Architecture & coding gates** — `architecture-ddd-lite-fullstack` / `coding-standards-common` / `java-coding-standards` / `bugfix-coding-style` (korepos backend rules korepos-backend-service migrated to kpay-daily-plugin)
- **④ Commit & log** — `git-commit-standards` / `daily-work-log`
- **⑤ Knowledge graph** — `backend-knowledge-graph-required` / `reverse-index-required` / `glossary-required` / `cross-project-locator`
- **⑥ Quality loop** — `coding-violation-log` / `arch-lint` / `markdown-writing-standards` / `project-docs-update`
- **⑦ Project initialization** — `init-project-docs` / `generate-project-profile`
- **⑧ Plugin self-maintenance** — `dev-log`

## For maintainers

```bash
# After cloning, run hook unit tests (no third-party deps, just Node's built-in node --test)
cd hooks && npm test

# After editing CLAUDE.md, re-sync AGENTS.md (CI will verify)
node scripts/sync-agents.js

# CI check: verify AGENTS.md is in sync
node scripts/sync-agents.js --check

# Validate cross-skill / cross-section references
node scripts/check-cross-refs.js

# Skill health audit (lengths, references, freshness)
node scripts/audit-skills.js
```

CI (GitHub Actions) runs on push / PR: hook test matrix (Linux/macOS/Windows × Node 18/20/22) + AGENTS.md sync check + cross-references check.

## License

MIT
