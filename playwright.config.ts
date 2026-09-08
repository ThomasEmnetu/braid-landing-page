import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  // Real loop timing must not compete with other high-resolution video decoders.
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4181',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    {
      name: 'webkit',
      testMatch: /(?:ambient|landing|playback|scenes)\.spec\.ts$/,
      use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 1000 } },
    },
  ],
  webServer: {
    command: process.env.LANDING_PREVIEW === '1'
      ? 'npm run preview -- --port 4181'
      : 'npm run dev -- --port 4181',
    url: 'http://127.0.0.1:4181',
    reuseExistingServer: false,
  },
})
