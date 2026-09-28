# Codex Setup

## Prerequisites

- Codex CLI or the Codex desktop/IDE client
- Git, Bash, and `jq` on `PATH`
- This repository cloned locally

Verify the CLI and authentication:

```bash
codex --version
codex login status
codex doctor --summary
```

## Install the distribution

Run from the repository root:

```bash
bash Codex/scripts/bootstrap-codex.sh
```

The bootstrap installs global guidance, custom agents, command rules, skills, hooks, and helper scripts. It never overwrites `~/.codex/config.toml`; review `Codex/config.example.toml` and copy only the settings you want into that file manually.

It also records this checkout as the snapshot destination in `~/.codex/.sync-config`. That file is device-local and is preserved on later bootstrap runs. If you move or clone the repository elsewhere, update it with:

```bash
printf 'SNAPSHOT_REPO=%q\n' "/path/to/my-ai-agents" > "$HOME/.codex/.sync-config"
```

Restart Codex after installation. Use `/skills` to inspect skills, `/hooks` to review or trust hook definitions, and `codex execpolicy check` to test command rules.

## Recommended defaults

For normal local development, use:

```toml
# Work autonomously inside the current workspace; auto-review elevated requests.
approval_policy = "on-request"
approvals_reviewer = "auto_review"
sandbox_mode = "workspace-write"
web_search = "cached"
model = "gpt-5.6-luna"
model_reasoning_effort = "low"

[agents]
max_concurrent_threads_per_session = 3
default_subagent_model = "gpt-5.6-luna"
default_subagent_reasoning_effort = "low"
```

This is both the budget and autonomous-local profile: Codex can edit and run routine commands in the current workspace without repeatedly asking for approval. Eligible elevated requests go through Codex auto-review first. The workspace boundary and forbidden `.rules` entries remain active. Auto-review can make mistakes and does not suppress clarification when required information is missing or when an irreversible/external action needs explicit authorization.

For a one-off autonomous run, the equivalent CLI flags are:

```bash
codex --sandbox workspace-write --ask-for-approval on-request
```

The CLI flag uses the default reviewer configured in `config.toml`. This is intentionally the budget profile: Luna is documented as the faster/cheaper option, and low reasoning reduces work on routine tasks. For a genuinely difficult task, upgrade only that invocation, for example:

```bash
codex -m gpt-5.6-terra -c model_reasoning_effort=medium
```

Do not make Terra or a high reasoning effort the global default. Model availability and plan allowances can change independently of this repository; check `/status` when a session starts.

## MCP setup

Add only the servers you actually use with `codex mcp add`. The agents intentionally avoid provider-specific tool names. Configure Figma, Playwright, documentation, or productivity servers in your Codex environment, then verify them with `codex mcp list`.

## Verification

```bash
bash -n Codex/scripts/*.sh
jq -e . Codex/hooks.json >/dev/null
python3 - <<'PY'
import pathlib
import tomllib

for path in pathlib.Path("Codex/agents").glob("*.toml"):
    with path.open("rb") as handle:
        tomllib.load(handle)
PY
```

The bootstrap itself can be tested against a temporary `HOME` without changing your real Codex configuration.

## Snapshot sync

The optional hooks sweep safe files from `~/.codex/` and `~/.agents/skills/` back into `Codex/`, including `~/.codex/rules/*.rules`. They skip files matching high-confidence secret patterns. Review the resulting git diff before committing. The sync script never pushes or deploys.
