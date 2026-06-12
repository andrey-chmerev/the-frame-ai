---
description: "Build with inline QA team: run wave tasks with parallel security and perf review"
---
# /frame:wave-team -- Build with Inline QA Team

> Like `/frame:wave` but after each task a team of review agents checks the result and Orchestrator fixes issues before moving on.

**When to use**: quality matters more than speed. Each task is verified by Security, Performance, Tests, and Conventions agents before the next task starts.

## Instructions

### Step 0: Checkpoint + Update STATE.md

```bash
git tag "frame/checkpoint/wave-team-$(date +%Y%m%dT%H%M%S)" -m "Auto checkpoint before wave-team"
```

Update `.planning/STATE.md`:
```markdown
## Current Position
- Phase: BUILD (wave-team)
- Feature: {feature}
- Task: 0/{total}
- Status: IN_PROGRESS
- Started: {timestamp}
```

### Step 1: Find plan.md and read context

- `find docs/specs -name "plan.md" | head -5`
- Read plan.md, spec.md, MAP.md, memory/conventions.md, memory/anti-patterns.md

### Step 2: Determine waves (same as /frame:wave)

Group tasks into waves by dependencies:
- No dependencies → Wave 1
- Depends on Wave N → Wave N+1

Check file conflicts within each wave. If overlap → move to separate waves.

### Step 3: For each wave — run tasks in parallel

Tasks within a wave run in parallel (max 5). Each task follows this cycle:

#### 3.1: Launch Builder subagent

Launch via Agent tool with fresh 200K context. Subagent role: Builder (TDD: RED → GREEN → REFACTOR → commit).

Subagent prompt template:
```markdown
# Task: {task_name}

## Read before coding
- .planning/memory/anti-patterns.md
- .planning/memory/conventions.md
- .planning/memory/dependencies.md
- docs/specs/{feature}/spec.md

## Context
- Project: {project_name}
- MAP: .planning/MAP.md
- Task: {task_description}
- Files: {files}

## Role: Builder
1. Write TEST (RED) → verify fails
2. Write CODE (GREEN) → verify passes
3. Refactor if needed → verify passes
4. typecheck + lint
5. git commit: {type}({scope}): {description}
6. Mark task [DONE] in plan.md

## DO NOT
- Modify files outside task scope
- Skip tests
- Use `any` type
- Commit without passing quality gates
```

#### 3.2: Launch Review Team (after Builder commits)

Get the diff of the Builder's commit:
```bash
git diff HEAD~1..HEAD
```

Launch review agents **in parallel** via Agent tool. Which agents to launch:

| Agent | Always? | Trigger |
|-------|---------|---------|
| security | yes | — |
| performance-auditor | yes | — |
| tests-reviewer | yes | — |
| conventions-reviewer | yes | — |

Each agent receives:
- The git diff of the task
- Path to spec.md
- Path to .planning/memory/conventions.md

#### 3.3: Collect verdicts

Wait for all review agents. Each returns: `PASS`, `WARN`, or `FAIL` with findings.

#### 3.4: Orchestrator applies fixes

```
All PASS              → task done, next task
Any WARN, no FAIL     → Orchestrator fixes WARN issues, re-run only WARN agents
Any FAIL              → Orchestrator fixes FAIL + WARN issues, re-run FAIL agents
FAIL after 2 iterations → show user, ask how to proceed
```

**Orchestrator fixes directly** — does not re-launch Builder. Applies the specific fixes from agent reports, then commits:
```bash
git commit -m "fix({scope}): apply review team fixes"
```

#### 3.5: Mark task done

Update plan.md:
```markdown
### Task N: {name} [DONE]
```

Update STATE.md:
```markdown
- Task: {completed}/{total}
- Review: Security(PASS) Perf(PASS) Tests(PASS) Conventions(PASS)
```

### Step 4: Wave quality gate

After all tasks in a wave complete:
```bash
{quality.commands.typecheck}
{quality.commands.test}
{quality.commands.lint}
```

If FAIL → fix, re-run. Max 2 retries. If still failing → Wave Failure Strategy (same as /frame:wave).

### Step 5: Repeat for each wave

### Step 6: Final validation

```bash
{quality.commands.typecheck}
{quality.commands.test}
{quality.commands.lint}
{quality.commands.build}
```

Completeness check:
```bash
TOTAL=$(grep -c "^### Task" plan.md)
DONE=$(grep -c "\[DONE\]" plan.md)
[ "$TOTAL" != "$DONE" ] && echo "Unclosed: $((TOTAL-DONE)) of $TOTAL"
```

### Step 7: Update STATE.md

```markdown
## Current Position
- Phase: BUILD
- Feature: {feature}
- Task: {completed}/{total}
- Status: COMPLETE
```

## Rules

- **Review Team runs after every task** — not after the wave
- **Orchestrator fixes, not Builder** — no re-launch of Builder for review fixes
- **Max 2 fix iterations per task** — then escalate to user
- **Max 5 parallel Builder subagents** per wave
- **Wave quality gate** — tsc + vitest + eslint between waves
- **Never skip review agents** — all 4 always run

## Result

- Every task reviewed by Security, Performance, Tests, Conventions agents
- Issues fixed inline before next task starts
- Wave quality gates passed
- STATE.md updated
