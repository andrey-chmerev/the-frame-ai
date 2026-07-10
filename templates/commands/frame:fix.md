---
description: "Close review findings in parallel — groups findings by file, spawns one fixer per non-conflicting group, single gates run at the end"
argument-hint: "[feature] [REV-N ...]"
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob, Task]
---
# /frame:fix -- Parallel Review Fixes

Reads `review.md`, takes confirmed FAIL findings, groups them by file, and spawns one fixer subagent per non-conflicting group **in parallel, in the shared tree** (no worktrees — findings in different files never collide). Light findings skip the full TDD ceremony. One quality-gate run at the end, then a scoped re-review.

This is the fast path for "review found N small issues in N different files". For large architectural rework, use `/frame:build` fix-mode instead.

### Routing

- (no args) — fix all confirmed FAIL findings from the current feature's `review.md`
- `{feature}` — fix findings for a specific feature
- `REV-1 REV-4 ...` — fix only the listed finding IDs

## Instructions

### Step 0: Find review.md + checkpoint + mark IN_PROGRESS

Determine feature from `.planning/STATE.md` (or the `{feature}` arg). Read `docs/specs/{feature}/review.md`.

If not found → **STOP**: "review.md not found. Run /frame:review first."

Create a single checkpoint (orchestrator-owned, feature-scoped to avoid collisions):
```bash
git tag "frame/checkpoint/fix-{feature}-$(date +%Y%m%dT%H%M%S)" -m "Auto checkpoint before fix phase"
```

**Mark the run in STATE.md** so a side quest in another terminal is warned (the concurrent-work check in `/frame:fast` and `/frame:debug` triggers on `IN_PROGRESS`). Set `Status: FIX_IN_PROGRESS` — parallel fixers share this tree's git index, so a `/frame:fast` here would collide:
```markdown
## Current Position
- Phase: REVIEW
- Feature: {feature}
- Status: FIX_IN_PROGRESS
- Started: {timestamp}
```
> Every failure path below restores `Status: REVIEW_FAILED` (build fix-mode is detected by exactly that value — losing it would strand the feature). The success path sets the ship-ready status in Step 8.

### Step 1: Select findings

The `## Findings` section is the source of truth (it carries `Verified`, `Source`, `Effort`, `Evidence`); `## Action Items` is only a human index — do not select from it. From `review.md → Findings`, select findings that are **confirmed FAIL**:
- `Verified: yes` (refuted findings are skipped — they are not real)
- Severity CRITICAL / HIGH / MEDIUM (LOW findings are optional; include only if explicitly listed by ID)
- not already marked `[FIXED]` in the heading (a prior fix pass closed it)

If `REV-N` IDs were passed as args → restrict to those.

If nothing selected → **STOP**: "No confirmed FAIL findings to fix. Review recommendation: {approve/...}."

**Heartbeat**: "Selected {N} findings to fix across {M} files."

### Step 2: Group by file (conflict-free batches)

Group selected findings so that **no two groups touch the same file — source *or* test**:
- Findings whose `File` is the same path → one group (one fixer handles them together, so two fixers never edit the same file).
- **Also compute each group's likely test file** (project convention — the sibling `*.test.*`/`*_test.*`, or the mirrored path under the test dir; see CLAUDE.md). A fixer that changes logic will touch it. Treat the test file as owned by the group, exactly like the source file.
- Two groups are safe to run in parallel only when their **`File` sets AND their test-file sets are both disjoint**. If group A's source or test file overlaps group B's test file → **merge A and B into one group** (one fixer owns that test file). This mirrors `/frame:build`'s pre-wave `Files: ∪ Test:` conflict check — without it two parallel fixers clobber a shared `*.test.*` in the shared tree.
- Findings in fully distinct files (no source/test overlap) → separate groups → run in parallel.

