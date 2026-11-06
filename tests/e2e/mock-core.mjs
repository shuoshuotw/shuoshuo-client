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
  // The last one is 說說官方's, which the site vouches for
  submitter:
    index === QUOTES.length - 1
      ? { id: "00000000-0000-4000-a000-0000000000ff", username: "說說官方", avatar_url: null, deleted: false, verified: true }
      : { id: "00000000-0000-4000-a000-000000000002", username: "小明", avatar_url: null, deleted: false, verified: false },
  stats: { like_count: 12 + index, favorite_count: 3 + index, comment_count: index },
  status: "published",
  commit_from: "web",
  edited_at: null,
  created_at: `2026-10-${String(20 + index).padStart(2, "0")}T09:30:00.000Z`,
});

const quotes = QUOTES.map(quote);
let drawn = 0;
let suspensionAppealed = false;

const send = (response, status, body, type = "application/json; charset=utf-8") => {
  // Reflected: a literal * does not cover Authorization
  const headers = response.req.headers["access-control-request-headers"] ?? "*";
  response.writeHead(status, { "content-type": type, "access-control-allow-origin": "*", "access-control-allow-headers": headers, "access-control-allow-methods": "*" });
  response.end(typeof body === "string" ? body : JSON.stringify(body));
};

// The signed-in visitor of the UI-01 baselines. tests/e2e/session.ts holds the matching cookie, and this also stands in for Supabase Auth.
const ME_ID = "00000000-0000-4000-a000-000000000002";
const standing = { status: "active", suspended_until: null, strike_count: 0, strike_limit: 4, can_submit: true, can_comment: true };
const me = { id: ME_ID, username: "小明", avatar_url: null, likes_public: true, favorites_public: true, allow_permanent_api_keys: false, reduce_motion: false, roles: ["admin"], standing, pending_notices: [] };
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
  { id: "00000000-0000-4000-b000-000000000001", name: "我的部落格", key_prefix: "shuoshuo_test_AbCdEfGh", scopes: ["quotes:read"], expires_at: "2027-01-18T03:00:00.000Z", last_used_at: "2026-10-30T03:00:00.000Z", regenerated_at: null, created_at: "2026-10-20T03:00:00.000Z" },
  { id: "00000000-0000-4000-b000-000000000002", name: "每日一句機器人", key_prefix: "shuoshuo_test_IjKlMnOp", scopes: ["quotes:read", "reactions:write"], expires_at: null, last_used_at: null, regenerated_at: null, created_at: "2026-10-25T03:00:00.000Z" },
];
const comments = [
  { id: "00000000-0000-4000-c000-000000000001", user: { id: ME_ID, username: "小明", avatar_url: null, verified: false }, content: "這句我抄在筆記本的第一頁。", pinned_at: "2026-10-28T00:00:00.000Z", edited_at: null, created_at: "2026-10-27T02:00:00.000Z" },
  { id: "00000000-0000-4000-c000-000000000002", user: { id: "00000000-0000-4000-a000-0000000000ff", username: "說說官方", avatar_url: null, verified: true }, content: "第一次看到是在高中，現在讀起來又不一樣了。", pinned_at: null, edited_at: "2026-10-27T01:00:00.000Z", created_at: "2026-10-26T02:00:00.000Z" },
];
const subjectOf = (request) => {
  try {
    return JSON.parse(Buffer.from(request.headers.authorization.split(" ")[1].split(".")[1], "base64url").toString()).sub;
  } catch {
    return null;
  }
};
const page = (data, meta) =>({ data, meta: { ...meta, pagination: { limit: 20, next_cursor: null, has_more: false } } });

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
    const item = adminCases.find(({ id }) => url.pathname.endsWith(id)) ?? adminCases[0];
    return send(response, 200, {
      data: {
        ...item,
        resolution: null,
        final_reason: null,
        target: { ...quotes[1], removed_reason: null, removed_at: null },
        reports: [{ reason: "spam", detail: "同一句貼了很多次", reporter_id: "00000000-0000-4000-a000-000000000003", is_discounted: false, created_at: "2026-10-28T02:00:00.000Z" }],
        subject: { user_id: ME_ID, username: "小明", standing: { ...standing, status: "suspended", suspended_until: "2026-11-10T00:00:00.000Z", strike_count: 1, can_submit: false, can_comment: false }, prior_violations: [], would_ban: false },
        audit: [{ id: 1, actor_id: null, actor: null, actor_type: "system", action: "report.threshold_reached", target_type: "quote", target_id: item.target_id, metadata: { case_id: item.id }, request_id: null, created_at: "2026-10-28T02:00:00.000Z" }],
      },
      meta,
    });
  }
  // A profile whose likes are private (PV-03) and whose favourites are public
  const profile = url.pathname.match(/^\/v1\/users\/([^/]+)(\/quotes|\/likes|\/favorites)?$/);
  if (profile) {
    if (!profile[2]) return send(response, 200, { data: { id: ME_ID, username: decodeURIComponent(profile[1]), avatar_url: null, likes_public: false, favorites_public: true, quote_count: quotes.length, standing: decodeURIComponent(profile[1]) === "被停權" ? "banned" : "active", verified: decodeURIComponent(profile[1]) === "說說官方", created_at: "2026-10-01T00:00:00.000Z" }, meta });
    if (profile[2] === "/likes") return send(response, 403, { error: { code: "USER_LIKES_PRIVATE", status: 403, message: "此按讚清單為私人", request_id: "req_mock" } });
    if (profile[2] === "/favorites") return send(response, 200, page(quotes.map((quote) => ({ favorited_at: quote.created_at, quote })), meta));
    return send(response, 200, page(quotes, meta));
  }
  // A record with a bit of everything: a quote that brought a suspension, a comment taken down (no strike) and
  // appealed, and a ban given by hand and since lifted
  // The suspension is the one record left to appeal; an appeal sent for it (any body) is taken until /__reset
  if (url.pathname === "/v1/me/appeals" && request.method === "POST") {
    suspensionAppealed = true;
    return send(response, 201, { data: { id: "8a000000-0000-4000-a000-000000000002", target_type: "sanction", target_id: "5a000000-0000-4000-a000-000000000001", statement: "mock", status: "pending", decision_note: null, decided_at: null, created_at: new Date().toISOString() }, meta });
  }
  const suspension = { id: "5a000000-0000-4000-a000-000000000001", kind: "submit_suspension", source: "auto", reason: "確認違規（第 1 次）", starts_at: "2026-11-06T12:07:00.000Z", ends_at: "2026-11-13T12:07:00.000Z", lifted_at: null, appeal_status: suspensionAppealed ? "pending" : null };
  const ban = { id: "5a000000-0000-4000-a000-000000000002", kind: "account_ban", source: "manual", reason: "多次違規", starts_at: "2026-11-01T08:00:00.000Z", ends_at: null, lifted_at: "2026-11-02T08:00:00.000Z", appeal_status: "rejected" };
  const violations = [
    { id: "7a000000-0000-4000-a000-000000000001", quote_id: quotes[1].id, reason: "spam", counts_as_strike: true, overturned_at: null, created_at: suspension.starts_at, appeal_status: null, sanction: suspension, target: { type: "quote", content: quotes[1].content } },
    { id: "7a000000-0000-4000-a000-000000000002", quote_id: null, reason: "harassment", counts_as_strike: false, overturned_at: null, created_at: "2026-11-05T03:00:00.000Z", appeal_status: "pending", sanction: null, target: { type: "comment", content: "這則留言被移除了" } },
  ];
  const appeal = { id: "8a000000-0000-4000-a000-000000000001", target_type: "violation", target_id: violations[1].id, statement: "這則留言只是在引用原文，並沒有針對任何人。", status: "pending", decision_note: null, decided_at: null, created_at: "2026-11-05T05:00:00.000Z" };
  const answered = { id: "8a000000-0000-4000-a000-000000000003", target_type: "sanction", target_id: ban.id, statement: "我不認為這次的處分合理，那幾則都是引用的句子，並沒有違反任何規定。", status: "rejected", decision_note: "經查證確實多次張貼相同內容，維持原處分。", decided_at: "2026-11-02T09:00:00.000Z", created_at: "2026-11-01T10:00:00.000Z" };
  if (url.pathname === "/v1/me/violations") return send(response, 200, page(violations, meta));
  if (url.pathname === "/v1/me/sanctions") return send(response, 200, page([suspension, ban], meta));
  if (url.pathname === "/v1/me/appeals") return send(response, 200, page([appeal, answered], meta));
  if (url.pathname === "/v1/admin/appeals") {
    const status = url.searchParams.get("status") ?? "pending";
    return send(response, 200, page(status === "pending" ? [{ ...appeal, user_id: ME_ID, sanction: null, violation: violations[1] }] : [], meta));
  }
  if (url.pathname.startsWith("/v1/admin/users/")) {
    return send(response, 200, { data: { id: ME_ID, username: "小明", avatar_url: null, created_at: "2026-10-01T00:00:00.000Z", deleted_at: null, roles: ["admin"], quote_count: quotes.length, api_key_count: apiKeys.length, standing, violations: [], sanctions: [ban] }, meta });
  }
  if (url.pathname === "/v1/admin/audit-logs") {
    const actor = { id: ME_ID, username: "小明", avatar_url: null, deleted: false, created_at: "2026-10-01T00:00:00.000Z" };
    return send(response, 200, page([
      { id: 2, actor_id: ME_ID, actor, actor_type: "admin", action: "appeal.resolve", target_type: "appeal", target_id: appeal.id, metadata: { decision: "reject", sanction_lifted: false, target_restored: false }, request_id: "req_mock", created_at: "2026-11-06T12:50:00.000Z" },
      { id: 1, actor_id: null, actor: null, actor_type: "system", action: "report.threshold_reached", target_type: "quote", target_id: quotes[1].id, metadata: { case_id: adminCases[0].id }, request_id: null, created_at: "2026-11-06T12:29:00.000Z" },
    ], meta));
  }
  // A token for anyone but 小明 (tests/e2e/session.ts) is an ordinary reader, not an admin
  if (url.pathname === "/v1/me") return send(response, 200, { data: subjectOf(request) && subjectOf(request) !== ME_ID ? { ...me, roles: [] } : me, meta });
  if (url.pathname === "/v1/me/api-keys") return send(response, 200, { data: apiKeys, meta });
  if (url.pathname === "/v1/me/quote-states") return send(response, 200, { data: { states: {} }, meta });
  if (url.pathname === "/v1/me/likes") return send(response, 200, page(quotes.map((quote) => ({ liked_at: quote.created_at, quote })), meta));
  if (url.pathname === "/v1/me/favorites") return send(response, 200, page(quotes.map((quote) => ({ favorited_at: quote.created_at, quote })), meta));
  if (url.pathname === "/auth/v1/user") return send(response, 200, authUser);
  if (url.pathname.startsWith("/auth/v1/passkeys")) return send(response, 200, []);
  if (url.pathname === "/__reset") {
    drawn = 0;
    suspensionAppealed = false;
    return send(response, 200, {});
  }
  return send(response, 404, { error: { code: "ROUTE_NOT_FOUND", status: 404, message: "找不到", request_id: "req_mock" } });
}).listen(Number(process.env.MOCK_PORT ?? 3999));
