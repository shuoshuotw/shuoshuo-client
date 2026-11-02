import { expect, test } from "@playwright/test";

const motionLog = (page: import("@playwright/test").Page) => page.evaluate(() => window.__motionLog ?? []);

test.describe("component states", () => {
  test("UI-02: QuoteSheet has its loading, empty, error and loaded states", async ({ page }) => {
    await page.goto("/dev/components");
    await expect(page.getByTestId("state-loading").locator(".skeleton-lines")).toBeVisible();
    await expect(page.getByTestId("state-empty")).toContainText("這個字盤是空的");
    await expect(page.getByTestId("state-error")).toContainText("說說沒有載入成功");
    await expect(page.getByTestId("state-loaded").getByTestId("quote-text")).toBeVisible();
  });

  test("MO-09: skeletons are the size of what they stand in for", async ({ page }) => {
    await page.goto("/dev/components");
    const sheets = await page.locator(".dev-grid .sheet-blank").evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().height));
    expect(new Set(sheets.map(Math.round)).size).toBe(1);
    const skeleton = await page.getByTestId("row-skeleton").locator(".quote-row-item").boundingBox();
    const row = await page.getByTestId("rows").locator(".quote-row-item").first().boundingBox();
    expect(Math.abs(skeleton!.height - row!.height)).toBeLessThanOrEqual(24);
  });

  test("M-09: rows stagger in and end visible", async ({ page }) => {
    await page.goto("/dev/components");
    await expect.poll(async () => (await motionLog(page)).some((entry) => entry.id === "M-09")).toBe(true);
    await expect.poll(() => page.getByTestId("rows").locator(".quote-row-item").last().evaluate((element) => getComputedStyle(element).opacity)).toBe("1");
  });

  test("M-08: the tick draws", async ({ page }) => {
    await page.goto("/dev/components");
    await page.getByRole("button", { name: "送出成功" }).click();
    await expect(page.getByRole("img", { name: "完成" })).toBeVisible();
    await expect.poll(async () => (await motionLog(page)).some((entry) => entry.id === "M-08")).toBe(true);
  });

  test("M-15: an error shakes the field once", async ({ page }) => {
    await page.goto("/dev/components");
    await page.getByRole("button", { name: "送出錯誤" }).click();
    await expect(page.locator(".dev-input")).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator(".dev-field")).not.toHaveClass(/field-shake/);
  });
});

test.describe("M-04: the morphing dialog", () => {
  test("MO-05: focus enters, Esc closes, and focus returns to the button", async ({ page }) => {
    await page.goto("/dev/components");
    const trigger = page.getByRole("button", { name: "開啟對話框" });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "提交這句說說" });
    await expect(dialog).toBeVisible();
    expect(await motionLog(page)).toContainEqual({ id: "M-04", variant: "full", phase: "start" });
    await expect(dialog.getByRole("button", { name: "關閉" })).toBeFocused();
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe("hidden");

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("MO-06: toggling mid-animation ends in a sane state", async ({ page }) => {
    await page.goto("/dev/components");
    const trigger = page.getByRole("button", { name: "開啟對話框" });
    const dialog = page.getByRole("dialog", { name: "提交這句說說" });
    await trigger.click();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await trigger.click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "關閉" }).click();
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeVisible();
    expect(await trigger.evaluate((element) => getComputedStyle(element).opacity)).toBe("1");
  });

  test("MO-04: reduced motion skips the morph and keeps the focus handling", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/dev/components");
    const trigger = page.getByRole("button", { name: "開啟對話框" });
    await trigger.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(await motionLog(page)).toContainEqual({ id: "M-04", variant: "reduced", phase: "start" });
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
  });
});
