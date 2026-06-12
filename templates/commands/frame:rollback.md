---
description: "Roll back to a FRAME checkpoint with confirmation"
argument-hint: "[<checkpoint-tag>]"
allowed-tools: [Read, Bash]
---
# /frame:rollback -- Rollback to Checkpoint

Roll back to the last or a specific checkpoint with confirmation.

## Instructions

Command: **$ARGUMENTS**

### Routing

Determine action from arguments:
- (empty) -- rollback to the last checkpoint
- `--to <tag>` -- rollback to a specific checkpoint
- `--soft` -- soft rollback (files stay in working tree)

---

## Action: Default (last checkpoint)

### Step 0: Update STATE.md (IN_PROGRESS) + Fail-Fast Checks

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
❌ Rollback blocked: uncommitted changes detected.
   Commit or stash your changes first:
   git stash   (to save temporarily)
   git checkout -- .   (to discard)
```

### Step 1: Find Last Checkpoint

```bash
LAST_CHECKPOINT=$(git tag -l "frame/checkpoint/*" --sort=-creatordate | head -n 1)
```

If no checkpoints exist, show "No checkpoints found" and exit.

### Step 2: Show Diff

```bash
echo "=== Changes since checkpoint ==="
git log --oneline $LAST_CHECKPOINT..HEAD
echo ""
echo "=== Files changed ==="
git diff --stat $LAST_CHECKPOINT..HEAD
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

**If the user does not confirm** -> abort, do nothing.

### Step 4: Execute Rollback

```bash
git reset --hard $LAST_CHECKPOINT
```

### Step 5: Show Result + Update STATE.md (DONE)

Update `.planning/STATE.md`:
```markdown
- Phase: {previous_phase}
- Status: ROLLED_BACK
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

---

## Action: --to <tag>

Rollback to a specific checkpoint.

### Step 0: Update STATE.md (IN_PROGRESS) + Fail-Fast Checks

Same as Default action Step 0.

### Step 1: Validate Tag

```bash
git tag -l "$TAG"
```

If tag is not found, show available checkpoints:
```bash
git tag -l "frame/checkpoint/*" --sort=-creatordate
```

### Step 2: Show Diff

```bash
echo "=== Changes since $TAG ==="
git log --oneline $TAG..HEAD
```

### Step 3: Confirmation + Rollback

(Same as Default, but with the specified tag)

Update STATE.md (DONE) same as Default Step 5.

---

## Action: --soft

Soft rollback: files reset to checkpoint state, but changes remain in the working tree.

### Step 0: Update STATE.md (IN_PROGRESS)

Update `.planning/STATE.md`:
```markdown
- Phase: ROLLBACK
- Status: IN_PROGRESS
- Started: {timestamp}
```

### Step 1: Find Checkpoint

(Same as Default)

### Step 2: Show Diff (what will be preserved)

```bash
echo "=== Changes that will be preserved in working tree ==="
git diff --stat $LAST_CHECKPOINT..HEAD
```

### Step 3: Execute Soft Rollback

```bash
git reset --soft $LAST_CHECKPOINT
```

### Step 4: Show Result + Update STATE.md (DONE)

Update `.planning/STATE.md`:
```markdown
- Phase: {previous_phase}
- Status: SOFT_ROLLED_BACK
- Checkpoint: {tag}
```

```
+======================================================================+
|                    SOFT ROLLBACK COMPLETE                             |
+======================================================================+
|  Rolled back to: {tag}                                               |
|                                                                      |
|  Files reset to checkpoint state                                     |
|  Changes preserved in working directory                              |
|                                                                      |
|  Review changes: git diff                                            |
|  Discard changes: git checkout -- .                                  |
|  Next: /frame:checkpoint list   (to see remaining checkpoints)       |
+======================================================================+
```

## Rules

- **Always require confirmation** -- never run `git reset --hard` without user approval
- **Show diff** -- what will be lost
- **Soft rollback** -- alternative for cautious rollback
- **Check git status** -- verify no uncommitted changes before rollback

## Result

- Rollback executed (hard or soft)
- User informed about lost changes
