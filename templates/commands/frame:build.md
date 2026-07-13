---
description: "Implement planned tasks using TDD — auto-routes to a worktree when another feature is already in flight, and auto-detects parallel waves from plan.md"
argument-hint: "[feature]"
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob, Task]
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

**Ground the call first — don't guess SIZE from the wording of the request.** A one-line ask can touch ten files. Before you name a SIZE, grep the symbol/module the task names to see how many files really move:
```bash
grep -rl "{symbol or module from the task}" src/ 2>/dev/null | head
```
The file count from this grep — not the phrasing — decides the SIZE.

| SIZE | Criteria | Route |
|------|----------|-------|
| **trivial** | 1 file, a few lines; no new dependency/contract; zero design ambiguity (typo, copy tweak, constant, obvious guard) | **Hand off to `/frame:fast`** — it has the side-quest STATE.md save/restore and BOARD overlap check this path needs. |
| **small** | 1–2 files; no new public API or dependency; design is obvious | **Light context (MAP.md + Anti-Patterns) → Implement (test if logic changed) → self-review → Commit.** No plan.md required. Steps below marked "(small)". |
| **standard** | 2–5 files; may add a type/contract; some design choices | **Full flow** — requires `plan.md` (run /frame:plan first). Steps 1–7 below. |
| **large** | 5+ files, touches core/routing, new dependency or external contract, or real design ambiguity | **Full pipeline with a plan gate** — `plan.md` mandatory; if any `Risk: high`, plan must have passed devil's-advocate. Steps 1–7 below. |

