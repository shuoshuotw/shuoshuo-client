import AxeBuilder from "@axe-core/playwright";
import { ageAccount, coreCall, coreToken, distinctCaller, expect, makeAdmin, newUser, signIn, signOut, submitQuote, test, uniqueQuote } from "./helpers";

async function reportedQuote() {
  const author = await newUser();
  const reporter = await newUser();
  await ageAccount(reporter);
  const content = uniqueQuote("違規");
  const created = await coreCall("/v1/quotes", { method: "POST", token: await coreToken(author), body: { content, category: "other", source_from: "治理測試" } });
  expect(created.status).toBe(201);
  const { id } = created.body!.data as unknown as { id: string };
  const reported = await coreCall(`/v1/quotes/${id}/reports`, { method: "POST", token: await coreToken(reporter), body: { reason: "spam", detail: "一直重複貼" } });
  expect(reported.status).toBe(201);
  return { author, reporter, content, id };
}

async function newModerator() {
  const moderator = await newUser();
  await makeAdmin(moderator);
  return moderator;
}

test("E2E-10: the queue, a decision, and straight on to the next case", async ({ page }) => {
  const first = await reportedQuote();
  const second = await reportedQuote();
  await signIn(page, await newModerator());

  await page.goto("/admin/cases");
  await expect(page.getByRole("heading", { level: 1, name: "審核佇列" })).toBeVisible();
  const firstRow = page.getByRole("link", { name: first.content });
  await expect(firstRow).toBeVisible();
  await expect(page.getByRole("link", { name: second.content })).toBeVisible();
  await page.getByRole("button", { name: /留言$/ }).click();
  await expect(firstRow).toHaveCount(0);
  await page.getByRole("button", { name: /全部$/ }).click();

  await firstRow.click();
  await page.waitForURL(/\/admin\/cases\/[0-9a-f-]{36}$/);
  const firstCase = page.url();
  await expect(page.getByText(first.content, { exact: true }).first()).toBeVisible();
  await expect(page.getByText("一直重複貼")).toBeVisible();

  await page.getByLabel(/^確認違規/).check();
  await page.getByLabel("違規原因").selectOption("spam");
  await page.getByLabel("內部備註").fill("明顯灌水");
  await page.getByRole("button", { name: "確認違規" }).click();

  // Goes on to another open case
  await expect.poll(() => page.url()).not.toBe(firstCase);

  const { status, body } = await coreCall(`/v1/quotes/${first.id}`);
  expect(status).toBe(410);
  expect(body!.error!.code).toBe("QUOTE_REMOVED");

  // The removed quote's page is a tombstone, once the cached copy turns over
  await expect(async () => {
    await page.goto(`/q/${first.id}`);
    await expect(page.getByRole("heading", { level: 1, name: "這則說說已移除" })).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 90_000, intervals: [5000] });
  await expect(page.getByText("原因類別：垃圾內容")).toBeVisible();
});

test("a case already decided elsewhere says so and offers the next", async ({ page }) => {
  const { id } = await reportedQuote();
  const moderator = await newModerator();
  await signIn(page, moderator);
  const token = await coreToken(moderator);
  const { body } = await coreCall(`/v1/admin/cases?limit=50`, { token });
  const found = (body!.data as unknown as { id: string; target_id: string }[]).find(({ target_id }) => target_id === id)!;

  await page.goto(`/admin/cases/${found.id}`);
  await expect(page.getByRole("button", { name: "駁回案件" })).toBeVisible();
  expect((await coreCall(`/v1/admin/cases/${found.id}/resolve`, { method: "POST", token, body: { resolution: "dismiss" } })).status).toBe(200);

  await page.getByRole("button", { name: "駁回案件" }).click();
  await expect(page.locator(".form-error")).toContainText("此案件已處理");
  await expect(page.getByRole("button", { name: "前往下一件" })).toBeVisible();
});

test("someone who is not an admin sees no back office", async ({ page }) => {
  await signIn(page, await newUser());
  await page.goto("/admin/cases");
  await expect(page.getByText("這裡只有管理員能進來")).toBeVisible();
  await expect(page.getByRole("link", { name: "管理後台" })).toHaveCount(0);
});

