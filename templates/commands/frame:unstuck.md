# /frame:unstuck -- Get Unblocked

When you're stuck on a task, feature, or decision and don't know how to proceed.

## Instructions

### Step 1: Understand the block

Ask if not provided: "What are you stuck on? Describe the problem in one sentence."

Read:
- `.planning/STATE.md` — current phase, feature, task
- `.planning/memory/context.md` — active blockers
- `.planning/memory/anti-patterns.md` — known traps

```bash
git log --oneline -5
git diff --stat HEAD~3..HEAD 2>/dev/null | tail -5
```

### Step 2: Classify the block

Determine which type:
- **Technical** — don't know how to implement something
- **Decision** — two+ valid approaches, can't choose
- **Scope creep** — task grew beyond original estimate
- **External** — waiting on something outside your control
- **Motivation** — overwhelmed, lost context, don't know where to start

### Step 3: Check memory for prior solutions

```bash
grep -i "{keywords from block}" .planning/memory/decisions.md 2>/dev/null | head -5
grep -i "{keywords from block}" .planning/memory/anti-patterns.md 2>/dev/null | head -5
grep -i "{keywords from block}" .planning/memory/patterns.md 2>/dev/null | head -5
```

### Step 4: Output 3 options

Always give exactly 3 options, ordered from least to most disruptive:

```
╔══════════════════════════════════════════╗
║  FRAME UNSTUCK                           ║
╠══════════════════════════════════════════╣
║  Block: {one-line description}           ║
║  Type:  {Technical/Decision/Scope/...}   ║
╠══════════════════════════════════════════╣
║  Option 1 — Smallest step               ║
║    {concrete action, < 30 min}           ║
║    → {command to run}                    ║
╠══════════════════════════════════════════╣
║  Option 2 — Reframe                     ║
║    {different angle or scope reduction}  ║
║    → {command to run}                    ║
╠══════════════════════════════════════════╣
║  Option 3 — Reset                       ║
║    {rollback / simplify / skip for now}  ║
║    → {command to run}                    ║
╚══════════════════════════════════════════╝
```

Option templates by block type:

**Technical:**
1. Find a working example in the codebase → `/frame:why`
2. Spike a minimal proof-of-concept → `/frame:fast`
3. Simplify the requirement → `/frame:plan`

**Decision:**
1. Pick the option with fewer dependencies and proceed
2. Run devil's advocate on both options → use `@devils-advocate` agent
3. Time-box 30 min on option A, then decide → `/frame:fast`

**Scope creep:**
1. Cut to the original requirement, defer extras → `/frame:add-task`
2. Re-estimate and update plan → `/frame:estimate`
3. Checkpoint and start fresh sub-task → `/frame:checkpoint` then `/frame:fast`

**External:**
1. Document the blocker and work on something else → `/frame:note anti: waiting on {X}`
2. Mock/stub the external dependency → `/frame:fast`
3. Escalate or find a workaround

**Motivation:**
1. Run `/frame:daily` to rebuild context
2. Pick the smallest open task → `/frame:fast`
3. Take a break, set a 25-min timer, come back to `/frame:build`

### Step 5: Save blocker to context

Append to `.planning/memory/context.md` under `## Active Blockers`:
```
- {date}: {block description} — {chosen option}
```

## Rules

- Always give exactly 3 options
- Options must be concrete — no vague advice
- Option 1 must be actionable in < 30 min
- No code changes
