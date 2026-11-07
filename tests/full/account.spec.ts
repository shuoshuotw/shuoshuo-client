import AxeBuilder from "@axe-core/playwright";
import { coreCall, coreToken, distinctCaller, expect, newUser, signIn, signOut, submitQuote, test, uniqueQuote } from "./helpers";

test("E2E-02: sign in, submit, the tick, the home page, then my submissions", async ({ page }) => {
  const user = await newUser();
  await signIn(page, user);

  await page.goto("/submit");
  const content = uniqueQuote();
  await page.getByLabel("說說", { exact: true }).fill(content);
  await expect(page.getByLabel("預覽").getByTestId("quote-text")).toContainText(content);
  await page.getByLabel("出處").fill("全堆疊測試");
  await page.getByRole("radio", { name: "原創" }).check({ force: true });
  await page.getByRole("button", { name: "送出" }).click();
  // M-08: the button turns into the tick where it was pressed, then the page goes home
  await expect(page.getByRole("button", { name: "已送出" })).toBeVisible();
  await page.waitForURL("/");
  await expect(page.getByText("說說已送出")).toBeVisible();

  await page.goto("/me/quotes");
  await expect(page.getByRole("link", { name: content })).toBeVisible();
});

test("M-15: a bad submission shakes, explains and takes focus", async ({ page }) => {
  await signIn(page, await newUser());
  await page.goto("/submit");
  await page.getByRole("button", { name: "送出" }).click();
  await expect(page.getByText("說說須為 2 至 100 字")).toBeVisible();
  await expect(page.getByText("請選一個類別")).toBeVisible();
  await expect(page.getByLabel("說說", { exact: true })).toBeFocused();
  await expect(page.locator(".field.field-shake").first()).toBeVisible();

  // Core's own wording reaches the field
  await page.getByLabel("說說", { exact: true }).fill("这是简体中文的句子");
  await page.getByLabel("出處").fill("全堆疊測試");
  await page.getByRole("radio", { name: "原創" }).check({ force: true });
  await page.getByRole("button", { name: "送出" }).click();
  await expect(page.getByText("僅接受繁體中文").last()).toBeVisible();
});

test("E2E-03: reactions survive a reload, appear in my lists and can be undone", async ({ page }) => {
  const author = await newUser();
  await signIn(page, author);
  const { id, content } = await submitQuote(page);
  await signOut(page);

  await signIn(page, await newUser());
  await page.goto(`/q/${id}`);
  await page.getByRole("button", { name: /^按讚/ }).click();
  await page.getByRole("button", { name: /^收藏/ }).click();
  await expect(page.getByRole("button", { name: /^按讚/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: /^收藏/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "按讚，目前 1 個" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: /^按讚/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: /^收藏/ })).toHaveAttribute("aria-pressed", "true");

  await page.goto("/me/likes");
  await expect(page.getByRole("link", { name: content })).toBeVisible();
  await page.goto("/me/favorites");
  await expect(page.getByRole("link", { name: content })).toBeVisible();
  // The card's own bookmark takes the favourite back; the list no longer has it once loaded again
  const taken = page.waitForResponse((response) => response.url().endsWith(`/v1/quotes/${id}/favorite`) && response.request().method() === "DELETE");
  await page.getByRole("button", { name: /^收藏/ }).click();
  await taken;
  await expect(page.getByRole("button", { name: /^收藏/ })).toHaveAttribute("aria-pressed", "false");
  await page.reload();
  await expect(page.getByRole("link", { name: content })).toHaveCount(0);
  await expect(page.getByText("你還沒有收藏任何說說")).toBeVisible();

  await page.goto(`/q/${id}`);
  await expect(page.getByRole("button", { name: /^按讚/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: /^收藏/ })).toHaveAttribute("aria-pressed", "false");
});

test("an anonymous reaction goes to log in and comes back", async ({ page }) => {
  const { body } = await coreCall("/v1/quotes?limit=1");
  const id = (body!.data as unknown as { id: string }[])[0]!.id;
  await page.goto(`/q/${id}`);
  await page.getByRole("button", { name: /^按讚/ }).click();
  await page.waitForURL(/\/login\?next=/);
  expect(decodeURIComponent(page.url())).toContain(`next=/q/${id}`);
});

