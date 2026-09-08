import { around, frame, within } from './studio-camera.mjs'

const CHAT = '#chat-input'
const PLAN = '[data-message-id="main-plan"]'
const TOKEN = '[data-session-node="token-bucket"]'

async function manualSession(studio, scrollToPlan = false) {
  const { page } = studio
  await page.getByRole('button', { name: 'Jump to A new direction', exact: true }).click({ force: true })
  await page.locator(CHAT).fill('')
  await page.clock.runFor(300)
  const dismiss = page.getByRole('button', { name: 'Dismiss notification' })
  if (await dismiss.isVisible()) await dismiss.click({ force: true })
  await page.locator('.thread-scroll').evaluate((element, plan) => {
    const message = element.querySelector('[data-message-id="main-plan"]')
    element.scrollTop = plan && message ? element.scrollTop + message.getBoundingClientRect().top - element.getBoundingClientRect().top - 16 : element.scrollHeight
  }, scrollToPlan)
  await page.clock.runFor(100)
}

async function focusedMap(studio, chapter) {
  await studio.page.getByRole('button', { name: `Jump to ${chapter}`, exact: true }).click({ force: true })
  await studio.page.getByRole('button', { name: 'Focus on branch map', exact: true }).click({ force: true })
  await studio.page.clock.runFor(800)
}

async function graphCamera(studio) {
  const bounds = await studio.box('.map-canvas')
  if (!bounds) throw new Error('The real branch canvas is unavailable.')
  studio.desktop.points[0].value = within(studio.scene.opening.desktop, bounds)
  studio.mobile.points[0].value = within(studio.scene.opening.mobile, bounds)
  return (time, duration, desktop, mobile) => studio.pan(time, duration, within(desktop, bounds), within(mobile, bounds))
}

