# THE Frame

FRAME — Framework for AI-Assisted Solo Development

## What is FRAME?

**FRAME (Framework for AI-Assisted Solo Development)** is a framework for solo developers building products with Claude Code. It turns chaotic AI-assisted development into a predictable process — from idea to deploy — with memory, structure, and protection against mistakes.

If you're building a product alone with Claude Code and want to work like a team — FRAME is for you.

## What problems does FRAME solve?

| Problem | What FRAME provides |
|---------|-------------------|
| Losing context between sessions | Project memory and automatic state dump on session start |
| Chaos in tasks and priorities | 6-phase workflow: Research → Plan → Build → Review → Ship → Reflect |
| Fear of breaking something important | Safety hooks block destructive commands before they run |
| Repetitive routine tasks | 31 ready-made commands for the full development cycle |
| Waiting for one feature to finish before starting the next | `/frame:parallel` — each feature in its own worktree, `/frame:integrate` merges them back with quality gates |
| Slow, one-by-one fixes after review | `/frame:fix` — closes review findings in parallel, one fixer per file |
| Complex features with dependencies | Parallel subagents for independent tasks (wave-based planning) |
| No structure for solo work | Roadmap, STATE.md, MAP.md — always know where you are and what's next |
| Shipping code with security holes | `/frame:audit` — unified security, performance, and dependency audit before deploy |

## How to work with FRAME

```
Research → Plan → Build → Review → Ship → Reflect
```

Each session is one cycle. Start with `/frame:daily`, end with `/frame:ship`.

**Research** — understand before you build
Run `/frame:research <topic>` — Claude explores the codebase and external sources, asks clarifying questions, builds context, and stays available for a chat-driven decision log.

**Plan** — break it into tasks
`/frame:plan <feature>` turns research into a concrete task list with wave grouping and `Parallel: yes/no` labels.
`/frame:plan audit` creates a fix plan from the latest audit report.

**Build** — implement
`/frame:build` handles two kinds of parallelism automatically, no flags. **Between features**: if another feature is already being built, build offers to set it up in its own git worktree — you never call `/frame:parallel` by hand. **Within a feature**: it reads the `Parallel:` labels from plan.md and runs independent wave tasks concurrently. Stuck — `/frame:unstuck`. Found a bug — `/frame:debug`.

**Review** — check before deploying
`/frame:review` runs automated checks and a 6-panel review (spec compliance, security, performance, business logic, tests, conventions) on the diff. FAIL findings are verified adversarially in parallel.
If review requests changes, `/frame:fix` closes the findings in parallel — one fixer subagent per file, light findings skip the TDD ceremony, one quality-gate run at the end.

**Ship** — deploy and record
`/frame:ship` commits, optional push/PR, and updates project memory.

**Reflect** — learn and improve
`/frame:retrospective` after deploy updates metrics and captures patterns for future sessions.

## Examples

### New feature: add Google authentication

```
/frame:daily
# → see current project status and what's planned

/frame:research "Google OAuth"
# → Claude asks 2-3 clarifying questions, then studies the codebase:
#   how current auth works, what patterns are already used, what needs to be added
#   → research.md with Requirements (R1, R2...) and Acceptance Criteria (AC1, AC2...)

/frame:plan "Google OAuth"
# → get a concrete task list with wave grouping:
#   Wave 1 (Parallel: yes): configure credentials, add callback route
#   Wave 2 (Parallel: no): connect to sessions (depends on Wave 1)
#   Wave 3 (Parallel: yes): add UI button, write integration tests

/frame:checkpoint
# → save a restore point — if something goes wrong, use /frame:checkpoint rollback

/frame:build
# → reads Parallel: labels from plan.md
#   Wave 1: runs its tasks concurrently (file-disjoint, shared tree)
#   Wave 2: runs sequentially (depends on Wave 1 output)

/frame:review
# → automated checks + 6-panel review on the diff (spec compliance, security, performance, tests, conventions, business logic)
# → every requirement and AC traced to implementation

/frame:ship
# → commit, optional push/PR, project memory updated
```

