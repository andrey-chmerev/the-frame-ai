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

# Block force push: match --force or -f only as standalone flags (not as substrings in branch names)
# -f must be preceded by whitespace or start-of-string to avoid false positives like my-fix, --follow-tags
if echo "$COMMAND" | grep -qiE 'git(\s+-\S+)*\s+push' && ! echo "$COMMAND" | grep -q 'force-with-lease'; then
  if echo "$COMMAND" | grep -qE '(^|\s)(--force|-f)(\s|$)' || echo "$COMMAND" | grep -qE '\+[a-zA-Z0-9_/.-]+:'; then
    deny "FRAME Git Safety: Force push blocked. Use regular push or --force-with-lease. If you must force push, do it manually."
  fi
fi

# Block git reset --hard unless targeting a FRAME checkpoint tag
if echo "$COMMAND" | grep -qiE 'git(\s+-\S+)*\s+reset\s+--hard'; then
  if echo "$COMMAND" | grep -q 'frame/checkpoint/'; then
    exit 0
  fi
  deny "FRAME Git Safety: git reset --hard blocked. Use git restore or git stash instead. To rollback to a checkpoint, use /frame:rollback."
fi

# Ask before staging all files
if echo "$COMMAND" | grep -qiE 'git(\s+-\S+)*\s+add\s+(-A|--all|\.)(\s|$)'; then
  ask "FRAME Git Safety: FRAME recommends using specific files instead of git add -A. Are you sure you want to add all files?"
fi

exit 0
