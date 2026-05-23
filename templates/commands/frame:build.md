# /frame:build -- Implementation per plan.md

> Use for 1–3 tasks (sequential TDD). For 4+ independent tasks → `/frame:wave`

Reads plan.md, executes TDD cycle for each task, runs quality gates.

## Instructions

### Step 0: Checkpoint + Update STATE.md (IN_PROGRESS)

Create checkpoint before starting:
```bash
git tag "frame/checkpoint/build-$(date +%s)" -m "Auto checkpoint before build phase"
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

- `find docs/specs -name "plan.md" | head -5`
- Read plan.md and identify all tasks

### Step 2: Read Context

Read before implementing:
- `docs/specs/{feature}/research.md` — **Memory Impact** section (why this approach was chosen)
- `docs/specs/{feature}/spec.md` — feature specification
- `.planning/MAP.md` — project architecture
- `.planning/memory/patterns.md` — Core + Active patterns
- `.planning/memory/conventions.md` — code conventions
- `.planning/memory/anti-patterns.md` — what to avoid
- `.planning/memory/dependencies.md` — stack + Avoid list

### Step 3: For EACH task in plan.md

#### 3.0: Risk Strategy

Check the task's `Risk` field:
- `Risk: low` → standard TDD cycle
- `Risk: medium` → create checkpoint: `git tag frame/checkpoint/task-{N}`
- `Risk: high` → checkpoint + show user warning, **wait for confirmation** before proceeding

#### 3.1: TDD Cycle -- RED

Write the TEST:
- Create test file in `__tests__/`
- Write a failing test
- Run: `{quality.commands.test} {test_file}`
- **D-step**: Test must FAIL (RED verified)

#### 3.2: TDD Cycle -- GREEN

Write the CODE:
- Implement the feature (minimal to pass the test)
- Run: `{quality.commands.test} {test_file}`
- **D-step**: Test must PASS (GREEN verified)

#### 3.3: TDD Cycle -- REFACTOR

Refactor (if needed):
- Improve code structure
- Run: `{quality.commands.test} {test_file}`
- **D-step**: Test must PASS

#### Stuck Detection

If after **3 attempts** the test does not reach GREEN:
1. Stop
2. Update STATE.md: `Status: STUCK, Task: {N}`
3. Report to user: what was tried, where stuck, suggest:
   - Simplify the task
   - Rewrite the test
   - Skip with `[BLOCKED]` flag

#### 3.4: Quality Gates (tiered)

**After each task** — fast check:
- `{quality.commands.test} {test_file}` — only this task's test

**Every 3 tasks or after a logical wave** — full gates:
- `{quality.commands.typecheck}`
- `{quality.commands.test}` (all tests)
- `{quality.commands.lint}`
- **D-step**: All checks must pass

#### 3.5: Git Commit

- `git add {specific_files}`
- `git commit -m "{type}({scope}): {description}"`
- **D-step**: Commit succeeds

#### 3.6: Auto-checkpoint (if enabled)

If `workflow.autoCheckpoint === true` in `.frame/config.json`:
```bash
git tag "frame/checkpoint/task-{N}-$(date +%s)" -m "Auto checkpoint after task {N}"
```

#### 3.6: Update Status

Mark task in plan.md:
```markdown
### Task N: {name} [DONE]
```

Update progress in STATE.md:
```markdown
- Task: {completed}/{total}
```

### Step 4: Next task?

- More tasks remain → return to Step 3
- All tasks done → proceed to Step 5

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
```

**D-step**: All checks must pass.

### Step 6.5: UI Verification (if UI tasks present)

**Detect UI tasks**: any task changed files with `.tsx`, `.vue`, `.css`, `component`, `page`, `layout`, `style`.

If UI tasks exist AND Playwright MCP is available:
1. `browser_navigate: {dev server URL}`
2. `browser_screenshot`
3. Compare with spec from `docs/specs/{feature}/spec.md`
4. **PASS** → proceed to Step 7
5. **FAIL** → describe problem, fix, re-run quality gates, re-verify

If Playwright MCP is not available — skip and note: "UI not verified (no browser tool)".

### Step 7: Update STATE.md (COMPLETE)

```markdown
## Current Position
- Phase: BUILD
- Feature: {feature}
- Task: {completed}/{total}
- Status: COMPLETE
- Finished: {timestamp}
```

## Rules

- **Never skip D-steps** — every step is verified
- **Never write code without a test** — TDD is mandatory
- **Never commit without passing tests** — quality gate
- **Always add specific files** — never `git add -A`
- **Risk: high requires confirmation** — wait for user response
- **Never use type `any`** — use `unknown` + type guard
- **Never modify files outside the task scope** — stay within task boundaries

## Result

- Code implemented with TDD
- All tests passing
- All quality gates passed
- Git commits created
- `.planning/STATE.md` updated with COMPLETE status
