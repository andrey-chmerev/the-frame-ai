---
description: "Manage git worktrees for parallel task execution without context switching"
argument-hint: "[create | list | cleanup | <task-name>]"
allowed-tools: [Bash]
---
# /frame:worktree -- Git Worktrees

Manage isolated git worktrees for parallel work.

> **Low-level tool.** For parallel work on *planned features* prefer the orchestration layer: `/frame:parallel start <feature>` — it creates the worktree, checks file overlaps between features, and registers the task on `.planning/BOARD.md`; `/frame:integrate` merges everything back with quality gates. Use `/frame:worktree` directly for ad-hoc experiments and manual worktree management.

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
- `cleanup` (no name) -- **classify all worktrees and print a cleanup plan** (Safe to remove / Salvage first / Keep)
- `cleanup <name>` -- remove one specific worktree

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

## Action: cleanup (no name) — classify + plan

`/frame:worktree cleanup` with no name does **not** remove anything. It classifies every worktree and prints a plan so you decide what to reap. Nothing is destructive here.

### Step C1: Classify each worktree

For each linked worktree (`git worktree list`, skip the main one):
```bash
WT={path}; BR=$(git -C "$WT" branch --show-current)
DIRTY=$(git -C "$WT" status --short | wc -l | tr -d ' ')
MERGED=$(git branch --merged main | grep -qw "$BR" && echo yes || echo no)
UNPUSHED=$(git -C "$WT" log --branches --not --remotes --oneline 2>/dev/null | wc -l | tr -d ' ')
AGE=$(( ( $(date +%s) - $(stat -f %m "$WT" 2>/dev/null || stat -c %Y "$WT") ) / 86400 ))
```

Assign one class (first match wins):

| Class | Condition | Bucket |
|-------|-----------|--------|
| **merged** | branch merged into main, tree clean | Safe to remove |
| **idle** | clean, not merged, no unpushed commits, age < 14d | Keep |
| **stale** | clean, not merged, age ≥ 14d | Keep (flag for review) |
| **salvage** | has unpushed commits (`UNPUSHED > 0`) OR uncommitted changes (`DIRTY > 0`) | Salvage first |
| **dirty** | uncommitted changes present | Salvage first |

### Step C2: Print the plan

```
Cleanup plan:
  Safe to remove (merged, clean):
    - feature/auth  → /frame:worktree cleanup auth
  Salvage first (unpushed commits / uncommitted changes — DO NOT remove yet):
    - feature/billing  (3 unpushed commits) → push or /frame:integrate first
  Keep:
    - feature/search  (idle 4d)
    - feature/reports (stale 21d — review whether still needed)
```

Never auto-remove. Offer to run `cleanup <name>` for each "Safe to remove" entry after the user confirms. For "Salvage first", tell them exactly what would be lost (unpushed commits / dirty files) and how to preserve it (push, /frame:integrate, or commit) before any removal.

---

## Action: cleanup <name>

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

### Step 1: Check Status (salvage guard)

```bash
cd ../{project}-{name}
git status --short
# unpushed commits that would be lost with the branch:
git log --branches --not --remotes --oneline 2>/dev/null
# is the branch merged into main?
git branch --merged main | grep -qw "feature/{name}" && echo "MERGED" || echo "NOT_MERGED"
```

If there are **uncommitted changes** OR **unpushed commits** OR the branch is **NOT_MERGED**, warn the user precisely what would be lost and request confirmation. Only a `merged` + clean worktree is safe to remove without a second thought.

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

## Native Isolation: worktree (for parallel subagents)

When spawning multiple subagents via the Agent tool for parallel work, use the `isolation: "worktree"` parameter instead of manual worktree management:

```
Agent(task: "...", isolation: "worktree")
```

This gives each subagent its own git worktree automatically:
- No `git worktree add/remove` commands needed
- No STATE.md race conditions between parallel agents
- No file conflicts between subagents writing to the same file
- Worktree is cleaned up automatically after the subagent completes

**Use `/frame:worktree create` when**: you want a long-lived worktree you will open in a second terminal and work in interactively.

**Use `isolation: "worktree"` in Agent tool when**: you are orchestrating parallel subagents from `/frame:build --parallel` or `/frame:build --review-team`.

## Rules

- **WorktreeBase**: `../` -- sibling directories
- **Branch naming**: `feature/{name}`
- **Context copy**: STATE.md, CONTEXT.md, MAP.md
- **Cleanup plan classifies** -- `cleanup` (no name) buckets worktrees as Safe to remove / Salvage first / Keep; it never removes anything
- **Salvage guard on removal** -- `cleanup <name>` refuses silent removal when a worktree has uncommitted changes, unpushed commits, or an unmerged branch
- **Never force** -- warn about potential work loss (unpushed commits and dirty files spelled out)

## Result

- Git worktree created/removed
- Branch created/removed
- Context copied
