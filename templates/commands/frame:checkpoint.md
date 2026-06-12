---
description: "Manage git checkpoints: list, create, rollback, or clean up frame/checkpoint/* tags"
argument-hint: "[list | create | cleanup | rollback [<tag> | --soft]]"
allowed-tools: [Bash]
---
# /frame:checkpoint -- Git Checkpoints

> **When to use manually**: before a risky change that isn't covered by an automatic checkpoint
> (e.g., editing config files, manual DB migrations, experimental refactors mid-session).
> Automatic checkpoints already fire before each phase (research/plan/build/review) if `autoCheckpoint: true` in config.
> Use this command when you want a checkpoint *outside* those phase boundaries.

Manage checkpoints (git tags) and roll back to them when needed.

## Instructions

Command: **$ARGUMENTS**

### Routing

Determine action from the first argument:
- `list` -- show all checkpoints
- `create <message>` -- create a manual checkpoint
- `auto <phase>` -- automatic checkpoint before a phase
- `rollback` -- roll back to the last checkpoint (requires confirmation)
- `rollback <tag>` -- roll back to a specific checkpoint tag
- `rollback --soft` -- soft rollback: reset HEAD but keep changes in working tree
- `cleanup` -- remove all frame/checkpoint/* tags after a successful Ship

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

Extract the message from `$ARGUMENTS` (everything after the word "create").

```bash
TIMESTAMP=$(date +%Y%m%d-%H%M)
MSG="${ARGUMENTS#create }"
[ -z "$MSG" ] && MSG="manual checkpoint"
git tag "frame/checkpoint/manual-$TIMESTAMP" -m "Manual checkpoint: $MSG"
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
|  Rollback: /frame:checkpoint rollback manual-{timestamp}             |
+======================================================================+
```

---

## Action: auto

Automatic checkpoint before a phase.

### Step 1: Identify Phase

Phase from the argument or from STATE.md:
```bash
grep -oE 'Phase: [A-Za-z_-]+' .planning/STATE.md | sed 's/Phase: //'
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

## Action: rollback

Roll back to the last or a specific `frame/checkpoint/*` tag. `git reset --hard` is only permitted on tags matching the `frame/checkpoint/*` pattern.

### Step 0: Update STATE.md (IN_PROGRESS) + Fail-Fast

Update `.planning/STATE.md`:
```markdown
- Phase: ROLLBACK
- Status: IN_PROGRESS
- Started: {timestamp}
```

Check for uncommitted changes:
```bash
git status --porcelain
```

If there are uncommitted changes → **STOP**:
```
Rollback blocked: uncommitted changes detected.
Commit or stash your changes first:
  git stash   (to save temporarily)
  git checkout -- .   (to discard)
```

### Step 1: Determine Target Tag

Parse argument after `rollback`:
- Empty → find last checkpoint: `git tag -l "frame/checkpoint/*" --sort=-creatordate | head -n 1`
- `<tag>` → validate: `git tag -l "$TAG"` — if not found, list available checkpoints
- `--soft` → find last checkpoint (same as empty, but use `git reset --soft` instead of `--hard`)

If no checkpoints exist → STOP: "No checkpoints found. Create one with: /frame:checkpoint create <message>"

Validate that the resolved tag matches `frame/checkpoint/*` pattern — refuse to reset to other tags.

### Step 2: Show Diff

```bash
echo "=== Changes since checkpoint ==="
git log --oneline {TARGET_TAG}..HEAD
echo ""
echo "=== Files changed ==="
git diff --stat {TARGET_TAG}..HEAD
```

### Step 3: Confirmation

```
+======================================================================+
|                    ROLLBACK CONFIRMATION                              |
+======================================================================+
|  Checkpoint: {tag}                                                   |
|  Created: {date}                                                     |
|                                                                      |
|  Changes to be discarded:                                            |
|  {list of commits}                                                   |
|                                                                      |
|  WARNING: This will discard {count} commits!                         |
|                                                                      |
|  Type "yes" to confirm rollback                                      |
+======================================================================+
```

If the user does not confirm → abort, do nothing.

### Step 4: Execute Rollback

**Hard rollback** (default):
```bash
git reset --hard {TARGET_TAG}
```

**Soft rollback** (`--soft` flag):
```bash
git reset --soft {TARGET_TAG}
```

### Step 5: Show Result + Update STATE.md

Update `.planning/STATE.md`:
```markdown
- Phase: {previous_phase}
- Status: ROLLED_BACK  (or SOFT_ROLLED_BACK for --soft)
- Checkpoint: {tag}
```

```
+======================================================================+
|                    ROLLBACK COMPLETE                                  |
+======================================================================+
|  Rolled back to: {tag}                                               |
|  Discarded commits: {count}                                          |
|                                                                      |
|  Working directory is now at checkpoint state                        |
|  Next: /frame:checkpoint list   (to see remaining checkpoints)       |
+======================================================================+
```

For soft rollback, also output:
```
  Files reset to checkpoint state
  Changes preserved in working directory — review: git diff
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
- **Rollback target restriction** -- `git reset --hard` only on `frame/checkpoint/*` tags
- **Always require confirmation** -- never run `git reset --hard` without user approval
- **Show diff before rollback** -- what will be lost

## Result

- Checkpoint created via git tag
- Old checkpoints automatically pruned
- Cleanup after Ship
- Rollback to any checkpoint with confirmation (hard or soft)
