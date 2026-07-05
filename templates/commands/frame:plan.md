---
description: "Decompose a feature into atomic tasks with wave grouping, traceability, and Parallel labels; or create a plan from audit findings"
argument-hint: "<feature description> | audit [all]"
allowed-tools: [Read, Write, Bash]
---
# /frame:plan -- Feature Planning

Takes research.md (Mode A) or an audit report (Mode B), validates it, reads memory, breaks into atomic tasks with complexity, risk, dependencies, Parallel labels, and requirement coverage.

### Routing

- `{feature}` — Mode A: plan a feature from research.md
- `audit` — Mode B: plan fixes from the latest AUDIT.md (Critical + High findings)
- `audit all` — Mode B: include Medium findings too

## Instructions

### Step 0: Checkpoint + STATE.md

```bash
git tag "frame/checkpoint/plan-{feature}-$(date +%Y%m%dT%H%M%S)" -m "Auto checkpoint before plan phase"
```
(Feature-scoped tag — avoids collisions when several features are planned across parallel worktrees.)

Update `.planning/STATE.md`:
```markdown
## Current Position
- Phase: PLAN
- Feature: {feature or "audit-{date}"}
- Status: IN_PROGRESS
```

---

## Mode A: Plan a feature

### Step A0: SIZE sanity check

Before decomposing, gauge the SIZE (same table as /frame:build Step 0.0: trivial / small / standard / large). If the work is clearly **trivial or small** (1–2 files, no new contract, obvious design), a full plan is overhead — tell the user:
> "This looks {trivial|small}. You can skip planning and run `/frame:build {feature}` directly (it implements inline). Plan anyway?"

Only proceed with full decomposition for **standard/large**, or if the user asks for a plan regardless.

### Step A1: Find and validate research.md

```bash
find docs/specs -name "research.md" | head -5
```

Read `docs/specs/{feature}/research.md`.

**Fail-fast — required sections**:
- `## Requirements` — must be numbered (R1, R2, ...)
- `## Architecture`
- `## API Design`
- `## Open Questions` — must be **empty or all answered** (answered = marked with "→ answered" or moved to Decision Log)

If `## Open Questions` has unanswered items → **STOP**:
> "research.md has open questions: {list}. Discuss them in chat and use /frame:research to record decisions, or answer them manually."

**New sections to read** (v2):
- `## Clarifications` — accepted assumptions
- `## Decision Log` — decisions made in chat
- `## Out of Scope` — exclusions
- `## Acceptance Criteria` — numbered AC1, AC2, ...

### Step A2: Read MAP.md and memory

| File | What to read | Why |
|------|-------------|-----|
| `.planning/MAP.md` | full | Project architecture and constraints |
| `.planning/memory/context.md` | full (first) | Current focus and blockers |
| `.planning/memory/learnings.md` `## Patterns > ### Core` | Core section only | Established patterns |
| `.planning/memory/conventions.md` | full | Code conventions |
| `.planning/memory/dependencies.md` | full + Avoid list | Don't propose rejected tools |
| research.md `## Memory Impact` | section | Researcher's decisions |

### Step A3: Decompose into atomic tasks

**Heartbeat**: after every 5 tasks report: "Decomposition: {N} tasks created, continuing..."

Each task must be **atomic**: Files Changed ≤ 3, Complexity ≤ medium.

If task too large (>3 files or Complexity: high) — split it.

**Risk definition**:

| Risk | Criteria |
|------|----------|
| `low` | 1–2 files, no cross-module dependencies |
| `medium` | 3–5 files or touches public APIs |
| `high` | 5+ files, touches core logic or routing |

**Estimate definition**:

| Estimate | Criteria |
|----------|----------|
| `30min` | Complexity: low, 1–2 files, no new abstractions |
| `1h` | Complexity: medium, 2–3 files, or new type/interface/schema |
| `2h` | Complexity: medium, 3 files, external integration or DB change |

If a task would need more than 2h — it is not atomic. Split it.

Each task gets:
- `Acceptance: AC2, AC5` — which ACs it covers
- `Findings: ` — empty for feature tasks (used in Mode B)

### Step A4: Define dependencies and check file conflicts

For each task: if B uses the result of A (file, type, function) → B depends on A.

Final check: no two tasks in the same wave modify the same file. On conflict → merge or separate waves.

### Step A5: Group into waves with Parallel labels

```
Wave 1: Tasks with no dependencies
Wave 2: Tasks depending on Wave 1
...
```

Rules:
- Max 5 tasks per wave
- No file conflicts within a wave
- Each wave gets an explicit `Parallel:` label

```markdown
### Wave 1: {name}
- Parallel: yes (3 independent tasks, no file conflicts)
```
or
```markdown
### Wave 1: {name}
- Parallel: no (sequential — Task 2 depends on Task 1 output)
```

### Step A6: Build Coverage table

For every R{n} and AC{n} from research.md, list which tasks cover it:

```markdown
## Coverage

| Requirement | Tasks |
|-------------|-------|
| R1 | Task 1, Task 3 |
| R2 | Task 2 |
| AC1 | Task 1 |
| AC3 | Task 4 |
```

**Any R{n} or AC{n} with no tasks = planning error → STOP and fix before writing plan.**

### Step A7: Devil's advocate for high-risk plans

If any task has `Risk: high` — run `devils-advocate` agent in **plan critic mode**:
- Input: the full plan draft
- Output: risks and suggestions for `## Plan Risks` section

Skip this step if no `Risk: high` tasks (saves tokens).

### Step A8: Create spec.md and plan.md

Create `docs/specs/{feature}/spec.md` (transform research.md into a concrete specification).

Create `docs/specs/{feature}/plan.md`:

```markdown
# Plan: {Feature}

## Overview
{Brief description}

## Coverage

| Requirement | Tasks |
|-------------|-------|
| R1 | Task 1 |
...

## Plan Risks
{From devils-advocate if any Risk: high tasks, otherwise "None"}

## Waves

### Wave 1: {name}
- Parallel: yes | no
- Tasks: Task 1, Task 2

### Wave 2: {name}
- Parallel: no
- Tasks: Task 3

## Tasks

### Task 1: {name}
- Files: `path/to/file.ts`
- Files Changed: 2
- Complexity: low
- Risk: low
- Estimate: 30min
- Wave: 1
- Acceptance: AC1, AC3
- Test: `path/to/file.test.ts`
- Dependencies: NONE
- Verification: `{quality.commands.test} path/to/file.test.ts`
- Status: [ ]

...

## Touched Files
<!-- aggregated union of all Files: fields — used by /frame:parallel start for cross-feature overlap checks -->
- `path/to/file.ts`
- `path/to/other.ts`

## Exit Criteria
- [ ] `{quality.commands.typecheck}` passes with 0 errors
- [ ] `{quality.commands.test}` — all tests pass
- [ ] All tasks marked [DONE] in plan.md
```

### Step A9: Update STATE.md + report

Update `.planning/STATE.md`:
```markdown
## Current Position
- Phase: PLAN
- Feature: {feature}
- Task: 0/{total}
- Status: COMPLETE — plan created, {total} tasks in {waves} waves
```

Show the user:
- Number of tasks and waves
- Tasks with Risk: high (if any)
- Coverage summary (all requirements covered)
- Next step: `/frame:build`

---

## Mode B: Plan from audit findings

Triggered by: `/frame:plan audit` or `/frame:plan audit all`

### Step B1: Find the audit report

```bash
ls -t .planning/reports/audit/*/AUDIT.md 2>/dev/null | head -1
```

If no report → STOP: "No audit report found. Run /frame:audit first."

### Step B2: Read findings

Read the AUDIT.md. Extract:
- `audit` mode (default): only CRITICAL and HIGH severity, `Verified: yes` findings
- `audit all` mode: also include MEDIUM findings

Skip research.md validation in this mode.

### Step B3: Group findings into tasks

- Findings in the same file/module → merge into one task (reference all finding IDs)
- Group: CRITICAL findings before HIGH (into earlier waves)
- Check file conflicts within each wave (same rule as Mode A)

Each task:
```markdown
### Task N: Fix {description}
- Files: `path/to/file.ts`
- Findings: SEC-1, LOGIC-3
- Risk: medium
- Wave: 1
- Dependencies: NONE
- Verification: {test command}
- Status: [ ]
```

### Step B4: Create plan.md

Feature name: `audit-{date}` (e.g., `audit-2026-06-12`).

Create `docs/specs/audit-{date}/spec.md` (list of findings as "requirements"):
- Each finding = one requirement with ID, severity, claim, file

Create `docs/specs/audit-{date}/plan.md` (same format as Mode A, no Coverage table — instead `## Findings Addressed`).

### Step B5: Update STATE.md + report

```markdown
## Current Position
- Phase: PLAN
- Feature: audit-{date}
- Status: COMPLETE — audit plan created, {N} findings in {waves} waves
```

Show: count of Critical/High addressed, skipped Medium (if any), next step: `/frame:build audit-{date}`

---

## Rules (all modes)

- **Fail-fast on research.md** — don't plan on incomplete data
- **Open Questions blocks planning** — must be empty before Mode A proceeds
- **Core patterns only** — don't trust experimental ones
- **Avoid list** — don't propose rejected tools
- **Atomic tasks** — Files Changed ≤ 3, Complexity ≤ medium
- **Parallel label on every wave** — build needs to know
- **Coverage on every requirement** — uncovered R/AC = planning error
- **Risk on every task** — Builder must see risks upfront
- **Test on every task** — every task is verified
- **No file conflicts** within one wave
- **Touched Files section always present** — /frame:parallel needs it for cross-feature overlap checks
- **Never edit code** — only create spec.md and plan.md

## Result

- `docs/specs/{feature}/spec.md` — specification
- `docs/specs/{feature}/plan.md` — plan with tasks, waves, Parallel labels, Coverage
- `.planning/STATE.md` updated
