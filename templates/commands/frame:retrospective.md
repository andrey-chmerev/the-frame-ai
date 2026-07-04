---
description: "Write retrospective, update memory files with learnings and patterns"
allowed-tools: [Read, Write, Bash]
---
# /frame:retrospective -- Retrospective + Memory Update

Analyzes completed task, updates memory files, creates a retrospective report.

## Instructions

Run a retrospective for the last completed task.

### Step 0: Validate prerequisites + Update STATE.md (IN_PROGRESS)

**Fail-fast checks:**
```bash
git rev-parse --is-inside-work-tree 2>/dev/null || { echo "ERROR: Not a git repository. Run from project root."; exit 1; }
git log --oneline -1 2>/dev/null || { echo "ERROR: No commits found. Nothing to retrospect."; exit 1; }
```

Check `.planning/STATE.md` — the previous phase should be SHIP or BUILD with Status: COMPLETE. If the phase is IN_PROGRESS, warn the user and ask for confirmation before continuing.

Update `.planning/STATE.md`:
```markdown
## Current Position
- Phase: REFLECT
- Feature: {feature}
- Status: IN_PROGRESS
- Started: {timestamp}
```

### Step 1: Analyze the last commit + measure actual time

```bash
git log --oneline -10
git diff HEAD~1 --stat
```

Read session telemetry to get the actual task duration:
```bash
# Find the session file for the current feature (most recent with finished_at)
SESSION_FILE=$(ls .planning/sessions/*.json 2>/dev/null | sort | tail -1)
if [ -n "$SESSION_FILE" ]; then cat "$SESSION_FILE"; fi
```

If `started_at` and `finished_at` are both present, compute duration:
```bash
node -e "
  const s = JSON.parse(require('fs').readFileSync(process.argv[1], 'utf-8'));
  if (s.started_at && s.finished_at) {
    const mins = Math.round((new Date(s.finished_at) - new Date(s.started_at)) / 60000);
    console.log('Duration: ' + (mins >= 60 ? Math.floor(mins/60) + 'h ' + (mins%60) + 'm' : mins + 'm'));
  }
" "$SESSION_FILE" 2>/dev/null || echo "Duration: unknown (no telemetry)"
```

Use the real duration in the retrospective report instead of an estimate.

### Step 2: Identify what worked

- Did it fit within the estimate?
- What patterns were used?
- What problems were solved?

### Step 3: Identify what did not work

- What blockers were there?
- What took longer than expected?
- What mistakes were made?

### Step 4: Update Memory

**Worktree rule**: check `git rev-parse --git-common-dir`. If the output contains `worktrees/`, you are in a linked worktree (parallel task) — do **NOT** write to shared memory files (`.planning/memory/*`): parallel branches editing them guarantees merge conflicts at /frame:integrate. Instead append all patterns/anti-patterns/decisions from this retrospective to `docs/specs/{feature}/learnings.md` (per-feature file, unique to this branch — conflict-free). `/frame:integrate` merges it into shared memory. Worktree-local `.planning/STATE.md` updates are fine — they live on the feature branch and /frame:integrate resolves them in main's favor. Then skip to Step 5.

Update the relevant memory files:

#### context.md

Update `.planning/memory/context.md` with current state:
```markdown
# Project Context

## Current Focus
- Working on: {feature}
- Status: {completed | in progress}
- Blocked by: {blockers or "none"}

## Recent Decisions (last 2 weeks)
- {any decision from this task}

## Health
- Last retrospective: {date}
- Open anti-patterns: {count}
- Stale patterns: {count}
```

#### learnings.md

Update `.planning/memory/learnings.md` with findings from this task.

**If a new pattern was discovered**, add under `## Patterns > ### Active`:
```markdown
### {Pattern Name} [confidence: low, confirmed: 1x, added: {date}, last: {date}]
- **Pattern**: {description}
- **Where**: {where it is used}
- **Convention**: {convention}
- **From**: {DEC-XXX if derived from a decision, or blank}
- **Discovered**: {date}
```

If an existing pattern was confirmed, **update its metadata**:
- Increment `confirmed` count
- Update `last` date
- Promote confidence: `low` (1x) -> `medium` (2-4x) -> `high` (5+)

**If an anti-pattern was discovered**, add under `## Anti-Patterns`:
```markdown
### Anti-pattern: {anti-pattern}
- **Why it is bad**: {reason}
- **Correct approach**: {how it should be done}
- **Related decision**: {DEC-XXX if avoided by a decision, or blank}
- **Occurrences**: {count}
```

**If an architectural decision was made**, add under `## Decisions`:
```markdown
### [DEC-{XXX}] {Decision Title}
- **Date**: {date}
- **Status**: accepted
- **Context**: {why this decision was needed}
- **Decision**: {what was decided}
- **Consequences**: {what follows}

Related:
- → derives: learnings.md#{pattern-name}
- → avoids: learnings.md#{anti-pattern-name}
```

### Step 4b: Cross-link learnings

After writing to `## Decisions`, check if the new decision implies any of the following:

- **New pattern**: if the decision establishes a repeatable approach, ensure a corresponding entry exists in `## Patterns` (or update an existing one).
- **New anti-pattern**: if the decision avoids or replaces a previous approach, ensure the old approach is recorded in `## Anti-Patterns` with the correct approach pointing to the new decision.
- **Orphan check**: scan the new decision's `→ derives` and `→ avoids` links — if any link target does not exist, create it or remove the broken link.

### Step 5: Create retrospective report

Create `docs/specs/{feature}/retrospective.md`:

```markdown
# Retrospective: {Feature}

## Date
{date}

## Summary
- Tasks completed: {N}
- Time estimate: {estimate}
- Time actual: {actual}
- Win rate: {N}%

## Wins
{what worked well}

## Struggles
{what was difficult}

## Lessons Learned
{what to remember}

## Action Items
{what to do differently next time}
```

### Step 6: Update STATE.md (COMPLETE)

Update `.planning/STATE.md`:
```markdown
## Current Position
- Phase: REFLECT
- Feature: {feature}
- Status: COMPLETE
- Finished: {timestamp}
```

## Result

- Retrospective report created
- Memory files updated
- `.planning/STATE.md` updated
