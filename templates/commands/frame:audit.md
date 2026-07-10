---
description: "Comprehensive project audit across 12 categories — security, performance, business logic, API, data, observability, deps, tests, infra, maintainability, a11y, privacy"
argument-hint: "[category | quick] [scope-path] [--priv]"
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob, Task]
---
# /frame:audit -- Project Audit

Parallel multi-agent audit across up to 12 categories. Findings are adversarially verified before reporting. Use results with `/frame:plan audit` → `/frame:build` → `/frame:review audit` → `/frame:ship`.

### Routing

- (no args) — full audit, active categories determined by project profile
- `security` — security only (OWASP Top 10:2025, secrets, AI/LLM risks)
- `performance` — performance only (Core Web Vitals, N+1, bundle, DB)
- `deps` — dependencies only (lockfile, CVEs, supply chain)
- `quick` — fast check: secrets + critical deps + CRITICAL security patterns (~5 min)
- `security src/api` — category + scope path
- `--priv` — enable PRIV category (privacy/compliance); auto-enabled if MAP.md has `userData: true` or `gdpr: true`

## Instructions

### Step 0: Fail-fast

```bash
test -f .frame/config.json || { echo "ERROR: Run /frame:init first."; exit 1; }
test -f .planning/MAP.md || { echo "ERROR: Run /frame:init first — MAP.md missing."; exit 1; }
```

Update `.planning/STATE.md`:
```markdown
## Current Position
- Phase: AUDIT
- Status: IN_PROGRESS
- Started: {timestamp}
```

### Step 1: Profile project → active categories + tier

Count project files (excluding vendor):
```bash
git ls-files | grep -v "^node_modules\|^vendor\|^dist\|^build" | wc -l
```

Read `.frame/config.json` and `.planning/MAP.md` to determine:
- `frontend` presence → A11Y on/off
- `database` presence → DATA full or reduced
- LLM code present (grep for `openai|anthropic|langchain|claude` in source) → SEC AI/LLM block on/off
- `userData: true` or `gdpr: true` in MAP.md → PRIV auto-enabled
- `--priv` flag → PRIV enabled regardless

**Tier rules** (determines how many parallel agents to run):

| Tier | Files | Agents | Strategy |
|------|-------|--------|----------|
| S | <100 | 3–4 | Merge categories: SEC+DEPS, PERF+INFRA, LOGIC+API+DATA, OBS+TEST+MAINT |
| M | 100–1000 | 6–8 | One agent per active category |
| L | >1000 | 8–12 | One per category + directory sharding for heavy categories |

> **Rule**: never run 12 agents on a project with <100 files. Scale to match.

For `quick` mode: always Tier S approach regardless of project size.

Report: "Project profile: {tier} tier ({N} files), {categories} active, launching {M} agents..."

### Step 2: Launch audit agents

Each agent receives a **category brief** (see section below) and writes **only its own** `.planning/reports/audit/{date}/{category}.md`. Max 5 agents in Wave 1, remaining in Wave 2.

**State tracking rule**: auditor subagents return findings as final text + write their `{category}.md`. They never write `.planning/STATE.md`.

After all agents complete, update STATE.md: `Status: AUDIT_COLLECTING`

### Step 3: Verification pass

For all confirmed CRITICAL and HIGH findings, and MEDIUM findings with `Confidence ≤5`:

Launch `devils-advocate` subagents in refute mode (batches of ≤5):
- Input: finding + source file content
- Task: "Try to refute this finding. Is there validation higher in the stack? Is this code path reachable? Is this a test/example file? Default to `refuted: false` only if you find concrete evidence."
- Output: `{ refuted: boolean, reason: string }`

Findings not refuted → `Verified: yes`
Findings refuted → `Verified: refuted` (kept in appendix for transparency, not in main report)

Update STATE.md: `Status: AUDIT_VERIFYING`

### Step 4: Synthesize AUDIT.md

Read all `{category}.md` files. Deduplicate findings with the same root cause (same file+line = one finding). Merge severity to the highest.

Create `.planning/reports/audit/{date}/AUDIT.md`:

