---
description: "Close review findings in parallel — groups findings by file, spawns one fixer per non-conflicting group, single gates run at the end"
argument-hint: "[feature] [REV-N ...]"
allowed-tools: [Read, Write, Edit, Bash]
---
# /frame:fix -- Parallel Review Fixes

Reads `review.md`, takes confirmed FAIL findings, groups them by file, and spawns one fixer subagent per non-conflicting group **in parallel, in the shared tree** (no worktrees — findings in different files never collide). Light findings skip the full TDD ceremony. One quality-gate run at the end, then a scoped re-review.

This is the fast path for "review found N small issues in N different files". For large architectural rework, use `/frame:build` fix-mode instead.

### Routing

- (no args) — fix all confirmed FAIL findings from the current feature's `review.md`
- `{feature}` — fix findings for a specific feature
- `REV-1 REV-4 ...` — fix only the listed finding IDs

## Instructions

### Step 0: Find review.md + checkpoint

Determine feature from `.planning/STATE.md` (or the `{feature}` arg). Read `docs/specs/{feature}/review.md`.

If not found → **STOP**: "review.md not found. Run /frame:review first."

Create a single checkpoint (orchestrator-owned, feature-scoped to avoid collisions):
```bash
git tag "frame/checkpoint/fix-{feature}-$(date +%Y%m%dT%H%M%S)" -m "Auto checkpoint before fix phase"
```

### Step 1: Select findings

From `review.md → Findings`, select findings that are **confirmed FAIL**:
- `Verified: yes` (refuted findings are skipped — they are not real)
- Severity CRITICAL / HIGH / MEDIUM (LOW findings are optional; include only if explicitly listed by ID)

If `REV-N` IDs were passed as args → restrict to those.

If nothing selected → **STOP**: "No confirmed FAIL findings to fix. Review recommendation: {approve/...}."

**Heartbeat**: "Selected {N} findings to fix across {M} files."

### Step 2: Group by file (conflict-free batches)

Group selected findings so that **no two groups touch the same file**:
- Findings whose `File` is the same path → one group (one fixer handles them together, so two fixers never edit the same file).
- Findings in distinct files → separate groups → run in parallel.

Determine each group's ceremony level from the findings' `Effort` field:
- All findings in the group are `Effort: XS` or `S` → **light** (direct fix + targeted test, no RED-first cycle)
- Any finding is `Effort: M` or `L` → **full TDD** (RED → GREEN → REFACTOR)

If a finding has no `Effort` field, infer: single-line/local change → light; new logic or multi-function change → full TDD.

### Step 3: Confirm risky fixes up front (before spawning)

Scan selected findings for any that touch core logic, auth, money, migrations, or routing (Severity CRITICAL on such files). If any exist → list them and **ask the user once**: "These fixes touch sensitive areas: {list}. Proceed with all, or hold some for manual review?"

Subagents cannot ask questions mid-run — all confirmation happens here, at the orchestrator level, before any fixer is spawned.

### Step 4: Spawn fixers in parallel

Launch one `builder` subagent **per group, in a single message** (parallel), max 5 concurrent. **No `isolation: "worktree"`** — groups are file-disjoint by construction, so they share the working tree safely.

Each fixer receives a self-contained brief (it does **not** read memory/context files itself — everything it needs is in the prompt):
- **Mode**: `single-fix` (fix only what is described; do not scan plan.md, do not loop over other tasks, do not create checkpoints, do not edit plan.md/STATE.md)
- **Findings** (full): for each — `ID`, `File:line`, `Claim`, `Evidence` (code quote), `Fix` (approach), `Effort`
- **Ceremony**: light or full-TDD (from Step 2)
- **Relevant conventions**: the specific naming/type/style rules from `conventions.md` that apply to these files (orchestrator extracts and pastes them — 3-5 lines, not the whole file)
- **Anti-patterns**: any from `learnings.md` that apply to this change
- **Instructions**: apply the fix; add/adjust a targeted test only if logic changed; run `{quality.commands.test} {file}` for the touched file; do **not** run full gates (orchestrator does that once); do **not** commit (orchestrator commits); return the final report

