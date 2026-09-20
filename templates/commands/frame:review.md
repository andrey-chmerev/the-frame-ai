---
description: "Code review: completion check, automated gates, artifact check against the spec's Evidence list, parallel reviewer panel with verification pass"
argument-hint: "[audit | strict]"
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob, Task]
---
# /frame:review -- Code Review

Full review of the current feature. Validates completion against spec/plan, runs quality gates, **collects the spec's `## Evidence` items as real artifacts** (screenshots, command output, generated files) and checks their content against the spec, runs a parallel panel of reviewers across 6 dimensions, adversarially verifies FAIL findings, then produces a review report. The review answers two questions, not one: *is the code correct?* (gates + panel) and *did it produce the result the spec describes?* (artifact check).

### Routing

- (no args) — standard review for a feature built via `/frame:build`
- `audit` — review mode after `/frame:build` on an audit plan: traces findings closed, not R/AC
- `strict` — adversarial two-verdict loop: two independent verdicts must both PASS; on FAIL, fix only what's flagged and re-review with **fresh** reviewers, max 3 rounds, then escalate (see "Mode: review strict")

## Instructions

### Step 0: STATE.md + determine scope + launch gates

Update `.planning/STATE.md`:
```markdown
## Current Position
- Phase: REVIEW
- Status: IN_PROGRESS
- Started: {timestamp}
```

Determine diff scope. The build checkpoint tag for **this feature** is authoritative; the merge-base fallback uses the project's default branch (not hard-coded `main`).
```bash
# 1) This feature's build checkpoint — the tag /frame:build creates. Authoritative when building in the
#    default branch, where merge-base HEAD <default> == HEAD → empty diff.
BASE=$(git tag -l "frame/checkpoint/build-{feature}-*" --sort=-creatordate | head -1)
# 2) Fallback: merge-base with the repo's default branch (detected from git, not hard-coded to main).
if [ -z "$BASE" ]; then
  DEFAULT_BRANCH=$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's#^origin/##')
  [ -z "$DEFAULT_BRANCH" ] && DEFAULT_BRANCH=main
  BASE=$(git merge-base HEAD "$DEFAULT_BRANCH" 2>/dev/null)
fi
# NOTE: do NOT fall back to a build-* tag of another feature — with parallel work that tag can belong to a
# different feature and would pull its commits into this diff. If BASE is still empty, STOP.
if [ -z "$BASE" ]; then
  echo "Cannot determine review base for feature {feature}. No build checkpoint tag and no merge-base."
  echo "Ask the user for an explicit base commit, then re-run."
  exit 1
fi
git diff "${BASE}"..HEAD --stat
```

If the diff is empty, do not run the panel on nothing — STOP and report: "No diff between {BASE} and HEAD. Is the feature built and committed?"

**Write the diff once to a file** so panel agents read it from disk instead of it being inlined into six prompts:
```bash
mkdir -p docs/specs/{feature}
git diff "${BASE}"..HEAD > docs/specs/{feature}/review-diff.patch
DIFF_LINES=$(wc -l < docs/specs/{feature}/review-diff.patch)
```
Panel and verification agents receive the **path** `docs/specs/{feature}/review-diff.patch` (+ `$BASE`), not the inline diff.

