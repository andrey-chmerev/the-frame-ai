# /frame:debug -- Systematic Debugging

4-phase debugging workflow: Reproduce -> Root Cause -> Fix -> Review.

## Instructions

Debug the problem: **$ARGUMENTS**

### Step 0a: Initialize STATE.md

Before starting, write to `STATE.md`:
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

Before any grep, check:
- `memory/anti-patterns.md` → look for a similar symptom (may have been solved before)
- `memory/decisions.md` → does the bug contradict an accepted decision
- `memory/patterns.md` → understand expected behavior

> A developer should not spend an hour on a bug that was already solved.

### Phase 1: Reproduce

**Goal**: Understand the problem and reproduce it.

Update STATE.md: `Current Phase: 1/4`

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

Update STATE.md: `Current Phase: 2/4`

1. **[D]** `grep -n "{symptom}"` across the codebase → get specific files and lines
2. **[P]** Read related files, understand data flow
3. **[D]** Add `console.log` / temporary test to confirm hypothesis
4. **[P]** Formulate root cause: where, why, what triggers it
5. **[D]** Run isolated test to confirm root cause

> **Key principle**: root cause is a confirmed fact, not an LLM guess.

**If root cause not found within 30 minutes** → stop and run `/frame:forensics` for deep analysis.
> Debug = quick fix for a known bug type. Forensics = investigation of a systemic problem.

### Phase 3: Fix

**Goal**: Fix the problem using TDD.

Update STATE.md: `Current Phase: 3/4`

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

Update STATE.md: `Current Phase: 4/4`

1. **Check side effects**:
   - Did the fix break anything else?
   - Are there related tests?

2. **Git commit**:
   ```bash
   git add {files}
   git commit -m "fix({scope}): {description}"
   ```

3. **Update memory/anti-patterns.md**:
   ```markdown
   ## {short bug name}
   - Symptom: {what was observed}
   - Root cause: {where and why}
   - Fix: {what was done}
   - Regression test: {path to test}
   ```

4. **Update STATE.md**:
   ```markdown
   ## Current Position
   - Phase: DEBUG
   - Feature: {issue}
   - Status: Bug fixed
   ```

> **Key principle**: the most valuable output of a debug session is not just the fixed code, but the captured knowledge.

## Rules

- **Check memory first** -- anti-patterns.md may already have the answer
- **Reproduce first** -- do not fix until you understand the problem
- **D→P→D in Phase 2** -- every hypothesis is confirmed by a deterministic step
- **Regression test required** -- so the bug does not return
- **Minimal fix** -- do not change anything unnecessary
- **Quality gates** -- type check + tests before commit
- **Write to anti-patterns.md** -- knowledge must not be lost

## Result

- Root cause identified and confirmed deterministically
- Bug fixed with regression test
- Quality gates passed
- Git commit created
- `memory/anti-patterns.md` updated
