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