### Two features in parallel: auth and billing

```
# Terminal 1 (main) — first feature builds right here, no ceremony:
/frame:research auth
/frame:plan auth
/frame:build auth         # main is your main line — builds here

# Terminal 1 — start a SECOND feature while auth is still cooking:
/frame:research billing
/frame:plan billing
/frame:build billing
# → build sees auth is in flight and offers:
#   "⚠️ auth is already being built. Set up an isolated worktree for billing? [Y/n]"
# → Y: creates worktree ../project-billing + branch, checks file overlaps, registers on the board
#   "Build it there: cd ../project-billing && claude → /frame:build billing"
# You never type /frame:parallel — build routes it for you.

# Terminal 2:
cd ../project-billing && claude
/frame:build billing      # builds in isolation
/frame:review

/frame:parallel status    # from main — see the board anytime
# → BOARD: billing BUILD 4/7 tasks  (auth lives in main, the base)

# When both features pass review (auth in main, billing in its worktree):
/frame:integrate
# → main is the base (carries auth); merges billing's branch into integrate/{date}
# → full quality gates after EVERY merge
# → cross-feature review of the combined diff (module interactions, config conflicts)
# → per-feature learnings merged into shared memory
# → report + "ready to ship"

/frame:ship                      # from the integration branch
/frame:parallel stop auth        # cleanup worktrees
/frame:parallel stop billing
```

### Bug: users can't log in after password reset

```
/frame:daily
# → restore context, see the bug is already in the plan or add it

/frame:debug "login after reset"
# → git archaeology first (git log -15 -- relevant files)
# → max 3 ranked hypotheses, checks cheapest first
# → you get a confirmed root cause with specific location in code

# If the cause is found immediately:
/frame:checkpoint                        # restore point before the fix
/frame:fast "fix: invalidate old session after password reset"
# → Claude makes a targeted fix, writes a regression test, prints one-line summary

# If the cause is unclear — go deeper:
/frame:debug --deep
# → 3 parallel investigators: git-history, code, config
#   analyzes git history, finds the commit that broke the behavior (5-why analysis)

/frame:checkpoint
/frame:fast "fix: ..."                   # fix the found cause

/frame:review
# → confirm the fix didn't break other login scenarios

/frame:ship
```

### Audit: find issues before launch

```
/frame:daily
# → briefing shows: "Audit: ⚠️ never run" — time to fix that

/frame:audit
# → detects project size (S/M/L), launches category agents in parallel:
#   SEC: OWASP Top 10, secrets, auth, CORS
#   PERF: N+1 queries, memory leaks, cache, bundle
#   DEPS: vulnerabilities, outdated packages
#   LOGIC, DATA, OBS, TEST, INFRA, MAINT, A11Y, PRIV
# → verification pass: devils-advocate tries to REFUTE CRITICAL/HIGH findings
# → AUDIT.md saved to .planning/reports/audit/{date}/AUDIT.md

# Targeted scans:
/frame:audit security           # security only
/frame:audit performance        # performance only
/frame:audit deps               # dependencies only
/frame:audit quick              # top 4 categories (SEC, PERF, DEPS, LOGIC)

# After audit, create a fix plan:
/frame:plan audit
# → reads AUDIT.md, groups findings into tasks by file/module
# → Wave 1: CRITICAL findings, Wave 2: HIGH findings

/frame:build
# → implements fix tasks

/frame:ship
# → security check passes, commit and push
```

### UI verification: confirm the interface works

```
/frame:build
# → Claude implements the task, says "done"

/frame:verify-ui
# → opens browser via Playwright MCP, takes a screenshot
# → compares with the task description
# → PASS: interface matches expectations
# → FAIL: describes exactly what's wrong and where to look

# If something is wrong:
/frame:fast "fix: button not showing on mobile"
/frame:verify-ui
# → re-check after the fix
```

