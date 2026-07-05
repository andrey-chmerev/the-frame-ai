#!/bin/bash
# delivery-gate.sh - Stop hook. Mechanically reminds to capture learning (Reflect)
# after a substantial task. No AI inference — pure mtime + edit-count checks.
#
# Fires when: >= 3 source edits this session AND no memory file was touched today
# AND the phase isn't already REFLECT. Fires at most once per session.
# Disable with: export FRAME_DELIVERY_GATE=off

read -r input

# Opt-out
[ "${FRAME_DELIVERY_GATE:-on}" = "off" ] && exit 0

# Avoid infinite Stop loops: if this hook already blocked once and the model
# continued, Claude Code sets stop_hook_active=true — let it stop now.
STOP_ACTIVE=$(node -e "try{const i=JSON.parse(process.argv[1]);process.stdout.write(i.stop_hook_active?'1':'')}catch{}" -- "$input" 2>/dev/null)
[ "$STOP_ACTIVE" = "1" ] && exit 0

GIT_DIR=$(git rev-parse --git-dir 2>/dev/null)
[ -z "$GIT_DIR" ] && exit 0
PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo ".")

# How many source edits happened this session (maintained by quality-gate.sh)?
COUNT=0
[ -f "$GIT_DIR/frame-edit-count" ] && COUNT=$(cat "$GIT_DIR/frame-edit-count" 2>/dev/null | tr -dc '0-9')
[ -z "$COUNT" ] && COUNT=0
[ "$COUNT" -lt 3 ] && exit 0

# Only fire once per session
[ -f "$GIT_DIR/frame-delivery-gate-fired" ] && exit 0

STATE_FILE="$PROJECT_ROOT/.planning/STATE.md"
PHASE=$(grep "^- Phase:" "$STATE_FILE" 2>/dev/null | head -1 | sed 's/.*Phase: //' | tr -d ' ')
# Already reflecting — nothing to nag about
echo "$PHASE" | grep -qiE 'REFLECT' && exit 0

# Was any learning captured today? (memory files or a fresh retrospective/note)
TODAY=$(date +%Y-%m-%d)
touched_today() {
  local f="$1"
  [ -f "$f" ] || return 1
  local m
  if [[ "$OSTYPE" == "darwin"* ]]; then
    m=$(stat -f "%Sm" -t "%Y-%m-%d" "$f" 2>/dev/null)
  else
    m=$(date -r "$f" +%Y-%m-%d 2>/dev/null)
  fi
  [ "$m" = "$TODAY" ]
}

for f in "$PROJECT_ROOT"/.planning/memory/*.md; do
  touched_today "$f" && exit 0
done

# Block once and hand a concrete next step back to the model
touch "$GIT_DIR/frame-delivery-gate-fired" 2>/dev/null
echo "FRAME Delivery Gate: ${COUNT} source edits this session but no learning was captured today." >&2
echo "Reflect is a required step, not optional. Run /frame:retrospective (full) or /frame:note (quick capture) before ending." >&2
echo "To skip intentionally: export FRAME_DELIVERY_GATE=off" >&2
exit 2
