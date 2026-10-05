import { describe, expect, test } from 'claude-code/testing'
import * as R from './rules'

const HOME = '/Users/me'
const REPO = `${HOME}/Repos/my-ai-agents`

describe('liveTarget', () => {
  test('mirrored files and directories map to ~/.claude', () => {
    expect(R.liveTarget(`${REPO}/Claude/settings.json`, REPO, HOME)).toBe(`${HOME}/.claude/settings.json`)
    expect(R.liveTarget(`${REPO}/Claude/skills/commit/SKILL.md`, REPO, HOME)).toBe(`${HOME}/.claude/skills/commit/SKILL.md`)
    expect(R.liveTarget(`${REPO}/Claude/scripts/new.sh`, REPO, HOME)).toBe(`${HOME}/.claude/scripts/new.sh`)
  })

  test('repo-owned files pass', () => {
    expect(R.liveTarget(`${REPO}/Claude/README.md`, REPO, HOME)).toBeUndefined()
    expect(R.liveTarget(`${REPO}/Claude/setup.md`, REPO, HOME)).toBeUndefined()
    expect(R.liveTarget(`${REPO}/Cursor/skills/commit/SKILL.md`, REPO, HOME)).toBeUndefined()
    expect(R.liveTarget(`${REPO}/README.md`, REPO, HOME)).toBeUndefined()
    expect(R.liveTarget(`${HOME}/.claude/settings.json`, REPO, HOME)).toBeUndefined()
    expect(R.liveTarget(`${REPO}-fork/Claude/settings.json`, REPO, HOME)).toBeUndefined()
  })

  test('relative and dotted paths resolve first', () => {
    expect(R.resolve(REPO, 'Claude/rules/react.md')).toBe(`${REPO}/Claude/rules/react.md`)
    expect(R.resolve(`${REPO}/Cursor`, '../Claude/./CLAUDE.md')).toBe(`${REPO}/Claude/CLAUDE.md`)
  })
})

describe('snapshotRepo', () => {
  test('default, override, and $HOME expansion', () => {
    expect(R.snapshotRepo(undefined, HOME)).toBe(REPO)
    expect(R.snapshotRepo('SNAPSHOT_REPO="/src/agents"\n', HOME)).toBe('/src/agents')
    expect(R.snapshotRepo('# c\nSNAPSHOT_REPO="$HOME/x"', HOME)).toBe(`${HOME}/x`)
  })
})

describe('log', () => {
  const LOG = [
    '2026-10-03 16:54:07 [COMMIT] 5b335c5 — chore(settings): x',
    '2026-10-03 16:54:13 [FAIL] git commit failed',
    'SessionEnd hook [node x] failed: node: command not found',
    '2026-10-04 09:00:00 [SKIP] user has staged changes',
    '2026-10-04 09:01:00 [BLOCKED] /Users/me/.claude/rules/a.md contains potential secret — not mirrored',
    '2026-10-04 09:02:00 [ABORT] message did not pass validation: Fix stuff — un-staged, leaving for manual commit',
  ].join('\n')

  test('only failures after the mark, SKIP and unstamped lines ignored', () => {
    expect(R.failuresSince(LOG, '2026-10-03 16:54:13').map(f => f.kind)).toEqual(['BLOCKED', 'ABORT'])
    expect(R.failuresSince(LOG, '2026-10-04 09:02:00')).toEqual([])
    expect(R.failuresSince(LOG, '')[0]).toEqual({ at: '2026-10-03 16:54:13', kind: 'FAIL', detail: 'git commit failed' })
  })

  test('lastStamp', () => {
    expect(R.lastStamp(LOG)).toBe('2026-10-04 09:02:00')
    expect(R.lastStamp('')).toBe('')
  })
})
