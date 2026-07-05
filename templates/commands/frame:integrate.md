---
description: "Merge all finished parallel features into one integration branch with quality gates and cross-feature review"
argument-hint: "[feature ...]"
allowed-tools: [Read, Write, Edit, Bash]
---
# /frame:integrate -- Собрать параллельные фичи воедино

Takes finished tasks from `.planning/BOARD.md`, merges their branches one by one into `integrate/{date}`, runs full quality gates **after every merge** (a failure is localized to a specific branch, not "somewhere in the sum of five"), then cross-feature review of the combined diff, merges per-feature learnings into shared memory, and reports readiness for `/frame:ship`.

### Routing

- (no args) — integrate all board tasks that pass preflight
- `{feature} ...` — integrate only the listed features

## Instructions

### Step 0: Fail-fast

```bash
git rev-parse --git-dir 2>/dev/null || echo "NOT_GIT"
git rev-parse --git-common-dir
git status --short
```

- Not a git repo → STOP.
- Inside a linked worktree (`--git-common-dir` contains `worktrees/`) → STOP: "Run /frame:integrate from the main worktree."
- Current branch matches `integrate/*`, or an `integrate/{today}` branch already exists → unfinished previous run: jump to **Recovery** (bottom of this file) before anything else.
- Main worktree dirty → STOP: "Commit or stash local changes first — integration must start from a clean tree."
- `.planning/BOARD.md` missing or no `active` rows → STOP: "Nothing to integrate. Board is empty (/frame:parallel start)."

### Step 1: Preflight — refresh board, check readiness

Refresh the board exactly like `/frame:parallel status` (walk worktrees, read their `.planning/STATE.md` and plan.md).

A task is **ready** when, in its worktree:
- `Phase:` is `REVIEW` or `TEST`, and `Status:` is `approve` / `ready to ship` / `Review complete` (the same criteria `/frame:ship` uses);
- `git -C {worktree} status --short` is clean;
- all plan.md tasks are `[DONE]`.

If specific features were passed as arguments — restrict to those (a listed-but-not-ready feature = STOP with its blockers).

**Note — main may already carry a feature.** The first/only feature often builds directly in main (build Step 0, Case D) and is not a board row. That is fine: main is the integration base, so its feature ships together with the merged ones. Just confirm main itself is reviewed and green before integrating (it becomes the base of `integrate/{date}`); if main has an unreviewed feature in progress, tell the user to finish `/frame:review` in main first.

If some active tasks are not ready, ask **once**:
```
Ready: {list}. Not ready: {feature} — {reason (phase/status/uncommitted)}.
Integrate the ready ones now, or wait?
```
Zero ready tasks → STOP with per-task blockers.

### Step 1.5: Staleness check — has main moved since the feature was reviewed?

A worktree's `approve` is a snapshot: it certified the feature against the main it branched from, not against today's main. For each ready feature:

```bash
# commits main gained after the feature branched off
git log $(git merge-base main feature/{name})..main --oneline | wc -l
# files those commits touched
git diff $(git merge-base main feature/{name})..main --name-only
```

- Main has NOT moved → the approve is current, proceed.
- Main moved but touched files are **disjoint** from the feature's Touched Files → proceed (the post-merge gates in Step 4 still cover semantic surprises).
- Main moved AND the changed files **overlap** the feature's Touched Files → the approve is stale where it matters. Re-run the gates inside that worktree before including it in the merge queue:
```bash
git -C {worktree} merge main   # or rebase, per parallel.mergeStrategy
cd {worktree} && {quality.commands.typecheck} && {quality.commands.test} && {quality.commands.lint}
```
  Green → include it. Red → exclude it from this run and report: "{feature}: approve is stale — main changed {files} after its review; gates now fail in the worktree. Fix there (/frame:fix or /frame:build), then re-run /frame:integrate."

### Step 2: Checkpoint + integration branch

```bash
git checkout main && git pull 2>/dev/null || true
git tag "frame/checkpoint/integrate-$(date +%Y%m%dT%H%M%S)" -m "Auto checkpoint before integration"
git checkout -b integrate/$(date +%Y-%m-%d)
```

