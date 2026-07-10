---
description: "Domain research: clarification gate, size scaling, parallel codebase + web scouting with source-quality protocol, dependency passports, devil's-advocate stress-test, new research.md with Decision Log cycle"
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

### Step 0.6: Size the research (effort scaling)

Match effort to the question — don't run a full fan-out on a trivial lookup, don't under-research an architecture choice. Classify:

| SIZE | Trigger | How to run |
|------|---------|-----------|
| **quick** | Internal/factual question, own code, no external deps, answerable from memory + a grep | Run codebase-scout **inline** (no subagents), skip web-scout. Minimal research.md (Overview, Current State, Recommendation, Requirements, ACs, Out of Scope). |
| **standard** | One feature, maybe one new dependency, bounded scope | The two parallel scouts below (Step 1), single web-scout. **Default.** |
| **deep** | New external dependency, architecture choice, or several unknowns | **Fan-out**: decompose the topic into 3–5 concrete sub-questions, launch one web-scout per sub-question (max 4) in parallel, each with its own objective + output format + boundary. Then synthesize. |

State the chosen SIZE in one line before proceeding: "Research size: {quick|standard|deep} — {reason}."

For **deep**, write the sub-question list explicitly, e.g.:
```
Sub-questions:
Q1. {narrow question} — objective: {what a good answer contains}
Q2. ...
```
Each becomes a separate web-scout brief.

### Step 1: Parallel scouting

> **quick** SIZE: skip this step's subagents — run codebase-scout inline, no web-scout.

Launch the scouts simultaneously (one message). For **deep** SIZE, launch one web-scout per sub-question from Step 0.6 (max 4) alongside the single codebase-scout.

**codebase-scout** (`researcher` agent, scope=codebase):
- Read MAP.md, memory files, grep relevant code
- **Reuse prior research**: `grep -ril "{keywords}" docs/specs/*/research.md` — a research.md <3 months old is a source, older is a lead
- Document: what already exists, current patterns, related code

**web-scout** (`researcher` agent, scope=web):
- **Brief includes the project stack**: paste the tech stack from MAP.md + relevant versions and the Avoid-list from `dependencies.md`, so the web search targets the project's actual versions (codebase-first → web-second) and never re-proposes rejected tools.
- Follow the web protocol in the researcher agent: source hierarchy, broad→narrow, date-stamping, min-2-sources, adversarial query, anti-hallucination (verify every package/version against the registry), Dependency Passport for each recommended dep.
- Document: alternatives with Pros/Cons/Effort/Risk, **each claim with a dated source**.

> **Exception**: if topic is purely internal (own code, own patterns, no external deps) — this is **quick** SIZE; skip web-scout, run codebase-scout inline without a subagent.

**Heartbeat**: "Scouts launched. Waiting for results..."

After all scouts complete, synthesize their findings.

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

**Confidence**: {HIGH | MEDIUM | LOW} — {one line why}
<!-- HIGH = 3+ independent sources agree · MEDIUM = 1 source · LOW = weak/conflicting.
     MEDIUM/LOW MUST create an Open Question (if it blocks planning) or a Research Flag (if resolvable later). -->

## Dependency Passport
<!-- One block per recommended external dependency. Omit the whole section only if there are no external deps. -->
### {package}@{pinned version}
- **Last release**: {date} {🟡 if >12 months}
- **Downloads trend**: {rising | flat | falling}
- **Deprecated**: {no | yes 🔴}
- **Security**: {no open GHSA/CVE | list 🔴}
- **Maintenance**: last human commit {date}, maintainers answer issues {yes/no}, bus factor {n}
- **Verdict**: {adopt | adopt-with-caution | avoid} — {reason}

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

## Pitfalls
{Known gotchas of the *chosen technology/approach* (not the product) — each with a source link.
Read by /frame:plan when decomposing risks. "None found" is a valid entry.}

## Architecture
{High-level description of the chosen approach}

## API Design
{Key interfaces, endpoints, or data structures}

