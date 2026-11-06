"use client";

import { Textarea } from "@heroui/react";
import { ArrowRight, PenLine } from "lucide-react";
import { useState } from "react";
import { useSessionStore } from "@/stores/session";
import { Digits } from "./digits";
import { LinkButton } from "./link-button";
import { Bracket } from "./logo";

// The submit page picks this up and starts from it (SubmitForm)
export const DRAFT_KEY = "shuoshuo:draft";
const LIMIT = 100;

/**
 * The invitation is the stage turned round: the same brackets and type, empty and waiting for the visitor's own
 * sentence, with a blinking caret where it will go. What they write is carried to /submit.
 */
export function SubmitInvite() {
  const me = useSessionStore((state) => state.me);
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const length = Array.from(text.trim()).length;

  const keep = () => {
    try {
      if (text.trim()) sessionStorage.setItem(DRAFT_KEY, text.trim());
    } catch {}
  };

  return (
    <section className="invite" aria-labelledby="invite-title">
      <div className="invite-head">
        <h2 id="invite-title" className="section-title">
          現在，換你說說
        </h2>
        <p>你說，你有多久沒有被一句話所感動了？</p>
      </div>

      <div className="composer" data-empty={!text} data-focused={focused}>
        <div className="composer-frame">
          <Bracket />
          {/* Stands in the frame until the visitor writes; aria-hidden, the field's label already says what goes here */}
          <p className="quote composer-ghost" aria-hidden="true">
            留下屬於你的一句話
            <span className="caret caret-blink" />
          </p>
          <Textarea
            aria-label="你的那一句"
            value={text}
            onValueChange={setText}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            maxLength={LIMIT}
            minRows={1}
            maxRows={4}
            classNames={{ base: "composer-field", inputWrapper: "composer-wrap", innerWrapper: "composer-inner", input: "composer-input" }}
          />
          <Bracket end />
        </div>
        <div className="composer-foot">
          <p className="credit">
            <span aria-hidden="true">—— </span>
            {me?.username ?? "你"}
            <span aria-hidden="true">‧</span>來自何處？
          </p>
          <span className="composer-count" data-short={length > 0 && length < 2}>
            <Digits value={length} /> / {LIMIT}
          </span>
          <LinkButton
            href="/submit"
            color="primary"
            radius="full"
            size="lg"
            data-magnet
            startContent={text.trim() ? undefined : <PenLine aria-hidden="true" size={18} />}
            endContent={text.trim() ? <ArrowRight aria-hidden="true" size={18} /> : undefined}
            onPress={keep}
          >
            {text.trim() ? "繼續完成" : "開始提交"}
          </LinkButton>
        </div>
      </div>
    </section>
  );
}
