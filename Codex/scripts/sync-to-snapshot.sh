#!/bin/bash
# Mirror safe, user-level Codex files into this repository.
# The hook has no reliable file_path for apply_patch, so it performs a bounded sweep.

set -uo pipefail

CODEX_DIR="${CODEX_HOME:-$HOME/.codex}"
SKILLS_DIR="$HOME/.agents/skills"
SNAPSHOT_REPO="$HOME/Repos/my-ai-agents"
[ -f "$CODEX_DIR/.sync-config" ] && . "$CODEX_DIR/.sync-config"
SNAPSHOT_DIR="$SNAPSHOT_REPO/Codex"
LOG="$CODEX_DIR/sync-to-snapshot.log"

[ -d "$SNAPSHOT_DIR" ] || exit 0
mkdir -p "$SNAPSHOT_DIR" "$CODEX_DIR/logs"

copy_safe() {
  local source="$1" destination="$2"
  [ -f "$source" ] || return 0
  if grep -qiE \
    -e 'sk-[a-zA-Z0-9_-]{20,}' \
    -e 'ghp_[a-zA-Z0-9]{20,}' \
    -e 'github_pat_[a-zA-Z0-9_]{20,}' \
    -e 'xox[bpas]-[a-zA-Z0-9-]{20,}' \
    -e 'AKIA[A-Z0-9]{16}' \
    -e '-----BEGIN [A-Z ]*PRIVATE KEY-----' \
    -e '(api[_-]?key|secret|password|token|bearer)["'"']?[[:space:]]*[:=][[:space:]]*["'"'][^"'"' ]{16,}' \
    "$source"; then
    printf '%s [BLOCKED] %s contains a potential secret\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$source" >> "$LOG"
    return 0
  fi
  mkdir -p "$(dirname "$destination")"
  cp "$source" "$destination"
}

copy_safe "$CODEX_DIR/AGENTS.md" "$SNAPSHOT_DIR/AGENTS.md"
copy_safe "$CODEX_DIR/hooks.json" "$SNAPSHOT_DIR/hooks.json"

if [ -d "$CODEX_DIR/rules" ]; then
  find "$CODEX_DIR/rules" -type f -name '*.rules' -print0 | while IFS= read -r -d '' file; do
    copy_safe "$file" "$SNAPSHOT_DIR/rules/${file#$CODEX_DIR/rules/}"
  done
fi

if [ -d "$CODEX_DIR/agents" ]; then
  find "$CODEX_DIR/agents" -type f -name '*.toml' -print0 | while IFS= read -r -d '' file; do
    copy_safe "$file" "$SNAPSHOT_DIR/agents/${file#$CODEX_DIR/agents/}"
  done
fi

if [ -d "$SKILLS_DIR" ]; then
  find "$SKILLS_DIR" -type f \( -name 'SKILL.md' -o -path '*/references/*' -o -path '*/scripts/*' -o -path '*/agents/openai.yaml' \) -print0 | while IFS= read -r -d '' file; do
    copy_safe "$file" "$SNAPSHOT_DIR/skills/${file#$SKILLS_DIR/}"
  done
fi

exit 0