If `integrate/{date}` already exists (second run today) — suffix `-2`, `-3`, ...

Update `.planning/STATE.md` (main):
```markdown
## Current Position
- Phase: INTEGRATE
- Features: {list}
- Status: IN_PROGRESS
- Branch: integrate/{date}
- Started: {timestamp}
```

### Step 2.5: Predict conflicts with merge-tree (non-destructive)

Before merging anything, ask git — **without touching the working tree** — which branches actually conflict. This turns "merge and hope" into a planned order.

For each ready feature, test-merge it against the integration base:
```bash
BASE=$(git rev-parse HEAD)   # integrate/{date}, currently == main
# modern git (>=2.38): prints a conflict list on the last lines, non-zero exit on conflict
git merge-tree --write-tree --name-only "$BASE" feature/{name} >/tmp/mt-{name} 2>&1
echo "exit=$?"   # 0 = clean, non-zero = conflicts; /tmp/mt-{name} names the conflicting files
```
Also test **pairwise** between features that share Touched Files (two branches can each be clean against main yet collide with each other):
```bash
git merge-tree --write-tree --name-only feature/{a} feature/{b} >/dev/null 2>&1; echo "a×b exit=$?"
```

Classify each feature as **clean** or **conflict** (with the list of conflicting files and which other branch/base it collides with).

Write the prediction into `.planning/BOARD.md` under a `## Merge Preview ({date})` section so the state is visible and survives a stop/resume:
```markdown
## Merge Preview (2026-07-05)
| Feature | vs base | Conflicts with | Files |
|---------|---------|----------------|-------|
| auth    | clean   | —              | —     |
| billing | conflict| auth           | src/db/schema.ts |
```

### Step 3: Merge order

Use the Step 2.5 prediction. Sort the ready branches:
1. **clean** features first (predicted no conflicts) — merge them all before touching any conflicting one;
2. among clean ones, ascending diff size (`git diff main...feature/{name} --shortstat`);
3. **conflict** features last, **one at a time** — after each conflicting merge, re-run its gates before starting the next, so a collision never compounds with an unmerged second conflict.

Show the planned order (with the clean/conflict split from the preview) before starting.

### Step 3.5: Collect main-side hotfixes

While features were developing in worktrees, `/frame:fast` and `/frame:debug` may have landed fixes in main. Collect them per feature:

```bash
# commits main received after feature/{name} branched off
git log $(git merge-base main feature/{name})..main --oneline
```

Note commits marked `[hotfix]` (and any `fix(...)` commits) and the files they touched:
```bash
git show --stat --format="" {hotfix_commit}
```

These are the **protected fixes**: a feature branch that predates a hotfix has never seen it, so its merge can textually or semantically undo the fix. The protection below and the regression tests those fixes carry (mandatory for `[hotfix]` commits) are what keep them alive.

### Step 4: Merge loop

For each branch, in order:

```bash
git merge --no-ff feature/{name} -m "merge: feature/{name} → integrate/{date}"
```
(If `parallel.mergeStrategy` in `.frame/config.json` is `rebase`: rebase the feature branch onto the integration branch first, then fast-forward merge. Default is `merge`.)

**On conflicts**:
- **Framework state files** (`.planning/STATE.md`, `.planning/BOARD.md`, `.planning/memory/*`) — always take the integration branch's version: `git checkout --ours {file} && git add {file}`. Worktree copies of these files are branch-local scratch state; main's version is authoritative, and per-feature learnings come in via Step 6 instead;
- Trivial (disjoint import blocks, adjacent-line edits, lock files → regenerate) — resolve yourself, note it in the report;
- **Conflict touches a file from a protected hotfix (Step 3.5)** — the hotfix behavior wins by default: resolve so the fix is preserved, tell the user which hotfix was defended, and immediately run that hotfix's regression test (the test files from its commit) before continuing;
- Substantive (same function/logic changed by two features) — **evict, don't block the whole run**. Abort this one merge (`git merge --abort`), record an eviction entry (below), and continue integrating the remaining clean features. The evicted feature goes back into the queue *carrying the conflict context* so its next pass starts already knowing what collided.

