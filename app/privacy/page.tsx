import { CalendarClock, Shield } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHead, PageShell } from "@/components/site-chrome";

export const metadata: Metadata = { title: "說說 · 隱私權政策" };

// Without revalidate the page is cached for a year, and the CDN would keep an outdated policy (M0 #7)
export const revalidate = 3600;

export default function PrivacyPage() {
  return (
    <PageShell className="legal">
      <article>
        <PageHead icon={Shield} title="隱私權政策">
          <p className="legal-updated">
            <CalendarClock aria-hidden="true" size={16} />
            最後更新：2026 年 11 月 3 日
          </p>
        </PageHead>
        <p>
          這一頁說明「說說」（shuoshuotw.xyz 與 api.shuoshuotw.xyz，以下稱本服務）收集哪些資料、怎麼使用、哪些會公開、保留多久，以及你能怎麼處理自己的資料。
        </p>

        <h2>收集的資料</h2>
        <dl className="legal-list">
          <dt>Email</dt>
          <dd>你用 Google、Discord 或 GitHub 登入時，由該服務提供。用於登入與識別帳號，只存放在登入系統，不會公開，也不會出現在 API 回應中。</dd>
          <dt>名稱與頭像</dt>
          <dd>取自你登入用的帳號，作為預設的使用者名稱與頭像。名稱可以在個人中心修改。</dd>
          <dt>Passkey</dt>
          <dd>只在你於安全設置加入時保存，內容是用來驗證的公鑰，不含你的生物特徵資料。</dd>
          <dt>你建立的內容</dt>
          <dd>你提交的說說、留言、按讚、收藏、檢舉與申訴。</dd>
          <dt>API Key</dt>
          <dd>完整金鑰只在建立當下顯示一次，本服務只保存無法還原的雜湊值。</dd>
          <dt>連線紀錄</dt>
          <dd>每個請求的時間、路徑、結果，以及你的使用者編號或 API Key 編號。IP 位址只以雜湊值記錄，用於限制請求頻率、防止濫用與排除故障。</dd>
          <dt>錯誤報告</dt>
          <dd>網站或 API 出錯時的技術資訊，會先移除登入憑證與 Cookie。</dd>
        </dl>

        <h2>公開的內容</h2>
        <ul>
          <li>你提交的說說與留言，會連同你的使用者名稱與頭像公開。任何人都能在網站上看到，也能透過 API 取得。</li>
          <li>
            你的公開個人頁 <code>/u/你的名稱</code> 會列出你提交的說說。<strong>你的按讚與收藏預設也是公開的</strong>，可以在
            <Link href="/me">個人中心</Link>的隱私設定分別關閉。關閉後只有你自己看得到。
          </li>
          <li>Email、檢舉內容、申訴內容與違規紀錄不會公開。違規紀錄只有你本人與管理員看得到。</li>
        </ul>

        <h2>Cookie 與瀏覽器儲存</h2>
        <ul>
          <li>登入後，瀏覽器會保存你的登入狀態（名稱以 <code>sb-</code> 開頭的 Cookie）。登出即刪除。</li>
          <li>登入時會暫存一個 Cookie，記住登入完成後要回到哪一頁，10 分鐘後失效。</li>
          <li>深色或淺色模式的偏好存在你的瀏覽器裡，不會送到伺服器。</li>
        </ul>
        <p>本服務不使用廣告或追蹤用的 Cookie，也沒有使用第三方流量分析工具。</p>

        <h2>第三方服務</h2>
        <p>本服務不出售任何資料。以下服務會因為提供功能而處理部分資料：</p>
        <dl className="legal-list">
          <dt>Supabase</dt>
          <dd>帳號登入與資料庫。</dd>
          <dt>Cloudflare</dt>
          <dd>網路傳輸、快取與防護，會看到你的 IP 位址。</dd>
          <dt>Sentry</dt>
          <dd>接收錯誤報告。</dd>
          <dt>Google、Discord、GitHub</dt>
          <dd>處理登入。你的頭像圖片也直接從這些服務載入。</dd>
          <dt>Emfont</dt>
          <dd>提供網站字型，你的瀏覽器載入字型時會連到該服務。</dd>
        </dl>

        <h2>保留期間</h2>
        <dl className="legal-list">
          <dt>帳號資料</dt>
          <dd>保留到你刪除帳號為止。</dd>
          <dt>說說與使用者名稱</dt>
          <dd>持續保留，刪除帳號後也不會移除。</dd>
          <dt>留言、按讚、收藏、頭像、API Key</dt>
          <dd>刪除帳號時一併刪除。</dd>
          <dt>檢舉說明與審核備註</dt>
          <dd>案件結案 1 年後清除文字內容。案件紀錄本身保留，用來判斷重複檢舉與違規次數。</dd>
          <dt>稽核紀錄</dt>
          <dd>保留 2 年。帳號刪除後，紀錄中不含可直接辨識你的資料。</dd>
          <dt>被停權帳號的 Email</dt>
          <dd>停權期間以無法還原的雜湊值保存，用來阻止同一個 Email 重新註冊。解除停權時刪除；刪除帳號不會解除。</dd>
          <dt>連線紀錄</dt>
          <dd>30 天。</dd>
          <dt>已撤銷的 API Key</dt>
          <dd>撤銷後 90 天刪除。</dd>
        </dl>

        <h2>刪除帳號</h2>
        <p>
          你可以在<Link href="/me/security">安全設置</Link>刪除帳號，即使有審核中的案件也可以。刪除後會登出所有裝置，並刪除你的留言、按讚、收藏、頭像與 API Key。
        </p>
        <p>
          <strong>你提交的說說會保留，並繼續以你的使用者名稱顯示，名稱旁會標示已刪除。</strong>
          如果你的名稱足以讓別人認出你，請在刪除帳號前先改名，或先刪除不想保留的說說。被檢舉且尚未結案的說說無法自行刪除。
        </p>
        <p>你送出的檢舉會保留，但不再與你的帳號關聯。之後用同一個第三方帳號登入，會建立一個新帳號。</p>

        <h2>你的權利</h2>
        <ul>
          <li>
            在<Link href="/me">個人中心</Link>查看與修改你的名稱、隱私設定與內容。
          </li>
          <li>隨時刪除自己的說說、留言與帳號。</li>
          <li>目前沒有資料匯出功能。</li>
        </ul>
        <p>
          其他問題請到 <a href="https://github.com/shuoshuotw">GitHub</a> 聯絡我們。
        </p>

        <h2>政策變更</h2>
        <p>
          本政策更新時，會修改本頁上方的日期。另請參閱<Link href="/terms">服務條款</Link>。
        </p>
      </article>
    </PageShell>
  );
}
