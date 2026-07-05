---
description: "Upgrade FRAME framework files to the latest version with diff preview and changelog"
allowed-tools: [Bash]
disable-model-invocation: true
---
# /frame:upgrade -- Upgrade FRAME

Upgrades FRAME framework files to the latest version. Shows a diff and changelog before applying.

## Instructions

### Step 1: Check current version

```bash
cat .frame/.frame-version 2>/dev/null || echo "unknown"
```

Show: `Current FRAME version: {version}`

### Step 2: Check latest version

```bash
npm view the-frame-ai version 2>/dev/null || echo "unknown"
```

Show: `Latest FRAME version: {latest}`

If already up to date: "FRAME is already at the latest version ({version}). Nothing to upgrade."  
Stop here.

### Step 3: Dry run — show what will change

```bash
npx the-frame-ai@latest update . --dry-run 2>&1
```

Show the full dry-run output to the user so they can see exactly which files will be updated.

### Step 4: Show changelog

```bash
npx the-frame-ai@latest changelog 2>/dev/null || echo "(changelog not available for this version)"
```

If changelog is not available, note: "Run `npm view the-frame-ai versions` to see available versions."

### Step 5: Ask for confirmation

Output exactly:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Ready to upgrade FRAME: {current} → {latest}
  Files with user edits will NOT be overwritten (manifest check).
  New files will be added, removed files deleted.

  Proceed with upgrade? (y/n)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Wait for user response. If `n` or anything other than `y` — stop: "Upgrade cancelled."

### Step 6: Apply upgrade

```bash
npx the-frame-ai@latest update . 2>&1
```

Show the full output.

### Step 6.5: Re-sync the FRAME Principles block in CLAUDE.md

`update` refreshed the framework-owned principles into `.frame/frame-principles.md`. Splice that block into the project `CLAUDE.md` between the `FRAME:PRINCIPLES` markers — **without touching anything outside the markers** (the project's Tech Stack, Rules, Conventions, Anti-Patterns are yours and stay verbatim).

```bash
node -e '
  const fs = require("fs");
  const S = "<!-- FRAME:PRINCIPLES:START", E = "FRAME:PRINCIPLES:END -->";
  if (!fs.existsSync(".frame/frame-principles.md")) { console.log("no principles file — skip"); process.exit(0); }
  const block = fs.readFileSync(".frame/frame-principles.md", "utf8").trim();
  let md = fs.readFileSync("CLAUDE.md", "utf8");
  const s = md.indexOf(S), e = md.indexOf(E);
  if (s === -1 || e === -1) {
    // Older CLAUDE.md without markers: append the block once, do not restructure the rest.
    md = md.trimEnd() + "\n\n" + block + "\n";
    console.log("markers not found — appended principles block");
  } else {
    const end = md.indexOf("\n", e) === -1 ? md.length : md.indexOf("\n", e) + 1;
    md = md.slice(0, s) + block + "\n" + md.slice(end);
    console.log("principles block re-synced between markers");
  }
  fs.writeFileSync("CLAUDE.md", md);
'
```

Report: "FRAME Principles re-synced; your project rules were left untouched."

### Step 7: Verify

```bash
cat .frame/.frame-version
```

Output:
```
✅ FRAME upgraded to {new-version}
   Run /frame:doctor to verify the installation.
```

## Rules

- **Always show diff first** — never apply without Step 3
- **Always ask for confirmation** — never auto-apply (Step 5 is mandatory)
- **Respect manifest** — update.js protects user-edited files; do not override with --force

## When to Use

- When you see a new version announced
- When a command is missing or behaves unexpectedly
- Periodically (monthly) to get bug fixes and new commands
