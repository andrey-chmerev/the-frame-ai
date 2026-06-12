---
description: "Fix security findings from the latest security report"
argument-hint: "[<VULN-N> | critical | all]"
---
# /frame:security-fix — Fix Security Findings

Fix security issues found by `/frame:security`. Reads the latest report and guides through fixes by priority: CRITICAL first, then HIGH.

## Subcommands

- `/frame:security-fix` — fix all findings from latest report
- `/frame:security-fix critical` — fix only CRITICAL findings
- `/frame:security-fix high` — fix only HIGH findings
- `/frame:security-fix <finding-id>` — fix a specific finding (e.g. `SEC-1`)

## Instructions

### Step 0: Find Latest Report

```bash
REPORT=$(ls -t .planning/reports/security/security-*.md 2>/dev/null | head -1)
[ -z "$REPORT" ] && echo "NO_REPORT" || echo "$REPORT"
```

If no report found → **STOP**:
```
❌ No security report found. Run /frame:security first.
```

Read the report and extract all findings with their severity, category, file, and line number.

Parse `$ARGUMENTS`:
- Empty → fix all CRITICAL + HIGH findings
- `critical` → fix only CRITICAL
- `high` → fix only HIGH
- `SEC-N` → fix only that finding

**Heartbeat**: "Found report: {REPORT}. Starting fixes..."

### Step 1: Show Fix Plan

Before making any changes, output a numbered plan:

```
Security Fix Plan
─────────────────
CRITICAL ({N}):
  [SEC-1] {category}: {short description} — {file}:{line}
  ...

HIGH ({N}):
  [SEC-N] {category}: {short description} — {file}:{line}
  ...

Starting with CRITICAL findings...
```

### Step 2: Fix CRITICAL Findings

For each CRITICAL finding, apply the appropriate fix pattern:

**Secrets in git (.env committed):**
```bash
# Remove from git tracking (do NOT delete the file)
git rm --cached {file}
echo "{file}" >> .gitignore
```
Then output:
```
⚠️  MANUAL ACTION REQUIRED:
1. Rotate ALL secrets in {file} — they are compromised (in git history)
2. Run: git filter-repo --path {file} --invert-paths
   (or use BFG: https://rtyley.github.io/bfg-repo-cleaner/)
3. Force-push to remote after history rewrite
```

**Secret hardcoded in source file:**
- Replace the hardcoded value with `process.env.{VAR_NAME}` (or language equivalent)
- Add `{VAR_NAME}=your_value_here` to `.env.example`
- Add `.env` to `.gitignore` if not already there

**SQL Injection (string concatenation):**
- Replace string concatenation with parameterized query / prepared statement
- Show before/after diff

**Command Injection (exec with user input):**
- Replace `exec(userInput)` with `execFile` + argument array, or validate/sanitize input

**Path Traversal:**
- Add `path.resolve` + check that result starts with allowed base directory

**Heartbeat**: "CRITICAL fixes applied. Moving to HIGH findings..."

### Step 3: Fix HIGH Findings

**Secrets in .env committed to git:**
Same as CRITICAL secrets pattern above.

**.dockerignore missing or exposing .env:**
- If `.dockerignore` missing: create it with standard ignores
- If `.dockerignore` has `!.env*` line: remove it

```
# .dockerignore
.env
.env.*
!.env.example
.git
node_modules
```

**Missing CSRF protection (Next.js App Router / Express):**

For Next.js Route Handlers — add token validation:
```typescript
// lib/csrf.ts
import { headers } from 'next/headers'

export function validateCsrf() {
  const origin = headers().get('origin')
  const host = headers().get('host')
  if (!origin || !origin.includes(host ?? '')) {
    throw new Error('CSRF validation failed')
  }
}
```
Then call `validateCsrf()` at the top of each mutating Route Handler (POST/PUT/DELETE).

For Express — add `csurf` or `csrf-csrf` middleware.

**Missing HTTP security headers (Next.js):**

Add to `next.config.js` / `next.config.ts`:
```javascript
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]

// In nextConfig:
headers: async () => [{ source: '/(.*)', headers: securityHeaders }]
```

For Express:
```bash
npm install helmet
```
```javascript
import helmet from 'helmet'
app.use(helmet())
```

**Vulnerable dependencies:**
```bash
npm audit fix
```
If `npm audit fix` can't resolve automatically:
```bash
npm audit fix --force
```
If still unresolved — output:
```
⚠️  Manual update needed for {package}:
    npm install {package}@{safe-version}
    Check changelog for breaking changes: {url}
```

**Dockerfile running as root:**
Add before the last `CMD`/`ENTRYPOINT`:
```dockerfile
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser
```

**Dockerfile using :latest tag:**
- Replace `FROM image:latest` with `FROM image:{specific-version}`
- Check Docker Hub for the current stable version

**Heartbeat**: "HIGH fixes applied. Running verification..."

### Step 4: Verify Fixes

Re-run targeted scans for each fixed category:

```bash
# Re-check secrets
git ls-files 2>/dev/null | grep -iE '\.env$|\.env\.' | grep -v '\.env\.example' | grep -v '\.env\.template'

# Re-check .dockerignore
[ -f .dockerignore ] && grep -E '!\.env' .dockerignore && echo "STILL_EXPOSED" || echo "OK"

# Re-check security headers
grep -rn 'X-Frame-Options\|Strict-Transport-Security' next.config.* 2>/dev/null | head -5
```

For each fixed finding: output `✓ SEC-{N} verified` or `✗ SEC-{N} still present — {reason}`.

### Step 5: Update Report

Append to the existing report:

```markdown
## Fix Session — {date}

| Finding | Status | Fix Applied |
|---------|--------|-------------|
| SEC-1 | ✓ Fixed | {description} |
| SEC-2 | ✓ Fixed | {description} |
| SEC-3 | ⚠️ Manual action required | {what user must do} |
```

### Step 6: Update STATE.md

If all CRITICAL findings are resolved:
```markdown
- Security Status: HIGH (was CRITICAL — critical findings resolved)
- Ship: UNBLOCKED
```

If CRITICAL findings remain:
```markdown
- Security Status: CRITICAL
- Ship: BLOCKED — {N} critical findings remain
```

### Step 7: Final Output

```
Security Fix Complete
─────────────────────
Fixed:   {N} findings
Manual:  {N} findings require your action
Remain:  {N} findings (not in scope or couldn't auto-fix)

{If all CRITICAL resolved:}
✓ Ship UNBLOCKED. Run /frame:security to confirm, then /frame:ship.

{If CRITICAL remain:}
⛔ Ship still BLOCKED. {N} critical findings need manual action (see above).

{If manual actions needed:}
⚠️  Manual actions required:
{numbered list of each manual step}
```

## Rules

- **ALWAYS create a git checkpoint before making changes**: `git stash` or note current state
- **NEVER delete .env files** — only remove from git tracking with `git rm --cached`
- **NEVER auto-rotate secrets** — always tell the user to rotate manually
- **NEVER run `git filter-repo` automatically** — it rewrites history, user must confirm
- **ALWAYS verify** each fix after applying it
- **ALWAYS explain** what was changed and why
- **For npm audit fix --force**: warn about potential breaking changes before running

## Result

- Security findings fixed or documented with manual steps
- Report updated with fix session
- STATE.md updated (ship unblocked if CRITICAL resolved)
- User knows exactly what manual actions remain
