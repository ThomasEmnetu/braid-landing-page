import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import media from '../media-manifest.json' with { type: 'json' }
import { expectAmbientReady, expectRealLoops, expectSilentInline, setVisibility } from './media-helpers'

async function blockHeroAutoplay(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    const play = HTMLMediaElement.prototype.play
    const autoplay = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'autoplay')!
    Object.defineProperty(HTMLMediaElement.prototype, 'autoplay', {
      ...autoplay,
      set(value: boolean) { autoplay.set!.call(this, this.closest('.hero-media') ? false : value) },
    })
    HTMLMediaElement.prototype.play = function () {
      return this.closest('.hero-media')
        ? Promise.reject(new DOMException('Autoplay blocked by browser policy', 'NotAllowedError'))
        : play.call(this)
    }
  })
}

for (const viewport of [{ width: 1440, height: 620 }, { width: 390, height: 844 }]) {
  test(`hero starts without a click or scroll at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('/')
    const hero = await expectAmbientReady(page)
    expect(await page.evaluate(() => scrollY)).toBe(0)
    await expect(hero.locator('.media-actions')).toHaveCount(0)
    await expect(hero.getByRole('button', { name: /^Play |^Enlarge / })).toHaveCount(0)
    await expect(hero.locator('.ambient-motion-access')).toHaveCSS('opacity', '0')
    if (viewport.height === 620) {
      expect(await hero.evaluate(root => {
        const bounds = root.getBoundingClientRect()
        return Math.max(0, innerHeight - bounds.top) / bounds.height
      })).toBeLessThan(0.15)
    }
    if (await hero.getAttribute('data-renderer') === 'video') {
      await expectSilentInline(hero.locator('video'))
      await expectRealLoops(hero.locator('video'))
    } else {
      await expect(hero.locator('.ambient-animation')).toHaveAttribute('data-source', viewport.width < 640 ? /branch-map-mobile-ambient\.avif/ : /branch-map-ambient\.avif/)
    }
  })
}

test('a browser autoplay block automatically becomes a moving, infinitely looping fallback', async ({ page }) => {
  test.setTimeout(45000)
  await blockHeroAutoplay(page)
  await page.goto('/')
  const hero = await expectAmbientReady(page)
  await expect(hero).toHaveAttribute('data-renderer', 'animated-image')
  await expect(hero.locator('video, .media-actions')).toHaveCount(0)
  await expect(hero.getByRole('status')).toHaveCount(0)
  const image = hero.locator('.ambient-animation')
  await image.scrollIntoViewIfNeeded()
  const first = await image.screenshot()
  await expect.poll(async () => first.equals(await image.screenshot()), { timeout: 8000, intervals: [300] }).toBe(false)
  await page.waitForTimeout(media.assets['branch-map'].ambient.duration * 1000)
  const nextCycle = await image.screenshot()
  await expect.poll(async () => nextCycle.equals(await image.screenshot()), { timeout: 8000, intervals: [300] }).toBe(false)

  const bytes = await readFile('public/media/branch-map-ambient.webp')
  const loopChunk = bytes.indexOf(Buffer.from('ANIM'))
  expect(loopChunk).toBeGreaterThan(0)
  expect(bytes.readUInt16LE(loopChunk + 12)).toBe(0)
  expect(media.assets['branch-map'].ambient.frames).toBeGreaterThan(100)
  expect(media.assets['branch-map'].ambient.independentFrames).toBe(true)
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const size = bytes.readUInt32LE(offset + 4)
    if (bytes.toString('ascii', offset, offset + 4) === 'ANMF') {
      expect(bytes[offset + 8 + 15] & 2).toBe(2)
      expect(bytes.readUIntLE(offset + 8, 3)).toBe(0)
      expect(bytes.readUIntLE(offset + 8 + 3, 3)).toBe(0)
    }
    offset += 8 + size + size % 2
  }
})

test('ambient fallback selection, tab visibility, and keyboard stopping remain coherent', async ({ page }) => {
  await blockHeroAutoplay(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const hero = await expectAmbientReady(page)
  const image = hero.locator('.ambient-animation')
  await expect(image).toHaveAttribute('data-source', /branch-map-mobile-ambient\.avif/)
  await expect(image).toHaveJSProperty('naturalWidth', media.assets['branch-map'].ambient.mobile.width)
  const original = await image.getAttribute('src')
  await setVisibility(page, false)
  await expect(image).toHaveCount(0)
  await setVisibility(page, true)
  await expectAmbientReady(page)
  await expect(image).not.toHaveAttribute('src', original!)
  const stop = hero.getByRole('button', { name: 'Pause background motion' })
  await stop.focus()
  await stop.press('Enter')
  await expect(image).toHaveCount(0)
  await setVisibility(page, false)
  await setVisibility(page, true)
  await expect(hero).toHaveAttribute('data-paused', 'true')
  const resume = hero.getByRole('button', { name: 'Resume background motion' })
  await resume.press('Enter')
  await expectAmbientReady(page)
})

test('ambient loading failures are disclosed rather than faking playback', async ({ page }) => {
  await blockHeroAutoplay(page)
  await page.route(/branch-map-ambient\.(?:avif|webp)/, route => route.abort())
  await page.goto('/')
  const hero = page.locator('.hero-media')
  await expect(hero.getByRole('status')).toContainText('preview could not load')
  await expect(hero.locator('.ambient-animation')).toHaveCount(0)
  await expect(hero.locator('.media-poster')).toHaveJSProperty('naturalWidth', media.assets['branch-map'].width)
})

test('an unsupported preferred animation uses the clean compatibility format', async ({ page }) => {
  await blockHeroAutoplay(page)
  await page.route(/branch-map-ambient\.avif/, route => route.abort())
  await page.goto('/')
  const hero = await expectAmbientReady(page)
  await expect(hero.locator('.ambient-animation')).toHaveAttribute('data-source', /branch-map-ambient\.webp/)
  await expect(hero.getByRole('status')).toHaveCount(0)
})

test('the hero remains minimal without decorative chapter labels', async ({ page }) => {
  await page.goto('/')
  await expectAmbientReady(page)
  await expect(page.locator('.hero-story, .hero-product-heading')).toHaveCount(0)
  await expect(page.locator('.hero-media figcaption')).toHaveClass('sr-only')
})
