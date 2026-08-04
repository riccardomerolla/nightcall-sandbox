import { defineConfig } from "@playwright/test"

const host = "127.0.0.1"
const port = 3100
const baseURL = `http://${host}:${port}`

export default defineConfig({
  testDir: "./test/browser",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    browserName: "chromium",
    colorScheme: "light",
    contextOptions: { reducedMotion: "reduce" },
    locale: "en-US",
    screenshot: "only-on-failure",
    trace: "retain-on-failure"
  },
  webServer: {
    command: `npm run dev -- --hostname ${host} --port ${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: baseURL
  },
  projects: [
    {
      name: "chromium-375",
      testMatch:
        /(accessibility|keyboard-navigation|mobile-navigation|route-groups)\.spec\.ts/,
      use: { viewport: { width: 375, height: 812 } }
    },
    {
      name: "chromium-768",
      testIgnore: /mobile-navigation\.spec\.ts/,
      use: { viewport: { width: 768, height: 900 } }
    },
    {
      name: "chromium-1440",
      testIgnore: /mobile-navigation\.spec\.ts/,
      use: { viewport: { width: 1440, height: 900 } }
    }
  ]
})