Determine each group's ceremony level from the findings' `Effort` field:
- All findings in the group are `Effort: XS` or `S` → **light** (direct fix + targeted test, no RED-first cycle)
- Any finding is `Effort: M` or `L` → **full TDD** (RED → GREEN → REFACTOR)

If a finding has no `Effort` field, infer: single-line/local change → light; new logic or multi-function change → full TDD.

### Step 3: Confirm risky fixes up front (before spawning)

Scan selected findings for any that touch core logic, auth, money, migrations, or routing (Severity **CRITICAL or HIGH** on such files — a HIGH fix in auth/money is just as risky as a CRITICAL one). If any exist → list them and **ask the user once**: "These fixes touch sensitive areas: {list}. Proceed with all, or hold some for manual review?"

Subagents cannot ask questions mid-run — all confirmation happens here, at the orchestrator level, before any fixer is spawned.

### Step 4: Apply the fixes

**Fast path — single light group.** If there is exactly **one** group and its ceremony is **light** (all findings XS/S), there is no parallelism to gain and a subagent round-trip is pure overhead. The orchestrator applies the fix **inline** itself (it has `Edit`): make the change, add/adjust the targeted test only if logic changed, run `{quality.commands.test} {file}` for the touched file. Then continue at Step 5 (single-group commit + re-review). Skip the parallel spawn below.

**Default path — spawn fixers in parallel.** Launch one `builder` subagent **per group, in a single message** (parallel), max 5 concurrent. **No `isolation: "worktree"`** — groups are file-disjoint by construction, so they share the working tree safely.

Each fixer receives a self-contained brief (it does **not** read memory/context files itself — everything it needs is in the prompt):
- **Mode**: `single-fix` (fix only what is described; do not scan plan.md, do not loop over other tasks, do not create checkpoints, do not edit plan.md/STATE.md)
- **Findings** (full): for each — `ID`, `File:line`, `Claim`, `Evidence` (code quote), `Fix` (approach), `Effort`
- **Ceremony**: light or full-TDD (from Step 2)
- **Relevant conventions**: the specific naming/type/style rules from `conventions.md` that apply to these files (orchestrator extracts and pastes them — 3-5 lines, not the whole file)
- **Anti-patterns**: any from `learnings.md` that apply to this change
- **Instructions**: apply the fix; add/adjust a targeted test only if logic changed; run `{quality.commands.test} {file}` for the touched file; do **not** run full gates (orchestrator does that once); do **not** commit (orchestrator commits); return the final report
- **Parallel-tree caveat**: you share the working tree with other fixers. The PostToolUse quality-gate hook runs a **project-wide** typecheck/lint on each edit, so it may report errors in files **you did not touch** — those belong to a sibling fixer's in-flight change. **Ignore errors outside your own files; never edit a file that isn't in your group** to make the hook green (that breaks group disjointness). Only your targeted test result matters for your report.

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

### Step 4.5: Triage fixer reports

After all fixers return, split them by `Status` before running gates:
- **DONE** groups → carry forward to gates, commit, and re-review.
- **FAILED / BLOCKED** groups → **excluded** from the commit and from `[FIXED]`. Their `REV-ids` go straight to the `Remaining` list (Step 8). Do not re-review them (nothing was resolved). Record the fixer's `Notes` so the user knows why (stuck, ambiguous fix, missing context).

If **no group is DONE** → restore STATE.md `Status: REVIEW_FAILED`, report "All {M} fixer groups failed/blocked: {ids} — need manual attention or /frame:build." and stop.

**Heartbeat**: "{X}/{M} groups fixed, {Y} failed/blocked. Running gates on the fixed set..."

### Step 5: One quality-gate run

After triage, run full gates once in the shared tree — **the same four gates `/frame:review` runs**, so a fix can't pass here yet break the build:
```bash
{quality.commands.typecheck}
{quality.commands.test}
{quality.commands.lint}
{quality.commands.build}
```

**D-step**: all must pass.

