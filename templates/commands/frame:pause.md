---
description: "Save session state to pause-state.json and create a checkpoint"
allowed-tools: [Read, Write, Bash]
---
# /frame:pause -- Save State

Saves current state and pauses work.

## Instructions

Save the current state: **$ARGUMENTS**

### Step 0: Fail-fast validation + mark IN_PROGRESS

Verify STATE.md exists:
```bash
test -f .planning/STATE.md || { echo "ERROR: .planning/STATE.md not found. Run /frame:init first."; exit 1; }
```

Immediately update status in `.planning/STATE.md`:
```
Status: IN_PROGRESS (pausing)
```

Capture the last commit hash BEFORE any changes:
```bash
git rev-parse HEAD 2>/dev/null || echo "no-commits"
```
Store in `lastCommit`.

### Step 1: Read current STATE.md

Read `.planning/STATE.md` to understand the current phase, feature, and tasks:
```bash
cat .planning/STATE.md
```

Extract: current phase, feature, list of open (incomplete) tasks.

### Step 2: Save uncommitted changes

Check for changes:
```bash
git status --short
```

If there are changes — offer two options:
- **WIP commit** (recommended): `git commit -m "WIP: pause — $ARGUMENTS"`
- **Stash** (if commit is undesirable): `git stash push -m "FRAME pause: $ARGUMENTS"`

Record in `hasStash`/`hasWip` accordingly.

### Step 3: Update STATE.md

Update (do not overwrite) `.planning/STATE.md`, refreshing the status section:
```markdown
## Current Position
- Phase: {current phase}
- Feature: {current feature}
- Task: {completed}/{total}
- Status: PAUSED
- Paused at: {timestamp}
- Notes: {$ARGUMENTS}
```

### Step 4: Collect briefing facts (mandatory)

Before writing the state file, honestly answer four questions. This is the single most valuable part of a pause — it stops the next session from repeating dead ends. Do NOT leave these empty; if a section truly has nothing, write "—".

- **Сработало (с доказательством)** — approaches that worked, each with concrete evidence (test passed, endpoint returns 200, file compiles). No unverified claims.
- **НЕ сработало (и почему)** — approaches tried that failed, with the reason. This is the anti-loop section.
- **Не пробовали** — plausible next approaches not yet attempted.
- **Точный следующий шаг** — the exact next action: file, function, command, or line to start from.

Also collect `referencedFiles`: the list of files central to the current task (used later for staleness detection on resume).

### Step 5: Create pause-state.json

Create `.planning/pause-state.json`:

```json
{
  "timestamp": "{ISO timestamp}",
  "phase": "{current phase}",
  "feature": "{current feature}",
  "task": "{completed}/{total}",
  "lastCommit": "{hash}",
  "notes": "{$ARGUMENTS}",
  "hasStash": true/false,
  "hasWip": true/false,
  "stashMessage": "{stash or WIP commit message}",
  "openTasks": ["{open task 1}", "{open task 2}"],
  "resumeHint": "{specific next step — file, function, or task}",
  "worked": ["{worked approach + evidence}"],
  "notWorked": ["{failed approach + why}"],
  "notTried": ["{not-yet-attempted approach}"],
  "nextStep": "{exact next action}",
  "referencedFiles": ["{path/to/file1}", "{path/to/file2}"]
}
```

### Step 6: Git Tag + Checkpoint

Create a checkpoint before pause:
```bash
TIMESTAMP=$(date +%Y%m%d%H%M)
git tag "frame/pause-$TIMESTAMP" -m "FRAME pause: $ARGUMENTS"
```

If autoCheckpoint is enabled, also create a phase checkpoint:
```bash
PHASE=$(grep -oE 'Phase: .+' .planning/STATE.md 2>/dev/null | head -1 | sed 's/Phase: //' | tr '[:upper:]' '[:lower:]' || echo "unknown")
if echo "research plan build review" | grep -qw "$PHASE"; then
  git tag "frame/checkpoint/$PHASE-$TIMESTAMP-pause" -m "Auto checkpoint before pause ($PHASE phase)"
fi
```

### Step 7: Save Context

Create `.planning/pause-history/{date}.md`:

```markdown
# Pause: {date}

## State
- Phase: {phase}
- Feature: {feature}
- Task: {completed}/{total}

## Сработало (с доказательством)
- {worked approach 1 + evidence}

## НЕ сработало (и почему)
- {failed approach 1 + why}

## Не пробовали
- {not-yet-attempted approach 1}

## Открытые задачи
- [ ] {open task 1}
- [ ] {open task 2}

## Точный следующий шаг
{nextStep — exact file/function/command to start from}

## Notes
{$ARGUMENTS}
```

### Step 8: Make pause-state read-only

Freeze the state file so nothing overwrites the briefing before resume:
```bash
chmod 444 .planning/pause-state.json 2>/dev/null || true
```

## Output

```
+======================================================================+
|                    FRAME PAUSED                                      |
+======================================================================+
|  State saved at: {timestamp}                                         |
|  Phase: {phase}                                                      |
|  Feature: {feature}                                                  |
|  Task: {completed}/{total}                                           |
|                                                                      |
|  Resume with: /frame:resume                                          |
+======================================================================+
```

## Result

- State read and updated (not overwritten)
- Changes saved (WIP commit or stash)
- Git tag created
- Briefing facts recorded (worked / notWorked / notTried / nextStep)
- referencedFiles captured for staleness detection
- Open tasks and resumeHint recorded
- Pause history saved
- pause-state.json frozen read-only
