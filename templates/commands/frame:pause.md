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

### Step 4: Create pause-state.json

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
  "resumeHint": "{specific next step — file, function, or task}"
}
```

### Step 5: Git Tag + Checkpoint

Create a checkpoint before pause:
```bash
TIMESTAMP=$(date +%Y%m%d%H%M)
git tag "frame/pause-$TIMESTAMP" -m "FRAME pause: $ARGUMENTS"
```

If autoCheckpoint is enabled, also create a phase checkpoint:
```bash
PHASE=$(grep -oE 'Phase: .+' .planning/STATE.md 2>/dev/null | head -1 | sed 's/Phase: //' || echo "unknown")
if echo "research plan build review" | grep -q "$PHASE"; then
  git tag "frame/checkpoint/$PHASE-$TIMESTAMP-pause" -m "Auto checkpoint before pause ($PHASE phase)"
fi
```

### Step 6: Save Context

Create `.planning/pause-history/{date}.md`:

```markdown
# Pause: {date}

## State
- Phase: {phase}
- Feature: {feature}
- Task: {completed}/{total}

## What was done
{what was completed}

## Open tasks
- [ ] {open task 1}
- [ ] {open task 2}

## What's next
{resumeHint — specific next step}

## Notes
{$ARGUMENTS}
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
- Open tasks and resumeHint recorded
- Pause history saved