The command only **verifies** — it doesn't auto-fix. If it finds a problem, it describes it precisely: which element, what behavior, what was expected.

**Automatic check**: in `/frame:build`, `/frame:fast`, and `/frame:debug` — if the task touches UI files (`.tsx`, `.vue`, `.css`, `component`, `page`) — browser check runs automatically after quality gates.

**Requires Playwright MCP** — added automatically on `npx the-frame-ai init` or `npx the-frame-ai update` if you answer "y" to the frontend project question.

### CI / Autonomous mode

FRAME doesn't have a dedicated headless command. For CI or non-interactive runs, invoke commands directly via `claude -p`:

```bash
# Run full cycle autonomously
claude -p "/frame:build" --allowedTools "Bash,Read,Write,Edit"

# Audit in CI
claude -p "/frame:audit quick" --allowedTools "Bash,Read,Write,Grep"
```

## What's inside

FRAME provides:

- **6-phase workflow**: Research → Plan → Build → Review → Ship → Reflect
- **32 commands**: from quick tasks to full feature development cycle
- **Parallel feature work**: `/frame:parallel` runs each feature in its own git worktree with a task board; `/frame:integrate` merges them back with per-merge quality gates and cross-feature review
- **Parallel review fixes**: `/frame:fix` closes findings file-by-file in one pass — no worktrees, no per-fix ceremony
- **10 AI agents**: Researcher, Planner, Builder, Reviewer, Auditor, Devil's Advocate, Security, Performance Auditor, Tests Reviewer, Conventions Reviewer
- **Safety Hooks**: block destructive operations, enforce quality gates
- **Git Safety**: checkpoints, rollback, worktrees, pause/resume
- **Unified Audit**: 12 categories (SEC, PERF, LOGIC, API, DATA, OBS, DEPS, TEST, INFRA, MAINT, A11Y, PRIV) with adversarial verification

## Prerequisites

- Node.js >= 18
- Git (project must be a git repository)

## Quick Start

```bash
# Initialize git repo if needed
git init && git commit --allow-empty -m "init"

# Install FRAME
npx the-frame-ai init

# Open Claude Code in this project and run:
/frame:init    # scans codebase, fills MAP.md
/frame:daily   # your entry point every day
```

## Commands

### Core — start here

These commands cover 90% of solo dev work:

| Command | When to use |
|---------|-------------|
| `/frame:daily` | **Start here** after any break — what was done, what's next |
| `/frame:research <topic>` | Before planning a new feature |
| `/frame:plan <feature>` | Turn research into an actionable task list with waves |
| `/frame:plan audit` | Create fix tasks from the latest audit report |
| `/frame:build` | Implement tasks — reads Parallel: labels, runs sequentially or in parallel automatically |
| `/frame:review` | Before deploying — 6-panel review + automated checks |
| `/frame:ship` | Commit, optional push/PR, update memory |

### All Commands by Phase

<details>
<summary>Research</summary>

| Command | When to use |
|---------|-------------|
| `/frame:research <topic>` | Before planning a new feature |
| `/frame:why <topic or path>` | Search decision history or explain why code looks the way it does |
| `/frame:arch <module>` | Document a module's architecture to `docs/arch/{module}.md` |
</details>

<details>
<summary>Plan</summary>

| Command | When to use |
|---------|-------------|
| `/frame:plan <feature>` | Turn research into an actionable task list with wave grouping |
| `/frame:plan audit [all]` | Turn audit findings into a fix plan (Critical+High, or all) |
| `/frame:add-task` | Add a task to the plan without interrupting work |
</details>

<details>
<summary>Build</summary>

