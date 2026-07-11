---
description: "Decompose a feature into atomic, code-grounded tasks with embedded bodies (Action/Done/Context), wave grouping, traceability, and Parallel labels; or create a plan from audit findings"
argument-hint: "<feature description> | audit [all]"
allowed-tools: [Read, Write, Bash, Grep, Glob]
---
# /frame:plan -- Feature Planning

Takes research.md (Mode A) or an audit report (Mode B), validates it, reads memory, reads the real target code, and breaks the work into atomic tasks that carry their own body (Action/Done/Context) — so `/frame:build` can hand a task to a subagent without re-deriving anything. Adds risk, dependencies, Parallel labels, requirement coverage, and a blocker/advisory plan critique.

### Routing

- `{feature}` — Mode A: plan a feature from research.md
- `audit` — Mode B: plan fixes from the latest AUDIT.md (Critical + High findings)
- `audit all` — Mode B: include Medium findings too

## Instructions

### Step 0: SIZE sanity check (before touching STATE.md)

Gauge the SIZE first — before writing anything — so a "skip planning" answer never leaves STATE.md lying in `IN_PROGRESS`. Same table as /frame:build Step 0.0: trivial / small / standard / large.

If the work is clearly **trivial or small** (1–2 files, no new contract, obvious design), a full plan is overhead — tell the user and **do not write STATE.md**:
> "This looks {trivial|small}. You can skip planning and run `/frame:build {feature}` directly (it implements inline). Plan anyway?"

Only proceed for **standard/large**, or if the user asks for a plan regardless. State the SIZE in one line: "SIZE: {standard|large} → full plan."

Once you've decided to proceed, update `.planning/STATE.md`:
```markdown
## Current Position
- Phase: PLAN
- Feature: {feature or "audit-{date}"}
- Status: IN_PROGRESS
```

> No git checkpoint here — the plan phase never edits code (and `docs/` is gitignored), so a tag would freeze state the command doesn't change. `/frame:build` keeps its own checkpoint.

---

## Mode A: Plan a feature

### Step A1: Resolve the feature and find research.md

```bash
find docs/specs -name "research.md"
```

Resolve `{feature}` to a spec directory:
- Exact match `docs/specs/{feature}/research.md` → use it.
- No exact match → fuzzy-match `{feature}` against the directory names from the `find` output. One clear candidate → use it and announce ("Planning `docs/specs/jwt-auth/` — closest match to '{feature}'."). Several candidates → list them and ask which one. None → STOP: "No research.md found for '{feature}'. Run /frame:research {feature} first."

Read `docs/specs/{feature}/research.md`.

**Fail-fast — required sections**:
- `## Requirements` — must be numbered (R1, R2, ...)
- `## Architecture`
- `## API Design`
- `## Open Questions` — must be **empty or all answered** (answered = marked with "→ answered" or moved to Decision Log)

If `## Open Questions` has unanswered items → **STOP**:
> "research.md has open questions: {list}. Discuss them in chat and use /frame:research to record decisions, or answer them manually."

