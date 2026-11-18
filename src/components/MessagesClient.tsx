"use client";

import Link from "@/i18n/Link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { useT } from "@/i18n/client";

type Convo = { name: string; avatar: string | null; avatar_path: string | null; at: string; last: string; unread: number };
type Msg = { id: number; mine: boolean; body: string; at: string };
const ERRORS = ["length", "no_such_member", "blocked", "closed", "rate", "sign_in"];

// Direct messages between members (supabase/tiers_menus_dms.sql). The database decides who may write to whom.
export function MessagesClient() {
  const t = useT();
  const { user, ready, signIn } = useAuth();
  const withName = useSearchParams().get("with") ?? "";
  const [convos, setConvos] = useState<Convo[] | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  const loadInbox = useCallback(async () => {
    const { data, error } = await supabase().rpc("inbox");
    setConvos(error ? [] : ((data as Convo[]) ?? []));
  }, []);
  const loadThread = useCallback(async () => {
    if (!withName) return;
    const { data } = await supabase().rpc("thread", { p_with: withName });
    setMsgs((data as Msg[]) ?? []);
  }, [withName]);

  useEffect(() => {
    if (!user) return;
    void loadInbox();
    void loadThread();
    const id = setInterval(() => {
      void loadInbox();
      void loadThread();
    }, 20000);
    return () => clearInterval(id);
  }, [user, loadInbox, loadThread]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [msgs.length]);

  if (!ready) return null;
  if (!user) {
    return (
      <div className="mt-6">
        <p className="text-ink-muted">{t("c.msg.signin")}</p>
        <button type="button" onClick={() => signIn()} className="mt-4 rounded-full bg-matcha px-5 py-2.5 text-sm font-medium text-paper hover:bg-forest">
          {t("c.account.signIn")}
        </button>
      </div>
    );
  }

  const errText = (e: string) => t(`c.msg.err.${ERRORS.includes(e) ? e : "other"}` as "c.msg.err.other");
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    setErr(null);
    const { data, error } = await supabase().rpc("send_message", { p_to: withName, p_body: text });
    setSending(false);
    const r = data as { ok: boolean; error?: string } | null;
    if (error || !r?.ok) return setErr(errText(r?.error ?? "other"));
    setText("");
    await Promise.all([loadThread(), loadInbox()]);
  }
  async function block(b: boolean) {
    await supabase().rpc("block_member", { p_name: withName, p_block: b });
    setBlocked(b);
  }
  const fmt = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  const other = convos?.find((c) => c.name.toLowerCase() === withName.toLowerCase());

  return (
    <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-[17rem_1fr]">
      <aside>
        {convos && convos.length === 0 && <p className="text-sm text-ink-muted">{t("c.msg.none")}</p>}
        {convos && convos.length > 0 && (
          <ul className="divide-y divide-line rounded-sm border border-line bg-paper-raised">
            {convos.map((c) => (
              <li key={c.name}>
                <Link href={`/messages?with=${encodeURIComponent(c.name)}`} className={`flex items-center gap-3 px-3 py-3 hover:bg-matcha-soft ${c.name.toLowerCase() === withName.toLowerCase() ? "bg-matcha-soft" : ""}`}>
                  <Avatar avatar={c.avatar} photoPath={c.avatar_path} name={c.name} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-ink">{c.name}</span>
                      {c.unread > 0 && <span className="rounded-full bg-matcha px-2 text-xs text-paper">{c.unread}</span>}
                    </span>
                    <span className="block truncate text-xs text-ink-faint">{c.last}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </aside>
      <section>
        {!withName ? (
          <p className="text-ink-muted">{t("c.msg.pick")}</p>
        ) : (
          <div className="rounded-sm border border-line bg-paper-raised">
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
              <Link href={`/u/${encodeURIComponent(withName)}`} className="flex items-center gap-2.5 font-medium text-ink hover:text-matcha">
                <Avatar avatar={other?.avatar} photoPath={other?.avatar_path} name={withName} size={32} />
                {withName}
              </Link>
              <button type="button" onClick={() => void block(!blocked)} className="text-xs text-ink-faint underline hover:text-ink-muted">
                {blocked ? t("c.msg.unblock") : t("c.msg.block")}
              </button>
            </div>
            <div className="flex max-h-[26rem] min-h-40 flex-col gap-2 overflow-y-auto px-4 py-4">
              {msgs.length === 0 && <p className="text-sm text-ink-faint">{t("c.msg.first")}</p>}
              {msgs.map((m) => (
                <div key={m.id} className={`max-w-[85%] rounded-md px-3 py-2 text-sm ${m.mine ? "ml-auto bg-matcha text-paper" : "bg-paper text-ink"}`}>
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={`mt-1 text-[0.65rem] ${m.mine ? "text-paper/70" : "text-ink-faint"}`}>{fmt(m.at)}</p>
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <form onSubmit={send} className="flex flex-col gap-2 border-t border-line p-3">
              <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} rows={3} required placeholder={t("c.msg.ph")} className="w-full rounded-sm border border-line-strong bg-paper px-3 py-2.5 text-sm text-ink focus:border-matcha focus:outline-none" />
              <div className="flex items-center gap-3">
                <button type="submit" disabled={sending || !text.trim()} className="rounded-full bg-matcha px-5 py-2 text-sm font-medium text-paper hover:bg-forest disabled:opacity-50">
                  {t("c.msg.send")}
                </button>
                <span className="text-xs tabular-nums text-ink-faint">{text.length}/1000</span>
                {err && <span className="text-sm text-red-700" role="alert">{err}</span>}
              </div>
            </form>
          </div>
        )}
      </section>
    </div>
  );
}
