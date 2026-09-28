#!/bin/bash
# Codex PreToolUse hook for Bash commands.
# Exit 2 blocks the command and reports the reason on stderr.

set -uo pipefail

INPUT=$(cat)
COMMAND=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)
[ -z "$COMMAND" ] && exit 0

PATTERNS=(
  '\brm[[:space:]]+(-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r|--recursive[[:space:]]+--force|--force[[:space:]]+--recursive)'
  '\bgit[[:space:]]+push[[:space:]]+.*(-f\b|--force\b)'
  '\bgit[[:space:]]+reset[[:space:]]+--hard\b'
  '\bgit[[:space:]]+clean[[:space:]]+.*-[a-zA-Z]*f'
  '\bgit[[:space:]]+branch[[:space:]]+-D\b'
  '\bgit[[:space:]]+checkout[[:space:]]+--[[:space:]]+\.'
  '\b(npm|yarn|pnpm|bun)[[:space:]]+publish\b'
  '>[[:space:]]*/dev/(sda|nvme|disk)'
  '\bdd[[:space:]]+if=.*[[:space:]]+of=/dev/'
)

for pattern in "${PATTERNS[@]}"; do
  if printf '%s' "$COMMAND" | grep -iEq "$pattern"; then
    printf 'Blocked by Codex command guard: %s\nPattern matched: %s\n' "$COMMAND" "$pattern" >&2
    exit 2
  fi
done

exit 0
