# THE Frame

FRAME — Framework for AI-Assisted Solo Development

[🇺🇸 English](README.md) | [🇨🇳 中文](README.zh.md) | [🇮🇳 हिंदी](README.hi.md) | [🇯🇵 日本語](README.ja.md) | [🇩🇪 Deutsch](README.de.md) | [🇪🇸 Español](README.es.md) | [🇷🇺 Русский](README.ru.md)

## What is FRAME?

**FRAME (Framework for AI-Assisted Solo Development)** is a framework for solo developers building products with Claude Code. It turns chaotic AI-assisted development into a predictable process — from idea to deploy — with memory, structure, and protection against mistakes.

If you're building a product alone with Claude Code and want to work like a team — FRAME is for you.

## What problems does FRAME solve?

| Problem | What FRAME provides |
|---------|-------------------|
| Losing context between sessions | Project memory and automatic state dump on session start |
| Chaos in tasks and priorities | 6-phase workflow: Research → Plan → Build → Review → Ship → Reflect |
| Fear of breaking something important | Safety hooks block destructive commands before they run |
| Repetitive routine tasks | 35 ready-made commands for the full development cycle |
| Complex features with dependencies | Parallel subagents for independent tasks |
| No structure for solo work | Roadmap, STATE.md, MAP.md — always know where you are and what's next |
| Shipping code with security holes | Security agent audits OWASP Top 10, secrets, infra, AI risks before deploy |

## How to work with FRAME

```
Research → Plan → Build → Review → Ship → Reflect
```

Each session is one cycle. Start with `/frame:daily`, end with `/frame:ship`.

**Research** — understand before you build
Run `/frame:research <topic>` — Claude explores the codebase, external sources, and builds context for the next step.

**Plan** — break it into tasks
`/frame:plan <feature>` turns research into a concrete task list with estimates.

**Build** — implement
`/frame:build` executes tasks sequentially (1–3 at a time) with TDD. For many independent tasks — `/frame:wave` runs them in parallel batches. When quality matters more than speed — `/frame:wave-team` adds a review team (Security, Performance, Tests, Conventions) after each task. Stuck — `/frame:unstuck`. Found a bug — `/frame:debug`.

**Review** — check before deploying
`/frame:review` runs automated checks and gives a checklist: tests, types, security, performance.

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
# → Claude studies the codebase: how current auth works,
#   what patterns are already used, what needs to be added

/frame:plan "Google OAuth"
# → get a concrete task list:
#   1. configure Google OAuth credentials
#   2. add callback route
#   3. connect to sessions
#   4. add button to UI

/frame:checkpoint
# → save a restore point — if something goes wrong, you can roll back

/frame:wave
# → tasks 1–4 are independent, Claude runs them in parallel

/frame:review
# → automated checks: tests, types, security

/frame:ship
# → commit, optional push/PR, project memory updated
```

### Bug: users can't log in after password reset

```
/frame:daily
# → restore context, see the bug is already in the plan or add it

/frame:debug "login after reset"
# → Claude systematically checks: logs, reset flow, sessions, tokens
# → you get a hypothesis with a specific location in the code

# If the cause is found immediately:
/frame:checkpoint                        # restore point before the fix
/frame:fast "fix: invalidate old session after password reset"
# → Claude makes a targeted fix, writes a regression test

# If the cause is unclear — go deeper:
/frame:forensics
# → analyzes git history of changes in this area,
#   finds the commit that broke the behavior

/frame:checkpoint
/frame:fast "fix: ..."                   # fix the found cause

/frame:review
# → confirm the fix didn't break other login scenarios

/frame:ship
```

### Performance: find and fix bottlenecks

```
/frame:daily

/frame:perf-audit
# → detects stack (Next.js + PostgreSQL + Redis, etc.)
# → searches for current known issues for that exact stack
# → deep scan: N+1 queries, memory leaks, blocking ops,
#   missing cache headers, re-render causes, bundle size
# → report saved to .planning/reports/performance/PERF_REPORT.md
#   with Critical/High/Medium/Low priorities and effort estimates

# Example report output:
# Critical: 2 | High: 4 | Medium: 3 | Low: 1
# [PERF-1] N+1 query in /api/users — 47 extra DB queries per request (S)
# [PERF-2] setInterval without cleanup in Dashboard — memory leak (XS)

