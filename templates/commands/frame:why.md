---
description: "Explain why code looks the way it does — or search decision history by keyword"
argument-hint: "<keyword | file path | function name>"
allowed-tools: [Read, Bash, Grep]
---
# /frame:why -- Explain Code and Search Decision History

Two modes: explain a specific file/function (what it does and why it looks that way), or search decision history by keyword.

### Routing

- `<file path>` (argument contains `/` or a file extension like `.ts`, `.js`, `.py`) — explain mode: read the file, surface decisions, git history, anti-patterns behind it
- `function:<name>` — explain mode for a function/symbol
- `<keyword>` — search mode: grep memory + git log for that keyword

---

## Mode: explain (file path or function name)

Triggered by: `/frame:why path/to/file.ts` or `/frame:why function:myFunction`

Surfaces decisions, patterns, and history behind a file or function.

### Step E0: Fail-fast

Require a file path or function name. If $ARGUMENTS is empty: "What do you want explained? Provide a file path or function name."

### Step E1: Read the target

```bash
cat {file_path} 2>/dev/null | head -100
```

If a function name was given, find it:
```bash
grep -rn "function {name}\|const {name}\|def {name}\|func {name}" . \
  --include="*.ts" --include="*.js" --include="*.py" --include="*.go" \
  --include="*.rs" | grep -v node_modules | head -10
```

### Step E2: Search decisions memory

```bash
grep -i "{keywords}" .planning/memory/learnings.md 2>/dev/null | head -20
```

### Step E3: Search git history

```bash
git log --oneline --follow -- {file_path} 2>/dev/null | head -10
git log --oneline -S "{function_name}" 2>/dev/null | head -5
git log --oneline --grep="{keywords}" 2>/dev/null | head -5
```

Read the most relevant commit messages in full:
```bash
git show {commit_hash} --stat --format="%B" 2>/dev/null | head -30
```

### Step E4: Check forensics reports

```bash
ls .planning/forensics/ 2>/dev/null
grep -l "{keywords}" .planning/forensics/*.md 2>/dev/null | head -3
```

### Step E5: Output explanation

```
## Why {file or function}?

### What it does
{1-2 sentences on the current behavior}

### Why it looks this way
{Key decisions that shaped this code — from memory, git, forensics}

### Decisions
{List of relevant DEC-XXX from learnings.md, or "No recorded decisions"}

### Patterns applied
{Patterns from learnings.md that apply here, or "None recorded"}

### Watch out for
{Anti-patterns from learnings.md relevant to this area, or "None recorded"}

### History
{Key commits that changed this file/function, with dates}
```

If nothing was found: say so explicitly — "No recorded history found. This code has no documented decisions."

---

## Mode: search (keyword)

Triggered by: `/frame:why <keyword>`

Find why a decision was made. Searches memory and git history.

### Step S1: Search memory files

```bash
grep -i "$ARGUMENTS" .planning/memory/learnings.md 2>/dev/null
```

### Step S2: Search git history

```bash
git log --oneline --grep="$ARGUMENTS" | head -10
git log --oneline -S "$ARGUMENTS" | head -10
```

### Step S3: Search forensics reports

```bash
grep -rl "$ARGUMENTS" .planning/forensics/ 2>/dev/null | head -5
```

### Step S4: Output results

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
- If $ARGUMENTS is empty: "Provide a keyword or file path. Example: /frame:why auth or /frame:why src/lib/auth.ts"