If gates FAIL → attribute and retry (max 2 retries total):
- **Attribution is unambiguous** (the error location sits inside exactly one DONE group's owned files) → re-spawn only that fixer with the error output.
- **Attribution is ambiguous** (error is in a shared/consumer file touched by neither, or the failure is an interaction between two groups' changes — e.g. conflicting type changes) → re-spawn **one** fixer owning the **union** of the implicated groups' files, handing it the full gate log. Chasing it as one group gives the fixer the context of both changes; re-spawning either group alone would loop.

If still failing after retries:
```bash
git tag "frame/fix-failure-$(date +%Y%m%dT%H%M%S)"
```
Restore STATE.md `Status: REVIEW_FAILED`, report to the user, do **not** roll back the passing fixes. Stop.

### Step 6: Commit

Commit the fixes from the **DONE groups only** (orchestrator-owned).

The parallel fixers ran under the PostToolUse quality-gate hook, whose last write may have left `frame-gate-status` red from a sibling's mid-flight edit even though Step 5's gates are green. That would make `git-safety.sh` block the commit. Since Step 5 just passed cleanly, clear the stale marker first (this is the documented manual-clear):
```bash
GATE_STATUS="$(git rev-parse --git-dir)/frame-gate-status"
[ -f "$GATE_STATUS" ] && head -1 "$GATE_STATUS" | grep -q '^fail' && rm -f "$GATE_STATUS"
```

Prefer one commit that references all closed findings:
```bash
git add {specific_files_from_DONE_groups}
git commit -m "fix(review): close {REV-ids}"
```
If the groups are logically distinct, one commit per group is also fine. **Never `git add -A`** — add only the files the DONE fixers changed (never files from a FAILED/BLOCKED group).

> `[FIXED]` is **not** marked yet — a finding is only closed once Step 7's re-review confirms it RESOLVED. Marking it here (before verification) would leave a stale `[FIXED]` on a finding Step 7 finds STILL_OPEN.

### Step 7: Scoped re-review

Re-verify only the categories whose findings were fixed (same idea as `/frame:review audit` — don't re-run the whole panel).

**Regenerate the diff first.** The `review-diff.patch` on disk is the *pre-fix* diff; re-reviewing against it would show the fixes as absent (everything STILL_OPEN). Take the base from the review report header (`Base:` line — the commit/tag `/frame:review` used) and write the **post-fix** diff to disk, so the re-review agents read a path, not an inlined diff (same mechanic as `/frame:review` Step 0):
```bash
BASE=$(grep -m1 '^Base:' docs/specs/{feature}/review.md | sed 's/^Base:[[:space:]]*//')
git diff "${BASE}"..HEAD > docs/specs/{feature}/review-diff.patch
```
If `BASE` is empty (older report without the header) → fall back to this feature's build checkpoint tag, then merge-base with the default branch (same resolution as `/frame:review` Step 0); if still empty, STOP and ask the user for a base.

**Route each finding by its `Source` field** (the panel agent(s) that raised it — union-merged during review dedup), not by guessing the category from the text:

| Finding `Source` | Re-review agent |
|------------------|-----------------|
| reviewer | reviewer |
| security | security |
| performance-auditor | performance-auditor |
| devils-advocate | devils-advocate |
| tests-reviewer | tests-reviewer |
| conventions-reviewer | conventions-reviewer |

If a finding lists **several** sources (post-dedup), launch **all** of them for it — the finding is RESOLVED only if every one agrees. If `Source` is missing (older report), fall back to `devils-advocate` (the broadest logic reviewer).

Launch the needed agents in one message (parallel), **each in Panel Mode on sonnet**: read-only, input = the diff path `docs/specs/{feature}/review-diff.patch` + `$BASE` + the finding's `file:line`/`Claim`/`Fix`, do **not** run gates, do **not** write any file (no review.md, no STATE.md). Each confirms: is `REV-N` actually resolved in the new diff? Return `RESOLVED | STILL_OPEN` + one-line reason per finding.

Any `STILL_OPEN` → keep it out of the `[FIXED]` set, carry its id to `Remaining`, report to user.

### Step 8: Mark closed findings + update STATE.md + report

**Now** mark `[FIXED]` — only for findings a Step 7 re-review returned **RESOLVED** (a DONE group that gates and re-review both cleared):
```markdown
### [REV-1] {Title}  [FIXED]
```
Leave the mark off everything else. The `Remaining` set = STILL_OPEN findings (Step 7) **plus** the FAILED/BLOCKED groups' findings (Step 4.5).

**If every selected finding is RESOLVED** (nothing remaining):
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

**If anything remains** (STILL_OPEN or failed/blocked):
```markdown
## Current Position
- Phase: BUILD
- Feature: {feature}
- Status: REVIEW_FAILED
- Review: docs/specs/{feature}/review.md
- Remaining: {STILL_OPEN ids + FAILED/BLOCKED ids}
```
```
⚠️ Closed {X}/{N} findings. Remaining: {ids} ({reason per id: still-open / failed / blocked}) — need manual attention or /frame:build.
```

---

## AUTO mode (driven by /frame:auto)

Applies **only** when the autopilot marker exists: `[ -f "$(git rev-parse --git-dir)/frame-autopilot" ]`. Standalone runs ignore this section.

- **Step 3 never asks.** The sensitive screen still runs, but its outcome is binary: any CRITICAL/HIGH finding on core/auth/money/migrations/routing → **halt the flight** and list them ("run /frame:fix {feature} yourself to confirm interactively"); none → proceed as confirmed. These findings did not exist at the autopilot briefing gate, so nothing pre-confirmed them — stopping is the only honest default.
- **`Remaining` non-empty after Step 8** (STILL_OPEN or FAILED/BLOCKED) → halts the flight — fix already retried and re-reviewed; re-spawning the same fixers unattended would loop.

## When to use

- `/frame:review` came back with **request changes** and the findings are localized edits in distinct files.
- You want the fixes done in one parallel pass instead of a sequential build cycle.

**Not for**: fixes that require re-architecting, cross-cutting changes touching many shared files, or anything where findings pile into the same 1-2 files (no parallelism to gain — use `/frame:build` fix-mode).

## Rules

- **Confirmed FAIL only** — never act on refuted findings; select from `## Findings`, not `## Action Items`
- **Source-or-test-disjoint groups** — a group owns its source **and** its test file; overlap in either merges the groups (no worktrees needed)
- **Light findings skip TDD** — Effort XS/S get a direct fix; M/L keep full TDD; a single light group is fixed inline (no subagent)
- **Subagents don't self-read context** — the orchestrator packs conventions/anti-patterns into the brief
- **Subagents don't commit or run full gates** — orchestrator does both, once; fixers ignore hook errors outside their own files
- **Confirmation before spawn** — sensitive fixes (CRITICAL or HIGH on core/auth/money/migrations/routing) are cleared with the user up front, never mid-run
- **Full gates incl. build** — Step 5 runs the same four gates as `/frame:review`
- **Specific files only** — never `git add -A`; never commit a FAILED/BLOCKED group's files
- **`[FIXED]` only after re-review** — a finding is marked closed only once Step 7 returns RESOLVED, not at commit time
- **Re-review on the post-fix diff** — regenerate `review-diff.patch` from `Base:` before Step 7; route by the finding's `Source`
- **IN_PROGRESS marker** — Step 0 sets `FIX_IN_PROGRESS`; every failure path restores `REVIEW_FAILED`

## Result

- Confirmed FAIL findings closed in parallel (or inline for a single light group)
- One quality-gate run (typecheck + test + lint + build), all green
- Fixes committed with finding references (DONE groups only)
- Findings marked `[FIXED]` in review.md **after** re-review confirms them RESOLVED
- Scoped re-review on the regenerated post-fix diff, routed by `Source`
- `.planning/STATE.md` updated (ready to ship, or remaining list incl. failed/blocked)
