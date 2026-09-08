import { expect, test, type Locator, type Page } from '@playwright/test'

async function showScene(page: Page, name: 'branching' | 'ping') {
  const scene = page.locator(`[data-scene="${name}"]`)
  await scene.scrollIntoViewIfNeeded()
  await expect(scene).toHaveAttribute('data-ready', 'true')
  return scene
}

async function animationTimes(scene: Locator) {
  return scene.evaluate((root) => root.getAnimations({ subtree: true })
    .filter((animation) => animation.effect?.getTiming().iterations === Infinity)
    .map((animation) => Number(animation.currentTime)))
}

async function expectPaused(scene: Locator) {
  await expect(scene).toHaveAttribute('data-running', 'false')
  // Web Animations settles a requested pause on the next animation frame.
  await expect.poll(() => scene.evaluate((root) => root.getAnimations({ subtree: true })
    .filter((animation) => animation.effect?.getTiming().iterations === Infinity)
    .every((animation) => animation.playState === 'paused' && !animation.pending),
  )).toBe(true)
  const before = await animationTimes(scene)
  await scene.page().waitForTimeout(200)
  expect(await animationTimes(scene)).toEqual(before)
}

test('both dimensional scenes use actual UI assets and continuously animate in depth', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  for (const name of ['branching', 'ping'] as const) {
    const scene = await showScene(page, name)
    await expect(scene).toHaveAttribute('data-running', 'true')
    await expect.poll(() => scene.locator('.scene-camera').evaluate((element) => getComputedStyle(element).transform)).toMatch(/^matrix3d/)
    const count = await scene.evaluate((root) => {
      const animations = root.getAnimations({ subtree: true }).filter((animation) => animation.effect?.getTiming().iterations === Infinity)
      animations.forEach((animation) => animation.updatePlaybackRate(4))
      return animations.length
    })
    expect(count).toBeGreaterThanOrEqual(4)
    await expect.poll(() => scene.evaluate((root) => {
      const animations = root.getAnimations({ subtree: true }).filter((animation) => animation.effect?.getTiming().iterations === Infinity)
      return Math.min(...animations.map((animation) => animation.effect?.getComputedTiming().currentIteration ?? 0))
    }), { timeout: 12000 }).toBeGreaterThanOrEqual(2)
    for (const image of await scene.locator('img').all()) {
      await expect(image).toHaveAttribute('src', /\/media\/scenes\/.*\.webp\?v=/)
      await expect(image).toHaveJSProperty('naturalWidth', Number(await image.getAttribute('width')))
      await expect(image).toHaveJSProperty('naturalHeight', Number(await image.getAttribute('height')))
    }
    await expect(scene.locator('video, canvas')).toHaveCount(0)
  }
  expect(errors).toEqual([])
})

test('dimensional motion respects pause, replay, reduced motion, and offscreen state', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const scene = await showScene(page, 'branching')
  await expectPaused(scene)
  await expect(scene.locator('[data-layer="token"]')).toHaveCSS('opacity', '1')
  await scene.getByRole('button', { name: 'Play branching animation', exact: true }).click()
  await expect(scene).toHaveAttribute('data-running', 'true')
  await expect.poll(async () => (await animationTimes(scene))[0]).toBeGreaterThan(150)
  await scene.getByRole('button', { name: 'Pause branching animation', exact: true }).click()
  await expectPaused(scene)
  await page.locator('#waitlist').scrollIntoViewIfNeeded()
  await scene.scrollIntoViewIfNeeded()
  await expectPaused(scene)
  await scene.getByRole('button', { name: 'Replay branching animation', exact: true }).click()
  await expect(scene).toHaveAttribute('data-running', 'true')
  await page.locator('#waitlist').scrollIntoViewIfNeeded()
  await expectPaused(scene)
  await scene.scrollIntoViewIfNeeded()
  await expect(scene).toHaveAttribute('data-running', 'true')
})

