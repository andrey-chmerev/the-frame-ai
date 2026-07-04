---
description: "Morning briefing — project status, today's priorities, and blockers"
argument-hint: "[full]"
allowed-tools: [Read, Bash]
---
# /frame:daily -- Morning Briefing

> **Start here** after any break. This is your single entry point for daily orientation.
> Use `/frame:daily full` for a complete technical dump (git, memory, blockers, ROADMAP, CONTEXT.md).

### Routing

- (no args) — compact daily standup: yesterday's commits, current phase/tasks, next step
- `full` — full status dump: STATE.md + ROADMAP + CONTEXT.md + memory + git + blockers

One-call daily standup: what was done, what's next, any blockers.

## Instructions

### Step 1: Git activity (yesterday)

```bash
git log --oneline --since="yesterday" --until="now" -n 30
git log --oneline --since="2 days ago" --until="yesterday" -n 30
```

### Step 2: Read planning files

Read in order:
- `.planning/STATE.md` — current phase, feature, tasks
- `.planning/ROADMAP.md` — upcoming milestones (first 30 lines)
- `.planning/memory/context.md` — blockers and current focus

### Step 2.5: Security audit staleness check

```bash
LAST_SECURITY=$(ls .planning/reports/security/security-*.md 2>/dev/null | sort | tail -1)
if [ -z "$LAST_SECURITY" ]; then
  echo "SECURITY_STATUS=never"
else
  LAST_DATE=$(basename "$LAST_SECURITY" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}')
  DAYS_AGO=$(( ( $(date +%s) - $(date -d "$LAST_DATE" +%s 2>/dev/null || date -j -f "%Y-%m-%d" "$LAST_DATE" +%s) ) / 86400 ))
  echo "SECURITY_STATUS=${DAYS_AGO}d ago"
fi
```

If `SECURITY_STATUS=never` or `DAYS_AGO >= 7` → add to briefing output:
```
⚠️  Security: {never run | last run {N} days ago} — consider /frame:audit quick
```

### Step 2.7: Parallel board (if present)

```bash
[ -f .planning/BOARD.md ] && grep -c "| active |" .planning/BOARD.md || echo "NO_BOARD"
```

If the board exists and has `active` rows, read `.planning/BOARD.md` and add a section to the briefing (one line per active task: feature, phase, progress). If all active tasks are at REVIEW/TEST + approve — the action item becomes `/frame:integrate`.

### Step 3: Check open tasks

If plan.md exists for current feature:
```bash
find docs/specs -name "plan.md" | head -3
```
Count `[ ]` (open) vs `[x]` (done) tasks.

### Step 4: Output briefing

```
╔══════════════════════════════════════════╗
║  FRAME DAILY — {date}                    ║
╠══════════════════════════════════════════╣
║  Yesterday:                              ║
║    {commit 1}                            ║
║    {commit 2}                            ║
║    (or "No commits yesterday")           ║
╠══════════════════════════════════════════╣
║  Current:                                ║
║    Phase:   {phase}                      ║
║    Feature: {feature}                    ║
║    Tasks:   {done}/{total} done          ║
╠══════════════════════════════════════════╣
║  Next up:                                ║
║    {next unchecked task or next phase}   ║
╠══════════════════════════════════════════╣
║  Parallel:  {active board rows or omit}  ║
║    auth     BUILD   4/7                  ║
║    billing  REVIEW  approve              ║
╠══════════════════════════════════════════╣
║  Blockers:  {blockers or "None"}         ║
╠══════════════════════════════════════════╣
║  Security:  {last audit date or "⚠️ never run"} ║
╠══════════════════════════════════════════╣
║  Roadmap:   {next milestone}             ║
╚══════════════════════════════════════════╝
```

### Step 5: Action item

After the briefing box, always output one line:

```
→ Run: {command} — {one-line reason}
```

Pick the command based on context:
- Board active tasks all at REVIEW/TEST + approve → `/frame:integrate`
- Has open tasks in plan.md → `/frame:build`
- No plan.md yet → `/frame:research` or `/frame:fast`
- Has blockers → `/frame:unstuck`
- Phase is REVIEW → `/frame:review`
- Phase is SHIP → `/frame:ship`

---

## Mode: full (deep status dump)

Triggered by: `/frame:daily full`

Provides everything from the compact mode plus full technical state — full project overview in one call.

### Step F1: Read all planning files

Read in order:
- `.planning/STATE.md` — current phase, feature, task progress, blockers, latest commit
- `.planning/ROADMAP.md` — milestones, upcoming plans
- `.planning/CONTEXT.md` (if exists) — active feature, key files, tech context
- `.planning/memory/context.md` — current focus, health
- `.planning/memory/learnings.md` `## Patterns > ### Core` — confidence levels summary

Check for blocked tasks:
```bash
grep -i "BLOCKED" .planning/ROADMAP.md 2>/dev/null
grep -i "BLOCKED" docs/specs/*/plan.md 2>/dev/null | head -10
```

### Step F2: Git status and recent history

```bash
git status
git log --oneline -5
git diff HEAD~3 --stat 2>/dev/null || git diff --stat
git log --oneline --since="3 days ago" -n 50
```

### Step F3: Output full status

```
============================================================
                    FRAME STATUS
============================================================

  Phase:     {current phase}
  Feature:   {current feature}
  Tasks:     {completed}/{total}
  Commit:    {hash}
  Milestone: {milestone from ROADMAP or "—"}

============================================================
  BLOCKERS:
  {list of BLOCKED tasks from plan.md and ROADMAP.md, or "none"}

============================================================
  CONTEXT:
  {active feature + key files from CONTEXT.md, or "—"}

============================================================
  MEMORY:
  {brief summary from memory/context.md and learnings.md Core patterns, or "—"}

============================================================
  GIT (last 3 days):
  {git log --since=3 days ago, oneline}
  {changed files stat}

============================================================
  GIT STATUS:
  {git status --short}

============================================================
```

End with one `→ Run:` action item (same logic as compact mode).

---

## Rules

- Output only — no file writes
- Compact mode: max 35 lines
- Full mode: no line limit, show everything
- If STATE.md missing: "Run /frame:init first"
- Always end with the `→ Run:` action item — never leave without a concrete next command