```markdown
# Project Audit — {date}

## Summary

| Category | CRITICAL | HIGH | MEDIUM | LOW | Status |
|----------|----------|------|--------|-----|--------|
| SEC      | {N}      | {N}  | {N}    | {N} | {CLEAN/FINDINGS} |
...

**Overall: CRITICAL | HIGH | MEDIUM | CLEAN**
(CRITICAL if any verified CRITICAL findings; HIGH if verified HIGH but no CRITICAL; etc.)

## Top Risks

1. [{ID}] {title} — {one-line why dangerous}
2. ...
(top 5 confirmed findings, highest severity first)

## Findings by Category

{All verified findings using the schema below}

## Clean Areas

{Categories and checks confirmed clean — as important as findings}

## Appendix: Unverified / Refuted

{Findings that didn't pass verification pass, with refutation reason}

## Memory Updates
{Suggestions for learnings.md anti-patterns}

## Next

Run `/frame:plan audit` to create a fix plan from these findings.
```

### Step 5: Update STATE.md + report to user

```markdown
## Current Position
- Phase: AUDIT
- Status: COMPLETE
- Audit Status: {CRITICAL | HIGH | MEDIUM | CLEAN}
- Report: .planning/reports/audit/{date}/AUDIT.md
- Findings: {total verified} ({critical}, {high}, {medium}, {low})
```

Output summary:
```
Audit complete.
Overall: {status}
Critical: {N} | High: {N} | Medium: {N} | Low: {N} | Refuted: {N}
Report: .planning/reports/audit/{date}/AUDIT.md

{If CRITICAL: "Ship is BLOCKED. Next: /frame:plan audit → /frame:build → /frame:review audit"}
{If HIGH or MEDIUM: "Next: /frame:plan audit to create a fix plan"}
{If CLEAN: "No confirmed issues found. Safe to proceed with /frame:ship."}
```

---

## Finding Schema (universal — used by both audit and review)

Every finding must use this format:

```markdown
### [{CATEGORY}-{N}] {Title}
- **Severity**: CRITICAL | HIGH | MEDIUM | LOW
  (CRITICAL=exploitable/data-loss/outage; HIGH=significant risk; MEDIUM=notable concern; LOW=improvement)
- **Confidence**: 1–10
- **File**: path/to/file.ts:{line}
- **Claim**: what is wrong (one sentence)
- **Evidence**: code quote or command output — no evidence = finding rejected
- **Impact**: what happens and under what conditions
- **Fix**: concrete approach to resolve
- **Effort**: XS | S | M | L
- **Verified**: yes | no | refuted (filled by verification pass)
```

> Evidence is mandatory. "I think this might be vulnerable" without a code quote or reproducible command is not a finding.

---

## Category Briefs

Each auditor agent receives one of these briefs as its task prompt.

### SEC — Security (agent: security)

**Checklist** (OWASP Top 10:2025 + LLM Top 10 2025):
- Every endpoint with an ID parameter: check for missing ownership check (BOLA/IDOR — A01:2025)
- SQL/NoSQL/command injection: check for string concatenation in queries (A03:2025)
- Secrets in code and git history: `grep -rE "(api_key|secret|password|token)\s*=\s*['\"][^'\"]{8,}" --include="*.{js,ts,py,go}" .`
- Cryptography: MD5/SHA1 for passwords, weak random, missing salt
- CORS misconfiguration, missing security headers, debug endpoints in production
- **Error handling (A10:2025)**: catch blocks that swallow errors silently (fail-open) — check for empty catch, catch+log-only without re-throw on auth/payment paths
- Auth: JWT stored in localStorage (not httpOnly cookie), missing expiry, no refresh rotation
- XSS: dangerouslySetInnerHTML, v-html, innerHTML without sanitization
- If LLM code found: prompt injection vectors, unsanitized LLM output used in queries/commands, excessive permissions to LLM tools

**What NOT to report**:
- Generic "validate all user input" without a specific unsanitized field
- Theoretical DoS without a concrete unbounded loop or allocation
- Security issues in test/mock/fixture files (flag as LOW at most)
- Unused/dead code paths that aren't reachable

**WebSearch required**: `"{stack} OWASP vulnerabilities 2026"`, `"{framework} known CVEs {year}"`

---

### PERF — Performance (agent: performance-auditor)

**Checklist**:
- Core Web Vitals targets: LCP ≤2.5s, INP ≤200ms, CLS ≤0.1 (frontend only)
- N+1 queries: ORM calls inside loops — `grep -rn "\.find\|\.findOne\|\.query" --include="*.ts" .` then check if inside `.map`/`.forEach`
- Missing DB indices: foreign keys, columns used in WHERE/ORDER without index
- Unbounded queries: SELECT without LIMIT on user-facing endpoints
- Bundle size: large imports without tree-shaking, `import *` from heavy libs
- Missing connection pooling or pool misconfiguration
- Synchronous blocking in async context (fs.readFileSync, JSON.parse of large payloads)
- Memory: event listeners without removal, large closures in long-lived scopes
- Caching: repeated expensive computations without memoization

