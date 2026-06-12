#!/bin/bash
# quality-gate.sh - Runs typecheck and lint after file changes (PostToolUse hook)

read -r input

FILE_PATH=$(node -e "try{const i=JSON.parse(process.argv[1]);process.stdout.write(i.tool_input?.file_path||i.tool_input?.path||'')}catch{}" -- "$input" 2>/dev/null)

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

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

if [ -n "$TYPECHECK_CMD" ]; then
  OUTPUT=$(run_cmd "$TYPECHECK_CMD")
  if [ $? -ne 0 ]; then
    echo "FRAME Quality Gate: typecheck failed for $FILE_PATH" >&2
    echo "$OUTPUT" >&2
    FAILED=1
  fi
fi

if [ -n "$LINT_CMD" ]; then
  OUTPUT=$(run_cmd "$LINT_CMD")
  if [ $? -ne 0 ]; then
    echo "FRAME Quality Gate: lint issues in $FILE_PATH" >&2
    echo "$OUTPUT" >&2
    FAILED=1
  fi
fi

[ $FAILED -eq 1 ] && exit 2
exit 0
