---
description: "Add a task to the current plan.md without interrupting work"
argument-hint: "<task description>"
allowed-tools: [Read, Write, Bash]
---
# /frame:add-task -- Add Task to Current Plan

Quickly adds a task to the current plan.md without interrupting work.

## Instructions

Add task: **$ARGUMENTS**

### Step 0: Fail-fast validation

Find current plan.md:
```bash
find docs/specs -name "plan.md" | head -1
```

If not found — STOP: "No plan.md found. Run /frame:plan first."

If `$ARGUMENTS` is empty — STOP: "Provide a task description: /frame:add-task <description>"

### Step 1: Read plan.md

Read the plan.md to understand:
- Current task count (to assign next task number)
- Current wave count (to assign to last wave or new wave)
- Existing task format

### Step 2: Append task

Add to the end of the Tasks section in plan.md:

```markdown
### Task {N}: {$ARGUMENTS}
- Files: TBD
- Files Changed: TBD
- Complexity: low
- Risk: low
- Estimate: TBD
- Wave: {last wave}
- Test: TBD
- Dependencies: TBD
- Verification: TBD
- Status: [ ]
- Added: {date}
```

### Step 2.5: Parallel overlap re-check (only if BOARD.md has active rows)

```bash
[ -f .planning/BOARD.md ] && grep "| active |" .planning/BOARD.md || echo "NO_ACTIVE_TASKS"
```

A new task can silently break the file-disjointness that `/frame:parallel start` verified at launch time. If active parallel tasks exist and the new task's files are known (stated by the user or obvious from the description):

1. Compare them against BOARD.md `## Touched Files (cache)` (fallback: each active feature's plan.md `## Touched Files`).
2. Overlap with another active feature → warn before appending:
   ```
   ⚠️ {file} is also being changed by feature "{X}" (worktree ../{project}-{X}).
      Adding this task creates a merge conflict at /frame:integrate.
      1) add anyway (conflict resolved at integrate)  2) rescope the task  3) add it to {X}'s plan instead
   ```
3. Also append the new files to this plan's `## Touched Files` section so the board cache stays truthful on the next `/frame:parallel status`.

If the files are still TBD — append the task, but note in the output: "Files TBD — overlap with parallel features not checked; fill in Files: before building."

### Step 3: Confirm

Output:
```
Added Task {N}: {$ARGUMENTS}
Edit plan.md to fill in Files, Test, Dependencies.
```

## Result

- Task appended to plan.md
- Parallel overlap checked (when BOARD.md has active tasks and files are known)
- STATE.md not modified
