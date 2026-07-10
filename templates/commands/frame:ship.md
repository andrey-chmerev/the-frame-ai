---
description: "Prepare and create a git commit and pull request after review passes"
allowed-tools: [Read, Write, Bash]
---
# /frame:ship -- Git + PR

Prepares a git commit, optionally pushes and creates a PR.

## Instructions

### Step 0: Fail-fast + update STATE.md (IN_PROGRESS)

**Fail-fast checks:**
```bash
git rev-parse --is-inside-work-tree 2>/dev/null || { echo "ERROR: Not a git repository. Run from the project root."; exit 1; }
```

Update `.planning/STATE.md` before starting:
```markdown
## Current Position
- Phase: SHIP
- Status: IN_PROGRESS
- Started: {timestamp}
```

Read `.planning/STATE.md` and verify:
- `Phase:` is `REVIEW` OR `TEST` ✓ (TEST = manual test plan was generated after review)
- OR `Phase:` is `INTEGRATE` with `Status: COMPLETE` / `ready to ship` ✓ (parallel features merged via /frame:integrate — per-feature reviews already passed in worktrees)
- `Status:` is `approve` OR `Shipped` OR contains `ready to ship` ✓ (not `request changes`)

If conditions not met → **STOP**:
```
❌ Ship blocked. Review not completed or not approved.
   Current status: {status}
   Run /frame:review first (optionally /frame:test-plan before shipping).
   (For parallel tasks: /frame:integrate must finish with "ready to ship".)
```

Check `Audit Status` in STATE.md:
- If `Audit Status: CRITICAL` → **STOP**: "Resolve critical audit findings first: /frame:plan audit"
- `Review Status` ≠ approve → already blocked above

Check last audit date:
```bash
LAST_AUDIT=$(ls .planning/reports/audit/*/AUDIT.md 2>/dev/null | sort | tail -1)
if [ -z "$LAST_AUDIT" ]; then
  echo "⚠️  No audit found. Consider running /frame:audit before shipping."
else
  LAST_DATE=$(echo "$LAST_AUDIT" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}')
  DAYS_AGO=$(( ( $(date +%s) - $(date -d "$LAST_DATE" +%s 2>/dev/null || date -j -f "%Y-%m-%d" "$LAST_DATE" +%s) ) / 86400 ))
  [ "$DAYS_AGO" -ge 14 ] && echo "⚠️  Audit is ${DAYS_AGO} days old. Consider running /frame:audit."
fi
```

### Step 1: Readiness passport (unified verification report)

Run every gate and print **one** readiness table — a single "passport" the user can read at a glance, instead of scattered check outputs. Run each row and record PASS/FAIL (+ the number that matters):

```bash
{quality.commands.build}      # Build
{quality.commands.typecheck}  # Types
{quality.commands.lint}       # Lint
{quality.commands.test}       # Tests (capture coverage % if the runner reports it)
{quality.commands.audit}      # Security (dependency/secret scan; skip row if not configured)
git diff --stat               # Diff — size of what's shipping
```

Emit the passport:
```
Readiness passport — {feature}
| Check    | Result                    |
|----------|---------------------------|
| Build    | PASS                      |
| Types    | PASS                      |
| Lint     | PASS                      |
| Tests    | PASS (128 passed, 87% cov)|
| Security | PASS (0 vulns)            |
| Diff     | 6 files, +240/-30         |
| Review   | approve ({N} warnings)    |   ← from STATE.md / review.md
──────────────────────────────────────
Verdict: READY for PR
```

The verdict is **READY** only if Build, Types, Lint, Tests all PASS and Review is `approve`. Any FAIL → verdict **NOT READY**: print the table with the failing row(s), **STOP**, and do not commit broken code. Security FAIL and Diff are informational unless a critical vuln is present (then NOT READY).

### Step 2: Check git status

```bash
git status
git diff --stat
```

**D-step**: Identify which files have changed.

### Step 3: Select files for commit

**NEVER use `git add -A` or `git add .`**

Add only the relevant files:
```bash
git add path/to/file1.ts path/to/file2.tsx
```

### Step 4: Create commit

Commit format: `{type}({scope}): {description}`

