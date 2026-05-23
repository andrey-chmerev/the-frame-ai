# /frame:verify -- Browser UI Verification

Verifies UI result in a real browser via Playwright MCP. Use when the agent claims "done" but the interface looks wrong.

## Instructions

Verify the UI for: **$ARGUMENTS** (if empty — verify the last completed task from STATE.md)

### Step 1: Determine what to verify

If `$ARGUMENTS` is provided — use it as the verification target.
Otherwise read `.planning/STATE.md` → find the last completed task/feature.

### Step 2: Determine the URL

Check in order:
1. `$ARGUMENTS` contains a URL → use it
2. `.frame/config.json` → `devServer.url` field
3. Ask the user: "What URL should I open to verify? (e.g. http://localhost:3000)"

### Step 3: Open browser and take screenshot

```
browser_navigate: {url}
browser_screenshot
```

Describe what you see: layout, content, interactive elements.

### Step 4: Compare with expected result

Compare the screenshot with:
- The task description from `$ARGUMENTS` or STATE.md
- The spec from `docs/specs/{feature}/spec.md` (if exists)

**Verdict:**
- **PASS** — the interface matches the expected result → report success
- **FAIL** — something is wrong → describe exactly what is wrong and what was expected

### Step 5: On FAIL — interact to dig deeper

If the initial screenshot shows a problem, try to reproduce it:
```
browser_click: {element}        # click buttons, links
browser_type: {selector} {text} # fill forms
browser_screenshot              # screenshot after interaction
```

Describe the exact problem: what element, what behavior, what was expected.

### Step 6: Report

**On PASS:**
```
✅ UI verified: {what was checked}
- URL: {url}
- Result: matches expected behavior
```

**On FAIL:**
```
❌ UI verification failed: {what was checked}
- URL: {url}
- Problem: {exact description}
- Expected: {what should be}
- Actual: {what is}
- Suggested fix: {where to look}
```

On FAIL — do NOT auto-fix. Report to the user and wait for a decision:
- Fix and re-verify → run `/frame:fast {fix description}`, then `/frame:verify` again
- It's acceptable → mark as known issue

## Rules

- **Never auto-fix** — verify only, report problems
- **Be specific** — describe exact elements, not "looks wrong"
- **Screenshot first** — always take a screenshot before interacting
- **Check mobile too** — if the project has responsive design, mention it

## When to Use

- After `/frame:fast`, `/frame:build`, `/frame:wave` on UI tasks
- When the agent says "done" but visually something is off
- Before `/frame:ship` for frontend features
- When debugging visual regressions

## Playwright MCP Setup

If `browser_navigate` is not available, Playwright MCP is not configured.
Add to `.claude/settings.json`:
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```
