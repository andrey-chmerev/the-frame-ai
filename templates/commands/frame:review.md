---
description: "Code review: completion check, automated gates, parallel reviewer panel with verification pass"
argument-hint: "[audit | strict]"
allowed-tools: [Read, Write, Bash]
---
# /frame:review -- Code Review

Full review of the current feature. Validates completion against spec/plan, runs quality gates, runs a parallel panel of reviewers across 6 dimensions, adversarially verifies FAIL findings, then produces a review report.

### Routing

- (no args) — standard review for a feature built via `/frame:build`
- `audit` — review mode after `/frame:build` on an audit plan: traces findings closed, not R/AC
- `strict` — adversarial two-verdict loop: two independent verdicts must both PASS; on FAIL, fix only what's flagged and re-review with **fresh** reviewers, max 3 rounds, then escalate (see "Mode: review strict")

## Instructions

### Step 0: STATE.md + determine scope

Update `.planning/STATE.md`:
```markdown
## Current Position
- Phase: REVIEW
- Status: IN_PROGRESS
- Started: {timestamp}
```

Determine diff scope:
```bash
# Try in order: frame/checkpoint tag from this feature, then merge-base with main
BASE=$(git tag -l "frame/checkpoint/plan-*" --sort=-creatordate | head -1)
[ -z "$BASE" ] && BASE=$(git merge-base HEAD main 2>/dev/null)
[ -z "$BASE" ] && echo "Cannot determine base — ask user for base commit"
git diff "${BASE}"..HEAD --stat
```

Store `$BASE` for use in Steps 2–3.

### Step 1: Completion check

#### 1a: Plan tasks

Read `docs/specs/{feature}/plan.md`. Verify all tasks marked `[DONE]`:
```bash
grep "^### Task" docs/specs/{feature}/plan.md | grep -v "\[DONE\]"
# Must return empty
```

If any tasks not `[DONE]` → **STOP**: "Build is not complete. Run /frame:build first."

#### 1b: Re-run Verification commands

For each task in plan.md with a `Verification:` field — re-run that command and verify it passes.

#### 1c: Requirements traceability

> Skip this step in `audit` mode (no R/AC numbers) — jump to Step 1d.

Read `docs/specs/{feature}/spec.md`. For each numbered requirement R{n} and acceptance criterion AC{n}, find its implementation in code (file:line) or test that covers it.

Build the coverage table:
```markdown
| Requirement | Status | Evidence |
|-------------|--------|----------|
| R1          | DONE   | src/api/users.ts:42, users.test.ts:15 |
| AC3         | MISSING | — |
```

Any **MISSING** → Critical finding: "Requirement {id} not implemented."

#### 1d: Scope creep check

Files in `git diff ${BASE}..HEAD` not mentioned in any plan.md task → WARN: "Files changed outside task scope: {list}".

### Step 2: Automated gates

```bash
{quality.commands.typecheck}
{quality.commands.test}
{quality.commands.lint}
{quality.commands.build}
```

**D-step**: All must pass. If any fail — update STATE.md `Status: REVIEW_FAILED (automated)`, report errors, stop.

**Heartbeat**: "Automated checks passed, launching reviewer panel..."

### Step 3: Parallel reviewer panel

> **Small diff rule**: if `git diff ${BASE}..HEAD` is <50 lines, collapse to 3 agents: reviewer + security + tests-reviewer.

Launch all panel agents in one message (parallel). Each receives:
- The diff: `git diff ${BASE}..HEAD`
- Path to spec.md
- Their specific brief (see below)
- Instruction: return verdict `PASS | WARN | FAIL` + findings in the universal schema as final text; do NOT write files; do NOT write STATE.md

