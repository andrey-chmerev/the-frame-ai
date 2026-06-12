---
description: "Estimate task complexity and time based on codebase context and past sessions"
argument-hint: "<task description>"
allowed-tools: [Read, Bash]
---
# /frame:estimate -- Task Estimation

**Task:** $ARGUMENTS

Quick pre-planning estimate: scope, risks, time. Helps decide whether to start now.

## Instructions

### Step 0: Fail-fast

If `$ARGUMENTS` is empty, STOP: "What do you want to estimate? Usage: /frame:estimate <task description>"

### Step 1: Read project context

```bash
find . -name "*.ts" -o -name "*.js" -o -name "*.py" -o -name "*.go" | grep -v node_modules | grep -v .git | wc -l
```

Read:
- `.planning/MAP.md` — architecture, key directories
- `.planning/memory/context.md` — current focus, blockers
- `.planning/memory/learnings.md` `## Patterns > ### Core` section only

### Step 2: Scope analysis

Estimate which files/modules will be touched:
```bash
grep -r "{keywords}" --include="*.ts" --include="*.js" -l | head -20
```

Count: files likely affected, modules involved, external dependencies needed.

### Step 3: Risk assessment

| Factor | Low | Medium | High |
|--------|-----|--------|------|
| Files touched | 1-3 | 4-8 | 9+ |
| New dependencies | 0 | 1 | 2+ |
| Touches auth/data/core | No | Partially | Yes |
| Has existing tests | Yes | Partial | No |

### Step 4: Historical calibration

Check git log for completed tasks of similar scope:

```bash
git log --oneline --since="90 days ago" 2>/dev/null | head -20
```

If comparable tasks are visible in git history, note rough delivery cadence to calibrate estimate confidence.

### Step 5: Output

Based on scope and risk:
- **XS** (< 30 min): 1-2 files, no new deps, clear pattern exists
- **S** (30-60 min): 2-4 files, minor changes, pattern exists
- **M** (1-3 hours): 4-8 files, some new logic, 1 new dep
- **L** (3-8 hours): 8+ files, new architecture, multiple deps
- **XL** (1+ day): cross-cutting change, new subsystem

### Step 6: Output

```
╔══════════════════════════════════════════╗
║  FRAME ESTIMATE                          ║
╠══════════════════════════════════════════╣
║  Task:     {task description}            ║
╠══════════════════════════════════════════╣
║  Scope:                                  ║
║    Files:  ~{N} files affected           ║
║    Modules: {list}                       ║
╠══════════════════════════════════════════╣
║  Risks:                                  ║
║    {risk 1}                              ║
║    {risk 2}                              ║
╠══════════════════════════════════════════╣
║  Estimate: {XS/S/M/L/XL} ({time range}) ║
║  Confidence: {low/medium/high}           ║
╠══════════════════════════════════════════╣
║  Recommendation:                         ║
║    {start now / break down / research}   ║
╚══════════════════════════════════════════╝
```

**Recommendation rules**:
- XS/S → "Start now with /frame:fast"
- M → "Start with /frame:research then /frame:plan"
- L/XL → "Break into smaller tasks first"
- Any HIGH risk → "Run /frame:research first"

## Rules

- No code changes
- If MAP.md missing: estimate based on task description only, note low confidence
