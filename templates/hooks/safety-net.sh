#!/bin/bash
# safety-net.sh - Blocks dangerous bash commands

read -r input

COMMAND=$(node -e "try{const i=JSON.parse(process.argv[1]);process.stdout.write(i.tool_input?.command??'')}catch{}" -- "$input" 2>/dev/null)

deny() {
  node -e "process.stdout.write(JSON.stringify({hookSpecificOutput:{hookEventName:'PreToolUse',permissionDecision:'deny',permissionDecisionReason:process.argv[1]}}))" -- "$1"
  exit 0
}

ask() {
  node -e "process.stdout.write(JSON.stringify({hookSpecificOutput:{hookEventName:'PreToolUse',permissionDecision:'ask',permissionDecisionReason:process.argv[1]}}))" -- "$1"
  exit 0
}

# Block DROP TABLE/DATABASE (SQL destructive DDL)
if echo "$COMMAND" | grep -qiE '\bDROP\s+(TABLE|DATABASE)\b'; then
  deny "FRAME Safety Net: DROP TABLE/DATABASE blocked. Use migrations or do it manually."
fi

# Block rm with recursive+force flags in any order, including separated flags
# Match: rm -rf, rm -fr, rm -r -f, rm -f -r, rm --recursive --force, rm --force --recursive
# Avoid matching text inside quoted commit messages: check the actual command token, not message content
# Strip quoted strings before checking (simple heuristic: remove content in single/double quotes)
STRIPPED_CMD=$(echo "$COMMAND" | node -e "
const s = require('fs').readFileSync('/dev/stdin','utf8');
// Remove single-quoted and double-quoted strings
const stripped = s.replace(/'[^']*'/g,'').replace(/\"[^\"]*\"/g,'');
process.stdout.write(stripped);
" 2>/dev/null || echo "$COMMAND")

if echo "$STRIPPED_CMD" | grep -qE '(^|\s|\|)rm\s'; then
  # Check for recursive+force combination
  if echo "$STRIPPED_CMD" | grep -qE '(^|\s|\|)rm\s+(-[a-zA-Z]*r[a-zA-Z]*f[a-zA-Z]*|-[a-zA-Z]*f[a-zA-Z]*r[a-zA-Z]*)(\s|$)' || \
     echo "$STRIPPED_CMD" | grep -qE '(^|\s|\|)rm\s+-r\s.*-f|rm\s+-f\s.*-r' || \
     echo "$STRIPPED_CMD" | grep -qiE '(^|\s|\|)rm\s+(-r|-f|\s)*--recursive\s*--force|(^|\s|\|)rm\s+(-r|-f|\s)*--force\s*--recursive'; then
    ask "FRAME Safety Net: Recursive force delete detected. Are you sure you want to delete these files permanently?"
  fi
fi

exit 0
