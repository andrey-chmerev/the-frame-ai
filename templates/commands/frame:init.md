---
description: "Initialize project: scan codebase, fill MAP.md, STATE.md, and memory files"
allowed-tools: [Read, Write, Edit, Bash]
---
# /frame:init -- Project Initialization & Refresh

> **This is a slash command** — run it inside Claude Code after `npx the-frame init` has already installed the framework.
> It scans your codebase and fills MAP.md, CLAUDE.md, and CONTEXT.md.
> Not to be confused with `the-frame init` (the CLI installer).

Scans the project and fills MAP.md, CLAUDE.md, and CONTEXT.md with a complete project map.

**Re-runnable.** Run it again any time the project grows — new stack, new modules, new
dependencies. On a second run it works in **REFRESH mode**: it updates the auto-generated
sections and leaves your hand-written content untouched (see Step 0).

## Instructions

### Step 0: Detect run mode (FIRST RUN vs REFRESH)

Check whether the project has already been mapped:

```bash
grep -l "filled by /frame:init\|to be filled after /frame:init" \
  .planning/MAP.md CLAUDE.md .planning/CONTEXT.md 2>/dev/null
```

- **Placeholders still present** → **FIRST RUN**. Fill everything (Steps 6–10 as written).
- **No placeholders** (files already have real content) → **REFRESH**. Follow the
  **Refresh rules** below. Announce: "Project already mapped — running in REFRESH mode."

#### Refresh rules (apply only in REFRESH mode)

Sections are split into two groups. Never cross the line.

| File | Auto-owned (regenerate) | User-owned (NEVER overwrite) |
|------|-------------------------|------------------------------|
| `CLAUDE.md` | Tech Stack, Architecture, Key Patterns | Code Conventions, Rules, Anti-Patterns, FRAME Framework |
| `MAP.md` | Quick Facts, Architecture Pattern, Entry Points, Key Layers, Data Flow, Key Patterns, File Inventory | Tech Debt / Notes (append only — keep existing lines) |
| `CONTEXT.md` | `## Technical Context` section only | everything else |
| `STATE.md` | — | **DO NOT touch Phase/Status.** Only append a refresh note (Step 9). |
| `memory/conventions.md` | — | merge/append only (Step 10) |
| `memory/dependencies.md` | — | merge/append only (Step 10) |

Before overwriting any auto-owned section, **back up the files once**:

```bash
mkdir -p .planning/.backup && cp CLAUDE.md .planning/MAP.md .planning/CONTEXT.md .planning/.backup/ 2>/dev/null
```

When you rewrite an auto-owned section, replace ONLY that section (match on its `##` heading,
stop at the next `##`). Do not reflow or reword neighbouring user-owned sections.

### Step 1: Auto-detect Stack

Identify the project type by checking for these files:
- `package.json` → Node.js/JS/TS (check framework: Next.js, Express, NestJS, Vue, Svelte, React)
- `go.mod` → Go
- `Cargo.toml` → Rust
- `requirements.txt` / `pyproject.toml` / `setup.py` → Python
- `pom.xml` / `build.gradle` → Java/Kotlin
- `composer.json` → PHP
- `*.csproj` / `*.sln` → .NET/C#

Run: `ls -la` and `cat README.md 2>/dev/null | head -30`

Record: **stack**, **language**, **framework**, **project type** (web/api/cli/library/mobile).

### Step 2: Surface Scan

Read the project config files (those that exist):
- `package.json` / `go.mod` / `Cargo.toml` / `pyproject.toml` — dependencies, versions
- `tsconfig.json` / `jsconfig.json` — compiler settings
- `.env.example` / `.env` — environment variables
- `Dockerfile` / `docker-compose.yml` — deployment
- `README.md` — project description

### Step 3: Structure Scan

Adapt commands to the detected stack:

**For JS/TS projects:**
```
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" \) \
  -not -path "*/node_modules/*" -not -path "*/.next/*" | head -60
ls -la src/ 2>/dev/null || ls -la app/ 2>/dev/null || true
```

**For Go:**
```
find . -name "*.go" -not -path "*/vendor/*" | head -60
```

**For Python:**
```
find . -name "*.py" -not -path "*/__pycache__/*" -not -path "*/venv/*" | head -60
```

**For Rust:**
```
find . -name "*.rs" -not -path "*/target/*" | head -60
```

**For any stack:**
```
find . -type d -not -path "*/node_modules/*" -not -path "*/.git/*" \
  -not -path "*/target/*" -not -path "*/__pycache__/*" | head -40
```

### Step 4: Patterns Scan

Look for patterns relevant to the detected stack:

**Auth/sessions:**
```
grep -r "auth\|session\|token\|login\|jwt\|oauth" . \
  --include="*.ts" --include="*.go" --include="*.py" --include="*.rs" \
  -l 2>/dev/null | head -10
```

**Entry points:**
```
find . -name "main.*" -o -name "index.*" -o -name "app.*" -o -name "server.*" \
  | grep -v node_modules | grep -v ".next" | head -15
```

**HTTP/API routes:**
```
grep -r "router\|route\|handler\|endpoint\|@Get\|@Post\|app\.get\|app\.post" . \
  --include="*.ts" --include="*.go" --include="*.py" -l 2>/dev/null | head -10
```

**Tests:**
```
find . -name "*_test.*" -o -name "*.test.*" -o -name "*.spec.*" \
  | grep -v node_modules | head -15
```

### Step 5: Dependencies & Dynamics Scan

Determine inter-module dependencies:

```
grep -r "^import\|^from\|^require\|^use " . \
  --include="*.ts" --include="*.go" --include="*.py" --include="*.rs" \
  -h 2>/dev/null | sort | uniq -c | sort -rn | head -30
```

Check for: database, cache, queues, external APIs.

Determine data flow and async patterns:

```
grep -r "async\|await\|goroutine\|channel\|Promise\|Observable\|WebSocket\|EventSource" . \
  --include="*.ts" --include="*.go" --include="*.py" --include="*.rs" \
  -l 2>/dev/null | head -10
```

### Step 6: Fill / refresh MAP.md

Write results to `.planning/MAP.md`. In REFRESH mode regenerate only the auto-owned
sections (see Step 0) and **keep every existing line under `## Tech Debt / Notes`** —
append new findings below them, don't replace.

```markdown
# Project Map -- {Project Name}

## Quick Facts
- **Name**: {name}
- **Type**: {web-app / api / cli / library / mobile}
- **Stack**: {language + framework + key dependencies}
- **Database**: {type and ORM/driver, if any}
- **Auth**: {auth type, if any}
- **Deploy**: {Docker / Vercel / Railway / bare metal / etc.}
- **Tests**: {testing framework}

## Architecture Pattern
{Description: MVC / Clean Architecture / Layered / Monolith / Microservices / etc.}

## Entry Points
{Main startup files, entrypoints, main functions}

## Key Layers
{Description of project layers — adapt to real structure, not a template}

## Data Flow
{How data moves: request → processing → response / storage}

## Key Patterns
| Pattern | Where Used |
|---------|-----------|
| {real patterns from code} |

## File Inventory
| Directory/File | Purpose |
|----------------|---------|
| {real project structure} |

## Tech Debt / Notes
{Anything notable spotted during scanning}
```

### Step 7: Update CLAUDE.md

Fill / refresh **only** these three sections — this is the main file Claude reads on every run:

- **Tech Stack** — specific stack from Step 1
- **Architecture** — brief description from Step 6
- **Key Patterns** — 3-5 patterns from the code

In REFRESH mode, **do not touch** `Code Conventions`, `Rules`, `Anti-Patterns`, or
`FRAME Framework` — the user may have customised them.

### Step 8: Update CONTEXT.md

