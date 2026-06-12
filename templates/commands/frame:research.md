---
description: "Domain research: clarification gate, parallel codebase + web scouting, new research.md with Decision Log cycle"
argument-hint: "<topic or question>"
allowed-tools: [Read, Write, Bash]
---
# /frame:research -- Domain Research

Analyzes the request, asks clarifying questions if needed, runs parallel codebase + web scouting, creates research.md. After writing research.md stays available for a chat-driven clarification loop that updates the Decision Log.

## Instructions

Research the following topic: **$ARGUMENTS**

### Step 0: Fail-fast validation

**Before doing anything**, check:
- `$ARGUMENTS` is not empty — if empty, STOP: "What topic should I research? Usage: /frame:research <topic>"
- `.planning/MAP.md` exists — if missing, STOP: "Run /frame:init first — MAP.md not found."

Update `.planning/STATE.md`:
```markdown
## Current Position
- Phase: RESEARCH
- Feature: {topic from $ARGUMENTS}
- Status: IN_PROGRESS
- Started: {timestamp}
```

### Step 0.5: Clarification gate

Before any research, assess if the request is ambiguous:

**If request is ambiguous** (scope unclear, users undefined, conflicting constraints, architecture choices to make) — ask up to 3–5 questions in ONE block:
```
Before I start researching, a few quick questions:
1. {Scope question}
2. {User/constraints question}
3. {Architecture/choice question}
(skip any you already know the answer to)
```

Wait for user answers. Record answers in research.md `## Clarifications` section.

**If request is clear** — explicitly list your assumptions in one short paragraph and proceed immediately without waiting. Example: "I'm assuming this is for the existing Node.js API, targeting only authenticated users, no external dependencies preferred."

### Step 1: Parallel scouting

Launch two scouts simultaneously (one message):

**codebase-scout** (`researcher` agent, scope=codebase):
- Read MAP.md, memory files, grep relevant code
- Document: what already exists, current patterns, related code

**web-scout** (`researcher` agent, scope=web):
- Search for alternatives, versions, limits, best practices, known issues
- Document: alternatives with Pros/Cons/Effort/Risk, sources

> **Exception**: if topic is purely internal (own code, own patterns, no external deps) — skip web-scout, run codebase-scout inline without a subagent.

**Heartbeat**: "Scouts launched. Waiting for results..."

After both scouts complete, synthesize their findings.

### Step 2: Create research.md

Create `docs/specs/{topic}/research.md`:

```markdown
# Research: {Topic}

## Overview
{Brief description of what is being researched}

## Clarifications
{Answers to clarifying questions, or "No clarifications needed — assumed: {assumptions}"}

## Current State
{What already exists in the project — from codebase-scout}

## Alternatives

### Option 1: {name}
- **Pros**: {advantages}
- **Cons**: {disadvantages}
- **Effort**: {estimate}
- **Risk**: {risk level}

### Option 2: {name}
- **Pros**: {advantages}
- **Cons**: {disadvantages}
- **Effort**: {estimate}
- **Risk**: {risk level}

## Recommendation
{Recommendation with justification. For external deps/architecture — min 2 alternatives required.
For purely internal features — 1 approach + reason alternatives not considered is acceptable.}

## Requirements
R1. {Functional requirement 1}
R2. {Functional requirement 2}
...
(numbered R1, R2, ... — used for traceability in plan and review)

## Acceptance Criteria
AC1. Given {context}, when {action}, then {outcome}
AC2. {Error path: what happens when X fails}
...
(numbered AC1, AC2, ... — measurable, include error paths)

## Out of Scope
{Things explicitly NOT included — always present, even if just "nothing excluded"}

## Edge Cases
{Boundary conditions, errors, concurrency, empty collections, large inputs}

## Architecture
{High-level description of the chosen approach}

## API Design
{Key interfaces, endpoints, or data structures}

## Open Questions
{Questions that must be answered before planning. Empty = ready for /frame:plan.}

## Decision Log
{Decisions made during the research-and-chat phase. Append-only.}

## References
{Links to documentation, articles, sources}

## Memory Impact
<!-- Retrospective reads this section to decide what to persist. Fill it now while context is fresh. -->
- learnings.md Patterns: {proposed pattern if found, otherwise "none"}
- learnings.md Decisions: {proposed decision if made, otherwise "none"}
- dependencies.md: {new dependencies if any, otherwise "none"}
```

**Rule**: Requirements must be numbered R1, R2... and Acceptance Criteria AC1, AC2... — this numbering is the foundation for traceability in `/frame:plan` and `/frame:review`.

**Do not create spec.md** — that is the responsibility of `/frame:plan`.

### Step 3: Chat clarification loop (Decision Log)

After writing research.md, show the user:
```
Research complete. Here's what I found:

**Recommendation**: {one sentence}
**Open Questions**: {list, or "None — ready to plan"}

Want to discuss? I'll record all decisions in the Decision Log.
Next: /frame:plan {topic}
```

Then stay available. For each substantive decision made in conversation:
1. **Immediately** append to `## Decision Log` in research.md:
   ```markdown
   ### {date} — {short title}
   - **Context**: {what was being decided}
   - **Decision**: {what was decided}
   - **Reason**: {why}
   ```
2. Update affected sections (`## Requirements`, `## Architecture`, `## Out of Scope`) to reflect the decision
3. Clear answered questions from `## Open Questions`

Before the session ends: show the diff of what changed in research.md since Step 2.

### Step 4: Update STATE.md (complete)

```markdown
## Current Position
- Phase: RESEARCH
- Feature: {topic}
- Status: COMPLETE
- Started: {timestamp from step 0}
- Completed: {timestamp}
```

## Rules

- **Clarify before researching** — ambiguous requests get questions first
- **Parallel scouts** — codebase and web run simultaneously
- **Number requirements and ACs** — R1, R2, AC1, AC2 — non-negotiable
- **Out of Scope always present** — even if empty
- **Decision Log is append-only** — never edit or delete entries
- **Open Questions blocks plan** — `/frame:plan` will fail if any unanswered
- **Min 2 alternatives** — for external deps and architecture choices; internal features: 1 + rationale

## Result

- `docs/specs/{topic}/research.md` — research with numbered requirements, ACs, Decision Log
- `.planning/STATE.md` updated (COMPLETE)
- Next phase: `/frame:plan` (reads research.md, creates spec.md and plan.md)
