import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, rmdir, unlink, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import { cameraFilter, DENSITY, FPS, Track } from './studio-camera.mjs'
import { scenes } from './studio-scenes.mjs'
import { createAmbientMedia } from './ambient-media.mjs'
import { captureSourceRevision } from './capture-source.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const output = process.env.STUDIO_OUTPUT ? resolve(process.env.STUDIO_OUTPUT) : resolve(root, 'public/media')
const scratch = resolve(root, '.capture')
const demoUrl = process.env.DEMO_URL ?? 'http://127.0.0.1:4179'
const selection = new Set(process.argv.slice(2))
if ([...selection].some((name) => !scenes.some((scene) => scene.name === name))) throw new Error(`Choose from ${scenes.map((scene) => scene.name).join(', ')}`)
await mkdir(output, { recursive: true })
await mkdir(scratch, { recursive: true })
if (!(await fetch(demoUrl)).ok) throw new Error(`Start the original demo at ${demoUrl}.`)

const manifestPath = process.env.STUDIO_OUTPUT ? resolve(output, 'manifest.json') : resolve(root, 'media-manifest.json')
const sourceCommit = captureSourceRevision(root)
let manifest = { source: 'demo', sourceCommit, fps: FPS, assets: {} }
try {
  manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  for (const asset of Object.values(manifest.assets)) asset.sourceCommit ??= manifest.sourceCommit
  manifest.sourceCommit = sourceCommit
  manifest.fps = FPS
} catch (error) {
  if (error.code !== 'ENOENT') throw error
}

function encode(args) {
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' })
}

class Studio {
  constructor(page, scene) {
    this.page = page
    this.scene = scene
    this.desktop = new Track(scene.opening.desktop)
    this.mobile = new Track(scene.opening.mobile)
    this.cursor = new Track({ x: scene.viewport.width - 28, y: scene.viewport.height - 35 })
    this.actions = []
    this.typing = []
    this.clickTime = -10
    this.time = 0
  }

  at(time, action) {
    this.actions.push({ time, action })
    this.actions.sort((a, b) => a.time - b.time)
  }

  box(selector) {
    return this.page.locator(selector).boundingBox()
  }

  textBox(selector) {
    return this.page.locator(selector).evaluate((element) => {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
      const boxes = []
      let node
      while ((node = walker.nextNode())) {
        if (!node.textContent.trim()) continue
        const range = document.createRange()
        range.selectNodeContents(node)
        boxes.push(...range.getClientRects())
      }
      if (!boxes.length) throw new Error('The product text framing target is empty.')
      const x = Math.min(...boxes.map((box) => box.x))
      const y = Math.min(...boxes.map((box) => box.y))
      return { x, y, width: Math.max(...boxes.map((box) => box.right)) - x, height: Math.max(...boxes.map((box) => box.bottom)) - y }
    })
  }

  pan(time, duration, desktop, mobile) {
    this.desktop.move(time, duration, desktop)
    this.mobile.move(time, duration, mobile)
  }

  async point(selector, time, duration, position = { x: 0.5, y: 0.5 }) {
    const box = await this.box(selector)
    if (!box) throw new Error(`The actual cursor target ${selector} is not visible.`)
    this.cursor.move(time, duration, { x: box.x + box.width * position.x, y: box.y + box.height * position.y })
  }

  async click(selector) {
    await this.page.locator(selector).click({ force: true })
    this.clickTime = this.time
    await this.page.evaluate(() => {
      const pointer = document.getElementById('studio-pointer')
      pointer.hidePopover()
      pointer.showPopover()
    })
  }

  type(selector, text, start, end, prefix = '') {
    this.typing.push({ selector, text, start, end, prefix, last: -1 })
  }

  async tick(frame) {
    this.time = frame / FPS
    while (this.actions[0]?.time <= this.time + 0.0001) await this.actions.shift().action()
    for (const typing of this.typing) {
      if (this.time < typing.start) continue
      const count = Math.min(typing.text.length, Math.floor((this.time - typing.start) / (typing.end - typing.start) * typing.text.length))
      if (count !== typing.last) {
        await this.page.locator(typing.selector).fill(typing.prefix + typing.text.slice(0, count))
        typing.last = count
      }
    }
    const point = this.cursor.at(this.time)
    await this.page.mouse.move(point.x, point.y)
    await this.page.evaluate(({ point, time, clickTime }) => {
      const pointer = document.getElementById('studio-pointer')
      pointer.style.transform = `translate(${point.x}px, ${point.y}px)`
      const pulse = pointer.querySelector('.studio-click')
      const age = time - clickTime
      pulse.style.opacity = age >= 0 && age < 0.4 ? String(0.5 * (1 - age / 0.4)) : '0'
      pulse.style.transform = `translate(-50%, -50%) scale(${1 + Math.max(0, age) * 3})`
      const animations = window.__studioAnimations
      for (const animation of document.getAnimations()) {
        if (!animations.has(animation)) animations.set(animation, time * 1000 - Number(animation.currentTime ?? 0))
        animation.pause()
        animation.currentTime = time * 1000 - animations.get(animation)
      }
      for (const svg of document.querySelectorAll('svg')) {
        if (svg.querySelector('animateMotion')) {
          svg.pauseAnimations()
          svg.setCurrentTime(time)
        }
      }
    }, { point, time: this.time, clickTime: this.clickTime })
  }
}

