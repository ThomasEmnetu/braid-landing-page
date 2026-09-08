import { expect, type Locator, type Page } from '@playwright/test'

export async function expectAdvancing(video: Locator) {
  await expect(video).toHaveJSProperty('paused', false)
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState)).toBeGreaterThanOrEqual(2)
  const before = await video.evaluate((element: HTMLVideoElement) => element.currentTime)
  await expect.poll(() => video.evaluate((element: HTMLVideoElement, start) => {
    const elapsed = element.currentTime - start
    return elapsed < 0 ? elapsed + element.duration : elapsed
  }, before)).toBeGreaterThan(0.15)
}

export async function expectFrozen(video: Locator) {
  await expect(video).toHaveJSProperty('paused', true)
  const before = await video.evaluate((element: HTMLVideoElement) => element.currentTime)
  await video.page().waitForTimeout(350)
  expect(await video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeCloseTo(before, 2)
}

export async function expectSilentInline(video: Locator) {
  await expect(video).toHaveJSProperty('muted', true)
  await expect(video).toHaveJSProperty('defaultMuted', true)
  await expect(video).toHaveJSProperty('playsInline', true)
  await expect(video).toHaveAttribute('muted', '')
  await expect(video).toHaveAttribute('playsinline', '')
  await expect(video).toHaveAttribute('loop', '')
}

export async function setVisibility(page: Page, visible: boolean) {
  // Headless windows do not consistently background tabs; media time stays real.
  await page.evaluate((isVisible) => {
    Object.defineProperties(document, {
      visibilityState: { configurable: true, get: () => isVisible ? 'visible' : 'hidden' },
      hidden: { configurable: true, get: () => !isVisible },
    })
    document.dispatchEvent(new Event('visibilitychange'))
  }, visible)
}

interface LoopProbe {
  wraps: number
  samples: number
  advanced: number
  previous: number
}

export async function expectRealLoops(video: Locator) {
  const duration = await video.evaluate((element: HTMLVideoElement) => {
    const monitored = element as HTMLVideoElement & { loopProbe: LoopProbe }
    const probe = { wraps: 0, samples: 0, advanced: 0, previous: element.currentTime }
    monitored.loopProbe = probe
    element.addEventListener('timeupdate', () => {
      const current = element.currentTime
      const delta = current - probe.previous
      if (delta < -element.duration / 2) {
        probe.wraps += 1
        probe.advanced += element.duration + delta
      } else if (delta > 0) {
        probe.advanced += delta
        probe.samples += 1
      }
      probe.previous = current
    })
    // Decode the whole recording; never seek across a loop boundary.
    element.playbackRate = 3
    return element.duration
  })
  expect(duration).toBeGreaterThan(1)
  await expect.poll(() => video.evaluate((element) => (element as HTMLVideoElement & { loopProbe: LoopProbe }).loopProbe.wraps), {
    timeout: Math.ceil((duration * 2.5 / 3 + 10) * 1000),
    intervals: [250],
  }).toBeGreaterThanOrEqual(2)
  const probe = await video.evaluate((element) => {
    const monitored = element as HTMLVideoElement & { loopProbe: LoopProbe }
    monitored.playbackRate = 1
    return monitored.loopProbe
  })
  expect(probe.advanced).toBeGreaterThan(duration)
  expect(probe.samples).toBeGreaterThan(10)
  await expectAdvancing(video)
}

export async function expectAmbientReady(page: Page) {
  const hero = page.locator('.hero-media')
  await expect.poll(() => hero.evaluate((root) => {
    const video = root.querySelector('video')
    const image = root.querySelector<HTMLImageElement>('.ambient-animation.is-ready')
    return Boolean((image && image.naturalWidth > 0) || (video && !video.paused && video.currentTime > 0.15))
  }), { timeout: 15000 }).toBe(true)
  return hero
}
