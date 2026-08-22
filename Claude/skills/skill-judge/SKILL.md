---
name: skill-judge
description: Use when asked to review, audit, or sanity-check an Agent Skill before it ships — "is this skill any good", "review my SKILL.md", "check these skills", "why isn't my skill triggering". A fast static pass that catches skills which are broken, redundant, or invisible; hands off to skill-creator for anything that needs measuring.
---

# Skill Judge

A pre-flight review. Cheap, static, and deliberately narrow.

**Know what this is not.** Anthropic's `skill-creator` already evaluates and improves skills empirically: it runs a skill against real prompts with a no-skill baseline, grades the transcripts, measures trigger accuracy over a query set, and rewrites the description in a loop. Anything that needs *evidence* belongs there, not here. This skill exists because that loop costs a full run per case, and most defects in a fresh skill are visible without one.

Run this before shipping; run `skill-creator` when the question is "does it actually work".

## The bar

> A bad skill describes a topic. A good skill names the wrong behaviour it exists to prevent, and gives the agent a way to prove it didn't do it.

Ten of the twelve most-installed skills follow that shape at every length from 120 to 679 lines. It is the only structural property they agree on, so it is the only one worth scoring.

## Pass 1 — Correctness (blocking)

Nothing else matters if the skill tells the agent to do something impossible. **Open every artifact the skill references** — do not judge from the prose.

- Every command: does it exist, do the flags do what the text claims? Read the script. A flag that is only honoured under another flag, an output line described in the wrong bucket, a default that contradicts the skill — all of these are silent failures at runtime.
- Every path: does it resolve from where the skill will actually run? A bare relative path breaks when the working directory is not the skill's directory.
- Every tool: is it granted? A step that says "read the config" with no `Read` in `allowed-tools`, or a `git commit` with only script paths granted, cannot execute.
- Every internal claim: does the skill contradict itself, or contradict a document it points at?

Report each as a defect with the file, the line, and the fix. **No partial credit** — a skill with one blocking defect is not "mostly fine".

## Pass 2 — Will it fire?

The description is the whole triggering mechanism; the body is invisible until it fires.

- It leads with the trigger — when to use it, in the user's words, including the casual and misspelled ones. Eleven of the twelve top skills open with "Use when".
- It does not summarize the workflow. A description that recounts the steps gets followed *instead of* the body.
- Hard limits: ≤ 1024 characters, no angle brackets, `name` kebab-case ≤ 64 characters, and the only frontmatter keys the portable spec allows are `name`, `description`, `license`, `allowed-tools`, `metadata`, `compatibility`. Anything else is a Claude Code extension — fine in a plugin, a portability defect if the skill claims to run elsewhere.
- Flag `disable-model-invocation: true` as *missing* when the operation is expensive to start by accident or a hook already performs it.

You cannot score triggering accurately by reading. If it matters, say so and hand off: `skill-creator`'s description optimizer measures it against a 20-query set and rewrites until the failure and false-trigger rates drop.

## Pass 3 — Does it close a failure mode?

For each rule in the skill, ask which of these it is:

| Kind | Keep it? |
| --- | --- |
| Something the agent would do anyway | Cut. It is recurring token cost for nothing. |
| Something the agent would forget | Keep it short. A reminder needs no argument. |
| Something the agent will **argue itself out of** | Keep it, with the counter-argument attached. |

The third kind is where skills earn their place, and the device that works is a two-column table of the excuse and why it is wrong — the most repeated structure in the top skills. Prohibitions with no reason attached get rationalized away; all-caps MUST and NEVER are a yellow flag, not a strength. Explain why instead.

Then look for the verification gate: does the skill tell the agent how to check its own work before claiming success? Ten of twelve have one. Its absence is the most common real defect in an otherwise competent skill.

## Pass 4 — Cost

Every line is paid for on every invocation after the skill loads.

- Content that repeats a document the agent already has — an injected schema, a file the skill itself tells the agent to read — is pure cost. Point, do not copy.
- Rare branches belong in a sibling file loaded from the step that needs it, with an explicit "do not load otherwise". Never force-load with `@`.
- Do not score length. The top skills span 55 to 679 lines and disagree about everything except the bar above.

## Output

```markdown
## <skill name> — <Ship | Fix first | Rewrite>

**Blocking defects** (empty if none)
- `<file>:<line>` — <what is wrong> → <the fix>

**Will it fire**
- <one line per issue, or "no issues">

**Does it close a failure mode**
- Names the failure: <what, or "no — it describes a topic">
- Verification gate: <what the agent is told to check, or "none">
- Rules that are the agent's default behaviour: <list, or "none">

**Cost**
- <redundancy with a document the agent already has, or "none">

**Hand off to skill-creator for**: <what needs measuring — trigger accuracy, whether the skill beats the no-skill baseline, whether a bundled script would help — or "nothing">
```

`Fix first` if there is any blocking defect. `Rewrite` if it describes a topic rather than closing a failure mode — that is not fixable by editing.

## Seeding the evals

When the review ends in a hand-off, leave `skill-creator` something to start from — this is cheap now and expensive later. Load `references/eval-seeds.md` for how to write both kinds. Do not load it for a review that ends in `Ship`.

## When judging several skills at once

Read them all before writing anything. The defects that matter most across a set are the inconsistent ones: the same operation described two ways, a rule in one skill that another contradicts, a shared script whose contract is stated differently in each caller.