**Other sections to read** (v2):
- `## Clarifications` — accepted assumptions
- `## Decision Log` — decisions made in chat
- `## Out of Scope` — exclusions
- `## Acceptance Criteria` — numbered AC1, AC2, ...
- `## Edge Cases` — boundary/error/concurrency conditions → each must land in a task's `Done:` and its test
- `## Pitfalls` — known gotchas → raise Risk on affected tasks, add error-handling tasks, cite in `Context:`
- `## Research Flags` — non-blocking gaps → each becomes/joins a task for its tagged phase (don't drop them)
- `## Dependency Passport` — honor `avoid` / `adopt-with-caution` verdicts

### Step A1.5: Overwrite guard

If `docs/specs/{feature}/plan.md` already exists, count completed tasks:
```bash
grep -c "^### Task" docs/specs/{feature}/plan.md 2>/dev/null
grep -c "\[DONE\]" docs/specs/{feature}/plan.md 2>/dev/null
```

- **No plan.md, or plan with zero `[DONE]`** → proceed normally (safe to (re)generate).
- **Plan with ≥1 `[DONE]` task** → do **not** silently overwrite. STOP and offer:
  > "plan.md already has {n} completed task(s). Choose: **(a) re-plan the remainder** — keep [DONE] tasks, regenerate only the open ones; **(b) full re-plan** — discard everything and start over (confirms loss of {n} done tasks); **(c) cancel**."
  Honor the choice. For (a), preserve the `[DONE]` task blocks verbatim and only renumber/replace the open tail.

### Step A2: Read MAP.md, memory, and the real target code

| Source | What to read | Why |
|--------|-------------|-----|
| `.planning/MAP.md` | full | Project architecture and constraints |
| `.planning/memory/context.md` | full (first) | Current focus and blockers |
| `.planning/memory/learnings.md` `## Patterns > ### Core` | Core section only | Established patterns (confidence high/medium; treat low as experimental) |
| `.planning/memory/learnings.md` `## Anti-Patterns` | full | Don't bake in known mistakes |
| `.planning/memory/conventions.md` | full | Code conventions |
| `.planning/memory/dependencies.md` | full + Avoid list | Don't propose rejected tools |
| research.md `## Memory Impact` | section | Researcher's decisions |
| research.md `## Pitfalls` | section | Known gotchas → per-task Risk + `Context:` + error-handling tasks |
| research.md `## Research Flags` | section | Non-blocking gaps → fold each into the task for its tagged phase |
| research.md `## Dependency Passport` | section | Respect `avoid`/`adopt-with-caution` verdicts |

**Then ground the plan in real code.** Before decomposing, read (or grep) the modules the feature will actually touch — the files named in research.md `## Architecture`/`## API Design`, plus their neighbours. A plan written only from MAP.md invents file paths and misses existing structure. You need to know: which files exist, their real exports/signatures, where the new code plugs in.

```bash
# example — adapt to the feature
grep -rl "{relevant symbol or route}" src/ 2>/dev/null | head
```

### Step A3: Decompose into atomic tasks

**Heartbeat**: after every 5 tasks report: "Decomposition: {N} tasks created, continuing..."

A task is **atomic** when all three hold:
1. **Files Changed ≤ 3** and Complexity ≤ medium.
2. **Independently verifiable** — there is one pass/fail command that proves it's done.
3. **Ends wired-in** — it leaves no hanging or orphaned code; the change is integrated, not a dangling stub.

If any fails — split the task.

**Risk definition**:

| Risk | Criteria |
|------|----------|
| `low` | 1–2 files, no cross-module dependencies |
| `medium` | 3–5 files or touches public APIs |
| `high` | 5+ files, touches core logic or routing |

`Estimate` is an optional coarse complexity label for the human (30min / 1h / 2h) — **not** an atomicity criterion. Atomicity is decided by the three rules above, never by the clock.

**Each task carries its own body** so `/frame:build` can hand it to a subagent verbatim, with no re-derivation:

- `Action:` — 1–3 imperative lines: what to create/modify and which existing pattern to follow (`follow: src/x.ts`). Directives, **not** code blocks.
- `Done:` — the observable result that means the task is finished ("`parseToken()` returns the decoded payload; rejects an expired token with `TokenExpiredError`; test green"). Fold in any Edge Case / Pitfall that applies to this task.
- `Context:` — pointers (not prose) to the spec/research sections and Pitfalls the builder must respect: `spec.md ## Interfaces`, `research.md ## Pitfalls: clock-skew`.
- `Acceptance:` — which R{n}/AC{n} this task covers.
- `Findings:` — empty for feature tasks (used in Mode B).

### Step A4: Define dependencies and check file conflicts

For each task: if B uses the result of A (file, type, function) → B depends on A.

Then run the **deterministic structural checks** (pure mechanics — no agent needed):
1. **Path grounding** — every path in a `Files:` field either exists on disk (`test -f`) or is explicitly marked `(new)`. An unmarked, non-existent path is a planning error → fix before continuing.
2. **No same-wave file conflict** — no two tasks in the same wave share any path across `Files: ∪ Test:` (a shared test file races just as a shared source file does under a parallel wave). On conflict → merge the tasks or push one to a later wave.
3. **Dependency sanity** — no cyclic dependencies; every `Dependencies:` entry names a real task.

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

`Parallel: yes` requires **both**:
- **file-disjoint** — no two tasks in the wave share any path across `Files: ∪ Test:` (source *and* test files), **and**
- **context-independent** — the tasks don't trade intermediate decisions with each other (separate components with clean interfaces, not sequential phases of one feature). Parallelism is context-centric, not just file-centric: two tasks can be file-disjoint yet still be tightly coupled — when in doubt, `Parallel: no`.

```markdown
### Wave 1: {name}
- Parallel: yes (3 independent tasks, file-disjoint and context-independent)
```
or
```markdown
### Wave 1: {name}
- Parallel: no (sequential — Task 2 consumes Task 1's output)
```

### Step A6: Build Coverage table (both directions)

**Forward** — for every R{n} and AC{n} from research.md, list which tasks cover it:

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

**Reverse** — every task's `Acceptance:` names at least one R/AC. A task covering nothing is either:
- justified in one line as infrastructure/refactor *for this feature* (note it), or
- gold-plating → remove it.

Never narrow a requirement's scope relative to research.md when writing the task ("just v1 for now" is not allowed — it's a silent scope cut).