test("E2E-04: comment, page, edit, pin, delete", async ({ page }) => {
  const author = await newUser();
  await signIn(page, author);
  const { id } = await submitQuote(page);
  const token = await coreToken(author);

  // 21 comments: one more than a page
  for (let index = 0; index < 21; index += 1) {
    const { status } = await coreCall(`/v1/quotes/${id}/comments`, { method: "POST", token, body: { content: `既有留言 ${index}` } });
    expect(status).toBe(201);
  }

  await page.reload();
  await expect(page.locator(".comment")).toHaveCount(20);
  await page.getByRole("button", { name: "載入更多" }).click();
  await expect(page.locator(".comment")).toHaveCount(21);

  await page.getByLabel("寫下你的留言").fill("第一則真正的留言");
  await page.getByRole("button", { name: "送出", exact: true }).click();
  const mine = page.locator(".comment", { hasText: "第一則真正的留言" });
  await expect(mine).toBeVisible();

  await mine.getByRole("button", { name: "編輯" }).click();
  const editor = page.locator(".comment", { has: page.getByLabel("編輯留言") });
  await editor.getByLabel("編輯留言").fill("改過的留言");
  await editor.getByRole("button", { name: "儲存" }).click();
  const edited = page.locator(".comment", { hasText: "改過的留言" });
  await expect(edited).toContainText("已編輯");

  await edited.getByRole("button", { name: "置頂", exact: true }).click();
  await expect(page.locator(".comment").first()).toContainText("改過的留言");
  await expect(page.locator(".comment").first()).toContainText("已置頂");

  await page.locator(".comment").first().getByRole("button", { name: "取消置頂" }).click();
  await expect(page.locator(".comment[data-pinned]")).toHaveCount(0);

  await edited.getByRole("button", { name: "刪除" }).click();
  await page.getByRole("dialog", { name: "刪除這則留言？" }).getByRole("button", { name: "確定刪除" }).click();
  await expect(page.locator(".comment", { hasText: "改過的留言" })).toHaveCount(0);
});

test("E2E-12: edit marks the quote, a rename follows it, and deletion keeps the name", async ({ page }) => {
  test.setTimeout(150_000);
  const user = await newUser();
  await signIn(page, user);
  const { id, content } = await submitQuote(page);

  await page.getByRole("button", { name: "編輯" }).click();
  const dialog = page.getByRole("dialog", { name: "編輯說說" });
  await dialog.getByLabel("說說", { exact: true }).fill(`${content}啊`);
  await dialog.getByRole("button", { name: "儲存" }).click();
  await expect(page.getByText("已編輯")).toBeVisible();

  const renamed = `新名字${user.id.slice(0, 6)}`;
  await page.goto("/me");
  await page.getByLabel("名稱").fill(renamed);
  await page.getByRole("button", { name: "更新名稱" }).click();
  await expect(page.getByText("名稱已更新")).toBeVisible();

  await page.goto(`/q/${id}`);
  await expect(page.getByRole("link", { name: renamed, exact: true })).toBeVisible();

  await page.goto("/me/security");
  await page.getByRole("button", { name: "刪除帳號" }).click();
  const deletion = page.getByRole("dialog", { name: "刪除帳號" });
  await deletion.getByRole("textbox").fill("打錯的名字");
  await deletion.getByRole("button", { name: "永久刪除" }).click();
  await expect(deletion.getByText("名稱不符")).toBeVisible();
  await deletion.getByRole("textbox").fill(renamed);
  await deletion.getByRole("button", { name: "永久刪除" }).click();
  await page.waitForURL("/");

  const { body } = await coreCall(`/v1/quotes/${id}`);
  const quote = body!.data as unknown as { content: string; submitter: { username: string; deleted: boolean } };
  expect(quote).toMatchObject({ content: `${content}啊`, submitter: { username: renamed, deleted: true } });

  // The detail page may be cached for a minute, but it must end up with no link
  await expect(async () => {
    await page.goto(`/q/${id}`);
    await expect(page.getByText(`${renamed}（已刪除）`)).toBeVisible({ timeout: 1000 });
    await expect(page.getByRole("link", { name: renamed, exact: true })).toHaveCount(0);
  }).toPass({ timeout: 90_000, intervals: [5000] });
});

test("E2E-13: a closed list says so on the public page and the API refuses it", async ({ page }) => {
  test.setTimeout(150_000);
  const owner = await newUser();
  const other = await newUser();
  await signIn(page, owner);
  await page.getByRole("button", { name: /我的收藏/ }).click();
  await page.getByRole("option", { name: "私人" }).click();
  await expect(page.getByText("設定已更新")).toBeVisible();

  const { status, body } = await coreCall(`/v1/users/${encodeURIComponent(owner.username)}/favorites`, { token: await coreToken(other) });
  expect(status).toBe(403);
  expect(body!.error!.code).toBe("USER_FAVORITES_PRIVATE");

  // Up to a minute of ISR here, up to five on the CDN (PV-03). The owner still sees the list itself
  await expect(async () => {
    await page.goto(`/u/${encodeURIComponent(owner.username)}/favorites`);
    await expect(page.getByText("你還沒有收藏任何說說")).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 90_000, intervals: [5000] });
  // Anyone else is told it is private
  await signOut(page);
  await page.goto(`/u/${encodeURIComponent(owner.username)}/favorites`);
  await expect(page.getByText("此清單已設為私人")).toBeVisible();
});

test("USERNAME_TAKEN lands on the field", async ({ page }) => {
  const taken = await newUser();
  await signIn(page, await newUser());
  await page.getByLabel("名稱").fill(taken.username);
  await page.getByRole("button", { name: "更新名稱" }).click();
  await expect(page.getByText("此名稱已被使用")).toBeVisible();
  await expect(page.getByLabel("名稱")).toBeFocused();
});

