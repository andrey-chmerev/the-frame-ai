---
description: "Code review: completion check, automated gates, parallel reviewer panel with verification pass"
argument-hint: "[audit]"
allowed-tools: [Read, Write, Bash]
---
# /frame:review -- Code Review

Full review of the current feature. Validates completion against spec/plan, runs quality gates, runs a parallel panel of reviewers across 6 dimensions, adversarially verifies FAIL findings, then produces a review report.

### Routing

- (no args) — standard review for a feature built via `/frame:build`
- `audit` — review mode after `/frame:build` on an audit plan: traces findings closed, not R/AC

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

For each **FAIL** finding from the panel:
1. Open the referenced file at the given line
2. Attempt to refute the finding: is there validation higher in the stack? Is the condition reachable? Is this a test file?
3. **Not refuted** → `Verified: yes` — confirmed FAIL
4. **Refuted** → downgrade to WARN with note `unverified — see appendix`

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
{For each FAIL finding — numbered, actionable. Build fix-mode reads this section.}
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
   Run /frame:build to fix.
```

---

## Mode: review audit

Triggered by: `/frame:review audit` (or auto-detected when feature name starts with `audit-`).

Difference from standard review:
- **Step 1c**: instead of R/AC traceability, trace each `Findings:` ID from plan.md tasks → verify the fix is in the diff (read the file at the patched location)
- **Step 3**: launch only the panel categories whose findings were being fixed (e.g., if only SEC and LOGIC findings were fixed, run only security + devils-advocate + reviewer)
- **Report**: "Closed {N} of {M} findings. Remaining: {list}" — if all closed, ship is open

---

## Rules

- **Completion before review** — if build is not done, stop at Step 1a
- **Evidence required** — every panel finding must have a code quote
- **Adversarial verification** — all FAIL findings go through Step 4
- **Small diff scales down** — <50 lines → 3-agent panel
- **Panel agents are read-only** — they return findings as text, do not write files or STATE.md

## Result

- Completion verified (all tasks done, all requirements traced)
- Automated checks passed
- Parallel reviewer panel run
- FAIL findings adversarially verified
- Review report at `docs/specs/{feature}/review.md`
- `.planning/STATE.md` updated with approve or REVIEW_FAILED
