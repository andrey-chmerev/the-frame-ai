---
description: "Refactor code with test coverage verification and checkpoint safety"
argument-hint: "<refactor scope>"
---
# /frame:refactor -- Refactoring with Test Coverage

Analyzes an area, plans the refactor, executes with TDD, checks quality gates.

## Instructions

Refactor: **$ARGUMENTS**

### Step 0: Checkpoint + Update STATE.md (IN_PROGRESS)

Create checkpoint before starting:
```bash
git tag "frame/checkpoint/refactor-$(date +%Y%m%dT%H%M%S)" -m "Auto checkpoint before refactor"
```

Update `.planning/STATE.md` before any work:
```markdown
## Current Position
- Phase: REFACTOR
- Feature: {area}
- Status: IN_PROGRESS
- Started: {timestamp}
```

### Step 1: Read Context

Read before refactoring:
- `.planning/memory/patterns.md` — Core + Active patterns (what to follow)
- `.planning/memory/anti-patterns.md` — what to avoid
- `docs/specs/{feature}/research.md` — **Memory Impact** section (if exists)

### Step 2: Baseline Metrics

Before any changes, record:
- Number of files in the area
- Current test coverage (if available)
- LOC of key files
- List of public exports (to detect breaking changes)

```bash
grep -r "export " {area} | wc -l
```

### Step 3: Analyze the area

1. **Find related files**:
   - `grep -r "{area}" | head -20`
   - Map the dependency graph

2. **Assess current state**:
   - How many files?
   - Are there tests?
   - What is the coverage?

3. **Identify problems**:
   - Code smells
   - Duplication
   - Tight coupling
   - Missing tests

### Step 4: Plan the refactor

Create a plan as a table:

| File | What changes | Test | Risk |
|------|-------------|------|------|
| ... | ... | ... | low/medium/high |

Order: least risky changes first.

### Step 5: TDD Refactor

For each change:

1. **Write a test** (if none exists):
   - Define expected behavior
   - **D-step**: Test should FAIL (RED)

2. **Refactor the code**:
   - Minimal changes
   - Do not change behavior
   - **D-step**: Test should PASS (GREEN)

3. **Repeat** until refactor is complete

#### Stuck Detection

If after **3 attempts** the test does not reach GREEN:
1. Stop
2. Update STATE.md: `Status: STUCK, Task: {change}`
3. Report to user: what was tried, where stuck, suggest:
   - Simplify the change
   - Rewrite the test
   - Skip with `[BLOCKED]` flag

### Step 6: Check for Breaking Changes

Compare public API before and after:
```bash
grep -r "export " {area} | sort > after-exports.txt
# compare with baseline from Step 2
```

If signatures changed — that is a breaking change and requires an explicit decision.

### Step 7: Quality Gates

Determine commands from the project config:
- If `package.json` exists → use `npm test`, `npm run lint`, `npm run typecheck`
- If TypeScript → `npx tsc --noEmit`
- If vitest → `npx vitest run`
- If jest → `npx jest`
- If eslint → `npx eslint .`

Run all applicable checks. **D-step**: All checks must pass.

If checks fail — **do not commit**. Roll back changes:
```bash
git stash
# or for specific files:
git checkout -- {file}
```

### Step 8: Git Commit

```bash
git add {specific files from the plan}
git commit -m "refactor({scope}): {description}"
```

### Step 9: Update Memory + STATE.md

Update `.planning/memory/patterns.md` if a new good pattern was confirmed.
Update `.planning/memory/anti-patterns.md` if a problem was found and fixed.

Update `.planning/STATE.md`:
```markdown
## Current Position
- Phase: REFACTOR
- Feature: {area}
- Status: COMPLETE
- Finished: {timestamp}
```

## Rules

- **Behavior preservation** -- do not change behavior
- **Test coverage** -- increase coverage
- **Incremental** -- small steps
- **Quality gates** -- read from project config, do not hardcode
- **Rollback** -- if gates fail, roll back, do not commit broken code
- **Never skip D-steps** -- every step is verified

## Result

- Baseline recorded, improvement is measurable
- Code refactored without breaking changes
- Test coverage increased
- Quality gates passed
- Memory files updated
- Git commit created