**Eviction record** — when a feature is evicted (substantive conflict, or gates stay red after 2 fix attempts), do NOT silently drop it:
1. Abort the in-progress merge so the integration branch stays green: `git merge --abort`.
2. Append to `.planning/BOARD.md` under `## Evictions ({date})`:
```markdown
## Evictions (2026-07-05)
| Feature | Round | Conflicting files | Collided with | Essence |
|---------|-------|-------------------|---------------|---------|
| billing | 1     | src/db/schema.ts  | auth          | both add a non-null column to `users` in the same migration; needs a shared migration |
```
3. Set its board row `Status` to `evicted` (kept for the next round, not `integrated`).
4. Write the same context into `docs/specs/{feature}/review.md` under `## Integration conflict (round {N})` so `/frame:fix` in that worktree has the exact files and the essence to resolve against.
5. Continue the merge loop with the remaining features — one bad branch never aborts the whole integration.

The evicted feature is fixed **in its worktree** (rebase onto the new integration tip so it sees the conflicting change, resolve, re-review), then re-enters on the next `/frame:integrate` run — now predicted **clean** by Step 2.5 because the conflict was resolved at the source.

**Even without textual conflicts**: if the merged feature touched a protected hotfix's files, git may have auto-merged a semantic revert (e.g. the feature rewrote the function from a pre-fix version). The full test run below catches this via the hotfix's regression test — if exactly that test fails, report it as "feature {name} undoes hotfix {commit}: {description}", fix by re-applying the hotfix logic on top, and re-run gates.

**After every merge — full quality gates**:
```bash
{quality.commands.typecheck}
{quality.commands.test}
{quality.commands.lint}
```

Gates failed → attempt a fix (max 2 iterations, commit as `fix(integrate): {what}`). Still red → **evict this branch, keep the run going**:
```bash
git reset --hard HEAD~1   # undo only this feature's merge (previous green merges stay)
```
Then write an eviction record (see Step 4 "Eviction record" above) with the failing gate output as the essence, mark the row `evicted`, and continue the loop with the remaining features. Only STOP the whole run if the FIRST feature (integration base) can't stay green, or the user asks to.

Do NOT auto-rollback previous, green merges — eviction removes exactly one branch.

**Heartbeat** after each branch: "Merged {name} ({i}/{n}), gates green."

### Step 5: Cross-feature review

The per-feature reviews in worktrees could not see feature *interactions* — that is this step's only focus.

```bash
git diff main...HEAD --stat
```

Launch `reviewer` and `devils-advocate` agents **in one message (parallel)** on the combined diff with the brief:
- Features merged: {list, one line each on what it does}
- Main-side hotfixes made during parallel work (from Step 3.5): {commit, description, files} — verify none of them is semantically reverted by the merged features
- Focus ONLY on interactions: shared modules touched by 2+ features, migration/init order, duplicated utilities introduced independently, conflicting config/route/schema changes, one feature breaking another's assumptions
- Do NOT re-review per-feature internals (already reviewed in worktrees)

Findings CRITICAL/HIGH → fix in the integration branch (gates after fixes) or STOP and report. MEDIUM/LOW → list in the report.

### Step 6: Merge per-feature memory

For each integrated feature, if `docs/specs/{feature}/learnings.md` exists (written by retrospective/ship inside the worktree):
- Append its entries into `.planning/memory/learnings.md` under the matching sections (`## Patterns`, `## Anti-Patterns`, `## Decisions`), de-duplicating repeats;
- Mark the per-feature file as merged (add header line `> merged into .planning/memory/learnings.md on {date}`).

### Step 7: Final build gate + report

```bash
{quality.commands.build}
```

