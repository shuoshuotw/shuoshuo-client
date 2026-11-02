import { describe, expect, it } from "vitest";
import { ApiFailure, failureMessage, fieldMessages } from "@/lib/api/client";
import { countChars, withinMinutes } from "@/lib/format";
import { reasonLabel, standingText } from "@/lib/labels";
import { safeNext } from "@/lib/safe-next";

describe("SEC-12: safeNext", () => {
  it("keeps a path on this site, with its query", () => {
    expect(safeNext("/me/api-keys?x=1#y")).toBe("/me/api-keys?x=1#y");
    expect(safeNext("/q/abc")).toBe("/q/abc");
  });

  it.each(["https://evil.example", "//evil.example", "/\\evil.example", "\\\\evil.example", "javascript:alert(1)", "", null, undefined, "me"])("sends %s home", (value) => {
    expect(safeNext(value)).toBe("/");
  });
});

describe("failure helpers", () => {
  it("shows Core's message and falls back when Core never answered", () => {
    expect(failureMessage(new ApiFailure(409, "USERNAME_TAKEN", "此名稱已被使用"))).toBe("此名稱已被使用");
    expect(failureMessage(new ApiFailure(503, "SERVICE_UNAVAILABLE"))).toBe("連線沒有成功，請再試一次");
    expect(failureMessage(new TypeError("Failed to fetch"))).toBe("連線沒有成功，請再試一次");
  });

  it("reads per-field messages from VALIDATION_FAILED", () => {
    const failure = new ApiFailure(400, "VALIDATION_FAILED", "請求參數不合規", { fields: [{ field: "content", code: "custom", message: "須為 2 至 100 字" }] });
    expect(fieldMessages(failure)).toEqual({ content: "須為 2 至 100 字" });
    expect(fieldMessages(new ApiFailure(400, "OTHER"))).toEqual({});
    expect(fieldMessages(new Error("x"))).toEqual({});
  });
});

describe("format and labels", () => {
  it("counts code points like Core and ignores the edges", () => {
    expect(countChars("  😀你好  ")).toBe(3);
  });

  it("knows an edit window from its age", () => {
    expect(withinMinutes(new Date(Date.now() - 60_000).toISOString(), 20)).toBe(true);
    expect(withinMinutes(new Date(Date.now() - 21 * 60_000).toISOString(), 20)).toBe(false);
  });

  it("names a reason, including one this build does not know", () => {
    expect(reasonLabel("spam")).toBe("垃圾內容");
    expect(reasonLabel("something_new")).toBe("something_new");
    expect(reasonLabel(null)).toBe("違反內容規範");
  });

  it("says how an account stands", () => {
    const base = { strike_count: 1, strike_limit: 4 as const, can_submit: true, can_comment: true };
    expect(standingText({ ...base, status: "active", suspended_until: null })).toBe("狀態正常");
    expect(standingText({ ...base, status: "banned", suspended_until: null })).toBe("帳號已停權");
    expect(standingText({ ...base, status: "suspended", suspended_until: "2026-11-10T00:00:00.000Z" })).toContain("暫停提交至 2026");
  });
});
