---
description: "Document module architecture and design decisions for a file or module"
argument-hint: "<file or module path>"
allowed-tools: [Read, Write, Bash]
---
# /frame:arch — Module Architecture

**Module:** $ARGUMENTS

Analyse the module and generate `docs/arch/{module}.md` with its architecture description.

## Instructions

### Step 0: Fail-fast

If `$ARGUMENTS` is empty, STOP: "Which module? Provide a module name or path (e.g. `/frame:arch chat` or `/frame:arch src/payments`)."

### Step 1: Locate the module

Find relevant files:
```bash
find . -type f \( -name "*.ts" -o -name "*.js" -o -name "*.py" -o -name "*.go" \) \
  | grep -i "{module}" | grep -v node_modules | grep -v dist | head -30
```

If nothing found, try broader search:
```bash
grep -rn "{module}" . --include="*.ts" --include="*.js" --include="*.py" --include="*.go" \
  -l | grep -v node_modules | grep -v dist | head -20
```

If still nothing: STOP — "Module '{module}' not found. Check the name and try again."

### Step 2: Read the files

Read all located files fully. For large files (>200 lines), focus on:
- Exports / public API
- Main classes, functions, types
- Imports (what this module depends on)

### Step 3: Find entry points and dependencies

```bash
grep -rn "import.*{module}\|require.*{module}\|from.*{module}" . \
  --include="*.ts" --include="*.js" --include="*.py" --include="*.go" \
  | grep -v node_modules | grep -v dist | head -20
```

This shows who depends on this module.

### Step 4: Check existing doc

```bash
cat docs/arch/{module}.md 2>/dev/null
```

If it exists, note what has changed since it was written.

### Step 5: Generate the document

Create or overwrite `docs/arch/{module}.md`:

```markdown
# {Module} — Architecture

> Generated: {date}

## Overview

{2-3 sentences: what this module does and why it exists}

## Responsibilities

- {responsibility 1}
- {responsibility 2}
- ...

## File Structure

| File | Role |
|------|------|
| {file} | {what it does} |

## Public API

{Key exports, functions, classes with one-line descriptions}

## Dependencies

**Depends on:**
- {internal module or external package} — {why}

**Used by:**
- {module or file} — {how}

## Data Flow

{Describe how data enters, transforms, and exits this module. Use plain text or a simple ASCII diagram.}

## Key Decisions

{Non-obvious design choices, constraints, or trade-offs. If none — omit this section.}
```

Write the file:
```bash
mkdir -p docs/arch
```
Then write `docs/arch/{module}.md` with the generated content.

### Step 6: Confirm

Report: "Architecture documented → `docs/arch/{module}.md`" and list the files analysed.

## Rules

- Overwrite if file already exists — always reflect current state
- No code changes, only the doc file
- Keep the doc factual — describe what exists, not what should exist
- If the module spans many files, summarise patterns rather than listing every detail
