import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, rmdir, unlink, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import { captureSourceRevision } from './capture-source.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const output = resolve(root, 'public/media/scenes')
const scratch = resolve(root, '.capture/scene-assets')
const demoUrl = process.env.DEMO_URL ?? 'http://127.0.0.1:4179'
const manifest = {
  source: 'demo',
  sourceCommit: captureSourceRevision(root),
  density: 3,
  assets: {},
}
await mkdir(output, { recursive: true })
await mkdir(scratch, { recursive: true })
if (!(await fetch(demoUrl)).ok) throw new Error(`Start the source demo at ${demoUrl}.`)
const temporary = new Set()

async function capture(name, element) {
  const png = resolve(scratch, `${name}.png`)
  const webp = resolve(scratch, `${name}.webp`)
  temporary.add(png)
  temporary.add(webp)
  await element.screenshot({ path: png, animations: 'disabled', omitBackground: true })
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', png, '-c:v', 'libwebp', '-quality', '96', webp])
  const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=width,height', '-of', 'json', webp], { encoding: 'utf8' }))
  const bytes = await readFile(webp)
  manifest.assets[name] = {
    width: probe.streams[0].width,
    height: probe.streams[0].height,
    revision: createHash('sha256').update(bytes).digest('hex').slice(0, 12),
    bytes: bytes.length,
  }
  await rename(webp, resolve(output, `${name}.webp`))
  temporary.delete(webp)
  await unlink(png)
  temporary.delete(png)
  console.log(`${name}: ${manifest.assets[name].width}x${manifest.assets[name].height}`)
  return manifest.assets[name]
}

const browser = await chromium.launch()
try {
  const map = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 3 })
  await map.goto(demoUrl)
  await map.evaluate(() => document.fonts.ready)
  await map.getByRole('button', { name: 'Jump to Better, together', exact: true }).click()
  await map.getByRole('button', { name: 'Focus on branch map', exact: true }).click()
  await map.waitForTimeout(650)
  await map.addStyleTag({ content: `
    html, body, .app-shell, .main-shell, .workspace-content, .branch-map.is-focused,
    .map-surface, .map-canvas { background: transparent !important; }
    .react-flow__background, .react-flow__edges { visibility: hidden !important; }
  ` })
  for (const [name, session] of [['node-main', 'main'], ['node-token', 'token-bucket'], ['node-sliding', 'sliding-window']]) {
    await capture(name, map.locator(`[data-session-node="${session}"]`).locator('..'))
  }
  await map.close()

  for (const [suffix, width] of [['', 840], ['-mobile', 390]]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, deviceScaleFactor: 3 })
    await page.goto(demoUrl)
    await page.evaluate(() => document.fonts.ready)
    await page.getByRole('button', { name: 'Jump to A new direction', exact: true }).click()
    const input = page.locator('#chat-input')
    await input.fill('')
    const dismiss = page.getByRole('button', { name: 'Dismiss notification' })
    if (await dismiss.isVisible()) await dismiss.click()
    await capture(`composer-idle${suffix}`, page.locator('.composer'))
    await input.fill('@')
    await capture(`composer-at${suffix}`, page.locator('.composer'))
    await page.locator('#mention-jordan').hover()
    await capture(`mention-picker${suffix}`, page.locator('.mention-picker'))
    await page.locator('#mention-jordan').click()
    await capture(`composer-recipient${suffix}`, page.locator('.composer'))
    await input.fill('@Jordan want to explore')
    await capture(`composer-typing${suffix}`, page.locator('.composer'))
    await input.fill('@Jordan want to explore a token bucket?')
    const ready = await capture(`composer-ready${suffix}`, page.locator('.composer'))
    ready.typingStops = await input.evaluate((element) => {
      const style = getComputedStyle(element)
      const context = document.createElement('canvas').getContext('2d')
      if (!context) throw new Error('Text measurement is unavailable.')
      context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
      const parent = element.closest('.composer').getBoundingClientRect()
      const inset = element.getBoundingClientRect().left - parent.left + parseFloat(style.paddingLeft)
      return Array.from({ length: element.value.length - '@Jordan '.length + 1 }, (_, index) => {
        const width = context.measureText(element.value.slice(0, '@Jordan '.length + index)).width
        if (inset + width > parent.width) throw new Error('The captured typing phrase must fit on one line.')
        return (inset + width) / parent.width
      })
    })
    await page.getByRole('button', { name: 'Send human ping' }).click()
    const ping = page.locator('.ping-message').last()
    await ping.scrollIntoViewIfNeeded()
    await capture(`delivered-ping${suffix}`, ping)
    if (!(await ping.textContent()).includes('Not sent to Braid')) throw new Error('The scene must use a genuine human-only ping.')
    await page.close()
  }
  await writeFile(resolve(root, 'scene-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
} finally {
  await browser.close()
  for (const path of temporary) {
    try { await unlink(path) } catch (error) { if (error.code !== 'ENOENT') throw error }
  }
  await rmdir(scratch)
}
