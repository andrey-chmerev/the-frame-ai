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
Use /frame:daily to see current state, or /frame:init to start fresh.
```

Immediately update status in `.planning/STATE.md`:
```
Status: IN_PROGRESS (resuming)
```

### Step 0.5: Staleness checks (deterministic, no AI guessing)

The pause-state may be stale. Run mechanical checks and WARN (do not block) before restoring:

**Age check** — if the file is older than 7 days, the plan may be outdated:
```bash
AGE_DAYS=$(( ( $(date +%s) - $(stat -f %m .planning/pause-state.json 2>/dev/null || stat -c %Y .planning/pause-state.json) ) / 86400 ))
if [ "$AGE_DAYS" -gt 7 ]; then
  echo "WARNING: pause-state is $AGE_DAYS days old — approaches and code may have moved on. Re-verify before continuing."
fi
```

**Referenced-files check** — if files central to the task were deleted/moved:
```bash
# For each path in referencedFiles from pause-state.json:
#   test -f "$path" || echo "WARNING: referenced file no longer exists: $path"
```
List every missing file. If any are missing, tell the user the plan may need adjustment.

**Commit drift check** — how far HEAD has moved since pause:
```bash
LAST=$(grep -oE '"lastCommit"[^,]+' .planning/pause-state.json | grep -oE '[0-9a-f]{7,40}' | head -1)
if [ -n "$LAST" ]; then
  git merge-base --is-ancestor "$LAST" HEAD 2>/dev/null && \
    echo "Commits since pause: $(git rev-list --count "$LAST"..HEAD 2>/dev/null)" || \
    echo "WARNING: paused commit $LAST is not an ancestor of HEAD — history diverged."
fi
```

### Step 1: Read pause state

Read `.planning/pause-state.json`:
```bash
cat .planning/pause-state.json
```

Extract: `timestamp`, `phase`, `feature`, `task`, `lastCommit`, `hasStash`, `hasWip`, `openTasks`, `resumeHint`, `worked`, `notWorked`, `notTried`, `nextStep`, `referencedFiles`.

**Read the `notWorked` list carefully** — do not re-attempt any approach listed there. That is the whole point of recording it.

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

Then show the briefing so the plan is fully restored:
```
Сработало:
  - {worked 1}
НЕ сработало (не повторять):
  - {notWorked 1}
Не пробовали:
  - {notTried 1}
Точный следующий шаг:
  {nextStep}
```

### Step 5: Clean up pause state

Move to history (do not delete — preserves audit trail). The file was frozen read-only by /frame:pause, so unfreeze before moving:
```bash
mkdir -p .planning/pause-history
chmod 644 .planning/pause-state.json 2>/dev/null || true
mv .planning/pause-state.json .planning/pause-history/resumed-$(date +%Y%m%d%H%M).json
```

### Step 6: Update STATE.md (final)

Update `.planning/STATE.md` status to reflect active work:
```
Status: IN_PROGRESS
```

### Step 7: Load briefing, then WAIT for the user

Resume loads context — it does NOT auto-start work. After displaying the briefing:

- Stop and wait for the user's go-ahead. Do not begin editing or running the next step on your own.
- If staleness warnings fired (age > 7 days, missing referenced files, diverged history), state them plainly and ask whether to proceed or re-plan.
- When the user confirms, continue from `nextStep` / `resumeHint` — not from the beginning of the phase — and never re-attempt anything in the `notWorked` list.

## Rules

- **Fail fast** -- exit immediately if STATE.md or pause-state.json is missing
- **Run staleness checks first** -- age, referenced files, commit drift (mechanical, no AI guessing)
- **Load briefing, then wait** -- resume restores context; the user starts the work
- **Never repeat notWorked approaches** -- that list exists to prevent dead-end loops
- **Always restore stash before continuing** -- uncommitted changes must be recovered first
- **Use nextStep/resumeHint** -- continue from the exact next step, not from phase start
- **Move pause-state to history** -- never silently delete it

## Result

- Staleness checks run (age, referenced files, commit drift)
- State restored from pause-state.json
- Briefing loaded (worked / notWorked / notTried / nextStep)
- Git stash applied (if hasStash)
- STATE.md updated to IN_PROGRESS
- pause-state.json moved to pause-history/
- Waiting for user before continuing from nextStep
