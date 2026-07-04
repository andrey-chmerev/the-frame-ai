---
description: "Orchestrate parallel feature work across git worktrees — start tasks, view the board, stop tasks"
argument-hint: "start <feature> | status | stop <feature>"
allowed-tools: [Read, Write, Edit, Bash]
---
# /frame:parallel -- Parallel Feature Orchestration

High-level layer above `/frame:worktree`: launches a planned feature into its own worktree, tracks all parallel tasks on a board (`.planning/BOARD.md`), and stops tasks. When features are done, `/frame:integrate` merges them back.

**You usually don't call `start` by hand.** `/frame:build` auto-routes: when you build a feature while another is already in flight, build offers to set up the worktree for you (it runs the `start` procedure below). Call `/frame:parallel start` explicitly only when you want to provision the worktree up front, before building. `status` and `stop` are always called directly.

**Pipeline**: `/frame:research X` → `/frame:plan X` → `/frame:build X` (auto-creates the worktree if another feature is active) → (second terminal: `/frame:build X` → `/frame:review`) → `/frame:integrate` → `/frame:ship`.

### Routing

- `start <feature>` — create worktree + branch for a planned feature, register on the board
- `status` — refresh and show the board (walks all worktrees, reads their state)
- `stop <feature>` — remove a task from the board without merging (worktree cleanup)

## Instructions

### Step 0: Fail-fast validation (all subcommands)

```bash
git rev-parse --git-dir 2>/dev/null || echo "NOT_GIT"
git rev-parse --git-common-dir
```

- `NOT_GIT` → STOP: "Error: not a git repository."
- If `--git-common-dir` output contains `worktrees/` — you are inside a linked worktree → STOP: "Run /frame:parallel from the main worktree (the board lives there)."

Read `parallel` config from `.frame/config.json`. If the section is missing, use defaults:
```json
{ "maxWorktrees": 3, "mergeStrategy": "merge" }
```

---

## Action: start <feature>

### Step S1: Validate

1. `{feature}` argument required and must match `^[a-z0-9]([a-z0-9\-]*[a-z0-9])?$`.
2. `docs/specs/{feature}/plan.md` must exist → otherwise STOP: "No plan for {feature}. Run /frame:research {feature} and /frame:plan {feature} first."
3. Worktree must not already exist:
```bash
git worktree prune   # clear phantom entries first (worktree dirs deleted by hand with rm -rf)
git worktree list | grep "feature/{feature}" && echo "EXISTS"
```
4. Count **active** rows in `.planning/BOARD.md` (if the file exists). If count ≥ `parallel.maxWorktrees` → STOP: "Board is full ({N}/{max} active tasks). Finish or stop one first (/frame:integrate or /frame:parallel stop). You can raise parallel.maxWorktrees in .frame/config.json."

### Step S2: File-overlap check

Collect the new feature's file list:
- Read `## Touched Files` from `docs/specs/{feature}/plan.md`;
- **Fallback (older plans)**: if the section is missing, collect the union of all `Files:` fields from the plan's tasks.

For each **active** task on the board, collect its file list the same way (from `docs/specs/{other}/plan.md` in the main worktree).

If any files overlap → show the intersection and ask **once**:
```
⚠️ {feature} and {other} both touch: {file list}
   Parallel work on shared files means merge conflicts at /frame:integrate.
   1) start anyway  2) wait until {other} is integrated  3) revisit feature boundaries
```
Only proceed on explicit "start anyway".

### Step S3: Create worktree + branch

```bash
git worktree add ../$(basename $(pwd))-{feature} -b feature/{feature}
```

Copy planning context into the worktree:
```bash
mkdir -p ../$(basename $(pwd))-{feature}/.planning/memory
cp .planning/CONTEXT.md ../$(basename $(pwd))-{feature}/.planning/ 2>/dev/null || true
cp .planning/MAP.md ../$(basename $(pwd))-{feature}/.planning/ 2>/dev/null || true
cp .planning/memory/*.md ../$(basename $(pwd))-{feature}/.planning/memory/ 2>/dev/null || true
```

Write a **fresh** worktree-local `.planning/STATE.md` (do NOT copy the main one — the worktree has its own single task):
```markdown
# STATE.md — Current Position

## Current Position
- Phase: PLAN
- Feature: {feature}
- Task: 0/{total from plan.md}
- Status: COMPLETE — plan ready, start /frame:build {feature}
- Worktree: ../{project}-{feature} (parallel task, board in main worktree)
```

If the spec files (`docs/specs/{feature}/`) are untracked or uncommitted in main, commit them to the feature branch so the worktree sees them:
```bash
git -C ../$(basename $(pwd))-{feature} status --short docs/specs/{feature}/
```
If missing there — copy `docs/specs/{feature}/` into the worktree and commit: `docs({feature}): add spec and plan`.

### Step S4: Register on the board

If `.planning/BOARD.md` does not exist, create it:
```markdown
# BOARD — параллельные задачи

Managed by /frame:parallel. Rows are refreshed by `status` — do not edit by hand.

| Feature | Phase | Branch | Worktree | Progress | Status | Updated |
|---------|-------|--------|----------|----------|--------|---------|

## Touched Files (cache)
```

