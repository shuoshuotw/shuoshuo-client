import { CalendarClock, FileText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHead, PageShell } from "@/components/site-chrome";

export const metadata: Metadata = { title: "說說 · 服務條款" };

// Without revalidate the page is cached for a year, and the CDN would keep outdated terms (M0 #7)
export const revalidate = 3600;

const DOCS_URL = "https://docs.shuoshuotw.xyz";

export default function TermsPage() {
  return (
    <PageShell className="legal">
      <article>
        <PageHead icon={FileText} title="服務條款">
          <p className="legal-updated">
            <CalendarClock aria-hidden="true" size={16} />
            最後更新：2026 年 11 月 3 日
          </p>
        </PageHead>
        <p>
          「說說」（shuoshuotw.xyz 與 api.shuoshuotw.xyz，以下稱本服務）是分享繁體中文短句的平台，提供網站與公開 API。使用本服務，即表示你同意以下條款與
          <Link href="/privacy">隱私權政策</Link>。
        </p>

        <h2>帳號</h2>
        <ul>
          <li>瀏覽與呼叫公開 API 不需要帳號。提交、留言、按讚、收藏與檢舉需要用 Google、Discord 或 GitHub 登入。</li>
          <li>你可以在安全設置加入 Passkey，但至少要保留一個第三方帳號，作為遺失 Passkey 時的復原方式。</li>
          <li>請妥善保管你的帳號與 API Key。API Key 外洩時，請立刻到個人中心重新產生或刪除。</li>
          <li>不得用新帳號或多個帳號規避處分。</li>
        </ul>

        <h2>你提交的內容</h2>
        <ul>
          <li>說說提交後立即公開，不經事前審核。</li>
          <li>請只提交你有權分享的內容；知道出處時，請一併填寫。</li>
          <li>你同意本服務在網站與 API 上展示並提供你提交的說說與留言，其他人與第三方程式都可以讀取。</li>
          <li>說說提交後 24 小時內可以修改，但不能改成另一句話。被檢舉且尚未結案的說說不能修改或刪除。</li>
          <li>說說的內容由提交者負責，不代表本服務的立場。</li>
          <li>刪除帳號後，你提交的說說會保留並繼續顯示你的使用者名稱，詳見隱私權政策。</li>
        </ul>

        <h2>不允許的內容與行為</h2>
        <ul>
          <li>騷擾、仇恨言論、性內容、暴力內容。</li>
          <li>公開他人的個人資料。</li>
          <li>垃圾內容與廣告。</li>
          <li>不實資訊，例如捏造的出處。</li>
          <li>非繁體中文的內容。</li>
          <li>攻擊或干擾本服務，例如繞過頻率限制、大量自動提交，或嘗試存取他人的帳號。</li>
        </ul>

        <h2>檢舉與處分</h2>
        <ul>
          <li>登入的使用者可以檢舉說說與留言。同一句說說被 3 位以上的使用者檢舉時，會暫時移出隨機推薦並等待審核；7 天內沒有處理會自動恢復。</li>
          <li>只有管理員能判定違規。確認違規的說說會被移除，並依累計次數處分：</li>
        </ul>
        <dl className="legal-list">
          <dt>第 1 次</dt>
          <dd>暫停提交 7 天。</dd>
          <dt>第 2 次</dt>
          <dd>暫停提交 30 天。</dd>
          <dt>第 3 次</dt>
          <dd>暫停提交 90 天。</dd>
          <dt>第 4 次</dt>
          <dd>永久停權，並撤銷你所有的 API Key。停權後不能用同一個 Email 重新註冊。</dd>
        </dl>
        <ul>
          <li>違規的留言只會被移除，不計入次數。</li>
          <li>情節嚴重時，管理員可以直接處分。</li>
          <li>
            你可以在<Link href="/me/standing">違規與申訴</Link>查看違規紀錄，每項處分可以申訴一次。申訴成立時，處分會解除，被移除的內容也會恢復。
          </li>
          <li>如果你認為某句說說侵害了你的權利，請使用檢舉並說明情況。</li>
        </ul>

        <h2>使用 API</h2>
        <ul>
          <li>
            請遵守<a href={`${DOCS_URL}/rate-limits`}>頻率限制</a>。
          </li>
          <li>
            說說與留言是使用者提交的純文字。在你的網站或程式中顯示時，必須自行跳脫，詳見<a href={`${DOCS_URL}/security`}>安全</a>。
          </li>
          <li>不得用 API 規避處分，或以自動化方式大量寫入。</li>
          <li>
            API 的變更會記錄在<a href={`${DOCS_URL}/changelog`}>版本紀錄</a>。
          </li>
        </ul>

        <h2>免責聲明</h2>
        <p>本服務依現況提供，不保證不中斷、不出錯，也不保證說說的內容正確或出處無誤。</p>

        <h2>服務與條款的變更</h2>
        <p>本服務可能調整或停止部分功能。條款更新時，會修改本頁上方的日期；更新後繼續使用本服務，即表示你同意新的條款。</p>
      </article>
    </PageShell>
  );
}