/frame:perf-fix
# → reads PERF_REPORT.md, starts with Critical issues
# → for each issue shows:
#   --- BEFORE ---
#   const users = await db.findMany()
#   --- AFTER ---
#   const users = await db.findMany({ select: { id, name, email } })
# → asks: Apply this fix? [y/n/skip]
# → applies, runs typecheck + tests, reverts if broken

# Fix specific issue or priority:
/frame:perf-fix PERF-1      # fix one issue
/frame:perf-fix high        # fix all High priority
/frame:perf-fix all         # fix Critical + High

/frame:perf-audit
# → re-run to confirm improvements
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

**Automatic check**: in `/frame:build`, `/frame:fast`, `/frame:wave`, and `/frame:debug` — if the task touches UI files (`.tsx`, `.vue`, `.css`, `component`, `page`) — browser check runs automatically after quality gates.

**Requires Playwright MCP** — added automatically on `npx the-frame init` or `npx the-frame update` if you answer "y" to the frontend project question.

### Security: audit before launch

```
/frame:daily
# → briefing shows: "Security: ⚠️ never run" — time to fix that

/frame:security
# → full project scan across all categories:
#   - secrets: AWS keys, GitHub tokens, Stripe keys, private keys, .env in git
#   - OWASP Top 10: SQL injection, XSS, CSRF, path traversal, SSRF, command injection
#   - infrastructure: Dockerfile (root user, :latest), debug endpoints, missing .dockerignore
#   - AI/LLM: prompt injection, insecure output handling, system prompt leakage
#   - dependencies: known CVEs via npm audit

# → report saved to .planning/reports/security/security-{date}.md
# → STATE.md updated with Security Status

# If CRITICAL or HIGH findings:
# ⛔ Ship BLOCKED. Run /frame:security-fix to fix critical findings.

/frame:security-fix
# → reads the latest report and fixes findings by priority:
#   CRITICAL first, then HIGH
#   - removes .env files from git tracking (git rm --cached)
#   - adds missing security headers to next.config.js / Express
#   - adds CSRF protection to Route Handlers
#   - runs npm audit fix for vulnerable dependencies
#   - fixes Dockerfile: adds USER directive, pins :latest tags
#   - for secrets already in history: tells you exactly how to rotate + rewrite history
# → verifies each fix after applying
# → updates STATE.md: unblocks ship if all CRITICAL resolved

# Targeted fixes:
/frame:security-fix critical     # fix only CRITICAL findings
/frame:security-fix high         # fix only HIGH findings
/frame:security-fix SEC-1        # fix a specific finding by ID

/frame:security
# → re-run audit to confirm everything is clean

# If clean:
# ✓ No critical issues. Safe to proceed with /frame:ship.

/frame:ship
# → security check passes, commit and push

# Targeted scans when you know what to look for:
/frame:security secrets          # secrets-only scan (~30 seconds)
/frame:security src/api/         # scan specific directory
```

## What's inside

FRAME provides:

- **6-phase workflow**: Research → Plan → Build → Review → Ship → Reflect
- **37 commands**: from quick tasks to full feature development cycle
- **7 AI agents**: Researcher, Planner, Builder, Reviewer, Devil's Advocate, Security, Performance Auditor
- **Safety Hooks**: block destructive operations, enforce quality gates
- **Git Safety**: checkpoints, rollback, worktrees, pause/resume
- **Security Auditing**: OWASP Top 10, secret detection, infrastructure checks, AI/LLM risks

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

These 7 commands cover 90% of solo dev work:

| Command | When to use |
|---------|-------------|
| `/frame:daily` | **Start here** after any break — what was done, what's next |
| `/frame:research <topic>` | Before planning a new feature |
| `/frame:plan <feature>` | Turn research into an actionable task list |
| `/frame:build` | Implement 1–3 tasks with TDD (sequential) |
| `/frame:wave` | Implement 4+ independent tasks (parallel subagents) |
| `/frame:wave-team` | Like wave, but with a review team after each task |
| `/frame:review` | Before deploying — automated checks + checklist |
| `/frame:ship` | Commit, optional push/PR, update memory |

### All Commands by Phase

<details>
<summary>Research</summary>

| Command | When to use |
|---------|-------------|
| `/frame:research <topic>` | Before planning a new feature |
| `/frame:explain <file>` | Why does this code look like this? |
| `/frame:why <topic>` | Search decision history |
| `/frame:arch <module>` | Document a module's architecture to `docs/arch/{module}.md` |
</details>

