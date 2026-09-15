#!/bin/bash
# Install this repository's Codex distribution into user-level Codex locations.
# Existing config.toml is never overwritten.

set -euo pipefail

SOURCE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SNAPSHOT_DIR="$SOURCE_ROOT/Codex"
CODEX_DIR="${CODEX_HOME:-$HOME/.codex}"
SKILLS_DIR="$HOME/.agents/skills"

[ -d "$SNAPSHOT_DIR" ] || { echo "Snapshot not found: $SNAPSHOT_DIR" >&2; exit 1; }

mkdir -p "$CODEX_DIR" "$CODEX_DIR/agents" "$CODEX_DIR/rules" "$CODEX_DIR/scripts" "$SKILLS_DIR"

for file in AGENTS.md hooks.json; do
  [ -f "$SNAPSHOT_DIR/$file" ] && cp "$SNAPSHOT_DIR/$file" "$CODEX_DIR/$file"
done

for file in "$SNAPSHOT_DIR"/rules/*.rules; do
  [ -f "$file" ] || continue
  cp "$file" "$CODEX_DIR/rules/"
done

for file in "$SNAPSHOT_DIR"/agents/*.toml; do
  [ -f "$file" ] || continue
  cp "$file" "$CODEX_DIR/agents/"
done

for file in "$SNAPSHOT_DIR"/scripts/*.sh; do
  [ -f "$file" ] || continue
  cp "$file" "$CODEX_DIR/scripts/"
done

if [ -d "$SNAPSHOT_DIR/skills" ]; then
  cp -R "$SNAPSHOT_DIR/skills/." "$SKILLS_DIR/"
fi

chmod +x "$CODEX_DIR/scripts"/*.sh

# Hooks run later without knowing which checkout installed them. Keep the
# checkout path in the per-device config file, but never overwrite a user's
# explicit override.
if [ ! -f "$CODEX_DIR/.sync-config" ]; then
  printf 'SNAPSHOT_REPO=%q\n' "$SOURCE_ROOT" > "$CODEX_DIR/.sync-config"
fi

echo "Installed Codex guidance, agents, skills, hooks, and scripts."
if [ -f "$CODEX_DIR/config.toml" ]; then
  echo "Kept existing $CODEX_DIR/config.toml. Review Codex/config.example.toml for optional defaults."
else
  echo "No config.toml found. Copy selected settings from Codex/config.example.toml if needed."
fi
echo "Review and trust hooks with /hooks before relying on them."
