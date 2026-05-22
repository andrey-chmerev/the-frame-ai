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
- `Phase: REVIEW` ✓
- `Status:` is `approve` OR `Shipped` OR contains `ready to ship` ✓ (not `request changes`)

If conditions not met → **STOP**:
```
❌ Ship blocked. Review not completed or not approved.
   Current status: {status}
   Run /frame:review first.
```

Check `Deps Audit` in STATE.md:
- If `Deps Status: CRITICAL` → **STOP**: fix critical vulnerabilities before shipping
- If audit date is older than 7 days → warn: `⚠️ Deps audit is stale. Consider running /frame:check-deps`

Check `Security Status` in STATE.md:
- If `Security Status: CRITICAL` → **STOP**: fix critical security findings before shipping

Check last security audit date:
```bash
LAST_SECURITY=$(ls .planning/reports/security/security-*.md 2>/dev/null | sort | tail -1)
if [ -z "$LAST_SECURITY" ]; then
  echo "⚠️  No security audit found. Consider running /frame:security before shipping."
else
  LAST_DATE=$(basename "$LAST_SECURITY" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}')
  DAYS_AGO=$(( ( $(date +%s) - $(date -d "$LAST_DATE" +%s 2>/dev/null || date -j -f "%Y-%m-%d" "$LAST_DATE" +%s) ) / 86400 ))
  [ "$DAYS_AGO" -ge 7 ] && echo "⚠️  Security audit is ${DAYS_AGO} days old. Consider running /frame:security."
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

If an architectural decision was made during ship (branch choice, PR strategy, rollback), add to `.planning/memory/decisions.md`:
```markdown
## [DEC-{XXX}] {Decision name}
- **Date**: {date}
- **Status**: accepted
- **Context**: {why the decision was needed}
- **Decision**: {what was decided}
- **Consequences**: {what follows from this}
```

### Step 7: Update STATE.md

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
- `.planning/memory/decisions.md` updated (if architectural decision made)
- `.planning/STATE.md` updated
