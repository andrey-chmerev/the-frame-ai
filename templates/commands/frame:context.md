# /frame:context -- Quick Context Digest

> Shows a compact re-entry digest (git activity, current task, next step).
> Different from `memory/context.md` — that file stores persistent project context written by agents.
> This command *reads* that file (and STATE.md, git log) and presents a summary.

Fast re-entry after a break: what happened, where you are, what's next.

## Instructions

### Step 1: Git activity (last 3 days)

```bash
git log --oneline --since="3 days ago"
git diff HEAD~3 --stat 2>/dev/null || git diff --stat
```

### Step 2: Read state files

Read in order:
- `.planning/STATE.md` — current phase, feature, task
- `.planning/pause-history/` — last pause-state if exists (most recent file)

### Step 3: Find open tasks

From STATE.md extract tasks list. Count: total, done, remaining.
If `resumeHint` exists in pause-state — use it as the next step.
Otherwise derive next step from the first unchecked task in plan.md (if exists).

### Step 4: Output digest

Print a compact summary:

```
╔══════════════════════════════════════════╗
║  FRAME CONTEXT                           ║
╠══════════════════════════════════════════╣
║  Phase:    {phase}                       ║
║  Feature:  {feature}                     ║
║  Task:     {done}/{total}                ║
║  Status:   {status}                      ║
╠══════════════════════════════════════════╣
║  Last 3 days:                            ║
║    {commit 1}                            ║
║    {commit 2}                            ║
║    ...                                   ║
╠══════════════════════════════════════════╣
║  Changed files (diff HEAD~3):            ║
║    {file 1} (+N -M)                      ║
║    {file 2} (+N -M)                      ║
╠══════════════════════════════════════════╣
║  Next:     {resumeHint or next task}     ║
╚══════════════════════════════════════════╝
```

If no commits in 3 days, show "No commits — fresh start?"
If tasks remain: show count "X tasks left"

## Rules

- Output only — no STATE.md writes
- Max 25 lines total
- If STATE.md is missing: "Run /frame:init first"
- Always show next step — never leave user without direction