Write `.planning/reports/integration/{date}/INTEGRATION.md`:
```markdown
# Integration Report — {date}

## Merged
| Feature | Branch | Commits | Diff | Conflicts |
|---------|--------|---------|------|-----------|
| auth | feature/auth | 12 | +840/-120 | none |
| billing | feature/billing | 8 | +510/-40 | 2 trivial (imports) |

## Gates
After each merge: typecheck ✅ test ✅ lint ✅ — final build ✅

## Merge Preview (from Step 2.5)
{predicted clean vs conflict, per feature — the order the merge actually followed}

## Evicted (not merged this round)
{feature → conflicting files, collided-with, essence, where the fix lives — or "none"}

## Hotfixes protected
{main-side [hotfix] commits, whether any feature conflicted with them, regression test status — or "none"}

## Cross-feature review
{findings and their resolution, or "no interaction issues"}

## Memory
{which per-feature learnings were merged}

## Next
/frame:ship (from integrate/{date}), then /frame:parallel stop <feature> for each participant.
```

(`mkdir -p .planning/reports/integration/{date}` first.)

### Step 8: Update board + STATE.md

- BOARD.md: integrated rows → `integrated`; evicted rows stay `evicted` (they re-enter next run); the `## Merge Preview` and `## Evictions` sections stay as the audit trail;
- `.planning/STATE.md` (main):
```markdown
## Current Position
- Phase: INTEGRATE
- Features: {list}
- Branch: integrate/{date}
- Status: COMPLETE — ready to ship
- Report: .planning/reports/integration/{date}/INTEGRATION.md
```

Final output: merged list, conflict summary, review verdict, then:
```
→ Run: /frame:ship — commit/PR from integrate/{date}
   After ship: /frame:parallel stop {feature} (each) to clean up worktrees
```

## Recovery: resuming after a mid-merge failure

When a previous run STOPped (gates red after some feature's merge), the repo is left on `integrate/{date}` with the green merges intact and STATE.md at `Phase: INTEGRATE, Status: IN_PROGRESS`. On the next `/frame:integrate` run, detect this in Step 0 (current branch matches `integrate/*`, or today's integration branch already exists) and instead of creating a new branch, ask **once**:

```
Found an unfinished integration on integrate/{date}: merged {list}, stopped at {feature}.
1) continue — merge the remaining ready features on top ({list})
2) retry {feature} — its worktree was fixed, merge it again
3) start fresh — abandon integrate/{date}, create integrate/{date}-2 from main
```

- **continue / retry**: verify the tree is clean (an unfinished `git merge` in progress → `git merge --abort` first), re-run gates on the current branch state to confirm it is still green, then resume the Step 4 loop with the remaining features. Already-merged features are never re-merged.
- **start fresh**: leave `integrate/{date}` as is (the user deletes it manually if unwanted), checkout main, proceed from Step 2 with a suffixed branch name.
- The failing feature itself is fixed **in its worktree** (`/frame:fix` or `/frame:build` there, then `/frame:review`), not on the integration branch — the integration branch only receives merges and small `fix(integrate):` commits.

## Rules

- **Main worktree, clean tree only** — never integrate on top of local noise
- **Predict before merging** — `git merge-tree` classifies clean vs conflict (Step 2.5); clean features merge first, conflicting ones one at a time
- **Gates after every merge** — failure must localize to one branch
- **Evict, don't abort the run** — a substantive conflict or persistently-red gate removes exactly that one branch (with an eviction record carrying files + essence back to its worktree); the rest still integrate
- **Hotfixes are protected** — main-side `[hotfix]` commits win conflicts by default; their regression tests are re-checked after any merge touching their files
- **Never auto-rollback green merges** — only the failing one, and only with user consent
- **Substantive conflicts go to the user** — with an explanation of which features collided and why
- **Cross-feature focus in review** — per-feature internals were already reviewed in worktrees
- **Memory merges here** — worktrees never write shared memory files
- **Checkpoint before anything** — `frame/checkpoint/integrate-{ts}`

## Result

- `integrate/{date}` branch with all ready features merged, gates green after each step
- Cross-feature review passed (or findings reported)
- Per-feature learnings merged into `.planning/memory/learnings.md`
- `.planning/reports/integration/{date}/INTEGRATION.md`
- BOARD.md and STATE.md updated — ready for `/frame:ship`
