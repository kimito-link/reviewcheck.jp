import { defineConfig, devices } from "@playwright/test";

const port = 3456;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  timeout: 60_000,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "off",
  },
  // next dev は eval を使う。このアプリの CSP はそれを止めるので、本番起動で見る。
  webServer: {
    command: `pnpm exec next start -p ${port}`,
    url: `http://127.0.0.1:${port}/check/`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      SITE_CHECK_MOCK: "1",
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