| Agent | Role | Focus |
|-------|------|-------|
| reviewer | Spec compliance | requirements met, no scope creep, architecture matches plan |
| security | Security | OWASP issues in the diff only; see security agent's panel brief |
| performance-auditor | Performance | N+1, leaks, blocking calls in the diff; see panel brief |
| devils-advocate | Business logic | edge cases, error paths, race conditions, money/data logic |
| tests-reviewer | Test quality | coverage, meaningful assertions, error paths tested |
| conventions-reviewer | Conventions | naming, types, dead code, style rules |

**What NOT to report (all agents)**:
- Pre-existing issues outside the diff
- Style preferences without a rule in conventions.md
- Theoretical DoS without a concrete reproduction in the diff
- Micro-perf without a measurable impact

### Step 4: Verification pass

Verify **FAIL** findings adversarially, in parallel — launch `devils-advocate` subagents in refute mode, **batches of ≤5** (same pattern as `/frame:audit` Step 3). Each subagent receives one finding + the referenced file content, and tries to refute it:
- Is there validation higher in the stack?
- Is the condition reachable?
- Is this a test/example file?
- Output: `{ refuted: boolean, reason: string }` — default `refuted: false` unless there is concrete evidence.

Then:
- **Not refuted** → `Verified: yes` — confirmed FAIL
- **Refuted** → downgrade to WARN with note `unverified — see appendix`

If there are ≤2 FAIL findings, verifying inline (without subagents) is fine — the parallel path is for larger batches.

Confirmed FAIL findings block ship.

### Step 5: Create review report

```bash
mkdir -p docs/specs/{feature}
```

Write `docs/specs/{feature}/review.md`:

```markdown
# Review: {Feature}
Date: {date}
Base: {BASE commit or tag}

## Completion
| Requirement | Status | Evidence |
|-------------|--------|----------|
| R1          | DONE   | {file:line or test} |
| AC3         | MISSING | — |

## Automated Checks
- typecheck: PASS | FAIL
- tests: PASS | FAIL
- lint: PASS | FAIL
- build: PASS | FAIL

## Panel Verdicts
| Reviewer | Verdict | Findings |
|----------|---------|----------|
| Spec compliance | PASS | 0 |
| Security        | WARN | 1 |
| Performance     | PASS | 0 |
| Business logic  | FAIL | 2 |
| Tests           | WARN | 1 |
| Conventions     | PASS | 0 |

## Findings

### [REV-1] {Title}
- **Severity**: CRITICAL | HIGH | MEDIUM | LOW
- **Confidence**: 1–10
- **File**: path/to/file.ts:{line}
- **Claim**: {what is wrong}
- **Evidence**: {code quote}
- **Impact**: {what happens}
- **Fix**: {approach}
- **Effort**: XS | S | M | L
- **Verified**: yes | no | refuted

...

## Recommendation
approve | request changes

## Action Items
{For each FAIL finding — numbered, actionable. `/frame:fix` (and build fix-mode) read this section. Each item should carry its finding's File and Effort so the fixer can group and scope the work.}
1. [REV-1] Fix {issue} in {file}:{line}
2. ...

## Memory Updates
- learnings.md Anti-Patterns: {to add if a problem found, else "none"}
- learnings.md Patterns: {confirmed good pattern, else "none"}
```

### Step 6: Update STATE.md + notify

**If approve** (no confirmed FAIL findings):
```markdown
## Current Position
- Phase: REVIEW
- Feature: {feature}
- Status: Review complete, ready to ship
- Review: docs/specs/{feature}/review.md
```

```
✅ Review passed. {N} warnings (non-blocking).
   → /frame:ship (or /frame:test-plan first for a manual checklist)
```

**If request changes** (any confirmed FAIL):
```markdown
## Current Position
- Phase: BUILD
- Feature: {feature}
- Status: REVIEW_FAILED
- Review: docs/specs/{feature}/review.md
- Critical Issues: {N}
```

```
❌ Review failed. {N} critical issues.
   Fixes: docs/specs/{feature}/review.md → Action Items
   Run /frame:fix to close them in parallel (or /frame:build for large/architectural changes).
```

