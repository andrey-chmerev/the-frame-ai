# /frame:headless -- Autonomous Execution (CI mode)

Runs the full FRAME workflow without interaction: Research -> Plan -> Build -> Review -> Ship.

## Instructions

Execute the task fully autonomously: **$ARGUMENTS**

### Constraint

This command runs **without interaction** -- no confirmations, no input prompts.
Use it for CI/CD pipelines or when fully automated execution is needed.

### Step 0: Check state

Read `.planning/STATE.md`. If there is unfinished work (status `IN_PROGRESS`) — record it in the report as `INTERRUPTED` and start fresh for `$ARGUMENTS`.

Extract the feature name from `$ARGUMENTS` (first 2-4 words, snake_case) — this is `{feature}`, used in all subsequent steps.

### Step 1: Research

Execute the instructions of `/frame:research` for the topic `$ARGUMENTS`.

Result: `docs/specs/{feature}/research.md` created.

### Step 2: Plan

Execute the instructions of `/frame:plan` for feature `{feature}`.

Result: `docs/specs/{feature}/spec.md` and `docs/specs/{feature}/plan.md` created.

### Step 3: Build

Execute the instructions of `/frame:build`.

If a task gets stuck (Stuck Detection — 3 attempts without progress):
- Mark the task as `[BLOCKED]` in plan.md
- Record in the report: `Build: PARTIAL`
- Continue with the next task

Result: code implemented, tests pass, commits created.

### Step 4: Review

Execute the instructions of `/frame:review`.

If review returns `REVIEW_FAILED`:
- Automatically apply fixes from `Action Items` in review.md
- Re-run review (maximum 2 attempts)
- If still `REVIEW_FAILED` after 2 attempts — record in the report and continue to Ship

Result: `docs/specs/{feature}/review.md` created.

### Step 5: Ship

Execute the instructions of `/frame:ship`, skipping the interactive push question (do not push).

Result: git commit created.

### Step 6: Retrospective

Execute the instructions of `/frame:retrospective`.

Result: memory updated.

### Step 7: Create report

Create `docs/specs/{feature}/headless-report.md`:

```markdown
# Headless Execution Report: {Feature}

## Summary
- **Started**: {timestamp}
- **Completed**: {timestamp}
- **Duration**: {total time}
- **Result**: SUCCESS | PARTIAL | FAILED

## Phases
| Phase | Status | Time | Notes |
|-------|--------|------|-------|
| Research | DONE | X min | |
| Plan | DONE | X min | Tasks: N |
| Build | DONE/PARTIAL | X min | Commits: N, Blocked: N |
| Review | DONE | X min | Attempts: N |
| Ship | DONE | X min | Commit: {hash} |
| Reflect | DONE | X min | |

## Changes
- Files changed: N
- Tests added: N
- Commits: N

## Quality Gates
- Typecheck: {quality.commands.typecheck} — PASS/FAIL
- Tests: {quality.commands.test} — PASS/FAIL
- Lint: {quality.commands.lint} — PASS/FAIL
- Build: {quality.commands.build} — PASS/FAIL

## Blocked Tasks (if any)
- {task}: {reason}
```

## Rules

- **Never stop** -- execute all phases
- **Never ask for input** -- do everything automatically
- **Always log** -- create a report with final status SUCCESS/PARTIAL/FAILED
- **Always run quality gates** -- use `{quality.commands.*}` from project config
- **Always commit** -- capture changes, but do not push without explicit request
- **Blocked does not mean stop** -- skip blocked tasks, record them, and move on
- **Retrospective is mandatory** -- memory update is part of the cycle

## Result

- Task executed fully autonomously
- All phases completed (or recorded as PARTIAL/FAILED)
- Report created with final status