export const scenes = [
  {
    name: 'branch-map',
    duration: 13,
    viewport: { width: 1280, height: 1000 },
    desktop: { width: 2400, height: 1350 },
    mobile: { width: 1080, height: 1350 },
    opening: {
      desktop: frame(236, 82, 1015, 16 / 9),
      mobile: frame(240, 88, 580, 4 / 5),
    },
    chapters: ['Start in the shared conversation', 'Open the branch map', 'Choose token-bucket', 'Pick up the full context'],
    async prepare(studio) {
      await studio.page.getByRole('button', { name: 'Jump to Better, together', exact: true }).click({ force: true })
      await studio.page.getByRole('button', { name: 'Open session main', exact: true }).click({ force: true })
      await studio.page.clock.runFor(500)
      const dismiss = studio.page.getByRole('button', { name: 'Dismiss notification' })
      if (await dismiss.isVisible()) await dismiss.click({ force: true })
      await studio.page.locator('.thread-scroll').evaluate((element) => { element.scrollTop = 0 })
    },
    async plan(studio) {
      let bounds
      studio.at(0.9, async () => {
        const tab = await studio.box('.session-tabs .tab:last-child')
        studio.pan(0.9, 1.25, around(tab, 16 / 9, 50, 670), around(tab, 4 / 5, 35, 395))
        await studio.point('.session-tabs .tab:last-child', 0.9, 1.2)
      })
      studio.at(2.4, async () => {
        await studio.click('.session-tabs .tab:last-child')
        await studio.page.getByRole('button', { name: 'Focus on branch map', exact: true }).click({ force: true })
        bounds = await studio.box('.map-canvas')
        if (!bounds) throw new Error('The hero must open the actual branch map from chat.')
        studio.pan(2.4, 1.15, within(frame(48, 179, 1184, 16 / 9), bounds), within(frame(355, 222, 560, 4 / 5), bounds))
      })
      studio.at(4.2, async () => {
        const token = await studio.box(TOKEN)
        studio.pan(4.2, 1.4, within(around(token, 16 / 9, 38, 800), bounds), within(around(token, 4 / 5, 32, 430), bounds))
        await studio.point(TOKEN, 4.2, 1.3)
      })
      studio.at(6.7, async () => {
        await studio.click(TOKEN)
        await studio.page.locator('.thread-scroll').evaluate((element) => { element.scrollTop = 0 })
        studio.pan(6.7, 1.5, frame(233, 87, 885, 16 / 9), frame(239, 92, 535, 4 / 5))
      })
      studio.at(9, () => {
        studio.pan(9, 1.65, frame(232, 75, 1026, 16 / 9), frame(236, 81, 590, 4 / 5))
        studio.cursor.move(9, 1.1, { x: 1243, y: 925 })
      })
      studio.at(11.8, async () => {
        if (!(await studio.page.locator('.branch-pill').textContent()).includes('token-bucket')) throw new Error('The hero must finish inside the actual token-bucket conversation.')
      })
    },
  },
  {
    name: 'live-session',
    duration: 14,
    viewport: { width: 960, height: 1000 },
    desktop: { width: 1600, height: 1000 },
    mobile: { width: 1080, height: 1350 },
    opening: {
      desktop: frame(179, 297, 774, 8 / 5),
      mobile: frame(193, 418, 520, 4 / 5),
    },
    chapters: ['Write to the shared agent', 'Send one prompt', 'Watch the answer arrive together'],
    prepare: manualSession,
    async plan(studio) {
      studio.at(0.2, async () => {
        studio.pan(0.2, 1.1, frame(182, 533, 766, 8 / 5), frame(185, 596, 410, 4 / 5))
        await studio.point(CHAT, 0.2, 0.9, { x: 0.24, y: 0.45 })
      })
      studio.type(CHAT, 'Add Redis outage coverage before we merge.', 1.4, 3.7)
      studio.at(3.8, () => studio.point('.send-button', 3.8, 0.65))
      studio.at(4.5, async () => {
        await studio.click('.send-button')
        studio.pan(4.5, 1.4, frame(186, 286, 762, 8 / 5), frame(189, 295, 545, 4 / 5))
      })
      studio.at(7.4, async () => {
        const reply = await studio.box('.agent-message:last-child')
        studio.pan(7.4, 1.6, around({ x: reply.x, y: Math.max(246, reply.y), width: 748, height: 400 }, 8 / 5, 18), frame(197, Math.max(246, reply.y), 550, 4 / 5))
        studio.cursor.move(7.4, 1.0, { x: 922, y: 944 })
      })
      studio.at(12.3, async () => {
        if (!(await studio.page.locator('.human-message').last().textContent()).includes('Add Redis outage coverage')) throw new Error('The live sequence did not actually send its prompt.')
        if (!(await studio.page.locator('.agent-message').last().textContent()).includes('Braid')) throw new Error('The shared agent did not respond.')
      })
    },
  },
  {
    name: 'branch-session',
    duration: 14,
    viewport: { width: 960, height: 1000 },
    desktop: { width: 1664, height: 1248 },
    mobile: { width: 1080, height: 1350 },
    opening: {
      desktop: frame(184, 243, 768, 4 / 3),
      mobile: frame(194, 306, 525, 4 / 5),
    },
    chapters: ['Choose an exact reply', 'Give the branch a direction', 'Continue independently'],
    prepare: (studio) => manualSession(studio, true),
    async plan(studio) {
      studio.at(0.1, async () => {
        await studio.point(`${PLAN} .branch-from-button`, 0.1, 1.2)
        const reply = await studio.box(PLAN)
        studio.pan(0.1, 1.3, around(reply, 4 / 3, 20), frame(382, reply.y + 22, 500, 4 / 5))
      })
      studio.at(1.9, async () => {
        await studio.click(`${PLAN} .branch-from-button`)
        studio.pan(1.9, 1.2, frame(164, 180, 632, 4 / 3), frame(232, 227, 455, 4 / 5))
      })
      studio.at(3.3, () => studio.point('#branch-name', 3.3, 0.6, { x: 0.25, y: 0.5 }))
      studio.at(3.35, () => studio.pan(3.35, 0.7, frame(212, 454, 460, 4 / 3), frame(225, 440, 420, 4 / 5)))
      studio.type('#branch-name', 'token-bucket', 4.0, 5.0)
      studio.at(5.2, async () => {
        studio.pan(5.2, 1.2, frame(164, 398, 632, 4 / 3), frame(250, 431, 460, 4 / 5))
        await studio.point('.fork-dialog .primary-button', 5.2, 1.3)
      })
      studio.at(7.2, async () => {
        await studio.click('.fork-dialog .primary-button')
        await studio.page.locator('.thread-scroll').evaluate((element) => { element.scrollTop = 0 })
        studio.pan(7.2, 1.2, frame(183, 88, 766, 4 / 3), frame(191, 86, 560, 4 / 5))
      })
      studio.at(9.3, async () => {
        await studio.page.locator('.thread-scroll').evaluate((element) => { element.scrollTop = element.scrollHeight })
        studio.pan(9.3, 1.5, frame(183, 287, 766, 4 / 3), frame(193, 277, 545, 4 / 5))
        studio.cursor.move(9.3, 0.8, { x: 924, y: 963 })
      })
      studio.at(12.7, async () => {
        if (!(await studio.page.locator('.branch-pill').textContent()).includes('token-bucket')) throw new Error('The branch sequence must create a real independent demo session.')
      })
    },
  },
  {
    name: 'branch-detail',
    duration: 11,
    viewport: { width: 1280, height: 1000 },
    desktop: { width: 1600, height: 1000 },
    mobile: { width: 1080, height: 1350 },
    opening: {
      desktop: frame(67, 436, 770, 8 / 5),
      mobile: frame(71, 420, 480, 4 / 5),
    },
    chapters: ['Read the branch summary', 'Jump into the full context', 'Return to the whole picture'],
    prepare: (studio) => focusedMap(studio, 'Better, together'),
    async plan(studio) {
      const pan = await graphCamera(studio)
      studio.at(0.25, async () => {
        await studio.point(TOKEN, 0.25, 1.0)
        const token = await studio.box(TOKEN)
        pan(0.25, 1.1, around(token, 8 / 5, 30, 590), around(token, 4 / 5, 30, 430))
      })
      studio.at(2.9, async () => {
        await studio.click(TOKEN)
        studio.pan(2.9, 1.1, frame(236, 82, 760, 8 / 5), frame(246, 98, 565, 4 / 5))
      })
      studio.at(5.2, async () => {
        if (!(await studio.page.locator('.session-view').textContent()).includes('token-bucket')) throw new Error('The visualizer must actually navigate into a branch.')
        await studio.point('.session-tabs .tab:last-child', 5.2, 0.8)
      })
      studio.at(6.2, async () => {
        await studio.click('.session-tabs .tab:last-child')
        await studio.page.getByRole('button', { name: 'Focus on branch map', exact: true }).click({ force: true })
        pan(6.2, 1.4, frame(48, 188, 1184, 8 / 5), frame(394, 229, 492, 4 / 5))
      })
      studio.at(8.4, async () => {
        const token = await studio.box(TOKEN)
        pan(8.4, 1.1, around(token, 8 / 5, 30, 590), around(token, 4 / 5, 30, 430))
        await studio.point(TOKEN, 8.4, 0.7)
      })
    },
  },
  {
    name: 'teammate-ping',
    duration: 9,
    viewport: { width: 960, height: 1000 },
    desktop: { width: 1600, height: 900 },
    mobile: { width: 1080, height: 810 },
    opening: {
      desktop: frame(182, 446, 766, 16 / 9),
      mobile: frame(189, 491, 570, 4 / 3),
    },
    chapters: ['Type @ in the composer', 'Choose your teammate', 'A human-only ping'],
    prepare: manualSession,
    async plan(studio) {
      const agentCount = await studio.page.locator('.agent-message').count()
      studio.at(0.1, async () => {
        studio.pan(0.1, 1.15, frame(181, 588, 560, 16 / 9), frame(181, 579, 475, 4 / 3))
        await studio.point(CHAT, 0.1, 0.95, { x: 0.18, y: 0.45 })
      })
      studio.type(CHAT, '@', 1.3, 1.4)
      studio.at(1.9, () => studio.point('#mention-jordan', 1.9, 0.8))
      studio.at(2.8, () => studio.click('#mention-jordan'))
      studio.at(2.95, () => studio.pan(2.95, 0.6, frame(181, 588, 560, 16 / 9), frame(185, 635, 400, 4 / 3)))
      studio.type(CHAT, 'want to explore a token bucket?', 3.2, 4.7, '@Jordan ')
      studio.at(4.75, async () => {
        await studio.point('.send-button', 4.75, 0.6)
        studio.pan(4.75, 0.6, frame(181, 531, 766, 16 / 9), frame(572, 647, 380, 4 / 3))
      })
      studio.at(5.4, () => studio.click('.send-button'))
      studio.at(5.9, async () => {
        const ping = await studio.textBox('.ping-message:last-child .message-body')
        studio.pan(5.9, 1.0, around(ping, 16 / 9, 32, 570), around(ping, 4 / 3, 25, 390))
        studio.cursor.move(5.9, 0.8, { x: 925, y: 960 })
      })
      studio.at(8, async () => {
        const ping = await studio.page.locator('.ping-message').last().textContent()
        if (!ping.includes('@Jordan') || !ping.includes('Not sent to Braid')) throw new Error('The mention must be delivered as a real human-only ping in the demo.')
        if (await studio.page.locator('.agent-message').count() !== agentCount) throw new Error('A teammate mention must not manufacture an agent response.')
      })
    },
  },
]
