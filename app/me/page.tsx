"use client";

import { Switch } from "@heroui/react";
import type { UserIdentity } from "@supabase/supabase-js";
import { ArrowRight, ArrowUpRight, BellRing, Check, CircleUserRound, Eye, LogOut, PenLine, PersonStanding, UserRound, UserRoundPen } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Avatar } from "@/components/avatar";
import { ConfirmButton } from "@/components/confirm-button";
import { ChoiceField, Field, FormError, useFormErrors } from "@/components/form";
import { LinkButton } from "@/components/link-button";
import { MARKS, PROVIDERS } from "@/components/login-panel";
import { MeGate } from "@/components/me-gate";
import { Notice } from "@/components/notice";
import { PageHead } from "@/components/site-chrome";
import { StandingCard } from "@/components/standing-card";
import { RetryNote } from "@/components/state-note";
import { api, browserAuth } from "@/lib/api/browser";
import { ApiFailure, failureMessage, type Me } from "@/lib/api/client";
import { countChars } from "@/lib/format";
import { applyMotionReduced, useMotionReduced } from "@/lib/motion-pref";
import { notify } from "@/lib/toast";
import { useSessionStore } from "@/stores/session";

export default function MePage() {
  return (
    <MeGate>
      {(me) => (
        <>
          <PageHead icon={UserRound} title="我的帳號" />
          {me.pending_notices.length > 0 && (
            <Notice
              icon={BellRing}
              title={`你有 ${me.pending_notices.length} 筆處分通知`}
              action={
                <LinkButton href="/me/standing" radius="full" variant="bordered" data-magnet endContent={<ArrowRight aria-hidden="true" size={18} />}>
                  查看內容與申訴
                </LinkButton>
              }
            >
              請查看處分的內容；如果你認為判斷有誤，可以提出申訴。
            </Notice>
          )}
          <AvatarPicker me={me} />
          <div className="account-grid">
            <StandingCard standing={me.standing} />
            <RenameForm me={me} />
            <PrivacySettings me={me} />
            <MotionSetting />
          </div>
          <div className="account-foot">
            <LinkButton
              href={`/u/${encodeURIComponent(me.username)}`}
              target="_blank"
              rel="noopener"
              radius="full"
              variant="bordered"
              data-magnet
              endContent={<ArrowUpRight aria-hidden="true" size={18} />}
            >
              查看我的公開頁
            </LinkButton>
            <SignOutHere />
          </div>
        </>
      )}
    </MeGate>
  );
}

type Provider = (typeof PROVIDERS)[number]["key"];
type Source = { key: Provider; name: string; url: string | null };

/** The picture each linked sign-in gave this account, as Supabase Auth keeps it. */
function pictureOf(identity: UserIdentity | undefined) {
  const data = identity?.identity_data;
  const url = data?.avatar_url ?? data?.picture;
  return typeof url === "string" ? url : null;
}

/**
 * §8.7.1: the picture shown beside the name is one of the linked sign-ins' own, or none (the name's first character).
 * Core reads the picture from Auth itself; this only names the provider.
 */
