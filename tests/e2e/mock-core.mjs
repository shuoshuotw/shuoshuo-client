// A stand-in for Core with fixed content, so E2E and visual baselines do not depend on a database (TEST_PLAN §11).
import { createServer } from "node:http";

const QUOTES = [
  ["anime", "動畫", "我們仍未知道那天所看見的花的名字。", "未聞花名"],
  ["literature", "文學", "世界上只有一種真正的英雄主義，就是認清生活的真相之後，依然熱愛生活。", "羅曼．羅蘭"],
  ["poetry", "詩詞", "行到水窮處，坐看雲起時。", "王維〈終南別業〉"],
  ["original", "原創", "把今天寫下來，明天就不會忘記自己曾經這樣活過；把明天寫下來，今天就有了往前走一步的理由，哪怕只是一小步。", "整合測試"],
  ["game", "遊戲", "前進吧，不要停下來。", "遊戲旁白"],
  ["anti-motiv", "毒雞湯", "努力不一定成功，但不努力一定很輕鬆。", "網路"],
  ["music", "音樂", "Life is a song，我們都在跟著唱。", "歌詞"],
  ["ai", "AI", "我不知道，但我可以幫你查。", "聊天紀錄"],
];

const quote = ([key, name, content, source], index) => ({
  id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
  content,
  length: Array.from(content).length,
  category: { key, name },
  source_from: source,
  submitter: { id: "00000000-0000-4000-a000-000000000002", username: "小明", deleted: false },
  stats: { like_count: 12 + index, favorite_count: 3 + index, comment_count: index },
  status: "published",
  commit_from: "web",
  edited_at: null,
  created_at: `2026-10-${String(20 + index).padStart(2, "0")}T09:30:00.000Z`,
});

const quotes = QUOTES.map(quote);
let drawn = 0;

const send = (response, status, body, type = "application/json; charset=utf-8") => {
  // Reflected: a literal * does not cover Authorization
  const headers = response.req.headers["access-control-request-headers"] ?? "*";
  response.writeHead(status, { "content-type": type, "access-control-allow-origin": "*", "access-control-allow-headers": headers, "access-control-allow-methods": "*" });
  response.end(typeof body === "string" ? body : JSON.stringify(body));
};

// The signed-in visitor of the UI-01 baselines. tests/e2e/session.ts holds the matching cookie, and this also stands in for Supabase Auth.
const ME_ID = "00000000-0000-4000-a000-000000000002";
const standing = { status: "active", suspended_until: null, strike_count: 0, strike_limit: 4, can_submit: true, can_comment: true };
const me = { id: ME_ID, username: "小明", avatar_url: null, likes_public: true, favorites_public: true, roles: ["admin"], standing, pending_notices: [] };
const adminCases = [
  { id: "00000000-0000-4000-d000-000000000001", target_type: "quote", target_id: "00000000-0000-4000-8000-000000000002", status: "open", reporter_count: 4, effective_reporter_count: 3, top_reason: "spam", preview: "世界上只有一種真正的英雄主義，就是認清生活的真相之後，依然熱愛生活。", created_at: "2026-10-28T02:00:00.000Z" },
  { id: "00000000-0000-4000-d000-000000000002", target_type: "comment", target_id: "00000000-0000-4000-c000-000000000002", status: "open", reporter_count: 1, effective_reporter_count: 1, top_reason: "harassment", preview: "第一次看到是在高中，現在讀起來又不一樣了。", created_at: "2026-10-29T02:00:00.000Z" },
];
const authUser = {
  id: ME_ID,
  aud: "authenticated",
  role: "authenticated",
  email: "ming@example.com",
  app_metadata: { provider: "google", providers: ["google"] },
  user_metadata: {},
  created_at: "2026-10-01T00:00:00.000Z",
  identities: [
    { id: "g", identity_id: "g", user_id: ME_ID, provider: "google", identity_data: { email: "ming@example.com" }, created_at: "2026-10-01T00:00:00.000Z" },
    { id: "d", identity_id: "d", user_id: ME_ID, provider: "discord", identity_data: { email: "ming@example.com" }, created_at: "2026-10-02T00:00:00.000Z" },
  ],
};
const apiKeys = [
  { id: "00000000-0000-4000-b000-000000000001", name: "我的部落格", key_prefix: "shuoshuo_test_AbCdEfGh", scopes: ["quotes:read"], last_used_at: "2026-10-30T03:00:00.000Z", regenerated_at: null, created_at: "2026-10-20T03:00:00.000Z" },
  { id: "00000000-0000-4000-b000-000000000002", name: "每日一句機器人", key_prefix: "shuoshuo_test_IjKlMnOp", scopes: ["quotes:read", "reactions:write"], last_used_at: null, regenerated_at: null, created_at: "2026-10-25T03:00:00.000Z" },
];
const comments = [
  { id: "00000000-0000-4000-c000-000000000001", user: { id: ME_ID, username: "小明", avatar_url: null }, content: "這句我抄在筆記本的第一頁。", pinned_at: "2026-10-28T00:00:00.000Z", edited_at: null, created_at: "2026-10-27T02:00:00.000Z" },
  { id: "00000000-0000-4000-c000-000000000002", user: { id: "00000000-0000-4000-a000-000000000003", username: "小華", avatar_url: null }, content: "第一次看到是在高中，現在讀起來又不一樣了。", pinned_at: null, edited_at: "2026-10-27T01:00:00.000Z", created_at: "2026-10-26T02:00:00.000Z" },
];
const page = (data, meta) => ({ data, meta: { ...meta, pagination: { limit: 20, next_cursor: null, has_more: false } } });

