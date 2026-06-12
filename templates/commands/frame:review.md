---
description: "Code review: check implementation against spec, run quality gates"
---
# /frame:review -- Code Review + Automated Checks

Compares code against spec.md, checks security, performance, edge cases, runs automated checks.

## Instructions

Execute a code review of the current feature.

### Step 0: Update STATE.md (start)

Update `.planning/STATE.md` before any work:
```markdown
## Current Position
- Phase: REVIEW
- Status: IN_PROGRESS
- Started: {timestamp}
```

### Step 1: Find and read context

- `find docs/specs -name "spec.md" | head -5`
- `find docs/specs -name "plan.md" | head -5`
- `find docs/specs -name "research.md" | head -5`
- Read spec.md, plan.md and the **Memory Impact** section from research.md

| File | Section | Why |
|------|---------|-----|
| `spec.md` | full file | requirements to verify against |
| `plan.md` | full file | architecture and task Risk levels |
| `research.md → Memory Impact` | Memory Impact section | context for decisions — avoid flagging intentional tradeoffs |
| `.planning/memory/anti-patterns.md` | full file | verify code does not repeat known anti-patterns |
| `.planning/memory/dependencies.md` | full file | verify no unauthorized dependencies added |

### Step 2: Automated Checks

Run all automated checks:
```bash
{quality.commands.typecheck}    # Type checking
{quality.commands.test}         # Test check
{quality.commands.lint}         # Lint check
{quality.commands.build}        # Build check
```

**D-step**: All checks MUST pass. If any fail — record errors and do NOT continue the review.

### Step 3: Code Review Checklist

#### Before the checklist: check Risk tasks

Find all tasks with `Risk: high` in plan.md → for each do a deep check:
- Are all edge cases covered by tests
- No regressions in related modules
- Security analysis is mandatory (even if the task is not auth-related)

#### Code Matches Spec
- [ ] All requirements from spec.md are implemented
- [ ] No extra features (scope creep)
- [ ] Architecture matches plan.md

#### Tests
- [ ] Tests cover all cases from spec
- [ ] Edge cases covered
- [ ] Error cases covered
- [ ] Tests in `__tests__/` directory (or project test convention)

#### Security (OWASP)
- [ ] Input validation
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] No sensitive data in logs
- [ ] Secure credential handling (httpOnly, secure, SameSite cookies if applicable)

#### Performance
- [ ] No N+1 queries
- [ ] Proper caching
- [ ] No memory leaks
- [ ] Bundle size acceptable

#### Code Quality
- [ ] No `any` type
- [ ] No `@ts-ignore`
- [ ] Proper error handling
- [ ] Error reporting configured (Sentry or equivalent)
- [ ] No `console.log` in production code
- [ ] Follows project conventions

#### i18n (if applicable)
- [ ] All UI text uses translations
- [ ] Default language set per project config
- [ ] Keys follow dot.notation

**Issue classification** — for each problem found:
- **Critical**: must fix before Ship (blocks deploy)
- **Warning**: should fix (recommended, does not block)
- **Info**: consider fixing (optional)

### Step 4: Create review report

Create `docs/specs/{feature}/review.md`:

```markdown
# Review: {Feature}

## Date
{date}

## Automated Checks
- [x] Typecheck: PASS
- [x] Tests: PASS
- [x] Lint: PASS
- [x] Build: PASS

## Code Review

### Spec Compliance
{results}

### Security
{results}

### Performance
{results}

### Code Quality
{results}

## Issues Found
{list of issues, if any}

## Recommendation
{approve / request changes}

## Action Items
{specific items to fix}

## Memory Updates
- anti-patterns.md: {what to add if a problem was found}
- patterns.md: {what was confirmed as a good pattern}
- decisions.md: {if a decision was made to change approach}
```

### Step 5: Update STATE.md (final)

**If approve:**
```markdown
## Current Position
- Phase: REVIEW
- Feature: {feature}
- Status: Review complete, ready to ship
```

On approve, suggest the next step:
```
✅ Review passed.
   → Run /frame:test-plan to get a manual "what to check as a user" list before shipping,
     or go straight to /frame:ship.
```

**If request changes:**
```markdown
## Current Position
- Phase: BUILD
- Feature: {feature}
- Status: REVIEW_FAILED
- Review: docs/specs/{feature}/review.md
- Critical Issues: {N}
```

Notify the user on request changes:
```
❌ Review failed. {N} critical issues.
   Fixes: docs/specs/{feature}/review.md → Action Items
   Run /frame:build to fix.
```

## Result

- All automated checks passed
- Code review completed
- Review report created with Memory Updates section
- `.planning/STATE.md` updated
