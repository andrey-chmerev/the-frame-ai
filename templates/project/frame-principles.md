<!-- FRAME:PRINCIPLES:START — framework-owned, refreshed by /frame:upgrade. Do not hand-edit; override in the project sections of CLAUDE.md instead. -->
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

**Universal principles** (language-independent; project Rules in CLAUDE.md override these on conflict):
- ❌ Skip verification steps — D→P→D: always confirm an LLM change with a deterministic check
- ❌ Skip tests for new features
- ❌ Edit a file on assumptions — fact-check who imports it and what breaks first
- ✅ Classify task SIZE before diving in — trivial/small skip the heavy ceremony
- ✅ Capture learning after substantial work (Reflect is a required step, not optional)
<!-- FRAME:PRINCIPLES:END -->
