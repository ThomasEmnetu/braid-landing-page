import { expect, test, type Locator } from '@playwright/test'
import { expectAmbientReady, expectSilentInline } from './media-helpers'

async function expectCapturedDimensions(poster: Locator) {
  const width = Number(await poster.getAttribute('width'))
  const height = Number(await poster.getAttribute('height'))
  expect(width).toBeGreaterThan(0)
  expect(height).toBeGreaterThan(0)
  await expect(poster).toHaveJSProperty('naturalWidth', width)
  await expect(poster).toHaveJSProperty('naturalHeight', height)
}

test('hero presents a real silent, looping branch-map recording', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('AI coding, together.Branch. Explore. Merge.')
  await expect(page.getByRole('button', { name: 'Open navigation', exact: true })).toBeHidden()
  const hero = await expectAmbientReady(page)
  if (await hero.getAttribute('data-renderer') === 'video') await expectSilentInline(hero.locator('video'))
  await expect(hero.locator('.media-actions')).toHaveCount(0)
  await expectCapturedDimensions(page.locator('.hero-media .media-poster'))
  expect(errors).toEqual([])
})

test('hero signup stays above the fold without horizontal overflow', async ({ page }) => {
  for (const viewport of [{ width: 320, height: 740 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport)
    await page.goto('/')
    await page.evaluate(() => document.fonts.ready)
    const submit = page.getByRole('form', { name: 'Hero waitlist' }).getByRole('button', { name: 'Join the waitlist' })
    const bounds = await submit.boundingBox()
    expect(bounds).not.toBeNull()
    expect(bounds!.y + bounds!.height).toBeLessThan(viewport.height)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  }
})

test('recording controls pause, expand, and restore keyboard focus', async ({ page }) => {
  await page.goto('/')
  const video = page.locator('.live-media > .media-frame > video')
  await video.scrollIntoViewIfNeeded()
  await page.getByRole('button', { name: 'Pause live multiplayer session preview', exact: true }).click()
  await expect(video).toHaveJSProperty('paused', true)
  const pausedTime = await video.evaluate((element: HTMLVideoElement) => element.currentTime)
  await page.waitForTimeout(300)
  expect(await video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBe(pausedTime)
  const enlarge = page.getByRole('button', { name: 'Enlarge live multiplayer session', exact: true })
  await enlarge.click()
  await page.waitForTimeout(350)
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('dialog').locator('video')).toHaveJSProperty('paused', true)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(enlarge).toBeFocused()
})

test('every brief section is present with real product assets and honest MVP boundaries', async ({ page }) => {
  await page.goto('/')
  for (const id of ['problem-title', 'github-title', 'live-title', 'branch-title', 'fork-flow-title', 'mention-title', 'approach-title', 'waitlist-title']) {
    const heading = page.locator(`#${id}`)
    await heading.scrollIntoViewIfNeeded()
    await expect(heading).toBeVisible()
  }
  await expect(page.locator('.product-media')).toHaveCount(3)
  await expect(page.locator('.product-scene')).toHaveCount(2)
  for (const poster of await page.locator('.media-poster').all()) {
    await poster.scrollIntoViewIfNeeded()
    await expectCapturedDimensions(poster)
  }
  await expect(page.locator('.merge-note')).toContainText("Merging in v1 posts the branch's outcome back to its parent")
  await expect(page.locator('.merge-note')).toContainText('GitHub PRs')
  await expect(page.locator('.value-data')).toContainText('working session and account deletion')
  await expect(page.locator('.retention-note')).toContainText("aren't finalized yet")
  await expect(page.locator('.github-connection')).toContainText('GitHub sign-in and repo-connected sessions are part of the MVP')
  await expect(page.locator('.github-connection')).toContainText('Reviews and merges stay in GitHub')
  await expect(page.locator('.fork-flow-media video')).toHaveAttribute('src', /\/branch-session\.mp4\?v=/)
  await expect(page.locator('#fork-flow-title')).toHaveText('A new branch.Not a blank chat.')
  await expect(page.getByRole('form')).toHaveCount(2)
  const live = await page.locator('.live-media').boundingBox()
  const branch = await page.locator('.branch-media').boundingBox()
  expect(live!.width * live!.height).toBeLessThan(branch!.width * branch!.height)
  expect((await page.locator('.feature-live .feature-copy').boundingBox())!.x).toBeLessThan(live!.x)
  expect((await page.locator('.feature-branch .feature-copy').boundingBox())!.x).toBeGreaterThan(branch!.x)
  expect((await page.locator('.feature-visualizer .feature-copy').boundingBox())!.x).toBeLessThan((await page.locator('.detail-media').boundingBox())!.x)
})

test('below-fold clips load on approach and pause when they leave the viewport', async ({ page }) => {
  const requests: string[] = []
  page.on('request', (request) => {
    if (/\.(webm|mp4)(\?|$)/.test(request.url())) requests.push(request.url())
  })
  await page.goto('/')
  await expect.poll(() => requests.some((url) => url.includes('branch-map'))).toBe(true)
  expect(requests.some((url) => /live-session|branch-session/.test(url))).toBe(false)
  const live = page.locator('.live-media video')
  await live.scrollIntoViewIfNeeded()
  await expect.poll(() => live.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeGreaterThan(0)
  await page.locator('#approach').scrollIntoViewIfNeeded()
  await expect(live).toHaveJSProperty('paused', true)
})

test('the ambient hero preserves a keyboard-accessible motion stop', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const hero = await expectAmbientReady(page)
  await expectCapturedDimensions(page.locator('.hero-media .media-poster'))
  const stop = hero.getByRole('button', { name: 'Pause background motion', exact: true })
  await expect(stop).toHaveCSS('opacity', '0')
  await stop.focus()
  await stop.press('Enter')
  await expect(hero).toHaveAttribute('data-paused', 'true')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.waitForTimeout(350)
  await expect(hero).toHaveAttribute('data-paused', 'true')
  if (await hero.getAttribute('data-renderer') === 'video') await expect(hero.locator('video')).toHaveJSProperty('paused', true)
  else await expect(hero.locator('.ambient-animation')).toHaveCount(0)
})

test('mobile navigation works with taps and keyboard dismissal', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const toggle = page.getByRole('button', { name: 'Open navigation', exact: true })
  await toggle.click()
  const navigation = page.getByRole('navigation', { name: 'Main navigation' })
  await expect(navigation).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(navigation).toBeHidden()
  await expect(toggle).toBeFocused()
  await toggle.click()
  await navigation.getByRole('link', { name: 'Our approach' }).click()
  await expect(page).toHaveURL(/#approach$/)
  await expect(navigation).toBeHidden()
  await page.getByRole('link', { name: /Join waitlist/ }).click()
  await expect(page).toHaveURL(/#waitlist$/)
  await expect(page.getByRole('form', { name: 'Footer waitlist' })).toBeVisible()
})

test('a failed clip is disclosed, retains its genuine captured poster, and can be retried', async ({ page }) => {
  const source = /\/media\/live-session(?:-mobile)?\.mp4(?:\?|$)/
  await page.route(source, (route) => route.abort())
  await page.goto('/')
  const media = page.locator('.live-media')
  await media.scrollIntoViewIfNeeded()
  await expect(media.locator('figcaption')).toContainText('Clip unavailable. Showing the captured screenshot.')
  await expectCapturedDimensions(media.locator('.media-poster'))
  await expect(media.locator('.media-poster')).not.toHaveClass(/behind-video/)
  await expect(media.locator('video')).toHaveJSProperty('paused', true)
  await expect(media.getByRole('button', { name: 'Enlarge live multiplayer session' })).toBeVisible()
  await page.unroute(source)
  await media.getByRole('button', { name: 'Retry live multiplayer session preview' }).click()
  await expect.poll(() => media.locator('video').evaluate((element: HTMLVideoElement) => element.currentTime)).toBeGreaterThan(0)
  await expect(media.getByRole('status')).toHaveCount(0)
})
