#!/bin/bash
# session-init.sh - Loads context at session start

PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo ".")
STATE_FILE="$PROJECT_ROOT/.planning/STATE.md"

# Onboarding: STATE.md missing or not yet filled (only template headers)
if [ ! -f "$STATE_FILE" ] || ! grep -q "^- Phase:" "$STATE_FILE" 2>/dev/null; then
  echo "╔══════════════════════════════════════════╗"
  echo "║         FRAME — Getting Started          ║"
  echo "╚══════════════════════════════════════════╝"
  echo ""
  echo "  FRAME is installed but not yet initialized."
  echo ""
  echo "  Next step: run /frame:init"
  echo "  This will scan your project and fill in"
  echo "  MAP.md, CLAUDE.md, and STATE.md."
  echo ""
  exit 0
fi

LAST_ACTIVITY=0
if [[ "$OSTYPE" == "darwin"* ]]; then
  LAST_ACTIVITY=$(stat -f %m "$STATE_FILE" 2>/dev/null || echo 0)
else
  LAST_ACTIVITY=$(stat -c %Y "$STATE_FILE" 2>/dev/null || echo 0)
fi
NOW=$(date +%s)
ELAPSED=$(( NOW - LAST_ACTIVITY ))

PHASE=$(grep "^- Phase:" "$STATE_FILE" 2>/dev/null | head -1 | sed 's/.*Phase: //')
FEATURE=$(grep "^- Feature:" "$STATE_FILE" 2>/dev/null | head -1 | sed 's/.*Feature: //')
TASK=$(grep "^- Task:" "$STATE_FILE" 2>/dev/null | head -1 | sed 's/.*Task: //')

# < 2 hours: one-liner
if [ "$ELAPSED" -lt 7200 ]; then
  echo "FRAME | Phase: ${PHASE:-?} | Feature: ${FEATURE:-?} | Task: ${TASK:-?}"
  exit 0
fi

# 2-24 hours: brief digest
if [ "$ELAPSED" -lt 86400 ]; then
  echo "╔══════════════════════════════════════════╗"
  echo "║           FRAME — Welcome back           ║"
  echo "╚══════════════════════════════════════════╝"
  echo ""
  echo "  Phase: ${PHASE:-?} | Feature: ${FEATURE:-?}"
  echo "  Task:  ${TASK:-?}"
  echo ""
  echo "  Recent commits:"
  git log --oneline -3 2>/dev/null | sed 's/^/    /'
  echo ""
  exit 0
fi

# > 24 hours: full context
echo "╔══════════════════════════════════════════╗"
echo "║        FRAME SESSION INITIALIZED         ║"
echo "╚══════════════════════════════════════════╝"
echo ""

if [ -f "$STATE_FILE" ]; then
  echo "Current State:"
  head -15 "$STATE_FILE" | sed 's/^/  /'
  echo ""
fi

MAP_FILE="$PROJECT_ROOT/.planning/MAP.md"
if [ -f "$MAP_FILE" ]; then
  echo "Project:"
  grep "^## Quick Facts" -A 6 "$MAP_FILE" 2>/dev/null | head -7 | sed 's/^/  /'
  echo ""
fi

echo "  Recent commits:"
git log --oneline -5 2>/dev/null | sed 's/^/    /'
echo ""
echo "Commands: /frame:status, /frame:context, /frame:daily, /frame:fast"
echo ""

exit 0
