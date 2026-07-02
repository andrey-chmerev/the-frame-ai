---
description: "Trim and archive memory files, removing stale and low-confidence entries"
allowed-tools: [Read, Write, Bash]
disable-model-invocation: true
---
# /frame:cleanup-memory -- Memory Cleanup

Cleans and updates memory files.

## Instructions

Run memory and artifact cleanup.

### Step 1: Maintain learnings.md — Patterns section

Scan `.planning/memory/learnings.md` `## Patterns` and apply the following rules:

#### Promote to Core

Move patterns from `### Active` to `### Core` if they meet **any** of:
- `confidence: high` (confirmed 5+ times)
- `confidence: medium` with `confirmed: >= 3` **and** `last:` within the last 90 days

Core patterns are the default approaches that the Planner reads for decision-making.

#### Stale-mark active patterns

Scan patterns in `### Active` where `last:` is older than 90 days. Add `[stale]` to the header — do not delete:
```markdown
### Redis Sessions [stale, confidence: high, confirmed: 8x, added: 2025-11-01, last: 2025-12-10]
```
When a stale pattern is confirmed again, remove the `[stale]` tag and update `last:`.

#### Archive low-confidence patterns

Move patterns with `confidence: low` and `last:` older than 60 days to `### Archived`. If their `confirmed` count is now >= 2, promote to `medium` first.

#### Retention cap (20 per section)

If any section exceeds 20 entries, move the oldest (by `last:` date) to `### Archived`.

### Step 2: Trim learnings.md — Decisions section

Keep only the last 20 entries in `.planning/memory/learnings.md` `## Decisions`. Move older ones to the `### Archived` subsection at the bottom of that section.

### Step 3: Stale-mark learnings.md — Anti-Patterns section

Scan `.planning/memory/learnings.md` `## Anti-Patterns`. For any entry not referenced in the last 90 days, add `[stale]` to its header — do not delete.

### Step 4: Rotate STATE.md

`.planning/STATE.md` is meant to hold **only the current position**, but commands append status blocks over time (`## Prev Position`, `## Fix Result`, `## Review Result`, `## (история)`, `## Re-review …`, etc.). These accumulate and never get trimmed — a stale STATE.md bloats every session-init read.

Read `.planning/STATE.md` and count its lines:
```bash
wc -l .planning/STATE.md
```

If it has **more than ~60 lines** (roughly: more than the current block + 3 history blocks), rotate it:

1. **Keep** the active `## Current Position` block (the first/topmost one — this is what session-init and `/frame:daily` read).
2. **Keep** the `- PreCompact:` line if present (managed by the pre-compact hook).
3. **Keep** the **3 most recent** history blocks (`Prev Position` / `Fix Result` / `Review Result` / etc.) for short-term context.
4. **Archive the rest**: append every older block to `.planning/sessions/state-archive.md` (create it if missing, prepend a `## Archived {date}` separator). Do **not** delete outright — feature history also lives in `docs/specs/{feature}/` and git, but keep an archive for traceability.
5. Rewrite `.planning/STATE.md` with only the kept blocks.

**Never touch the active `## Current Position` block** — losing it strands the current workflow.

After rotation, report the before/after line count.

### Step 6: Archive old specs

```bash
find docs/specs -mindepth 1 -maxdepth 1 -type d -mtime +90 2>/dev/null
```

If any are older than 90 days, move them to `docs/specs/archive/`.

### Step 7: Check MAP.md

Read `.planning/MAP.md` and extract the list of key directories from the architecture or key files section. For each directory listed, verify it exists on disk and report any that are missing.

### Create report

Create `.planning/reports/cleanup/{date}.md`:

```markdown
# Memory Cleanup -- {date}

## Actions
- [x] learnings.md Patterns: Core/Archive split (N promoted, N stale-marked, N archived)
- [x] learnings.md Decisions: trimmed to 20 entries
- [x] learnings.md Anti-patterns: stale-marked (N)
- [x] STATE.md: rotated ({before} → {after} lines, N blocks archived) or "not needed"
- [x] Specs archived: N
- [x] MAP.md: verified (N missing)

## Archived Specs
- {spec1}
- {spec2}
```
