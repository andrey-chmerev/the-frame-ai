#!/bin/bash
# auto-pilot.sh - Stop hook. Keeps a live /frame:auto flight moving if the model
# stops mid-pipeline. No AI inference — pure marker-file + STATE.md checks.
#
# Active only while $GIT_DIR/frame-autopilot exists (created at the /frame:auto
# confirmation gate, removed on finish and on every halt path). If the marker is
# gone, this hook is a no-op — normal sessions never see it.
#
# Loop protection: unlike delivery-gate.sh we deliberately do NOT stand down on
# stop_hook_active (a flight legitimately needs several continues — one per
# phase). Instead we track progress: a cksum of STATE.md. Three consecutive
# nudges without STATE.md changing means the pipeline is stuck, not paused —
# we remove the marker and let the session stop.
#
# Disable with: export FRAME_AUTO_PILOT=off

read -r input

# Opt-out
[ "${FRAME_AUTO_PILOT:-on}" = "off" ] && exit 0

GIT_DIR=$(git rev-parse --git-dir 2>/dev/null)
[ -z "$GIT_DIR" ] && exit 0

MARKER="$GIT_DIR/frame-autopilot"
[ -f "$MARKER" ] || exit 0

PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo ".")
STATE_FILE="$PROJECT_ROOT/.planning/STATE.md"
NUDGE_FILE="$GIT_DIR/frame-autopilot-nudges"

FEATURE=$(grep '^feature=' "$MARKER" 2>/dev/null | head -1 | cut -d= -f2-)
PHASE=$(grep '^- Phase:' "$STATE_FILE" 2>/dev/null | head -1 | sed 's/^- Phase:[[:space:]]*//')
STATUS=$(grep '^- Status:' "$STATE_FILE" 2>/dev/null | head -1 | sed 's/^- Status:[[:space:]]*//')

# Terminal state — the flight landed but forgot to clean up. Stand down quietly.
if [ "$PHASE" = "SHIP" ] && echo "$STATUS" | grep -qi 'Shipped'; then
  rm -f "$MARKER" "$NUDGE_FILE"
  exit 0
fi

# Progress check: STATE.md changing between stops = the pipeline is moving.
HASH=$(cksum "$STATE_FILE" 2>/dev/null | awk '{print $1}')
[ -z "$HASH" ] && HASH=0
LAST_HASH=""
COUNT=0
if [ -f "$NUDGE_FILE" ]; then
  LAST_HASH=$(awk '{print $1}' "$NUDGE_FILE" 2>/dev/null)
  COUNT=$(awk '{print $2}' "$NUDGE_FILE" 2>/dev/null | tr -dc '0-9')
  [ -z "$COUNT" ] && COUNT=0
fi

if [ "$HASH" = "$LAST_HASH" ]; then
  COUNT=$((COUNT + 1))
else
  COUNT=1
fi

if [ "$COUNT" -gt 3 ]; then
  # Stuck: three nudges, zero progress. Give the session back to the user.
  rm -f "$MARKER" "$NUDGE_FILE"
  echo "FRAME Autopilot: no pipeline progress after 3 continues — standing down. STATE.md: ${PHASE:-?}/${STATUS:-?}. Resume manually with the next /frame:* command." >&2
  exit 0
fi

echo "$HASH $COUNT" > "$NUDGE_FILE"

echo "FRAME Autopilot is ON for '${FEATURE:-current feature}' and the pipeline is not finished (STATE.md: ${PHASE:-?} / ${STATUS:-?})." >&2
echo "Continue the /frame:auto flight: read .planning/STATE.md and execute the next phase per .claude/commands/frame:auto.md." >&2
echo "If this stop was an intentional halt, follow the Halt protocol first: rm -f \"$MARKER\" — then stop." >&2
exit 2