## Open Questions
{Questions that must be answered before planning. Empty = ready for /frame:plan. BLOCKS /frame:plan.}

## Research Flags
{Non-blocking gaps — things to verify later, tagged with the phase that resolves them.
Does NOT block /frame:plan; /frame:plan folds each into the relevant task.
Format: "- [{plan|build}] {gap to resolve}". "None" is valid.}

## Decision Log
{Decisions made during the research-and-chat phase. Append-only.}

## References
{One line per claim: "{claim} — {URL} ({publication date}, {official|blog|community})".
Key numbers/limits cited in Alternatives must carry a source. Only cite sources actually opened this session.}

## Memory Impact
<!-- Retrospective reads this section to decide what to persist. Fill it now while context is fresh. -->
- learnings.md Patterns: {proposed pattern if found, otherwise "none"}
- learnings.md Decisions: {proposed decision if made, otherwise "none"}
- dependencies.md: {new dependencies if any, otherwise "none"}
```

**Rule**: Requirements must be numbered R1, R2... and Acceptance Criteria AC1, AC2... — this numbering is the foundation for traceability in `/frame:plan` and `/frame:review`.

**Do not create spec.md** — that is the responsibility of `/frame:plan`.

### Step 2.5: Stress-test the Recommendation (external deps / architecture only)

The Recommendation is the most expensive decision in the pipeline, yet it's the only phase with no adversarial check. For **external-dependency or architecture** recommendations (skip for purely internal features):

Launch a `devils-advocate` subagent in **refute mode** with the recommendation as the finding to refute:
> "Try to refute this technical choice: **{recommendation}**. What breaks? What wasn't considered? What's the strongest reason to pick a different option? Default to NOT refuted unless you find concrete evidence."

Apply the verdict:
- **Not refuted** → keep the Recommendation; confidence may stay/rise to HIGH.
- **Refuted with concrete evidence** → move the concern into `## Open Questions` (it now blocks plan) and lower confidence. Do not silently override — surface it.

**Heartbeat**: "Recommendation passed to devil's advocate for a refute check..."

### Step 3: Chat clarification loop (Decision Log)

After writing research.md, show the user:
```
Research complete. Here's what I found:

**Recommendation**: {one sentence}
**Open Questions**: {list, or "None — ready to plan"}

Want to discuss? I'll record all decisions in the Decision Log.
Next: /frame:plan {topic}
      (or /frame:auto {topic} — plan → build → review → fix → ship unattended, one confirmation)
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
- **Size the research** — quick/standard/deep; don't fan out on trivia, don't under-research architecture
- **Parallel scouts** — codebase and web run simultaneously; deep = one web-scout per sub-question
- **Codebase-first, web-second** — web-scout brief carries the project stack + Avoid-list
- **Verify versions & packages against the registry** — never state them from memory (anti-slopsquatting)
- **Dependency Passport** — every recommended external dep gets a health snapshot
- **Recommendation carries confidence** — MEDIUM/LOW spawns an Open Question or Research Flag
- **Stress-test external/architecture picks** — devil's advocate refute pass (Step 2.5)
- **Number requirements and ACs** — R1, R2, AC1, AC2 — non-negotiable
- **Out of Scope always present** — even if empty
- **Decision Log is append-only** — never edit or delete entries
- **Open Questions blocks plan** — `/frame:plan` will fail if any unanswered; Research Flags do NOT block
- **Min 2 alternatives** — for external deps and architecture choices; internal features: 1 + rationale
- **Dated sources** — each claim → URL + publication date; SEO aggregators are leads, not cited facts

## Result

- `docs/specs/{topic}/research.md` — research with numbered requirements, ACs, Dependency Passport, Pitfalls, Research Flags, dated References, confidence-tagged Recommendation, Decision Log
- `.planning/STATE.md` updated (COMPLETE)
- Next phase: `/frame:plan` (reads research.md — including Pitfalls and Research Flags — creates spec.md and plan.md)