Append the row:
```markdown
| {feature} | PLAN | feature/{feature} | ../{project}-{feature} | 0/{total} tasks | active | {HH:MM} |
```

And add the feature's file list (from Step S2) under `## Touched Files (cache)`:
```markdown
- {feature}: src/api/auth.ts, src/routes/login.tsx, ...
```
This cache lets `/frame:fast` and `/frame:debug` do their overlap check by reading BOARD.md alone, without opening every active feature's plan.md.

### Step S5: Show next step

```
+======================================================================+
|                    PARALLEL TASK STARTED                              |
+======================================================================+
|  Feature:  {feature}                                                 |
|  Branch:   feature/{feature}                                         |
|  Worktree: ../{project}-{feature}                                    |
|  Board:    {N}/{max} active tasks                                    |
+======================================================================+

Next: open a second terminal and run:
  cd ../{project}-{feature} && claude
  → /frame:build {feature}

Meanwhile you can start the next feature here: /frame:research <next>
Check progress anytime: /frame:parallel status
```

---

## Action: status

### Step T1: Read the board

If `.planning/BOARD.md` does not exist or has no rows → say: "Board is empty. Start a task: /frame:parallel start <feature>" and stop.

### Step T2: Refresh every non-integrated row

First, clear phantom worktree entries (dirs deleted by hand with `rm -rf` stay registered in git and break the next `start`):
```bash
git worktree prune
```

For each row (skip `integrated` / `stopped` rows — show them in a separate "Done/stopped" list):

```bash
# worktree still there?
git worktree list | grep "feature/{feature}"
# state inside the worktree
cat {worktree}/.planning/STATE.md 2>/dev/null
# task progress from the plan (worktree copy is authoritative — build marks [DONE] there)
grep -c "^### Task" {worktree}/docs/specs/{feature}/plan.md
grep -c "\[DONE\]" {worktree}/docs/specs/{feature}/plan.md
# uncommitted work?
git -C {worktree} status --short | head -5
```

Derive per task: `Phase` and `Status` from worktree STATE.md, `Progress` as `{done}/{total} tasks` (or the review verdict once Phase is REVIEW/TEST). Worktree missing → mark row `orphaned` (suggest `stop` to clear it).

Rewrite the BOARD.md table with fresh values and `Updated: {HH:MM}`. Refresh the `## Touched Files (cache)` section too — take each active feature's `## Touched Files` from its worktree plan.md (the plan may have gained tasks since `start`); drop lines for rows no longer active.

### Step T3: Display

```
+======================================================================+
|  BOARD — {N} active / {max}                                          |
+======================================================================+
|  auth     BUILD   4/7 tasks   feature/auth     ../project-auth       |
|  billing  REVIEW  approve     feature/billing  ../project-billing    |
+======================================================================+
```

Then one action line:
- All active tasks at `REVIEW/TEST + approve/ready to ship` → `→ Run: /frame:integrate — all tasks ready to merge`
- Some task has `WAVE_FAILED` / `REVIEW_FAILED` / uncommitted changes and no progress → point at it
- Otherwise → "Work continues in {list of worktrees}; start another: /frame:parallel start <feature>"

---

## Action: stop <feature>

### Step P1: Confirm

Find the row. Check the worktree:
```bash
git -C ../{project}-{feature} status --short
git log main..feature/{feature} --oneline | head -5
```

If there are uncommitted changes or unmerged commits — warn:
```
⚠️ feature/{feature} has {N} unmerged commits / uncommitted changes.
   Stopping removes the worktree. The branch is kept unless you say otherwise.
   Continue? (y/n)
```

### Step P2: Remove worktree

```bash
git worktree remove ../{project}-{feature}
```
(Use `--force` only if the user explicitly confirmed discarding uncommitted changes.)

Ask whether to delete the branch too; if yes: `git branch -D feature/{feature}`.

### Step P3: Update board + memory

Mark the row `stopped` (keep it for history) and remove the feature's line from `## Touched Files (cache)`. Append one line to `.planning/memory/learnings.md` under `## Decisions` with the stop reason (ask the user for a short reason if not obvious).

---

## Rules

- **Main worktree only** — the board lives in main; linked worktrees never run /frame:parallel
- **Board is a cache** — only start/status/stop/integrate rewrite it; worktrees never write to it (no races)
- **Plan before parallel** — no worktree without `docs/specs/{feature}/plan.md`
- **Respect maxWorktrees** — default 3; missing config section = defaults
- **Overlap check before creation** — warn about shared files while it is still cheap to wait
- **Never force-remove silently** — data loss requires explicit confirmation
- **`/frame:worktree` stays low-level** — manual worktrees are fine, but only board rows are orchestrated

## Result

- `start`: worktree + branch created, context copied, task on the board, next step shown
- `status`: board refreshed from live worktree state, one action line
- `stop`: worktree removed, row marked stopped, reason recorded