test("the whole way: uphold, barred from submitting, notice, appeal, accepted", async ({ browser }) => {
  test.setTimeout(120_000);
  const offender = await browser.newContext();
  const moderator = await browser.newContext();
  await distinctCaller(offender);
  await distinctCaller(moderator);
  const offenderPage = await offender.newPage();
  const moderatorPage = await moderator.newPage();

  const { author, content, id } = await reportedQuote();
  await signIn(offenderPage, author);
  await offenderPage.goto("/me/standing");
  await expect(offenderPage.getByText("目前沒有任何違規紀錄")).toBeVisible();

  await signIn(moderatorPage, await newModerator());
  await moderatorPage.goto("/admin/cases");
  await moderatorPage.getByRole("link", { name: content }).click();
  await moderatorPage.getByLabel(/^確認違規/).check();
  await moderatorPage.getByRole("button", { name: "確認違規" }).click();
  await expect.poll(async () => (await coreCall(`/v1/quotes/${id}`)).status).toBe(410);

  // The notice on /me, and the reason it leads to
  await offenderPage.goto("/me");
  await expect(offenderPage.getByRole("status")).toContainText("1 筆處分通知");
  await expect(offenderPage.getByText(/暫停提交至/)).toBeVisible();
  await offenderPage.getByRole("link", { name: "查看內容與申訴" }).click();
  await offenderPage.waitForURL("**/me/standing");
  await expect(offenderPage.getByText("確認違規（第 1 次）")).toBeVisible();

  // §12.7: submitting is replaced with the reason and the way to appeal
  await offenderPage.goto("/submit");
  await expect(offenderPage.getByRole("heading", { level: 1, name: "目前無法提交" })).toBeVisible();
  await expect(offenderPage.getByRole("link", { name: "查看原因與申訴" })).toBeVisible();

  await offenderPage.goto("/me/standing");
  await offenderPage.getByRole("button", { name: "提出申訴" }).click();
  const dialog = offenderPage.getByRole("dialog", { name: "提出申訴" });
  await dialog.getByLabel("申訴內容").fill("太短");
  await dialog.getByRole("button", { name: "送出申訴" }).click();
  await expect(dialog.getByText("申訴內容須為 20 至 1000 字")).toBeVisible();
  await dialog.getByLabel("申訴內容").fill("這句是我自己寫的，並沒有重複張貼，請協助重新審視這次的判斷。");
  await dialog.getByRole("button", { name: "送出申訴" }).click();
  await expect(offenderPage.getByRole("button", { name: "提出申訴" })).toHaveCount(0);
  await expect(offenderPage.getByText("審理中").first()).toBeVisible();

  await moderatorPage.goto("/admin/appeals");
  const card = moderatorPage.locator(".appeal-card", { hasText: "並沒有重複張貼" });
  await card.getByRole("button", { name: "接受申訴" }).click();
  await expect(card.getByText("請寫下給申訴者的說明")).toBeVisible();
  await card.getByLabel("給申訴者的說明").fill("確認判斷有誤，已恢復。");
  await card.getByRole("button", { name: "接受申訴" }).click();
  await expect(card).toHaveCount(0);

  await offenderPage.reload();
  await expect(offenderPage.getByText("已接受").first()).toBeVisible();
  await expect(offenderPage.getByText("管理員說明：確認判斷有誤，已恢復。")).toBeVisible();
  await expect(offenderPage.getByText("狀態正常")).toBeVisible();

  const restored = await coreCall(`/v1/quotes/${id}`);
  expect(restored.status).toBe(200);
  await submitQuote(offenderPage);
});

test("a manual ban and its lift, from the user page", async ({ page }) => {
  const target = await newUser();
  await signIn(page, await newModerator());
  await page.goto(`/admin/users/${target.id}`);
  await expect(page.getByRole("heading", { level: 1, name: target.username })).toBeVisible();

  await page.getByRole("button", { name: "手動處分" }).click();
  const dialog = page.getByRole("dialog", { name: `處分 ${target.username}` });
  await dialog.getByLabel("種類").selectOption("account_ban");
  await dialog.getByLabel("原因").fill("手動停權測試");
  await dialog.getByRole("button", { name: "建立處分" }).click();
  await expect(page.getByText("帳號已停權")).toBeVisible();
  await expect(page.getByRole("cell", { name: "手動停權測試" })).toBeVisible();

  await page.getByRole("button", { name: "解除" }).click();
  const lift = page.getByRole("dialog", { name: "解除這項處分" });
  await lift.getByLabel("原因").fill("誤判");
  await lift.getByRole("button", { name: "解除處分" }).click();
  await expect(page.getByText("狀態正常")).toBeVisible();
  await expect(page.getByRole("cell", { name: "已解除" })).toBeVisible();

  await page.getByRole("button", { name: "重設名稱" }).click();
  const reset = page.getByRole("dialog", { name: `重設 ${target.username} 的名稱` });
  await reset.getByLabel("原因").fill("不當名稱");
  await reset.getByRole("button", { name: "重設名稱" }).click();
  await expect(page.getByRole("heading", { level: 1, name: target.username })).toHaveCount(0);
});

test("the audit log filters by action and opens its details", async ({ page }) => {
  const { id } = await reportedQuote();
  const moderator = await newModerator();
  const token = await coreToken(moderator);
  const { body } = await coreCall(`/v1/admin/cases?limit=50`, { token });
  const found = (body!.data as unknown as { id: string; target_id: string }[]).find(({ target_id }) => target_id === id)!;
  await coreCall(`/v1/admin/cases/${found.id}/resolve`, { method: "POST", token, body: { resolution: "dismiss", note: "沒有問題" } });

  await signIn(page, moderator);
  await page.goto("/admin/audit");
  await page.getByLabel("動作").selectOption("case.resolve");
  await page.getByLabel("目標 ID").fill(found.id);
  await expect(page.getByRole("row")).toHaveCount(2);
  await expect(page.getByRole("cell", { name: "case.resolve" })).toBeVisible();
  await page.getByText("查看").click();
  await expect(page.locator(".audit-metadata")).toContainText("dismiss");
});

test("UI-05: the back office and /me/standing pass axe", async ({ page }) => {
  const { id } = await reportedQuote();
  const moderator = await newModerator();
  const token = await coreToken(moderator);
  const { body } = await coreCall(`/v1/admin/cases?limit=50`, { token });
  const found = (body!.data as unknown as { id: string; target_id: string }[]).find(({ target_id }) => target_id === id)!;

  await signIn(page, moderator);
  for (const path of ["/admin/cases", `/admin/cases/${found.id}`, "/admin/appeals", "/admin/audit", `/admin/users/${moderator.id}`, "/me/standing"]) {
    await page.goto(path);
    await page.waitForTimeout(1200);
    const { violations } = await new AxeBuilder({ page }).analyze();
    const serious = violations.filter(({ impact }) => impact === "critical" || impact === "serious");
    expect(serious.map(({ id: rule, nodes }) => `${path} ${rule}: ${nodes[0]?.html}`)).toEqual([]);
  }
  await signOut(page);
});
