---
description: "Promote high-confidence learnings into permanent project rules (CLAUDE.md) and retire duplicates"
allowed-tools: [Read, Write, Bash]
disable-model-invocation: true
---
# /frame:evolve -- Knowledge Lifecycle

Reviews accumulated learnings and evolves the proven ones into permanent rules. This is the last stage of the knowledge lifecycle: **observation → lesson (with confidence) → repeated confirmation → project rule**. Where `/frame:retrospective` records lessons and `/frame:cleanup-memory` prunes stale ones, `/frame:evolve` graduates the ones that have earned trust.

## Instructions

Evolve high-confidence learnings into permanent rules.

### Step 0: Fail-fast

```bash
git rev-parse --is-inside-work-tree 2>/dev/null || { echo "ERROR: Not a git repository."; exit 1; }
test -f .planning/memory/learnings.md || { echo "ERROR: no learnings.md — run /frame:retrospective first."; exit 1; }
```

Do NOT run inside a linked worktree (parallel branches must not rewrite shared CLAUDE.md):
```bash
git rev-parse --git-common-dir | grep -q "worktrees/" && { echo "ERROR: run /frame:evolve from the main worktree, not a parallel one."; exit 1; }
```

### Step 1: Collect proven learnings

Read `.planning/memory/learnings.md`. Select **graduation candidates**:
- Patterns with `confidence: high` (confirmed 5+ times) OR `confidence: medium` with `confirmed: >= 3` and `last:` within 90 days;
- Anti-patterns with `Occurrences: >= 3`;
- Decisions with `Status: accepted` that a candidate pattern/anti-pattern derives from.

Skip anything marked `[stale]` or `[Archived]`.

### Step 2: Cluster and classify each candidate

For each candidate, decide what it should become (the ECC evolution rule — same spirit as /frame:retrospective's verdict gate):

| Shape of the knowledge | Promote to |
|------------------------|-----------|
| A permanent "always/never" rule for this project | **CLAUDE.md** — `## Rules (MUST follow)` or `## Anti-Patterns (NEVER do)` |
| A repeatable coding convention | **CLAUDE.md** `## Code Conventions` (or `.planning/memory/conventions.md` if very stack-specific) |
| Still situational / not universal | **Leave in learnings.md** — not ready to graduate |

Cluster near-duplicate candidates first — several lessons saying the same thing become **one** rule.

### Step 3: Propose, then apply on confirmation

Show the user a table before touching CLAUDE.md:
```
Proposed promotions:
| Learning | Confidence | → Destination | Rule text |
|----------|-----------|---------------|-----------|
| Always validate DTOs at the boundary | high (7x) | CLAUDE.md Rules | "Validate all external input at the API boundary with a schema." |
| Never use `any` | high (6x) | CLAUDE.md Anti-Patterns | "Never use `any` — use `unknown` + a type guard." |
```

Ask once: "Promote these to CLAUDE.md? [Y/n / pick numbers]". On confirmation:
1. Append each approved rule to the correct CLAUDE.md section (do not duplicate an existing line — check first).
2. In `learnings.md`, mark the graduated entry with `[promoted → CLAUDE.md {date}]` and move it to `### Archived` (it now lives as a rule; keep the archive trace, do not delete).
3. De-duplicate: if two learnings collapsed into one rule, archive both with a note pointing at the single rule.

**Never silently rewrite CLAUDE.md.** Framework-owned sections (`## FRAME Framework`, the `## Rules` header itself) are appended to, not restructured.

### Step 4: Report

Create `.planning/reports/evolve/{date}.md`:
```markdown
# Evolve -- {date}

## Promoted to CLAUDE.md
- {rule} (was: learnings.md#{entry}, confidence {X})

## Clustered / de-duplicated
- {N} learnings collapsed into {M} rules

## Left in learnings.md (not yet proven)
- {entry} — {why it's not ready}
```

Update `.planning/memory/context.md` `## Health` — set `Last evolve: {date}`.

## Rules

- **Only proven knowledge graduates** — confidence: high (or medium 3x+ recent); nothing stale or one-off
- **Cluster before promoting** — duplicates collapse into a single rule
- **Propose, then apply** — never edit CLAUDE.md without showing the user the exact rules first
- **Archive, don't delete** — graduated learnings are marked `[promoted]` and kept for traceability
- **Main worktree only** — never rewrite shared CLAUDE.md from a parallel worktree
- **No duplicates in CLAUDE.md** — check the target section before appending

## Result

- Proven learnings promoted to CLAUDE.md as permanent rules
- Duplicates clustered and de-duplicated
- Graduated learnings archived with `[promoted]` marker
- `.planning/reports/evolve/{date}.md` written