| Command | When to use |
|---------|-------------|
| `/frame:build` | Implement plan with TDD — auto-detects sequential vs parallel from plan |
| `/frame:fix [REV-N ...]` | Close review findings in parallel — one fixer per file, single gates run |
| `/frame:fast <task>` | Quick task under 30 minutes |
| `/frame:debug <issue>` | Systematic bug investigation with git archaeology |
| `/frame:debug --deep` | Deep forensic investigation (parallel investigators, 5-why, timeline) |
| `/frame:debug <SEC-N>` | Debug a specific finding from the last audit/review by ID |
| `/frame:refactor` | Refactor with TDD safety net |
| `/frame:migrate` | DB/API/deps migration with rollback plan |
</details>

<details>
<summary>Review & Audit</summary>

| Command | When to use |
|---------|-------------|
| `/frame:review` | Before deploying — automated checks + 6-panel review |
| `/frame:audit` | Full project audit: 12 categories, adversarial verification |
| `/frame:audit security` | Security-only audit: secrets, OWASP, auth, CORS |
| `/frame:audit performance` | Performance-only audit: N+1, cache, memory leaks, bundle |
| `/frame:audit deps` | Dependency audit: vulnerabilities, outdated packages |
| `/frame:audit quick` | Top 4 categories (SEC, PERF, DEPS, LOGIC) — fast overview |
| `/frame:health` | Full project health check |
| `/frame:health sprint` | Weekly progress vs roadmap |
</details>

<details>
<summary>Ship</summary>

| Command | When to use |
|---------|-------------|
| `/frame:test-plan` | After review, before ship — generates a manual "go check this as a user" checklist |
| `/frame:ship` | Commit, optional push/PR, update memory |
| `/frame:checkpoint` | Save/list/rollback git checkpoints |
</details>

<details>
<summary>Reflect</summary>

| Command | When to use |
|---------|-------------|
| `/frame:retrospective` | After deploy — update memory and record learnings |
| `/frame:cleanup-memory` | Trim and archive stale memory |
</details>

<details>
<summary>Daily & Utilities</summary>

| Command | When to use |
|---------|-------------|
| `/frame:daily` | Start of day — what was done, what's next |
| `/frame:daily full` | Full technical context dump (STATE.md + memory + git diff) |
| `/frame:note` | Capture a pattern, decision, or anti-pattern |
| `/frame:unstuck` | Stuck? Get 3 concrete options to unblock |
| `/frame:init` | First run — scan codebase, fill MAP.md |
| `/frame:doctor` | Verify FRAME installation |
| `/frame:pause` / `/frame:resume` | Save and restore mid-task state |
</details>

<details>
<summary>Advanced</summary>

| Command | When to use |
|---------|-------------|
| `/frame:parallel start <feature>` | Launch a planned feature in its own worktree, track it on the board |
| `/frame:parallel status` | See all parallel tasks: phase, progress, readiness |
| `/frame:integrate` | Merge finished parallel features with gates + cross-feature review |
| `/frame:worktree` | Isolated git worktree for parallel experiments (low-level) |
</details>

## Full Command Reference

