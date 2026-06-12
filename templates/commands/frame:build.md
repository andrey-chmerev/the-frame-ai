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

Create checkpoint before starting:
```bash
git tag "frame/checkpoint/build-$(date +%Y%m%dT%H%M%S)" -m "Auto checkpoint before build phase"
```

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
- `Status: REVIEW_FAILED` → **Fix mode**: read `docs/specs/{feature}/review.md` → Action Items, create fix tasks in plan.md under `## Fix Tasks (review {date})`, then execute using the same algorithm below. Each fix task references its review finding ID.
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

For each wave defined in plan.md:

#### Wave has 1 task OR `Parallel: no`

Execute inline (sequential TDD cycle — see Step 4.1 below).

#### Wave has ≥2 tasks AND `Parallel: yes`

Launch one `builder` subagent per task, one message, `isolation: "worktree"`, max 5 concurrent.

Each subagent receives:
- Task description + Files + Acceptance criteria
- Relevant conventions (from conventions.md)
- Anti-patterns to avoid
- Instructions: return final text with list of changed files + test status + commit hash

After all subagents complete → **wave quality gates**:
```bash
{quality.commands.typecheck}
{quality.commands.test}
{quality.commands.lint}
```

If wave gates FAIL → retry only the failed tasks (max 2 retries). If still failing:
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

## Result

- Code implemented with TDD
- All tests passing
- All quality gates passed
- Git commits created
- `.planning/STATE.md` updated with COMPLETE status
