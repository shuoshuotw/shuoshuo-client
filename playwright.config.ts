import { defineConfig, devices } from "@playwright/test";

const CORE = "http://localhost:3999";
// E2E_PORT moves the site under test off 5002 when a server someone is working with already has it
const SITE = `http://localhost:${process.env.E2E_PORT ?? "5002"}`;

export default defineConfig({
  testDir: "tests/e2e",
  snapshotPathTemplate: "tests/e2e/__baselines__/{arg}{ext}",
  // One server and one mock Core: the mock's draw order is shared state
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: "disabled" } },
  use: {
    baseURL: SITE,
    ...devices["Desktop Chrome"],
    ...(process.env.CI ? {} : { channel: "chrome" }),
  },
  webServer: [
    { command: "node tests/e2e/mock-core.mjs", url: `${CORE}/v1/quotes?limit=1`, reuseExistingServer: true },
    {
      // Needs a build with NEXT_PUBLIC_API_BASE_URL=http://localhost:3999 and NEXT_PUBLIC_MOTION_LOG=1
      command: `pnpm exec next start -p ${new URL(SITE).port}`,
      url: SITE,
      reuseExistingServer: true,
      env: { NEXT_PUBLIC_API_BASE_URL: CORE },
    },
  ],
});
