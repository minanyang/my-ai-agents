// Paths under <repo>/Claude/ that the Stop sweep overwrites from ~/.claude/.
// Must match the whitelist in ~/.claude/scripts/sync-to-snapshot.sh.
const MIRRORED_FILES = ['CLAUDE.md', 'settings.json', 'statusline.sh']
const MIRRORED_DIRS = ['scripts', 'agents', 'skills', 'rules']

// Log markers that mean the snapshot did not land.
const FAILURE = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) \[(BLOCKED|ABORT|FAIL)\] (.*)$/

export function resolve(cwd: string, path: string): string {
  const parts: string[] = []
  for (const seg of (path.startsWith('/') ? path : `${cwd}/${path}`).split('/')) {
    if (seg === '' || seg === '.') continue
    if (seg === '..') parts.pop()
    else parts.push(seg)
  }
  return `/${parts.join('/')}`
}

// The live file to edit instead, when `abs` is a mirrored file in the snapshot.
export function liveTarget(abs: string, repo: string, home: string): string | undefined {
  const prefix = `${repo.replace(/\/+$/, '')}/Claude/`
  if (!abs.startsWith(prefix)) return undefined
  const rel = abs.slice(prefix.length)
  const top = rel.split('/')[0] ?? ''
  const mirrored = MIRRORED_FILES.includes(rel) || (MIRRORED_DIRS.includes(top) && rel.includes('/'))
  return mirrored ? `${home}/.claude/${rel}` : undefined
}

// SNAPSHOT_REPO from ~/.claude/.sync-config, else the scripts' default.
export function snapshotRepo(config: string | undefined, home: string): string {
  const m = config?.match(/^\s*SNAPSHOT_REPO=["']?([^"'\n]+)["']?\s*$/m)
  const raw = m?.[1] ?? '$HOME/Repos/my-ai-agents'
  return raw.replace(/^(\$HOME|\$\{HOME\}|~)(?=\/|$)/, home)
}

export type Failure = { at: string; kind: string; detail: string }

// Failure lines stamped strictly after `since` (the log's own "YYYY-MM-DD HH:MM:SS").
export function failuresSince(log: string, since: string): Failure[] {
  const out: Failure[] = []
  for (const line of log.split('\n')) {
    const m = line.match(FAILURE)
    if (!m) continue
    const [, at = '', kind = '', detail = ''] = m
    if (at > since) out.push({ at, kind, detail })
  }
  return out
}

// The newest timestamp in the log, or '' when it has none.
export function lastStamp(log: string): string {
  const all = log.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?= \[)/gm)
  return all?.at(-1) ?? ''
}
