import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

export function captureSourceRevision(root) {
  if (process.env.DEMO_SOURCE_REVISION) return process.env.DEMO_SOURCE_REVISION
  const directory = process.env.DEMO_SOURCE_DIR ? resolve(process.env.DEMO_SOURCE_DIR) : resolve(root, '../demo')
  if (!existsSync(directory)) {
    throw new Error('Asset recapture requires the actual demo. Set DEMO_SOURCE_DIR to its checkout, or DEMO_SOURCE_REVISION when using an already-running DEMO_URL.')
  }
  return execFileSync('git', ['log', '-1', '--format=%h', '--', '.'], { cwd: directory, encoding: 'utf8' }).trim()
}
