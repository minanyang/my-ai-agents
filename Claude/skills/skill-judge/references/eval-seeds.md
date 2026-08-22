# Eval seeds

What to hand `skill-creator` so its loop starts from something real. Two kinds; write both.

## 1. Trigger queries

Twenty realistic prompts, eight to ten that should fire the skill and eight to ten that should not, as JSON:

```json
[{"query": "...", "should_trigger": true}, {"query": "...", "should_trigger": false}]
```

They must read like something a person actually typed: file paths, real column names, a company, a bit of backstory, lowercase, abbreviations, typos. `"Format this data"` tests nothing.

The negatives carry the weight. A negative that shares no vocabulary with the skill — "write a fibonacci function" for a PDF skill — passes trivially and measures nothing. Write near misses: same words, different need; an adjacent domain; a case where another skill should win. If you cannot make a negative that a naive keyword match would fall for, the description is probably too broad and that is itself the finding.

## 2. Assertions

One per outcome that would be wrong if the skill failed, each phrased so it can only pass when the work was genuinely done.

An assertion is **discriminating** when it fails on plausible wrong output. "A file was created" is not — a file with the right name and empty contents passes. "The invoice page cites the digest it came from, and the cited digest exists" is.

Prefer, in order:
- `file_exists` / `regex` over file contents — deterministic, cheap.
- `tool_used` and `tool_order` — the strongest form for a skill whose whole point is *which* tool gets used and in what order. "Called `finish.sh`" and "no raw `git commit` in the trace" are the assertions that catch a skill quietly bypassing its own pipeline.
- `llm` with explicit criteria — only for genuinely subjective outcomes, and only with the criteria written out.

Always include the negative: the thing the skill exists to prevent, asserted as absent.

## The baseline is the point

Every case runs twice, with the skill and without. **An assertion that the no-skill baseline also passes is measuring the model, not the skill.** When you write one, ask what an agent with no skill would do — if it would pass, the assertion is not about your skill and either the assertion or the skill needs to change.
