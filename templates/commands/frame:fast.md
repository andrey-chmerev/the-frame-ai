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

**Concurrent-work check** — is this tree busy? Deterministic signal first, question second:

1. **Autopilot marker**: `[ -f "$(git rev-parse --git-dir)/frame-autopilot" ]` → a `/frame:auto` flight is live in this tree **right now** — no need to ask. Go straight to the **Hotfix worktree hand-off** below.
2. **No marker, but the saved `Status:` ends with `IN_PROGRESS`** (`IN_PROGRESS` or `FIX_IN_PROGRESS` — any phase: `BUILD`, `INTEGRATE`, `DEBUG`, `FIX`): a build/integration/fix is either unfinished or running in another terminal on this same tree — you can't tell which from here. Ask **once**:
```
⚠️ STATE.md shows {phase} IN_PROGRESS. If that work is running in another terminal on this tree,
   a fast task here can collide with it (shared index, STATE.md, gate status).
   1) it's stale (that session was interrupted) — continue the fast task
   2) it's live in another terminal — isolate this fix in a hotfix worktree (safe, zero interference)
   3) cancel — I'll finish/pause the other work first
```
Only proceed on "continue"; option 2 → **Hotfix worktree hand-off** below. (If `Status:` is `COMPLETE`, `Shipped`, or the project is fresh — no prompt, continue silently.)

#### Hotfix worktree hand-off (side quest while this tree is busy)

The busy session owns this tree's git index, `.planning/STATE.md`, **and** the quality-gate status (`$GIT_DIR/frame-gate-status`) — even careful edits from a second session here can flip its gate red and block its commits mid-wave. Don't share the tree; a worktree has its own copy of all three:

```bash
SLUG={2-4 kebab-case words from the task, e.g. fix-session-reset}
git worktree list | grep -q "hotfix-$SLUG" && SLUG="$SLUG-2"
git worktree add "../{project}-hotfix-$SLUG" -b "hotfix/$SLUG"
# gates need the config if it isn't tracked:
[ -f "../{project}-hotfix-$SLUG/.frame/config.json" ] || { mkdir -p "../{project}-hotfix-$SLUG/.frame"; cp .frame/config.json "../{project}-hotfix-$SLUG/.frame/" 2>/dev/null || true; }
```

If `.planning/BOARD.md` exists, append a row for `hotfix/$SLUG` with status `active` and type `hotfix` — `/frame:integrate` will pick the branch up with the batch. Then hand off and **STOP**:

> Hotfix worktree ready — the fix runs isolated from the work in this tree.
> → `cd ../{project}-hotfix-$SLUG && claude` → `/frame:fast "{task}"`
> Merge path: `/frame:integrate` takes `hotfix/$SLUG` first with the batch, or `git merge hotfix/$SLUG` from main once it's free.

#### Running inside a hotfix worktree

Detected by: `git rev-parse --git-common-dir` contains `worktrees/` **and** the current branch starts with `hotfix/`. Proceed normally — you are isolated (own index, own STATE.md, own gate status; the concurrent-work check passes by construction). Two defaults are overridden:
- the commit message **MUST** carry the `[hotfix]` marker: `{type}({scope}): {description} [hotfix]`;
- a regression test is **MANDATORY** (overrides "tests optional") — `/frame:integrate`'s hotfix protection keys off both.

Finish by reporting the merge path (integrate with the batch, or manual merge from main when it's free).

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
- **Busy tree → hotfix worktree** — an autopilot marker (or a confirmed live session) routes the fix into `../{project}-hotfix-{slug}` on branch `hotfix/{slug}`; in that worktree the `[hotfix]` commit marker and a regression test are mandatory
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