### Step A7: Critique the plan (blocker / advisory)

Split the critique into deterministic checks (already run in Step A4/A6) and a judgment pass.

If any task has `Risk: high`, run the `devils-advocate` agent in **plan critic mode**. Scope its brief tightly to avoid manufactured findings:
> "Critique this plan. Flag **only** gaps that affect correctness or the stated requirements: missed dependencies, hidden same-wave file conflicts, tasks that assume something an earlier task doesn't produce, missing error-handling/rollback tasks, or an estimate wildly off the file count. No style, no over-engineering, no 'nice to have'. Return blockers and advisories separately."

Classify every finding (from the deterministic checks **and** the agent):
- **Blocker** — same-wave file conflict, cyclic/invalid dependency, uncovered requirement, task with no `Verification`, or a dependency assumption that doesn't hold. You **must** fix these in the plan and re-run the checks. Loop at most **2 times**; if blockers remain, STOP and surface them to the user.
- **Advisory** — risks, assumptions, suggestions. Record under `## Plan Risks`, do not block.

Skip the agent (not the deterministic checks) if no `Risk: high` tasks — saves tokens.

### Step A8: Create spec.md and plan.md

Create `docs/specs/{feature}/spec.md` — a concrete specification derived from research.md, with a **fixed shape** (three commands read this file — `/frame:build`, `/frame:test-plan`, and `/frame:review` traces R/AC against it, so the numbering must not drift):

```markdown
# Spec: {Feature}

## Requirements
<!-- copied VERBATIM from research.md with the SAME R-numbers, plus any Decision Log refinements -->
R1. ...

## Acceptance Criteria
<!-- copied VERBATIM from research.md with the SAME AC-numbers -->
AC1. Given ..., when ..., then ...

## Behavior
{What the user observes — the feature described as user-facing behavior}

## Interfaces
{Key interfaces/endpoints/data structures — from research.md ## API Design}

## Out of Scope
{Copied from research.md — always present}
```

> **Rule**: R/AC IDs in spec.md must match research.md exactly. Renumbering or rephrasing breaks `/frame:review` traceability.

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
{Advisory findings from devils-advocate / structural checks, otherwise "None"}

## Waves

### Wave 1: {name}
- Parallel: yes | no
- Tasks: Task 1, Task 2

### Wave 2: {name}
- Parallel: no
- Tasks: Task 3

## Tasks

### Task 1: {name}
- Files: `path/to/file.ts`, `path/to/new.ts` (new)
- Files Changed: 2
- Complexity: low
- Risk: low
- Estimate: 30min
- Wave: 1
- Acceptance: AC1, AC3
- Action: Add `parseToken()` to auth util; follow the guard pattern in `src/auth/verify.ts`.
- Done: `parseToken()` returns the decoded payload; rejects an expired token with `TokenExpiredError`; targeted test green.
- Context: spec.md ## Interfaces; research.md ## Pitfalls: clock-skew
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

## Decision Log
<!-- plan-phase decisions from the review loop (Step A9.5); append-only -->
```

### Step A9: Report + plan review loop

Show the user:
- Number of tasks and waves
- Tasks with Risk: high (if any)
- Coverage summary (all requirements covered, both directions)
- The waves with their one-line task list
- Next step: `/frame:build`

Then **stay available for a review pass** (the plan is the most expensive pre-code decision; the human makes the planning calls). Invite it:
> "Plan ready — {N} tasks in {W} waves. Want to adjust anything before build? I'll edit plan.md and log the change. Otherwise: `/frame:build {feature}`."

For each change the user asks for: edit plan.md directly, re-run the Step A4/A6 deterministic checks on the touched part, and append to plan.md `## Decision Log`:
```markdown
### {date} — {short title}
- Change: {what changed}
- Reason: {why}
```
Build does not require a sign-off — this is an invitation, not a gate.

### Step A10: Update STATE.md

Update `.planning/STATE.md`:
```markdown
## Current Position
- Phase: PLAN
- Feature: {feature}
- Task: 0/{total}
- Status: COMPLETE — plan created, {total} tasks in {waves} waves
```

---

## Mode B: Plan from audit findings

Triggered by: `/frame:plan audit` or `/frame:plan audit all`

### Step B1: Find the audit report

```bash
ls -t .planning/reports/audit/*/AUDIT.md 2>/dev/null | head -1
```

If no report → STOP: "No audit report found. Run /frame:audit first."

### Step B2: Read findings + SIZE hint

Read the AUDIT.md. Extract:
- `audit` mode (default): only CRITICAL and HIGH severity, `Verified: yes` findings
- `audit all` mode: also include MEDIUM findings — these carry `Verified: yes` OR `Verified: auto` (MEDIUM with Confidence >5 skips the adversarial pass and is marked `auto`; only `refuted` is excluded)

