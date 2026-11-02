import Image from "next/image";
import Link from "next/link";

const DOCS_URL = "https://docs.shuoshuotw.xyz";

const SLIP = [
  {
    title: "不用註冊",
    rows: [
      ["隨機一句", "60 次／分"],
      ["依類別、長度篩選", "13 類"],
      ["JSON 或純文字", "format=text"],
    ],
  },
  {
    title: "登入後建立 API Key",
    rows: [
      ["每組金鑰的額度", "1,200 次／分"],
      ["同時持有", "最多 10 組"],
      ["金鑰明文", "只顯示一次"],
    ],
  },
  {
    title: "帶上金鑰寫入",
    rows: [
      ["提交與編輯說說", "quotes:write"],
      ["按讚與收藏", "reactions:write"],
      ["留言", "comments:write"],
    ],
  },
] as const;

const TEETH = 40;

// The tear-off edge of a receipt: a fixed tooth height, and teeth that divide whatever width the slip has
const TEAR_EDGE = `polygon(0 0, 100% 0, ${Array.from({ length: TEETH * 2 + 1 }, (_, index) => {
  const x = 100 - (index * 100) / (TEETH * 2);
  return `${x}% ${index % 2 ? "100%" : "calc(100% - 12px)"}`;
}).join(", ")})`;

/** Itinerary on a slip: the API's terms printed like a receipt. */
export function ApiSlip() {
  return (
    <section className="api" data-reveal-group aria-labelledby="api-title">
      <div className="api-intro">
        <h2 id="api-title" className="section-title" data-reveal>
          用 API 排上你的頁面
        </h2>
        <p data-reveal>只限每分鐘的頻率，不限總用量。範例有 curl、JavaScript 與 Python。</p>
        <p data-reveal>
          <a className="text-link" href={DOCS_URL}>
            閱讀 API 文件
          </a>
        </p>
        <figure className="api-picture" data-reveal>
          <Image src="/images/czcionki-drukarskie-xx-wiek.jpg" alt="幾枚放大的木活字與鉛活字，排在白色展台上" fill sizes="(min-width: 1024px) 36vw, 100vw" />
        </figure>
      </div>
      <div className="slip" data-reveal style={{ clipPath: TEAR_EDGE }}>
        {SLIP.map(({ title, rows }) => (
          <div className="slip-group" key={title}>
            <h3>{title}</h3>
            <dl>
              {rows.map(([what, value]) => (
                <div className="slip-row" key={what}>
                  <dt>{what}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
        <p className="slip-total">
          <span>取得的是一句說說</span>
          <span>一行指令</span>
        </p>
      </div>
    </section>
  );
}

export function SubmitInvite() {
  return (
    <section className="invite" data-reveal-group aria-labelledby="invite-title">
      <figure className="invite-picture" data-reveal>
        <Image src="/images/musee-de-l-imprimerie-de-nantes-131.jpg" alt="一塊用麻繩綑好的活字版，放在舊木工作台上" fill sizes="(min-width: 1024px) 58vw, 100vw" />
      </figure>
      <div className="invite-paper" data-reveal>
        <h2 id="invite-title" className="section-title">
          提交一句說說
        </h2>
        <ul className="invite-terms">
          <li>2 至 100 字的繁體中文</li>
          <li>選一個類別，寫上來源</li>
          <li>發布後 24 小時內可以編輯</li>
        </ul>
        <Link className="button button-primary" href="/submit">
          開始提交
        </Link>
      </div>
    </section>
  );
}

/** A second picture of the trade between the list and the API: the case itself. */
export function CasePlate() {
  return (
    <section className="plate" data-reveal-group aria-labelledby="plate-title">
      <figure className="plate-picture" data-reveal>
        <Image src="/images/type-case-with-movable-types-for-letterpress.jpg" alt="傾斜擺放的木製字盤，每一格裝著不同的活字" fill sizes="(min-width: 1024px) 60vw, 100vw" />
      </figure>
      <div className="plate-text">
        <h2 id="plate-title" className="section-title" data-reveal>
          十三個字盤
        </h2>
        <p data-reveal>動畫、漫畫、遊戲、音樂、文學、原創、影視、詩詞、網路、哲學、毒雞湯、AI，還有其他。每個字盤有自己的紙色，說說印在哪張紙上，一眼就看得出來。</p>
        <figure className="plate-engraving" data-reveal>
          <Image src="/images/chinese-movable-type-1313-ce.png" alt="元代王禎《農書》中的轉輪排字盤版畫，1313 年" fill sizes="240px" />
          <figcaption>轉輪排字盤，王禎《農書》，1313 年</figcaption>
        </figure>
      </div>
    </section>
  );
}
