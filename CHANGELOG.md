# Changelog

All notable changes to FRAME are documented here.

## [0.14.0] — upcoming

### Removed
- `--copilot` flag and GitHub Copilot Chat support (FRAME is Claude Code only)
- Dead `bin/the-frame` binary
- Empty `.claude/skills/` directory creation on init

### Fixed
- `$ARGUMENTS` binding in `/frame:arch` and `/frame:estimate` commands
- Windows path handling in project file copying (`replace()` → `path.relative()`)
- `dirname()` used correctly instead of `join(dest, '..')`
- Junk files (`.DS_Store`, `Thumbs.db`) filtered when copying templates
- Custom language code input now documented in the language selection prompt
- Duplicate `// 5.` comment labels in update.js

## [0.13.0] — 2026-06-12

### Fixed (P0 — critical)
- Memory, ROADMAP, CONTEXT, specs installed to correct paths (`.planning/memory/`, `.planning/ROADMAP.md`, `docs/specs/`)
- `quality-gate.sh` rewritten to use stdin contract (was reading non-existent `CLAUDE_TOOL_INPUT`)
- All `npx the-frame` references replaced with `npx the-frame-ai`
- Permission rules now use correct `Bash(cmd:*)` syntax
- Playwright MCP written to `.mcp.json` (correct location, not `settings.json`)
- `/frame:rollback` can now execute `git reset --hard` on `frame/checkpoint/*` tags
- Security/perf grep patterns rewritten to POSIX ERE (no PCRE, no brace-globs)
- `/frame:wave-team` uses correct agent names (`security`, `performance-auditor`)
- `init` no longer overwrites user's existing `settings.local.json`
- `config.json` placeholder `{{PROJECT_NAME}}` substituted before write

### Fixed (P1 — high priority)
- `git-safety.sh`: false positives on `-f` substring; added word-boundary checks
- `safety-net.sh`: no longer hard-denies `rm -rf` in commit messages; catches `rm -fr`
- VS Code JSONC settings no longer silently overwritten on parse error
- `update` uses manifest to skip user-modified files; orphan detection added
- Hooks and permissions moved to shared `.claude/settings.json`
- All 31 commands have frontmatter (`description`, `argument-hint`, `allowed-tools`)
- Perf cluster unified: single report path `PERF_REPORT.md`
- `metrics.md` removed (was source of confabulation)
- CI: publish workflow now runs tests before publish; version/tag check added
- Agent model IDs use aliases (`sonnet`/`opus`); phantom `Agent` tool removed
- Agent `name` field added to all 9 agents

### Changed
- Commands consolidated: 43 → 31
- Memory files: 8 → 4 (`context.md`, `learnings.md`, `conventions.md`, `dependencies.md`)

## [0.12.0] — 2026-05-28

### Added
- REFRESH mode for `/frame:init` — re-run on existing projects without full reinstall
- Manifest-based update: tracks installed file hashes to detect user modifications

## [0.11.4] — 2026-05-25

### Added
- `/frame:test-plan` — manual user-acceptance checklist command
- `/frame:wave-team` — parallel review with conventions and tests agents

## [0.10.9] — 2026-05-21

### Added
- `/frame:verify-ui` — UI verification command with Playwright MCP integration
- Frontend project detection during init (adds Playwright MCP to `.mcp.json`)