async function installStudio(page) {
  // Only recording chrome and an editorial pointer are added/removed. The product
  // components, messages, state, and all click/type actions are the unmodified demo.
  await page.addStyleTag({ content: `
    .demo-dock, .sidebar, .topbar, .map-controls, .map-legend, .map-canvas-caption,
    .map-bottomline, .map-summary-strip, .react-flow__attribution { visibility: hidden !important; }
    #studio-pointer { position: fixed; inset: auto; top: 0; left: 0; margin: 0; border: 0; padding: 0; width: 25px; height: 32px; overflow: visible; pointer-events: none; background: transparent; transform-origin: top left; }
    #studio-pointer > svg { width: 24px; height: 30px; overflow: visible; filter: drop-shadow(0 2px 3px #0008); }
    .studio-click { position: absolute; left: 2px; top: 2px; width: 19px; height: 19px; border: 2px solid #d2edc6; border-radius: 50%; transform-origin: center; opacity: 0; }
  ` })
  await page.evaluate(() => {
    for (const animation of document.getAnimations()) {
      if (Number.isFinite(animation.effect?.getComputedTiming().endTime)) animation.finish()
    }
    window.__studioAnimations = new WeakMap()
    const pointer = document.createElement('div')
    pointer.id = 'studio-pointer'
    pointer.setAttribute('popover', 'manual')
    pointer.setAttribute('aria-hidden', 'true')
    pointer.innerHTML = '<span class="studio-click"></span><svg viewBox="0 0 24 30" fill="none"><path d="M3 2L3.5 23L9 18L13.7 27L17.7 24.8L13 16.3L20.5 15.5L3 2Z" fill="#edf4e9" stroke="#1b241c" stroke-width="1.4" stroke-linejoin="round"/></svg>'
    document.body.append(pointer)
    pointer.showPopover()
  })
}

async function render(scene, browser) {
  const directory = resolve(scratch, scene.name)
  await mkdir(directory, { recursive: true })
  const frames = []
  const intermediates = []
  const context = await browser.newContext({ viewport: scene.viewport, deviceScaleFactor: DENSITY })
  const page = await context.newPage()
  const origin = new Date('2026-09-07T12:00:00Z')
  await page.clock.install({ time: origin })
  try {
    await page.goto(demoUrl)
    await page.evaluate(() => document.fonts.ready)
    await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 1000)))
    const studio = new Studio(page, scene)
    await scene.prepare(studio)
    await installStudio(page)
    await scene.plan(studio)
    const count = Math.round(scene.duration * FPS)
    console.log(`${scene.name}: rendering ${count} lossless ${DENSITY}x source frames`)
    for (let frame = 0; frame < count; frame++) {
      if (frame > 0) await page.clock.runFor(1000 / FPS)
      await studio.tick(frame)
      const path = resolve(directory, `frame-${String(frame).padStart(5, '0')}.png`)
      frames.push(path)
      await page.screenshot({ path, scale: 'device' })
      if (frame > 0 && frame % 120 === 0) console.log(`  ${scene.name}: ${Math.round(frame / count * 100)}%`)
    }
    if (studio.actions.length) throw new Error(`Unrecorded actions remain in ${scene.name}.`)
    const result = { sourceCommit, width: scene.desktop.width, height: scene.desktop.height, mobile: scene.mobile, duration: scene.duration + 0.7, chapters: scene.chapters }
    for (const [variant, size, track] of [['desktop', scene.desktop, studio.desktop], ['mobile', scene.mobile, studio.mobile]]) {
      const name = variant === 'desktop' ? scene.name : `${scene.name}-mobile`
      const master = resolve(directory, `${variant}-master.mkv`)
      const finished = resolve(directory, `${variant}-loop.mp4`)
      const poster = resolve(directory, `${variant}.webp`)
      intermediates.push(master, finished, poster)
      const camera = cameraFilter(track, scene.viewport, size)
      encode(['-framerate', String(FPS), '-i', resolve(directory, 'frame-%05d.png'), '-vf', camera, '-an', '-c:v', 'ffv1', '-level', '3', '-g', '1', '-pix_fmt', 'gbrp', '-threads', '2', master])
      // Dissolve into the actual first frame, then hold it briefly: no black frame,
      // reversed typing, or abrupt jump when the browser repeats the clip.
      const dissolve = `[0:v]split=2[body][opening];[opening]trim=end_frame=1,setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=1.1[first];[body][first]xfade=transition=fade:duration=0.6:offset=${scene.duration - 0.4},scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p[loop]`
      encode(['-i', master, '-filter_complex', dissolve, '-map', '[loop]', '-an', '-t', String(scene.duration + 0.7), '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-movflags', '+faststart', '-threads', '2', finished])
      encode(['-i', finished, '-frames:v', '1', '-c:v', 'libwebp', '-quality', '94', poster])
      const bytes = await readFile(finished)
      const revision = createHash('sha256').update(bytes).digest('hex').slice(0, 12)
      await rename(finished, resolve(output, `${name}.mp4`))
      await rename(poster, resolve(output, `${name}.webp`))
      if (variant === 'desktop') { result.revision = revision; result.bytes = bytes.length }
      else { result.mobile = { ...size, revision, bytes: bytes.length } }
      console.log(`  ${name}: ${size.width}x${size.height}, ${(bytes.length / 1024 / 1024).toFixed(2)} MB`)
    }
    if (scene.name === 'branch-map') result.ambient = await createAmbientMedia(root, output, scene.name)
    manifest.assets[scene.name] = result
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  } finally {
    await context.close()
    for (const path of [...frames, ...intermediates]) {
      try { await unlink(path) } catch (error) { if (error.code !== 'ENOENT') throw error }
    }
    await rmdir(directory)
  }
}

const browser = await chromium.launch()
try {
  for (const scene of scenes) if (selection.size === 0 || selection.has(scene.name)) await render(scene, browser)
} finally {
  await browser.close()
}
