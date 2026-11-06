"use client";

import { Button, Textarea } from "@heroui/react";
import { PenLine, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api/browser";
import { failureMessage, fieldMessages, type Me, type Quote } from "@/lib/api/client";
import { countChars } from "@/lib/format";
import { notify } from "@/lib/toast";
import { prefersReduced } from "@/motion/log";
import { BarredNote } from "./barred-note";
import { Digits } from "./digits";
import { useFormErrors } from "./form";
import { DRAFT_KEY } from "./home-sections";
import { Bracket } from "./logo";
import { MeGate } from "./me-gate";
import { emptyDraft, QUOTE_ERROR_FIELDS, QuoteFields, type QuoteDraft, validateQuote } from "./quote-form";
import { type SendPhase, SendStatus } from "./send-status";
import { PageHead } from "./site-chrome";

const LIMIT = 100;

export function SubmitForm() {
  return (
    <MeGate>
      {(me) =>
        me.standing.can_submit ? (
          <Composer me={me} />
        ) : (
          <>
            <PageHead icon={PenLine} title="提交一句" />
            <BarredNote standing={me.standing} />
          </>
        )
      }
    </MeGate>
  );
}

/** A sentence begun on the home page's invitation. Read here, cleared once the composer is up. */
function homeDraft(): QuoteDraft {
  try {
    return { ...emptyDraft, content: sessionStorage.getItem(DRAFT_KEY) ?? "" };
  } catch {
    return emptyDraft;
  }
}

/**
 * The home page's invitation, carried on: the sentence is written straight into the brackets in the quote's own
 * hand, signed with the writer's name and where it comes from as they fill it in. The rest waits in a sheet below.
 */
function Composer({ me }: { me: Me }) {
  const router = useRouter();
  const [draft, setDraft] = useState<QuoteDraft>(homeDraft);
  useEffect(() => {
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {}
  }, []);
  const [focused, setFocused] = useState(false);
  const [phase, setPhase] = useState<SendPhase>("idle");
  const { form, errors, fail, failWith, clear } = useFormErrors(QUOTE_ERROR_FIELDS);
  const length = countChars(draft.content);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (phase !== "idle") return;
    // Every message is a toast; the fields only turn red and shake
    const invalid = validateQuote(draft);
    if (Object.keys(invalid).length > 0) {
      fail(invalid);
      for (const message of Object.values(invalid)) void notify(message, "failed");
      return;
    }
    clear();
    setPhase("sending");
    // M-08 plays on the card, so the page goes back up to it while everything below folds away
    document.getElementById("app-scroll")?.scrollTo({ top: 0, behavior: prefersReduced() ? "auto" : "smooth" });
    try {
      await api<Quote>("/v1/quotes", { method: "POST", body: draft });
    } catch (failure) {
      setPhase("idle");
      failWith(failure);
      const fields = Object.values(fieldMessages(failure));
      for (const message of fields.length > 0 ? fields : [failureMessage(failure)]) void notify(message, "failed");
      return;
    }
    setPhase("done");
    // M-08: the tick is drawn on the card, the card lifts away, and the writer is taken home
    await new Promise((resolve) => setTimeout(resolve, prefersReduced() ? 400 : 900));
    await leave(form.current);
    router.push("/");
    void notify("說說已送出");
  };

  return (
    <form className="form submit-form" ref={form} data-phase={phase} aria-busy={phase !== "idle"} onSubmit={(event) => void submit(event)} noValidate>
      <PageHead icon={PenLine} title="提交一句" />
      <div className="composer submit-composer" data-empty={!draft.content} data-focused={focused} data-invalid={errors.content ? "true" : undefined}>
        <div className="composer-frame">
          <Bracket />
          <p className="quote composer-ghost" aria-hidden="true">
            留下屬於你的一句話
            <span className="caret caret-blink" />
          </p>
          <Textarea
            aria-label="說說"
            value={draft.content}
            onValueChange={(content) => setDraft({ ...draft, content })}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            // The frame around it turns red (data-invalid); HeroUI's own invalid fill would flood the brackets
            aria-invalid={Boolean(errors.content)}
            minRows={1}
            maxRows={5}
            classNames={{ base: "composer-field", inputWrapper: "composer-wrap", innerWrapper: "composer-inner", input: "composer-input" }}
          />
          <Bracket end />
        </div>
        <div className="composer-foot">
          <p className="credit">
            <span aria-hidden="true">—— </span>
            {me.username}
            <span aria-hidden="true">‧</span>
            {draft.source_from.trim() || "來自何處？"}
          </p>
          <span className="composer-count" data-short={length > LIMIT || (length > 0 && length < 2)}>
            <Digits value={length} /> / {LIMIT}
          </span>
        </div>
        <SendStatus phase={phase} />
      </div>
      {/* Folds shut while the card is being sent, and opens again if it fails */}
      <div className="submit-fold" inert={phase !== "idle"}>
        <div className="submit-fold-inner">
          <div className="submit-details">
            <QuoteFields draft={draft} errors={errors} onChange={setDraft} withContent={false} quietErrors />
          </div>
          <div className="submit-actions">
            <Button type="submit" color="primary" radius="full" size="lg" data-magnet className="send-button" startContent={<Send className="send-icon" aria-hidden="true" size={18} />}>
              送出
            </Button>
          </div>
        </div>
      </div>
      <p className="sr-only" role="status">
        {phase === "sending" ? "送出中" : phase === "done" ? "已送出，正在回到首頁" : ""}
      </p>
    </form>
  );
}

/** Once the tick is drawn the title and the card lift away together, the card a moment after. */
function leave(form: HTMLFormElement | null) {
  if (!form || prefersReduced()) return Promise.resolve();
  const parts = [...form.querySelectorAll<HTMLElement>(":scope > .page-head, :scope > .submit-composer")];
  const moves = parts.map((part, index) =>
    part.animate(
      [
        { opacity: 1, transform: "none" },
        { opacity: 0, transform: "translateY(-18px) scale(0.97)" },
      ],
      { duration: 380, delay: index * 70, easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards" },
    ),
  );
  return Promise.all(moves.map((move) => move.finished)).then(
    () => undefined,
    () => undefined,
  );
}
