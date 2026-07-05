---
description: "Implement planned tasks using TDD — auto-routes to a worktree when another feature is already in flight, and auto-detects parallel waves from plan.md"
argument-hint: "[feature]"
allowed-tools: [Read, Write, Edit, Bash]
---
# /frame:build -- Implementation per plan.md

Reads plan.md, executes tasks with TDD and quality gates. Two kinds of parallelism happen automatically, no flags and no separate commands to remember:
- **Between features** — if another feature is already being built, build sets this one up in its own git worktree for you (Step 0).
- **Within a feature** — waves marked `Parallel:` in plan.md run their tasks concurrently (Step 4).

### Routing

- (no args) — feature from `.planning/STATE.md`; if empty, find last plan.md with unclosed tasks; if multiple candidates, show list and ask
- `{feature}` — build a specific feature by name

## Instructions

### Step 0.0: Classify task SIZE — route the ceremony (do this before anything)

Heavy frameworks burn time forcing full Research→Plan→Build on one-line fixes. Before routing, classify the work and take the shortest correct path. State the SIZE and the chosen route in one line so it's visible.

| SIZE | Criteria | Route |
|------|----------|-------|
| **trivial** | 1 file, a few lines; no new dependency/contract; zero design ambiguity (typo, copy tweak, constant, obvious guard) | **Implement → Review → Commit inline.** Skip plan.md/waves. Still write/adjust a test if logic changed. |
| **small** | 1–2 files; no new public API or dependency; design is obvious | **Light context (MAP.md + relevant memory) → Implement → Review → Commit.** No plan.md required. |
| **standard** | 2–5 files; may add a type/contract; some design choices | **Full flow** — requires `plan.md` (run /frame:plan first). Steps 1–7 below. |
| **large** | 5+ files, touches core/routing, new dependency or external contract, or real design ambiguity | **Full pipeline with a plan gate** — `plan.md` mandatory; if any `Risk: high`, plan must have passed devil's-advocate. Steps 1–7 below. |

Routing rules:
- **trivial / small** — you do NOT need plan.md. Do a targeted context read, make the change with a test, then go straight to Step 6 (final gates) and Step 7. Skip Steps 1–5 (wave machinery). Announce: `SIZE: trivial → inline implement, no plan.`
- **standard / large** — plan.md is required. If it's missing, STOP: "SIZE: {standard|large} needs a plan. Run /frame:plan {feature} first." Then continue with Step 0 onward.
- **When unsure between two sizes, pick the larger** — under-ceremony on a real change is costlier than a little overhead.

Then continue to Step 0 (worktree routing) for every SIZE.

### Step 0: Parallel routing — decide WHERE this build runs (do this first)

Before touching anything, figure out whether this build should happen here or in an isolated worktree. This is what lets you "just run build" without thinking about `/frame:parallel`.

```bash
git rev-parse --git-common-dir            # worktree detection
[ -f .planning/BOARD.md ] && grep "| active |" .planning/BOARD.md || echo "NO_BOARD"
git worktree list
```

Resolve `{feature}` first (from args or STATE.md). Then match one case:

- **Case A — already inside a linked worktree** (`--git-common-dir` output contains `worktrees/`): you are isolated already. Skip the rest of Step 0 and go to Step 0.1 (checkpoint). This is the normal state when you opened the worktree's terminal.

- **Case B — in main, and `{feature}` already has a worktree** (a board row for `{feature}` whose worktree exists in `git worktree list`): do **not** build it here. STOP:
  > `{feature}` is being built in `../{project}-{feature}`. Continue there: `cd ../{project}-{feature} && claude` → `/frame:build {feature}`.

- **Case C — in main, and a *different* feature is active in flight** (BOARD.md has ≥1 `active` row for another feature whose worktree exists): building `{feature}` here would tie up main and share the tree with a second unfinished feature. Offer isolation:
  ```
  ⚠️ {other} is already being built (worktree ../{project}-{other}).
     Building {feature} in main now would block parallel work and mix two features in one tree.
     → Set up an isolated worktree for {feature}? [Y/n]
  ```
  - **Y (default)** → run the `/frame:parallel start {feature}` procedure (file-overlap check against active features → create worktree + `feature/{feature}` branch → copy context → register the board row). Then STOP:
    > Worktree ready at `../{project}-{feature}`. Build it there: `cd ../{project}-{feature} && claude` → `/frame:build {feature}`. Main stays free for your next research/plan.
  - **n** → build here in main (shared tree). Warn once: "Building in main — not isolated; /frame:integrate won't see it as a separate branch." Then continue to Step 0.1.

- **Case D — in main, nothing else in flight** (no BOARD.md, or no `active` rows for other features): this is the only feature going right now. Build here in main normally — no worktree overhead. Continue to Step 0.1.

> Mental model: **main is your main line; worktrees are the extra things you start while something's already cooking.** You never call `/frame:parallel` by hand — build offers it exactly when it's needed (Case C).

