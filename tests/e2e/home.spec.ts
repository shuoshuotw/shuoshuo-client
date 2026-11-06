import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

const CORE = "http://localhost:3999";

async function open(page: Page, path = "/") {
  await page.goto(path);
  await page.evaluate(() => document.fonts.ready);
}

const quoteText = (page: Page) => page.getByTestId("quote-text");
const motionLog = (page: Page) => page.evaluate(() => window.__motionLog ?? []);
const toolbar = (page: Page) => page.getByRole("toolbar", { name: "這句說說" });

async function pickingDone(page: Page, count = 1) {
  await expect.poll(async () => (await motionLog(page)).filter((entry) => entry.id === "M-01" && entry.phase === "end").length).toBeGreaterThanOrEqual(count);
}

async function expectAllCharsSettled(page: Page) {
  const chars = await page.locator("[data-char]").evaluateAll((elements) =>
    elements.map((element) => ({ opacity: getComputedStyle(element).opacity, transform: (element as HTMLElement).style.transform, filter: (element as HTMLElement).style.filter })),
  );
  expect(chars.length).toBeGreaterThan(0);
  for (const char of chars) expect(char).toEqual({ opacity: "1", transform: "", filter: "" });
}

async function serve(page: Page, content: string, key = "original") {
  const body = JSON.stringify({
    data: {
      id: `00000000-0000-4000-8000-${String(Math.floor(Math.random() * 1e12)).padStart(12, "0")}`,
      content,
      length: Array.from(content).length,
      category: { key, name: "原創" },
      source_from: "測試來源",
      submitter: { id: "x", username: "小明", deleted: false },
      stats: { like_count: 1, favorite_count: 1, comment_count: 0 },
      status: "published",
      commit_from: "web",
      edited_at: null,
      created_at: "2026-11-01T00:00:00.000Z",
    },
    meta: { request_id: "req" },
  });
  await page.route(`${CORE}/v1/quotes/random*`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body }),
  );
}

async function drawInto(page: Page, content: string, key?: string) {
  await serve(page, content, key);
  await toolbar(page).getByRole("button", { name: "換一句" }).click();
  await expect(quoteText(page).locator(".sr-only")).toHaveText(content);
}

test.beforeEach(async ({ request }) => {
  await request.get(`${CORE}/__reset`);
});

