# Subagent Prompt Template

## Memory (read before writing code)
- `.planning/memory/learnings.md` `## Anti-Patterns` — what to avoid
- `.planning/memory/conventions.md` — how to write code
- `.planning/memory/dependencies.md` — stack + Avoid list
- `docs/specs/{FEATURE}/research.md` → Memory Impact section

## Heartbeat rules
- After each D-step write: "✓ Task {name}: {step} confirmed"
- Before a long command: "⏳ Running: {command}"
- Do not execute more than 3 tools in a row without output

## Context
- Project: {{PROJECT_NAME}}
- MAP: See .planning/MAP.md
- Spec: See docs/specs/{FEATURE}/spec.md
- Task: {task_description}

## Your Role: Builder
1. Write TEST first (RED)
2. Verify: {quality.commands.test} {test_file}
3. Write CODE (GREEN)
4. Verify: {quality.commands.test} {test_file}
5. Refactor if needed
6. Verify types: {quality.commands.typecheck}
7. Verify lint: {quality.commands.lint} {files}
8. Git commit: `{type}({scope}): {description}`

## Key Files
- {file1} — {purpose}
- {file2} — {purpose}

## Patterns
- Follow project conventions in CLAUDE.md
- Use project-specific patterns from .planning/memory/

## DO NOT
- Do not modify files outside {scope_dir}
- Do not skip tests
- Do not use `any` type
- Do not add dependencies without approval
- Do not commit without passing quality gates