test("AU-05: the last OAuth identity cannot be unlinked; two can", async ({ page }) => {
  await signIn(page, await newUser());
  const identity = (provider: string) => ({ id: provider, user_id: "u", identity_id: provider, provider, identity_data: { email: `${provider}@example.com` }, last_sign_in_at: "", created_at: "", updated_at: "" });
  let identities = [identity("google")];
  await page.route("**/auth/v1/user", async (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    const response = await route.fetch();
    const body = await response.json();
    await route.fulfill({ response, json: { ...body, identities } });
  });

  await page.goto("/me/security");
  const google = page.locator(".plain-list li", { hasText: "Google" });
  await expect(google).toContainText("已綁定");
  await expect(google.getByRole("button", { name: "解除綁定" })).toHaveCount(0);
  await expect(google).toContainText("至少需保留一種登入方式");

  identities = [identity("google"), identity("github")];
  await page.reload();
  await expect(page.locator(".plain-list li", { hasText: "Google" }).getByRole("button", { name: "解除綁定" })).toBeVisible();
});

test("AU-06: a taken identity is explained in Chinese", async ({ page }) => {
  await signIn(page, await newUser());
  await page.goto("/me/security?error=identity_already_exists");
  await expect(page.getByText("這個身分已綁定到另一個帳號")).toBeVisible();
});

test("AU-07: sign out here, then everywhere, each after a yes", async ({ browser }) => {
  const user = await newUser();
  const firstContext = await browser.newContext();
  const secondContext = await browser.newContext();
  await distinctCaller(firstContext);
  await distinctCaller(secondContext);
  const first = await firstContext.newPage();
  const second = await secondContext.newPage();
  await signIn(first, user);
  await signIn(second, user);

  // This device, from 我的帳號
  await signOut(first);
  await first.goto("/me");
  await first.waitForURL(/\/login/);

  // Everywhere, from the danger zone of the security page
  await second.goto("/me/security");
  await second.getByRole("button", { name: "登出所有裝置" }).click();
  await second.getByRole("dialog", { name: "登出所有裝置" }).getByRole("button", { name: "全部登出" }).click();
  await second.waitForURL("/");
  await second.goto("/me");
  await second.waitForURL(/\/login/);
});

test("AU-02: a passkey registers and signs back in", async ({ page, context }) => {
  const client = await context.newCDPSession(page);
  await client.send("WebAuthn.enable");
  await client.send("WebAuthn.addVirtualAuthenticator", {
    options: { protocol: "ctap2", transport: "internal", hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true },
  });
  const user = await newUser();
  await signIn(page, user);

  await page.goto("/me/security");
  await expect(page.getByText("還沒有 Passkey")).toBeVisible();
  await page.getByRole("button", { name: "新增 Passkey" }).click();
  await expect(page.getByRole("button", { name: "刪除", exact: true }).first()).toBeVisible();

  await signOut(page);

  await page.goto("/login?next=/me/quotes");
  await page.getByRole("button", { name: "使用 Passkey 登入" }).click();
  await page.waitForURL("**/me/quotes");
  await expect(page.getByRole("link", { name: `${user.username} 的個人中心` })).toBeVisible();
});

test("AU-03: no passkey yet explains that OAuth comes first", async ({ page, context }) => {
  const client = await context.newCDPSession(page);
  await client.send("WebAuthn.enable");
  await client.send("WebAuthn.addVirtualAuthenticator", {
    options: { protocol: "ctap2", transport: "internal", hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true },
  });
  await page.goto("/login");
  await page.getByRole("button", { name: "使用 Passkey 登入" }).click();
  await expect(page.getByText("PassKey 登入失敗")).toBeVisible();
});

test("UI-05: the signed-in pages pass axe", async ({ page }) => {
  const user = await newUser();
  await signIn(page, user);
  const { id } = await submitQuote(page);
  let requests = 0;
  page.on("request", () => (requests += 1));
  for (const path of ["/me", "/me/quotes", "/me/favorites", "/me/likes", "/me/api-keys", "/me/security", "/submit", `/q/${id}`, `/u/${encodeURIComponent(user.username)}`, "/quotes", "/trending", "/login"]) {
    requests = 0;
    await page.goto(path);
    // Rows are mid-stagger for half a second, and axe measures contrast through their opacity
    await page.waitForTimeout(1500);
    const settled = requests;
    await page.waitForTimeout(1000);
    expect(requests - settled, `${path} keeps requesting`).toBeLessThan(5);
    const { violations } = await new AxeBuilder({ page }).analyze();
    const serious = violations.filter(({ impact }) => impact === "critical" || impact === "serious");
    expect(serious.map(({ id: rule, nodes }) => `${path} ${rule}: ${nodes[0]?.html}`)).toEqual([]);
  }
});
