import type { EngineInterface, Register } from 'claude-code'
import * as R from './rules'

const WRITE_TOOLS = ['Edit', 'Write', 'MultiEdit', 'NotebookEdit']
const SEEN = 'seen'

type Paths = { home: string; repo: string; log: string }

let paths: Promise<Paths> | undefined
function resolvePaths($: EngineInterface): Promise<Paths> {
  paths ??= (async () => {
    const home = (await $.env.get('HOME')) ?? ''
    const configPath = `${home}/.claude/.sync-config`
    const config = (await $.fs.exists(configPath)) ? String(await $.fs.read(configPath)) : undefined
    return { home, repo: R.snapshotRepo(config, home), log: `${home}/.claude/sync-to-snapshot.log` }
  })()
  return paths
}

// The auto-commit runs async on Stop, after the turn has ended, so its outcome
// is read at the start of the next turn or session.
async function reportFailures($: EngineInterface) {
  const { log } = await resolvePaths($)
  if (!(await $.fs.exists(log))) return
  const text = String(await $.fs.read(log))
  const seen = (await $.store.get(SEEN)) as string | undefined
  const latest = R.lastStamp(text)
  if (latest) await $.store.set(SEEN, latest)
  // First run on this machine: take the existing log as already seen.
  if (seen === undefined) return

  const failures = R.failuresSince(text, seen)
  const last = failures.at(-1)
  if (!last) return
  const more = failures.length > 1 ? ` (+${failures.length - 1} more)` : ''
  $.ui.toast(`snapshot: [${last.kind}] ${last.detail}${more} — see ~/.claude/sync-to-snapshot.log`, { timeoutMs: 15000 })
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const started = await next(e)
    await reportFailures($)
    return started
  })

  on('turn.start', async ($, e, next) => {
    await reportFailures($)
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    if (!WRITE_TOOLS.includes(String(e.tool))) return next(e)
    const path = 'file_path' in e ? e.file_path : 'notebook_path' in e ? e.notebook_path : undefined
    if (typeof path !== 'string') return next(e)

    const { home, repo } = await resolvePaths($)
    const live = R.liveTarget(R.resolve(await $.session.cwd(), path), repo, home)
    if (!live) return next(e)
    return {
      deny:
        `snapshot-guard: ${path} is a mirror of ${live}. The Stop sweep copies the live file over it, ` +
        `so this edit would be lost and never take effect. Edit ${live} instead; the PostToolUse hook mirrors it here.`,
    }
  })
}
