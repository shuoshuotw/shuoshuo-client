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
  response.writeHead(status, { "content-type": type, "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" });
  response.end(typeof body === "string" ? body : JSON.stringify(body));
};

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
  if (url.pathname === "/v1/quotes") {
    const limit = Number(url.searchParams.get("limit") ?? 20);
    return send(response, 200, { data: quotes.slice(0, limit), meta: { ...meta, pagination: { limit, next_cursor: null, has_more: false } } });
  }
  if (url.pathname === "/__reset") {
    drawn = 0;
    return send(response, 200, {});
  }
  return send(response, 404, { error: { code: "ROUTE_NOT_FOUND", status: 404, message: "找不到", request_id: "req_mock" } });
}).listen(Number(process.env.MOCK_PORT ?? 3999));
