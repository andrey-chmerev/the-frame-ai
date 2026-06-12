---
description: "Execute multiple tasks in parallel waves with dependency ordering"
---
# /frame:wave -- Parallel Task Execution

> Use for 4+ independent tasks (parallel subagents). For 1–3 tasks → `/frame:build`

Identifies dependencies, groups into waves, launches subagents in parallel.

**Role**: Orchestrator (not Builder). You coordinate and validate — subagents write the code.

## Instructions

### Step 0: Fail-fast validation + STATE.md (IN_PROGRESS)

**Before doing anything**, check:
- `.planning/MAP.md` exists — if missing, STOP: "Run /frame:init first — MAP.md not found."
- `plan.md` exists: `find docs/specs -name "plan.md" | head -1` — if missing, STOP: "No plan.md found. Run /frame:plan first."

Then immediately update `.planning/STATE.md`:
```markdown
## Current Position
- Phase: BUILD (wave)
- Feature: {feature from plan.md}
- Status: IN_PROGRESS
- Started: {timestamp}
```

**Orchestrator heartbeat rules:**
- After each wave completes: "Wave {N}/{total} done — {passed}/{total_tasks} tasks committed"
- Before launching a wave: "Launching Wave {N}: {task_names}"
- No more than 3 tool calls in a row without output

### Step 1: Find plan.md

- `find docs/specs -name "plan.md" | head -5`
- Read plan.md

### Step 2: Determine dependencies

For each task, determine:
- Which files it will change (Files: `path/to/file`)
- Which other tasks it depends on (Dependencies: Task N)
- Which wave it belongs to (auto-assigned by dependencies)

**Wave algorithm**: no dependencies → Wave 1; depends on Wave N → Wave N+1; depends on multiple waves → max(waves) + 1.

If plan.md already has `Wave:` fields — use them. Otherwise compute from dependencies.

### Step 3: Group into waves

```
Wave 1: Tasks with no dependencies (parallel)
Wave 2: Tasks that depend on Wave 1
Wave 3: Tasks that depend on Wave 2
...
```

### Step 4: Check file conflicts and Risk

**File Locking Strategy:**

1. Each subagent declares files in plan.md
2. Orchestrator checks for file overlaps between tasks in the same wave
3. If overlap exists — move tasks to separate waves or merge (sequential)
4. If no overlap — launch in parallel

```
Subagent 1: Files: [lib/api/client.ts, types/api.ts]
Subagent 2: Files: [components/chat/message.tsx]
-> No overlap -> parallel OK

Subagent 1: Files: [components/chat/message.tsx]
Subagent 2: Files: [components/chat/message.tsx]
-> Overlap -> same wave (sequential) WARNING
```

**Risk strategy for waves:**

Before launching a wave, check task Risk fields:

- If the wave contains a `Risk: high` task →
  create a git checkpoint before the wave:
  `git tag frame/pre-wave-{N}-{timestamp}`

- If the wave contains more than one `Risk: high` task →
  move them into a separate wave, do not run in parallel

### Step 5: Launch Wave N

Before launching, update STATE.md:
```markdown
- Phase: BUILD (wave)
- Status: IN_PROGRESS
- Wave: {N}/{total}
- Wave Status: Running (0/{count} subagents completed)
- Started: {timestamp}
```

For each task in the wave, launch a subagent via the Agent tool:
- Fresh context (200K)
- Self-contained prompt from `docs/specs/_template/subagent-prompt.md`
- Fill in all placeholders

**Maximum 5 subagents** per wave.

If a subagent produces no output for more than 2 minutes →
consider it hung, log in STATE.md: `Wave Status: AGENT_HUNG ({task_name})`

### Step 6: Wave Validation (D-step)

After all subagents in the wave complete:

```bash
{quality.commands.typecheck}
{quality.commands.test}
{quality.commands.lint}
git log --oneline -5
```

**Logic:**
- If **OK** -> proceed to next wave
- If **FAIL** -> Retry strategy (see below)
- **Max retries: 2** per wave

### Retry strategy

On FAIL of wave N:
1. Identify which tasks failed (via git log — no commit present)
2. Relaunch ONLY the failed subagents (not the entire wave)
3. Tasks with a `[DONE]` commit — do not touch

### Step 7: Repeat for each wave

Repeat Steps 5-6 for each wave until all waves are complete.

### Step 8: Final validation

```bash
{quality.commands.typecheck}
{quality.commands.test}
{quality.commands.lint}
{quality.commands.build}
git log --oneline -10
```

**UI Verification** (if any wave contained UI tasks — files with `.tsx`, `.vue`, `.css`, `component`, `page`, `layout`):

If Playwright MCP is available:
1. `browser_navigate: {dev server URL}`
2. `browser_screenshot`
3. Compare with spec — PASS → continue, FAIL → report to user with exact description, do NOT auto-fix

Check completeness:
```bash
TOTAL=$(grep -c "^### Task" plan.md)
DONE=$(grep -c "\[DONE\]" plan.md)

if [ "$TOTAL" != "$DONE" ]; then
  echo "⚠️ Unclosed tasks: $((TOTAL - DONE)) of $TOTAL"
  grep "^### Task" plan.md | grep -v "\[DONE\]"
fi
```

