import { expect, test, type Page } from '@playwright/test'
import { expectAdvancing, expectFrozen, expectRealLoops, expectSilentInline, setVisibility } from './media-helpers'

const inlineVideo = (page: Page) => page.locator('.live-media > .media-frame > video')
const control = (page: Page, action: 'Play' | 'Pause' | 'Retry') => page.getByRole('button', { name: `${action} live multiplayer session preview`, exact: true })

async function openPlayer(page: Page) {
  await page.goto('/')
  await page.locator('.live-media').scrollIntoViewIfNeeded()
}

async function injectPlayFailure(page: Page, failure: 'transient' | 'blocked' | 'interrupted' | 'stale-source') {
  await page.addInitScript((mode) => {
    const play = HTMLMediaElement.prototype.play
    const autoplay = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'autoplay')!
    const attempts = new WeakMap<HTMLMediaElement, number>()
    Object.defineProperty(HTMLMediaElement.prototype, 'autoplay', {
      ...autoplay,
      set(value: boolean) { autoplay.set!.call(this, this.closest('.live-media') ? false : value) },
    })
    HTMLMediaElement.prototype.play = function () {
      if (!this.closest('.live-media') || this.closest('dialog')) return play.call(this)
      const count = (attempts.get(this) ?? 0) + 1
      attempts.set(this, count)
      this.dataset.playAttempts = String(count)
      if (document.documentElement.dataset.allowPlayback === 'true') return play.call(this)
      if (mode === 'stale-source') {
        if (!this.getAttribute('src')?.includes('-mobile.mp4')) {
          return new Promise<void>((_, reject) => window.setTimeout(() => {
            this.dataset.staleRejected = 'true'
            reject(new DOMException('An old source finished late', 'NotSupportedError'))
          }, 600))
        }
        return play.call(this)
      }
      if (mode === 'transient') {
        if (count > 2) return play.call(this)
        if (count === 2) return Promise.resolve()
      }
      return Promise.reject(new DOMException('Injected playback policy/readiness failure', mode === 'blocked' ? 'NotAllowedError' : 'AbortError'))
    }
  }, failure)
}

for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  test(`feature films cross two real loop boundaries at ${viewport.width}px`, async ({ page }) => {
    test.setTimeout(90000)
    const errors: string[] = []
    const sources: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('request', (request) => {
      if (/\/media\/(?:live-session|branch-session)(?:-mobile)?\.(?:mp4|webp)(?:\?|$)/.test(request.url())) sources.push(request.url())
    })
    await page.setViewportSize(viewport)
    await openPlayer(page)
    const video = inlineVideo(page)
    await expectSilentInline(video)
    await expectAdvancing(video)
    const source = new URL(await video.evaluate((element: HTMLVideoElement) => element.currentSrc))
    expect(source.pathname).toMatch(viewport.width <= 640 ? /\/live-session-mobile\.mp4$/ : /\/live-session\.mp4$/)
    expect(source.searchParams.get('v')).toBeTruthy()
    await expectRealLoops(video)

    await expect(page.locator('.product-media:not(.ambient-media) > .media-frame > video')).toHaveCount(2)
    for (const media of await page.locator('.product-media:not(.ambient-media)').all()) {
      const player = media.locator('.media-frame > video')
      const poster = media.locator('.media-poster')
      await player.scrollIntoViewIfNeeded()
      await expectSilentInline(player)
      await expectAdvancing(player)
      await expect(player).toHaveJSProperty('videoWidth', Number(await player.getAttribute('width')))
      await expect(player).toHaveJSProperty('videoHeight', Number(await player.getAttribute('height')))
      await expect(poster).toHaveJSProperty('naturalWidth', Number(await poster.getAttribute('width')))
      await expect(poster).toHaveJSProperty('naturalHeight', Number(await poster.getAttribute('height')))
      await expect(player).toHaveAttribute('src', (await poster.getAttribute('src'))!.replace('.webp', '.mp4'))
    }
    expect(sources.every((url) => viewport.width <= 640 ? /-mobile\./.test(url) : !/-mobile\./.test(url))).toBe(true)
    expect(errors).toEqual([])
  })
}

test('pausing before metadata arrives cancels autoplay rather than resuming on canplay', async ({ page }) => {
  let release = () => {}
  const waiting = new Promise<void>((resolve) => { release = resolve })
  await page.route(/\/media\/live-session\.mp4(?:\?|$)/, async (route) => {
    await waiting
    await route.continue()
  })
  try {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.locator('.live-media').scrollIntoViewIfNeeded()
    const video = inlineVideo(page)
    await control(page, 'Pause').click()
    await expect(video).toHaveJSProperty('readyState', 0)
    release()
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState)).toBeGreaterThanOrEqual(2)
    await expectFrozen(video)
    await control(page, 'Play').click()
    await expectAdvancing(video)
  } finally {
    release()
  }
})

test('viewport and page visibility resume playback, but never override a user pause', async ({ page }) => {
  await openPlayer(page)
  const video = inlineVideo(page)
  await expectAdvancing(video)
  await setVisibility(page, false)
  await expectFrozen(video)
  await setVisibility(page, true)
  await expectAdvancing(video)
  await page.locator('#approach').scrollIntoViewIfNeeded()
  await expectFrozen(video)
  await video.scrollIntoViewIfNeeded()
  await expectAdvancing(video)
  await control(page, 'Pause').click()
  await expectFrozen(video)
  await setVisibility(page, false)
  await setVisibility(page, true)
  await page.locator('#approach').scrollIntoViewIfNeeded()
  await video.scrollIntoViewIfNeeded()
  await expectFrozen(video)
  await control(page, 'Play').click()
  await expectAdvancing(video)
})

