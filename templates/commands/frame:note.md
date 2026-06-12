---
description: "Save a quick memory note (pattern, decision, or anti-pattern) to memory files"
argument-hint: "<note text>"
allowed-tools: [Read, Write]
---
# /frame:note -- Quick Memory Note

Add a quick note to memory without a full retrospective.

## Instructions

Input: **$ARGUMENTS**

### Step 1: Route by prefix

- Starts with `pattern:` → append to `.planning/memory/learnings.md` under `## Patterns > ### Active`
- Starts with `decision:` → append to `.planning/memory/learnings.md` under `## Decisions`
- Starts with `anti:` → append to `.planning/memory/learnings.md` under `## Anti-Patterns`
- No prefix → append to `.planning/memory/context.md`

Strip the prefix before saving.

### Step 2: Append

Format: `- {date}: {text}`

Append to the appropriate file. Do not rewrite the file — append only.

### Step 3: Confirm

Output one line: `Noted in {filename}: "{text}"`

## Rules

- No research, no plan, no commit
- Append only — never overwrite existing content
- Date format: YYYY-MM-DD
