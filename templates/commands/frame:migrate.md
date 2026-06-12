---
description: "Plan and execute a database or schema migration with rollback safety"
argument-hint: "<migration description>"
---
# /frame:migrate -- Migration with Rollback Plan

Executes a migration with a plan and rollback strategy.

## Instructions

Execute the migration: **$ARGUMENTS**

### Step 1: Determine Migration Type

Identify the type from the argument:
- `db` — database migration (irreversible, requires a `down` script)
- `api` — API/interface changes
- `deps` — dependency updates
- `code` — code refactor/move (default)

### Step 2: Analysis

Identify:
- Source: what is being migrated (from)
- Target: where it is being migrated (to)
- Scope: which files are affected (`grep -r "{area}" --include="*.ts" | head -20`)
- Risks: what could break

### Step 3: Create Migration Plan

Create `docs/specs/migrations/{feature}/plan.md`:

```markdown
# Migration Plan: {from} -> {to}

## Type
{db | api | deps | code}

## Overview
{What is being migrated and why}

## Steps
### Step 1: {description}
- Files: {files}
- Command: {command}
- Verify: {verification}

### Step 2: {description}
- Files: {files}
- Command: {command}
- Verify: {verification}

## Rollback Plan
### Rollback Step 1
- Description: {what to revert}
- Command: {command}

## Risks
- {risk 1}: {mitigation}
```

### Step 4: Create Checkpoint

```
/frame:checkpoint create pre-migration-{feature}
```

### Step 5: Execute Migration

Execute step by step, verifying after each step:

```
1. Apply changes
2. /frame:health  (quality gates)
3. If OK -> continue
4. If FAIL -> /frame:rollback
```

**For `db` type**: ensure a `down` script exists before running `up`.

### Step 6: Git Commit

```bash
git add {files}
git commit -m "refactor(migration): migrate {from} to {to}"
```

### Step 7: Update STATE.md

```markdown
## Current Position
- Phase: MIGRATE
- Feature: {area}
- Status: Migration complete — {from} -> {to}
```

## Rules

- **Checkpoint before migration** — via `/frame:checkpoint`, not manually
- **Rollback via `/frame:rollback`** — not manually
- **Quality gates via `/frame:health`** — no hardcoded commands
- **Step by step** — not everything at once
- **For `db` migrations** — `down` script is mandatory

## Result

- Migration executed
- Plan saved to `docs/specs/migrations/{feature}/plan.md`
- Quality gates passed
- STATE.md updated
- Git commit created