**What NOT to report**:
- Micro-optimizations without measurable impact (sub-millisecond)
- "Consider using X instead of Y" without evidence of a bottleneck
- Performance in test files

**WebSearch required**: `"{framework} performance pitfalls {year}"`, `"{runtime} memory leak patterns"`

---

### LOGIC — Business Logic & Correctness (agent: auditor)

**Checklist**:
- Empty catch blocks or catch-log-only on business-critical paths (payments, auth, data writes)
- Race conditions: check-then-act patterns without locks/transactions (`if (!exists) create()` without transaction)
- Float arithmetic on money/currency — look for `*`, `+`, `-` on price/amount fields without decimal library
- State machine gaps: status/state columns with transitions — are all invalid state changes prevented?
- Off-by-one and empty collection handling: `arr[0]` without length check, `count - 1` without zero guard
- Timezone assumptions: `new Date()` without timezone, date comparisons ignoring DST
- Idempotency of retried operations: payment/order creation called in retry loop without idempotency key

**What NOT to report**:
- Stylistic code structure preferences
- Hypothetical concurrency issues without evidence of actual concurrent access

---

### API — API Design (agent: auditor)

**Checklist**:
- Error response format consistency: does every endpoint return errors in the same schema? (RFC 9457 Problem Details)
- POST endpoints that create resources: is there an idempotency key mechanism?
- Collection endpoints: is there pagination? What's the max page size?
- API versioning strategy: is there a `/v1/` prefix or `Accept: application/vnd.api+json;version=1`?
- Rate limiting: are there any rate-limit headers or 429 responses?
- Outgoing HTTP calls: are there timeouts and retry limits configured?
- Mass assignment: are request bodies validated against a schema or do they pass all fields directly to DB?
- Zombie endpoints: routes defined but never called from frontend/client (grep for route path in client code)

**What NOT to report**:
- Minor naming style preferences (camelCase vs snake_case) unless inconsistent within the same API
- Missing features that aren't security/correctness issues

---

### DATA — Data & Migrations (agent: auditor)

**Only if project has a database (check MAP.md)**

**Checklist**:
- Migrations: are they backward-compatible? (expand-contract pattern — add column before removing old one)
- Rollback scripts: does every migration have a corresponding `down` function?
- Multi-step writes: are they wrapped in transactions?
- DB-level constraints: FK constraints, unique constraints on uniqueness-critical columns
- Backups: is there a backup strategy mentioned in README/docs? When was last tested?
- PII fields: are they encrypted at rest? Are they in the same table as high-volume non-PII data?
- Soft vs hard delete: is the strategy consistent across models?

---

### OBS — Observability (agent: auditor)

**Checklist**:
- Error tracking: is Sentry/Datadog/Rollbar/etc. configured AND connected to alerting? (most important for solo devs)
- Health check endpoint: does `/health` or `/healthz` exist? Is there an external uptime monitor?
- Structured logs: are logs JSON with a request ID field? (vs unstructured console.log strings)
- PII/secrets in logs: `grep -rE "console\.(log|info|warn|error)" --include="*.ts" .` — check what fields are logged
- Security events logged: auth failures, permission denials, admin actions (OWASP A09:2025 Logging and Alerting Failures)
- Critical business flows (payments, registration, order creation): are they fully logged end-to-end?
- Alert noise: are alerts configured not to fire on expected events (health checks, 404s)?

---

### DEPS — Dependencies & Supply Chain (agent: auditor)

**Checklist**:
- Lockfile in git: `git ls-files package-lock.json yarn.lock pnpm-lock.yaml | wc -l` — must be ≥1
- CI uses `npm ci` (not `npm install`): check CI config files
- Known CVEs: `{quality.commands.audit}` — report CRITICAL and HIGH
- New package cooldown (≥7 days since first publish before adding): check publish date of recently added deps
- Suspicious install scripts: `grep -r "\"postinstall\"\|\"preinstall\"" node_modules/*/package.json | head -10` — flag unknown scripts
- Typosquatting check: read `package.json` dependencies and look for common typos of popular packages
- Abandoned packages: `npm view {package} time.modified` for packages with no activity in 2+ years
- License compatibility: flag GPL in a commercial project, or unrecognized licenses

