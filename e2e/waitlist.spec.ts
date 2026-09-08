import { expect, test } from '@playwright/test'

test('both waitlist forms validate email and explicitly report that storage is disconnected', async ({ page }) => {
  await page.goto('/')
  for (const placement of ['Hero', 'Footer']) {
    const form = page.getByRole('form', { name: `${placement} waitlist` })
    const email = form.getByRole('textbox', { name: 'Email address', exact: true })
    const submit = form.getByRole('button', { name: 'Join the waitlist', exact: true })
    await form.scrollIntoViewIfNeeded()
    await expect(form).toContainText('Email signup is not connected yet.')
    for (const invalid of ['', 'not-an-email', 'engineer@', 'engineer@example', 'two@@example.com']) {
      await email.fill(invalid)
      await submit.click()
      await expect(email).toHaveAttribute('aria-invalid', 'true')
      await expect(email).toBeFocused()
      await expect(form.getByRole('status')).toContainText('Enter a valid email address')
    }
    await email.fill('engineer+team@example.com')
    await email.press('Enter')
    await expect(email).toHaveAttribute('aria-invalid', 'false')
    await expect(form.getByRole('status')).toContainText('not connected to signup storage yet')
    await expect(form.getByRole('status')).toContainText('has not been sent or saved')
    await email.fill('another@example.com')
    await expect(form.getByRole('status')).toBeEmpty()
  }
})

test('local preview never transmits, persists, or fabricates a successful signup', async ({ page }) => {
  const writes: string[] = []
  const leakedEmails: string[] = []
  page.on('request', (request) => {
    if (!['GET', 'HEAD'].includes(request.method())) writes.push(`${request.method()} ${request.url()}`)
    if (`${request.url()} ${request.postData() ?? ''}`.includes('example.com')) leakedEmails.push(request.url())
  })
  await page.goto('/')
  await expect(page.getByRole('form')).toHaveCount(2)
  for (const form of await page.getByRole('form').all()) {
    await form.getByRole('textbox', { name: 'Email address' }).fill('engineer@example.com')
    await form.getByRole('button', { name: 'Join the waitlist' }).click()
    await expect(form.getByRole('status')).toContainText('has not been sent or saved')
  }
  expect(writes).toEqual([])
  expect(leakedEmails).toEqual([])
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length, cookies: document.cookie }))).toEqual({ local: 0, session: 0, cookies: '' })
  await expect(page).not.toHaveURL(/email=/)
  await expect(page.locator('body')).not.toContainText("You're on the list")
  await expect(page.locator('body')).not.toContainText(/Join \d+ engineers/)
  await page.reload()
  for (const input of await page.getByRole('textbox', { name: 'Email address' }).all()) await expect(input).toHaveValue('')
})

test('waitlist feedback fits a narrow screen and each field has a unique accessible label', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 })
  await page.goto('/')
  await expect(page.getByRole('form')).toHaveCount(2)
  const ids: string[] = []
  for (const form of await page.getByRole('form').all()) {
    const input = form.getByLabel('Email address', { exact: true })
    ids.push((await input.getAttribute('id'))!)
    await input.fill('engineer@example.com')
    await input.press('Enter')
    await expect(form.getByRole('status')).toBeVisible()
    const bounds = await form.getByRole('status').boundingBox()
    expect(bounds!.x).toBeGreaterThanOrEqual(0)
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320)
  }
  expect(new Set(ids).size).toBe(2)
})