function AvatarPicker({ me }: { me: Me }) {
  const [sources, setSources] = useState<Source[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<Provider | "none" | null>(null);
  // Set by a choice made here, so going back to the picture the page opened with animates too
  const [changed, setChanged] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    const auth = await browserAuth();
    const { data, error } = await auth.getUserIdentities();
    if (error) {
      setFailed(true);
      return;
    }
    setSources(
      PROVIDERS.flatMap(({ key, name }) => {
        const identity = data.identities.find(({ provider }) => provider === key);
        return identity ? [{ key, name, url: pictureOf(identity) }] : [];
      }),
    );
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const choose = async (provider: Provider | null) => {
    setBusy(provider ?? "none");
    try {
      const next = await api<Me>("/v1/me", { method: "PATCH", body: { avatar_provider: provider } });
      setChanged(true);
      useSessionStore.getState().setMe(next);
      void notify("頭貼已更新");
    } catch (failure) {
      void notify(failureMessage(failure), "failed");
    } finally {
      setBusy(null);
    }
  };

  const current = me.avatar_url === null ? "none" : sources?.find(({ url }) => url === me.avatar_url)?.key;

  return (
    <section className="panel avatar-panel">
      <h2 className="block-title">
        <CircleUserRound aria-hidden="true" />
        頭貼
      </h2>
      <div className="avatar-now">
        {/* A new picture pops in where the old one was */}
        <span key={me.avatar_url ?? "none"} className="avatar-pop" data-changed={changed || undefined}>
          <Avatar url={me.avatar_url} name={me.username} size={72} />
        </span>
        <div>
          <p className="avatar-name">{me.username}</p>
          <p className="field-hint">頭貼取自你綁定的登入方式，綁定更多方式就有更多選擇。</p>
        </div>
      </div>
      {failed ? (
        <RetryNote title="登入方式沒有載入成功" onRetry={() => void load()} />
      ) : (
        <div className="avatar-options" role="radiogroup" aria-label="頭貼來源" aria-busy={!sources}>
          {(sources ?? []).map(({ key, name, url }) => (
            <button
              key={key}
              type="button"
              role="radio"
              className="avatar-option"
              data-magnet
              aria-checked={current === key}
              disabled={!url || busy !== null}
              onClick={() => void choose(key)}
            >
              <Picked on={current === key} changed={changed}>
                <Avatar url={url} name={name} size={40} />
              </Picked>
              <span className="avatar-option-label">
                {MARKS[key]}
                {url ? name : `${name}（沒有頭貼）`}
              </span>
            </button>
          ))}
          <button
            type="button"
            role="radio"
            className="avatar-option"
            data-magnet
            aria-checked={current === "none"}
            disabled={busy !== null}
            onClick={() => void choose(null)}
          >
            <Picked on={current === "none"} changed={changed}>
              <Avatar url={null} name={me.username} size={40} />
            </Picked>
            <span className="avatar-option-label">不使用頭貼</span>
          </button>
        </div>
      )}
    </section>
  );
}

/** The chosen picture carries a tick; one chosen just now draws it in. */
function Picked({ on, changed, children }: { on: boolean; changed: boolean; children: React.ReactNode }) {
  return (
    <span className="avatar-picked">
      {children}
      {on && (
        <span className="avatar-tick" data-draw={changed || undefined} aria-hidden="true">
          <Check className="check-draw" size={12} strokeWidth={3} />
        </span>
      )}
    </span>
  );
}

function RenameForm({ me }: { me: Me }) {
  const [username, setUsername] = useState(me.username);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const { form, errors, formError, fail, failWith, clear } = useFormErrors({ USERNAME_TAKEN: "username" });

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 1800);
    return () => clearTimeout(timer);
  }, [saved]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = username.trim().normalize("NFC");
    const length = countChars(name);
    if (length < 2 || length > 30 || !/^[\p{Script=Han}A-Za-z0-9_-]+$/u.test(name)) {
      fail({ username: "名稱須為 2 至 30 字，只能使用中文、英數、底線與連字號" });
      return;
    }
    // A deleted account's name is shown with （已刪除） after it; Core refuses these words too
    if (name.includes("已刪除")) {
      fail({ username: "名稱不可包含「已刪除」" });
      return;
    }
    if (name === me.username) return;
    setBusy(true);
    clear();
    try {
      useSessionStore.getState().setMe(await api<Me>("/v1/me", { method: "PATCH", body: { username: name } }));
      setSaved(true);
      void notify("名稱已更新");
    } catch (failure) {
      failWith(failure);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel">
      <h2 className="block-title">
        <UserRoundPen aria-hidden="true" />
        使用者名稱
      </h2>
      <form className="form" ref={form} onSubmit={(event) => void submit(event)} noValidate>
        <div className="rename-field" data-saved={saved || undefined}>
          <Field label="名稱" error={errors.username} hint="新名稱的顯示可能依據網路情況而有所延遲">
            {(props) => <input {...props} className="input" value={username} onChange={(event) => setUsername(event.target.value)} />}
          </Field>
        </div>
        <FormError>{formError}</FormError>
        {/* Once saved, the check takes the pen's place and the word turns to 已更新 for a moment */}
        <button type="submit" className="button" data-magnet data-saved={saved || undefined} disabled={busy}>
          <span className="icon-swap" data-swapped={saved} aria-hidden="true">
            <PenLine />
            <Check className="check-draw" />
          </span>
          {saved ? "已更新" : "更新名稱"}
        </button>
      </form>
    </section>
  );
}

const VISIBILITY = [
  ["public", "公開"],
  ["private", "私人"],
] as const;

function PrivacySettings({ me }: { me: Me }) {
  const update = async (field: "likes_public" | "favorites_public", value: "public" | "private") => {
    try {
      useSessionStore.getState().setMe(await api<Me>("/v1/me", { method: "PATCH", body: { [field]: value === "public" } }));
      void notify("設定已更新，公開頁最多 5 分鐘後生效");
    } catch (failure) {
      void notify(failureMessage(failure), "failed");
    }
  };

  return (
    <section className="panel">
      <h2 className="block-title">
        <Eye aria-hidden="true" />
        公開清單
      </h2>
      <ChoiceField label="我的按讚" value={me.likes_public ? "public" : "private"} options={VISIBILITY} onChange={(value) => void update("likes_public", value)} />
      <ChoiceField label="我的收藏" value={me.favorites_public ? "public" : "private"} options={VISIBILITY} onChange={(value) => void update("favorites_public", value)} />
      <p className="field-hint">您可以將特定的清單轉為私人，來確保您的隱私</p>
    </section>
  );
}

/** 減少動態效果, kept on the account so every device follows it, on top of the system's own setting (lib/motion-pref.ts). */
function MotionSetting() {
  const reduced = useMotionReduced();
  // This device changes at once; the account follows, and a failure puts the device back
  const set = async (on: boolean) => {
    applyMotionReduced(on);
    try {
      useSessionStore.getState().setMe(await api<Me>("/v1/me", { method: "PATCH", body: { reduce_motion: on } }));
    } catch (failure) {
      applyMotionReduced(!on);
      void notify(failureMessage(failure), "failed");
    }
  };
  return (
    <section className="panel">
      <h2 className="block-title">
        <PersonStanding aria-hidden="true" />
        減少動態效果
      </h2>
      <p>減少說說的系統動畫。若您的系統已開啟減少動態效果，說說將跟隨您的系統設定</p>
      <Switch isSelected={reduced} onValueChange={(on) => void set(on)} data-magnet classNames={{ base: "motion-switch", wrapper: "switch-track", label: "switch-label" }}>
        {reduced ? "已開啟" : "已關閉"}
      </Switch>
    </section>
  );
}

function SignOutHere() {
  const signOut = async () => {
    const auth = await browserAuth();
    const { error } = await auth.signOut({ scope: "local" });
    if (error) throw new ApiFailure(400, error.code ?? "sign_out_failed", "登出沒有成功，請再試一次");
    // A full load, so the header starts over without the session
    location.assign("/");
  };
  return (
    <ConfirmButton
      label={
        <>
          <LogOut aria-hidden="true" />
          從此裝置登出
        </>
      }
      title="從此裝置登出"
      body="你確定要從此裝置登出嗎？"
      confirm="登出"
      tone="warning"
      triggerClassName="button"
      magnet
      onConfirm={signOut}
    />
  );
}
