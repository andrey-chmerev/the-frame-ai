#!/bin/bash
# quality-gate.sh - Runs typecheck and lint after file changes (PostToolUse hook)

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
if [ -f ".frame/config.json" ] && command -v node &>/dev/null; then
  CONFIG_VALID=$(node -e "try{JSON.parse(require('fs').readFileSync('.frame/config.json','utf8'));process.stdout.write('ok')}catch(e){process.stdout.write('invalid: '+e.message)}" 2>/dev/null)
  if [ "$CONFIG_VALID" != "ok" ]; then
    echo "FRAME Quality Gate: .frame/config.json is malformed — $CONFIG_VALID" >&2
    echo "Fix it or run /frame:doctor to diagnose." >&2
    exit 2
  fi
  TYPECHECK_CMD=$(node -e "try{const c=JSON.parse(require('fs').readFileSync('.frame/config.json','utf8'));process.stdout.write(c.quality?.commands?.typecheck||'')}catch{}" 2>/dev/null)
  LINT_CMD=$(node -e "try{const c=JSON.parse(require('fs').readFileSync('.frame/config.json','utf8'));process.stdout.write(c.quality?.commands?.lint||'')}catch{}" 2>/dev/null)
fi

# Fallback: TypeScript-only detection
if [ -z "$TYPECHECK_CMD" ] && echo "$FILE_PATH" | grep -qiE '\.(ts|tsx)$'; then
  TYPECHECK_CMD="npx tsc --noEmit"
fi
# Lint: report only, never --fix (avoid mutating files under Claude)
if [ -z "$LINT_CMD" ] && echo "$FILE_PATH" | grep -qiE '\.(ts|tsx|js|jsx|mjs|cjs)$'; then
  LINT_CMD="npx eslint \"$FILE_PATH\""
fi

run_cmd() {
  local cmd="$1"
  if ! echo "$cmd" | grep -qE '^(npx |npm run |yarn |pnpm |node |tsc |eslint |biome |deno )'; then
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
