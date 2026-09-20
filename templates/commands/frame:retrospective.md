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

### Step 3.4: Evidence audit — did a bug reach the user while evidence was green?

Review proves the result with `docs/specs/{feature}/evidence.md` (every `## Evidence` item collected as an artifact and content-checked). Ask explicitly: **was there a bug that reached the user although evidence.md read all `yes`** (and the manual items were confirmed)? Sources: bug reports and `/frame:debug` / `/frame:fast` runs since ship, the review's `## Deferred` list, the user's own account.

- **No** → note "Evidence held" in the report and move on.
- **Yes** → the evidence was too weak: an item asked for a metric where it should have asked for content ("file exists", "duration 42s", "exit 0") or it looked at the wrong place, the wrong input or too little of the output. Name the item (`E{n}`, its wording), what the bug was, and **how the item should have read** so it would have caught it — concrete, the way `/frame:plan` Step A8 wants it. This lesson always passes the Step 3.5 gate (it is a real miss with a general fix) and lands in `learnings.md ## Anti-Patterns` as a `Weak evidence` entry (Step 4), which `/frame:plan` reads when writing the next spec's Evidence.
- Also flag it if a `manual:` item was ticked without the check being done — that is a process lesson for the same entry.

### Step 3.5: Verdict gate — decide what is worth saving (learn-eval)

Do NOT dump every observation into memory — that is how memory rots. For each candidate lesson, pick one verdict:

| Verdict | When | Action |
|---------|------|--------|
| **Save** | New, generally-true, will recur | Write it as a fresh entry (confidence: low, confirmed: 1x) |
| **Improve then Save** | True but vague/overfit to this task | Rewrite it to be general and evidence-backed, then Save |
| **Absorb into existing** | A known pattern/anti-pattern just recurred | Do NOT add a duplicate — bump the existing entry's `confirmed` and `last:` (confidence step-up) |
| **Drop** | One-off, trivial, or not reproducible | Discard — say why in the report, write nothing |

Only lessons that pass this gate reach Step 4. Record the verdict for each lesson in the retrospective report.

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

If an existing pattern was confirmed, **update its metadata** (this is the "Absorb into existing" verdict — never duplicate):
- Increment `confirmed` count (each confirmation is a step up in confidence)
- Update `last` date
- Promote confidence: `low` (1x) -> `medium` (2-4x) -> `high` (5+)

If the same pattern was **contradicted** this task (it did not hold), step confidence *down* one level and add a one-line `- **Contradicted**: {date} — {why}` note. Two contradictions in a row → move it to `### Archived`. (Decay over time — patterns idle > 90 days — is handled mechanically by /frame:cleanup-memory, so unused knowledge fades instead of misleading.)

**If an anti-pattern was discovered**, add under `## Anti-Patterns`:
```markdown
### Anti-pattern: {anti-pattern}
- **Why it is bad**: {reason}
- **Correct approach**: {how it should be done}
- **Related decision**: {DEC-XXX if avoided by a decision, or blank}
- **Occurrences**: {count}
```

**If Step 3.4 found a bug behind green evidence**, record it in the same section as a `Weak evidence` entry — `/frame:plan` reads these before writing the next spec's `## Evidence`, so the wording of *Correct approach* is the deliverable:
```markdown
### Anti-pattern: Weak evidence — {what the item checked, e.g. "caption file exists and duration matches"}
- **Why it is bad**: {the bug that got through: "captions belonged to another episode; size and duration were right"}
- **Weak item**: {feature} E{n} — "{the original wording}"
- **Correct approach**: the evidence item must read: "{stronger wording — names the content: 'first cue of out/12.srt is the episode-12 opening line «…»'}"
- **Occurrences**: {count}
```
If a `Weak evidence` entry for the same kind of artifact already exists, absorb: bump `Occurrences`, sharpen *Correct approach*.

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

## Evidence
{"Evidence held — no user-facing bug behind green evidence.md" | "Weak evidence: E{n} «…» let {bug} through → stronger item recorded in learnings.md"}

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
