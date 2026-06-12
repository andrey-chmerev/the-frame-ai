---
description: "Search decision history to explain why something was built a certain way"
argument-hint: "<keyword, path, or concept>"
allowed-tools: [Read, Bash, Grep]
---
# /frame:why -- Search Decision History

Find why a decision was made. Searches memory and git history.

## Instructions

Search for: **$ARGUMENTS**

### Step 1: Search memory files

```bash
grep -i "$ARGUMENTS" .planning/memory/decisions.md 2>/dev/null
grep -i "$ARGUMENTS" .planning/memory/anti-patterns.md 2>/dev/null
grep -i "$ARGUMENTS" .planning/memory/patterns.md 2>/dev/null
```

### Step 2: Search git history

```bash
git log --oneline --grep="$ARGUMENTS" | head -10
git log --oneline -S "$ARGUMENTS" | head -10
```

### Step 3: Search forensics reports

```bash
grep -rl "$ARGUMENTS" .planning/forensics/ 2>/dev/null | head -5
```

### Step 4: Output results

Format findings:

```
Search: "{keyword}"

DECISIONS:
  [DEC-XXX] {title} — {date}
  Context: {why it was needed}
  Decision: {what was decided}

ANTI-PATTERNS:
  {pattern name} — {why it's bad}

GIT HISTORY:
  {hash} {commit message}

FORENSICS:
  {report file} — {issue title}
```

If nothing found: "No records found for '{keyword}'. Check spelling or try a broader term."

## Rules

- Read-only — never modify files
- If $ARGUMENTS is empty: "Provide a keyword. Example: /frame:why auth"
