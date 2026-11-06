"use client";

import { ScrollShadow } from "@heroui/react";
import { Check, CircleX, Flag, LogIn, MessageCircle, Pencil, Pin, PinOff, Send, Trash2, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useLayoutEffect, useRef, useState } from "react";
import { api } from "@/lib/api/browser";
import { type Comment, failureMessage } from "@/lib/api/client";
import { countChars, formatTime, withinMinutes } from "@/lib/format";
import { suspensionText } from "@/lib/labels";
import { notify } from "@/lib/toast";
import { usePagedList } from "@/lib/use-paged-list";
import { arrive, collapse, type Origin, resize, rowTops, textOrigin } from "@/motion/comment-arrive";
import { useSessionStore } from "@/stores/session";
import { Avatar } from "./avatar";
import { ConfirmButton } from "./confirm-button";
import { Field, FormError, useFormErrors } from "./form";
import { LinkButton } from "./link-button";
import { ListFooter } from "./list-footer";
import { Notice } from "./notice";
import { VerifiedMark } from "./verified";
import { ReportButton } from "./report-button";
import { Reveal } from "./reveal";
import { RetryNote, StateNote } from "./state-note";

const COMMENT_EDIT_MINUTES = 20;

function validate(content: string): Record<string, string> {
  const length = countChars(content);
  return length < 1 || length > 500 ? { content: "留言須為 1 至 500 字" } : {};
}

type Props = {
  quoteId: string;
  ownerId: string | null;
  /** In a dialog the dialog's own title names the section, and the comments scroll under the composer */
  dialog?: boolean;
};

export function CommentSection({ quoteId, ownerId, dialog = false }: Props) {
  const { items, setItems, status, hasMore, loadMore, reload } = usePagedList<Comment>(`/v1/quotes/${quoteId}/comments?limit=20`);
  const list = useRef<HTMLUListElement>(null);
  // The comment just posted, where its words were written and where the others stood, until it has arrived
  const arrival = useRef<{ id: string; from: Origin | null; before: Map<string, number> } | null>(null);

  useLayoutEffect(() => {
    const coming = arrival.current;
    const row = coming && list.current?.querySelector<HTMLElement>(`:scope > [data-id="${coming.id}"]`);
    if (!coming || !row) return;
    arrival.current = null;
    arrive(row, coming.from, coming.before);
  }, [items]);

  const posted = (comment: Comment, from: Origin | null) => {
    // The new comment goes in at the top of the list, so the list is taken back up to show it arrive
    const scroller = list.current?.closest<HTMLElement>(".comment-scroll");
    if (scroller) scroller.scrollTop = 0;
    arrival.current = { id: comment.id, from, before: rowTops(list.current) };
    setItems((current) => [...current.filter((item) => item.pinned_at), comment, ...current.filter((item) => !item.pinned_at)]);
  };

  const body = (
    <>
      <Reveal
        loading={status === "loading"}
        skeleton={
          <div className="comment-list" aria-busy="true">
            {[0, 1, 2].map((index) => (
              <div className="comment comment-skeleton" key={index} aria-hidden="true">
                <span className="avatar avatar-blank" />
                <span className="skeleton-lines">
                  <span />
                  <span />
                </span>
              </div>
            ))}
          </div>
        }
      >
        {status === "error" && items.length === 0 ? (
          <RetryNote title="留言沒有載入成功" onRetry={() => void reload()} />
        ) : items.length === 0 ? (
          <StateNote title="發表第一個想法？" icon={MessageCircle} large />
        ) : (
          <ul className="comment-list" ref={list}>
            {items.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                ownerId={ownerId}
                onChange={(next) => setItems((current) => current.map((item) => (item.id === next.id ? next : item)))}
                onRemove={() => setItems((current) => current.filter((item) => item.id !== comment.id))}
                onPinned={() => void reload()}
              />
            ))}
          </ul>
        )}
      </Reveal>
      <ListFooter status={status} hasMore={hasMore} empty={items.length === 0} loadMore={loadMore} auto={false} />
    </>
  );

  return (
    <section className="comments" aria-labelledby={dialog ? undefined : "comments-title"} aria-label={dialog ? "留言" : undefined}>
      {!dialog && (
        <h2 className="block-title comments-title" id="comments-title">
          <MessageCircle aria-hidden="true" size={22} />
          留言
        </h2>
      )}
      <CommentForm quoteId={quoteId} onPosted={posted} />
      {dialog ? (
        <ScrollShadow className="comment-scroll" size={40}>
          {body}
        </ScrollShadow>
      ) : (
        body
      )}
    </section>
  );
}

