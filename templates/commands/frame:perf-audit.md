# /frame:perf-audit -- Performance Audit

Deep performance audit: detects stack, researches current issues, scans code, writes PERF_REPORT.md.

## Instructions

### Step 0: Fail-fast

```bash
test -f .frame/config.json || echo "MISSING"
```

If missing → STOP: "❌ .frame/config.json not found. Run /frame:init first."

Update `.planning/STATE.md`:
```markdown
## Current Position
- Phase: PERFORMANCE
- Status: IN_PROGRESS
- Started: {timestamp}
```

### Step 1: Detect Stack

Read `package.json` (or `requirements.txt`, `Cargo.toml`, `go.mod`), `.planning/MAP.md`, `.frame/config.json`.

Read `language` field from `.frame/config.json`. All output to the user and the final report must be written in that language (e.g. `ru` → Russian, `en` → English). If `language` is `auto` or missing — use English.

Determine:
- **Runtime**: Node.js / Python / Go / Rust / Java
- **Framework**: React / Next.js / Vue / Nuxt / Svelte / Express / FastAPI / Django / etc.
- **Database**: PostgreSQL / MySQL / MongoDB / Redis / SQLite / none
- **Build tool**: Vite / Webpack / esbuild / Turbopack / none
- **Rendering**: SSR / SSG / SPA / API-only

Output: "Stack: {framework} + {runtime} + {db}. Researching known issues..."

### Step 2: Research Stack-Specific Issues

Use WebSearch to find current known performance pitfalls for the detected stack:
- `"{framework} performance pitfalls 2025"`
- `"{framework} common performance mistakes"`
- `"{runtime} memory leak patterns"`

Focus on non-obvious issues specific to the detected framework version.

Output: "Research complete. Starting audit..."

### Step 3: Universal Audit

Run all checks. Exclude `node_modules`, `.git`, `dist`, `build`, `*.min.js`.

**Heartbeat after each section.**

#### Bundle & Assets

```bash
# Production build files
find . -maxdepth 4 \( -path "*/dist/*.js" -o -path "*/.next/static/*.js" -o -path "*/build/*.js" \) \
  2>/dev/null | grep -v node_modules | xargs ls -la 2>/dev/null | sort -k5 -rn | head -15
```

```bash
# Heavy dependencies
grep -E '"(moment|lodash|jquery|underscore|request|@mui/material|antd)"' package.json 2>/dev/null
```

#### N+1 Queries

```bash
# ORM calls — missing select/include (fetching all fields)
grep -rn --include="*.{ts,tsx,js,jsx,py}" \
  -E '\.(findMany|findFirst|findAll|find)\(' \
  . 2>/dev/null | grep -v node_modules | grep -v '.git/' | grep -v test | grep -v 'select\|include\|fields' | head -20
```

```bash
# Missing pagination on list queries
grep -rn --include="*.{ts,tsx,js,jsx,py,go}" \
  -E '(findMany|findAll|SELECT.*FROM)' \
  . 2>/dev/null | grep -v node_modules | grep -v '.git/' | grep -v test | grep -v 'take\|limit\|LIMIT\|paginate\|skip\|offset' | head -20
```

#### Memory Leaks

```bash
# setInterval/setTimeout without cleanup reference
grep -rn --include="*.{ts,tsx,js,jsx}" \
  -E '(setInterval|setTimeout)\(' \
  . 2>/dev/null | grep -v node_modules | grep -v '.git/' | grep -v test | head -20
```

```bash
# useEffect without cleanup return
grep -rn --include="*.{ts,tsx,jsx}" \
  -E 'useEffect\(' \
  . 2>/dev/null | grep -v node_modules | grep -v '.git/' | grep -v test | head -20
```

```bash
# Global state accumulation
grep -rn --include="*.{ts,tsx,js,jsx}" \
  -E '(global\.|window\.|globalThis\.)[a-zA-Z]+\s*=' \
  . 2>/dev/null | grep -v node_modules | grep -v '.git/' | grep -v test | head -10
```

#### Blocking Operations

```bash
# Sync fs in async context
grep -rn --include="*.{ts,tsx,js,jsx}" \
  -E '(readFileSync|writeFileSync|existsSync|mkdirSync|readdirSync)' \
  . 2>/dev/null | grep -v node_modules | grep -v '.git/' | grep -v test | grep -v 'bin/' | head -20
```

#### Caching

```bash
# Missing cache headers
grep -rn --include="*.{ts,tsx,js,jsx,py,go}" \
  -E '(Cache-Control|ETag|cache-control)' \
  . 2>/dev/null | grep -v node_modules | grep -v '.git/' | grep -v test | head -10
```

