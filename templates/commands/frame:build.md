---
description: "Implement planned tasks using TDD — auto-detects sequential or parallel execution from plan.md"
argument-hint: "[feature]"
allowed-tools: [Read, Write, Edit, Bash]
---
# /frame:build -- Implementation per plan.md

Reads plan.md, executes tasks with TDD and quality gates. Parallelism is determined by plan.md `Parallel:` labels — no flags needed.

### Routing

- (no args) — feature from `.planning/STATE.md`; if empty, find last plan.md with unclosed tasks; if multiple candidates, show list and ask
- `{feature}` — build a specific feature by name

## Instructions

### Step 0: Checkpoint + Update STATE.md (IN_PROGRESS)

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

**Isolation exception**: only if a wave's tasks *could* still touch a shared file (e.g. a barrel/index, a config, a lock file the planner couldn't fully separate) — spawn those with `isolation: "worktree"` and, after each returns, bring its work into the current branch with `git cherry-pick {hash}` before running wave gates. Default path (file-disjoint tasks) needs none of this.

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

### Step 6: Final quality gates

```bash
{quality.commands.test}
{quality.commands.typecheck}
{quality.commands.lint}
{quality.commands.build}
```

**D-step**: All checks must pass.

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
- **Parallelism from plan, not flags** — plan.md `Parallel: yes/no` is the source of truth
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
