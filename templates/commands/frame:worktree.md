---
description: "Manage git worktrees for parallel task execution without context switching"
argument-hint: "[create | list | cleanup | <task-name>]"
allowed-tools: [Bash]
---
# /frame:worktree -- Git Worktrees

Manage isolated git worktrees for parallel work.

## Instructions

Command: **$ARGUMENTS**

### Step 0: Fail-fast validation

Before routing, run these checks:

```bash
git rev-parse --git-dir 2>/dev/null || echo "NOT_GIT"
```

If output is `NOT_GIT` — STOP with error: "Error: not a git repository. Run this command from inside a git project."

For `create`: if `$NAME` is empty — STOP with error: "Error: name is required. Usage: /frame:worktree create <name>"

### Routing

Determine action from the first argument:
- `create <name>` -- create a worktree
- `list` -- show all worktrees
- `switch <name>` -- switch to a worktree
- `cleanup <name>` -- remove a worktree

---

## Action: create

Create a git worktree with an isolated workspace.

Update STATE.md at the start:
```markdown
## Current Position
- Phase: WORKTREE
- Action: create
- Name: feature/{name}
- Status: IN_PROGRESS
- Started: {timestamp}
```

### Step 1: Validate Name

Name must follow git branch naming conventions:
```bash
echo "$NAME" | grep -E '^[a-z0-9]([a-z0-9\-]*[a-z0-9])?$'
```

Check if worktree already exists:
```bash
git worktree list | grep "feature/$NAME" && echo "EXISTS"
```

If EXISTS — STOP with error: "Error: worktree feature/{name} already exists."

### Step 2: Create Worktree

```bash
git worktree add ../$(basename $(pwd))-$NAME -b feature/$NAME
```

Say: "Worktree created, copying context..."

### Step 3: Copy Context

Copy planning context into the new worktree:
```bash
mkdir -p ../$(basename $(pwd))-$NAME/.planning
cp .planning/STATE.md ../$(basename $(pwd))-$NAME/.planning/
cp .planning/CONTEXT.md ../$(basename $(pwd))-$NAME/.planning/ 2>/dev/null || true
cp .planning/MAP.md ../$(basename $(pwd))-$NAME/.planning/ 2>/dev/null || true
```

### Step 4: Show Result

Update STATE.md:
```markdown
## Current Position
- Phase: WORKTREE
- Action: create
- Name: feature/{name}
- Status: COMPLETE
- Started: {timestamp}
```

```
+======================================================================+
|                    WORKTREE CREATED                                   |
+======================================================================+
|  Name: feature/{name}                                                |
|  Path: ../{project}-{name}                                           |
|  Branch: feature/{name}                                              |
|                                                                      |
|  cd ../{project}-{name} to work in isolation                         |
+======================================================================+
```

---

## Action: list

Show all active worktrees.

```bash
git worktree list
```

### Output

```
+======================================================================+
|                    GIT WORKTREES                                      |
+======================================================================+
|  {path} [{branch}]                                                   |
|  {path} [{branch}]                                                   |
+======================================================================+
```

---

## Action: switch

Switch to another worktree.

Show the path and instructions:
```bash
WORKTREE_PATH="../$(basename $(pwd))-$NAME"
if git worktree list | grep -q "feature/$NAME"; then
  echo "WORKTREE_PATH=$WORKTREE_PATH"
else
  echo "ERROR: worktree feature/$NAME not found"
  git worktree list
fi
```

Tell the user: "Open a new terminal and run: `cd $WORKTREE_PATH`"

Show current status of the worktree:
```bash
git -C "../$(basename $(pwd))-$NAME" status 2>/dev/null
git -C "../$(basename $(pwd))-$NAME" branch --show-current 2>/dev/null
```

---

## Action: cleanup

Remove a worktree and branch.

Update STATE.md at the start:
```markdown
## Current Position
- Phase: WORKTREE
- Action: cleanup
- Name: feature/{name}
- Status: IN_PROGRESS
- Started: {timestamp}
```

### Step 1: Check Status

```bash
cd ../{project}-{name}
git status --short
```

If there are uncommitted changes, warn the user and request confirmation.

### Step 2: Remove Worktree

```bash
cd {project-root}
git worktree remove ../{project}-{name}
```

### Step 3: Remove Branch (optional)

```bash
git branch -d feature/{name}
```

### Step 4: Show Result

Update STATE.md:
```markdown
## Current Position
- Phase: WORKTREE
- Action: cleanup
- Name: feature/{name}
- Status: COMPLETE
- Started: {timestamp}
```

```
+======================================================================+
|                    WORKTREE REMOVED                                   |
+======================================================================+
|  Name: feature/{name}                                                |
|  Path: removed                                                       |
|  Branch: {deleted or kept}                                           |
+======================================================================+
```

## Rules

- **WorktreeBase**: `../` -- sibling directories
- **Branch naming**: `feature/{name}`
- **Context copy**: STATE.md, CONTEXT.md, MAP.md
- **Cleanup**: check for uncommitted changes before removal
- **Never force** -- warn about potential work loss

## Result

- Git worktree created/removed
- Branch created/removed
- Context copied
