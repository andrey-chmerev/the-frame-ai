# CLAUDE.md — {{PROJECT_NAME}}

<!--
  Two tiers below:
  1. PROJECT RULES (this top part) — yours. Filled by /frame:init from the codebase scan,
     edited freely, and promoted into by /frame:evolve. Never overwritten by an upgrade.
  2. FRAME PRINCIPLES (between the FRAME:PRINCIPLES markers near the bottom) — framework-owned,
     language-independent. Refreshed by /frame:upgrade. Do not hand-edit that block; put your
     own rules up here — specific (project) always beats general (principles) on any conflict.
-->

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

<!-- Project-specific rules. /frame:evolve promotes proven learnings here. These OVERRIDE the FRAME Principles below on any conflict. -->

1. Always run quality checks before commit
2. New features require tests
3. (add project-specific rules here)

## Anti-Patterns (NEVER do)

<!-- Project-specific anti-patterns discovered during development. -->

- ❌ (add project-specific anti-patterns here — /frame:retrospective and /frame:evolve fill this)

<!-- FRAME:PRINCIPLES:START — framework-owned, refreshed by /frame:upgrade. Do not hand-edit; override in the sections above instead. -->
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
- `/frame:parallel` — parallel feature work in worktrees (start/status/stop)
- `/frame:integrate` — merge parallel features with gates + cross-feature review
- `/frame:security` — security audit (secrets, OWASP, infra, AI)
- `/frame:ship` — git + PR
- `/frame:debug <issue>` — systematic debugging
- `/frame:retrospective` — retrospective + memory update
- `/frame:evolve` — promote proven learnings into permanent CLAUDE.md rules
- `/frame:cleanup-memory` — trim and archive memory files

**Key files**:
- `.planning/STATE.md` — current position
- `.planning/BOARD.md` — parallel task board (created by /frame:parallel)
- `.planning/MAP.md` — project map
- `.planning/ROADMAP.md` — roadmap
- `.frame/config.json` — FRAME configuration
- `.planning/memory/` — project memory

**Quality Gates** (D→P→D pattern: Deterministic check → Probabilistic/LLM change → Deterministic verify):
- `{quality.commands.typecheck}` — Type check
- `{quality.commands.test}` — Test check
- `{quality.commands.lint}` — Lint check
- `{quality.commands.build}` — Build check (before Ship)

**Decision Standard (architecture-first)** — applies to research, plan, build, review, fix:
- Solve the **root cause with the right architecture**. A workaround that only silences the symptom is a defect, not a solution: swallowed errors, `any`/`@ts-ignore`/`eslint-disable` instead of a real type or contract, `sleep`/blind retry instead of real synchronisation, copy-paste instead of the existing abstraction, a hard-coded value that belongs in config/data, patching the caller when the contract is wrong, `// temporary` with no follow-up.
- If the correct approach costs more, still propose it and state the cost beside it. Choosing the cheap variant is the user's explicit call, never a silent default.
- **technical decision** — the best option is derivable from the code, conventions, data, or the requirement already agreed in research (layering, contracts, algorithms, error handling, naming, tests, how a security control is implemented, performance, refactors, dependency choice). **Decide it yourself**, record it in the Decision Log with the rejected alternatives. Never ask.
- **product decision** — the answer needs intent that does not exist in the repo (what the feature should do, scope and priority, business rules and policy, money semantics, who may access what, UX and copy, legal/retention, external commitments). **Only these are asked** — in research, or as an autopilot halt.
- Touching a sensitive area (auth, money, migrations, routing) does **not** make a decision product-class. Hashing a password wrong, a token leaked into logs, an unindexed query on the payments table — technical, one right answer, fix it. "Which roles may refund an order" — product, ask.

**Universal principles** (language-independent; project Rules above override these on conflict):
- ❌ Skip verification steps — D→P→D: always confirm an LLM change with a deterministic check
- ❌ Skip tests for new features
- ❌ Edit a file on assumptions — fact-check who imports it and what breaks first
- ✅ Classify task SIZE before diving in — trivial/small skip the heavy ceremony
- ✅ Capture learning after substantial work (Reflect is a required step, not optional)
<!-- FRAME:PRINCIPLES:END -->
