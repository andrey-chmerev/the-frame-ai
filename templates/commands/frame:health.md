---
description: "Daily health check: tests, lint, types, security scan freshness"
allowed-tools: [Read, Bash]
---
# /frame:health -- Daily Health Check

Daily project health check.

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