test('the mobile ping scene uses its own exact UI and preserves pause on resize', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const scene = await showScene(page, 'ping')
  for (const image of await scene.locator('img').all()) await expect(image).toHaveAttribute('src', /-mobile\.webp\?v=/)
  await scene.getByRole('button', { name: 'Pause teammate ping animation', exact: true }).click()
  await expectPaused(scene)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await scene.scrollIntoViewIfNeeded()
  await expect(scene).toHaveAttribute('data-ready', 'true')
  await expectPaused(scene)
  for (const image of await scene.locator('img').all()) await expect(image).not.toHaveAttribute('src', /-mobile\.webp/)
})

test('a failed dimensional asset is disclosed and can be retried', async ({ page }) => {
  const asset = /\/media\/scenes\/node-token\.webp(?:\?|$)/
  await page.route(asset, (route) => route.abort())
  await page.goto('/')
  const scene = page.locator('[data-scene="branching"]')
  await scene.scrollIntoViewIfNeeded()
  await expect(scene.getByRole('status')).toContainText('product artwork could not load')
  await expect(scene.getByRole('button', { name: 'Play branching animation' })).toBeDisabled()
  await page.unroute(asset)
  await scene.getByRole('button', { name: 'Retry branching animation' }).click()
  await expect(scene).toHaveAttribute('data-ready', 'true')
  await expect(scene).toHaveAttribute('data-running', 'true')
  await expect(scene.getByRole('status')).toHaveCount(0)
})

test('the end of the ping loop has no connector passing through the composer', async ({ page }) => {
  await page.goto('/')
  const scene = await showScene(page, 'ping')
  await scene.getByRole('button', { name: 'Pause teammate ping animation' }).click()
  for (const time of [7500, 8100, 9600, 11200]) {
    await scene.evaluate((root, time) => root.getAnimations({ subtree: true }).forEach((animation) => { animation.currentTime = time }), time)
    await expect(scene.locator('.ping-signal, .ping-signal-plane, .scene-camera > svg')).toHaveCount(0)
    await expect(scene.locator('.ping-composer img').first()).toHaveJSProperty('complete', true)
  }
})

test('branch paths stay attached to the projected card centers during movement and resizing', async ({ page }) => {
  await page.goto('/')
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport)
    const scene = await showScene(page, 'branching')
    await expect(scene).toHaveAttribute('data-running', 'true')
    const duration = await scene.evaluate(root => root.getAnimations({ subtree: true })
      .find(animation => animation.effect?.getTiming().iterations === Infinity)?.effect?.getTiming().duration)
    expect(duration).toBe(9500)
    for (let sample = 0; sample < 5; sample++) {
      await page.waitForTimeout(350)
      const error = await scene.evaluate(root => new Promise<number>(resolve => requestAnimationFrame(() => {
        const svg = root.querySelector<SVGSVGElement>('.branch-scene-wires')!
        const bounds = svg.getBoundingClientRect()
        const origin = root.querySelector<HTMLElement>('[data-port="main-out"]')!.getBoundingClientRect()
        let maximum = 0
        for (const name of ['token', 'sliding']) {
          const path = root.querySelector<SVGPathElement>(`[data-wire="${name}"]`)!
          const target = root.querySelector<HTMLElement>(`[data-port="${name}-in"]`)!.getBoundingClientRect()
          const start = path.getPointAtLength(0)
          const end = path.getPointAtLength(path.getTotalLength())
          maximum = Math.max(maximum,
            Math.hypot(start.x + bounds.x - origin.x, start.y + bounds.y - origin.y),
            Math.hypot(end.x + bounds.x - target.x, end.y + bounds.y - target.y))
        }
        resolve(maximum)
      })))
      expect(error).toBeLessThan(2)
    }
  }
})

test('page copy omits repeated micro-labels and keeps useful text readable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.locator('.scene-stage-label, .scene-provenance, .scene-corner-note, .ping-receipt, .feature-number, .branch-steps, .commitment-label')).toHaveCount(0)
  for (const selector of ['.hero-description', '.feature-copy > p', '.mention-copy p', '.value > p', '.retention-note p']) {
    for (const paragraph of await page.locator(selector).all()) {
      expect(await paragraph.evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(14)
    }
  }
  await expect(page.locator('.signup-note').first()).toContainText('Email signup is not connected yet')
})
