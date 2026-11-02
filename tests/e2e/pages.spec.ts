import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { signInToMock } from "./session";

const QUOTE_ID = "00000000-0000-4000-8000-000000000001";

const LENGTHS = { 2: "你好", 20: "我們仍未知道那天所看見的花的名字我們仍未", 60: "把今天寫下來，".repeat(9).slice(0, 60), 100: "把明天寫下來，今天就有了往前走一步的理由。".repeat(5).slice(0, 100) };

async function noSidewaysScroll(page: Page) {
  const { scroll, client } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(scroll).toBeLessThanOrEqual(client);
}

async function rowsSettled(page: Page) {
  await expect.poll(() => page.locator(".rows > *").first().evaluate((row) => getComputedStyle(row).opacity)).toBe("1");
}

test.describe("list pages", () => {
  test("/quotes: empty, failed and retried", async ({ page }) => {
    await page.goto("/quotes");
    await expect(page.locator(".quote-row-item")).toHaveCount(8);

    // UI-02: a category nothing has been filed under
    await page.route("**/v1/quotes?*categories=manga*", (route) =>
      route.fulfill({ headers: { "access-control-allow-origin": "*" }, json: { data: [], meta: { request_id: "r", pagination: { limit: 20, next_cursor: null, has_more: false } } } }),
    );
    await page.getByRole("button", { name: "漫畫" }).click();
    await expect(page.getByText("此類別還沒有說說")).toBeVisible();
    await expect(page.getByRole("link", { name: "提交第一句" })).toHaveAttribute("href", "/submit");

    await page.route("**/v1/quotes?*categories=*", (route) => route.abort());
    await page.getByRole("button", { name: "動畫" }).click();
    await expect(page.getByText("列表沒有載入成功")).toBeVisible();

    await page.unroute("**/v1/quotes?*categories=*");
    await page.unroute("**/v1/quotes?*categories=manga*");
    await page.getByRole("button", { name: "重試" }).click();
    await expect(page.locator(".quote-row-item").first()).toBeVisible();
  });

  test("MO-05: rows come in with M-09 and end up fully shown", async ({ page }) => {
    await page.goto("/trending");
    await expect.poll(() => page.evaluate(() => (window.__motionLog ?? []).some((entry) => entry.id === "M-09"))).toBe(true);
    await rowsSettled(page);
    await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains("pick-pending"))).toBe(false);
  });

  test("UI-10: list and detail quotes are set in ChenYuLuoYan", async ({ page }) => {
    for (const path of ["/quotes", `/q/${QUOTE_ID}`]) {
      await page.goto(path);
      const family = await page.locator(".quote").first().evaluate((quote) => getComputedStyle(quote).fontFamily);
      expect(family, path).toContain("ChenYuLuoYan");
    }
  });

  for (const width of [320, 390, 768, 1440]) {
    test(`UI-03: every length fits on the list and the detail page at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      for (const content of Object.values(LENGTHS)) {
        const quote = { id: QUOTE_ID, content, length: content.length, category: { key: "anime", name: "動畫" }, source_from: "來源", submitter: { id: "u", username: "小明", deleted: false }, stats: { like_count: 0, favorite_count: 0, comment_count: 0 }, status: "published", commit_from: "web", edited_at: null, created_at: "2026-10-20T00:00:00.000Z" };
        const answer = { headers: { "access-control-allow-origin": "*" }, json: { data: [quote], meta: { request_id: "r", pagination: { limit: 20, next_cursor: null, has_more: false } } } };
        await page.route("**/v1/quotes?*", (route) => route.fulfill(answer));
        await page.goto("/quotes");
        await page.getByRole("button", { name: "動畫" }).click();
        await expect(page.locator(".quote-row").first()).toHaveText(content);
        await noSidewaysScroll(page);
        await page.unroute("**/v1/quotes?*");

        await page.route(`**/v1/quotes/${QUOTE_ID}`, (route) => route.fulfill({ headers: { "access-control-allow-origin": "*" }, json: { data: quote, meta: { request_id: "r" } } }));
        await signInToMock(page.context());
        await page.goto(`/q/${QUOTE_ID}`);
        await expect(page.getByTestId("quote-text").locator(".sr-only")).toHaveText(content);
        await noSidewaysScroll(page);
        await page.unroute(`**/v1/quotes/${QUOTE_ID}`);
        await page.context().clearCookies();
      }
    });
  }
});

test.describe("detail page", () => {
  test("shows meta, a pinned comment first, and links to the submitter", async ({ page }) => {
    await page.goto(`/q/${QUOTE_ID}`);
    await expect(page.getByRole("link", { name: "小明" }).first()).toHaveAttribute("href", `/u/${encodeURIComponent("小明")}`);
    const first = page.locator(".comment").first();
    await expect(first).toContainText("已置頂");
    await expect(page.locator(".comment").nth(1)).toContainText("已編輯");
    await expect(page.getByRole("link", { name: "登入", exact: true }).last()).toBeVisible();
  });

  test("404, and a 410 tombstone with the reason but no details", async ({ page, request }) => {
    expect((await request.get("/q/00000000-0000-4000-8000-00000000eeee")).status()).toBe(404);
    await page.goto("/q/00000000-0000-4000-8000-00000000ff10");
    await expect(page.getByRole("heading", { level: 1, name: "這則說說已移除" })).toBeVisible();
    await expect(page.getByText("原因類別：垃圾內容")).toBeVisible();
  });

  test("under review shows a banner; a deleted submitter has no link", async ({ page }) => {
    await page.route(`**/v1/quotes/${QUOTE_ID}`, (route) =>
      route.fulfill({
        headers: { "access-control-allow-origin": "*" },
        json: {
          data: { id: QUOTE_ID, content: "審核中的一句", length: 6, category: { key: "anime", name: "動畫" }, source_from: "來源", submitter: { id: "x", username: "小明", deleted: true }, stats: { like_count: 0, favorite_count: 0, comment_count: 0 }, status: "under_review", commit_from: "api", edited_at: "2026-10-21T00:00:00.000Z", created_at: "2026-10-20T00:00:00.000Z" },
          meta: { request_id: "r" },
        },
      }),
    );
    await signInToMock(page.context());
    await page.goto(`/q/${QUOTE_ID}`);
    await expect(page.getByRole("status")).toContainText("正在審核中");
    await expect(page.locator(".detail-meta")).toContainText("小明（已刪除）");
    await expect(page.locator(".detail-meta a")).toHaveCount(0);
    await expect(page.locator(".detail-meta")).toContainText("已編輯");
  });

  test("M-24: a dialog on a phone sits at the bottom of the screen", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signInToMock(page.context());
    await page.goto("/me/api-keys");
    await page.getByRole("button", { name: "建立 API Key" }).click();
    const dialog = page.getByRole("dialog", { name: "建立 API Key" });
    await expect(dialog).toBeVisible();
    await expect.poll(async () => (await dialog.boundingBox())!.y + (await dialog.boundingBox())!.height).toBeCloseTo(844, -1);
  });
});

test.describe("UI-05: axe", () => {
  for (const colorScheme of ["light", "dark"] as const) {
    test(`public and private pages have no serious findings, ${colorScheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
      await signInToMock(page.context());
      for (const path of ["/quotes", "/trending", `/q/${QUOTE_ID}`, "/submit", "/me", "/me/api-keys", "/me/security", "/login"]) {
        await page.goto(path);
        await page.waitForTimeout(400);
        const { violations } = await new AxeBuilder({ page }).analyze();
        const serious = violations.filter(({ impact }) => impact === "critical" || impact === "serious");
        expect(serious.map(({ id, nodes }) => `${path} ${id}: ${nodes[0]?.html}`)).toEqual([]);
      }
    });
  }
});

test.describe("UI-01: visual baselines", () => {
  test.skip(process.platform !== "linux", "Baselines are rendered in the Playwright Linux image only");

  const PAGES = { detail: `/q/${QUOTE_ID}`, submit: "/submit", keys: "/me/api-keys", security: "/me/security", cases: "/admin/cases", case: "/admin/cases/00000000-0000-4000-d000-000000000001" };

  for (const [name, path] of Object.entries(PAGES)) {
    for (const colorScheme of ["light", "dark"] as const) {
      for (const width of [390, 768, 1440]) {
        test(`visual baselines: ${name}, ${colorScheme}, ${width}px`, async ({ page }) => {
          await page.setViewportSize({ width, height: 900 });
          await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
          await signInToMock(page.context());
          await page.goto(path);
          await page.evaluate(() => document.fonts.ready);
          await expect(page.locator(".skeleton-lines")).toHaveCount(0);
          await expect(page).toHaveScreenshot(`${name}-${colorScheme}-${width}.png`);
        });
      }
    }
  }
});
