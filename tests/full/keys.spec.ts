import { expect, type Page, test } from "@playwright/test";
import { CORE, coreCall, coreToken, newUser, signIn } from "./helpers";

async function createKey(page: Page, name: string) {
  await page.getByRole("button", { name: "建立 API Key" }).click();
  const dialog = page.getByRole("dialog", { name: "建立 API Key" });
  await dialog.getByLabel("名稱").fill(name);
  await dialog.getByRole("button", { name: "建立", exact: true }).click();
  const secret = page.getByTestId("api-key-secret");
  await expect(secret).toBeVisible();
  return (await secret.textContent())!;
}

const withKey = (key: string) => fetch(`${CORE}/v1/quotes?limit=1`, { headers: { Authorization: `Bearer ${key}` } });

test("E2E-05: a key shows once, works, and stops working when deleted", async ({ page }) => {
  await signIn(page, await newUser());
  await page.goto("/me/api-keys");
  await expect(page.getByText("還沒有 API Key")).toBeVisible();

  const secret = await createKey(page, "我的部落格");
  await expect(page.getByRole("img", { name: "完成" })).toBeVisible();
  await page.getByRole("button", { name: "複製金鑰" }).click();
  await expect(page.getByRole("button", { name: "已複製" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(secret);
  expect((await withKey(secret)).status).toBe(200);

  // Only once
  await page.reload();
  await expect(page.getByRole("cell", { name: "我的部落格" })).toBeVisible();
  await expect(page.getByTestId("api-key-secret")).toHaveCount(0);
  expect(await page.content()).not.toContain(secret);

  await page.getByRole("button", { name: "刪除" }).click();
  await page.getByRole("dialog", { name: "刪除「我的部落格」" }).getByRole("button", { name: "確定刪除" }).click();
  await expect(page.getByText("還沒有 API Key")).toBeVisible();

  // Core caches resolved keys for up to 15 seconds (§7.5)
  await expect.poll(async () => (await withKey(secret)).status, { timeout: 30_000, intervals: [2000] }).toBe(401);
});

test("E2E-06: regenerating retires the old key and hands over a new one", async ({ page }) => {
  await signIn(page, await newUser());
  await page.goto("/me/api-keys");
  const old = await createKey(page, "要換的");
  await page.getByRole("button", { name: "我已存好" }).click();

  await page.getByRole("button", { name: "重新產生" }).click();
  await page.getByRole("dialog", { name: "重新產生「要換的」" }).getByRole("button", { name: "重新產生" }).click();
  const secret = page.getByTestId("api-key-secret");
  await expect(secret).toBeVisible();
  const fresh = (await secret.textContent())!;
  expect(fresh).not.toBe(old);

  expect((await withKey(fresh)).status).toBe(200);
  await expect.poll(async () => (await withKey(old)).status, { timeout: 30_000, intervals: [2000] }).toBe(401);
});

test("E2E-07: the 11th key is refused with the reason", async ({ page }) => {
  const user = await newUser();
  await signIn(page, user);
  const token = await coreToken(user);
  for (let index = 0; index < 10; index += 1) {
    const { status } = await coreCall("/v1/me/api-keys", { method: "POST", token, body: { name: `第${index}組` } });
    expect(status).toBe(201);
  }

  await page.goto("/me/api-keys");
  await expect(page.getByRole("row")).toHaveCount(11);
  await page.getByRole("button", { name: "建立 API Key" }).click();
  const dialog = page.getByRole("dialog", { name: "建立 API Key" });
  await dialog.getByLabel("名稱").fill("第十一組");
  await dialog.getByRole("button", { name: "建立", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("上限");
});

test("REAUTH_REQUIRED sends the person to verify again", async ({ page }) => {
  await signIn(page, await newUser());
  await page.goto("/me/api-keys");
  await page.route("**/v1/me/api-keys", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({
          status: 403,
          headers: { "access-control-allow-origin": "*" },
          json: { error: { code: "REAUTH_REQUIRED", status: 403, message: "重新驗證身分後再試", request_id: "req" } },
        })
      : route.fallback(),
  );
  await page.getByRole("button", { name: "建立 API Key" }).click();
  const dialog = page.getByRole("dialog", { name: "建立 API Key" });
  await dialog.getByLabel("名稱").fill("要重新驗證");
  await dialog.getByRole("button", { name: "建立", exact: true }).click();
  await page.getByRole("link", { name: "重新驗證" }).click();
  await page.waitForURL(/\/login\?reauth=1/);
  await expect(page.getByRole("heading", { level: 1, name: "重新驗證身分" })).toBeVisible();
});

test("UI-06: a key can be created with the keyboard alone", async ({ page }) => {
  await signIn(page, await newUser());
  await page.goto("/me/api-keys");
  await page.getByRole("button", { name: "建立 API Key" }).focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "建立 API Key" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("名稱")).toBeFocused();
  await page.keyboard.type("鍵盤建立");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("api-key-secret")).toBeVisible();
  // Focus lands on the secret, the one thing that matters now
  await expect(page.getByRole("region", { name: "「鍵盤建立」的金鑰" })).toBeFocused();
});
