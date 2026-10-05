import { expect, test } from 'claude-code/testing'

const HOME = '/Users/me'
const REPO = `${HOME}/Repos/my-ai-agents`
const LOG = `${HOME}/.claude/sync-to-snapshot.log`

test('a write to a mirrored file is denied with the live path; others run', async ($, on) => {
  on('env.get', (_, e) => ({ value: e.name === 'HOME' ? HOME : undefined }))
  on('session.cwd', () => ({ value: REPO }))
  on('fs.exists', () => ({ value: false }))
  on('tool.call', () => ({ result: { filePath: '', content: '', type: 'create' } }))

  const denied = await $.tool.call({ tool: 'Write', file_path: `${REPO}/Claude/skills/commit/SKILL.md`, content: 'x' })
  expect(denied.deny).toContain(`${HOME}/.claude/skills/commit/SKILL.md`)

  const allowed = await $.tool.call({ tool: 'Write', file_path: `${REPO}/Cursor/skills/commit/SKILL.md`, content: 'x' })
  expect(allowed.deny).toBeUndefined()
})

test('new failures since the last check raise one toast; the first run only sets the mark', async ($, on) => {
  let log = '2026-10-03 16:54:13 [FAIL] git commit failed\n'
  const toasts: string[] = []
  const store = new Map<string, unknown>()
  on('store.get', (_, e) => ({ value: store.get(e.key) }))
  on('store.set', (_, e) => {
    store.set(e.key, e.value)
    return { value: undefined }
  })
  on('env.get', (_, e) => ({ value: e.name === 'HOME' ? HOME : undefined }))
  on('fs.exists', (_, e) => ({ value: e.path === LOG }))
  on('fs.read', () => ({ value: log }))
  on('ui.toast', (_, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })
  on('turn.start', (_, e) => ({ turnId: e.turnId }))

  await $.turn.start({ text: '', turnId: 't1' })
  expect(toasts).toEqual([])

  log += '2026-10-04 09:00:00 [SKIP] user has staged changes\n'
  await $.turn.start({ text: '', turnId: 't2' })
  expect(toasts).toEqual([])

  log += '2026-10-04 09:01:00 [ABORT] message did not pass validation: x\n2026-10-04 09:02:00 [FAIL] git commit failed\n'
  await $.turn.start({ text: '', turnId: 't3' })
  expect(toasts.length).toBe(1)
  expect(toasts[0]).toContain('[FAIL] git commit failed (+1 more)')

  await $.turn.start({ text: '', turnId: 't4' })
  expect(toasts.length).toBe(1)
})
