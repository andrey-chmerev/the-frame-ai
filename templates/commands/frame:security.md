# /frame:security -- Security Audit

Deep security audit: secrets, OWASP Top 10, infrastructure, AI/LLM risks.

## Subcommands

- `/frame:security` — full project audit
- `/frame:security <path>` — scan specific file or directory
- `/frame:security secrets` — secrets-only scan
- `/frame:security audit` — full OWASP + infra + AI audit (alias for no-args)

## Instructions

### Step 0: Fail-fast + STATE.md

Check `.frame/config.json` exists:
```bash
test -f .frame/config.json || echo "MISSING"
```

If missing → **STOP**:
```
❌ .frame/config.json not found. Run /frame:init first.
```

Update `.planning/STATE.md`:
```markdown
## Current Position
- Phase: SECURITY
- Status: IN_PROGRESS
- Scope: {$ARGUMENTS or "full project"}
- Started: {timestamp}
```

### Step 1: Determine Scope

Parse `$ARGUMENTS`:
- Empty or `audit` → scan entire project (exclude: `node_modules`, `.git`, `dist`, `build`, `*.min.js`)
- `secrets` → run Step 2 only, then skip to Step 8
- A file path → scan that file only
- A directory path → scan that directory

Set `SCAN_DIR` accordingly:
```bash
SCAN_DIR="${ARGUMENTS:-"."}"
[ "$SCAN_DIR" = "audit" ] && SCAN_DIR="."
```

### Step 2: Secret Scan

**Heartbeat**: "Scanning for leaked secrets..."

**AWS:**
```bash
grep -rn -E '(AKIA[0-9A-Z]{16}|(?i)aws[_-]?secret[_-]?access[_-]?key\s*[:=]\s*['"'"'"]?[a-zA-Z0-9/+=]{40})' \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  --include="*.py" --include="*.go" --include="*.env" --include="*.yaml" --include="*.yml" \
  --include="*.json" --include="*.toml" --include="*.conf" \
  "$SCAN_DIR" 2>/dev/null | grep -v node_modules | grep -v '.git/' | head -20
```

**GitHub / GitLab tokens:**
```bash
grep -rn -E '(ghp_[A-Za-z0-9]{36}|gho_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{82}|glpat-[A-Za-z0-9_-]{20,})' \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  --include="*.py" --include="*.go" --include="*.yaml" --include="*.yml" --include="*.json" \
  "$SCAN_DIR" 2>/dev/null | grep -v node_modules | grep -v '.git/' | head -20
```

**Stripe / Slack / npm:**
```bash
grep -rn -E '(sk_live_[0-9a-zA-Z]{24,}|sk_test_[0-9a-zA-Z]{24,}|xoxb-[0-9]{10,}-[a-zA-Z0-9-]+|xoxp-[0-9]{10,}-[a-zA-Z0-9-]+|npm_[A-Za-z0-9]{36})' \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  --include="*.py" --include="*.go" --include="*.yaml" --include="*.yml" \
  "$SCAN_DIR" 2>/dev/null | grep -v node_modules | grep -v '.git/' | head -20
```

**Private keys:**
```bash
grep -rn -E '-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY' \
  "$SCAN_DIR" 2>/dev/null | grep -v node_modules | grep -v '.git/' | head -10
```

**Generic secrets (API keys, passwords):**
```bash
grep -rn -E '(?i)(api[_-]?key|apikey|secret[_-]?key|access[_-]?key|auth[_-]?token)\s*[:=]\s*['"'"'"][a-zA-Z0-9_\-]{16,}['"'"'"]' \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  --include="*.py" --include="*.go" --include="*.java" --include="*.rb" \
  "$SCAN_DIR" 2>/dev/null | grep -v node_modules | grep -v '.git/' | grep -v test | grep -v mock | head -30
```

**Connection strings:**
```bash
grep -rn -E '(?i)(mysql|postgres(ql)?|mongodb(\+srv)?|redis|amqp)://[^\s'"'"'"]+' \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  --include="*.py" --include="*.go" --include="*.env" --include="*.yaml" --include="*.yml" \
  "$SCAN_DIR" 2>/dev/null | grep -v node_modules | grep -v '.git/' | grep -v '\.example' | head -20
```

