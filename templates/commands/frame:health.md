---
description: "Daily health check: tests, lint, types, security scan freshness — or sprint velocity check"
argument-hint: "[sprint]"
allowed-tools: [Read, Bash]
---
# /frame:health -- Daily Health Check

Daily project health check, with optional sprint velocity mode.

### Routing

- (no args) — run daily health check: tests, lint, types, security freshness, disk, git
- `sprint` — sprint planning check: ROADMAP progress, velocity, blockers, sprint report

## Instructions

Run a project health check and create a report.

### Step 1: Read project context

Read `.planning/STATE.md` — note current phase and blockers.
Read `.planning/memory/context.md` — note last retrospective date and open anti-patterns.

### Step 2: Technical checks

1. **Security audit**
```bash
{quality.commands.audit} 2>/dev/null | tail -5
```

2. **Outdated dependencies**
```bash
{quality.commands.outdated} 2>/dev/null | head -10
```

3. **Type check**
```bash
{quality.commands.typecheck} 2>&1 | tail -3
```

4. **Tests**
```bash
{quality.commands.test} 2>&1 | tail -5
```

5. **Disk size**
```bash
du -sh . --exclude=node_modules --exclude=.git 2>/dev/null || du -sh $(find . -maxdepth 1 -not -name "node_modules" -not -name ".git" -not -name "." | tr '\n' ' ') 2>/dev/null
```

6. **Git status** (uncommitted changes)
```bash
git status --short
git log --oneline -5
```

### Step 3: History (last 7 days)

Read reports from `.planning/reports/daily/` for the last 7 days and determine each day's status: HEALTHY=`+`, ISSUES=`~`, CRITICAL=`!`, missing=`.`.

### Step 4: Determine status and actions

- **HEALTHY** — all checks passed, no blockers
- **ISSUES** — outdated dependencies, type warnings, or uncommitted changes
- **CRITICAL** — tests failed, audit found vulnerabilities, or open blockers

For each failed check, add a concrete action item to the "Action Items" section.

---

## Mode: sprint (sprint planning check)

Triggered by: `/frame:health sprint`

Checks ROADMAP progress and velocity.

### Step S0: Fail-fast

```bash
git rev-parse --is-inside-work-tree 2>/dev/null || { echo "ERROR: Not a git repository. Run from project root."; exit 1; }
```

Check `.planning/ROADMAP.md` exists — if missing, STOP: "Run /frame:init first — ROADMAP.md not found."

Update `.planning/STATE.md`:
```markdown
## Current Position
- Phase: SPRINT-CHECK
- Status: IN_PROGRESS
- Started: {timestamp}
```

### Step S1: Read ROADMAP

```bash
cat .planning/ROADMAP.md
cat .planning/STATE.md
```

### Step S2: Git stats for last 2 weeks

```bash
git log --since="2 weeks ago" --oneline | wc -l
git log --since="2 weeks ago" --oneline | head -10
```

### Step S3: Count tasks in plan.md

Find the current plan.md and count:
```bash
find docs/specs -name "plan.md" | head -1
```
Read plan.md and count:
- `[DONE]` tasks — completed this sprint
- `[ ]` tasks — remaining
- `[BLOCKED]` tasks — blocked

### Step S4: Create sprint report

```bash
mkdir -p .planning/reports/sprint
```

Create `.planning/reports/sprint/{date}.md`:

```markdown
# Sprint Check -- {date}

## Progress
- Commits last 2 weeks: N
- Completed tasks (DONE): N
- Remaining tasks: N
- Blocked tasks: N

## Velocity
- Average: N tasks/week (based on [DONE] tasks in plan.md)

## Blockers
- {blocker 1}
- {blocker 2}

## Recommendations
1. {recommendation}
```

Note velocity in the health report output only (velocity tracking via git log is sufficient).

Update `.planning/STATE.md`:
```markdown
## Current Position
- Phase: SPRINT-CHECK
- Status: COMPLETE
- Finished: {timestamp}
```

---

### Step 5: Create report

Create `.planning/reports/daily/{date}.md`:

```markdown
# Daily Health Check -- {date}

## Status: HEALTHY | ISSUES | CRITICAL

## Project
- Phase: {phase from STATE.md}
- Blockers: {blockers or "none"}
- Last retrospective: {date from context.md}

## Technical Checks
- [x] Audit: {result or "clean"}
- [x] Outdated: {count or "none"}
- [x] Types: PASS/FAIL
- [x] Tests: PASS/FAIL
- [x] Disk: {size}
- [x] Git: {count of uncommitted files or "clean"}

## Action Items
- [ ] {concrete action for each failed check}

## History (7 days)
{date}: {+|~|!|.} {date}: {+|~|!|.} ...
```
