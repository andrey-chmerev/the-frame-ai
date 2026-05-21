# /frame:status -- Project Status

> Full technical dump: STATE.md, ROADMAP, git, memory, blockers.
> For daily orientation use `/frame:daily` instead.

Shows current status: STATE.md, ROADMAP.md, CONTEXT.md, git status.

## Instructions

### Step 0: Fail-fast validation

**Before any action** check:
- `.planning/STATE.md` exists — if not, STOP: "Run /frame:init first — STATE.md not found."

### Step 1: Read STATE.md

Read `.planning/STATE.md` and capture:
- Current phase
- Current feature
- Task progress
- Latest commit
- Blockers

**D-step**: STATE.md read, data captured.

### Step 2: Read ROADMAP.md

Read `.planning/ROADMAP.md` (if exists) and capture:
- Current milestone
- Task progress
- Upcoming plans

Also grep for blocked tasks:
```bash
grep -i "BLOCKED" .planning/ROADMAP.md 2>/dev/null
grep -i "BLOCKED" docs/specs/*/plan.md 2>/dev/null | head -10
```

**D-step**: ROADMAP.md read or noted as absent.

### Step 3: Read CONTEXT.md

Read `.planning/CONTEXT.md` (if exists) and capture:
- Active feature
- Key files
- Tech context

**D-step**: CONTEXT.md read or noted as absent.

### Step 4: Git Status

```bash
git status
git log --oneline -5
```

**Heartbeat**: "Git status retrieved, reading memory..."

**D-step**: Git commands executed, output captured.

### Step 5: Show Context (if available)

Read `.planning/memory/context.md` and capture a brief summary of current focus and health.

### Step 6: Show Memory (if available)

Read `.planning/memory/patterns.md` and capture a brief summary with confidence levels.

### Step 7: Output Format

```
============================================================
                    FRAME STATUS
============================================================

  Phase:     {current phase}
  Feature:   {current feature}
  Tasks:     {completed}/{total}
  Commit:    {hash}
  Milestone: {milestone from ROADMAP or "—"}

============================================================
  BLOCKERS:
  {list of BLOCKED tasks from plan.md and ROADMAP.md, or "none"}

============================================================
  MEMORY:
  {brief summary from context.md or "—"}

============================================================
  GIT:
  {git status --short}
  {last 5 commits}

============================================================
```

## Result

- Current project status displayed
- All key files read
- Git status shown
- Next step: `/frame:health` for technical checks or `/frame:research <topic>` for a new feature
