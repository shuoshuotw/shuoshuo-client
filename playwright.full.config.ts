import { defineConfig, devices } from "@playwright/test";

// TEST_PLAN §8: the real stack. Needs `supabase start`, Core on port 5001 and a build from scripts/build-full.sh.
// E2E_PORT moves the site under test off 5002 (and CORE_URL, in helpers.ts, the Core it talks to off 5001) when a server
// someone is working with already has the port; the build must then be made for the same two addresses
const SITE = `http://localhost:${process.env.E2E_PORT ?? "5002"}`;

export default defineConfig({
  testDir: "tests/full",
  snapshotPathTemplate: "tests/full/__baselines__/{arg}{ext}",
  workers: 1,
  timeout: 45_000,
  retries: process.env.CI ? 1 : 0,
  // A line per test: the CI default (dots, no newline) showed nothing in GitHub's log until the job was cancelled
  reporter: "list",
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: "disabled" } },
  use: {
    baseURL: SITE,
    ...devices["Desktop Chrome"],
    ...(process.env.CI ? {} : { channel: "chrome" }),
    permissions: ["clipboard-read", "clipboard-write"],
  },
  webServer: {
    command: `pnpm exec next start -p ${new URL(SITE).port}`,
    url: SITE,
    reuseExistingServer: true,
  },
});
