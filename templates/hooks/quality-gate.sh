#!/bin/bash
# quality-gate.sh - Runs typecheck and lint after file changes (PostToolUse hook)
#
# Resource guards. This hook fires after EVERY Edit/Write, and several Claude
# sessions (plus their subagents) can share one repo, so an unguarded gate
# multiplies into dozens of concurrent whole-project typechecks:
#   1. Language guard — skip files the tool does not care about (.md/.json/.css).
#   2. Lint scoping   — lint the changed file, not the whole project.
#   3. Repo-wide lock — one gate run per repo; parallel sessions skip instead of piling up.
#   4. Debounce       — at most one run per FRAME_GATE_DEBOUNCE seconds (default 15).
#
# Env overrides: FRAME_GATE_DEBOUNCE (sec), FRAME_GATE_LOCK_TTL (sec),
# FRAME_GATE_NO_GUARD=1 (disable guards 3+4 — every edit runs the full gate).

read -r input

FILE_PATH=$(node -e "try{const i=JSON.parse(process.argv[1]);process.stdout.write(i.tool_input?.file_path||i.tool_input?.path||'')}catch{}" -- "$input" 2>/dev/null)

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Delivery-gate bookkeeping: count edits to *source* files this session
# (skip planning/memory bookkeeping — only real work should trip the gate).
# Read by delivery-gate.sh (Stop hook); reset by session-init.sh.
case "$FILE_PATH" in
  *.planning/*|*/.claude/*) : ;;  # not counted
  *)
    GD=$(git rev-parse --git-dir 2>/dev/null)
    if [ -n "$GD" ] && [ -d "$GD" ]; then
      EC=0; [ -f "$GD/frame-edit-count" ] && EC=$(cat "$GD/frame-edit-count" 2>/dev/null | tr -dc '0-9')
      [ -z "$EC" ] && EC=0
      echo $((EC + 1)) > "$GD/frame-edit-count" 2>/dev/null
    fi
    ;;
esac

# Read quality commands from config if available
TYPECHECK_CMD=""
LINT_CMD=""
LINT_FROM_CONFIG=0
if [ -f ".frame/config.json" ] && command -v node &>/dev/null; then
  CONFIG_VALID=$(node -e "try{JSON.parse(require('fs').readFileSync('.frame/config.json','utf8'));process.stdout.write('ok')}catch(e){process.stdout.write('invalid: '+e.message)}" 2>/dev/null)
  if [ "$CONFIG_VALID" != "ok" ]; then
    echo "FRAME Quality Gate: .frame/config.json is malformed — $CONFIG_VALID" >&2
    echo "Fix it or run /frame:doctor to diagnose." >&2
    exit 2
  fi
  TYPECHECK_CMD=$(node -e "try{const c=JSON.parse(require('fs').readFileSync('.frame/config.json','utf8'));process.stdout.write(c.quality?.commands?.typecheck||'')}catch{}" 2>/dev/null)
  LINT_CMD=$(node -e "try{const c=JSON.parse(require('fs').readFileSync('.frame/config.json','utf8'));process.stdout.write(c.quality?.commands?.lint||'')}catch{}" 2>/dev/null)
  [ -n "$LINT_CMD" ] && LINT_FROM_CONFIG=1
fi

# Fallback: TypeScript-only detection
if [ -z "$TYPECHECK_CMD" ] && echo "$FILE_PATH" | grep -qiE '\.(ts|tsx)$'; then
  TYPECHECK_CMD="npx tsc --noEmit"
fi
# Lint: report only, never --fix (avoid mutating files under Claude)
if [ -z "$LINT_CMD" ] && echo "$FILE_PATH" | grep -qiE '\.(ts|tsx|js|jsx|mjs|cjs)$'; then
  LINT_CMD="npx eslint \"$FILE_PATH\""
fi

# --- Guard 1: language relevance -------------------------------------------
# The extension checks above only guard the *fallback* commands. Once
# .frame/config.json defines typecheck/lint, those `-z` branches are skipped and
# the configured command used to run on every file — a full `tsc --noEmit` or
# `go vet ./...` fired on edits to .md, .json and .planning/* files.
cmd_matches_file() {
  local cmd="$1" file="$2" ext_re=""
  case "$cmd" in
    *tsc*|*vue-tsc*|*svelte-check*)               ext_re='\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$' ;;
    *eslint*|*biome*|*oxlint*|*prettier*)         ext_re='\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$' ;;
    "go "*|*"go vet"*|*"go build"*|*golangci*|*gofmt*|*staticcheck*) ext_re='\.go$' ;;
    *ruff*|*mypy*|*pyright*|*pylint*)             ext_re='\.py$' ;;
    *cargo*|*clippy*)                             ext_re='\.rs$' ;;
    *swiftlint*|*swift-format*|*xcodebuild*|"swift "*|*"swift build"*|*"swift test"*) ext_re='\.swift$' ;;
    *) return 0 ;;  # unknown tool — do not filter, keep previous behaviour
  esac
  echo "$file" | grep -qiE "$ext_re"
}

cmd_matches_file "$TYPECHECK_CMD" "$FILE_PATH" || TYPECHECK_CMD=""
cmd_matches_file "$LINT_CMD" "$FILE_PATH" || LINT_CMD=""

# Nothing to run — bail out before any expensive work.
if [ -z "$TYPECHECK_CMD" ] && [ -z "$LINT_CMD" ]; then
  exit 0
fi

# --- Guard 2: lint scoping --------------------------------------------------
# A configured `eslint .` lints the whole project on every edit. The hook only
# needs the changed file; full-project lint stays with /frame:review and ship.
if [ "$LINT_FROM_CONFIG" -eq 1 ] && [ -n "$LINT_CMD" ]; then
  case "$LINT_CMD" in
    *eslint*|*biome*|*oxlint*)
      SCOPED=$(printf '%s' "$LINT_CMD" | sed -E 's#[[:space:]]+(\.|\./|\*\*/\*|src|app)[[:space:]]*$##')
      LINT_CMD="$SCOPED \"$FILE_PATH\""
      ;;
    # SwiftLint takes paths positionally; without one it lints the whole project.
    *swiftlint*|*swift-format*)
      LINT_CMD="$LINT_CMD \"$FILE_PATH\""
      ;;
  esac