**.env files committed to git:**
```bash
git ls-files 2>/dev/null | grep -iE '\.env$|\.env\.' | grep -v '\.env\.example' | grep -v '\.env\.template' | grep -v '\.env\.sample'
```

**Classify each finding:**
- CRITICAL: active secret in source code (not test/mock/example)
- HIGH: secret in config files or .env committed to git
- MEDIUM: secret in non-production paths
- LOW: secret in test/mock files (likely false positive)

If `$ARGUMENTS` = `secrets` → skip to Step 8.

**Heartbeat**: "Secret scan complete. Starting OWASP backend audit..."

### Step 3: Backend OWASP Audit

**SQL Injection — string concatenation in queries:**
```bash
grep -rn -E '(query\s*\+|execute\s*\(\s*['"'"'"`].*\+|\$\{[^}]+\}.*(SELECT|INSERT|UPDATE|DELETE)|f['"'"'"].*SELECT.*\{)' \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  --include="*.py" --include="*.go" --include="*.java" --include="*.rb" --include="*.php" \
  "$SCAN_DIR" 2>/dev/null | grep -v node_modules | grep -v '.git/' | grep -v test | head -20
```

**Command Injection:**
```bash
grep -rn -E '(child_process\.exec\s*\(|os\.system\s*\(|subprocess\.call\s*\(.*shell\s*=\s*True|Runtime\.getRuntime\(\)\.exec)' \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  --include="*.py" --include="*.java" --include="*.rb" \
  "$SCAN_DIR" 2>/dev/null | grep -v node_modules | grep -v '.git/' | grep -v test | head -20
```

**Path Traversal:**
```bash
grep -rn -E '(readFile|createReadStream|sendFile|download)\s*\(.*req\.' \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  "$SCAN_DIR" 2>/dev/null | grep -v node_modules | grep -v '.git/' | grep -v test | head -20
```

**SSRF — user-controlled URLs:**
```bash
grep -rn -E '(fetch|axios\.get|requests\.get|http\.get|HttpClient)\s*\(.*req\.' \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  --include="*.py" --include="*.java" \
  "$SCAN_DIR" 2>/dev/null | grep -v node_modules | grep -v '.git/' | grep -v test | head -20
```

**Insecure Deserialization:**
```bash
grep -rn -E '(pickle\.loads|yaml\.load\s*\((?!.*Loader)|marshal\.loads|unserialize\s*\(|eval\s*\()' \
  --include="*.py" --include="*.rb" --include="*.php" \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  "$SCAN_DIR" 2>/dev/null | grep -v node_modules | grep -v '.git/' | grep -v test | head -20
```

**Weak Cryptography:**
```bash
grep -rn -E '(createHash\(['"'"'"]md5['"'"'"]|createHash\(['"'"'"]sha1['"'"'"]|hashlib\.md5|hashlib\.sha1)' \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.py" \
  "$SCAN_DIR" 2>/dev/null | grep -v node_modules | grep -v '.git/' | grep -v test | head -10
```

**Debug Mode:**
```bash
grep -rn -E '(DEBUG\s*=\s*[Tt]rue|debug\s*:\s*true|FLASK_DEBUG\s*=\s*1|NODE_ENV.*development)' \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  --include="*.py" --include="*.go" --include="*.env" --include="*.yaml" --include="*.yml" \
  "$SCAN_DIR" 2>/dev/null | grep -v node_modules | grep -v '.git/' | grep -v test | grep -v example | head -10
```

**Heartbeat**: "Backend audit complete. Starting frontend audit..."

### Step 4: Frontend OWASP Audit

**XSS — dangerous DOM sinks:**
```bash
grep -rn -E '(innerHTML\s*=|outerHTML\s*=|document\.write\s*\(|insertAdjacentHTML\s*\(|dangerouslySetInnerHTML|v-html|\.html\s*\()' \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  --include="*.vue" --include="*.svelte" \
  "$SCAN_DIR" 2>/dev/null | grep -v node_modules | grep -v '.git/' | grep -v test | head -20