<details>
<summary>Plan</summary>

| Command | When to use |
|---------|-------------|
| `/frame:plan <feature>` | Turn research into an actionable task list |
| `/frame:add-task` | Add a task to the plan without interrupting work |
</details>

<details>
<summary>Build</summary>

| Command | When to use |
|---------|-------------|
| `/frame:build` | Implement plan with TDD (1–3 tasks, sequential) |
| `/frame:wave` | Implement 4+ independent tasks in parallel batches |
| `/frame:wave-team` | Like wave, but with a review team (Security, Perf, Tests, Conventions) after each task |
| `/frame:fast <task>` | Quick task under 30 minutes |
| `/frame:debug <issue>` | Systematic bug investigation |
| `/frame:forensics` | Deep dive into why something broke |
| `/frame:refactor` | Refactor with TDD safety net |
| `/frame:migrate` | DB/API/deps migration with rollback plan |
</details>

<details>
<summary>Review</summary>

| Command | When to use |
|---------|-------------|
| `/frame:review` | Before deploying — automated checks + checklist |
| `/frame:security` | Deep security audit: secrets, OWASP, infra, AI/LLM risks |
| `/frame:security-fix` | Fix findings from the latest security report (CRITICAL first, then HIGH) |
| `/frame:perf-audit` | Deep performance audit: detects stack, researches current issues, writes PERF_REPORT.md |
| `/frame:perf-fix` | Fix issues from PERF_REPORT.md — shows before/after, asks confirmation per fix |
| `/frame:health` | Full project health check |
| `/frame:check-deps` | Dependency vulnerabilities + outdated packages |
| `/frame:performance` | Bundle size and Lighthouse audit |
</details>

<details>
<summary>Ship</summary>

| Command | When to use |
|---------|-------------|
| `/frame:ship` | Commit, optional push/PR, update memory |
| `/frame:checkpoint` | Save a git tag before a risky change |
| `/frame:rollback` | Roll back to a checkpoint |
</details>

<details>
<summary>Reflect</summary>

| Command | When to use |
|---------|-------------|
| `/frame:retrospective` | After deploy — update memory and metrics |
| `/frame:sprint-check` | Weekly progress vs roadmap |
| `/frame:cleanup-memory` | Trim and archive stale memory |
</details>

<details>
<summary>Daily & Utilities</summary>

| Command | When to use |
|---------|-------------|
| `/frame:daily` | Start of day — what was done, what's next |
| `/frame:status` | Full state dump (git, memory, blockers) |
| `/frame:note` | Capture a pattern, decision, or anti-pattern |
| `/frame:unstuck` | Stuck? Get 3 concrete options to unblock |
| `/frame:context` | Show current working context |
| `/frame:init` | First run — scan codebase, fill MAP.md |
| `/frame:doctor` | Verify FRAME installation |
| `/frame:pause` / `/frame:resume` | Save and restore mid-task state |
</details>

<details>
<summary>Advanced</summary>

| Command | When to use |
|---------|-------------|
| `/frame:worktree` | Isolated git worktree for parallel experiments |
| `/frame:headless` | Autonomous CI mode (no interaction) |
| `/frame:estimate <task>` | Scope and time estimate before starting |
</details>

## Hooks

FRAME installs 4 hooks into `.claude/hooks/`. They run automatically.

| Hook | Trigger | What it does | To disable |
|------|---------|--------------|------------|
| `safety-net.sh` | Before Bash | Blocks `rm -rf` and `DROP TABLE/DATABASE` | Remove from `.claude/settings.local.json` |
| `git-safety.sh` | Before Bash | Blocks force push, `reset --hard`, warns on `git add -A` | Remove from `.claude/settings.local.json` |
| `quality-gate.sh` | After file write | Runs typecheck + lint on changed file | Remove from `.claude/settings.local.json` |
| `session-init.sh` | Session start | Shows current phase/task; full context dump if away > 24h | Remove from `.claude/settings.local.json` |

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
  commands/          # 35 FRAME commands
  agents/            # 6 AI agents
  hooks/             # 4 safety hooks
.frame/
  config.json        # FRAME configuration
.planning/
  STATE.md           # Current position
  MAP.md             # Project map
  ROADMAP.md         # Roadmap
  memory/            # Project memory
  specs/             # Feature specs
  reviews/           # Review results
  reports/           # Reports (daily, deps, quality, sprint, security)
```

## License

MIT
