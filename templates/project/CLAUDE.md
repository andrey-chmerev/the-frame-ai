# CLAUDE.md — {{PROJECT_NAME}}

## Tech Stack

(to be filled after /frame:init scan)

## Architecture

(to be filled after /frame:init scan)

## Key Patterns

(to be filled after /frame:init scan)

## Code Conventions

- **File naming**: (define your convention)
- **Imports**: (define your import order)
- **Git**: `{type}({scope}): {description}` — types: feat, fix, refactor, test, docs, chore
- **Tests**: (define your test location convention)

## Rules (MUST follow)

1. Always run quality checks before commit
2. New features require tests
3. (add project-specific rules here)

## FRAME Framework

This project uses FRAME (Framework for AI-Assisted Solo Development).

**Commands**:
- `/frame:init` — initialize project
- `/frame:status` — current state
- `/frame:fast <task>` — quick task
- `/frame:research <topic>` — domain research
- `/frame:plan <feature>` — plan feature
- `/frame:build` — implement with TDD
- `/frame:review` — code review
- `/frame:security` — security audit (secrets, OWASP, infra, AI)
- `/frame:ship` — git + PR
- `/frame:debug <issue>` — systematic debugging
- `/frame:retrospective` — retrospective + memory update
- `/frame:cleanup-memory` — trim and archive memory files

**Key files**:
- `.planning/STATE.md` — current position
- `.planning/MAP.md` — project map
- `.planning/ROADMAP.md` — roadmap
- `.frame/config.json` — FRAME configuration
- `.planning/memory/` — project memory

**Quality Gates** (D→P→D pattern: Deterministic check → Probabilistic/LLM change → Deterministic verify):
- `{quality.commands.typecheck}` — Type check
- `{quality.commands.test}` — Test check
- `{quality.commands.lint}` — Lint check
- `{quality.commands.build}` — Build check (before Ship)

## Anti-Patterns (NEVER do)

- ❌ Skip verification steps (D→P→D: always confirm LLM output with a deterministic check)
- ❌ Skip tests for new features
