# /frame:plan -- Feature Planning

Takes research.md, validates it, reads memory, breaks into atomic tasks with complexity, risk, dependencies and waves.

## Instructions

Plan the feature: **$ARGUMENTS**

### Step 0: Checkpoint

Create git tag before the phase:
```bash
git tag "frame/checkpoint/plan-$(date +%Y%m%dT%H%M%S)" -m "Auto checkpoint before plan phase"
```

Update `.planning/STATE.md` — phase started:
```markdown
- Phase: PLAN
- Feature: {feature}
- Status: IN_PROGRESS
```

### Step 1: Find and read research.md

```bash
find docs/specs -name "research.md" | head -5
```

Read `docs/specs/{feature}/research.md`.

### Step 1.1: Validate research.md (fail-fast)

Check for required sections:
- `## Requirements`
- `## Architecture`
- `## API Design`

**If any section is missing — STOP.** Do not begin decomposition. Report:

> "research.md is incomplete, missing: {sections}. Run /frame:research again or add sections manually."

### Step 1.2: Read Memory Impact from research.md

Find the **Memory Impact** section in research.md and extract:
- Which patterns will be affected/created
- Which dependencies will appear
- Which focus will shift
- Which conventions are affected

This is the Researcher's decision context — why this approach was chosen, which alternatives were rejected.

### Step 2: Read MAP.md

Read `.planning/MAP.md` to understand:
- Current project architecture
- File structure
- Key patterns and constraints

### Step 3: Read memory files

Read in the following order with restrictions:

| File | What to read | Why |
|------|-------------|-----|
| `.planning/memory/context.md` | Entire file (**first**) | Current focus and blockers |
| `.planning/memory/patterns.md` | **Core section only** | Established patterns (confidence: high or medium with 3+ confirmations) |
| `.planning/memory/conventions.md` | Entire file | Code conventions for tasks |
| `.planning/memory/dependencies.md` | Entire file + **Avoid list** | Don't propose rejected tools |

**Important**: Core patterns only — experimental ones (confidence: low/medium without confirmations) are not reliable enough for planning.

### Step 4: Decompose into atomic tasks

**Heartbeat**: after every 5 tasks report: "Decomposition: {N} tasks created, continuing..."

Break the specification into tasks. Each task must be **atomic**: Files Changed ≤ 3, Complexity ≤ medium.

If a task is too large (Files Changed > 3 or Complexity: high) — split it.

**Risk definition:**

| Risk | Criteria |
|------|----------|
| `low` | 1-2 files, no cross-module dependencies |
| `medium` | 3-5 files or touches public APIs |
| `high` | 5+ files, touches core logic or routing |

### Step 5: Define dependencies

For each task: if task B uses the result of task A (file, type, function) — B depends on A.

### Step 6: Group into waves

```
Wave 1: Tasks with no dependencies (parallel)
Wave 2: Tasks depending on Wave 1
Wave 3: Tasks depending on Wave 2
```

Rules:
- Maximum 5 tasks per wave
- Two tasks in the same wave cannot modify the same file
- Each task knows its wave

### Step 7: Check file conflicts

Final check: no two tasks in the same wave modify the same file. On conflict — merge tasks or move to different waves.

### Step 8: Create spec.md and plan.md

Create `docs/specs/{feature}/spec.md` (transform research.md into a concrete specification).

Create `docs/specs/{feature}/plan.md`:

```markdown
# Plan: {Feature}

## Overview
{Brief description of the plan}

## Waves

### Wave 1: {name}
Tasks with no dependencies (parallel):
- Task 1
- Task 2

### Wave 2: {name}
Tasks depending on Wave 1:
- Task 3

## Tasks

### Task 1: {name}
- Files: `path/to/file.ts`
- Files Changed: 2
- Complexity: low
- Risk: low
- Estimate: {time estimate, e.g. 30min / 1h / 2h}
- Wave: 1
- Test: `path/to/file.test.ts`
- Dependencies: NONE
- Verification: `{quality.commands.test} path/to/file.test.ts`
- Status: [ ]

### Task 2: {name}
- Files: `path/to/other.ts`, `path/to/another.ts`
- Files Changed: 2
- Complexity: medium
- Risk: medium
- Estimate: {time estimate, e.g. 30min / 1h / 2h}
- Wave: 2
- Test: `path/to/other.test.ts`
- Dependencies: Task 1
- Verification: `{quality.commands.test} path/to/other.test.ts`
- Status: [ ]

## Exit Criteria
- [ ] `{quality.commands.typecheck}` passes with 0 errors
- [ ] `{quality.commands.test}` — all tests pass
- [ ] All tasks marked [DONE] in plan.md
- [ ] STATE.md: Phase: BUILD, Status: complete
```

### Step 9: Update STATE.md

Update `.planning/STATE.md`:
```markdown
## Current Position
- Phase: PLAN
- Feature: {feature}
- Task: 0/{total}
- Status: COMPLETE — plan created, {total} tasks in {waves} waves
```

### Step 10: Report result

Show the user:
- Number of tasks and waves
- Tasks with Risk: high (if any)
- Next step: `/frame:build` (sequential) or `/frame:wave` (parallel)

## Rules

- **Fail-fast on research.md** — don't plan on incomplete data
- **Core patterns only** — don't trust experimental ones
- **Avoid list** — don't propose rejected tools
- **Atomic tasks** — Files Changed ≤ 3, Complexity ≤ medium
- **Risk on every task** — Builder must see risks upfront
- **Test on every task** — every task is verified
- **No file conflicts** within one wave
- **Never edit code** — only create spec.md and plan.md

## Result

- `docs/specs/{feature}/spec.md` — specification
- `docs/specs/{feature}/plan.md` — plan with tasks
- `.planning/STATE.md` updated
