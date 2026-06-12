---
description: "Morning briefing — project status, today's priorities, and blockers"
allowed-tools: [Read, Bash]
---
# /frame:daily -- Morning Briefing

> **Start here** after any break. This is your single entry point — replaces `/frame:where` and `/frame:status` for daily use.
> Use `/frame:status` only when you need a full technical dump (git, memory, blockers).

One-call daily standup: what was done, what's next, any blockers.

## Instructions

### Step 1: Git activity (yesterday)

```bash
git log --oneline --since="yesterday" --until="now"
git log --oneline --since="2 days ago" --until="yesterday"
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
⚠️  Security: {never run | last run {N} days ago} — consider /frame:security
```

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
- Has open tasks in plan.md → `/frame:build`
- No plan.md yet → `/frame:research` or `/frame:fast`
- Has blockers → `/frame:unstuck`
- Phase is REVIEW → `/frame:review`
- Phase is SHIP → `/frame:ship`

## Rules

- Output only — no file writes
- Max 35 lines
- If STATE.md missing: "Run /frame:init first"
- Always end with the `→ Run:` action item — never leave without a concrete next command