### Step 9: Update STATE.md and Memory

Update `.planning/STATE.md`:
```markdown
## Current Position
- Phase: BUILD
- Feature: {feature}
- Task: {completed}/{total}
- Status: Wave execution complete -- all {N} waves passed
```

**Memory Updates (if patterns found):**

Analyze git log of waves. If recurring solutions are visible → suggest adding to patterns.md:

"During the wave, the following patterns were used N times: {pattern}. Add to patterns.md? (y/n)"

## Wave Failure Strategy

If wave N failed after 2 retries:

```
1. git tag frame/wave-failure-{N}
2. Update STATE.md: Status: WAVE_FAILED, Wave: N
3. Show the user:
   ✅ What succeeded (committed waves 1..N-1)
   ❌ What did not complete (wave N and its dependents)
4. Do NOT auto-rollback previous waves
```

User decides: manual retry, fix and relaunch, or rollback via `/frame:rollback`.

## Task format in plan.md

```markdown
### Task 1: API Client
- Files: `lib/api/client.ts`
- Dependencies: NONE
- Wave: 1
- Risk: low

### Task 2: Types
- Files: `types/api.ts`
- Dependencies: NONE
- Wave: 1
- Risk: low

### Task 3: UI Components
- Files: `components/chat/message.tsx`
- Dependencies: Task 1 (API Client), Task 2 (Types)
- Wave: 2
- Risk: high

### Task 4: Tests for API
- Files: `lib/api/__tests__/client.test.ts`
- Dependencies: Task 1
- Wave: 2
- Risk: low

### Task 5: Tests for UI
- Files: `components/chat/__tests__/message.test.tsx`
- Dependencies: Task 3
- Wave: 3
- Risk: low
```

## Subagent Prompt Template

See `docs/specs/_template/subagent-prompt.md` for the full template with placeholders.

Brief version for quick use:

```markdown
# Task: {task_name}

## Memory (read before writing code)
- .planning/memory/anti-patterns.md — what to avoid
- .planning/memory/conventions.md — how to write code
- .planning/memory/dependencies.md — stack + Avoid list
- docs/specs/{FEATURE}/research.md → Memory Impact section

## Heartbeat rules
- After each D-step: "✓ Task {name}: {step} confirmed"
- Before a long command: "⏳ Running: {command}"
- No more than 3 tools in a row without output

## Context
- Project: {project_name}
- MAP: See .planning/MAP.md
- Spec: See docs/specs/{FEATURE}/spec.md
- Task: {task_description}

## Your Role: Builder
1. Write TEST first (RED)
2. Verify: `{quality.commands.test} {test_file}`
3. Write CODE (GREEN)
4. Verify: `{quality.commands.test} {test_file}`
5. Refactor if needed
6. Verify types: `{quality.commands.typecheck}`
7. Verify lint: `{quality.commands.lint}`
8. Git commit: `{type}({scope}): {description}`

## Key Files
- {file1} -- {purpose}
- {file2} -- {purpose}

## Patterns
- Follow project conventions from CLAUDE.md
- Errors: use project error reporting (no console.log for errors)
- Types: no `any` (use `unknown` + type guard)

## DO NOT
- Do not modify files outside {scope_dir}
- Do not skip tests
- Do not use `any` type
- Do not add dependencies without approval
- Do not commit without passing quality gates
```

## Rules

- **Maximum 5 subagents** per wave
- **File locking** -- check conflicts before launching a wave
- **Risk strategy** -- isolate high-risk tasks into a separate wave + git tag
- **STATE.md before launch** -- update IN_PROGRESS before each wave
- **Subagent heartbeat** -- >2 min without output = hung
- **Wave validation** -- D-step (tsc + vitest + eslint) between waves
- **Retry only failed** -- max 2 retries, only tasks without [DONE] commit
- **Wave Failure Strategy** -- git tag + STATE.md + report to user, do not auto-rollback
- **Completeness check** -- grep plan.md before final report
- **Fresh context** -- each subagent gets an isolated 200K context
- **Waves are sequential** -- waves do not run in parallel, only tasks within a wave do

## Algorithm (summary)

1. Read plan.md
2. Determine dependencies
3. Group into waves (independent batches)
4. Check file conflicts + Risk
5. Update STATE.md (IN_PROGRESS)
6. Launch subagents in parallel (max 5)
7. Wait for all subagents (heartbeat monitoring)
8. Run wave validation (tsc + vitest + eslint)
9. If OK -> next wave
10. If FAIL -> retry only failed tasks (max 2)
11. If FAIL after 2 retries -> Wave Failure Strategy
12. Repeat until all waves are complete
13. Final validation + completeness check
14. Update STATE.md + suggest Memory Updates

## Result

- Tasks executed in parallel
- Waves separated by dependencies
- High-risk tasks isolated + git checkpoint
- Quality gates passed between waves
- `.planning/STATE.md` updated
- Patterns suggested for memory