```

**Insecure Storage — tokens in localStorage:**
```bash
grep -rn -E '(localStorage\.setItem|sessionStorage\.setItem)' \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  --include="*.vue" --include="*.svelte" \
  "$SCAN_DIR" 2>/dev/null | grep -v node_modules | grep -v '.git/' | grep -v test | head -10
```

**Open Redirects:**
```bash
grep -rn -E '(res\.redirect\s*\(.*req\.|response\.redirect\s*\(.*request\.|window\.location\s*=.*query|window\.location\.href\s*=.*param)' \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.py" \
  "$SCAN_DIR" 2>/dev/null | grep -v node_modules | grep -v '.git/' | grep -v test | head -10
```

**Missing Clickjacking Protection:**
```bash
FRAME_HEADER=$(grep -rn -E '(X-Frame-Options|frame-ancestors)' \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  --include="*.py" --include="*.go" --include="*.conf" \
  "$SCAN_DIR" 2>/dev/null | grep -v node_modules | grep -v '.git/' | head -5)
[ -z "$FRAME_HEADER" ] && echo "WARNING: No X-Frame-Options or CSP frame-ancestors found"
```

**Third-Party Scripts Without SRI:**
```bash
grep -rn -E '<script[^>]+src=' \
  --include="*.html" --include="*.ejs" --include="*.hbs" \
  "$SCAN_DIR" 2>/dev/null | grep -v node_modules | grep -v '.git/' | grep -v 'integrity=' | head -10
```

**Heartbeat**: "Frontend audit complete. Starting infrastructure audit..."

### Step 5: Infrastructure Audit

**Dockerfile analysis:**
```bash
if [ -f Dockerfile ]; then
  echo "=== Dockerfile ==="
  grep -n "^FROM" Dockerfile | grep -E ':latest$|^FROM [a-z]+$'
  grep -n "USER" Dockerfile || echo "WARNING: No USER directive — container runs as root"
  grep -n -iE '(ENV|ARG).*(KEY|SECRET|TOKEN|PASSWORD)' Dockerfile
  grep -n "COPY \. \." Dockerfile
fi
```

**.dockerignore check:**
```bash
[ -f Dockerfile ] && [ ! -f .dockerignore ] && echo "CRITICAL: Dockerfile without .dockerignore — may leak .env and secrets"
```

**Sensitive files in git:**
```bash
git ls-files 2>/dev/null | grep -iE '(\.env$|\.pem$|\.key$|\.p12$|\.pfx$|id_rsa$|id_dsa$|\.cer$)' | grep -v example | grep -v template | grep -v sample
```

**.env not in .gitignore:**
```bash
[ -f .env ] && ! grep -q '\.env' .gitignore 2>/dev/null && echo "HIGH: .env file exists but not in .gitignore"
```

**Debug/admin endpoints:**
```bash
grep -rn -E '(/debug|/actuator|/__debug__|/phpinfo|graphql.*introspection.*true)' \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  --include="*.py" --include="*.go" --include="*.java" \
  "$SCAN_DIR" 2>/dev/null | grep -v node_modules | grep -v '.git/' | grep -v test | head -10
