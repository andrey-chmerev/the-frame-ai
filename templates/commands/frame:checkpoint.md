# /frame:checkpoint -- Git Checkpoints

> **When to use manually**: before a risky change that isn't covered by an automatic checkpoint
> (e.g., editing config files, manual DB migrations, experimental refactors mid-session).
> Automatic checkpoints already fire before each phase (research/plan/build/review) if `autoCheckpoint: true` in config.
> Use this command when you want a checkpoint *outside* those phase boundaries.

Manage checkpoints (git tags) before each phase.

## Instructions

Command: **$ARGUMENTS**

### Routing

Determine action from the first argument:
- `list` -- show all checkpoints
- `create <message>` -- create a manual checkpoint
- `auto <phase>` -- automatic checkpoint before a phase

---

## Action: list

Show all checkpoints for the current feature.

```bash
git tag -l "frame/checkpoint/*" --sort=-creatordate
```

### Output

```
+======================================================================+
|                    FRAME CHECKPOINTS                                  |
+======================================================================+
|  frame/checkpoint/research-20260519-1430                              |
|  frame/checkpoint/plan-20260519-1500                                  |
|  frame/checkpoint/build-20260519-1530                                 |
|                                                                      |
|  Total: 3 checkpoints                                                |
|  Max: 10                                                             |
+======================================================================+
```

---

## Action: create

Create a manual checkpoint.

### Step 1: Check Max Checkpoints

```bash
COUNT=$(git tag -l "frame/checkpoint/*" | wc -l)
```

If COUNT >= 10, suggest removing old ones:
```bash
git tag -l "frame/checkpoint/*" --sort=creatordate | head -n 5
```

### Step 2: Create Tag

```bash
TIMESTAMP=$(date +%Y%m%d-%H%M)
git tag "frame/checkpoint/manual-$TIMESTAMP" -m "Manual checkpoint: $MESSAGE"
```

### Step 3: Show Result

```
+======================================================================+
|                    CHECKPOINT CREATED                                 |
+======================================================================+
|  Tag: frame/checkpoint/manual-{timestamp}                            |
|  Message: {message}                                                  |
|  Commit: {hash}                                                      |
|                                                                      |
|  Rollback: /frame:rollback --to manual-{timestamp}                   |
+======================================================================+
```

---

## Action: auto

Automatic checkpoint before a phase.

### Step 1: Identify Phase

Phase from the argument or from STATE.md:
```bash
grep -oP 'Phase: \K.*' .planning/STATE.md
```

### Step 2: Check Settings

```json
{
  "autoCheckpoint": true,
  "checkpointBefore": ["research", "plan", "build", "review"]
}
```

If the phase is in checkpointBefore, create a checkpoint.

### Step 3: Create Checkpoint

```bash
TIMESTAMP=$(date +%Y%m%d-%H%M)
git tag "frame/checkpoint/$PHASE-$TIMESTAMP" -m "Auto checkpoint before $PHASE phase"
```

### Step 4: Clean Up Old Checkpoints if Needed

```bash
COUNT=$(git tag -l "frame/checkpoint/*" | wc -l)
if [ "$COUNT" -gt 10 ]; then
  git tag -l "frame/checkpoint/*" --sort=creatordate | head -n $((COUNT - 10)) | xargs git tag -d
fi
```

---

## Action: cleanup

Remove checkpoints after a successful Ship.

```bash
# Delete all frame/checkpoint/* tags
git tag -l "frame/checkpoint/*" | xargs git tag -d
```

### Output

```
+======================================================================+
|                    CHECKPOINTS CLEANED                                |
+======================================================================+
|  Deleted: {count} checkpoints                                        |
|  Reason: cleanupAfterShip                                            |
+======================================================================+
```

## Rules

- **Git tags, not commits** -- do not pollute history
- **Max 10 checkpoints** -- to avoid bloat
- **cleanupAfterShip** -- removes checkpoints after a successful Ship
- **Auto checkpoint** -- before each phase listed in checkpointBefore
- **Timestamp format**: `%Y%m%d-%H%M`

## Result

- Checkpoint created via git tag
- Old checkpoints automatically pruned
- Cleanup after Ship