createServer((request, response) => {
  const url = new URL(request.url, "http://mock");
  if (request.method === "OPTIONS") return send(response, 204, "");
  const meta = { request_id: "req_mock" };

  if (url.pathname === "/v1/quotes/random") {
    const categories = url.searchParams.get("categories")?.split(",");
    const pool = categories ? quotes.filter((item) => categories.includes(item.category.key)) : quotes;
    if (pool.length === 0) {
      return send(response, 404, { error: { code: "NO_QUOTE_MATCHED", status: 404, message: "沒有符合條件的說說", request_id: "req_mock" } });
    }
    // Next's server fetches carry no Origin. They always get the same quote, so an ISR refresh mid-run cannot change a baseline.
    const item = request.headers.origin ? pool[drawn++ % pool.length] : pool[0];
    if (url.searchParams.get("format") === "text") return send(response, 200, item.content, "text/plain; charset=utf-8");
    return send(response, 200, { data: item, meta });
  }
  if (url.pathname === "/v1/quotes" || url.pathname === "/v1/quotes/trending") {
    const limit = Number(url.searchParams.get("limit") ?? 20);
    const categories = url.searchParams.get("categories")?.split(",");
    const pool = categories ? quotes.filter((item) => categories.includes(item.category.key)) : quotes;
    return send(response, 200, { data: pool.slice(0, limit), meta: { ...meta, pagination: { limit, next_cursor: null, has_more: false } } });
  }
  const comment = url.pathname.match(/^\/v1\/quotes\/([^/]+)\/comments$/);
  if (comment) return send(response, 200, page(comments.map((item) => ({ ...item, quote_id: comment[1] })), meta));
  const single = url.pathname.match(/^\/v1\/quotes\/([^/]+)$/);
  if (single) {
    const item = quotes.find(({ id }) => id === single[1]);
    if (item) return send(response, 200, { data: item, meta });
    if (single[1].endsWith("00000000ff10")) {
      return send(response, 410, { error: { code: "QUOTE_REMOVED", status: 410, message: "這則說說已移除", details: { reason: "spam" }, request_id: "req_mock" } });
    }
    return send(response, 404, { error: { code: "QUOTE_NOT_FOUND", status: 404, message: "找不到這則說說", request_id: "req_mock" } });
  }
  if (url.pathname === "/v1/admin/cases") return send(response, 200, page(adminCases, meta));
  if (url.pathname.startsWith("/v1/admin/cases/")) {
    const [item] = adminCases;
    return send(response, 200, {
      data: {
        ...item,
        resolution: null,
        final_reason: null,
        target: { ...quotes[1], removed_reason: null, removed_at: null },
        reports: [{ reason: "spam", detail: "同一句貼了很多次", reporter_id: "00000000-0000-4000-a000-000000000003", is_discounted: false, created_at: "2026-10-28T02:00:00.000Z" }],
        subject: { user_id: ME_ID, username: "小明", standing, prior_violations: [], would_ban: false },
        audit: [],
      },
      meta,
    });
  }
  if (url.pathname === "/v1/me") return send(response, 200, { data: me, meta });
  if (url.pathname === "/v1/me/api-keys") return send(response, 200, { data: apiKeys, meta });
  if (url.pathname === "/v1/me/quote-states") return send(response, 200, { data: { states: {} }, meta });
  if (url.pathname === "/auth/v1/user") return send(response, 200, authUser);
  if (url.pathname.startsWith("/auth/v1/passkeys")) return send(response, 200, []);
  if (url.pathname === "/__reset") {
    drawn = 0;
    return send(response, 200, {});
  }
  return send(response, 404, { error: { code: "ROUTE_NOT_FOUND", status: 404, message: "找不到", request_id: "req_mock" } });
}).listen(Number(process.env.MOCK_PORT ?? 3999));
