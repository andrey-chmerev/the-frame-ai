# /frame:cleanup-memory -- Memory Cleanup

Cleans and updates memory files.

## Instructions

Run memory and artifact cleanup.

### Step 1: Split patterns into Core and Archive

Scan `.planning/memory/patterns.md` and apply the following rules:

#### Promote to Core

Move patterns from the `## Active` section to `## Core` if they meet **any** of:
- `confidence: high` (confirmed 5+ times)
- `confidence: medium` with `confirmed: >= 3` **and** `last:` within the last 90 days

Core patterns are the default approaches that the Planner reads for decision-making.

#### Stale-mark active patterns

Scan patterns in `## Active` where `last:` is older than 90 days. Add `[stale]` to the header — do not delete:
```markdown
## Redis Sessions [stale, confidence: high, confirmed: 8x, added: 2025-11-01, last: 2025-12-10]
```
When a stale pattern is confirmed again, remove the `[stale]` tag and update `last:`.

#### Archive low-confidence patterns

Move patterns with `confidence: low` and `last:` older than 60 days to the `## Archived` section. If their `confirmed` count is now >= 2, promote to `medium` first.

### Step 2: Trim metrics.md

Keep only the last 4 weeks of data in `.planning/memory/metrics.md`.

### Step 3: Trim wins.md

Keep only the last 10 entries in `.planning/memory/wins.md`.

### Step 4: Trim decisions.md

Keep only the last 20 entries in `.planning/memory/decisions.md`. Move older ones to an `## Archived` section at the bottom.

### Step 5: Stale-mark anti-patterns.md

Scan `.planning/memory/anti-patterns.md`. For any entry not referenced in the last 90 days, add `[stale]` to its header — do not delete.

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
- [x] Core/Archive split: reviewed (N promoted, N stale-marked, N archived)
- [x] Metrics: trimmed to 4 weeks
- [x] Wins: trimmed to 10 entries
- [x] Decisions: trimmed to 20 entries
- [x] Anti-patterns: stale-marked (N)
- [x] Specs archived: N
- [x] MAP.md: verified (N missing)

## Archived Specs
- {spec1}
- {spec2}
```