function CommentForm({ quoteId, onPosted }: { quoteId: string; onPosted: (comment: Comment, from: Origin | null) => void }) {
  const pathname = usePathname();
  const me = useSessionStore((state) => state.me);
  const id = useId();
  const field = useRef<HTMLTextAreaElement>(null);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const { form, errors, formError, fail, failWith, clear } = useFormErrors();

  if (!me) {
    return (
      <p className="comment-signin">
        <LogIn aria-hidden="true" size={18} />
        <span>
          <Link className="text-link" href={`/login?next=${encodeURIComponent(pathname)}`}>
            登入
          </Link>
          後即可留言。
        </span>
      </p>
    );
  }
  if (!me.standing.can_comment) {
    const banned = me.standing.status === "banned";
    return (
      <Notice
        icon={banned ? CircleX : TriangleAlert}
        tone={banned ? "danger" : "warning"}
        title="你目前無法留言"
        action={
          <LinkButton href="/me/standing" radius="full" variant="bordered" size="sm" data-magnet>
            查看原因
          </LinkButton>
        }
      >
        {banned ? "很抱歉，您的帳號已被系統停權" : suspensionText(me.standing, "留言")}
      </Notice>
    );
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const invalid = validate(content);
    if (Object.keys(invalid).length > 0) {
      fail(invalid);
      return;
    }
    setBusy(true);
    clear();
    try {
      const comment = await api<Comment>(`/v1/quotes/${quoteId}/comments`, { method: "POST", body: { content } });
      // Read while the words are still in the field: they leave from there for the list
      onPosted(comment, field.current ? textOrigin(field.current) : null);
      setContent("");
      field.current?.style.removeProperty("height");
      void notify("留言已送出");
    } catch (failure) {
      failWith(failure);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="form comment-form" ref={form} onSubmit={(event) => void submit(event)} noValidate>
      <div className="field" data-invalid={errors.content ? "true" : undefined}>
        <label className="sr-only" htmlFor={id}>
          寫下你的留言
        </label>
        {/* One line that grows with what is written, the button beside it */}
        <div className="comment-compose">
          <textarea
            ref={field}
            id={id}
            className="input comment-input"
            rows={1}
            placeholder="說點什麼......"
            aria-invalid={Boolean(errors.content)}
            aria-describedby={errors.content ? `${id}-error` : undefined}
            value={content}
            onChange={(event) => {
              setContent(event.target.value);
              grow(event.currentTarget);
            }}
            // Enter sends and Shift+Enter starts a new line; not while an input method is still composing a character
            onKeyDown={(event) => {
              if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
              event.preventDefault();
              if (!busy) event.currentTarget.form?.requestSubmit();
            }}
          />
          <button type="submit" className="button button-primary send-button" data-magnet disabled={busy}>
            <Send className="send-icon" aria-hidden="true" />
            送出
          </button>
        </div>
        {errors.content && (
          <p className="field-error" id={`${id}-error`}>
            {errors.content}
          </p>
        )}
      </div>
      <FormError>{formError}</FormError>
    </form>
  );
}

/** A field that is as tall as what is in it, up to the cap its stylesheet sets. */
function grow(element: HTMLTextAreaElement) {
  element.style.height = "auto";
  element.style.height = `${element.scrollHeight + element.offsetHeight - element.clientHeight}px`;
}

type ItemProps = {
  comment: Comment;
  ownerId: string | null;
  onChange: (comment: Comment) => void;
  onRemove: () => void;
  onPinned: () => void;
};

function CommentItem({ comment, ownerId, onChange, onRemove, onPinned }: ItemProps) {
  const me = useSessionStore((state) => state.me);
  const [editing, setEditing] = useState(false);
  const mine = me?.id === comment.user.id;
  const row = useRef<HTMLLIElement>(null);
  // The row's height as last drawn, so a change to or from the editor eases from it
  const height = useRef(0);
  const removed = useRef(false);

  useLayoutEffect(() => {
    const element = row.current;
    if (!element) return;
    const before = height.current;
    height.current = element.offsetHeight;
    if (before) resize(element, before);
  }, [editing, comment.content]);

  const togglePin = async () => {
    try {
      await api(`/v1/comments/${comment.id}/pin`, { method: comment.pinned_at ? "DELETE" : "PUT" });
      onPinned();
    } catch (failure) {
      void notify(failureMessage(failure), "failed");
    }
  };

  const remove = async () => {
    await api(`/v1/comments/${comment.id}`, { method: "DELETE" });
    removed.current = true;
    void notify("已刪除留言");
  };

  // Once the dialog is back in its button, the row folds away and only then leaves the list
  const leave = () => {
    if (removed.current) void collapse(row.current).then(onRemove);
  };

  return (
    <li ref={row} className="comment" data-id={comment.id} data-pinned={comment.pinned_at ? "true" : undefined}>
      <Avatar url={comment.user.avatar_url} name={comment.user.username} size={40} />
      <div className="comment-body">
        <p className="comment-head">
          <span className="verified-name">
            <Link className="text-link" href={`/u/${encodeURIComponent(comment.user.username)}`}>
              {comment.user.username}
            </Link>
            {comment.user.verified && <VerifiedMark />}
          </span>
          <time dateTime={comment.created_at}>{formatTime(comment.created_at)}</time>
          {comment.edited_at && <span>已編輯</span>}
          {comment.pinned_at && (
            <span className="comment-pin">
              <Pin aria-hidden="true" />
              已置頂
            </span>
          )}
        </p>
        {editing ? (
          <CommentEditor comment={comment} onDone={(next) => { if (next) onChange(next); setEditing(false); }} />
        ) : (
          <p className="comment-text">{comment.content}</p>
        )}
        {!editing && me && (
          <div className="comment-actions">
            {mine && withinMinutes(comment.created_at, COMMENT_EDIT_MINUTES) && (
              <button type="button" className="text-button" onClick={() => setEditing(true)}>
                <Pencil aria-hidden="true" />
                編輯
              </button>
            )}
            {mine && (
              <ConfirmButton
                label={
                  <>
                    <Trash2 aria-hidden="true" />
                    刪除
                  </>
                }
                title="刪除這則留言？"
                confirm="確定刪除"
                tone="question"
                onConfirm={remove}
                onClosed={leave}
              />
            )}
            {me.id === ownerId && (
              <button type="button" className="text-button" onClick={() => void togglePin()}>
                {comment.pinned_at ? <PinOff aria-hidden="true" /> : <Pin aria-hidden="true" />}
                {comment.pinned_at ? "取消置頂" : "置頂"}
              </button>
            )}
            {!mine && (
              <ReportButton path={`/v1/comments/${comment.id}/reports`} title="檢舉這則留言">
                <Flag aria-hidden="true" />
                檢舉
              </ReportButton>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

function CommentEditor({ comment, onDone }: { comment: Comment; onDone: (comment: Comment | null) => void }) {
  const [content, setContent] = useState(comment.content);
  const [busy, setBusy] = useState(false);
  const { form, errors, formError, fail, failWith, clear } = useFormErrors();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const invalid = validate(content);
    if (Object.keys(invalid).length > 0) {
      fail(invalid);
      return;
    }
    setBusy(true);
    clear();
    try {
      onDone(await api<Comment>(`/v1/comments/${comment.id}`, { method: "PATCH", body: { content } }));
    } catch (failure) {
      failWith(failure);
      setBusy(false);
    }
  };

  return (
    <form className="form comment-editor" ref={form} onSubmit={(event) => void submit(event)} noValidate>
      <Field label="編輯留言" error={errors.content}>
        {(props) => (
          <textarea
            {...props}
            className="input"
            rows={3}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            // As in the composer: Enter saves, Shift+Enter starts a new line, never mid-composition
            onKeyDown={(event) => {
              if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
              event.preventDefault();
              if (!busy) event.currentTarget.form?.requestSubmit();
            }}
          />
        )}
      </Field>
      <FormError>{formError}</FormError>
      <div className="dialog-actions">
        <button type="submit" className="button button-primary" disabled={busy}>
          <Check aria-hidden="true" />
          儲存
        </button>
        <button type="button" className="button" onClick={() => onDone(null)}>
          取消
        </button>
      </div>
    </form>
  );
}
