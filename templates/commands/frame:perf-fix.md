---
description: "Fix performance issues from PERF_REPORT.md — critical issues by default"
argument-hint: "[all | critical | high | <PERF-N>]"
---
# /frame:perf-fix -- Performance Fix

Fix performance issues from PERF_REPORT.md. Reads the report, proposes fixes, asks confirmation, applies.

## Subcommands

- `/frame:perf-fix` — fix all Critical issues
- `/frame:perf-fix all` — fix Critical + High
- `/frame:perf-fix PERF-1` — fix specific issue by ID
- `/frame:perf-fix critical` — fix Critical only (alias for no-args)
- `/frame:perf-fix high` — fix High priority issues

## Instructions

### Step 0: Fail-fast

```bash
test -f .frame/config.json || echo "MISSING"
test -f .planning/reports/performance/PERF_REPORT.md || echo "NO_REPORT"
```

If `.frame/config.json` missing → STOP: "❌ Run /frame:init first."

If `PERF_REPORT.md` missing → STOP: "❌ No performance report found. Run /frame:perf-audit first."

Read `language` field from `.frame/config.json`. All output to the user must be written in that language. If `language` is `auto` or missing — use English.

### Step 1: Read Report

Read `.planning/reports/performance/PERF_REPORT.md`.

Parse issues based on `$ARGUMENTS`:
- Empty or `critical` → collect all `## Critical Issues` entries
- `all` → collect Critical + High entries
- `high` → collect `## High Priority` entries only
- `PERF-N` → find that specific issue ID

Output: "Found {N} issues to fix: {list of IDs and titles}."

### Step 2: Group Issues into Waves

Before applying any fixes, analyze all issues and group them into waves:

- **Wave 1**: issues in different files with no shared dependencies — apply all in this wave
- **Wave 2**: issues that depend on Wave 1 changes (same module, shared types, etc.)
- **Wave N**: remaining issues

Output:
```
Wave 1 ({N} issues — independent): PERF-1, PERF-3, PERF-5
Wave 2 ({N} issues — depend on wave 1): PERF-2, PERF-4
```

### Step 3: Apply Wave by Wave

For each wave:

1. Apply all fixes in the wave (read file → apply change for each issue)
2. Output before each fix:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[PERF-1] {title}
File: path/file.ts:42
Applying: {1 sentence}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
3. After all fixes in the wave, run typecheck + tests once:
```bash
{quality.commands.typecheck} 2>&1 | tail -10
{quality.commands.test} 2>&1 | tail -20
```

If typecheck or tests fail → revert all fixes from this wave, report what broke, ask user how to proceed. Then continue to next wave.

Output after wave: "✓ Wave {N} complete: {list of fixed IDs}."

### Step 4: Summary

After all waves processed, output summary:
```
Performance fixes complete.
Fixed: {N} | Skipped: {N}

{list of fixed issue IDs and titles}

Run /frame:perf-audit to verify improvements.
```

### Step 5: Update Report & Memory

Mark fixed issues in `.planning/reports/performance/PERF_REPORT.md`:
- Add `✓ FIXED — {date}` line under each resolved issue

Update `.planning/memory/anti-patterns.md` — change `Status: open` to `Status: fixed` for resolved issues.

Update `.planning/STATE.md`:
```markdown
## Current Position
- Phase: PERFORMANCE
- Status: COMPLETE
- Fixes applied: {N}
- Remaining issues: {N}
```

## Rules

- **ALWAYS show what's being fixed** before applying (issue ID, file, one-line description)
- **NEVER ask confirmation** — apply all found issues automatically
- **ALWAYS run typecheck + tests** after each fix
- **REVERT on failure** — if tests break, undo the change immediately
- **NEVER fix test files** — only production code
- **NEVER refactor beyond the fix** — change only what's needed for the performance issue
