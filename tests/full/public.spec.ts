import { coreCall, coreToken, expect, newUser, quoteHeading, signIn, submitQuote, test, uniqueQuote } from "./helpers";

test("E2E-01: an anonymous visitor reads, draws, filters and shares", async ({ page }) => {
  // The desktop share sheet cannot be driven from a test; without it the button copies the link
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", { value: undefined });
  });
  await page.goto("/");
  const first = await quoteHeading(page).textContent();
  expect(first).toBeTruthy();

  await page.getByRole("button", { name: "換一句" }).click();
  await expect(quoteHeading(page).locator(".sr-only")).not.toHaveText(first!.slice(0, first!.length / 2), { timeout: 5000 });

  await page.getByRole("link", { name: /^留言/ }).click();
  await page.waitForURL(/\/q\//);
  await page.getByRole("button", { name: "分享連結" }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(page.url());
});

test("E2E-11: trending leads to a submitter's public page and their quotes", async ({ page }) => {
  const author = await newUser();
  const content = uniqueQuote("熱門");
  const created = await coreCall("/v1/quotes", { method: "POST", token: await coreToken(author), body: { content, category: "poetry", source_from: "全堆疊測試" } });
  expect(created.status).toBe(201);
  const { id } = created.body!.data as unknown as { id: string };
  expect((await coreCall(`/v1/quotes/${id}/like`, { method: "PUT", token: await coreToken(await newUser()) })).status).toBe(200);

  await page.goto("/trending");
  await expect(page.getByRole("heading", { level: 1, name: "近期熱門" })).toBeVisible();
  // Filtering fetches fresh, so this does not wait for the cached page to turn over
  await page.getByRole("button", { name: "詩詞" }).click();
  const row = page.locator(".quote-row-item", { hasText: content });
  await row.getByRole("link", { name: author.username }).click();
  await page.waitForURL(/\/u\//);
  await expect(page.getByRole("heading", { level: 1, name: author.username })).toBeVisible();
  await expect(page.getByRole("link", { name: content })).toBeVisible();
});

test("/quotes: filters by category and loads the next page", async ({ page }) => {
  await page.goto("/quotes");
  await expect(page.locator(".quote-row-item")).toHaveCount(20);
  await page.getByRole("button", { name: "載入更多" }).scrollIntoViewIfNeeded();
  await expect.poll(() => page.locator(".quote-row-item").count()).toBeGreaterThan(20);

  await page.getByRole("button", { name: "詩詞" }).click();
  await expect.poll(async () => new Set(await page.locator(".quote-row-meta span:nth-child(2)").allTextContents()).size).toBe(1);
  await expect(page.locator(".quote-row-meta span:nth-child(2)").first()).toHaveText("詩詞");
});

test("PV-05: unknown users are a 404 and a name with special characters round-trips", async ({ page, request }) => {
  expect((await request.get("/u/no-such-person-here")).status()).toBe(404);

  const user = await newUser();
  await signIn(page, user);
  await page.getByLabel("名稱").fill(`測試_中文-${user.id.slice(0, 6)}`);
  await page.getByRole("button", { name: "更新名稱" }).click();
  await expect(page.getByRole("heading", { level: 1, name: `測試_中文-${user.id.slice(0, 6)}` })).toBeVisible();
  // The public page opens in a new tab
  const [profile] = await Promise.all([page.context().waitForEvent("page"), page.getByRole("link", { name: "查看我的公開頁" }).click()]);
  await profile.waitForURL(/\/u\//);
  await expect(profile.getByRole("heading", { level: 1, name: `測試_中文-${user.id.slice(0, 6)}` })).toBeVisible();
});

test("CD-01: public pages are cacheable and carry no cookie, private ones are not", async ({ request }) => {
  for (const path of ["/", "/quotes", "/trending"]) {
    const response = await request.get(path);
    expect(response.headers()["cache-control"], path).toContain("s-maxage");
    expect(response.headers()["set-cookie"], path).toBeUndefined();
  }
  const { body } = await coreCall("/v1/quotes?limit=1");
  const id = (body!.data as unknown as { id: string }[])[0]!.id;
  const detail = await request.get(`/q/${id}`);
  await detail.text();
  // The first request renders it; the second is the cached copy
  const again = await request.get(`/q/${id}`);
  expect(again.headers()["cache-control"]).toContain("s-maxage");
  expect(again.headers()["set-cookie"]).toBeUndefined();

  for (const path of ["/me", "/submit", "/auth/callback"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.headers()["cache-control"], path).toContain("no-store");
  }
});

test("SEC-12: the callback never redirects off site", async ({ request }) => {
  for (const next of ["https://evil.example", "//evil.example", "/\\evil.example"]) {
    const response = await request.get(`/auth/callback?error=access_denied&next=${encodeURIComponent(next)}`, { maxRedirects: 0 });
    expect(new URL(response.headers().location!).host, next).toBe("localhost:5000");
  }
});

test("proxy: a private page sends an anonymous visitor to log in and back", async ({ page }) => {
  await page.goto("/me/api-keys");
  await page.waitForURL(/\/login\?next=/);
  expect(decodeURIComponent(page.url())).toContain("next=/me/api-keys");
  await expect(page.getByRole("button", { name: "使用 Google 登入" })).toBeVisible();
  await expect(page.getByRole("button", { name: "使用 Discord 登入" })).toBeVisible();
  await expect(page.getByRole("button", { name: "使用 GitHub 登入" })).toBeVisible();
});

test("AU-04: no WebAuthn hides Passkey and leaves the other three", async ({ page }) => {
  await page.addInitScript(() => {
    delete (window as { PublicKeyCredential?: unknown }).PublicKeyCredential;
  });
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "使用 GitHub 登入" })).toBeVisible();
  await expect(page.getByRole("button", { name: "使用 Passkey 登入" })).toHaveCount(0);
  await expect(page.getByText("這個瀏覽器不支援 Passkey")).toBeVisible();
});

test("E2E-08: the theme survives a reload with no flash, on cached pages too", async ({ page }) => {
  await page.goto("/quotes");
  const wasDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
  await page.getByRole("button", { name: /深色|淺色|主題/ }).click();
  await page.addInitScript(() => {
    // Records the class at the first paint opportunity, before any app script
    new MutationObserver((_, observer) => {
      if (document.body) {
        (window as { __firstTheme?: boolean }).__firstTheme = document.documentElement.classList.contains("dark");
        observer.disconnect();
      }
    }).observe(document, { childList: true, subtree: true });
  });
  await page.reload();
  expect(await page.evaluate(() => (window as { __firstTheme?: boolean }).__firstTheme)).toBe(!wasDark);
});

test("CD-03: a signed-in reader sees their own avatar and state on cached HTML", async ({ page }) => {
  const user = await newUser();
  await signIn(page, user);
  const { id } = await submitQuote(page);
  await page.getByRole("button", { name: /^按讚/ }).click();
  await expect(page.getByRole("button", { name: /^按讚/ })).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.getByRole("button", { name: /^按讚/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("link", { name: `${user.username} 的個人中心` })).toBeVisible();
  await expect(page.getByRole("link", { name: "登入", exact: true })).toHaveCount(0);

  const token = await coreToken(user);
  expect((await coreCall(`/v1/me/quote-states?ids=${id}`, { token })).status).toBe(200);
});