Fill / refresh the `## Technical Context` section in `.planning/CONTEXT.md`:
- Project type and stack
- Main entry points
- Key dependencies

Leave all other sections of CONTEXT.md untouched.

### Step 9: Update STATE.md

- **FIRST RUN** — set the starting position:
  ```markdown
  ## Current Position
  - Phase: SETUP
  - Status: MAP.md filled, project ready to work
  ```
- **REFRESH** — **do not change Phase or Status** (the user may be mid-feature).
  Only append one line to the activity/log section:
  ```markdown
  - {date}: project map refreshed via /frame:init
  ```

### Step 10: Fill / merge memory from scan results

Using data already gathered in Steps 2-5, update two memory files. **Merge, never
overwrite** — read the existing file first, keep all current lines, add only what's new.

**`.planning/memory/conventions.md`** — add/confirm:
- File naming pattern (kebab-case, camelCase, etc.)
- Import style (named vs default, path aliases)
- Git commit format (if `.gitmessage` or recent commits reveal a pattern)

**`.planning/memory/dependencies.md`** — add/confirm:
- Core dependencies (from package.json / go.mod / etc.)
- Dev tools (test runner, linter, bundler)
- Any "avoid" patterns spotted (e.g., deprecated packages)

Only add what was actually found — no placeholders. If a line is already present, leave it.

### Step 11: Output completion checklist

**FIRST RUN:**
```
╔══════════════════════════════════════════╗
║  FRAME INIT — Complete                   ║
╠══════════════════════════════════════════╣
║  Filled:                                 ║
║    ✓ MAP.md — project map                ║
║    ✓ CLAUDE.md — stack + architecture    ║
║    ✓ CONTEXT.md — technical context      ║
║    ✓ STATE.md — phase set to SETUP       ║
║    ✓ memory/conventions.md               ║
║    ✓ memory/dependencies.md              ║
╠══════════════════════════════════════════╣
║  Review these files and correct anything ║
║  that looks wrong before proceeding.     ║
╠══════════════════════════════════════════╣
║  Next step:                              ║
║    /frame:research — start a feature     ║
║    /frame:fast     — quick task < 30min  ║
║    /frame:doctor   — verify installation ║
╚══════════════════════════════════════════╝
```

**REFRESH** — print a changelog of what actually changed, so the user can eyeball it:
```
╔══════════════════════════════════════════╗
║  FRAME INIT — Refresh complete           ║
╠══════════════════════════════════════════╣
║  Changes detected since last scan:       ║
║    • Stack:     {what changed, or "—"}   ║
║    • Deps:      {added / removed, or "—"}║
║    • Structure: {new modules, or "—"}    ║
║    • Patterns:  {new patterns, or "—"}   ║
╠══════════════════════════════════════════╣
║  Updated (auto sections only):           ║
║    ✓ MAP.md   ✓ CLAUDE.md   ✓ CONTEXT.md ║
║  Preserved: your Conventions / Rules /   ║
║  Anti-Patterns / STATE phase / notes.    ║
║  Backup: .planning/.backup/              ║
╚══════════════════════════════════════════╝
```

If nothing meaningful changed, say so plainly: "No significant changes since the last scan."

## Result

- `.planning/MAP.md` — complete project map
- `CLAUDE.md` — stack and architecture sections filled
- `.planning/CONTEXT.md` — technical context filled
- `.planning/STATE.md` — status updated (FIRST RUN only)
- `.planning/memory/conventions.md` — conventions from scan
- `.planning/memory/dependencies.md` — dependencies from scan

## Rules

- Re-runnable: REFRESH mode never overwrites user-authored sections or resets STATE phase.
- Back up auto-owned files to `.planning/.backup/` before rewriting them on refresh.
- When refreshing a section, replace only that `##` block — leave neighbours byte-for-byte intact.
- Only write what was actually found in the scan — no placeholders, no invented content.
