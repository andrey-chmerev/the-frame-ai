#!/bin/bash
# pre-compact.sh - Auto-saves STATE.md before context compaction

PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo "${CLAUDE_PROJECT_DIR:-.}")
STATE_FILE="$PROJECT_ROOT/.planning/STATE.md"

if [ ! -f "$STATE_FILE" ]; then
  exit 0
fi

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Check if file already has a pre-compact marker to avoid duplicate stamps
if grep -q "^- PreCompact:" "$STATE_FILE" 2>/dev/null; then
  sed -i.bak "s|^- PreCompact:.*|- PreCompact: $TIMESTAMP|" "$STATE_FILE" && rm -f "${STATE_FILE}.bak"
else
  # Insert after the first line (## Current Position header)
  sed -i.bak "/^## Current Position/a\\- PreCompact: $TIMESTAMP" "$STATE_FILE" && rm -f "${STATE_FILE}.bak"
fi

echo "FRAME: STATE.md saved before compaction ($TIMESTAMP)"
exit 0
