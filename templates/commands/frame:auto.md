---
description: "Autopilot: run plan → build → review → fix → ship unattended after research — one confirmation up front, no questions until a local commit or a halt"
argument-hint: "<feature> [strict]"
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob, Task]
---
# /frame:auto -- Pipeline Autopilot

Takes a researched feature and drives it through the whole pipeline without you: **plan → build → review → (fix → re-review)×N → ship (local commit)**. You answer **one** consolidated question after the plan is generated; after that the pipeline runs unattended until it produces a local commit or hits a halt condition.

**What autopilot never does**: push, create a PR, auto-fix findings in sensitive areas (auth/money/core/migrations/routing), or improvise around an architectural mismatch. Those always come back to you.

### Routing

- `{feature}` — run the pipeline for a researched feature (research.md must exist)
- `{feature} strict` — use `/frame:review strict` (two-verdict adversarial loop) instead of the standard review in every review round

### Two landing modes

Where the flight ends depends on where it runs — detect once at preflight via `git rev-parse --git-common-dir`:

- **Main flight** (not a linked worktree) → full pipeline, lands at **SHIP: a local commit** (push/PR manual).
- **Worktree flight** (`--git-common-dir` contains `worktrees/`) → this feature is one of several being built in parallel. The flight lands at **review approve** and **skips SHIP**: `/frame:integrate` (run manually from main when the batch is ready) requires each worktree's STATE.md to read `Phase: REVIEW / Status: ready to ship` — running ship in the worktree would set `SHIP/Shipped` and fail integrate's readiness check. Merging the batch and the single final ship stay manual by design.

The parallel pattern end-to-end: `/frame:auto feature-1` in main; for every next feature just run `/frame:auto feature-N` from main again — preflight detects the busy tree, prepares the worktree itself, and hands off (`cd ../{project}-feature-N && claude` → `/frame:auto feature-N`). When all flights have landed — one `/frame:integrate` from main, then `/frame:ship` from the integration branch.

## How it executes phases

**This command adds no phase logic of its own.** Each phase is executed by **reading the installed command file and following its procedure exactly**:

| Phase | Procedure file |
|-------|----------------|
| PLAN | `.claude/commands/frame:plan.md` |
| BUILD | `.claude/commands/frame:build.md` |
| REVIEW | `.claude/commands/frame:review.md` |
| FIX | `.claude/commands/frame:fix.md` |
| SHIP | `.claude/commands/frame:ship.md` |

Those files stay the single source of truth. Each of them carries an **`## AUTO mode`** section describing how its interactive points behave when the autopilot marker is present — apply those overrides, nothing else changes.

**The autopilot marker.** While the pipeline runs, `$GIT_DIR/frame-autopilot` exists (where `GIT_DIR=$(git rev-parse --git-dir)`). It is the deterministic signal that (a) tells the phase commands to apply their AUTO overrides, and (b) lets the `auto-pilot.sh` Stop hook re-engage the pipeline if the session stops mid-flight. **Every exit path — finish or halt — must remove it.**

## Instructions

### Step 0: Preflight (interactive — autopilot not engaged yet)

1. **Resolve `{feature}`.** From args; if empty, from `.planning/STATE.md` `Feature:`. Still empty → **STOP**: "Usage: /frame:auto <feature>".

2. **Research gate.** `docs/specs/{feature}/research.md` must exist — else STOP: "No research.md for '{feature}'. Run /frame:research first — autopilot starts after research." If its `## Open Questions` has unanswered items → STOP and list them: research questions are yours to answer, autopilot does not guess.

