# STATE.md — Current Position

## Current Position
- Phase: SETUP
- Feature: Framework initialization
- Status: FRAME installed, awaiting /frame:init scan

## Completed
- [x] FRAME installed via the-frame CLI

## Notes
- Run /frame:init to scan your codebase and populate MAP.md
- Run /frame:doctor to verify all systems
- Keep this file small: `## Current Position` is **overwritten**, not appended. Feature history lives in `docs/specs/{feature}/` and git — don't accumulate it here. Past ~200 lines, run /frame:cleanup-memory to rotate old blocks into `.planning/sessions/state-archive.md`.