Routing rules:
- **trivial** — do NOT build here. Redirect: "SIZE: trivial → run `/frame:fast {task}` (it handles the side-quest bookkeeping this needs)." Stop. (If already mid-flow and the redirect is pure friction, you may inline it exactly as the **small** path below — but never leave STATE.md in a phase the caller didn't ask for.)
- **small** — no plan.md needed. Do a targeted context read (Step 3, light), implement with a test if logic changed, run a **self-review against a checklist** (the change is wired-in, no dead code, matches conventions, test covers the logic), then go to Step 6 (final gates) and Step 7. Skip Steps 1, 2, 4, 5 (wave machinery). Step 7 writes `Status: COMPLETE` with **no `{total}`** (there is no plan). Next step is **not** `/frame:review` (it needs a plan) — announce "done" or offer a light review. Announce: `SIZE: small → inline implement, no plan.`
- **standard / large** — plan.md is required. If it's missing, STOP: "SIZE: {standard|large} needs a plan. Run /frame:plan {feature} first." Then continue with Step 0 onward.
- **When unsure between two sizes, pick the larger** — under-ceremony on a real change is costlier than a little overhead.

Then continue to Step 0 (worktree routing) for every SIZE except trivial (redirected to /frame:fast).

### Step 0: Parallel routing — decide WHERE this build runs (do this first)

Before touching anything, figure out whether this build should happen here or in an isolated worktree. This is what lets you "just run build" without thinking about `/frame:parallel`.

```bash
git rev-parse --git-common-dir            # worktree detection
[ -f .planning/BOARD.md ] && grep "| active |" .planning/BOARD.md || echo "NO_BOARD"
git worktree list
```

**Read STATE.md once, now — and pin the build mode before any write.** Step 0.1 will overwrite `Status:` with `IN_PROGRESS`; if you read the mode *after* that, you can never see `REVIEW_FAILED` and fix-mode (Step 2) becomes unreachable. So capture it here:
- STATE.md `Status: REVIEW_FAILED` → **Mode: fix** (Step 2 fix-mode path).
- anything else → **Mode: normal**.

State it: `Mode: {normal|fix}` — Step 2 uses this pinned value, not a fresh read.

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

> **Contract — this tag is the review base.** `/frame:review` computes its diff scope from the latest `frame/checkpoint/build-{feature}-*` tag. Keep the prefix `frame/checkpoint/build-{feature}-` exactly: it is the one reliable base when building in main (where `merge-base HEAD main` would be HEAD → empty diff). Do not rename it.

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

Use the **Mode pinned in Step 0** (do not re-read STATE.md — Step 0.1 has since set `IN_PROGRESS`, which would mask the original `REVIEW_FAILED`):

- **Mode: fix** (`REVIEW_FAILED` seen in Step 0) → **prefer `/frame:fix`** for closing review findings — it groups findings by file and fixes them in parallel without the full plan/TDD ceremony. Suggest it: "Review failed with {N} findings. Run `/frame:fix` to close them in parallel." Only continue here in **build fix-mode** when the fixes are large/architectural (findings pile into the same shared files, or require re-planning): read `docs/specs/{feature}/review.md` → Action Items, then append fix tasks to `docs/specs/{feature}/plan.md` using the **same task template** as a normal task (`### Task N: Fix {desc}` with `Files:`, `Test:`, `Wave:`, `Action:`, `Done:`, `Verification:`, and a **`Findings:` field listing the REV-ids**), grouped into waves each carrying a `Parallel:` label (otherwise Step 4 can't parallelize them). Put them under a `## Fix Tasks (review {date})` heading, but the task blocks themselves must use `### Task N:` so Step 5's completeness grep sees them. Then execute using the algorithm below.
- **Mode: normal** → proceed with Step 3.

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

**Deviation protocol (applies to every task, inline or subagent).** When reality contradicts the plan — a caller the plan didn't account for, a missing file, a wrong assumption — do **not** silently work around it. Classify and act:

| Deviation | Action |
|-----------|--------|
| **Bug/gap found in passing** (unrelated to the task) | Fix only if trivial and in-scope; otherwise note it, keep going. Never expand the task. |
| **Small missing step** the plan omitted (e.g. an import wiring the change needs) | Do it as part of the task; log one line in plan.md `## Decision Log`. |
| **Architectural mismatch or contract change** (the plan's approach can't work, or a signature the plan didn't touch must change) | **STOP.** Surface it; the plan needs revision (`/frame:plan` re-plan-remainder). Do not improvise a redesign inside build. |

Every deviation of the middle/last kind gets a `## Decision Log` line in plan.md (`{date} — {what}/{why}`) so review and the human can see it.

**Pre-wave conflict check (deterministic — do this before spawning a `Parallel: yes` wave).** The planner guarantees `Files:` disjointness, but `Test:` is a separate field and hand-edits / fix-mode waves aren't planner-checked. Compute, per wave, the union `Files: ∪ Test:` for each task and intersect pairwise:
```
for each pair of tasks (A, B) in the wave:
    if (A.Files ∪ A.Test) ∩ (B.Files ∪ B.Test) ≠ ∅  → CONFLICT
```
On a conflict → either run the conflicting tasks **sequentially** (demote that pair to inline TDD) or spawn them with the worktree-isolation exception below. Only spawn as a shared-tree parallel wave once the wave is fully disjoint on `Files ∪ Test`.

**Heartbeat**: at each wave report `Wave {i}/{n}: {k} tasks, Parallel: {yes|no} — spawning...`.

For each wave defined in plan.md:

#### Wave has 1 task OR `Parallel: no`

Execute inline (sequential TDD cycle — see Step 4.1 below).

#### Wave has ≥2 tasks AND `Parallel: yes`

The planner already guarantees **no two tasks in a wave touch the same file** (frame:plan.md Step A4). So parallel builders can safely share the working tree — **no worktree isolation needed** in the normal case.

Launch one `builder` subagent per task, one message, max 5 concurrent. Pass each subagent **`Mode: single-task`**.

Each subagent receives a self-contained brief (it does NOT read memory/context itself):
- **Mode: single-task** — do only this task; don't scan plan.md, don't loop, don't checkpoint, don't edit plan.md/STATE.md, don't commit
- **The task body verbatim from plan.md** — `Action:` (what to do + pattern to follow), `Done:` (the observable finish line), `Context:` (spec/pitfall pointers), plus `Files` + `Test` + `Acceptance` + `Risk` (already confirmed if high). This body is what makes the brief self-contained — pass it as-is; if a task is missing `Action:`/`Done:` (older plan), fall back to its name + Files but note the plan predates body-carrying tasks.
- **The task's `Verification:` command verbatim** — this is the deterministic pass/fail check the plan carries for this task. Instruct the subagent it MUST run this exact command and report its result; "run the targeted test" is not a substitute for the command the plan specifies.
- Relevant conventions (extract the 3-5 applicable rules from conventions.md — don't make the agent read the file)
- Anti-patterns to avoid (the applicable ones from learnings.md)
- Instructions: implement + run the task's `Verification:` command; return final text with **changed files** (exact paths) + verification result (no commit hash — orchestrator commits)

**Isolation exception**: only if a wave's tasks *could* still touch a shared file (e.g. a barrel/index, a config, a lock file the planner couldn't fully separate) — spawn those with `isolation: "worktree"` and, after each returns, bring its work into the current branch with `git cherry-pick {hash}` before running wave gates. After each cherry-pick, verify it landed completely: compare `git show --stat HEAD` against the subagent's reported changed files (a conflict-resolved cherry-pick can silently drop part of the change), and run that task's targeted test before moving on. Default path (file-disjoint tasks) needs none of this.

After all subagents complete → **triage → gates → commit → mark done** (orchestrator, in the shared tree). Order matters: **never commit before gates pass** (build's own rule).

**1. Triage reports.** For each subagent report:
- `Status: FAILED | BLOCKED` → this task's work does **not** get committed. Revert its files to the wave's starting state (the checkpoint exists): `git checkout -- {that task's Files ∪ Test}`. Mark the task `[BLOCKED]` in plan.md. **Any wave that depends on a blocked task does not start** — stop the dependency chain and report which downstream tasks are held.
- `Status: DONE` → continue to scope check.

**2. Scope check (F7).** Diff each `DONE` report's **changed files** against that task's `Files: ∪ Test:`. Files outside that set → **do not blind-add them**; warn: "Task {N} touched {file} outside its declared scope." Add only the declared files to that task's commit; surface the stray file to the user.

**3. Wave quality gates** (only over the tasks that passed triage):
```bash
# per-task deterministic checks first (the command the plan specified)
{each DONE task's Verification: command}
# then the shared full gates
{quality.commands.typecheck}
{quality.commands.test}
{quality.commands.lint}
```

**4. On green — commit per task, then mark done** (`one task = one commit` — preserves traceability for review/bisect/cherry-pick):
```bash
# for each DONE task, in wave order:
git add {that task's declared changed files}
git commit -m "{type}({scope}): {task description}"
```
Then mark each committed task `[DONE]` in plan.md and bump STATE.md `Task: {done}/{total}` (orchestrator owns plan.md/STATE.md — subagents never touch them). The green gate run also refreshes the quality-gate status file, so `git-safety` lets these commits through.

**Heartbeat**: `Wave {i}: gates green, {done}/{total} tasks committed.`

**On gate FAIL → retry with the error, in a clean tree.** Identify which task's change caused the failure (from the error location). Revert that task's files to the wave start (`git checkout -- {files}`), then re-spawn it single-task **with the failing gate/test output pasted into the brief** (so the retry is informed, not blind). Max 2 retries. If still failing:
```bash
git tag "frame/wave-failure-$(date +%Y%m%dT%H%M%S)"
```
Update STATE.md: `Status: WAVE_FAILED`. Report to user. Do NOT auto-rollback previously committed waves.

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

**After each task** — fast (run the task's own deterministic check, not just any test):
```bash
{task's Verification: command}   # falls back to {quality.commands.test} {test_file} if the task has none
```

**Every 3 tasks or after a logical wave** — full:
```bash
{quality.commands.typecheck}
{quality.commands.test}
{quality.commands.lint}
```

##### Git Commit (only after the gate above is green)

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
grep "^### Task" docs/specs/{feature}/plan.md | grep -vE "\[(DONE|BLOCKED)\]"
# Must return empty
```

If unclosed tasks exist — return and complete them or report to user. `[BLOCKED]` tasks are not "done": if any remain, STATE.md ends `Status: WAVE_FAILED` (not COMPLETE) and the report lists them for the user.

### Step 6: Final quality gates → readiness passport

```bash
{quality.commands.test}
{quality.commands.typecheck}
{quality.commands.lint}
{quality.commands.build}
```

**D-step**: All checks must pass. Report the result as the same **readiness passport** table `/frame:ship` uses (Build / Types / Lint / Tests with coverage → one-line verdict), so the readiness format is identical across build → review → ship. Add a **Coverage** row: fold the `Acceptance met:` ids from the subagent reports against the plan's `## Coverage` table — an early signal, before review, that every R/AC has landed:
```
| Check | Result |
|-------|--------|
| Build | PASS   |
| Types | PASS   |
| Lint  | PASS   |
| Tests | PASS (N passed, X% cov) |
| Coverage | AC 7/7, R 4/4 (from task reports) |
Verdict: build gates green
```
If any R/AC from the plan's Coverage table has no task reporting it met → flag it here (`Coverage: AC 6/7 — AC4 unaccounted`) so review isn't the first place it surfaces.

### Step 6.5: UI Verification (if UI tasks present)

**Detect UI tasks** from the diff (`git diff {checkpoint}..HEAD --name-only`), not from task titles: any changed file matching `.tsx`, `.vue`, `.css`, `component`, `page`, `layout`, `style`.

If UI files changed AND a browser MCP is available (Playwright, Chrome DevTools MCP, or equivalent) → **run the `/frame:verify-ui` procedure** for the affected pages (don't duplicate its steps here): it screenshots the dev-server URL, compares against `docs/specs/{feature}/spec.md`, and reports PASS/FAIL. On FAIL → fix, re-run quality gates (Step 6), re-verify.

If no browser MCP is available — skip and note: "UI not verified (no browser tool)."

### Step 7: Update STATE.md (COMPLETE)

**standard / large** (a plan exists):
```markdown
## Current Position
- Phase: BUILD
- Feature: {feature}
- Task: {completed}/{total}
- Status: COMPLETE
- Finished: {timestamp}
```
Next step: `/frame:review`

**small** (no plan — there is no `{total}`):
```markdown
## Current Position
- Phase: BUILD
- Feature: {feature}
- Status: COMPLETE (small — no plan)
- Finished: {timestamp}
```
Next step is **not** `/frame:review` (it requires a plan and will STOP at its completion check). Announce done, and offer a light review only if the change warrants it: "small change committed — run `/frame:review` only if you want the full panel (needs a plan), otherwise you're done."

---

## AUTO mode (driven by /frame:auto)

Applies **only** when the autopilot marker exists **and belongs to this session**: `M="$(git rev-parse --git-dir)/frame-autopilot"; [ -f "$M" ] && [ "$(grep -s '^session=' "$M" | cut -d= -f2-)" = "${CLAUDE_CODE_SESSION_ID:-}" ]`. Standalone runs — and other sessions sharing this tree with someone else's flight — ignore this section.

- **High-risk tasks are pre-confirmed** — the `/frame:auto` briefing gate (its Step 2) already listed every `Risk: high` task and got one "go". Skip the Step 4 up-front ask **and** the Risk-Strategy per-task "wait for user confirmation"; still create the checkpoints. Tasks the user answered `hold` for are excluded — leave them un-built and unmarked.
- **Step 0 Case C (another feature in flight)** → do **not** ask and do **not** build in main. Take the manual "Y" path unattended: run the `/frame:parallel start {feature}` procedure (file-overlap check against active features → worktree + `feature/{feature}` branch → context copy → board row), **then halt the flight** with the hand-off — autopilot cannot follow the work into another terminal, but it leaves the next flight one command away:
  > ⛔ AUTOPILOT HALT: {other} is mid-flight in this tree. Worktree for {feature} is ready at `../{project}-{feature}`.
  > → `cd ../{project}-{feature} && claude` → `/frame:auto {feature}` (plan.md is done — it goes straight to the briefing gate).

  If the overlap check finds a file conflict with an active feature, halt without creating the worktree and report the conflict instead.
- **`WAVE_FAILED` / remaining `[BLOCKED]` tasks / architectural deviation (deviation protocol STOP)** → these stop as usual, and the stop halts the flight — autopilot never improvises past them.

## Rules

- **Never skip D-steps** — every step is verified
- **Never write code without a test** — TDD is mandatory
- **Gates before commit — always** — wave/task quality gates run and pass *before* any `git commit`; committing red is forbidden (and git-safety blocks it)
- **One task = one commit** — commit each task's declared files separately after gates pass; never one lump commit per wave
- **Run the task's `Verification:` command** — the plan carries a deterministic pass/fail check per task; run that exact command, don't substitute a generic test
- **Always add specific files** — never `git add -A`; add only a task's declared `Files ∪ Test`, and warn on out-of-scope changes rather than committing them blindly
- **FAILED/BLOCKED tasks don't commit** — revert their files to the wave start, mark `[BLOCKED]`, and hold any wave that depends on them
- **Retry informed, not blind** — a re-spawned failing task gets the gate/test error in its brief and a clean tree to start from
- **Deviation protocol** — bug-in-passing: note it; small missing step: do it + Decision Log; architectural/contract mismatch: STOP and re-plan
- **Risk: high requires confirmation** — wait for user response
- **Never use type `any`** — use `unknown` + type guard
- **Never modify files outside the task scope** — stay within task boundaries
- **trivial → `/frame:fast`** — build redirects one-file/one-liner work to fast (it has the side-quest bookkeeping); build handles small and up
- **Auto-routing to worktrees** — build itself offers isolation when another feature is in flight (Step 0, Case C); the user never types `/frame:parallel start` by hand
- **Main is the base line** — the first/only feature builds in main; concurrent features get worktrees and merge back via `/frame:integrate`
- **Parallelism from plan, not flags** — plan.md `Parallel: yes/no` is the source of truth for waves within a feature; build still re-checks `Files ∪ Test` disjointness before spawning
- **Max 5 subagents per wave** — concurrency cap
- **Shared tree by default** — file-disjoint wave tasks need no worktree; use `isolation: "worktree"` + `cherry-pick` only for the shared-file exception
- **Orchestrator owns commits, plan.md, STATE.md, checkpoints** — single-task subagents own none of these
- **Checkpoint tag is the review base** — `frame/checkpoint/build-{feature}-*` is the contract `/frame:review` reads; don't rename it
- **Confirm high-risk once, up front** — never rely on a subagent to wait for the user
- **Review fixes → prefer `/frame:fix`** — build fix-mode is only for large/architectural changes

## Result

- Code implemented with TDD
- All tests passing
- All quality gates passed
- Git commits created
- `.planning/STATE.md` updated with COMPLETE status
