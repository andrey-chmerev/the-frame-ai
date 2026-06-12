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

### Step 3: Confirm

Output:
```
Added Task {N}: {$ARGUMENTS}
Edit plan.md to fill in Files, Test, Dependencies.
```

## Result

- Task appended to plan.md
- STATE.md not modified
