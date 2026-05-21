#!/bin/bash
# safety-net.sh - Blocks dangerous bash commands

read -r input

COMMAND=$(node -e "try{const i=JSON.parse(process.argv[1]);process.stdout.write(i.tool_input?.command??'')}catch{}" -- "$input" 2>/dev/null)

if echo "$COMMAND" | grep -qiE 'rm\s+-[a-zA-Z]*r[a-zA-Z]*f|rm\s+--recursive.*--force|rm\s+--force.*--recursive|\bDROP\s+(TABLE|DATABASE)\b'; then
  node -e "process.stdout.write(JSON.stringify({hookSpecificOutput:{hookEventName:'PreToolUse',permissionDecision:'deny',permissionDecisionReason:'FRAME Safety Net: Destructive command blocked (rm -rf or DROP TABLE/DATABASE). Use specific, safer alternatives.'}}))"
  exit 0
fi

exit 0
