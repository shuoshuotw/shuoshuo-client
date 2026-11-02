import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

const CORE = "http://localhost:3999";

async function open(page: Page, path = "/") {
  await page.goto(path);
  await page.evaluate(() => document.fonts.ready);
}

const quoteText = (page: Page) => page.getByTestId("quote-text");
const motionLog = (page: Page) => page.evaluate(() => window.__motionLog ?? []);

async function pickingDone(page: Page, count = 1) {
  await expect.poll(async () => (await motionLog(page)).filter((entry) => entry.id === "M-01" && entry.phase === "end").length).toBeGreaterThanOrEqual(count);
}

async function expectAllCharsSettled(page: Page) {
  const chars = await page.locator("[data-char]").evaluateAll((elements) =>
    elements.map((element) => ({ opacity: getComputedStyle(element).opacity, transform: (element as HTMLElement).style.transform })),
  );
  expect(chars.length).toBeGreaterThan(0);
  for (const char of chars) expect(char).toEqual({ opacity: "1", transform: "" });
}

async function serve(page: Page, content: string, key = "original") {
  const body = JSON.stringify({
    data: {
      id: "00000000-0000-4000-8000-0000000000aa",
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
  await page.getByRole("button", { name: "再抽一句" }).click();
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

  test("UI-11: the slogan appears once, in the h1", async ({ page }) => {
    await open(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("說說，讓文字不僅止於說說");
    expect((await page.locator("body").innerText()).split("讓文字不僅止於說說").length - 1).toBe(1);
  });

  test("UI-11: other pages carry no slogan", async ({ page }) => {
    await page.goto("/no-such-page");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("這一格缺字");
    expect(await page.locator("body").innerText()).not.toContain("讓文字不僅止於說說");
  });

  test("UI-12: the interface says 說說, never 語錄", async ({ page }) => {
    await open(page);
    expect(await page.locator("body").innerText()).not.toContain("語錄");
  });

  const LENGTHS = [2, 20, 21, 60, 61, 100];
  const WIDTHS = [320, 390, 768, 1440];
  for (const width of WIDTHS) {
    test(`UI-03: every length fits at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await open(page);
      for (const length of LENGTHS) {
        await drawInto(page, "測".repeat(length));
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `${length} characters`).toBeLessThanOrEqual(0);
        const fits = await quoteText(page).evaluate((element) => {
          const sheet = element.closest(".sheet")!.getBoundingClientRect();
          const text = element.getBoundingClientRect();
          return text.left >= sheet.left && text.right <= sheet.right && text.bottom <= sheet.bottom + 1;
        });
        expect(fits, `${length} characters stay on the paper`).toBe(true);
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

  test("UI-04: vertical setting holds emoji, Latin and punctuation without overflowing", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page);
    await drawInto(page, "Life is 一首歌🎵，我們都在唱。你呢？");
    await page.getByTestId("layout-toggle").click();
    await expect(quoteText(page)).toHaveAttribute("data-layout", "vertical");
    const fits = await quoteText(page).evaluate((element) => {
      const sheet = element.closest(".sheet")!.getBoundingClientRect();
      const text = element.getBoundingClientRect();
      return getComputedStyle(element).writingMode === "vertical-rl" && text.left >= sheet.left && text.bottom <= sheet.bottom + 1;
    });
    expect(fits).toBe(true);
  });

  test("a phone refuses vertical setting for a long quote", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await open(page);
    await drawInto(page, "測".repeat(41));
    await page.getByTestId("layout-toggle").click();
    await expect(quoteText(page)).toHaveAttribute("data-layout", "horizontal");
  });
});

test.describe("the stage", () => {
  test("draws, goes back, and shows history", async ({ page }) => {
    await open(page);
    await pickingDone(page);
    const back = page.getByRole("button", { name: "上一句" });
    await expect(back).toBeDisabled();
    const first = await quoteText(page).locator(".sr-only").innerText();
    await drawInto(page, "抽到的下一句");
    await back.click();
    await expect(quoteText(page).locator(".sr-only")).toHaveText(first);
  });

  test("M-20 and the curl line follow the type case; the paper follows the quote", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page);
    const cell = page.getByRole("button", { name: "詩詞" });
    await cell.click();
    await expect(cell).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".terminal code").first()).toContainText("categories=poetry");
    await expect(quoteText(page).locator(".sr-only")).toHaveText("行到水窮處，坐看雲起時。");
    await expect.poll(() => page.locator(".sheet").evaluate((element) => getComputedStyle(element).backgroundColor)).toBe("rgb(201, 207, 201)");
    await expect(page.getByTestId("curl-output")).toHaveText("行到水窮處，坐看雲起時。");
    await expect.poll(() => cell.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe("rgb(201, 207, 201)");
  });

  test("shows the empty state and clears the filter from it", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page);
    await page.getByRole("button", { name: "其他" }).click();
    await expect(page.getByText("這個字盤是空的")).toBeVisible();
    await page.getByRole("button", { name: "清除篩選" }).click();
    await expect(quoteText(page)).toBeVisible();
    await expect(page.getByRole("button", { name: "全部" })).toHaveAttribute("aria-pressed", "true");
  });

  test("shows the error state and recovers from it", async ({ page }) => {
    await open(page);
    await page.route(`${CORE}/v1/quotes/random*`, (route) => route.abort());
    await page.getByRole("button", { name: "再抽一句" }).click();
    await expect(page.getByText("說說沒有載入成功")).toBeVisible();
    await page.unroute(`${CORE}/v1/quotes/random*`);
    await page.getByRole("button", { name: "重試" }).click();
    await expect(quoteText(page)).toBeVisible();
  });

  test("ST-05: filter and layout survive a reload, and storage failures do not break the page", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page);
    await page.getByRole("button", { name: "詩詞" }).click();
    await page.getByTestId("layout-toggle").click();
    await expect(quoteText(page)).toHaveAttribute("data-layout", "vertical");
    await page.reload();
    await expect(page.getByRole("button", { name: "詩詞" })).toHaveAttribute("aria-pressed", "true");
    await expect(quoteText(page)).toHaveAttribute("data-layout", "vertical");

    await page.addInitScript(() => {
      for (const area of ["localStorage", "sessionStorage"]) {
        Object.defineProperty(window, area, {
          get() {
            throw new Error("denied");
          },
        });
      }
    });
    await page.reload();
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
    await page.getByRole("button", { name: /^按讚/ }).click();
    await expect(page).toHaveURL(/\/login\?next=/);
  });
});

test.describe("motion", () => {
  test("MO-01: picking runs on arrival and on every draw, then leaves the type settled", async ({ page }) => {
    await open(page);
    await pickingDone(page);
    expect(await motionLog(page)).toContainEqual({ id: "M-01", variant: "full", phase: "start" });
    await expectAllCharsSettled(page);
    await page.getByRole("button", { name: "再抽一句" }).click();
    await pickingDone(page, 2);
    await expect.poll(() => page.locator("[data-char]").first().evaluate((element) => (element as HTMLElement).style.transform)).toBe("");
    await expectAllCharsSettled(page);
  });

  test("MO-02: five quick draws end on the last quote, readable", async ({ page }) => {
    await open(page);
    await pickingDone(page);
    const button = page.getByRole("button", { name: "再抽一句" });
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

  test("MO-04: reduced motion keeps everything visible and uses the reduced variants", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page);
    await pickingDone(page);
    const log = await motionLog(page);
    expect(log).toContainEqual({ id: "M-01", variant: "reduced", phase: "start" });
    expect(log.filter((entry) => entry.variant === "full")).toEqual([]);
    await expectAllCharsSettled(page);

    await page.getByTestId("layout-toggle").click();
    await expect(quoteText(page)).toHaveAttribute("data-layout", "vertical");
    expect(await motionLog(page)).toContainEqual({ id: "M-02", variant: "reduced", phase: "start" });

    const durations = await page.evaluate(() =>
      [".sheet", ".button", ".case-cell", ".tool"].map((selector) => getComputedStyle(document.querySelector(selector)!).transitionDuration),
    );
    for (const duration of durations) expect(duration.split(",").every((part) => parseFloat(part) === 0)).toBe(true);

    await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
    for (const part of await page.locator("[data-reveal]").all()) {
      expect(await part.evaluate((element) => getComputedStyle(element).opacity)).toBe("1");
    }
    await expect(page.locator(".spines")).not.toHaveAttribute("data-folding", "true");
  });

  test("M-02: flipping the layout leaves the type settled", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page);
    await pickingDone(page);
    await page.getByTestId("layout-toggle").click();
    await expect.poll(async () => (await motionLog(page)).some((entry) => entry.id === "M-02" && entry.phase === "end")).toBe(true);
    await expect(quoteText(page)).toHaveAttribute("data-layout", "vertical");
    await expect(page.locator("[data-char]").first()).toHaveJSProperty("style.transform", "");
  });

  test("M-10: sections rise on the way down and end visible", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page);
    await page.getByRole("heading", { name: "提交一句說說" }).scrollIntoViewIfNeeded();
    await expect.poll(() => page.locator(".invite-paper").evaluate((element) => getComputedStyle(element).opacity)).toBe("1");
    expect(await motionLog(page)).toContainEqual({ id: "M-10", variant: "full", phase: "start" });
  });

  test("the list folds into spines on desktop, and a spine brings its card back", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page);
    const section = page.locator(".spines");
    await expect(section).toHaveAttribute("data-folding", "true");
    const scrollTop = await section.evaluate((element) => element.getBoundingClientRect().top + scrollY);
    await page.evaluate((top) => scrollTo(0, top + innerHeight * 2), scrollTop);
    const last = page.locator("[data-spine-card]").last();
    await expect.poll(() => last.evaluate((element) => getComputedStyle(element).clipPath)).toContain("inset");
    await expect(last.getByRole("link", { name: "讀這句" })).toBeVisible();
  });

  test("the list stays a plain stack on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await open(page);
    await expect(page.locator(".spines")).not.toHaveAttribute("data-folding", "true");
    expect(await page.locator("[data-spine-card]").first().evaluate((element) => getComputedStyle(element).position)).toBe("static");
  });

  test("MO-07: leaving mid-animation logs no errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error" && !message.text().includes("404")) errors.push(message.text());
    });
    await open(page);
    await page.getByRole("button", { name: "再抽一句" }).click();
    await page.getByRole("link", { name: "近期熱門", exact: true }).click();
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

test("MO-09: a blank sheet is exactly the size of the sheet it replaces", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page);
  await pickingDone(page);
  const loaded = await page.locator(".sheet").boundingBox();
  await page.route(`${CORE}/v1/quotes/random*`, (route) => route.abort());
  await page.getByRole("button", { name: "再抽一句" }).click();
  await expect(page.getByText("說說沒有載入成功")).toBeVisible();
  expect(await page.locator(".sheet").boundingBox()).toEqual(loaded);
});

test.describe("accessibility", () => {
  for (const colorScheme of ["light", "dark"] as const) {
    for (const width of [390, 1440]) {
      test(`UI-05: the home page has no serious axe findings, ${colorScheme}, ${width}px`, async ({ page }) => {
        await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
        await page.setViewportSize({ width, height: 900 });
        await open(page);
        await pickingDone(page);
        // Axe reads colours as painted, so a fade still running would count as low contrast
        await page.evaluate(() => Promise.all(document.getAnimations().map((animation) => animation.finished)));
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
    const draw = page.getByRole("button", { name: "再抽一句" });
    await draw.focus();
    await serve(page, "鍵盤抽到的一句");
    await page.keyboard.press("Enter");
    await expect(quoteText(page).locator(".sr-only")).toHaveText("鍵盤抽到的一句");
    await expect(draw).toBeFocused();
    await page.getByRole("button", { name: "全部" }).focus();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "動畫" })).toBeFocused();
    await expect(page.getByRole("button", { name: "動畫" })).toHaveCSS("outline-style", "solid");
  });

  test("touch targets on a phone are at least 44px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await open(page);
    const small = await page.locator(".action-bar button").evaluateAll((buttons) =>
      buttons.filter((button) => {
        const box = button.getBoundingClientRect();
        return box.width > 0 && (box.width < 44 || box.height < 44);
      }).length,
    );
    expect(small).toBe(0);
  });
});

test.describe("the type case on a phone", () => {
  test("M-25: opens as a drawer, filters, and closes", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await open(page);
    await page.getByRole("button", { name: "開啟類別字盤" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "詩詞" }).click();
    await expect(dialog.getByRole("button", { name: "詩詞" })).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(quoteText(page).locator(".sr-only")).toHaveText("行到水窮處，坐看雲起時。");
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
        // Lazy images below the fold would otherwise be blank in a full-page capture
        await page.locator("img").evaluateAll((images: HTMLImageElement[]) =>
          Promise.all(
            images.map((image) => {
              image.loading = "eager";
              return image.decode();
            }),
          ),
        );
        await expect(page.locator("img").first()).toBeVisible();
        await expect(page).toHaveScreenshot(`home-${colorScheme}-${width}.png`, { fullPage: true });
      });
    }
  }
});
