# /frame:test-plan -- Manual User Acceptance Checklist

Generates a human-readable checklist of what YOU, as a user, should go and verify by hand after a feature is built. Not code tests (those are written during the task) — this is the "go click through it like a real user" list before shipping.

Runs in the TEST phase, between REVIEW and SHIP.

## Instructions

Build a manual test plan for: **$ARGUMENTS** (if empty — use the current feature from STATE.md).

### Step 0: Update STATE.md (start)

Update `.planning/STATE.md` before any work:
```markdown
## Current Position
- Phase: TEST
- Status: IN_PROGRESS
- Started: {timestamp}
```

### Step 1: Understand what changed

Read context in order (skip what doesn't exist):
- `.planning/STATE.md` — current feature, last completed tasks
- `docs/specs/{feature}/spec.md` — what the feature is supposed to do (user-facing behavior)
- `docs/specs/{feature}/plan.md` — which tasks were done, their Risk levels
- `docs/specs/{feature}/review.md` — issues found in review (verify they were actually fixed)

Then look at the real diff to ground the plan in what actually changed:
```bash
git diff --stat HEAD~1 HEAD 2>/dev/null || git diff --stat
git diff --stat
```

**D-step**: You now have a concrete list of what changed — features, screens, flows, endpoints, behaviors.

### Step 2: Turn changes into user-facing scenarios

For each change, ask: *"What would a user actually do that touches this, and what should they see?"*

Cover these categories (only the ones that apply):

- **Happy path** — the main flow the feature was built for, step by step as a user.
- **Edge cases** — empty states, long input, special characters, zero/many items, slow network, offline.
- **Error handling** — wrong input, denied permissions, failed request — does the user see a clear message (not a blank screen or crash)?
- **Regression** — existing flows near the changed code that could have broken. Use the diff to spot which screens/features sit next to the changes.
- **Cross-cutting** — mobile/responsive, different roles/accounts, language (i18n), refresh/back button, browser reload.

Each scenario must be written for a human to follow without reading code:
- **What to do** — concrete steps ("Open X → click Y → enter Z")
- **Expected** — what should happen ("see message «...», item appears in list")

Skip anything already fully covered by automated tests that can't be observed in the UI — this plan is about what a user *sees and does*.

### Step 3: Write the test plan file

Create `docs/specs/{feature}/test-plan.md`:

```markdown
# Test Plan: {Feature}

## Date
{date}

## What changed
{2–4 bullets in plain language — what's new/different from a user's point of view}

## How to verify (go do this as a user)

### Happy path
- [ ] **{Scenario}**
  - Do: {steps}
  - Expect: {result}

### Edge cases
- [ ] **{Scenario}**
  - Do: {steps}
  - Expect: {result}

### Error handling
- [ ] **{Scenario}**
  - Do: {steps}
  - Expect: {result}

### Regression (things near the change that could break)
- [ ] **{Scenario}**
  - Do: {steps}
  - Expect: {result}

### Cross-cutting (mobile / roles / i18n / reload)
- [ ] **{Scenario}**
  - Do: {steps}
  - Expect: {result}

## Where to test
- URL / screen / command: {from .frame/config.json devServer.url, or ask}

## Notes
{anything to watch for — known limitations, things review flagged}
```

Keep it tight: 5–12 scenarios total, prioritized by Risk from plan.md (high-risk tasks get more scenarios). A short list that gets done beats a long one that doesn't.

### Step 4: Tell the user to go test

Output the checklist location and a short summary:
```
📋 Test plan ready: docs/specs/{feature}/test-plan.md
   {N} scenarios to check by hand.

Top things to verify first:
1. {highest-risk scenario}
2. {next}
3. {next}

→ Go through the list, tick the boxes. When it passes, run /frame:ship.
   If something fails → /frame:debug «what broke» or /frame:fast «fix».
```

For UI-heavy scenarios, optionally suggest:
```
For visual scenarios you can also run /frame:verify-ui to screenshot-check in a browser.
```

### Step 5: Update STATE.md (final)

```markdown
## Current Position
- Phase: TEST
- Feature: {feature}
- Test Plan: docs/specs/{feature}/test-plan.md
- Scenarios: {N}
- Status: Test plan ready, ready to ship
```

## Rules

- **User language, not code** — every scenario must be followable without reading the source.
- **Grounded in the diff** — scenarios come from what actually changed, not generic boilerplate.
- **Prioritize by Risk** — high-risk tasks from plan.md get the most attention.
- **Don't run the tests** — this command produces the checklist; the user (or /frame:verify-ui) executes it.
- **Short and finishable** — 5–12 scenarios, not 40.

## When to Use

- After `/frame:review` passes, before `/frame:ship`
- Whenever you want a concrete "what do I click to be sure this works" list
- Before shipping anything user-facing

## Result

- `docs/specs/{feature}/test-plan.md` created — manual user-acceptance checklist
- `.planning/STATE.md` updated (Phase: TEST, ready to ship)
