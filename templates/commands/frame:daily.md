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
