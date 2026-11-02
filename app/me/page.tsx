"use client";

import Link from "next/link";
import { useState } from "react";
import { Field, FormError, useFormErrors } from "@/components/form";
import { MeGate } from "@/components/me-gate";
import { StandingCard } from "@/components/standing-card";
import { api } from "@/lib/api/browser";
import { failureMessage, type Me } from "@/lib/api/client";
import { countChars } from "@/lib/format";
import { notify } from "@/lib/toast";
import { useSessionStore } from "@/stores/session";

export default function MePage() {
  return (
    <MeGate>
      {(me) => (
        <>
          <h1 className="section-title">{me.username}</h1>
          {me.pending_notices.length > 0 && (
            <p className="banner" role="status">
              你有 {me.pending_notices.length} 筆處分通知。
              <Link className="text-link" href="/me/standing">
                查看內容與申訴
              </Link>
            </p>
          )}
          <StandingCard standing={me.standing} />
          <RenameForm me={me} />
          <PrivacySettings me={me} />
          <p>
            <Link className="text-link" href={`/u/${encodeURIComponent(me.username)}`}>
              查看我的公開頁
            </Link>
          </p>
        </>
      )}
    </MeGate>
  );
}

function RenameForm({ me }: { me: Me }) {
  const [username, setUsername] = useState(me.username);
  const [busy, setBusy] = useState(false);
  const { form, errors, formError, fail, failWith, clear } = useFormErrors({ USERNAME_TAKEN: "username" });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = username.trim().normalize("NFC");
    const length = countChars(name);
    if (length < 2 || length > 30 || !/^[\p{Script=Han}A-Za-z0-9_-]+$/u.test(name)) {
      fail({ username: "名稱須為 2 至 30 字，只能使用中文、英數、底線與連字號" });
      return;
    }
    if (name === me.username) return;
    setBusy(true);
    clear();
    try {
      useSessionStore.getState().setMe(await api<Me>("/v1/me", { method: "PATCH", body: { username: name } }));
      void notify("名稱已更新");
    } catch (failure) {
      failWith(failure);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel">
      <h2 className="block-title">使用者名稱</h2>
      <form className="form" ref={form} onSubmit={(event) => void submit(event)} noValidate>
        <Field label="名稱" error={errors.username} hint="改名後，你的說說與留言都會顯示新名稱，舊名稱可能被別人取用。">
          {(props) => <input {...props} className="input" value={username} onChange={(event) => setUsername(event.target.value)} />}
        </Field>
        <FormError>{formError}</FormError>
        <button type="submit" className="button" disabled={busy}>
          更新名稱
        </button>
      </form>
    </section>
  );
}

function PrivacySettings({ me }: { me: Me }) {
  const [busy, setBusy] = useState(false);

  const update = async (field: "likes_public" | "favorites_public", value: boolean) => {
    setBusy(true);
    try {
      useSessionStore.getState().setMe(await api<Me>("/v1/me", { method: "PATCH", body: { [field]: value } }));
      void notify("設定已更新，公開頁最多 5 分鐘後生效");
    } catch (failure) {
      void notify(failureMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel">
      <h2 className="block-title">公開清單</h2>
      <label className="check">
        <input type="checkbox" checked={me.likes_public} disabled={busy} onChange={(event) => void update("likes_public", event.target.checked)} />
        <span>公開我的按讚：{me.likes_public ? "別人看得到" : "只有我看得到"}</span>
      </label>
      <label className="check">
        <input type="checkbox" checked={me.favorites_public} disabled={busy} onChange={(event) => void update("favorites_public", event.target.checked)} />
        <span>公開我的收藏：{me.favorites_public ? "別人看得到" : "只有我看得到"}</span>
      </label>
    </section>
  );
}
