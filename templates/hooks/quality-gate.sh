#!/bin/bash
# quality-gate.sh - Runs typecheck and lint after file changes

FILE_PATH=$(node -e "try{const i=JSON.parse(process.env.CLAUDE_TOOL_INPUT||'{}');process.stdout.write(i.file_path||i.path||'')}catch{}" 2>/dev/null)

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Read quality commands from config if available
TYPECHECK_CMD=""
LINT_CMD=""
if [ -f ".frame/config.json" ] && command -v node &>/dev/null; then
  CONFIG_VALID=$(node -e "try{JSON.parse(require('fs').readFileSync('.frame/config.json','utf8'));process.stdout.write('ok')}catch(e){process.stdout.write('invalid: '+e.message)}" 2>/dev/null)
  if [ "$CONFIG_VALID" != "ok" ]; then
    echo "FRAME Quality Gate: .frame/config.json is malformed — $CONFIG_VALID"
    echo "Fix it or run /frame:doctor to diagnose."
    exit 0
  fi
  TYPECHECK_CMD=$(node -e "try{const c=JSON.parse(require('fs').readFileSync('.frame/config.json','utf8'));process.stdout.write(c.quality?.commands?.typecheck||'')}catch{}" 2>/dev/null)
  LINT_CMD=$(node -e "try{const c=JSON.parse(require('fs').readFileSync('.frame/config.json','utf8'));process.stdout.write(c.quality?.commands?.lint||'')}catch{}" 2>/dev/null)
fi

# Fallback: TypeScript-only detection
if [ -z "$TYPECHECK_CMD" ] && echo "$FILE_PATH" | grep -qiE '\.(ts|tsx)$'; then
  TYPECHECK_CMD="npx tsc --noEmit"
  LINT_CMD="npx eslint --fix \"$FILE_PATH\""
fi

run_cmd() {
  local cmd="$1"
  # Only allow commands starting with known safe prefixes
  if ! echo "$cmd" | grep -qE '^(npx |npm run |yarn |pnpm |node |tsc |eslint |biome |deno )'; then
    echo "FRAME Quality Gate: command not in allowlist, skipping: $cmd"
    return 0
  fi
  sh -c "$cmd" 2>/dev/null
}

if [ -n "$TYPECHECK_CMD" ]; then
  if ! run_cmd "$TYPECHECK_CMD"; then
    echo "FRAME Quality Gate: typecheck failed for $FILE_PATH"
  fi
fi

if [ -n "$LINT_CMD" ]; then
  if ! run_cmd "$LINT_CMD"; then
    echo "FRAME Quality Gate: lint issues in $FILE_PATH"
  fi
fi

exit 0
