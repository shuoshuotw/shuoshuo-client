import { defineConfig, devices } from "@playwright/test";

// TEST_PLAN §8: the real stack. Needs `supabase start`, Core on port 3001 and a build from scripts/build-full.sh.
export default defineConfig({
  testDir: "tests/full",
  snapshotPathTemplate: "tests/full/__baselines__/{arg}{ext}",
  workers: 1,
  timeout: 45_000,
  retries: process.env.CI ? 1 : 0,
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: "disabled" } },
  use: {
    baseURL: "http://localhost:3000",
    ...devices["Desktop Chrome"],
    ...(process.env.CI ? {} : { channel: "chrome" }),
    permissions: ["clipboard-read", "clipboard-write"],
  },
  webServer: {
    command: "pnpm start",
    url: "http://localhost:3000",
    reuseExistingServer: true,
  },
});