3. **Busy-tree routing** — a new feature never squats on another feature's tree; when the tree is busy, the answer is *parallel*, not *stale-or-live*. Check two signals: the autopilot marker (`[ -f "$(git rev-parse --git-dir)/frame-autopilot" ]`) and STATE.md's `## Current Position` (`Status:` ending `IN_PROGRESS`/`FIX_IN_PROGRESS`). Route:

   - **STATE shows the *same* feature mid-pipeline** → this is a **resume**, not a new flight: skip the phases STATE.md already passed and continue from where it stands (a plan with `[DONE]` tasks re-enters build; `REVIEW_FAILED` re-enters fix). Announce what's being resumed.
   - **Marker exists** (a flight is live in this tree *right now*) → **no question**: prepare a worktree for the new feature (procedure below) and hand off. Announce: "flight {other} is live here — {feature} goes to its own worktree."
   - **No marker, but STATE shows a *different* feature mid-pipeline** (an interrupted flight or manual session — its done tasks are committed, so it is *resumable*, not garbage) → ask once, recommended option first:
     ```
     ⚠️ {other} is mid-pipeline in this tree (STATE.md: {phase} {task}/{total}; no live flight).
        1) Start {feature} in its own worktree — RECOMMENDED: main keeps {other} resumable (/frame:build {other} later)
        2) {other} is abandoned — take over main (allowed only if `git status --short` is clean; uncommitted changes belong to {other})
        3) Cancel
     ```
     Option 2 with a dirty tree → refuse and list the uncommitted files: they are {other}'s work; commit/stash/revert them first.

   **Worktree hand-off for a new feature** (pre-plan, so lighter than `/frame:parallel start` — no plan.md exists yet and none is needed here; the flight plans *inside* the worktree):
   ```bash
   git worktree add "../{project}-{feature}" -b "feature/{feature}"
   # docs/ is typically untracked — bring the research along and commit it in the worktree:
   mkdir -p "../{project}-{feature}/docs/specs"
   cp -R "docs/specs/{feature}" "../{project}-{feature}/docs/specs/"
   git -C "../{project}-{feature}" add "docs/specs/{feature}" && git -C "../{project}-{feature}" commit -m "docs({feature}): research"
   [ -f "../{project}-{feature}/.frame/config.json" ] || { mkdir -p "../{project}-{feature}/.frame"; cp .frame/config.json "../{project}-{feature}/.frame/" 2>/dev/null || true; }
   ```
   Register a board row if `.planning/BOARD.md` exists (`{feature} | active | ../{project}-{feature}`). Then **STOP** with the hand-off:
   > Worktree ready. → `cd ../{project}-{feature} && claude` → `/frame:auto {feature}`
   > (plan is created there; the flight lands integrate-ready — see "Two landing modes")

4. **Detect the landing mode** (see "Two landing modes"): `git rev-parse --git-common-dir` → main flight or worktree flight.

5. **Announce the flight plan** (one line):
   - main: `autopilot: {feature} — plan → build → review{ strict} → fix → ship (local commit). Max 3 review rounds. Halts on: sensitive fixes, wave failure, architectural deviation.`
   - worktree: `autopilot: {feature} — plan → build → review{ strict} → fix → LAND at review approve (then /frame:integrate from main). Max 3 review rounds.`

### Step 1: PLAN

**Skip if a ready plan exists**: `docs/specs/{feature}/plan.md` present with **zero** `[DONE]` tasks and no `WAVE_FAILED`/`REVIEW_FAILED` in STATE.md for this feature → announce `plan.md found — skipping PLAN` and go straight to Step 2. This is the normal entry for a worktree flight handed off by a Case C halt (the plan was made in the main session and copied over by `/frame:parallel start`).

Otherwise execute the `/frame:plan {feature}` procedure (AUTO overrides apply: re-plan-remainder is the default for a partially done plan; ambiguity that standalone plan would resolve by asking → halt instead).

- Plan blockers survive the devil's-advocate loop (2 iterations) → **HALT** (see Halt protocol).
- On success: plan.md exists with waves, `Coverage` table, `Verification:` per task.

### Step 2: The one confirmation gate

This is the **only question** of the flight. Read the fresh plan.md and present a compact briefing:

```
Autopilot briefing — {feature}
| Item | Value |
|------|-------|
| Tasks / waves       | {N} tasks in {M} waves ({K} parallel) |
| Files touched       | {count} ({top-level dirs}) |
| Risk: high tasks    | {list with one-line why, or "none"} |
| Sensitive areas     | {plan files matching auth/money/core/migrations/routing, or "none"} |
| Parallel overlap    | {plan Touched Files ∩ other active features' Touched Files, or "none"} |
| Review mode         | standard | strict |
| Review rounds cap   | 3 |
| End state           | main: local commit — push/PR manual | worktree: review approve — /frame:integrate manual |

After "go" there are no more questions until commit or halt.
High-risk tasks listed above count as confirmed. Proceed? [go / abort / hold <task ids>]
```

