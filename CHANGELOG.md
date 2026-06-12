# Changelog

All notable changes to FRAME are documented here.

## [0.14.0] — 2026-06-12

### ⚠️ Breaking Changes

- **`/frame:security`** removed → use `/frame:audit security` or `/frame:audit`
- **`/frame:performance`** removed → use `/frame:audit performance` or `/frame:audit`
- **`/frame:check-deps`** removed → use `/frame:audit deps`
- **`/frame:estimate`** removed → estimates are now per-task fields in plan.md (`Estimate:` field)
- **`/frame:headless`** removed → use `claude -p "/frame:build {feature}"` directly from CLI
- **`/frame:build --parallel`** removed → build reads `Parallel: yes/no` labels from plan.md automatically
- **`/frame:build --review-team`** removed → replaced by 6-panel review in `/frame:review`
- Reports moved: `.planning/reports/security/` and `.planning/reports/performance/` → `.planning/reports/audit/`

### Added

**Workflow V2 — Research → Plan → Build → Review cycle upgraded**

- `/frame:audit` — unified audit command: 12 categories (SEC, PERF, LOGIC, API, DATA, OBS, DEPS, TEST, INFRA, MAINT, A11Y, PRIV), tier-scaled parallelism (S/M/L project sizes), adversarial verification pass (devils-advocate refutes CRITICAL/HIGH findings), universal finding schema with mandatory Evidence field
- `auditor` agent — universal category auditor, receives a category brief, audits one category, returns findings
- `/frame:plan audit [all]` — Mode B: creates fix plan from AUDIT.md findings grouped by file/module
- `/frame:research` — clarification gate (ask 3-5 questions if ambiguous or state assumptions), parallel scouts (codebase-scout + web-scout), chat-driven Decision Log, numbered R/AC requirements for traceability
- `/frame:plan` — Coverage table (every R/AC maps to tasks; uncovered = planning error), `Parallel: yes/no` label on every wave, fails-fast on unanswered Open Questions, reads Decision Log from research.md
- `/frame:build` — adaptive: reads `Parallel:` labels from plan.md; sequential for Parallel:no, worktree subagents for Parallel:yes; fix-mode when STATE has REVIEW_FAILED
- `/frame:review` — 6-panel parallel review on diff (spec compliance, security, performance, business logic, tests, conventions), adversarial verification pass, R/AC traceability table, Completion check
- `devils-advocate` agent — two new modes: Verifier (tries to refute a finding) and Plan Critic (challenges plan for risks before build)
- `/frame:debug` — finding ID entry (`/frame:debug SEC-3` pulls context from AUDIT.md), git archaeology before grep, max-3 ranked hypotheses discipline
- `/frame:debug --deep` — 3 parallel Explore investigators (git-history, code, config)
- `/frame:fast` — hard stop on >30 min scope, one-line summary output, minimal ceremony (only MAP.md + Anti-Patterns)

### Fixed

- `$ARGUMENTS` binding in `/frame:arch` command
- Windows path handling in project file copying (`replace()` → `path.relative()`)
- `dirname()` used correctly instead of `join(dest, '..')`
- Junk files (`.DS_Store`, `Thumbs.db`) filtered when copying templates
- Custom language code input now documented in the language selection prompt
- Duplicate `// 5.` comment labels in update.js
- All agent files: NEVER write STATE.md (Rule 13.1 — STATE.md is owned by orchestrating commands only)
- All STATE.md path references use `.planning/STATE.md` consistently

### Changed

- Commands: 31 → 28 (removed security, performance, check-deps, estimate, headless)
- Agents: 9 → 10 (added `auditor`)
- `update` now shows migration path for orphaned deleted commands (e.g. "frame:security.md → /frame:audit security")

## [0.13.0] — 2026-06-12

### Fixed (P0 — critical)
- Memory, ROADMAP, CONTEXT, specs installed to correct paths (`.planning/memory/`, `.planning/ROADMAP.md`, `docs/specs/`)
- `quality-gate.sh` rewritten to use stdin contract (was reading non-existent `CLAUDE_TOOL_INPUT`)
- All `npx the-frame` references replaced with `npx the-frame-ai`
- Permission rules now use correct `Bash(cmd:*)` syntax
- Playwright MCP written to `.mcp.json` (correct location, not `settings.json`)
- `/frame:rollback` can now execute `git reset --hard` on `frame/checkpoint/*` tags
- Security/perf grep patterns rewritten to POSIX ERE (no PCRE, no brace-globs)
- `/frame:wave-team` uses correct agent names (`security`, `performance-auditor`)
- `init` no longer overwrites user's existing `settings.local.json`
- `config.json` placeholder `{{PROJECT_NAME}}` substituted before write

### Fixed (P1 — high priority)
- `git-safety.sh`: false positives on `-f` substring; added word-boundary checks
- `safety-net.sh`: no longer hard-denies `rm -rf` in commit messages; catches `rm -fr`
- VS Code JSONC settings no longer silently overwritten on parse error
- `update` uses manifest to skip user-modified files; orphan detection added
- Hooks and permissions moved to shared `.claude/settings.json`
- All 31 commands have frontmatter (`description`, `argument-hint`, `allowed-tools`)
- Perf cluster unified: single report path `PERF_REPORT.md`
- `metrics.md` removed (was source of confabulation)
- CI: publish workflow now runs tests before publish; version/tag check added
- Agent model IDs use aliases (`sonnet`/`opus`); phantom `Agent` tool removed
- Agent `name` field added to all 9 agents

### Changed
- Commands consolidated: 43 → 31
- Memory files: 8 → 4 (`context.md`, `learnings.md`, `conventions.md`, `dependencies.md`)

## [0.12.0] — 2026-05-28

### Added
- REFRESH mode for `/frame:init` — re-run on existing projects without full reinstall
- Manifest-based update: tracks installed file hashes to detect user modifications

## [0.11.4] — 2026-05-25

### Added
- `/frame:test-plan` — manual user-acceptance checklist command
- `/frame:wave-team` — parallel review with conventions and tests agents

## [0.10.9] — 2026-05-21

### Added
- `/frame:verify-ui` — UI verification command with Playwright MCP integration
- Frontend project detection during init (adds Playwright MCP to `.mcp.json`)
