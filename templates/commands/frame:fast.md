---
description: "Execute a quick task end-to-end without full research/plan cycle"
argument-hint: "<task description>"
allowed-tools: [Read, Write, Edit, Bash]
---
# /frame:fast -- Quick Task

Executes a quick task without the full workflow: mini Research -> mini Plan -> Build.

## Instructions

Execute the quick task: **$ARGUMENTS**

### Step 0: Initialize (10 sec)

**Save the current position first**: read `.planning/STATE.md` and remember the existing `## Current Position` block — a fast task is a side quest and must not hijack pipeline state (e.g. `Phase: INTEGRATE — ready to ship` would block /frame:ship if lost). You will restore it in Step 4.

Write to `.planning/STATE.md`:
```markdown
## Current Position
- Phase: BUILD
- Feature: {task description}
- Status: IN_PROGRESS
```

Check `.planning/memory/learnings.md` — `## Anti-Patterns` section only (skip full memory read — speed is the point).

**Scope check**: estimate mentally. If the task clearly requires more than 30 minutes → **STOP immediately**: "This task needs `/frame:build` — it involves {reason}: {estimated scope}."
Do NOT continue on an oversized task even if asked.

### Step 1: Mini Research (30 sec)

Quickly analyze:
- What needs to be done
- Where the relevant files are — check `.planning/MAP.md` (only this, no full memory read)

### Step 2: Mini Plan (30 sec)

Determine:
- Which files to change
- What test to write (if needed)
- Which verification command to use

### Step 2.5: Parallel-safety check (only if BOARD.md exists)

```bash
[ -f .planning/BOARD.md ] && grep "| active |" .planning/BOARD.md || echo "NO_ACTIVE_TASKS"
```

If there are active parallel tasks, compare the files you are about to change with each active feature's file list. Read it from BOARD.md's `## Touched Files (cache)` section (one read, no plan-walking). Fallback if the section is missing (older board): each feature's `## Touched Files` from `docs/specs/{feature}/plan.md`, or the union of its tasks' `Files:` fields.

**Overlap found** → stop and ask once:
```
⚠️ {file} is also being changed by feature "{X}" (worktree ../{project}-{X}).
   1) Fix it in that worktree instead — the fix ships with the feature, zero merge risk (best when the bug is in the feature's area)
   2) Fix here in main — regression test becomes MANDATORY so /frame:integrate gates catch it if the feature's merge undoes the fix
   3) Defer until {X} is integrated
```

If option 2 → the fix MUST include a regression test (overrides "tests optional") and the commit message must contain `hotfix`: `fix({scope}): {description} [hotfix]` — /frame:integrate uses this marker for conflict protection.

**No overlap** → proceed silently; a plain main-branch fix merges cleanly by construction.

### Step 3: Build (2-5 min)

Execute:
1. If a test is needed -- write the test first (RED)
2. Write the code (GREEN)
3. Refactor if needed
4. Run quality gates: `{quality.commands.typecheck} && {quality.commands.test} && {quality.commands.lint}`
5. Git commit: `git add {files} && git commit -m "{type}({scope}): {description}"`

### Step 3.5: UI Verification (if UI task)

**Detect UI task**: task description or changed files contain `.tsx`, `.vue`, `.css`, `component`, `page`, `layout`, `style`, `UI`, or `interface`.

If this is a UI task AND Playwright MCP is available (`browser_navigate` tool exists):
1. `browser_navigate: {dev server URL from .frame/config.json or ask user}`
2. `browser_screenshot`
3. Compare screenshot with task description
4. **PASS** → continue to Step 4
5. **FAIL** → describe the problem, return to Step 3 and fix, then re-verify

If Playwright MCP is not available — skip this step and note: "UI not verified (no browser tool)".

### Step 4: Update STATE.md and wins

**Restore the saved position** from Step 0 and append one line about this task:
```markdown
## Current Position
{the block saved in Step 0, unchanged}
- Last fast task: {date} — {task description} (commit {hash})
```
(If Step 0 found no meaningful prior position — fresh project, SETUP phase — write `Phase: BUILD / Status: Fast task completed` instead.)

If a new anti-pattern was discovered, add it to `.planning/memory/learnings.md` `## Anti-Patterns`.

Show one-line output summary:
```
fast: {task} — {files changed} file(s) changed, {tests} tests added, commit {hash}
```

## Rules

- **Fast** — entire task ≤30 min; scope check at Step 0, hard stop if over
- **Minimal ceremony** — only MAP.md + Anti-Patterns; no full memory read
- **Tests optional** — only if logic changed; **EXCEPT**: fix overlapping an active parallel feature → regression test mandatory + `[hotfix]` in commit message
- **Board check before editing** — with active parallel tasks, warn on file overlap before touching anything
- **Side quest, not a phase change** — previous `## Current Position` is saved and restored; fast never hijacks pipeline state
- **Quality gates mandatory** — typecheck + test + lint
- **Specific files** — never `git add -A`
- **Escalate by fact** — if you discover mid-task that it's larger than 30 min, stop and redirect to `/frame:build`

## When to Use

- "Add a button"
- "Change a color"
- "Add an icon"
- "Fix a typo"
- "Add padding/margin"
- "Rename a function"
- "Add a field to a type"
- "Add an env variable"

## Result

- Task completed in ≤30 minutes
- Quality gates passed
- Git commit created
- One-line summary printed
