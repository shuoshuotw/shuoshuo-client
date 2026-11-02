"use client";

import { Pin } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api/browser";
import { type Comment, failureMessage } from "@/lib/api/client";
import { countChars, formatTime, withinMinutes } from "@/lib/format";
import { notify } from "@/lib/toast";
import { usePagedList } from "@/lib/use-paged-list";
import { useSessionStore } from "@/stores/session";
import { Avatar } from "./avatar";
import { ConfirmButton } from "./confirm-button";
import { Field, FormError, useFormErrors } from "./form";
import { ListFooter } from "./list-footer";
import { ReportButton } from "./report-button";
import { RetryNote, StateNote } from "./state-note";

const COMMENT_EDIT_MINUTES = 20;

function validate(content: string): Record<string, string> {
  const length = countChars(content);
  return length < 1 || length > 500 ? { content: "留言須為 1 至 500 字" } : {};
}

type Props = { quoteId: string; ownerId: string | null };

export function CommentSection({ quoteId, ownerId }: Props) {
  const { items, setItems, status, hasMore, loadMore, reload } = usePagedList<Comment>(`/v1/quotes/${quoteId}/comments?limit=20`);

  return (
    <section className="comments" aria-labelledby="comments-title">
      <h2 className="block-title" id="comments-title">
        留言
      </h2>
      <CommentForm quoteId={quoteId} onPosted={(comment) => setItems((current) => [...current.filter((item) => item.pinned_at), comment, ...current.filter((item) => !item.pinned_at)])} />
      {status === "loading" ? (
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
      ) : status === "error" && items.length === 0 ? (
        <RetryNote title="留言沒有載入成功" onRetry={() => void reload()} />
      ) : items.length === 0 ? (
        <StateNote title="還沒有人留言" />
      ) : (
        <ul className="comment-list">
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
      <ListFooter status={status} hasMore={hasMore} empty={items.length === 0} loadMore={loadMore} auto={false} />
    </section>
  );
}

function CommentForm({ quoteId, onPosted }: { quoteId: string; onPosted: (comment: Comment) => void }) {
  const pathname = usePathname();
  const me = useSessionStore((state) => state.me);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const { form, errors, formError, fail, failWith, clear } = useFormErrors();

  if (!me) {
    return (
      <p className="comment-signin">
        <Link className="text-link" href={`/login?next=${encodeURIComponent(pathname)}`}>
          登入
        </Link>
        後即可留言。
      </p>
    );
  }
  if (!me.standing.can_comment) return <p className="banner">你的帳號目前無法留言。</p>;

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
      onPosted(await api<Comment>(`/v1/quotes/${quoteId}/comments`, { method: "POST", body: { content } }));
      setContent("");
      void notify("留言已送出");
    } catch (failure) {
      failWith(failure);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="form" ref={form} onSubmit={(event) => void submit(event)} noValidate>
      <Field label="寫下你的留言" error={errors.content}>
        {(props) => <textarea {...props} className="input" rows={3} value={content} onChange={(event) => setContent(event.target.value)} />}
      </Field>
      <FormError>{formError}</FormError>
      <button type="submit" className="button button-primary" disabled={busy}>
        送出留言
      </button>
    </form>
  );
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

  const togglePin = async () => {
    try {
      await api(`/v1/comments/${comment.id}/pin`, { method: comment.pinned_at ? "DELETE" : "PUT" });
      onPinned();
    } catch (failure) {
      void notify(failureMessage(failure));
    }
  };

  const remove = async () => {
    await api(`/v1/comments/${comment.id}`, { method: "DELETE" });
    onRemove();
    void notify("已刪除留言");
  };

  return (
    <li className="comment" data-pinned={comment.pinned_at ? "true" : undefined}>
      <Avatar url={comment.user.avatar_url} name={comment.user.username} size={40} />
      <div className="comment-body">
        <p className="comment-head">
          <Link className="text-link" href={`/u/${encodeURIComponent(comment.user.username)}`}>
            {comment.user.username}
          </Link>
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
                編輯
              </button>
            )}
            {mine && <ConfirmButton label="刪除" title="刪除這則留言" body="刪除後無法復原。" confirm="確定刪除" onConfirm={remove} />}
            {me.id === ownerId && (
              <button type="button" className="text-button" onClick={() => void togglePin()}>
                {comment.pinned_at ? "取消置頂" : "置頂"}
              </button>
            )}
            {!mine && (
              <ReportButton path={`/v1/comments/${comment.id}/reports`} title="檢舉這則留言">
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
    <form className="form" ref={form} onSubmit={(event) => void submit(event)} noValidate>
      <Field label="編輯留言" error={errors.content}>
        {(props) => <textarea {...props} className="input" rows={3} value={content} onChange={(event) => setContent(event.target.value)} />}
      </Field>
      <FormError>{formError}</FormError>
      <div className="dialog-actions">
        <button type="submit" className="button button-primary" disabled={busy}>
          儲存
        </button>
        <button type="button" className="button" onClick={() => onDone(null)}>
          取消
        </button>
      </div>
    </form>
  );
}
