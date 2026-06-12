---
description: "Analyze performance budget: bundle size, runtime metrics, baseline comparison"
argument-hint: "[bundle | baseline | compare]"
---
# /frame:performance -- Performance Budget

Performance monitoring and bundle analysis.

## Subcommands

---

### `/frame:performance bundle` -- Bundle Analysis

### Step 0: Validate prerequisites

Check `.frame/config.json` exists:
```bash
test -f .frame/config.json || echo "MISSING"
```

If missing → **STOP**:
```
❌ .frame/config.json not found. Run /frame:init first.
```

Update STATE.md:
```markdown
## Current Position
- Phase: REVIEW
- Status: Bundle analysis IN_PROGRESS
- Started: {timestamp}
```

### Step 1: Build

```bash
{quality.commands.build} 2>&1 | tail -20
```

### Step 2: Bundle size

Detect tool from `package.json`:

```bash
# Next.js
ls -la .next/static/chunks/ 2>/dev/null | sort -k5 -rn | head -10

# Vite
ls -la dist/assets/ 2>/dev/null | sort -k5 -rn | head -10

# Universal
find dist .next build -name "*.js" 2>/dev/null | xargs ls -la | sort -k5 -rn | head -10
```

### Step 3: Compare against limits

Read `.frame/config.json` → `performance` section:
- `maxBundleSize` (default: 200KB)
- `maxFirstLoadJS` (default: 85KB)

If `{quality.commands.bundle}` is set in config — use it instead of step 2.

Calculate percentage of limit and determine level:
- < 90% of limit → PASS
- 90–120% of limit → WARNING
- > 120% of limit → FAIL

### Step 4: Update STATE.md

```markdown
## Current Position
- Phase: REVIEW
- Status: Bundle analysis complete — {PASS|WARNING|FAIL}
```

---

### `/frame:performance audit` -- Full Performance Audit

### Step 0: Validate prerequisites

Check `.frame/config.json` exists:
```bash
test -f .frame/config.json || echo "MISSING"
```

If missing → **STOP**:
```
❌ .frame/config.json not found. Run /frame:init first.
```

### Step 1: Update STATE.md

```markdown
## Current Position
- Phase: REVIEW
- Status: Performance audit IN_PROGRESS
- Started: {timestamp}
```

### Step 2: Bundle analysis

Run all steps from `/frame:performance bundle`.

**Heartbeat**: Output after each sub-step completes — build, size scan, comparison.

### Step 3: Runtime metrics

Check for available tools:

```bash
# Lighthouse CLI (if installed)
npx lighthouse {url} --output=json --quiet 2>/dev/null | grep -E '"score"|"numericValue"' | head -20
```

**Heartbeat**: If Lighthouse takes > 30s — output: `Lighthouse running... ({url})`

If Lighthouse is unavailable — note in report: "Check manually in Chrome DevTools → Lighthouse".

Target values:
- CLS < 0.1
- INP < 200ms
- LCP < 2.5s
- Lighthouse Performance > 90

### Step 4: Code review for performance anti-patterns

- No N+1 queries in critical paths
- No memory leaks (unclosed subscriptions, timers)
- Correct caching (HTTP headers, memoization)
- No blocking operations on the main thread

### Step 5: Create report

Create `.planning/reports/performance/PERF_REPORT.md`:

```markdown
# Performance Report -- {date}

## Status: PASS | WARNING | FAIL

## Bundle
- Size: {size} / {maxBundleSize}
- First Load JS: {size} / {maxFirstLoadJS}
- Level: PASS | WARNING | FAIL

## Runtime Metrics
- CLS: {score} / 0.1 — {PASS|FAIL|not checked}
- INP: {ms} / 200ms — {PASS|FAIL|not checked}
- LCP: {ms} / 2500ms — {PASS|FAIL|not checked}
- Lighthouse: {score} / 90 — {PASS|FAIL|not checked}

## Anti-patterns
- {issues found or "none detected"}

## Enforce Level: {strict|warning|advisory}

## Recommendations
- {specific optimization suggestions}
```

### Step 6: Update memory files

If anti-patterns were found in Step 4:
- Add to `.planning/memory/anti-patterns.md`: each issue with context

If new optimization patterns were confirmed:
- Add to `.planning/memory/patterns.md`: the pattern and why it worked

### Step 7: Update STATE.md

```markdown
## Current Position
- Phase: REVIEW
- Status: Performance audit complete — {PASS|WARNING|FAIL}
- Report: .planning/reports/performance/PERF_REPORT.md
```

---

### `/frame:performance check` -- Quick Check

Quick bundle size check without full audit.

### Step 0: Validate prerequisites

Check `.frame/config.json` exists:
```bash
test -f .frame/config.json || echo "MISSING"
```

If missing → **STOP**:
```
❌ .frame/config.json not found. Run /frame:init first.
```

Update STATE.md:
```markdown
## Current Position
- Phase: REVIEW
- Status: Quick performance check IN_PROGRESS
- Started: {timestamp}
```

### Step 1: Check

```bash
{quality.commands.build} 2>&1 | grep -E "(Bundle|First Load|chunk|dist|kB|KB)"
```

Compare output against limits from `.frame/config.json` → `performance` and output: PASS / WARNING / FAIL.

### Step 2: Update STATE.md

```markdown
## Current Position
- Phase: REVIEW
- Status: Quick performance check complete — {PASS|WARNING|FAIL}
```

---

## Enforce Levels

| Level | Behavior |
|-------|----------|
| strict | > limit = BLOCKED, cannot Ship |
| warning | > limit = WARNING, can Ship |
| advisory | > limit = INFO, does not block |

Default: `warning`