---

### TEST — Test Quality (agent: auditor)

**Checklist**:
- Tests without meaningful assertions: `grep -rE "expect\(\w+\)\.(toBeDefined|toBeTruthy|not\.toThrow)" --include="*.test.*" .` — these pass even if the feature is broken
- Error path coverage: for each try-catch in source, is there a test that triggers the catch?
- Edge cases: empty arrays, null, 0, max values — are they tested for critical functions?
- Flaky patterns: `setTimeout`/`sleep` in tests, tests that depend on execution order, `Date.now()` without mocking
- Skip inventory: `grep -rE "(\.skip|xtest|xit|xdescribe)" --include="*.test.*" .` — list all skipped tests with their age
- Over-mocking: functions that mock away the actual logic being tested (mocking the implementation, not the boundary)
- Risk-weighted coverage gaps: are the highest-risk modules (payment, auth, data mutations) covered?

---

### INFRA — Infrastructure & Production Readiness (agent: auditor)

**Checklist**:
- Secrets in repo: `.env` committed, hardcoded API keys — `git log --all --full-history -- "*.env" | head -5`
- Reproducible deploy: can a fresh checkout be deployed with documented steps?
- Rollback path: is there a documented rollback procedure (not just "revert commit")?
- Graceful shutdown: does the server handle SIGTERM and drain connections?
- Resource limits: are there memory/CPU limits in container configs?
- Log rotation: will logs fill the disk in production?
- CI gates: does every PR run typecheck + test + lint?
- Migration order: does the deploy process run migrations before or after deploying new code? Is this safe?
- Single points of failure: database, cache, external service — which would take down the whole app?

---

### MAINT — Maintainability & Documentation (agent: auditor)

**Checklist**:
- Dead code: `grep -rE "^export (function|class|const)" --include="*.ts" .` vs imports — are there unexported symbols never imported?
- Code duplication: look for files >500 lines, functions >100 lines, copy-paste patterns
- TODO/FIXME age: `grep -rn "TODO\|FIXME\|HACK\|XXX" --include="*.ts" .` — check git blame for date
- README accuracy: does `npm install && {quality.commands.test}` actually work as documented?
- Documentation drift: are there JSDoc comments describing behavior that no longer matches the code?
- Nesting depth: functions with >4 levels of nesting (flag for readability, not blocking)

---

### A11Y — Accessibility (agent: auditor)

**Only if frontend project (check MAP.md)**

**Checklist** (WCAG 2.2 AA):
- `<img>` without `alt` attribute: `grep -rE "<img(?![^>]*alt=)" --include="*.tsx" .`
- `<input>` without associated `<label>` or `aria-label`
- Color contrast: flag hardcoded color values that may fail 4.5:1 ratio (requires visual check — note as manual)
- Keyboard navigation: interactive elements reachable via Tab? No keyboard traps?
- Visible focus indicator: `outline: none` or `outline: 0` without replacement: `grep -rE "outline:\s*0|outline:\s*none" --include="*.css" .`
- Heading hierarchy: only one `<h1>`, headings in order (h1→h2→h3, no skips)
- Touch targets: interactive elements at least 24×24px (check CSS for very small buttons)

---

### PRIV — Privacy & Compliance (agent: auditor)

**Off by default. Enabled with `--priv` or `userData: true` in MAP.md.**

**Checklist**:
- Data minimization: are fields collected that aren't used?
- PII in logs/analytics: `grep -rE "(email|phone|ssn|credit)" --include="*.ts" .` — check if these appear in log calls
- Data retention: is there a scheduled job for deleting old user data? Is it documented?
- Account deletion: cascade deletes all user data? Tested?
- Tracking consent: if analytics present, is there a consent gate?
- Third-party inventory: which third parties receive PII (analytics, error tracking, CDN)?
- PII encryption at rest: are sensitive fields encrypted in the DB?

---

## Rules

- **NEVER edit application code** — audit and report only
- **Evidence is mandatory** — every finding must have a code quote or command output
- **Adversarial verification before reporting** — CRITICAL/HIGH always go through verification pass
- **Scale to project size** — don't run 12 agents on 30 files
- **WebSearch at start of each category** — look up current best practices and known issues for the stack
- **What NOT to report sections are enforced** — generic advice without specifics is noise
- **Write only your category file** — `.planning/reports/audit/{date}/{category}.md` (orchestrator writes AUDIT.md)
