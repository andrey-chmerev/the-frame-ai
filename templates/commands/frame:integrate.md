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

### Step 3: Merge order

Sort the ready branches:
1. features whose Touched Files overlap **nothing else** first;
2. then by ascending diff size (`git diff main...feature/{name} --shortstat`);
3. overlapping/large ones last — by then most context is already merged.

Show the planned order before starting.

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
- Substantive (same function/logic changed by two features) — STOP and show the user: which two features collided, in which file, both intents; resolve together, then continue.

**Even without textual conflicts**: if the merged feature touched a protected hotfix's files, git may have auto-merged a semantic revert (e.g. the feature rewrote the function from a pre-fix version). The full test run below catches this via the hotfix's regression test — if exactly that test fails, report it as "feature {name} undoes hotfix {commit}: {description}", fix by re-applying the hotfix logic on top, and re-run gates.

**After every merge — full quality gates**:
```bash
{quality.commands.typecheck}
{quality.commands.test}
{quality.commands.lint}
```

Gates failed → attempt a fix (max 2 iterations, commit as `fix(integrate): {what}`). Still red → STOP:
```
❌ Integration stopped at feature/{name} — gates fail after its merge.
   Failure: {summary}
   Merged so far: {list}. To undo just this branch: git reset --hard HEAD~1
   (checkpoint tag: frame/checkpoint/integrate-{ts})
```
Do NOT auto-rollback previous, green merges.

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

- BOARD.md: integrated rows → `integrated`;
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
- **Gates after every merge** — failure must localize to one branch
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