fi

# --- Guards 3+4: repo-wide lock + debounce ----------------------------------
# Use the common git dir so worktrees of one repo share a single lock.
GIT_COMMON=$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null)
[ -n "$GIT_COMMON" ] && [ -d "$GIT_COMMON" ] || GIT_COMMON=""

# GNU `stat -f` means --file-system and *succeeds* while printing filesystem
# stats, so a plain `stat -f %m || stat -c %Y` never reaches the fallback on
# Linux and yields garbage. Try GNU first, then BSD, and accept digits only.
mtime_of() {
  local m
  m=$(stat -c %Y "$1" 2>/dev/null)
  case "$m" in ''|*[!0-9]*) m=$(stat -f %m "$1" 2>/dev/null) ;; esac
  case "$m" in ''|*[!0-9]*) m='' ;; esac
  printf '%s' "$m"
}

LOCK_DIR=""
if [ -n "$GIT_COMMON" ] && [ "$FRAME_GATE_NO_GUARD" != "1" ]; then
  NOW=$(date +%s)
  DEBOUNCE=${FRAME_GATE_DEBOUNCE:-15}
  LOCK_TTL=${FRAME_GATE_LOCK_TTL:-600}

  # Debounce: the gate ran less than DEBOUNCE seconds ago — skip this edit.
  STAMP="$GIT_COMMON/frame-gate-last"
  if [ -f "$STAMP" ]; then
    LAST=$(mtime_of "$STAMP")
    if [ -n "$LAST" ] && [ $((NOW - LAST)) -lt "$DEBOUNCE" ]; then
      exit 0
    fi
  fi

  # Stale lock: a previous run died without releasing it — reclaim after TTL.
  LOCK_DIR="$GIT_COMMON/frame-gate.lock"
  if [ -d "$LOCK_DIR" ]; then
    LOCK_AT=$(mtime_of "$LOCK_DIR")
    if [ -n "$LOCK_AT" ] && [ $((NOW - LOCK_AT)) -gt "$LOCK_TTL" ]; then
      rmdir "$LOCK_DIR" 2>/dev/null
    fi
  fi

  # mkdir is atomic and portable — macOS ships no flock(1).
  # Held by another session/subagent → exit quietly instead of spawning a second run.
  if ! mkdir "$LOCK_DIR" 2>/dev/null; then
    exit 0
  fi
  trap 'rmdir "$LOCK_DIR" 2>/dev/null' EXIT INT TERM
  : > "$STAMP" 2>/dev/null
fi

run_cmd() {
  local cmd="$1"
  if ! echo "$cmd" | grep -qE '^(npx |npm run |yarn |pnpm |node |tsc |eslint |biome |deno |go |golangci-lint |ruff |mypy |cargo |swift |swiftlint |swift-format |xcodebuild )'; then
    echo "FRAME Quality Gate: command not in allowlist, skipping: $cmd" >&2
    return 0
  fi
  sh -c "$cmd" 2>&1
}

FAILED=0
RAN=0

if [ -n "$TYPECHECK_CMD" ]; then
  RAN=1
  OUTPUT=$(run_cmd "$TYPECHECK_CMD")
  if [ $? -ne 0 ]; then
    echo "FRAME Quality Gate: typecheck failed for $FILE_PATH" >&2
    echo "$OUTPUT" >&2
    FAILED=1
  fi
fi

if [ -n "$LINT_CMD" ]; then
  RAN=1
  OUTPUT=$(run_cmd "$LINT_CMD")
  if [ $? -ne 0 ]; then
    echo "FRAME Quality Gate: lint issues in $FILE_PATH" >&2
    echo "$OUTPUT" >&2
    FAILED=1
  fi
fi

# Record gate status so git-safety.sh can block `git commit` while the gate is red.
# Lives in the git dir (per-worktree, outside the working tree) so it never dirties `git status`.
# Only write when a check actually ran (never overwrite a real failure with a no-op pass).
GATE_DIR=$(git rev-parse --git-dir 2>/dev/null)
if [ "$RAN" -eq 1 ] && [ -n "$GATE_DIR" ] && [ -d "$GATE_DIR" ]; then
  if [ $FAILED -eq 1 ]; then
    printf 'fail\n%s\n%s\n' "$FILE_PATH" "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" > "$GATE_DIR/frame-gate-status" 2>/dev/null
  else
    printf 'pass\n%s\n%s\n' "$FILE_PATH" "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" > "$GATE_DIR/frame-gate-status" 2>/dev/null
  fi
fi

[ $FAILED -eq 1 ] && exit 2
exit 0