---

## Mode: review audit

Triggered by: `/frame:review audit` (or auto-detected when feature name starts with `audit-`).

Difference from standard review:
- **Step 1c**: instead of R/AC traceability, trace each `Findings:` ID from plan.md tasks → verify the fix is in the diff (read the file at the patched location)
- **Step 3**: launch only the panel categories whose findings were being fixed (e.g., if only SEC and LOGIC findings were fixed, run only security + devils-advocate + reviewer)
- **Report**: "Closed {N} of {M} findings. Remaining: {list}" — if all closed, ship is open

---

## Mode: review strict

Triggered by: `/frame:review strict`. For high-stakes changes where a single review pass isn't enough. Runs Steps 0–2 exactly as standard, then replaces Steps 3–6 with an adversarial **two-verdict loop**.

### Step S3: Two independent verdicts (round {N})

Run the panel as two **independent verdict groups in parallel**, in one message:
- **Group A** — `reviewer` + `tests-reviewer` + `conventions-reviewer` (does it meet spec, is it well-built).
- **Group B** — `devils-advocate` + `security` + `performance-auditor` (how does it break).

Each group returns its own overall verdict `PASS | FAIL` plus findings (universal schema, text only, no file writes). The two groups do **not** see each other's output — independence is the point.

Build the **agreement table**:
```markdown
| Round | Group A | Group B | Agreement |
|-------|---------|---------|-----------|
| 1     | PASS    | FAIL    | disagree — B found 2 blockers |
```

**Gate**: ship is open only when **both groups PASS in the same round**. Any FAIL → go to the fix loop.

### Step S4: Fix loop (max 3 rounds)

While not both-PASS and round ≤ 3:
1. Adversarially verify the FAIL findings (Step 4's refute pass) — drop refuted ones.
2. Fix **only** the confirmed findings from this round. **No drive-by changes** — touching anything not flagged invalidates the round and restarts it. Record each fix against its finding ID.
3. Re-run automated gates (Step 2).
4. **Re-review with FRESH reviewers** — spawn new agent instances for Group A and Group B that receive only the *new* diff and the spec, with **no memory of previous rounds or of having approved anything**. This removes "I already blessed this" bias — the single most important property of the loop.
5. Append the new round to the agreement table.

Round counter increments each re-review. **After 3 rounds without both-PASS → STOP and escalate to the user**: show the agreement table, the findings still open, and what was tried each round. Do not loop a 4th time.

### Step S5: Strict report

Write `docs/specs/{feature}/review.md` as in Step 5, plus:
```markdown
## Strict Loop
| Round | Group A | Group B | Fixed this round |
|-------|---------|---------|------------------|
| 1     | PASS    | FAIL    | REV-2, REV-3 |
| 2     | PASS    | PASS    | — |

Result: both groups PASS in round 2 → approved.
(or: escalated after 3 rounds — {open findings})
```

STATE.md: both-PASS → `Status: Review complete, ready to ship`; escalated → `Status: REVIEW_FAILED (strict, escalated after 3 rounds)`.

---

## Rules

- **Completion before review** — if build is not done, stop at Step 1a
- **Evidence required** — every panel finding must have a code quote
- **Adversarial verification** — all FAIL findings go through Step 4
- **Small diff scales down** — <50 lines → 3-agent panel
- **Panel agents are read-only** — they return findings as text, do not write files or STATE.md
- **Strict mode = fresh reviewers each round** — re-reviews spawn new agents with no memory of prior approval; both verdict groups must PASS in the same round; fix only what's flagged; escalate after 3 rounds

## Result

- Completion verified (all tasks done, all requirements traced)
- Automated checks passed
- Parallel reviewer panel run
- FAIL findings adversarially verified
- Review report at `docs/specs/{feature}/review.md`
- `.planning/STATE.md` updated with approve or REVIEW_FAILED