Skip research.md validation in this mode.

**SIZE hint**: if after filtering only **≤2 findings in ≤2 files** remain, a full plan+build is overhead — suggest:
> "Only {n} finding(s) in {m} file(s). `/frame:fix` closes these in parallel without the plan/TDD ceremony. Plan anyway?"

### Step B3: Read context (same discipline as Mode A)

Even for fixes, read: `.planning/MAP.md`, `.planning/memory/conventions.md`, `.planning/memory/dependencies.md` (Avoid list), and `.planning/memory/learnings.md ## Anti-Patterns` — so fix tasks don't violate conventions or reintroduce rejected tools/anti-patterns.

### Step B4: Group findings into tasks

- Findings in the same file/module → merge into one task (reference all finding IDs)
- Group: CRITICAL findings before HIGH (into earlier waves)
- Run the same deterministic structural checks as Mode A Step A4 (path grounding, no same-wave file conflict, dependency sanity)

Each task (same body discipline as Mode A — every task gets a Test):
```markdown
### Task N: Fix {description}
- Files: `path/to/file.ts`
- Findings: SEC-1, LOGIC-3
- Complexity: low
- Risk: medium
- Estimate: 1h
- Wave: 1
- Action: {what to change}; follow {pattern}.
- Done: {observable result — the finding no longer reproduces}; test green.
- Context: AUDIT.md {finding IDs}
- Test: `path/to/file.test.ts`
- Dependencies: NONE
- Verification: {test command}
- Status: [ ]
```

### Step B5: Create plan.md

Feature name: `audit-{date}` (e.g., `audit-2026-06-12`).

Create `docs/specs/audit-{date}/spec.md` (list of findings as "requirements"):
- Each finding = one requirement with ID, severity, claim, file

Create `docs/specs/audit-{date}/plan.md` (same format as Mode A, no Coverage table — instead `## Findings Addressed`).

### Step B6: Update STATE.md + report

```markdown
## Current Position
- Phase: PLAN
- Feature: audit-{date}
- Status: COMPLETE — audit plan created, {N} findings in {waves} waves
```

Show: count of Critical/High addressed, skipped Medium (if any), next step: `/frame:build audit-{date}`

---

## AUTO mode (driven by /frame:auto)

Applies **only** when the autopilot marker exists: `[ -f "$(git rev-parse --git-dir)/frame-autopilot" ]`. Standalone runs ignore this section.

- **No fuzzy-match questions** — the feature name comes explicitly from `/frame:auto`; if several `docs/specs/` candidates still match, halt the flight (report the candidates) instead of asking.
- **Existing plan with `[DONE]` tasks** → take option **(a) re-plan the remainder** by default and announce it in one line; do not ask.
- **Open Questions unanswered** → still a hard STOP (this halts the flight — autopilot never answers research questions for the user).
- **Devil's-advocate blockers after 2 loops** → still a hard STOP (halts the flight); advisories go to Plan Risks as usual.

## Rules (all modes)

- **SIZE gate before STATE.md** — never leave STATE in IN_PROGRESS after a "skip planning" answer
- **Fail-fast on research.md** — don't plan on incomplete data
- **Open Questions blocks planning** — must be empty before Mode A proceeds
- **Ground the plan in real code** — read the target modules; every `Files:` path exists or is marked `(new)`
- **Never overwrite a plan with [DONE] tasks** — offer re-plan-remainder / full re-plan / cancel
- **Every task carries a body** — Action + Done + Context, so build's subagent needs no re-derivation
- **Core patterns only** — don't trust experimental ones; **Avoid list** — don't propose rejected tools
- **Atomic tasks** — Files Changed ≤ 3, independently verifiable, no orphaned code (time is not the test)
- **Parallel label on every wave** — file-disjoint **and** context-independent for `yes`
- **Coverage both ways** — every R/AC has a task; every task covers an R/AC (or is justified)
- **No silent scope cuts** — don't narrow a requirement into "v1 for now"
- **Blockers must be fixed** — structural/critique blockers loop (≤2), advisories go to Plan Risks
- **Risk on every task** — Builder must see risks upfront
- **Test + Verification on every task** — all modes, including audit fixes
- **Touched Files section always present** — /frame:parallel needs it for cross-feature overlap checks
- **spec.md R/AC verbatim** — same IDs as research.md, or review traceability breaks
- **Never edit code** — only create spec.md and plan.md

## Result

- `docs/specs/{feature}/spec.md` — specification with verbatim R/AC, Behavior, Interfaces, Out of Scope
- `docs/specs/{feature}/plan.md` — plan with body-carrying tasks, waves, Parallel labels, Coverage, Decision Log
- `.planning/STATE.md` updated