Types:
- `feat` -- new feature
- `fix` -- bug fix
- `refactor` -- refactoring
- `test` -- tests
- `docs` -- documentation
- `chore` -- maintenance

Examples:
```bash
git commit -m "feat(chat): add streaming support"
git commit -m "fix(auth): handle expired token"
git commit -m "refactor(api): extract proxy logic"
```

**D-step**: Commit is successful.

### Step 5: Optional -- Push

Ask the user:
```
Push to {branch}? (y/n)
```

If yes:
```bash
git push origin {branch}
```

### Step 6: Optional -- PR

If a PR needs to be created:
```bash
gh pr create --title "{title}" --body "{description}"
```

### Step 6.5: Update memory files

**Worktree rule**: check `git rev-parse --git-common-dir`. If the output contains `worktrees/`, you are in a linked worktree — do **NOT** write to shared memory files (`.planning/memory/*`, `.planning/context.md`): parallel branches editing them guarantees merge conflicts. Instead append decisions/learnings to `docs/specs/{feature}/learnings.md` (per-feature, conflict-free); `/frame:integrate` merges them into shared memory later. Worktree-local `.planning/STATE.md` and plan.md edits are fine — commit them to the feature branch (e.g. `chore({feature}): update planning state`) so the tree stays clean; `/frame:integrate` resolves them in main's favor automatically. Skip the rest of this step.

Update `.planning/context.md`:
- `Current Focus` → remove the completed feature
- `Recent Decisions` → add an entry about what was shipped

If an architectural decision was made during ship (branch choice, PR strategy, rollback), add to `.planning/memory/learnings.md` under `## Decisions`:
```markdown
### [DEC-{XXX}] {Decision name}
- **Date**: {date}
- **Status**: accepted
- **Context**: {why the decision was needed}
- **Decision**: {what was decided}
- **Consequences**: {what follows from this}
```

### Step 7: Update STATE.md + session telemetry

Update `.planning/STATE.md`:
```markdown
## Current Position
- Phase: SHIP
- Feature: {feature}
- Commit: {hash}
- Branch: {branch}
- Tasks: {completed}/{total}
- Review: approve / {N} warnings
- Shipped: {timestamp}
- Status: Shipped
```

Write finish timestamp to the latest session file:
```bash
SESSION_FILE=$(ls .planning/sessions/*.json 2>/dev/null | sort | tail -1)
if [ -n "$SESSION_FILE" ]; then
  CONTENT=$(cat "$SESSION_FILE")
  # Add finished_at and feature to the session record
  node -e "
    const s = JSON.parse(process.argv[1]);
    s.finished_at = new Date().toISOString();
    s.feature = process.argv[2];
    s.commit = process.argv[3];
    process.stdout.write(JSON.stringify(s, null, 2));
  " "$CONTENT" "{feature}" "$(git rev-parse --short HEAD 2>/dev/null)" > "$SESSION_FILE.tmp" && mv "$SESSION_FILE.tmp" "$SESSION_FILE"
fi
```

## AUTO mode (driven by /frame:auto)

Applies **only** when the autopilot marker exists: `[ -f "$(git rev-parse --git-dir)/frame-autopilot" ]`. Standalone runs ignore this section.

- **Skip Step 5 (push) and Step 6 (PR) entirely** — no questions; the flight ends at the local commit. Report both as manual follow-ups: "push/PR — run /frame:ship or push manually when ready."
- **Readiness passport NOT READY** → stops as usual, and the stop halts the flight.
- Everything else (fail-fast checks, passport, commit, memory updates, STATE.md) runs unchanged.

## Rules

- **Always specific files** -- never `git add -A`
- **Descriptive commit messages** -- `{type}({scope}): {description}`
- **One commit per task** -- atomic commits
- **Check git status before commit** -- ensure no sensitive files are included
- **Push only with confirmation** -- always ask before pushing

## Result

- Readiness passport printed (Build/Types/Lint/Tests/Security/Diff/Review → READY / NOT READY)
- Git commit created
- Optionally: git push (with confirmation), PR created
- `.planning/context.md` updated
- `.planning/memory/learnings.md` Decisions section updated (if architectural decision made)
- `.planning/STATE.md` updated
