---
description: "Sprint planning check: review ROADMAP, estimate remaining tasks, flag blockers"
allowed-tools: [Read, Bash]
---
# /frame:sprint-check -- Sprint Planning Check

Checks ROADMAP progress and velocity.

## Instructions

Check project progress.

### Step 0: Fail-fast validation + Update STATE.md (IN_PROGRESS)

**Before doing anything**, check:
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

### Step 1: Read ROADMAP

```bash
cat .planning/ROADMAP.md
```

### Step 2: Git Stats for last 2 weeks

**Heartbeat**: report "Reading git history..." before running.

```bash
git log --since="2 weeks ago" --oneline | wc -l  # commits
git log --since="2 weeks ago" --oneline | head -10  # recent
```

### Step 3: Read STATE.md and plan.md

```bash
cat .planning/STATE.md
```

Find the current plan.md and count completed tasks:
```bash
find docs/specs -name "plan.md" | head -1
```
Read plan.md and count:
- `[DONE]` tasks — completed this sprint
- `[ ]` tasks — remaining
- `[BLOCKED]` tasks — blocked

### Step 4: Identify blockers

Check for:
- Open tasks
- Blocked tasks
- Overdue items

### Step 5: Create report and update velocity

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

Append velocity data to `.planning/memory/metrics.md` under `## Velocity`:
```
- {date}: {N} tasks/week, {N} commits/week
```

If a `## Velocity` section doesn't exist, create it.

### Step 6: Update STATE.md (COMPLETE)

Update `.planning/STATE.md`:
```markdown
## Current Position
- Phase: SPRINT-CHECK
- Status: COMPLETE
- Finished: {timestamp}
```

## Result

- `.planning/reports/sprint/{date}.md` — sprint report created
- `.planning/STATE.md` updated (COMPLETE)
