# Codex Edition

Codex-native distribution of this personal agent setup.

## Quick start

From this repository:

```bash
bash Codex/scripts/bootstrap-codex.sh
```

Then restart Codex and run `/hooks` to review and trust the installed hooks. Skills are available with `/skills` or explicit `$skill-name` invocation.

## Layout

| Path | Purpose |
| --- | --- |
| `AGENTS.md` | Global working agreements installed to `~/.codex/AGENTS.md` |
| `agents/*.toml` | Codex custom subagents installed to `~/.codex/agents/` |
| `rules/*.rules` | Codex command execution policy installed to `~/.codex/rules/` |
| `skills/` | Codex skills installed to `~/.agents/skills/` |
| `hooks.json` | Safety, snapshot, and session hooks |
| `scripts/` | Bootstrap and hook implementations |
| `config.example.toml` | Optional defaults; never overwrites an existing config |

Coding conventions from Claude's path-scoped rules are represented as Codex skills. Codex `.rules` files carry the command execution policy, while the hook guard provides defense in depth for compound shell strings.

## Runtime differences

- Codex custom agents use TOML and inherit the parent's tools and permission policy unless overridden.
- `InstructionsLoaded` has no direct Codex equivalent; `SessionStart` logging is the fallback.
- Snapshot sync is a bounded sweep because Codex edit hook payloads do not reliably provide a single source file path.
- MCP server names are environment-specific and are intentionally not hardcoded into these agents.