```

**Heartbeat**: "Infrastructure audit complete. Checking AI/LLM patterns..."

### Step 6: AI/LLM Audit

Detect AI usage first:
```bash
AI_FILES=$(grep -rl -E '(anthropic|openai|langchain|claude|gpt|llm|prompt.*completion)' \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.py" \
  "$SCAN_DIR" 2>/dev/null | grep -v node_modules | grep -v '.git/' | grep -v test)
```

If no AI files found → output "No AI/LLM integration detected." and skip to Step 7.

If AI files found:

**Prompt Injection — user input directly in prompts:**
```bash
grep -rn -E '(content.*req\.|content.*request\.|prompt.*\$\{.*req|messages.*user.*\+)' \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.py" \
  "$SCAN_DIR" 2>/dev/null | grep -v node_modules | grep -v '.git/' | grep -v test | head -10
```

**LLM output in dangerous sinks:**
```bash
grep -rn -E '(innerHTML.*response|innerHTML.*completion|execute.*llm|query.*llm|eval.*response)' \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.py" \
  "$SCAN_DIR" 2>/dev/null | grep -v node_modules | grep -v '.git/' | grep -v test | head -10
```

**Heartbeat**: "AI/LLM audit complete. Running dependency audit..."

### Step 7: Dependency Audit

```bash
{quality.commands.audit} 2>/dev/null | tail -20
```

Count critical vulnerabilities:
```bash
CRITICAL_DEPS=$(npm audit --json 2>/dev/null | node -e "
  try {
    const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    console.log(d.metadata?.vulnerabilities?.critical ?? 0);
  } catch { console.log(0); }
" 2>/dev/null || echo "0")
echo "Critical dependency vulnerabilities: $CRITICAL_DEPS"
```

**Heartbeat**: "Dependency audit complete. Writing security report..."

### Step 8: Create Security Report

Create `.planning/reports/security/security-{date}.md` with all findings.

Structure:
```markdown
# Security Audit Report — {date}

## Scope: {scope}

## Summary
| Severity | Count |
|----------|-------|
| CRITICAL | {N} |
| HIGH | {N} |
| MEDIUM | {N} |
| LOW | {N} |

**Overall Risk**: CRITICAL | HIGH | MEDIUM | LOW | CLEAN

## Secrets
{findings table or "No secrets found"}

## Backend (OWASP)
{findings table or "No issues found"}

## Frontend (OWASP)
{findings table or "No issues found"}

## Infrastructure
{findings table or "No issues found"}

## AI/LLM
{findings table or "Not applicable" or "No issues found"}

## Dependencies
{findings table or "No vulnerabilities found"}

## Fix Recommendations

### CRITICAL (must fix before ship)
{numbered list with specific fix for each}

### HIGH (should fix)
{numbered list}

### MEDIUM (recommended)
{numbered list}

## Memory Updates
- anti-patterns.md: {what to add, or "none"}
- patterns.md: {what to add, or "none"}
```

### Step 9: Update Memory

If CRITICAL or HIGH findings found, add to `.planning/memory/anti-patterns.md`:
```markdown
## [SECURITY-{N}] {Issue title}
- **Date**: {date}
- **Severity**: {level}
- **Category**: {Secrets | SQL Injection | XSS | etc.}
- **Issue**: {description}
- **Fix**: {how to fix}
- **Status**: open
```

### Step 10: Update STATE.md

**If no CRITICAL findings:**
```markdown
## Current Position
- Phase: SECURITY
- Status: COMPLETE
- Security Status: OK
- Findings: {total} (Critical: 0, High: {N}, Medium: {N}, Low: {N})
- Report: .planning/reports/security/security-{date}.md
```

**If CRITICAL findings exist:**
```markdown
## Current Position
- Phase: SECURITY
- Status: COMPLETE
- Security Status: CRITICAL
- Findings: {total} (Critical: {N}, High: {N}, Medium: {N}, Low: {N})
- Report: .planning/reports/security/security-{date}.md
- Ship: BLOCKED — resolve critical security findings first
```

Notify user:
```
Security audit complete.
Critical: {N} | High: {N} | Medium: {N} | Low: {N}
Report: .planning/reports/security/security-{date}.md

{If critical: "⛔ Ship BLOCKED. Fix critical findings before /frame:ship."}
{If no critical: "✓ No critical issues. Safe to proceed."}
```

## Rules

- **NEVER edit code** — audit only
- **NEVER skip categories** — run all 6 steps even if previous found nothing
- **ALWAYS exclude** `node_modules`, `.git`, `dist`, `build` from scans
- **NEVER flag** `.env.example`, `.env.template`, test/mock files as CRITICAL
- **ALWAYS provide** file path and line number for every finding
- **Ship is BLOCKED** if `Security Status: CRITICAL` in STATE.md

## Result

- Security report at `.planning/reports/security/security-{date}.md`
- STATE.md updated with Security Status
- Memory updated with new anti-patterns (if any)
- Ship blocked if critical findings exist
