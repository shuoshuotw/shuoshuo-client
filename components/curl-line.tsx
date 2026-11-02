"use client";

import { Check, Copy } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { randomQuotePath } from "@/lib/api/client";
import { useQuoteStageStore } from "@/stores/quote-stage";

const PUBLIC_API = "https://api.shuoshuotw.xyz";

/** The command follows the type case above it, and its output is the quote on the sheet. */
export function CurlLine() {
  const categories = useQuoteStageStore((state) => state.categories);
  const current = useQuoteStageStore((state) => state.current);
  const [copied, setCopied] = useState(false);
  const command = `curl "${PUBLIC_API}${randomQuotePath({ categories }, "text")}"`;

  const copy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <section className="curl" data-reveal-group aria-labelledby="curl-title">
      <div className="curl-body">
        <h2 id="curl-title" className="section-title" data-reveal>
          一行指令取一句
        </h2>
        <p className="curl-note" data-reveal>
          在上面的字盤選了類別，這行指令就跟著改。不用註冊，複製到終端機就能跑。
        </p>
        <div className="terminal" data-reveal>
          {/* Focusable because it can scroll sideways on a phone */}
          <pre tabIndex={0}>
            <code>{command}</code>
          </pre>
          {current && (
            <pre className="terminal-output" data-testid="curl-output">
              <code>{current.content}</code>
            </pre>
          )}
          <button type="button" className="button terminal-copy" onClick={() => void copy()}>
            <span className="swap" data-swapped={copied} aria-hidden="true">
              <Copy />
              <Check />
            </span>
            {copied ? "已複製" : "複製指令"}
          </button>
        </div>
      </div>
      <figure className="curl-picture" data-reveal>
        <Image src="/images/metal-movable-type.jpg" alt="字盤上散放的鉛字，一支排字手盤裡已排好幾行" fill sizes="(min-width: 1024px) 40vw, 100vw" />
      </figure>
    </section>
  );
}