```bash
# Repeated fetch calls without memoization
grep -rn --include="*.{ts,tsx,js,jsx}" \
  -E '(fetch|axios\.get)\(' \
  . 2>/dev/null | grep -v node_modules | grep -v '.git/' | grep -v test | head -20
```

#### Rendering (frontend only)

```bash
# Inline object/function creation in JSX props (causes re-renders)
grep -rn --include="*.{ts,tsx,jsx}" \
  -E '(style=\{\{|onClick=\{.*=>|onChange=\{.*=>)' \
  . 2>/dev/null | grep -v node_modules | grep -v '.git/' | grep -v test | head -20
```

```bash
# Large component files
find . \( -name "*.tsx" -o -name "*.jsx" \) 2>/dev/null | \
  grep -v node_modules | grep -v '.git/' | \
  xargs wc -l 2>/dev/null | sort -rn | head -10
```

### Step 4: Stack-Specific Checks

**Next.js** — check for:
```bash
# Native <img> instead of next/image
grep -rn --include="*.{ts,tsx,jsx}" -E '<img ' . 2>/dev/null | grep -v node_modules | grep -v '.git/' | grep -v test | head -10
# getServerSideProps overuse (should be getStaticProps where possible)
grep -rn --include="*.{ts,tsx,js}" -E 'getServerSideProps' . 2>/dev/null | grep -v node_modules | grep -v '.git/' | head -10
```

**Express/Node.js** — check for:
```bash
# Missing compression
grep -rn --include="*.{ts,tsx,js}" -E 'compression' . 2>/dev/null | grep -v node_modules | grep -v '.git/' | head -5
# Sync middleware
grep -rn --include="*.{ts,tsx,js}" -E 'app\.(use|get|post|put|delete)\(' . 2>/dev/null | grep -v node_modules | grep -v '.git/' | grep -v 'async' | head -10
```

**Python** — check for:
```bash
# Sync endpoints (should be async)
grep -rn --include="*.py" -E '^def (get|post|put|delete|patch)_' . 2>/dev/null | grep -v test | head -10
# Django ORM without select_related/prefetch_related
grep -rn --include="*.py" -E '\.objects\.(filter|all)\(' . 2>/dev/null | grep -v test | grep -v 'select_related\|prefetch_related' | head -20
```

### Step 5: Write Report

Create `.planning/reports/performance/PERF_REPORT.md`:

```markdown
# Performance Audit — {date}

## Stack
- Runtime: {runtime}
- Framework: {framework}  
- Database: {db}
- Rendering: {rendering}

## Summary

| Priority | Count |
|----------|-------|
| Critical | {N}   |
| High     | {N}   |
| Medium   | {N}   |
| Low      | {N}   |

**Overall**: CRITICAL | HIGH | MEDIUM | CLEAN

---

## Critical Issues

### [PERF-1] {title}
- **File**: `path/file.ts:42`
- **Category**: N+1 Query | Memory Leak | Blocking | Bundle | Rendering | Caching
- **Impact**: {what slows down and by how much}
- **Root cause**: {why}
- **Fix**: {specific approach}
- **Effort**: XS | S | M | L

---

## High Priority

### [PERF-N] {title}
...

---

## Medium Priority

### [PERF-N] {title}
...

---

## Low / Recommendations

### [PERF-N] {title}
...

---

## Stack-Specific Findings

{Issues from research + stack-specific checks}

---

## Clean Areas
- {areas with no issues}

---

## Recommended Fix Order

1. [PERF-1] {title} — Critical, {effort}
2. [PERF-2] {title} — High, {effort}
...

Run `/frame:perf-fix` to start fixing.
```

### Step 6: Update Memory & STATE.md

If issues found, add to `.planning/memory/anti-patterns.md`:
```markdown
## [PERF-{N}] {title}
- **Date**: {date}
- **Category**: {category}
- **Issue**: {description}
- **Fix**: {approach}
- **Status**: open
```

Update `.planning/STATE.md`:
```markdown
## Current Position
- Phase: PERFORMANCE
- Status: COMPLETE
- Performance Status: {CRITICAL | HIGH | MEDIUM | CLEAN}
- Issues: {total} (Critical: {N}, High: {N}, Medium: {N}, Low: {N})
- Report: .planning/reports/performance/PERF_REPORT.md
```

Output to user:
```
Performance audit complete.
Critical: {N} | High: {N} | Medium: {N} | Low: {N}
Report: .planning/reports/performance/PERF_REPORT.md

Run /frame:perf-fix to fix issues.
```

## Rules

- **NEVER edit code** — audit only
- **ALWAYS research** stack-specific issues before auditing (Step 2)
- **ALWAYS provide** file:line for every finding
- **ALWAYS estimate effort** XS/S/M/L for every fix
- **ALWAYS explain impact** — not just "slow" but "N extra DB queries per request"
- **NEVER flag** test files, node_modules, dist, build
