// Same order as the seeded `categories` table. Static so the type case renders without waiting on the API.
export const CATEGORIES = [
  { key: "anime", name: "動畫" },
  { key: "manga", name: "漫畫" },
  { key: "game", name: "遊戲" },
  { key: "music", name: "音樂" },
  { key: "literature", name: "文學" },
  { key: "original", name: "原創" },
  { key: "flim", name: "影視" },
  { key: "poetry", name: "詩詞" },
  { key: "internet", name: "網路" },
  { key: "philosophy", name: "哲學" },
  { key: "anti-motiv", name: "毒雞湯" },
  { key: "ai", name: "AI" },
  { key: "other", name: "其他" },
] as const;

export type CategoryKey = (typeof CATEGORIES)[number]["key"];
