# /frame:explain -- Explain Code Decision History

Why does this code look the way it does? Surfaces decisions, patterns, and history behind a file or function.

## Instructions

### Step 0: Fail-fast

Require a file path or function/symbol name. If missing, STOP: "What do you want explained? Provide a file path or function name."

### Step 1: Read the target

```bash
cat {file_path} 2>/dev/null | head -100
```

If a function name was given, find it:
```bash
grep -rn "function {name}\|const {name}\|def {name}\|func {name}" . \
  --include="*.ts" --include="*.js" --include="*.py" --include="*.go" \
  --include="*.rs" | grep -v node_modules | head -10
```

### Step 2: Search decisions memory

```bash
grep -i "{keywords}" .planning/memory/decisions.md 2>/dev/null | head -10
grep -i "{keywords}" .planning/memory/anti-patterns.md 2>/dev/null | head -10
grep -i "{keywords}" .planning/memory/patterns.md 2>/dev/null | head -10
```

### Step 3: Search git history

```bash
git log --oneline --follow -- {file_path} 2>/dev/null | head -10
git log --oneline -S "{function_name}" 2>/dev/null | head -5
git log --oneline --grep="{keywords}" 2>/dev/null | head -5
```

Read the most relevant commit messages in full:
```bash
git show {commit_hash} --stat --format="%B" 2>/dev/null | head -30
```

### Step 4: Check forensics reports

```bash
ls .planning/forensics/ 2>/dev/null
grep -l "{keywords}" .planning/forensics/*.md 2>/dev/null | head -3
```

Read any matching forensics reports (first 40 lines each).

### Step 5: Output explanation

```
## Why {file or function}?

### What it does
{1-2 sentences on the current behavior}

### Why it looks this way
{Key decisions that shaped this code — from memory, git, forensics}

### Decisions
{List of relevant DEC-XXX from decisions.md, or "No recorded decisions"}

### Patterns applied
{Patterns from patterns.md that apply here, or "None recorded"}

### Watch out for
{Anti-patterns from anti-patterns.md relevant to this area, or "None recorded"}

### History
{Key commits that changed this file/function, with dates}
```

If nothing was found in memory or git: say so explicitly — "No recorded history found. This code has no documented decisions."

## Rules

- No code changes
- Output only — no file writes
- If file doesn't exist: "File not found: {path}"
