---
description: "Resume work from pause-state.json — restore context and continue"
allowed-tools: [Read, Write, Bash]
---
# /frame:resume -- Resume Work

Restores state from the last /frame:pause.

## Instructions

Restore state from pause.

### Step 0: Fail-fast validation + mark IN_PROGRESS

Verify STATE.md exists:
```bash
test -f .planning/STATE.md || { echo "ERROR: .planning/STATE.md not found. Run /frame:init first."; exit 1; }
```

Verify pause-state exists and is not empty:
```bash
test -f .planning/pause-state.json || { echo "ERROR: No pause state found. Nothing to resume."; exit 1; }
```

Read `.planning/pause-state.json` and check it has content:
```bash
cat .planning/pause-state.json
```

If the file contains only `{}` or is missing required fields (`phase`, `feature`, `resumeHint`), stop:
```
ERROR: pause-state.json is empty or invalid — no saved session to resume.
Use /frame:status to see current state, or /frame:init to start fresh.
```

Immediately update status in `.planning/STATE.md`:
```
Status: IN_PROGRESS (resuming)
```

### Step 1: Read pause state

Read `.planning/pause-state.json`:
```bash
cat .planning/pause-state.json
```

Extract: `timestamp`, `phase`, `feature`, `task`, `lastCommit`, `hasStash`, `hasWip`, `openTasks`, `resumeHint`.

### Step 2: Restore uncommitted changes

If `hasWip === true` — the WIP commit is already in git history, no action needed.

If `hasStash === true`:
```bash
git stash pop
```

If `git stash pop` fails (conflicts), stop and report:
```
ERROR: git stash pop failed with conflicts. Resolve manually, then re-run /frame:resume.
```

Check checkpoint:
```bash
LAST_PAUSE=$(git tag -l "frame/pause-*" --sort=-creatordate | head -n 1)
echo "Last pause checkpoint: $LAST_PAUSE"
```

### Step 3: Restore STATE.md

Update `.planning/STATE.md` — restore context from pause:
```markdown
## Current Position
- Phase: {phase from pause}
- Feature: {feature from pause}
- Task: {task from pause}
- Status: RESUMED
- Resumed at: {now}
- Paused at: {timestamp from pause-state}
```

### Step 4: Show Context

Display:
```
+======================================================================+
|                    FRAME RESUMED                                      |
+======================================================================+
|  Paused at: {timestamp}                                               |
|  Resumed at: {now}                                                    |
|  Duration: {diff}                                                     |
|                                                                       |
|  Phase: {phase}                                                       |
|  Feature: {feature}                                                   |
|  Task: {completed}/{total}                                            |
|                                                                       |
|  Continue from: {resumeHint}                                          |
+======================================================================+
```

If `openTasks` is non-empty, list them:
```
Open tasks:
  - {open task 1}
  - {open task 2}
```

### Step 5: Clean up pause state

Move to history (do not delete — preserves audit trail):
```bash
mkdir -p .planning/pause-history
mv .planning/pause-state.json .planning/pause-history/resumed-$(date +%Y%m%d%H%M).json
```

### Step 6: Update STATE.md (final)

Update `.planning/STATE.md` status to reflect active work:
```
Status: IN_PROGRESS
```

### Step 7: Continue Work

Resume from `resumeHint`. Do not restart from the beginning of the phase.

## Rules

- **Fail fast** -- exit immediately if STATE.md or pause-state.json is missing
- **Always restore stash before continuing** -- uncommitted changes must be recovered first
- **Use resumeHint** -- continue from the exact next step, not from phase start
- **Move pause-state to history** -- never silently delete it

## Result

- State restored from pause-state.json
- Git stash applied (if hasStash)
- STATE.md updated to IN_PROGRESS
- pause-state.json moved to pause-history/
- Work resumed from resumeHint