**Launch the automated gates now, detached**, so they run while you do the LLM-only completion check (Step 1). They are independent of Step 1 and are the slow part. Use a **detached** background run (the Bash tool's `run_in_background`, or `nohup … &`) — Step 2 reads the result from files, not from a shell `wait` (the collection runs in a separate shell, so the job must survive this shell exiting):
```bash
# Detached; captures combined output and the exit status into files for Step 2 to poll.
rm -f docs/specs/{feature}/review-gates.status
nohup sh -c '{ {quality.commands.typecheck} && {quality.commands.test} && {quality.commands.lint} && {quality.commands.build} ; } \
    > docs/specs/{feature}/review-gates.log 2>&1 ; echo $? > docs/specs/{feature}/review-gates.status' >/dev/null 2>&1 &
```

Store `$BASE`, the diff path, and `$DIFF_LINES` for use in Steps 1–4.

### Step 1: Completion check

#### 1a: Plan tasks

Read `docs/specs/{feature}/plan.md`. Verify all tasks marked `[DONE]`:
```bash
grep "^### Task" docs/specs/{feature}/plan.md | grep -v "\[DONE\]"
# Must return empty
```

If any tasks not `[DONE]` → **STOP**: "Build is not complete. Run /frame:build first."

#### 1b: Re-run Verification commands (only those not covered by the gates)

For each task in plan.md with a `Verification:` field — re-run **only** the commands the Step 2 gates do not already subsume. A `Verification:` that is just `npm test`-style (the test/typecheck/lint/build gate) is already covered — skip it. Re-run the rest: curl/HTTP checks, migrations, CLI scenarios, one-off scripts. This avoids a full second test run.

#### 1c: Requirements traceability (delegated to the panel reviewer)

> Skip this step in `audit` mode (no R/AC numbers) — jump to Step 1d.

The R{n}/AC{n} → code coverage table is produced by the **panel `reviewer` agent** in Step 3 (Spec Compliance is its job, and it already reads the diff), not here — building it twice, once serially and once in the panel, is wasted work. Here in Step 1c just note the requirement of the coverage table so Step 5 can slot the reviewer's table into the report, and record any **MISSING** the reviewer returns as a Critical finding: "Requirement {id} not implemented."

The reviewer returns the table in this shape:
```markdown
| Requirement | Status | Evidence |
|-------------|--------|----------|
| R1          | DONE   | src/api/users.ts:42, users.test.ts:15 |
| AC3         | MISSING | — |
```

#### 1d: Scope creep check

Files in `git diff ${BASE}..HEAD` not mentioned in any plan.md task → WARN: "Files changed outside task scope: {list}".

### Step 2: Collect automated gate results

The gates were launched detached in Step 0 and ran while you did Step 1. Poll for the status file (written when they finish), then read the result:
```bash
# Wait for the detached job to write its status file (it ran in another shell — poll, don't `wait`).
for i in $(seq 1 600); do
  [ -f docs/specs/{feature}/review-gates.status ] && break
  sleep 2
done
GATE_STATUS=$(cat docs/specs/{feature}/review-gates.status 2>/dev/null)
[ "$GATE_STATUS" != "0" ] && cat docs/specs/{feature}/review-gates.log
```

**D-step**: `GATE_STATUS` must be `0`. If not — update STATE.md `Status: REVIEW_FAILED (automated)`, show the failing output from `review-gates.log`, stop. Do **not** launch the panel on code that fails the gates.

**Heartbeat**: "Automated checks passed — collecting evidence..."

### Step 2.5: Artifact check — prove the result, not the diff

Green gates prove the code runs; they do not prove the feature produced what the spec describes. Size, duration, score and tests can all be right while the caption belongs to the wrong episode. This step opens the result the way a user would — runs the app, looks at the screen, reads the generated file — **before** the panel spends tokens on the diff.

**Read `## Evidence` from `docs/specs/{feature}/spec.md`.**
- Section present with items (`E1.`, `E2.`, …) → collect them (below).
- Section **missing** (a spec written before Evidence existed) → derive the items now from `## Acceptance Criteria` + `## Behavior`: one observable, content-checked proof per AC, in the same `E{n}.` format. Append them to spec.md under `## Evidence` with the comment `<!-- derived by /frame:review {date} — spec predates Evidence -->`, announce it in one line, and continue. This is a compatibility path, not the norm — `/frame:plan` owns Evidence.
- Section present but **empty** → the plan was not ready. Update STATE.md `Status: REVIEW_FAILED (evidence)` (block below, `Critical Issues: 0`), report "spec.md `## Evidence` is empty — fill it (E1, E2, …; see /frame:plan Step A8) before review can verify the result", stop.

**Collect every item.** Items are collected **sequentially** — they usually share one dev server, simulator or output directory. ≤3 items → the orchestrator collects them inline. More → delegate the whole list to **one `builder` subagent in evidence mode** (it may start the app, run commands, take screenshots and read files; it writes **only** under `docs/specs/{feature}/evidence/`, never touches source, plan.md, review.md or STATE.md, and returns its table as text). Either way, per item:

| Item kind | How to obtain the artifact | Saved as |
|-----------|----------------------------|----------|
| screenshot (UI) | start the dev server from `.frame/config.json` `devServer` if it is not running; `browser_navigate` + `browser_take_screenshot` (Playwright MCP, as in `/frame:verify-ui`); native apps: `xcrun simctl io booted screenshot`, or the platform's screenshot tool | `evidence/E{n}-{slug}.png` |
| command output | run the exact command on the exact input the item names: `{cmd} > docs/specs/{feature}/evidence/E{n}-{slug}.log 2>&1` | `evidence/E{n}-{slug}.log` |
| generated file | open the file the item names; store the relevant fragment (`sed -n`, `head`, `jq`, `ffprobe -show_format`, …) — copy the whole file only when it is small | `evidence/E{n}-{slug}.txt` (or a copy) |
| `manual:` | do not collect. Record `manual` — `/frame:test-plan` puts it on the human checklist and `/frame:ship` requires it confirmed | — |

Then **compare by content**. The artifact must contain what the item says it contains — the words on the screen, the lines in the output, the fields in the file. Existence, size, duration, exit code or a score are **not** a match on their own; if an item only names such a metric, say so in the `Note` column and check the visible content anyway. Verdict per item:
- `yes` — the artifact shows exactly what the spec says
- `no` — artifact obtained, content differs (say how: "first cue is episode 11's opening line")
- `missing` — could not obtain it (app failed to start, command errored, file absent) — the stderr goes into the artifact log
- `manual` — pending human confirmation

```bash
mkdir -p docs/specs/{feature}/evidence
```

Write `docs/specs/{feature}/evidence.md`:
```markdown
# Evidence: {Feature}
Date: {date}
Commit: {git rev-parse --short HEAD}

| # | Evidence item (from spec) | Artifact | Matches spec | Note |
|---|---------------------------|----------|--------------|------|
| E1 | Screenshot of /settings after saving name "Ann" → header shows "Ann" | evidence/E1-settings.png | yes | — |
| E2 | `cli export --episode 12` writes out/12.srt whose first cue is "Welcome back to…" | evidence/E2-export.log, evidence/E2-12.srt.txt | no | first cue is episode 11's opening line |
| E3 | manual: rendered video plays with captions in sync | — | manual | pending — /frame:test-plan |

Result: {N} yes, {M} no, {K} missing, {J} manual
```

**D-step**: no row may read `no` or `missing`. If any does — the same rule as red gates: the panel does **not** run.

STATE.md:
```markdown
## Current Position
- Phase: BUILD
- Feature: {feature}
- Status: REVIEW_FAILED (evidence)
- Review: docs/specs/{feature}/review.md
- Evidence: docs/specs/{feature}/evidence.md
- Critical Issues: {count of no + missing}
```

Write `docs/specs/{feature}/review.md` in the Step 5 shape with **one finding per failed row**, so `/frame:fix` picks them up unchanged:
- `Severity: HIGH` (CRITICAL if the wrong content reaches an end user or persists data)
- `Class: technical` — a result the spec describes did not appear; `product` only when the evidence item itself turns out to be ambiguous (then write the question in `Decision needed`)
- `Source: evidence`
- `File:` the module that produces the artifact — locate it through the diff (`review-diff.patch`) and the code path behind the command/screen
- `Evidence:` the artifact path + what it shows vs. what the spec says
- `Verified: yes` — direct observation, no refute pass needed
- `Fix:` the approach
- `## Automated Checks`: as collected in Step 2. `## Panel Verdicts`: `not run — evidence failed`. `## Recommendation`: request changes.

Report `❌ Review failed at artifact check: {M+K} evidence item(s) do not match the spec — docs/specs/{feature}/evidence.md`, then continue into the fixes exactly as Step 6's "request changes" branch says: `/frame:fix` closes the `Source: evidence` findings, re-collects those items, and — because the panel never ran — re-enters this review from Step 0.

**Heartbeat**: "Evidence: {N}/{total} match, {J} manual — launching reviewer panel..."

### Step 3: Parallel reviewer panel

> **Small diff rule**: if `$DIFF_LINES` < 50, collapse to 3 agents: reviewer + security + tests-reviewer.
>
> **Large diff rule**: if `$DIFF_LINES` > 800, do not hand every agent the whole patch — they drown and quality drops. Shard by top-level directory/file group: give each panel agent the file list + only the diff hunks for its shard, and note in the report which shards each agent covered. If the diff is huge because several features are bundled, warn the user that reviewing per-feature is more reliable.

Launch all panel agents in one message (parallel). Each receives:
- The **path** to the diff file: `docs/specs/{feature}/review-diff.patch` (+ `$BASE`) — the agent reads it with Read/Bash; the diff is **not** inlined into the prompt
- Path to spec.md
- The **path** to `docs/specs/{feature}/evidence.md` (Step 2.5) — what the feature actually produced; the `reviewer` cites its rows (`evidence.md E2`) in the R/AC coverage table, `devils-advocate` uses the artifacts to ground edge-case claims in observed behaviour
- Their specific brief (see below)
- Instruction: run in **Panel Mode** (diff-scoped, read-only); return verdict `PASS | WARN | FAIL` + findings in the universal schema as final text (including `Class: technical | product` — see Step 3.6); do NOT run the gates again (already green); do NOT write files; do NOT write STATE.md

| Agent | Model | Role | Focus |
|-------|-------|------|-------|
| reviewer | sonnet | Spec compliance | requirements met (produce the R/AC coverage table), no scope creep, architecture matches plan |
| security | sonnet | Security | OWASP issues in the diff only; see security agent's panel brief |
| performance-auditor | sonnet | Performance | N+1, leaks, blocking calls in the diff; **skip stack research/WebSearch** — see panel brief |
| devils-advocate | sonnet | Business logic | edge cases, error paths, race conditions, money/data logic |
| tests-reviewer | sonnet | Test quality | coverage, meaningful assertions, error paths tested |
| conventions-reviewer | sonnet | Conventions | naming, types, dead code, style rules |

> **Panel runs on sonnet.** The panel waits on its slowest member, so use sonnet for all six (the `reviewer` agent defaults to opus for standalone/strict use — override it to sonnet in the panel). Reserve opus for `strict` mode below.

**What NOT to report (all agents)**:
- Pre-existing issues outside the diff
- Style preferences without a rule in conventions.md
- Theoretical DoS without a concrete reproduction in the diff
- Micro-perf without a measurable impact

### Step 3.5: Deduplicate panel findings

The panel dimensions overlap — security and devils-advocate both surface XSS/injection/races; performance and devils-advocate both surface hot-path issues. Before verifying, collapse duplicates so the same defect is not verified twice and does not land in `/frame:fix` twice (same pattern as `/frame:audit` Step 4):
- Group findings by `file:line` (and by shared root cause when the line differs slightly).
- Keep one canonical finding per group; merge severity to the **highest** and union the evidence.
- **Union the `Source` field** — the canonical finding lists every panel agent that raised it (e.g. a shared XSS from security + devils-advocate → `Source: security, devils-advocate`). `/frame:fix` Step 7 routes its scoped re-review by this field, so it must survive the merge.
- Assign the final `REV-N` IDs after dedup, so IDs are stable for Step 5 and `/frame:fix`.

### Step 3.6: Classify every finding — technical or product

`Class` decides who closes the finding, so it is set here, once, on the merged findings — `/frame:fix` and `/frame:auto` both route on it and never re-litigate it.

- **`Class: technical`** — the correct fix is derivable from the code, the contracts, the conventions or the requirement already agreed in research. Layering, contracts, algorithms, error handling, races, naming, tests, *how* a security control is implemented, performance, dependency choice. `Decision needed: none`.
- **`Class: product`** — closing it needs intent the repo does not carry: which business rule applies, scope, policy, money semantics, who may access what, UX and copy, legal/retention. Write the exact question in `Decision needed`, with the options the code allows.

**The file is not the classifier.** A finding in `auth/`, `billing/`, `migrations/` or the router is technical whenever there is one right answer in the code — a wrong hash, a leaked token, a missing index, an unhandled rollback. It is product only when a human choice changes the outcome ("which roles may refund an order", "should an expired trial keep read access").

**Workarounds are findings.** If the diff solves a problem by silencing it — a swallowed error, `any`/`@ts-ignore`/`eslint-disable` in place of a real type or contract, a `sleep` instead of synchronisation, a duplicated block instead of the existing abstraction, a hard-coded value that belongs in config, a test weakened to pass — raise it as a finding (`Class: technical`, severity by blast radius) with the architectural fix in `Fix`. FRAME's standard is the root cause, not the quiet symptom.

### Step 4: Verification pass

Verify **FAIL** findings adversarially, in parallel — launch `devils-advocate` subagents in refute mode, **batches of ≤5** (same pattern as `/frame:audit` Step 3). Each subagent receives one finding **`file:line` + the finding details** (not the file content pasted inline — the agent has Read/Grep and reads the file itself, so it also sees surrounding functions and call sites and can refute more accurately). It tries to refute it:
- Is there validation higher in the stack?
- Is the condition reachable?
- Is this a test/example file?
- Output: `{ refuted: boolean, reason: string }` — default `refuted: false` unless there is concrete evidence.

Then:
- **Not refuted** → `Verified: yes` — confirmed FAIL
- **Refuted** → downgrade to WARN with note `unverified — see Appendix`

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

## Evidence
{N}/{total} items match the spec — docs/specs/{feature}/evidence.md
{J} manual item(s) pending human confirmation: E3 … → /frame:test-plan, confirm before ship (or "none")

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
- **Class**: technical | product
- **Confidence**: 1–10
- **File**: path/to/file.ts:{line}
- **Source**: {who raised it — reviewer | security | performance-auditor | devils-advocate | tests-reviewer | conventions-reviewer | evidence (Step 2.5 artifact check); after dedup this may list several}
- **Claim**: {what is wrong}
- **Evidence**: {code quote}
- **Impact**: {what happens}
- **Fix**: {approach}
- **Effort**: XS | S | M | L
- **Decision needed**: {product findings only — the exact question and the options the code allows; `none` for technical}
- **Verified**: yes | no | refuted

...

## Recommendation
approve | request changes

## Action Items
{Human-facing navigation for each confirmed FAIL finding — numbered, actionable, carrying File + Effort. **Not the machine source of truth**: `/frame:fix` selects and groups from the `## Findings` section (it has `Verified`, `Source`, `Effort`, `Evidence`), and treats Action Items only as a readable index. Editing an Action Item alone will not change what `/frame:fix` acts on — strike the finding in `## Findings` too.}
1. [REV-1] Fix {issue} in {file}:{line}
2. ...

## Deferred (WARN — non-blocking)
{WARN findings that don't block ship but shouldn't vanish. `/frame:retrospective` reads this to track accepted debt.}
- [REV-4] {issue} in {file}:{line} — {why deferred, not blocking}

## Appendix: Refuted Findings
{FAIL findings the verification pass refuted, kept for transparency. Not in Action Items.}
- [REV-x] {claim} — refuted: {reason from verifier}

## Memory Updates
- learnings.md Anti-Patterns: {to add if a problem found, else "none"}
- learnings.md Patterns: {confirmed good pattern, else "none"}
- backlog/learnings: {carry Deferred WARN items forward, else "none"}
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
✅ Review passed. {N} warnings (non-blocking). Evidence: {yes}/{total} match, {J} manual pending.
   → /frame:ship (or /frame:test-plan first for a manual checklist)
   {if J > 0: "→ /frame:test-plan — {J} manual evidence item(s) must be confirmed before ship"}
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
❌ Review failed. {N} confirmed findings ({T} technical, {P} product).
   Fixes: docs/specs/{feature}/review.md → Action Items
```

**Then continue into the fixes yourself — do not hand the user a command to retype.** Findings are not a stopping point; a review that found technical defects has also found their fixes:

- **All confirmed findings are `Class: technical`** → announce one line (`→ continuing into /frame:fix ({N} technical findings)`) and execute the `/frame:fix {feature}` procedure now, in this session. For large or cross-cutting architectural rework, run `/frame:build` fix-mode instead — same automatic continuation, different procedure.
- **Any `Class: product` finding** → fix the technical ones first (same continuation), then stop and put the product decisions to the user with their `Decision needed` text.
- **Exceptions** — `review audit` mode (reporting only) and an explicit "review only" from the user: report and stop.

---

## Mode: review audit

Triggered by: `/frame:review audit` (or auto-detected when feature name starts with `audit-`).

Difference from standard review:
- **Step 1c**: instead of R/AC traceability, trace each `Findings:` ID from plan.md tasks → verify the fix is in the diff (read the file at the patched location). The panel `reviewer` does not build an R/AC table in audit mode.
- **Step 2.5**: the audit spec's `## Evidence` is one item per finding ("the reproduction no longer occurs"). If the audit spec has none, derive exactly that: re-run each finding's reproduction (command / screen from AUDIT.md `Evidence`) and record it as `E{n}`.
- **Step 3**: launch only the panel categories whose findings were being fixed (e.g., if only SEC and LOGIC findings were fixed, run only security + devils-advocate + reviewer)
- **Report**: "Closed {N} of {M} findings. Remaining: {list}" — if all closed, ship is open

---

## Mode: review strict

Triggered by: `/frame:review strict`. For high-stakes changes where a single review pass isn't enough. Runs Steps 0–2.5 exactly as standard (gates **and** the artifact check must pass first), then replaces Steps 3–6 with an adversarial **two-verdict loop**.

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
2. Fix **only** the confirmed findings from this round. **The panel and the orchestrator never edit code** — delegate the fix to a `builder` subagent via Task (same contract as `/frame:build` fix-mode): pass it the confirmed findings + their `file:line`, and instruct it to change **only** what each finding flags. **No drive-by changes** — touching anything not flagged invalidates the round and restarts it. Record each fix against its finding ID.
3. Re-run automated gates (foreground here — the fix just landed): all must pass before re-review.
4. **Re-review with FRESH reviewers** — spawn new agent instances for Group A and Group B that receive only the *new* diff (regenerate `review-diff.patch` from `$BASE`) and the spec, with **no memory of previous rounds or of having approved anything**. This removes "I already blessed this" bias — the single most important property of the loop.
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

- **Every finding carries `Class`** — technical (the code answers it) or product (a human decision changes the outcome); the file it lives in never decides this
- **Findings continue into fixes** — a `request changes` verdict runs `/frame:fix` (or `/frame:build` fix-mode) in the same session for the technical findings; only product decisions come back to the user
- **Workarounds are defects** — a silenced symptom in the diff is a finding, with the architectural fix written in `Fix`
- **Completion before review** — if build is not done, stop at Step 1a
- **Gates run in the background** — launched in Step 0, collected in Step 2; the panel never runs the gates again
- **Result before panel** — Step 2.5 collects every `## Evidence` item as a real artifact into `docs/specs/{feature}/evidence/` and compares it **by content** with the spec; any `no`/`missing` → `REVIEW_FAILED (evidence)`, no panel, one `Source: evidence` finding per failed item for `/frame:fix`
- **Evidence lives in the repo** — `evidence.md` and `evidence/` stay in `docs/specs/{feature}/` and ship with the feature; `manual:` items are pending until a human confirms them (`/frame:test-plan` → `/frame:ship`)
- **Diff on disk** — written once to `review-diff.patch`; panel and verifier agents read the path, never receive the diff inlined
- **Evidence required** — every panel finding must have a code quote
- **Deduplicate before verifying** — Step 3.5 collapses overlapping findings by file:line before Step 4
- **Adversarial verification** — all FAIL findings go through Step 4; verifiers get file:line and read the file themselves
- **Small diff scales down / large diff shards** — <50 lines → 3-agent panel; >800 lines → shard by directory
- **Panel agents are read-only, Panel Mode** — diff-scoped, return findings as text, do not run gates, do not write files or STATE.md
- **Nobody edits code from review except a delegated builder** — standard mode reports; strict mode fixes via a `builder` subagent, never the orchestrator or panel
- **Strict mode = fresh reviewers each round** — re-reviews spawn new agents with no memory of prior approval; both verdict groups must PASS in the same round; fix only what's flagged; escalate after 3 rounds

## Result

- Completion verified (all tasks done, all requirements traced)
- Automated checks passed
- Every `## Evidence` item collected as an artifact and content-checked — `docs/specs/{feature}/evidence.md` + `evidence/`
- Parallel reviewer panel run (with evidence.md in context)
- FAIL findings adversarially verified
- Review report at `docs/specs/{feature}/review.md`
- `.planning/STATE.md` updated with approve, `REVIEW_FAILED`, `REVIEW_FAILED (automated)` or `REVIEW_FAILED (evidence)`