**Parallel overlap row** — the pre-plan hand-off skips `/frame:parallel start`'s file-overlap check (no plan existed yet), so run it here, now that the plan exists. Compare this plan's `## Touched Files` against every *other* active feature's file list from the board's `## Touched Files (cache)` section. From inside a worktree, the live board is in the **main** tree, not the worktree copy:
```bash
MAIN_ROOT=$(dirname "$(git rev-parse --git-common-dir)")   # == project root in main; equals cwd when not in a worktree
grep -A 50 "## Touched Files (cache)" "$MAIN_ROOT/.planning/BOARD.md" 2>/dev/null
```
No board / no other active features / no intersection → `none`. Intersection found → list `{file} ↔ {feature}` in the row; it does not block (integrate's merge-tree prediction and hotfix protection catch real collisions at merge time), but the user may prefer `abort` and sequencing the features instead — that's exactly what this one question is for.

- **go** → all `Risk: high` tasks are pre-confirmed for BUILD (its Step 4 up-front confirmation and the Risk-Strategy per-task wait are both satisfied by this gate). Engage autopilot:
  ```bash
  printf 'feature=%s\nround=0\nreview=%s\n' "{feature}" "{standard|strict}" > "$(git rev-parse --git-dir)/frame-autopilot"
  rm -f "$(git rev-parse --git-dir)/frame-autopilot-nudges"
  ```
- **hold {ids}** → mark those tasks as excluded, re-show the briefing (they'll stay unbuilt; the plan keeps them for a manual pass).
- **abort** → stop; plan.md remains for a manual `/frame:build`.

### Step 3: BUILD

Execute the `/frame:build {feature}` procedure with its AUTO overrides:

- High-risk tasks: pre-confirmed at Step 2 — no re-ask.
- Another feature already in flight (build Step 0, Case C): build's AUTO override **prepares the worktree for `{feature}` itself** (overlap check → worktree + `feature/{feature}` branch → context copy → board row), then the flight halts with the exact hand-off:
  ```
  ⛔ AUTOPILOT HALT: {other} is mid-flight in this tree. Worktree for {feature} is ready.
  → cd ../{project}-{feature} && claude → /frame:auto {feature}
  (plan.md is already done — the new flight picks it up and goes straight to its briefing gate)
  ```
  Autopilot cannot follow the work into another terminal — but it leaves everything one command away.
- `Status: WAVE_FAILED` or `[BLOCKED]` tasks remaining → **HALT** with the failure report build produced.
- Architectural/contract deviation (build's deviation protocol) → **HALT**: the plan needs human-approved revision.

On `Status: COMPLETE` → heartbeat `autopilot: build green ({done}/{total} tasks) → review round 1` → Step 4.

### Step 4: REVIEW (round R of max 3)

Increment `round=` in the marker file. Execute the `/frame:review` procedure (or `/frame:review strict` if the strict flag was given) — unchanged; review has no interactive points on the happy path.

- **approve** (`ready to ship`) → main flight: Step 6 (SHIP); **worktree flight: LAND here** — go to Step 7 with the worktree finish report (STATE.md stays `Phase: REVIEW / Status: ready to ship`, exactly what `/frame:integrate` requires — do **not** run ship).
- **REVIEW_FAILED (automated)** — gates that were green at the end of build now fail → **HALT** (something outside the pipeline moved; a human should look).
- **request changes** → Step 5 (FIX), same round.
- Review cannot determine a base / empty diff → **HALT**.
- `strict` escalation after its 3 internal rounds → **HALT** with the agreement table.

### Step 5: FIX (same round)

**Sensitive screen first — before any fixer is spawned.** Scan the confirmed FAIL findings exactly like `/frame:fix` Step 3 (CRITICAL or HIGH touching core/auth/money/migrations/routing). Any match → **HALT**:

```
AUTOPILOT HALT: {n} finding(s) touch sensitive areas: {ids + files}.
Autopilot does not auto-fix auth/money/core/migrations/routing.
→ Run /frame:fix {feature} yourself to confirm them interactively.
```

These findings were unknown at the Step 2 gate, so they were never confirmed — the conservative default is to stop, not to guess.

No sensitive findings → execute the `/frame:fix` procedure with its AUTO override (Step 3 confirmation is satisfied by this screen). Then route on its outcome:

- **`ready to ship`** (all findings RESOLVED) →
  - plan SIZE is **large**, or the review diff was sharded (>800 lines), or `strict` → the fixes deserve fresh eyes: go to **Step 4, next round** (full review of the post-fix state).
  - otherwise → trust fix's scoped re-review (that is its contract) → main flight: Step 6 (SHIP); worktree flight: **LAND** (Step 7, worktree report) — but first restore STATE.md to `Phase: REVIEW / Status: Review complete, ready to ship` if fix left anything else, so `/frame:integrate` readiness holds.
- **`REVIEW_FAILED` with `Remaining:`** (STILL_OPEN / FAILED / BLOCKED findings) → **HALT**: fix already retried and re-reviewed; what's left needs manual attention or `/frame:build` fix-mode — autopilot re-running the same fixers would loop.

**Round cap:** entering Step 4 with `round=3` already spent → **HALT**: "3 review rounds without approve. Open findings: {ids}." Show the round history table (round → verdict → fixed ids).

### Step 6: SHIP (main flights only — local commit)

**Worktree flights never reach this step** — they landed at Step 4/5 (review approve). Running ship in a worktree would set `Phase: SHIP / Status: Shipped` in its STATE.md and fail `/frame:integrate`'s readiness check.

Execute the `/frame:ship` procedure with its AUTO overrides: readiness passport + commit as normal; **push (Step 5) and PR (Step 6) are skipped** — reported as manual follow-ups.

- Passport verdict **NOT READY** → **HALT** with the failing rows.

### Step 7: Finish

```bash
rm -f "$(git rev-parse --git-dir)/frame-autopilot" "$(git rev-parse --git-dir)/frame-autopilot-nudges"
```

Final report — **main flight**:

```
✅ Autopilot complete — {feature}
| Phase | Result |
|-------|--------|
| Plan   | {N} tasks / {M} waves |
| Build  | {done}/{total}, gates green |
| Review | approve (round {R}; {X} findings fixed, {Y} deferred WARN) |
| Ship   | commit {hash} on {branch} |
Manual follow-ups: git push, PR (/frame:ship resumes there), deferred WARNs in review.md.
```

Final report — **worktree flight** (landed at review approve):

```
✅ Autopilot landed — {feature} (worktree, branch feature/{feature})
| Phase | Result |
|-------|--------|
| Plan   | {N} tasks / {M} waves |
| Build  | {done}/{total}, gates green |
| Review | approve (round {R}; {X} findings fixed, {Y} deferred WARN) |
| Ship   | skipped — parallel feature, merges via integrate |
Ready for integration. When the batch is done: /frame:integrate from main, then /frame:ship
from the integration branch. Board: /frame:parallel status.
```

---

## Halt protocol (every ⛔ above)

1. **Remove the marker**: `rm -f "$(git rev-parse --git-dir)/frame-autopilot" "$(git rev-parse --git-dir)/frame-autopilot-nudges"` — the Stop hook must not re-engage a halted flight.
2. **Leave STATE.md exactly as the phase command wrote it** (`WAVE_FAILED`, `REVIEW_FAILED`, …) — those values are what the manual commands key off; autopilot invents no states of its own.
3. **Report**: `⛔ AUTOPILOT HALT at {phase}: {reason}` + the phase's own failure output + the exact next command for the human (`/frame:fix`, `/frame:build`, `/frame:plan` re-plan, …).

A halt is not a failure of the run — it is the pipeline handing back a decision that is yours to make. Everything up to the halt is committed/checkpointed by the phase commands as usual; resuming manually continues from disk state.

## Rules

- **One question per flight** — everything interactive is front-loaded into the Step 2 briefing; after "go", the only outcomes are a landing (main: local commit; worktree: review approve) or a halt
- **No phase logic here** — phases run by reading and executing the installed `frame:*.md` files; AUTO overrides live in those files, next to the steps they modify
- **Marker discipline** — `$GIT_DIR/frame-autopilot` exists exactly while a flight is live; every exit path removes it
- **Sensitive findings always halt** — auth/money/core/migrations/routing fixes are never applied unattended
- **Max 3 review rounds** — then halt with the round history; no infinite fix↔review ping-pong
- **Never push, never PR, never integrate** — a main flight ends at a local commit; merging parallel features (`/frame:integrate`) and the batch's final ship stay manual
- **Halts preserve state** — STATE.md keeps the phase command's status; manual pipeline commands pick up from there
- **Worktree flights land at review approve** — never run ship in a worktree (`/frame:integrate` requires `Phase: REVIEW / ready to ship` there); Case C prepares the new feature's worktree and hands off `cd … && /frame:auto {feature}`
- **Side quests never touch a live flight's tree** — `/frame:fast` and `/frame:debug` detect the autopilot marker and route themselves into a `hotfix/{slug}` worktree; those branches merge first in `/frame:integrate`
- **Busy tree → parallel, not takeover** — preflight routes a new feature into its own worktree (automatically when a flight is live; recommended option otherwise); "take over main" is an explicit user choice and requires a clean tree; the same feature mid-pipeline means resume, not re-plan

## When to Use

- research.md is done, Open Questions are closed, and the feature is small/standard — you want it built while you do something else
- **Not for**: unresearched ideas (run `/frame:research`), trivial one-liners (`/frame:fast`), features you expect to steer mid-build (run the phases manually)

## Result

- plan.md → built feature → passed review → fixed findings → landed, unattended after one confirmation
- Main flight: local commit + readiness passport; push/PR left for the user
- Worktree flight: feature branch at `Phase: REVIEW / ready to ship` — integrate-ready; batch merge via `/frame:integrate` from main
- On halt: exact phase, reason, and the manual command to continue with