<!-- COMMANDS:START -->
| Command | Description | Arguments |
|---------|-------------|-----------|
| `/frame:add-task` | Add a task to the current plan.md without interrupting work | `<task description>` |
| `/frame:arch` | Document module architecture and design decisions for a file or module | `<file or module path>` |
| `/frame:audit` | Comprehensive project audit across 12 categories — security, performance, business logic, API, data, observability, deps, tests, infra, maintainability, a11y, privacy | `[category | quick] [scope-path] [--priv]` |
| `/frame:build` | Implement planned tasks using TDD — auto-routes to a worktree when another feature is already in flight, and auto-detects parallel waves from plan.md | `[feature]` |
| `/frame:checkpoint` | Manage git checkpoints: list, create, rollback, or clean up frame/checkpoint/* tags | `[list | create | cleanup | rollback [<tag> | --soft]]` |
| `/frame:cleanup-memory` | Trim and archive memory files, removing stale and low-confidence entries | — |
| `/frame:daily` | Morning briefing — project status, today's priorities, and blockers | `[full]` |
| `/frame:debug` | Systematically debug an issue — or run deep forensic investigation with 5-why analysis | `[--deep] <SEC-N|issue description>` |
| `/frame:doctor` | Check FRAME installation health — verify paths, config, and hook registration | — |
| `/frame:evolve` | Promote high-confidence learnings into permanent project rules (CLAUDE.md) and retire duplicates | — |
| `/frame:fast` | Execute a quick task end-to-end without full research/plan cycle | `<task description>` |
| `/frame:fix` | Close review findings in parallel — groups findings by file, spawns one fixer per non-conflicting group, single gates run at the end | `[feature] [REV-N ...]` |
| `/frame:health` | Daily health check: tests, lint, types, security scan freshness — or sprint velocity check | `[sprint]` |
| `/frame:init` | Initialize project: scan codebase, fill MAP.md, STATE.md, and memory files | — |
| `/frame:integrate` | Merge all finished parallel features into one integration branch with quality gates and cross-feature review | `[feature ...]` |
| `/frame:migrate` | Plan and execute a database or schema migration with rollback safety | `<migration description>` |
| `/frame:note` | Save a quick memory note (pattern, decision, or anti-pattern) to memory files | `<note text>` |
| `/frame:parallel` | Orchestrate parallel feature work across git worktrees — start tasks, view the board, stop tasks | `start <feature> | status | stop <feature>` |
| `/frame:pause` | Save session state to pause-state.json and create a checkpoint | — |
| `/frame:plan` | Decompose a feature into atomic tasks with wave grouping, traceability, and Parallel labels; or create a plan from audit findings | `<feature description> | audit [all]` |
| `/frame:refactor` | Refactor code with test coverage verification and checkpoint safety | `<refactor scope>` |
| `/frame:research` | Domain research: clarification gate, parallel codebase + web scouting, new research.md with Decision Log cycle | `<topic or question>` |
| `/frame:resume` | Resume work from pause-state.json — restore context and continue | — |
| `/frame:retrospective` | Write retrospective, update memory files with learnings and patterns | — |
| `/frame:review` | Code review: completion check, automated gates, parallel reviewer panel with verification pass | `[audit | strict]` |
| `/frame:ship` | Prepare and create a git commit and pull request after review passes | — |
| `/frame:test-plan` | Generate a manual user acceptance checklist for the current feature | `<feature or scope>` |
| `/frame:unstuck` | Get unblocked: diagnose blockers, suggest next actions, reset mental model | — |
| `/frame:upgrade` | Upgrade FRAME framework files to the latest version with diff preview and changelog | — |
| `/frame:verify-ui` | Browser UI verification using Playwright MCP: screenshot and assert UI state | `[<url or component>]` |
| `/frame:why` | Explain why code looks the way it does — or search decision history by keyword | `<keyword | file path | function name>` |
| `/frame:worktree` | Manage git worktrees for parallel task execution without context switching | `[create | list | cleanup | <task-name>]` |
<!-- COMMANDS:END -->

## Agents

<!-- AGENTS:START -->
| Agent | Description |
|-------|-------------|
| `auditor` | Universal category auditor. Receives a category brief from the orchestrating command, audits the codebase for that category, writes findings to its category file. Use when: /frame:audit spawns category-specific subagents. |
| `builder` | Implementation agent. Writes code using TDD, runs quality gates, creates git commits. Use when: implementing a planned task from plan.md. |
| `conventions-reviewer` | Review agent for wave-team. Checks code conventions and style in a single task's git diff. Returns PASS/WARN/FAIL verdict. |
| `devils-advocate` | Find problems in code — code review, plan critique, or finding verification. Never writes application code. Use when: reviewing implementation, challenging a plan, or verifying audit/review findings. |
| `performance-auditor` | Performance auditor agent. Detects stack, researches current perf issues, runs deep audit, writes PERF_REPORT.md. Never edits application code. Use when: auditing perf before ship or on demand. |
| `planner` | Planning agent. Decomposes research into atomic tasks with wave grouping. Use when: research.md is complete and needs to be broken into a plan. |
| `researcher` | Research agent. Analyzes codebase or web for alternatives and context before planning. In /frame:research acts as codebase-scout or web-scout subagent. Use when: exploring options or gathering context. |
| `reviewer` | Review agent. Checks code against spec, runs quality gates, security analysis. In /frame:review panel acts as the Spec Compliance reviewer. Use when: implementation is complete and needs review before ship. |
| `security` | Security auditor agent. Scans code for vulnerabilities, secrets, OWASP violations. When used in /frame:audit produces security-category report; when used in /frame:review panel produces diff-scoped findings. Never edits application code. |
| `tests-reviewer` | Review agent for wave-team. Checks test coverage and quality of a single task's git diff. Returns PASS/WARN/FAIL verdict. |
<!-- AGENTS:END -->

## Hooks

FRAME installs 5 hooks into `.claude/hooks/`. They run automatically.

| Hook | Trigger | What it does | To disable |
|------|---------|--------------|------------|
| `safety-net.sh` | Before Bash | Blocks `rm -rf` and `DROP TABLE/DATABASE` | Remove from `.claude/settings.json` |
| `git-safety.sh` | Before Bash | Blocks force push, `reset --hard`, commits while the quality gate is red; warns on `git add -A` and refspec pushes into main | Remove from `.claude/settings.json` |
| `quality-gate.sh` | After file write | Runs typecheck + lint on changed file; records pass/fail so git-safety can block commits on red | Remove from `.claude/settings.json` |
| `session-init.sh` | Session start | Shows current phase/task; full context dump if away > 24h | Remove from `.claude/settings.json` |
| `pre-compact.sh` | Before context compaction | Saves timestamp to STATE.md before context is compressed | Remove from `.claude/settings.json` |

## Configuration

FRAME is configured via `.frame/config.json`. Key settings:

```json
{
  "quality": {
    "commands": {
      "typecheck": "npx tsc --noEmit",
      "test": "npx vitest run",
      "lint": "npx eslint .",
      "build": "npm run build"
    }
  }
}
```

## CLI

```bash
npx the-frame-ai init [target-dir]     # Install FRAME
npx the-frame-ai update [target-dir]   # Update commands, agents, hooks
npx the-frame-ai doctor [target-dir]   # Check installation health
npx the-frame-ai version               # Show CLI version
```

`update` only updates commands, agents, and hooks. Project files (STATE.md, MAP.md, memory/, etc.) are never overwritten.

## Project Structure (after installation)

```
.claude/
  commands/          # 31 FRAME commands
  agents/            # 10 AI agents
  hooks/             # 5 safety hooks
.frame/
  config.json        # FRAME configuration
.planning/
  STATE.md           # Current position
  BOARD.md           # Parallel task board (created by /frame:parallel)
  MAP.md             # Project map
  ROADMAP.md         # Roadmap
  memory/            # Project memory (context, conventions, dependencies, learnings)
  specs/             # Feature specs
  reports/
    audit/           # Audit reports (security, performance, deps, etc.)
    integration/     # Integration reports from /frame:integrate
```

## Breaking Changes in v0.14.0

- **`/frame:security`** removed → use `/frame:audit security` or `/frame:audit`
- **`/frame:performance`** removed → use `/frame:audit performance` or `/frame:audit`
- **`/frame:check-deps`** removed → use `/frame:audit deps`
- **`/frame:estimate`** removed → estimates are now per-task fields in plan.md
- **`/frame:headless`** removed → use `claude -p "/frame:build {feature}"` directly
- **`/frame:build --parallel`** removed → build reads `Parallel:` labels from plan.md automatically
- **`/frame:build --review-team`** removed → inline review team replaced by `/frame:review` panel
- Reports moved: `.planning/reports/security/` and `.planning/reports/performance/` → `.planning/reports/audit/`

## License

MIT
