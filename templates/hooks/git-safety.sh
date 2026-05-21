#!/bin/bash
# git-safety.sh - Blocks dangerous git commands

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

if echo "$COMMAND" | grep -qiE 'git\s+push.*(--force|-f)' && ! echo "$COMMAND" | grep -q 'force-with-lease'; then
  deny "FRAME Git Safety: Force push blocked. Use regular push. If you must force push, do it manually."
fi

if echo "$COMMAND" | grep -qiE 'git\s+reset\s+--hard'; then
  if [ "${FRAME_INTERNAL}" = "1" ]; then
    exit 0
  fi
  deny "FRAME Git Safety: git reset --hard blocked. Use git restore or git stash instead."
fi

if echo "$COMMAND" | grep -qiE 'git\s+add\s+(-A|\.)'; then
  ask "FRAME Git Safety: FRAME recommends using specific files instead of git add -A. Are you sure you want to add all files?"
fi

exit 0
