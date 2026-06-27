import { defineConfig, devices } from "@playwright/test";

/**
 * Default baseURL points at the local dev server. Override per run with
 * PLAYWRIGHT_BASE_URL to hit a Vercel preview, e.g.
 *   PLAYWRIGHT_BASE_URL=https://traverse-pakistan-xxx.vercel.app npx playwright test
 *
 * The webServer block only fires when no override is set — that way CI / preview
 * runs don't try to spin up a local Next server.
 */
const localBaseURL = "http://localhost:3000";
const baseURL = process.env.PLAYWRIGHT_BASE_URL || localBaseURL;
const useLocal = baseURL === localBaseURL;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: useLocal
    ? {
        command: "npm run dev",
        url: localBaseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      }
    : undefined,
});