test.describe("copy and type", () => {
  test("UI-10: quote text is set in ChenYuLuoYan, with no faked weight", async ({ page }) => {
    await open(page);
    const style = await quoteText(page).evaluate((element) => {
      const computed = getComputedStyle(element);
      return { family: computed.fontFamily, synthesis: computed.fontSynthesis, weight: computed.fontWeight };
    });
    expect(style.family).toContain("ChenYuLuoYan");
    expect(style.weight).toBe("100");
    expect(style.synthesis).toBe("none");
  });

  // UI-11, changed 2026-11-04: the slogan lives in the footer of every page, once
  test("UI-11: the slogan appears once, in the footer", async ({ page }) => {
    await open(page);
    expect((await page.locator("body").innerText()).split("讓文字不僅止於說說").length - 1).toBe(1);
    await expect(page.locator(".site-footer .footer-slogan")).toContainText("讓文字不僅止於說說");
  });

  test("UI-11: other pages carry it once too, in the footer", async ({ page }) => {
    await page.goto("/no-such-page");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("這一格缺字");
    expect((await page.locator("body").innerText()).split("讓文字不僅止於說說").length - 1).toBe(1);
    await expect(page.locator(".site-footer .footer-slogan")).toContainText("讓文字不僅止於說說");
  });

  test("UI-12: the interface says 說說, never 語錄", async ({ page }) => {
    await open(page);
    expect(await page.locator("body").innerText()).not.toContain("語錄");
  });

  test("the credit reads 提交者‧出處 under the quote", async ({ page }) => {
    await open(page);
    await drawInto(page, "抽到的一句");
    await expect(page.locator(".stage-quote .credit")).toHaveText(/^—— 小明‧(，出處：)?測試來源$/);
  });

  const LENGTHS = [2, 20, 21, 60, 61, 100];
  const WIDTHS = [320, 390, 768, 1440];
  for (const width of WIDTHS) {
    test(`UI-03: every length fits at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await open(page);
      for (const length of LENGTHS) {
        await drawInto(page, "測".repeat(length));
        const overflow = await page.evaluate(() => {
          const scroller = document.getElementById("app-scroll")!;
          return Math.max(scroller.scrollWidth - scroller.clientWidth, document.documentElement.scrollWidth - document.documentElement.clientWidth);
        });
        expect(overflow, `${length} characters`).toBeLessThanOrEqual(0);
        const fits = await quoteText(page).evaluate((element) => {
          const stage = element.closest(".stage")!.getBoundingClientRect();
          const text = element.getBoundingClientRect();
          return text.left >= stage.left && text.right <= stage.right;
        });
        expect(fits, `${length} characters stay on the stage`).toBe(true);
      }
    });
  }

  test("marks never start a line, and opening brackets never end one", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await open(page);
    await drawInto(page, "世界上只有一種真正的英雄主義，就是認清生活的真相之後。依然熱愛「生活」，對吧？");
    const starts = await quoteText(page).locator("[data-char]").evaluateAll((chars) => {
      const lines = new Map<number, string[]>();
      for (const char of chars) {
        const top = Math.round(char.getBoundingClientRect().top);
        lines.set(top, [...(lines.get(top) ?? []), char.textContent ?? ""]);
      }
      return [...lines.values()].map((line) => [line[0], line.at(-1)]);
    });
    expect(starts.length).toBeGreaterThan(1);
    for (const [first, last] of starts) {
      expect("，。、；：！？）」』》〉…—").not.toContain(first);
      expect("（「『《〈").not.toContain(last);
    }
  });

  test("uses the size class the length calls for", async ({ page }) => {
    await open(page);
    for (const [length, size] of [[20, "quote-l"], [21, "quote-m"], [60, "quote-m"], [61, "quote-s"]] as const) {
      await drawInto(page, "測".repeat(length));
      await expect(quoteText(page)).toHaveClass(new RegExp(size));
    }
  });
});

test.describe("the stage", () => {
  test("draws another, and offers no way back", async ({ page }) => {
    await open(page);
    await pickingDone(page);
    // The brackets stay mounted and glide to the new sentence instead of being rebuilt
    const bracket = await page.locator(".stage .bracket-open").elementHandle();
    await drawInto(page, "抽到的下一句");
    expect(await bracket!.evaluate((element) => element.isConnected)).toBe(true);
    await expect(toolbar(page).getByRole("button", { name: "上一句" })).toHaveCount(0);
    await expect(toolbar(page).getByRole("button", { name: /^留言/ })).toBeVisible();
  });

  test("copying shows a check in place of the icon", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await open(page);
    await drawInto(page, "複製這一句");
    await toolbar(page).getByRole("button", { name: "複製這句" }).click();
    await expect(toolbar(page).getByRole("button", { name: "已複製" })).toHaveAttribute("data-copied", "true");
    // The sentence alone, without its credit
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("複製這一句");
  });

  test("the light takes the quote's category", async ({ page }) => {
    await open(page);
    await drawInto(page, "一句詩", "poetry");
    await expect.poll(() => page.locator(".stage").evaluate((element) => getComputedStyle(element).getPropertyValue("--glow").trim())).toBe("rgb(201, 207, 201)");
  });

  test("an empty pool says so and points to submitting", async ({ page }) => {
    await open(page);
    await page.route(`${CORE}/v1/quotes/random*`, (route) =>
      route.fulfill({
        status: 404,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify({ error: { code: "NO_QUOTE_MATCHED", status: 404, message: "沒有符合條件的說說" } }),
      }),
    );
    await toolbar(page).getByRole("button", { name: "換一句" }).click();
    await expect(page.getByText("這裡還沒有任何說說")).toBeVisible();
    await expect(page.getByRole("link", { name: "提交第一句" })).toHaveAttribute("href", "/submit");
  });

  test("shows the error state and recovers from it", async ({ page }) => {
    await open(page);
    await page.route(`${CORE}/v1/quotes/random*`, (route) => route.abort());
    await toolbar(page).getByRole("button", { name: "換一句" }).click();
    await expect(page.getByText("說說沒有載入成功")).toBeVisible();
    await page.unroute(`${CORE}/v1/quotes/random*`);
    await page.getByRole("button", { name: "重試" }).click();
    await expect(quoteText(page)).toBeVisible();
  });

  test("ST-05: storage failures do not break the page", async ({ page }) => {
    await page.addInitScript(() => {
      for (const area of ["localStorage", "sessionStorage"]) {
        Object.defineProperty(window, area, {
          get() {
            throw new Error("denied");
          },
        });
      }
    });
    await open(page);
    await expect(quoteText(page)).toBeVisible();
  });

  test("M-21: the theme toggle persists", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await open(page);
    await expect(page.locator("html")).toHaveClass(/light/);
    await page.getByRole("button", { name: "切換深淺色" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  test("an anonymous like goes to sign-in", async ({ page }) => {
    await open(page);
    await toolbar(page).getByRole("button", { name: /^按讚/ }).click();
    await expect(page).toHaveURL(/\/login\?next=/);
  });

  test("a phone gets the dock: the pages and the account, then on the way down the pages fold into a menu and the toolbar comes down", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await open(page);
    await expect(page.locator(".site-header")).toBeHidden();
    const dock = page.locator(".dock");
    await expect(dock.getByRole("toolbar", { name: "這句說說" })).toBeVisible();
    await expect(dock.getByRole("navigation", { name: "主要導覽" }).getByRole("link", { name: "首頁" })).toHaveAttribute("aria-current", "page");
    await expect(dock.getByRole("link", { name: "登入" })).toBeVisible();
    await expect(dock.getByRole("button", { name: "開啟選單" })).toBeHidden();

    await page.locator("#app-scroll").evaluate(async (element) => {
      element.scrollTop = 200;
      await new Promise((resolve) => setTimeout(resolve, 50));
      element.scrollTop = 500;
    });
    await expect(dock).toHaveAttribute("data-compact", "true");
    await expect(dock.locator(".dock-tab").first()).toHaveCSS("opacity", "0");
    await expect(dock.locator(".dock-tabs")).toHaveJSProperty("offsetWidth", 56);

    // The button grows into the menu (a disclosure), and folds back on Escape or once a page is chosen
    const morph = dock.locator(".dock-morph");
    await dock.getByRole("button", { name: "開啟選單" }).click();
    await expect(dock.getByRole("button", { name: "關閉選單" })).toHaveAttribute("aria-expanded", "true");
    const menu = dock.getByRole("navigation", { name: "選單" });
    await expect(menu.getByRole("link", { name: "近期熱門" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(morph).toHaveAttribute("data-open", "false");
    await dock.getByRole("button", { name: "開啟選單" }).click();
    await menu.getByRole("link", { name: "近期熱門" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("近期熱門");
    await expect(morph).toHaveAttribute("data-open", "false");
  });

  test("the header's links are links, and the current page is marked", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page, "/trending");
    const nav = page.getByRole("navigation", { name: "主要導覽" });
    for (const name of ["說說", "近期熱門", "提交", "API 文件"]) await expect(nav.getByRole("link", { name, exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "近期熱門", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(page.locator(".site-nav")).toHaveAttribute("data-pill", "on");
  });
});

test.describe("the invitation", () => {
  test("keeps what is written there for the submit page", async ({ page }) => {
    await open(page);
    await expect(page.getByRole("heading", { name: "現在，換你說說" })).toBeVisible();
    await page.getByRole("textbox", { name: "你的那一句" }).fill("天黑了，就把燈打開。");
    await expect(page.locator(".composer-count")).toHaveText("10 / 100");
    await page.getByRole("link", { name: "繼續完成" }).click();
    await expect(page).toHaveURL(/\/(submit|login)/);
    expect(await page.evaluate(() => sessionStorage.getItem("shuoshuo:draft"))).toBe("天黑了，就把燈打開。");
  });
});

test.describe("latest quotes", () => {
  const front = (page: Page) => page.locator('.fan-card[data-front="true"]');

  test("the hand steps with the arrows, the dots, a throw, a carried card and a click on a side card", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page);
    const latest = page.locator(".latest");
    await latest.scrollIntoViewIfNeeded();
    await expect(page.locator(".fan")).toHaveAttribute("data-open", "true");
    await latest.getByRole("button", { name: "暫停輪播" }).click();
    await expect(latest.getByRole("button", { name: "繼續輪播" })).toBeVisible();

    await expect(front(page)).toHaveAttribute("aria-label", /^第 1 句/);
    await latest.getByRole("button", { name: "下一張" }).click();
    await expect(front(page)).toHaveAttribute("aria-label", /^第 2 句/);
    await latest.getByRole("button", { name: "第 4 句", exact: true }).click();
    await expect(front(page)).toHaveAttribute("aria-label", /^第 4 句/);
    await expect(latest.getByRole("button", { name: "第 4 句", exact: true })).toHaveAttribute("aria-current", "true");

    // The front card follows the pointer anywhere; thrown away, it goes to the back and its neighbour steps forward.
    // The hand settles first, so the card under the pointer is the front one
    await page.waitForTimeout(900);
    const box = (await page.locator(".fan").boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 - 100, box.y + box.height / 2 + 40, { steps: 6 });
    await expect(front(page)).toHaveAttribute("data-held", "true");
    expect(await front(page).evaluate((card) => [card.style.getPropertyValue("--drag-x"), card.style.getPropertyValue("--drag-y")])).toEqual(["-100px", "40px"]);
    await page.mouse.move(box.x + box.width / 2 - 160, box.y + box.height / 2 + 40, { steps: 4 });
    await page.mouse.up();
    await expect(front(page)).toHaveAttribute("aria-label", /^第 5 句/);
    await expect(page).toHaveURL("/");

    // A card carried from the side comes to the front when it is let go
    await page.waitForTimeout(900);
    const right = (await page.locator(".fan-card").nth(5).boundingBox())!;
    await page.mouse.move(right.x + right.width - 30, right.y + right.height / 2);
    await page.mouse.down();
    await page.mouse.move(right.x + right.width - 90, right.y + right.height / 2 - 60, { steps: 6 });
    await page.mouse.up();
    await expect(front(page)).toHaveAttribute("aria-label", /^第 6 句/);

    // Card 4 now sits two places left of the front; its left edge is clear of the cards above it
    await page.waitForTimeout(900);
    const side = (await page.locator(".fan-card").nth(3).boundingBox())!;
    await page.mouse.click(side.x + 40, side.y + side.height / 2);
    await expect(front(page)).toHaveAttribute("aria-label", /^第 4 句/);
  });

  test("only the front card can be reached, and it opens its quote", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page);
    await expect(page.locator(".fan-card[inert]")).toHaveCount((await page.locator(".fan-card").count()) - 1);
    await expect(front(page).getByRole("link", { name: "讀這句" })).toHaveAttribute("href", /^\/q\//);
  });

  // Real time, not page.clock: running 9.5 s of faked frames at once with the pointer over the fan (its tilt, the
  // magnets, the light) left CI's Chromium answering nothing for longer than the test may take
  test("it swaps on its own, and stops while the pointer is over it", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page);
    await page.locator(".latest").scrollIntoViewIfNeeded();
    await expect(page.locator(".fan")).toHaveAttribute("data-open", "true");
    await page.mouse.move(5, 5);
    // One swap comes 4.5 s after the hand opens
    await expect(front(page)).toHaveAttribute("aria-label", /^第 2 句/, { timeout: 7000 });
    await page.locator(".fan").hover();
    // Longer than a swap: held under the pointer, the hand stays where it is
    await page.waitForTimeout(5500);
    await expect(front(page)).toHaveAttribute("aria-label", /^第 2 句/);
  });
});

test.describe("motion", () => {
  test("MO-01: picking runs on arrival and on every draw, then leaves the type settled", async ({ page }) => {
    await open(page);
    await pickingDone(page);
    expect(await motionLog(page)).toContainEqual({ id: "M-01", variant: "full", phase: "start" });
    await expectAllCharsSettled(page);
    await toolbar(page).getByRole("button", { name: "換一句" }).click();
    await pickingDone(page, 2);
    await expectAllCharsSettled(page);
    await expect(page.locator(".stage .caret")).toHaveCount(0, { timeout: 3000 });
  });

  test("MO-02: five quick draws end on the last quote, readable", async ({ page }) => {
    await open(page);
    await pickingDone(page);
    const button = toolbar(page).getByRole("button", { name: "換一句" });
    for (let i = 0; i < 5; i += 1) {
      await expect(button).toBeEnabled();
      await button.click();
    }
    await expect(button).toBeEnabled();
    await expect.poll(async () => {
      const chars = await page.locator("[data-char]").evaluateAll((elements) => elements.map((element) => getComputedStyle(element).opacity));
      return chars.every((opacity) => opacity === "1");
    }).toBe(true);
    await expect(quoteText(page)).toBeVisible();
  });

  test("MO-03: the quote is readable when the animation library never loads", async ({ page }) => {
    await page.route(/\/_next\/static\/chunks\/.*\.js/, async (route) => {
      const response = await route.fetch();
      const body = await response.text();
      if (body.includes("GreenSock") || body.includes("gsap")) await route.abort();
      else await route.fulfill({ response, body });
    });
    await page.goto("/");
    await expect.poll(() => quoteText(page).locator("[data-char]").first().evaluate((element) => getComputedStyle(element).opacity), { timeout: 4000 }).toBe("1");
    await expect(quoteText(page).locator(".sr-only")).not.toBeEmpty();
  });

  test("MO-04: reduced motion keeps everything visible, uses the reduced variants and never swaps on its own", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page);
    await pickingDone(page);
    const log = await motionLog(page);
    expect(log).toContainEqual({ id: "M-01", variant: "reduced", phase: "start" });
    expect(log.filter((entry) => entry.variant === "full")).toEqual([]);
    await expectAllCharsSettled(page);
    await expect(page.locator(".latest").getByRole("button", { name: "繼續輪播" })).toBeVisible();
    expect(await page.locator(".fan-card").first().evaluate((element) => getComputedStyle(element).transitionProperty)).not.toContain("transform");
  });

  test("MO-07: leaving mid-animation logs no errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error" && !message.text().includes("404")) errors.push(message.text());
    });
    await open(page);
    await toolbar(page).getByRole("button", { name: "換一句" }).click();
    await page.getByRole("navigation", { name: "主要導覽" }).getByRole("link", { name: "近期熱門", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("近期熱門");
    expect(errors).toEqual([]);
  });

  test("MO-10: the home page does not shift while it loads", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript(() => {
      window.__cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
          if (!entry.hadRecentInput) window.__cls! += entry.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
    });
    await open(page);
    await pickingDone(page);
    expect(await page.evaluate(() => window.__cls)).toBeLessThanOrEqual(0.1);
  });
});

test("MO-09: the stage keeps its size when the quote gives way to a note", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page);
  await pickingDone(page);
  const loaded = await page.locator(".stage").boundingBox();
  await page.route(`${CORE}/v1/quotes/random*`, (route) => route.abort());
  await toolbar(page).getByRole("button", { name: "換一句" }).click();
  await expect(page.getByText("說說沒有載入成功")).toBeVisible();
  expect(await page.locator(".stage").boundingBox()).toEqual(loaded);
});

test.describe("accessibility", () => {
  for (const colorScheme of ["light", "dark"] as const) {
    for (const width of [390, 1440]) {
      test(`UI-05: the home page has no serious axe findings, ${colorScheme}, ${width}px`, async ({ page }) => {
        await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
        await page.setViewportSize({ width, height: 900 });
        await open(page);
        await pickingDone(page);
        // Axe reads colours as painted, so a fade still running would count as low contrast. The page's fading edges
        // follow the scroll and never finish, so only animations on the clock are waited for, and of those not the
        // composer's caret, which keeps blinking with reduced motion too
        await page.evaluate(() =>
          Promise.all(
            document
              .getAnimations()
              .filter((animation) => animation.timeline === document.timeline && animation.effect?.getTiming().iterations !== Infinity)
              .map((animation) => animation.finished),
          ),
        );
        const { violations } = await new AxeBuilder({ page }).analyze();
        const serious = violations.filter(({ impact }) => impact === "critical" || impact === "serious");
        expect(serious.map(({ id, nodes }) => `${id}: ${nodes[0]?.html} ${nodes[0]?.failureSummary}`)).toEqual([]);
      });
    }
  }

  test("UI-06: the stage works from the keyboard", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page);
    await pickingDone(page);
    const draw = toolbar(page).getByRole("button", { name: "換一句" });
    await draw.focus();
    await serve(page, "鍵盤抽到的一句");
    await page.keyboard.press("Enter");
    await expect(quoteText(page).locator(".sr-only")).toHaveText("鍵盤抽到的一句");
    await expect(draw).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(toolbar(page).getByRole("button", { name: /^按讚/ })).toBeFocused();
    await expect(toolbar(page).getByRole("button", { name: /^按讚/ })).toHaveCSS("outline-style", "solid");
  });

  test("touch targets on a phone are at least 44px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await open(page);
    const small = await toolbar(page).locator("button, a").evaluateAll((controls) =>
      controls.filter((control) => {
        const box = control.getBoundingClientRect();
        return box.width > 0 && (box.width < 44 || box.height < 44);
      }).length,
    );
    expect(small).toBe(0);
  });
});

// UI-01. Baselines are made in the CI container only: fonts render differently on every platform.
test.describe("visual baselines", () => {
  test.skip(process.platform !== "linux", "baselines only exist for the Linux container");

  for (const colorScheme of ["light", "dark"] as const) {
    for (const width of [390, 768, 1440]) {
      test(`home ${colorScheme} ${width}`, async ({ page }) => {
        await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
        await page.setViewportSize({ width, height: 900 });
        await open(page);
        await pickingDone(page);
        await expect(page).toHaveScreenshot(`home-${colorScheme}-${width}.png`);
      });
    }
  }
});
