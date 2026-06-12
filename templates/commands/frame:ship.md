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
- `Status:` is `approve` OR `Shipped` OR contains `ready to ship` ✓ (not `request changes`)

If conditions not met → **STOP**:
```
❌ Ship blocked. Review not completed or not approved.
   Current status: {status}
   Run /frame:review first (optionally /frame:test-plan before shipping).
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

### Step 1: Quality gate

```bash
{quality.commands.typecheck} && {quality.commands.test}
```

If fails → **STOP**, do not commit broken code.

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

## Rules

- **Always specific files** -- never `git add -A`
- **Descriptive commit messages** -- `{type}({scope}): {description}`
- **One commit per task** -- atomic commits
- **Check git status before commit** -- ensure no sensitive files are included
- **Push only with confirmation** -- always ask before pushing

## Result

- Git commit created
- Optionally: git push (with confirmation), PR created
- `.planning/context.md` updated
- `.planning/memory/learnings.md` Decisions section updated (if architectural decision made)
- `.planning/STATE.md` updated
