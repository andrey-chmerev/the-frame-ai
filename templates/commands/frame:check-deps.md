---
description: "Audit project dependencies for outdated packages, vulnerabilities, and bloat"
allowed-tools: [Read, Bash]
---
# /frame:check-deps -- Dependency Watch

Checks for outdated dependencies and vulnerabilities. Run before every `/frame:ship` and weekly.

## Instructions

### Step 0: Check Freshness

Check STATE.md — if `Deps Audit` is older than 7 days, this is a scheduled run. Otherwise confirm with the developer whether a full audit is needed.

### Step 1: Security Audit

[D] Run audit:

```bash
{quality.commands.audit} 2>/dev/null
```

[D] Count critical vulnerabilities (for npm):

```bash
CRITICAL=$(npm audit --json 2>/dev/null | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); console.log(d.metadata?.vulnerabilities?.critical ?? 0)")
echo "CRITICAL=$CRITICAL"
```

[P] Classify found vulnerabilities:
- Critical → immediate action required
- High → action required
- Moderate → action recommended

[D] If CRITICAL > 0 → update STATE.md: `Deps Status: CRITICAL`

### Step 2: Outdated Packages

[D] Run check:

```bash
{quality.commands.outdated} 2>/dev/null
```

[P] Classify updates:
- Major → create task, do not update automatically
- Minor → recommend update
- Patch → apply + run quality gates:

```bash
{quality.commands.test} && {quality.commands.typecheck}
```

Only if PASS → commit: `chore(deps): update patch dependencies`

### Step 3: License Check

[D] Run:

```bash
npx license-checker --summary 2>/dev/null || \
  npm ls --all --json 2>/dev/null | node -e "
    const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    const licenses = {};
    function walk(pkg) {
      if (pkg.license) licenses[pkg.license] = (licenses[pkg.license]||0)+1;
      Object.values(pkg.dependencies||{}).forEach(walk);
    }
    walk(d);
    Object.entries(licenses).sort((a,b)=>b[1]-a[1]).forEach(([l,n])=>console.log(n,l));
  "
```

[P] Warn if GPL, AGPL, or LGPL found in production dependencies — these require legal review.

### Step 4: Create Report

Create `.planning/reports/deps/{date}.md`:

```markdown
# Dependency Watch -- {date}

## Security
| Package | Severity | Issue | Action |
|---------|----------|-------|--------|
| ... | ... | ... | ... |

## Updates Available
| Package | Current | Latest | Type | Decision |
|---------|---------|--------|------|----------|
| ... | ... | ... | major/minor/patch | update/freeze |

## Licenses
| License | Package Count | Risk |
|---------|---------------|------|
| ... | ... | ... |

## Recommendations
1. {recommendation}

## Action Items
- [ ] Fix critical vulnerabilities
- [ ] Update patch dependencies (after tests)
- [ ] Update dependencies.md
```

### Step 5: Update STATE.md

Add or update section:

```
Deps Audit: {date}
Deps Status: OK | CRITICAL | HIGH
Critical: {N}
High: {N}
```

### Step 6: Update dependencies.md

- Critical vulnerabilities → add to `Avoid` section with explanation
- Major updates that were applied → update versions
- Packages decided not to update → add entry `frozen until {reason}`
