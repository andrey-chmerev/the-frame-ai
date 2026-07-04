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

# Ask before pushing into main/master via refspec (e.g. `git push origin feature:main`)
# Regular `git push` of the current branch is untouched — this only catches cross-branch refspecs.
if echo "$COMMAND" | grep -qiE 'git(\s+-\S+)*\s+push' && echo "$COMMAND" | grep -qE '[^ :+]+:(refs/heads/)?(main|master)(\s|$)'; then
  ask "FRAME Git Safety: this push targets main/master via refspec (another branch pushed into main). Prefer pushing the branch itself and merging via PR or /frame:integrate. Push anyway?"
fi

# Block commit while the quality gate is red (frame-gate-status is written by quality-gate.sh
# into the per-worktree git dir — outside the working tree, so it never dirties `git status`)
if echo "$COMMAND" | grep -qiE 'git(\s+-\S+)*\s+commit'; then
  GATE_STATUS_FILE="$(git rev-parse --git-dir 2>/dev/null)/frame-gate-status"
  if [ -f "$GATE_STATUS_FILE" ] && head -1 "$GATE_STATUS_FILE" 2>/dev/null | grep -q '^fail'; then
    GATE_FILE=$(sed -n '2p' "$GATE_STATUS_FILE" 2>/dev/null)
    deny "FRAME Git Safety: quality gate is red (last failure: ${GATE_FILE:-typecheck/lint}). Fix the reported errors — the gate turns green after the next clean check on a changed file. (Fixed outside Claude? Clear manually: rm $GATE_STATUS_FILE)"
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
