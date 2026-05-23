# /frame:fast -- Quick Task

Executes a quick task without the full workflow: mini Research -> mini Plan -> Build.

## Instructions

Execute the quick task: **$ARGUMENTS**

### Step 0: Initialize (10 sec)

Write to `.planning/STATE.md`:
```markdown
## Current Position
- Phase: BUILD
- Feature: {task description}
- Status: IN_PROGRESS
```

Quickly check:
- `memory/anti-patterns.md` — any similar case already solved
- `memory/patterns.md` — expected pattern for this area

**Scope limit**: if the task will take more than 30 minutes — warn the user and suggest `/frame:build`, but continue if they want to proceed.

### Step 1: Mini Research (30 sec)

Quickly analyze:
- What needs to be done
- Where the relevant files are (use `.planning/MAP.md`)
- Whether similar patterns exist in the project

### Step 2: Mini Plan (30 sec)

Determine:
- Which files to change
- What test to write (if needed)
- Which verification command to use

### Step 3: Build (2-5 min)

Execute:
1. If a test is needed -- write the test first (RED)
2. Write the code (GREEN)
3. Refactor if needed
4. Run quality gates: `{quality.commands.typecheck} && {quality.commands.test} && {quality.commands.lint}`
5. Git commit: `git add {files} && git commit -m "{type}({scope}): {description}"`

### Step 3.5: UI Verification (if UI task)

**Detect UI task**: task description or changed files contain `.tsx`, `.vue`, `.css`, `component`, `page`, `layout`, `style`, `UI`, or `interface`.

If this is a UI task AND Playwright MCP is available (`browser_navigate` tool exists):
1. `browser_navigate: {dev server URL from .frame/config.json or ask user}`
2. `browser_screenshot`
3. Compare screenshot with task description
4. **PASS** → continue to Step 4
5. **FAIL** → describe the problem, return to Step 3 and fix, then re-verify

If Playwright MCP is not available — skip this step and note: "UI not verified (no browser tool)".

### Step 4: Update STATE.md and wins

Update `.planning/STATE.md`:
```markdown
## Current Position
- Phase: BUILD
- Feature: {task description}
- Status: Fast task completed
- Last fast task: {date} — {task description}
```

Append to `.planning/memory/wins.md`:
```markdown
- {date}: {task description} — {files changed, 1 line summary}
```

If a new pattern or anti-pattern was discovered during the task — record it in the appropriate memory file.

## Rules

- **Fast** -- entire task should take ≤30 minutes
- **Scope** -- if clearly >30 min, warn and suggest `/frame:build`
- **Tests optional** -- only if logic changed
- **Quality gates mandatory** -- typecheck + test + lint
- **Specific files** -- never `git add -A`

## When to Use

- "Add a button"
- "Change a color"
- "Add an icon"
- "Fix a typo"
- "Add padding/margin"
- "Rename a function"
- "Add a field to a type"
- "Add an env variable"

## Result

- Task completed in 2-5 minutes
- Quality gates passed
- Git commit created
