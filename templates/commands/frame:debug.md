---
description: "Systematically debug an issue — or run deep forensic investigation with 5-why analysis"
argument-hint: "[--deep] <SEC-N|issue description>"
allowed-tools: [Read, Write, Bash]
---
# /frame:debug -- Systematic Debugging

Standard 4-phase debugging, or deep forensic investigation for systemic/recurring issues.

### Routing

- `<issue description>` — standard debug: Reproduce → Root Cause → Fix → Review
- `--deep <issue>` — forensic deep-dive: git history, 5-why analysis, parallel investigators, full report (use when standard debug hasn't found the cause in 30 minutes, or the problem is systemic/recurring)
- `<FINDING-ID>` (e.g. `SEC-3`, `LOGIC-7`) — entry via finding ID: pull context from the latest AUDIT.md or review.md, then run standard debug on that specific finding

---

## Mode: Finding ID (e.g. `/frame:debug SEC-3`)

If `$ARGUMENTS` matches a finding ID pattern (`[A-Z]+-[0-9]+`):

1. Find context: `ls -t .planning/reports/audit/*/AUDIT.md 2>/dev/null | head -1` and read it
2. Locate the finding by ID — extract: description, file, line, evidence, severity
3. Use that as the issue description and proceed with standard debug mode below

---

## Mode: default (no --deep)

Debug the problem: **$ARGUMENTS**

### Step 0a: Initialize STATE.md

Before starting, write to `.planning/STATE.md`:
```markdown
- Phase: DEBUG
- Bug: {description from $ARGUMENTS}
- Status: IN_PROGRESS
- Current Phase: 1/4
- Started: {timestamp}
```

> If the session is interrupted, the next session will know where to resume.

### Step 0b: Severity Classification

- **Critical** (auth, billing, data loss) → create `git stash`, work in a separate branch, warn the user before any code changes
- **High** (main flow broken) → standard debug protocol
- **Low** (UI, minor UX) → can defer, add to backlog

### Step 0c: Check Memory

Before any grep, check `.planning/memory/learnings.md`:
- `## Anti-Patterns` section → look for a similar symptom (may have been solved before)
- `## Decisions` section → does the bug contradict an accepted decision
- `## Patterns` section → understand expected behavior

> A developer should not spend an hour on a bug that was already solved.

### Phase 1: Reproduce

**Goal**: Understand the problem and reproduce it.

Update `.planning/STATE.md`: `Current Phase: 1/4`

1. **Describe the problem**:
   - What is happening?
   - What is expected?
   - Under what conditions?

2. **Find related code**:
   - `grep -r "{keywords}" --include="*.ts" --include="*.tsx" | head -20`
   - Check `.planning/MAP.md` for navigation

3. **Reproduce**:
   - Run relevant tests
   - Check logs
   - Identify steps to reproduce

> **Key principle**: do not fix until you have reproduced the problem.

### Phase 2: Root Cause

**Goal**: Find the root cause through deterministic steps.

Update `.planning/STATE.md`: `Current Phase: 2/4`

1. **[D] Git archaeology** — before grep, check recent commits on related files:
   ```bash
   git log --oneline -15 -- {related_files_from_phase_1}
   ```
   Look for suspicious commits: timing matches first occurrence, message mentions the affected area.

2. **[D]** `grep -n "{symptom}"` across the codebase → get specific files and lines

3. **[P] Hypotheses** — form max 3, ranked by likelihood. Check the cheapest one first (the one requiring fewest reads/runs to validate or discard).

4. **[P]** Read related files for top hypothesis, understand data flow

5. **[D]** Add `console.log` / temporary test to confirm or discard hypothesis; discard before moving to next

6. **[P]** Formulate root cause: where, why, what triggers it

7. **[D]** Run isolated test to confirm root cause

> **Key principle**: root cause is a confirmed fact, not an LLM guess.

**If root cause not found within 30 minutes** → stop and run `/frame:debug --deep` for deep forensic analysis.
> Default = quick fix for a known bug type. `--deep` = investigation of a systemic problem.

### Phase 3: Fix

**Goal**: Fix the problem using TDD.

Update `.planning/STATE.md`: `Current Phase: 3/4`

1. **Write a regression test**:
   - A test that reproduces the bug
   - **D-step**: The test must FAIL (confirms the bug)

2. **Fix the code**:
   - Minimal fix for the root cause
   - Do not change anything unnecessary

3. **Verify the fix**:
   - **D-step**: Regression test must PASS
   - Run all tests: `{quality.commands.test}`
   - Type check: `{quality.commands.typecheck}`
   - **If UI bug** (visual, layout, component): open browser via Playwright MCP → `browser_navigate` → `browser_screenshot` → confirm the bug is gone visually

### Phase 4: Review and Knowledge Capture

**Goal**: Ensure the fix is safe and preserve the knowledge.

Update `.planning/STATE.md`: `Current Phase: 4/4`

1. **Check side effects**:
   - Did the fix break anything else?
   - Are there related tests?

2. **Git commit**:
   ```bash
   git add {files}
   git commit -m "fix({scope}): {description}"
   ```

3. **Update `.planning/memory/learnings.md` — `## Anti-Patterns` section**:
   ```markdown
   ### Anti-pattern: {short bug name}
   - Symptom: {what was observed}
   - Root cause: {where and why}
   - Fix: {what was done}
   - Regression test: {path to test}
   ```

4. **Update `.planning/STATE.md`**:
   ```markdown
   ## Current Position
   - Phase: DEBUG
   - Feature: {issue}
   - Status: Bug fixed
   ```

> **Key principle**: the most valuable output of a debug session is not just the fixed code, but the captured knowledge.

---

## Mode: --deep (forensic investigation)

Triggered by: `/frame:debug --deep <issue description>`

Systematic root cause analysis with logs, git history, and 5-why methodology. Use for problems that resisted standard debugging or are systemic/recurring.

### Step D0: Initialize

Write to `.planning/STATE.md`:
```markdown
- Phase: DEBUG (deep)
- Issue: {description}
- Status: IN_PROGRESS
- Started: {timestamp}
```

Check memory before any investigation:
- `.planning/memory/learnings.md` Anti-Patterns section → similar symptom may have been investigated before
- `.planning/memory/learnings.md` Decisions section → does the problem contradict an accepted decision

### Phase D1: Evidence Collection

Launch 2–3 parallel Explore subagents for faster collection — each takes one dimension:

**git-history investigator**:
```bash
git log --oneline -20
git log --all --oneline --graph | head -30
git blame {affected_file}
git diff {suspect_commit}^ {suspect_commit}
git log --oneline -15 -- {affected_file}
```

**code investigator**:
```bash
grep -r "{error_keyword}" --include="*.ts" --include="*.tsx" | head -20
find . -name "*{affected_file}*"
```

**config investigator** (if relevant):
- Env files, feature flags, dependency versions, CI configuration

After all three return, synthesize findings before Phase D2.

### Phase D2: Root Cause Analysis (5 Whys — D→P→D)

Apply 5 Whys — confirm each answer with a deterministic step:

1. What broke? **[D]** reproduce / find in logs
2. Why? → **[P]** hypothesis → **[D]** confirm with grep/test
3. Why did that happen? → **[P]** hypothesis → **[D]** confirm
4. Why was the implementation like that? → **[P]** hypothesis → **[D]** confirm
5. Why was it not prevented? → **[P]** hypothesis → **[D]** confirm

Root cause must be a confirmed fact, not a guess.

### Phase D3: Timeline Reconstruction

```
T-N days: commit X (possible cause)
T-3 days: first occurrence of error
T-2 days: commit Y (attempted fix)
T-1 day: error worsened
T-0: now (incident)
```

### Phase D4: Create Forensic Report

Create `.planning/forensics/{issue-id}.md`:

```markdown
# Forensic Report: {Issue}

## Incident Summary
{What happened, when, impact}

## Root Cause
{5 Whys analysis with confirmed facts}

## Timeline
| T | Event |
|---|-------|
| ... | ... |

## Evidence
### Git History / Code Analysis / Related Issues

## Fix
{What needs to be fixed}

## Prevention
{How to avoid this in the future}
```

### Phase D5: Update Memory

Add to `.planning/memory/learnings.md` `## Anti-Patterns` if a new anti-pattern found. Add to `.planning/memory/learnings.md` `## Decisions` if an architectural decision is needed.

Update `.planning/STATE.md`:
```markdown
- Phase: DEBUG (deep)
- Issue: {issue}
- Status: COMPLETED
```

---

## Rules (all modes)

- **Check memory first** — `.planning/memory/learnings.md` Anti-Patterns section may already have the answer
- **Git archaeology before grep** — `git log --oneline -15 -- {files}` often finds the culprit commit faster
- **Max 3 hypotheses** — rank by likelihood, check cheapest first; discard before forming next
- **Reproduce first** — do not fix until you understand the problem
- **D→P→D in Phase 2** — every hypothesis is confirmed by a deterministic step
- **Regression test required** — so the bug does not return
- **Minimal fix** — do not change anything unnecessary
- **Quality gates** — type check + tests before commit
- **Write to learnings.md Anti-Patterns** — knowledge must not be lost

## Result

- Root cause identified and confirmed deterministically
- Bug fixed with regression test (default mode) or forensic report created (--deep mode)
- Quality gates passed
- Git commit created
- `.planning/memory/learnings.md` Anti-Patterns updated
