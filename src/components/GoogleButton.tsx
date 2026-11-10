"use client";

import { useEffect, useRef } from "react";

// "Sign in with Google" using Google's own button (Google Identity Services). Google shows the sign-in popup for
// matchadb.com itself, so people never see the long Supabase address that the redirect flow shows on its
// "continue to ..." screen. Google hands back a signed ID token and AuthProvider gives it to Supabase.
// If the script cannot load (ad blocker, in-app browser, offline) onUnavailable() is called and the dialog
// falls back to the ordinary redirect button.

export const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "544938890452-volkhu6uj2o8m3g1dlj704489ke99pt3.apps.googleusercontent.com";

type GoogleId = {
  initialize: (o: Record<string, unknown>) => void;
  renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
};
type GoogleWindow = Window & { google?: { accounts?: { id?: GoogleId } } };

const SRC = "https://accounts.google.com/gsi/client";

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as GoogleWindow).google?.accounts?.id) return resolve();
    const have = document.querySelector<HTMLScriptElement>(`script[src="${SRC}"]`);
    const s = have ?? document.createElement("script");
    s.addEventListener("load", () => resolve());
    s.addEventListener("error", () => reject(new Error("gsi")));
    if (!have) {
      s.src = SRC;
      s.async = true;
      document.head.appendChild(s);
    }
  });
}

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

export default function GoogleButton({
  locale,
  onCredential,
  onUnavailable,
}: {
  locale: string;
  onCredential: (idToken: string, nonce: string) => void;
  onUnavailable: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  // The latest callbacks, so the effect below runs once per mount.
  const cb = useRef({ onCredential, onUnavailable });
  useEffect(() => {
    cb.current = { onCredential, onUnavailable };
  });

  useEffect(() => {
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    (async () => {
      try {
        // Supabase checks that the token was made for this sign-in: Google gets the hash, Supabase the original.
        const raw = hex(crypto.getRandomValues(new Uint8Array(16)).buffer);
        const hashed = hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw)));
        await loadScript();
        if (!live || !box.current) return;
        const id = (window as GoogleWindow).google?.accounts?.id;
        if (!id) throw new Error("gsi");
        id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          nonce: hashed,
          callback: (r: { credential?: string }) => r.credential && cb.current.onCredential(r.credential, raw),
          use_fedcm_for_prompt: true,
        });
        id.renderButton(box.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "pill",
          logo_alignment: "left",
          width: Math.max(200, Math.min(400, Math.round(box.current.offsetWidth || 300))),
          locale,
        });
        // If nothing was drawn a few seconds later, give up on this method.
        timer = setTimeout(() => {
          if (live && box.current && !box.current.childElementCount) cb.current.onUnavailable();
        }, 4000);
      } catch {
        if (live) cb.current.onUnavailable();
      }
    })();
    return () => {
      live = false;
      if (timer) clearTimeout(timer);
    };
  }, [locale]);

  return <div ref={box} className="mt-5 flex min-h-10 w-full justify-center" />;
}
