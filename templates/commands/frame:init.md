# /frame:init -- Project Initialization

> **This is a slash command** — run it inside Claude Code after `npx the-frame init` has already installed the framework.
> It scans your codebase and fills MAP.md, CLAUDE.md, and CONTEXT.md.
> Not to be confused with `the-frame init` (the CLI installer).

Scans the project and fills MAP.md, CLAUDE.md, and CONTEXT.md with a complete project map.

## Instructions

### Step 0: Auto-detect Stack

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

### Step 1: Surface Scan

Read the project config files (those that exist):
- `package.json` / `go.mod` / `Cargo.toml` / `pyproject.toml` — dependencies, versions
- `tsconfig.json` / `jsconfig.json` — compiler settings
- `.env.example` / `.env` — environment variables
- `Dockerfile` / `docker-compose.yml` — deployment
- `README.md` — project description

### Step 2: Structure Scan

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

### Step 3: Patterns Scan

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

### Step 4: Dependencies Scan

Determine inter-module dependencies:

```
grep -r "^import\|^from\|^require\|^use " . \
  --include="*.ts" --include="*.go" --include="*.py" --include="*.rs" \
  -h 2>/dev/null | sort | uniq -c | sort -rn | head -30
```

Check for: database, cache, queues, external APIs.

### Step 5: Dynamics Scan

Determine data flow and async patterns:

```
grep -r "async\|await\|goroutine\|channel\|Promise\|Observable\|WebSocket\|EventSource" . \
  --include="*.ts" --include="*.go" --include="*.py" --include="*.rs" \
  -l 2>/dev/null | head -10
```

### Step 6: Fill MAP.md

Write results to `.planning/MAP.md`:

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

Fill in the placeholders in `CLAUDE.md` — this is the main file Claude reads on every run:

- **Tech Stack** — specific stack from step 0
- **Architecture** — brief description from step 6
- **Key Patterns** — 3-5 patterns from the code

### Step 8: Update CONTEXT.md

Fill in the `## Technical Context` section in `.planning/CONTEXT.md`:
- Project type and stack
- Main entry points
- Key dependencies

### Step 9: Update STATE.md

Update `.planning/STATE.md`:
```markdown
## Current Position
- Phase: SETUP
- Status: MAP.md filled, project ready to work
```

### Step 10: Fill memory from scan results

Using data already gathered in steps 1-5, fill two memory files:

**`.planning/memory/conventions.md`** — add what was detected:
- File naming pattern (kebab-case, camelCase, etc.)
- Import style (named vs default, path aliases)
- Git commit format (if `.gitmessage` or recent commits reveal a pattern)

**`.planning/memory/dependencies.md`** — add:
- Core dependencies (from package.json / go.mod / etc.)
- Dev tools (test runner, linter, bundler)
- Any "avoid" patterns spotted (e.g., deprecated packages)

Only fill what was actually found — no placeholders.

### Step 11: Output completion checklist

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

## Result

- `.planning/MAP.md` — complete project map
- `CLAUDE.md` — stack and architecture sections filled
- `.planning/CONTEXT.md` — technical context filled
- `.planning/STATE.md` — status updated
- `.planning/memory/conventions.md` — conventions from scan
- `.planning/memory/dependencies.md` — dependencies from scan