### Step 0.1: Checkpoint + Update STATE.md (IN_PROGRESS)

Create checkpoint before starting (feature-scoped tag — avoids collisions across parallel worktrees):
```bash
git tag "frame/checkpoint/build-{feature}-$(date +%Y%m%dT%H%M%S)" -m "Auto checkpoint before build phase"
```

This is the **only** build checkpoint. Subagents spawned in Step 4 do **not** create their own tags.

Update `.planning/STATE.md`:
```markdown
## Current Position
- Phase: BUILD
- Feature: {feature}
- Task: 0/{total}
- Status: IN_PROGRESS
- Started: {timestamp}
```

### Step 1: Find plan.md

```bash
find docs/specs -name "plan.md" | head -5
```

Read `docs/specs/{feature}/plan.md`. If not found — STOP: "plan.md not found. Run /frame:plan first."

### Step 2: Determine execution mode

Check `.planning/STATE.md`:
- `Status: REVIEW_FAILED` → **prefer `/frame:fix`** for closing review findings — it groups findings by file and fixes them in parallel without the full plan/TDD ceremony. Suggest it: "Review failed with {N} findings. Run `/frame:fix` to close them in parallel." Only continue here in **build fix-mode** when the fixes are large/architectural (findings pile into the same shared files, or require re-planning): read `docs/specs/{feature}/review.md` → Action Items, create fix tasks in plan.md under `## Fix Tasks (review {date})` **with `Files:`, `Wave:`, and a `Parallel:` label on each wave** (otherwise Step 4 can't parallelize them), then execute using the algorithm below. Each fix task references its review finding ID.
- Normal plan → proceed with Step 3.

### Step 3: Read Context

Read before implementing:
- `docs/specs/{feature}/research.md` — **Memory Impact** section (why this approach was chosen)
- `docs/specs/{feature}/spec.md` — feature specification
- `.planning/MAP.md` — project architecture
- `.planning/memory/learnings.md` — `## Patterns` Core + Active sections
- `.planning/memory/conventions.md` — code conventions
- `.planning/memory/learnings.md` `## Anti-Patterns` — what to avoid
- `.planning/memory/dependencies.md` — stack + Avoid list

**Heartbeat**: after reading context, report: "Context loaded ({N} tasks found), starting implementation..."

### Step 4: Execute waves from plan.md

**Before any wave — confirm high-risk tasks once.** Scan the whole plan for `Risk: high` tasks. If any exist, list them and **ask the user once**: "These tasks are high-risk: {list}. Proceed with all, or hold some?" Subagents cannot ask mid-run, so all confirmation happens here, up front. Tasks you spawn later are treated as already confirmed.

For each wave defined in plan.md:

#### Wave has 1 task OR `Parallel: no`

Execute inline (sequential TDD cycle — see Step 4.1 below).

#### Wave has ≥2 tasks AND `Parallel: yes`

The planner already guarantees **no two tasks in a wave touch the same file** (frame:plan.md Step A4). So parallel builders can safely share the working tree — **no worktree isolation needed** in the normal case.

Launch one `builder` subagent per task, one message, max 5 concurrent. Pass each subagent **`Mode: single-task`**.

Each subagent receives a self-contained brief (it does NOT read memory/context itself):
- **Mode: single-task** — do only this task; don't scan plan.md, don't loop, don't checkpoint, don't edit plan.md/STATE.md, don't commit
- Task description + Files + Acceptance criteria + Risk (already confirmed if high)
- Relevant conventions (extract the 3-5 applicable rules from conventions.md — don't make the agent read the file)
- Anti-patterns to avoid (the applicable ones from learnings.md)
- Instructions: implement + run the targeted test for your file(s); return final text with changed files + test status (no commit hash — orchestrator commits)

**Isolation exception**: only if a wave's tasks *could* still touch a shared file (e.g. a barrel/index, a config, a lock file the planner couldn't fully separate) — spawn those with `isolation: "worktree"` and, after each returns, bring its work into the current branch with `git cherry-pick {hash}` before running wave gates. After each cherry-pick, verify it landed completely: compare `git show --stat HEAD` against the subagent's reported changed files (a conflict-resolved cherry-pick can silently drop part of the change), and run that task's targeted test before moving on. Default path (file-disjoint tasks) needs none of this.

After all subagents complete → **wave commit + quality gates** (orchestrator, in the shared tree):
```bash
# commit each task's changes (specific files from the subagent reports)
git add {files_from_reports}
git commit -m "{type}({scope}): {wave description}"

{quality.commands.typecheck}
{quality.commands.test}
{quality.commands.lint}
```
Then mark each completed task `[DONE]` in plan.md (orchestrator owns plan.md — subagents never touch it).

If wave gates FAIL → retry only the failed tasks (re-spawn single-task, max 2 retries). If still failing:
```bash
git tag "frame/wave-failure-$(date +%Y%m%dT%H%M%S)"
```
Update STATE.md: `Status: WAVE_FAILED`. Report to user. Do NOT auto-rollback previous waves.

#### If plan.md has no `Parallel:` labels (older plan)

Determine parallelism from `Dependencies` + `Files` overlap: tasks with no shared files and no cross-dependencies → `Parallel: yes`, otherwise → `Parallel: no`.

#### Step 4.1: Inline TDD cycle

##### Risk Strategy

| Risk | Action |
|------|--------|
| `low` | Standard TDD cycle |
| `medium` | Create checkpoint: `git tag frame/checkpoint/task-{N}` |
| `high` | Checkpoint + show warning + **wait for user confirmation** |

##### RED — Write Test

1. Create test file in project test directory
2. Write failing test
3. Run: `{quality.commands.test} {test_file}`
4. **D-step**: Test must FAIL

##### GREEN — Write Code

1. Implement minimal code to pass the test
2. Run: `{quality.commands.test} {test_file}`
3. **D-step**: Test must PASS

##### REFACTOR — Clean Up

1. Refactor if needed
2. Run: `{quality.commands.test} {test_file}`
3. **D-step**: Test must PASS

##### Stuck Detection

If after **3 attempts** the test does not reach GREEN:
1. Stop
2. Report to user: what was tried, where stuck, suggest:
   - Simplify the task
   - Rewrite the test
   - Skip with `[BLOCKED]` flag

##### Quality Gates (tiered)

**After each task** — fast:
```bash
{quality.commands.test} {test_file}
```

**Every 3 tasks or after a logical wave** — full:
```bash
{quality.commands.typecheck}
{quality.commands.test}
{quality.commands.lint}
```

##### Git Commit

```bash
git add {specific_files}
git commit -m "{type}({scope}): {description}"
```

##### Mark Done

Mark task in plan.md:
```markdown
### Task N: {name} [DONE]
```

Update progress in STATE.md:
```markdown
- Task: {completed}/{total}
```

### Step 5: Check plan.md completeness

```bash
grep "^### Task" plan.md | grep -v "\[DONE\]"
# Must return empty
```

If unclosed tasks exist — return and complete them or report to user.

### Step 6: Final quality gates → readiness passport

```bash
{quality.commands.test}
{quality.commands.typecheck}
{quality.commands.lint}
{quality.commands.build}
```

**D-step**: All checks must pass. Report the result as the same **readiness passport** table `/frame:ship` uses (Build / Types / Lint / Tests with coverage → one-line verdict), so the readiness format is identical across build → review → ship:
```
| Check | Result |
|-------|--------|
| Build | PASS   |
| Types | PASS   |
| Lint  | PASS   |
| Tests | PASS (N passed, X% cov) |
Verdict: build gates green
```

### Step 6.5: UI Verification (if UI tasks present)

**Detect UI tasks**: any task changed files with `.tsx`, `.vue`, `.css`, `component`, `page`, `layout`, `style`.

If UI tasks exist AND Playwright MCP is available:
1. Navigate to dev server URL
2. Take screenshot
3. Compare with spec from `docs/specs/{feature}/spec.md`
4. **PASS** → proceed to Step 7
5. **FAIL** → describe problem, fix, re-run quality gates, re-verify

If Playwright MCP is not available — skip and note: "UI not verified (no browser tool)."

### Step 7: Update STATE.md (COMPLETE)

```markdown
## Current Position
- Phase: BUILD
- Feature: {feature}
- Task: {completed}/{total}
- Status: COMPLETE
- Finished: {timestamp}
```

Next step: `/frame:review`

---

## Rules

- **Never skip D-steps** — every step is verified
- **Never write code without a test** — TDD is mandatory
- **Never commit without passing tests** — quality gate
- **Always add specific files** — never `git add -A`
- **Risk: high requires confirmation** — wait for user response
- **Never use type `any`** — use `unknown` + type guard
- **Never modify files outside the task scope** — stay within task boundaries
- **Auto-routing to worktrees** — build itself offers isolation when another feature is in flight (Step 0, Case C); the user never types `/frame:parallel start` by hand
- **Main is the base line** — the first/only feature builds in main; concurrent features get worktrees and merge back via `/frame:integrate`
- **Parallelism from plan, not flags** — plan.md `Parallel: yes/no` is the source of truth for waves within a feature
- **Max 5 subagents per wave** — concurrency cap
- **Shared tree by default** — file-disjoint wave tasks need no worktree; use `isolation: "worktree"` + `cherry-pick` only for the shared-file exception
- **Orchestrator owns commits, plan.md, STATE.md, checkpoints** — single-task subagents own none of these
- **Confirm high-risk once, up front** — never rely on a subagent to wait for the user
- **Review fixes → prefer `/frame:fix`** — build fix-mode is only for large/architectural changes

## Result

- Code implemented with TDD
- All tests passing
- All quality gates passed
- Git commits created
- `.planning/STATE.md` updated with COMPLETE status
