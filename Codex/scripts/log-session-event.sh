#!/bin/bash
# Record Codex SessionStart events without storing credentials or transcripts.

set -uo pipefail

CODEX_DIR="${CODEX_HOME:-$HOME/.codex}"
LOG_DIR="$CODEX_DIR/logs"
LOG="$LOG_DIR/session-events.jsonl"
mkdir -p "$LOG_DIR"

INPUT=$(cat)
TS=$(date '+%Y-%m-%dT%H:%M:%S%z')

if command -v jq >/dev/null 2>&1; then
  printf '%s\n' "$INPUT" | jq -c --arg ts "$TS" '{ts: $ts, event: .hook_event_name, cwd: .cwd, turn_id: .turn_id}' >> "$LOG" 2>/dev/null || true
else
  printf '%s\n' "$TS" >> "$LOG"
fi

exit 0
