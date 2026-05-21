# /frame:research -- Domain Research

Analyzes the request, searches for alternatives, explores the codebase, creates research.md with Memory Impact.

## Instructions

Research the following topic: **$ARGUMENTS**

> Use the `researcher` agent for this task. It runs with a fresh context window (200K) to avoid contamination from previous phases.

### Step 0: Fail-fast validation

**Before doing anything**, check:
- `$ARGUMENTS` is not empty — if empty, STOP and ask: "What topic should I research? Usage: /frame:research <topic>"
- `.planning/MAP.md` exists — if missing, STOP: "Run /frame:init first — MAP.md not found."

Then immediately write to `.planning/STATE.md`:
```markdown
## Current Position
- Phase: RESEARCH
- Feature: {topic from $ARGUMENTS}
- Status: IN_PROGRESS
- Started: {timestamp}
```

### Step 1: Analyze the Request

Determine:
- What exactly needs to be researched
- What alternatives may exist
- Constraints: tech, time, budget

### Step 2: Codebase Exploration

Read in this order:

1. `.planning/MAP.md` — project architecture (stack, patterns, key directories). **Must be first.**
2. `.planning/memory/context.md` — current focus and blockers
3. Grep the codebase: `grep -r "{keywords}" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.py" | head -20`
4. Memory files (with staleness check):
   - `.planning/memory/patterns.md` — **ignore entries flagged [stale]**
   - `.planning/memory/decisions.md` — **decisions older than 6 months are context, not constraints**
   - `.planning/memory/dependencies.md` — current stack and Avoid list

**Heartbeat**: after reading memory files, report: "Context loaded, starting web research..."

### Step 3: Web Research

WebSearch is **required** if at least one condition is met:
- Topic involves external APIs/libraries (versions, limits, pricing)
- No entry for the topic in `dependencies.md`
- No relevant pattern in `patterns.md`

WebSearch is **not needed** only if:
- Topic is about internal architecture (own code, own patterns)
- Pattern already exists in memory with `confidence: high`

Check: alternative libraries, latest versions, limits, best practices.

**Heartbeat**: after web research, report: "Research complete, writing research.md..."

### Step 4: Create research.md

Create `docs/specs/{topic}/research.md`:

```markdown
# Research: {Topic}

## Overview
{Brief description of what is being researched}

## Current State
{What already exists in the project}

## Alternatives

### Option 1: {name}
- **Pros**: {advantages}
- **Cons**: {disadvantages}
- **Effort**: {estimate}
- **Risk**: {risks}

### Option 2: {name}
- **Pros**: {advantages}
- **Cons**: {disadvantages}
- **Effort**: {estimate}
- **Risk**: {risks}

## Recommendation
{Recommendation with justification}

## Requirements
- {functional requirement 1}
- {functional requirement 2}

## Architecture
{High-level description of the chosen approach}

## API Design
{Key interfaces, endpoints, or data structures}

## References
- {links to documentation}

## Memory Impact
<!-- Retrospective reads this section to decide what to persist. Fill it now while context is fresh. -->
- patterns.md: {proposed pattern if found, otherwise "none"}
- decisions.md: {proposed decision if made, otherwise "none"}
- dependencies.md: {new dependencies if any, otherwise "none"}
```

**Rule**: minimum 2 alternatives. Research without alternatives is incomplete.

**Do not create spec.md** — that is the responsibility of `/frame:plan`.

### Step 5: Update STATE.md (phase complete)

```markdown
## Current Position
- Phase: RESEARCH
- Feature: {topic}
- Status: COMPLETE
- Started: {timestamp from step 0}
- Completed: {timestamp}
```

## Result

- `docs/specs/{topic}/research.md` — research findings with Memory Impact
- `.planning/STATE.md` updated (COMPLETE)
- Next phase: `/frame:plan` (takes research.md as input, creates spec.md and plan.md)