test('source swaps and the lightbox share the selected variant and explicit pause intent', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openPlayer(page)
  const video = inlineVideo(page)
  await expectAdvancing(video)
  await control(page, 'Pause').click()
  const enlarge = page.getByRole('button', { name: 'Enlarge live multiplayer session', exact: true })
  await enlarge.click()
  const dialog = page.getByRole('dialog')
  const enlarged = dialog.locator('video')
  await expect(dialog).toBeVisible()
  await expect(enlarged).toHaveAttribute('src', /\/live-session-mobile\.mp4\?v=/)
  await expectSilentInline(enlarged)
  await expectFrozen(enlarged)
  await page.setViewportSize({ width: 1440, height: 1000 })
  for (const player of [video, enlarged]) {
    await expect(player).toHaveAttribute('src', /\/live-session\.mp4\?v=/)
    await expectFrozen(player)
  }
  const poster = page.locator('.live-media .media-poster')
  await expect(poster).toHaveAttribute('src', /\/live-session\.webp\?v=/)
  await expect.poll(() => poster.evaluate((image: HTMLImageElement) =>
    image.naturalWidth === Number(image.getAttribute('width')) && image.naturalHeight === Number(image.getAttribute('height')),
  )).toBe(true)
  await dialog.getByRole('button', { name: 'Play enlarged live multiplayer session preview', exact: true }).click()
  await expectAdvancing(enlarged)
  await expectFrozen(video)
  await setVisibility(page, false)
  await expectFrozen(enlarged)
  await setVisibility(page, true)
  await expectAdvancing(enlarged)
  await enlarged.evaluate((element: HTMLVideoElement) => element.pause())
  await expect(dialog.getByRole('button', { name: 'Play enlarged live multiplayer session preview', exact: true })).toBeVisible()
  await enlarged.evaluate((element: HTMLVideoElement) => element.play())
  await expectAdvancing(enlarged)
  await dialog.getByRole('button', { name: 'Pause enlarged live multiplayer session preview', exact: true }).click()
  await expectFrozen(enlarged)
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(enlarge).toBeFocused()
  await video.scrollIntoViewIfNeeded()
  await expectFrozen(video)
  await control(page, 'Play').click()
  await expectAdvancing(video)
  await enlarge.click()
  await expectAdvancing(enlarged)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(enlarged).toHaveAttribute('src', /\/live-session-mobile\.mp4\?v=/)
  await expectAdvancing(enlarged)
  await expect(enlarged).toHaveAttribute('poster', await poster.getAttribute('src') ?? '')
  await dialog.getByRole('button', { name: 'Close enlarged preview' }).click()
  await expect(dialog).toHaveCount(0)
  await video.scrollIntoViewIfNeeded()
  await expectAdvancing(video)
})

test('interrupted metadata/play races and unexpected inline pauses recover without a click', async ({ page }) => {
  await injectPlayFailure(page, 'transient')
  await openPlayer(page)
  const video = inlineVideo(page)
  await expectAdvancing(video)
  expect(Number(await video.getAttribute('data-play-attempts'))).toBeGreaterThanOrEqual(3)
  await video.evaluate((element: HTMLVideoElement) => element.pause())
  await expectAdvancing(video)
  await expect(page.locator('.live-media').getByRole('status')).toHaveCount(0)
})

test('an old source rejection cannot fail or pause the newly selected recording', async ({ page }) => {
  await injectPlayFailure(page, 'stale-source')
  await openPlayer(page)
  const video = inlineVideo(page)
  await expect(video).toHaveAttribute('data-play-attempts', /\d+/)
  await page.setViewportSize({ width: 390, height: 844 })
  await video.scrollIntoViewIfNeeded()
  await expect(video).toHaveAttribute('src', /\/live-session-mobile\.mp4\?v=/)
  await expectAdvancing(video)
  await expect(video).toHaveAttribute('data-stale-rejected', 'true')
  await expect(page.locator('.live-media').getByRole('status')).toHaveCount(0)
})

for (const failure of ['blocked', 'interrupted'] as const) {
  test(`${failure} playback is disclosed honestly and can be explicitly restarted`, async ({ page }) => {
    await injectPlayFailure(page, failure)
    await openPlayer(page)
    const video = inlineVideo(page)
    const media = page.locator('.live-media')
    await expect(media.getByRole('status')).toContainText(failure === 'blocked' ? 'blocked by your browser' : 'Playback was interrupted')
    await expectFrozen(video)
    await expect(media.locator('.media-poster')).not.toHaveClass(/behind-video/)
    const attempts = await video.getAttribute('data-play-attempts')
    await page.waitForTimeout(400)
    expect(await video.getAttribute('data-play-attempts')).toBe(attempts)
    await page.evaluate(() => { document.documentElement.dataset.allowPlayback = 'true' })
    await control(page, 'Play').click()
    await expectAdvancing(video)
    await expect(media.getByRole('status')).toHaveCount(0)
  })
}