Each fixer returns:
```
Group: {file(s)}
Findings closed: {REV-ids}
Status: DONE | FAILED | BLOCKED
Changed files: {list}
Targeted test: PASS | FAIL | none
Notes: {anything the orchestrator should know}
```

**Heartbeat**: "Spawned {M} fixers, waiting for completion..."

### Step 5: One quality-gate run

After **all** fixers return, run full gates once in the shared tree:
```bash
{quality.commands.typecheck}
{quality.commands.test}
{quality.commands.lint}
```

**D-step**: all must pass.

If gates FAIL → identify which group's change caused it (from the error location), re-spawn only that fixer with the error output (max 2 retries). If still failing:
```bash
git tag "frame/fix-failure-$(date +%Y%m%dT%H%M%S)"
```
Report to the user, do **not** roll back the passing fixes. Stop.

### Step 6: Commit

Commit the fixes (orchestrator-owned). Prefer one commit that references all closed findings:
```bash
git add {specific_files}
git commit -m "fix(review): close {REV-ids}"
```
If the groups are logically distinct, one commit per group is also fine. **Never `git add -A`** — add only the files the fixers changed.

Mark each closed finding in `review.md`:
```markdown
### [REV-1] {Title}  [FIXED]
```

### Step 7: Scoped re-review

Re-verify only the categories whose findings were fixed (same idea as `/frame:review audit` — don't re-run the whole panel).

For each closed finding, launch the matching panel agent on the **new** diff to confirm the issue is gone:

| Finding category | Re-review agent |
|------------------|-----------------|
| Spec / architecture | reviewer |
| Security | security |
| Performance | performance-auditor |
| Business logic | devils-advocate |
| Tests | tests-reviewer |
| Conventions | conventions-reviewer |

Launch the needed agents in one message (parallel). Each confirms: is `REV-N` actually resolved in the diff? Return `RESOLVED | STILL_OPEN` per finding.

Any `STILL_OPEN` → note it, keep the `[FIXED]` mark off that finding, report to user.

### Step 8: Update STATE.md + report

**If all findings RESOLVED**:
```markdown
## Current Position
- Phase: REVIEW
- Feature: {feature}
- Status: Review complete, ready to ship
- Review: docs/specs/{feature}/review.md
```
```
✅ Fixed {N} findings across {M} files ({parallel} in parallel). Gates green, re-review clean.
   → /frame:ship
```

**If any STILL_OPEN**:
```markdown
## Current Position
- Phase: BUILD
- Feature: {feature}
- Status: REVIEW_FAILED
- Review: docs/specs/{feature}/review.md
- Remaining: {list of STILL_OPEN ids}
```
```
⚠️ Closed {X}/{N} findings. Remaining: {ids} — need manual attention or /frame:build.
```

---

## When to use

- `/frame:review` came back with **request changes** and the findings are localized edits in distinct files.
- You want the fixes done in one parallel pass instead of a sequential build cycle.

**Not for**: fixes that require re-architecting, cross-cutting changes touching many shared files, or anything where findings pile into the same 1-2 files (no parallelism to gain — use `/frame:build` fix-mode).

## Rules

- **Confirmed FAIL only** — never act on refuted findings
- **File-disjoint groups** — one file is owned by exactly one fixer; no worktrees needed
- **Light findings skip TDD** — Effort XS/S get a direct fix; M/L keep full TDD
- **Subagents don't self-read context** — the orchestrator packs conventions/anti-patterns into the brief
- **Subagents don't commit or run full gates** — orchestrator does both, once
- **Confirmation before spawn** — sensitive fixes are cleared with the user up front, never mid-run
- **Specific files only** — never `git add -A`
- **Scoped re-review** — only re-run the categories that were fixed

## Result

- Confirmed FAIL findings closed in parallel
- One quality-gate run, all green
- Fixes committed with finding references
- Findings marked `[FIXED]` in review.md
- Scoped re-review confirms resolution
- `.planning/STATE.md` updated (ready to ship, or remaining list)
