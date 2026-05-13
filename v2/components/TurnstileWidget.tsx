"use client";

import { useEffect, useRef } from "react";

// Cloudflare Turnstile 開發測試 site key（永遠通過）
const TEST_SITE_KEY = "1x00000000000000000000AA";
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

interface TurnstileApi {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      theme?: "dark" | "light" | "auto";
      callback?: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
    }
  ) => string;
  remove: (id: string) => void;
  reset: (id: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptInjected = false;
function ensureScript() {
  if (typeof document === "undefined") return;
  if (scriptInjected) return;
  if (document.querySelector(`script[src^="${SCRIPT_SRC}"]`)) {
    scriptInjected = true;
    return;
  }
  const s = document.createElement("script");
  s.src = SCRIPT_SRC;
  s.async = true;
  s.defer = true;
  document.head.appendChild(s);
  scriptInjected = true;
}

interface Props {
  onToken: (token: string) => void;
  onExpire?: () => void;
  theme?: "dark" | "light";
  /** 改變這個值會強制重新渲染（用來重置 widget） */
  resetKey?: number;
}

export default function TurnstileWidget({
  onToken,
  onExpire,
  theme = "dark",
  resetKey = 0,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onTokenRef.current = onToken;
    onExpireRef.current = onExpire;
  }, [onToken, onExpire]);

  useEffect(() => {
    ensureScript();
    let cancelled = false;
    let pollId: number | null = null;

    const siteKey =
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || TEST_SITE_KEY;

    function tryRender() {
      if (cancelled) return;
      if (!containerRef.current) return;
      if (typeof window === "undefined" || !window.turnstile) {
        pollId = window.setTimeout(tryRender, 200);
        return;
      }
      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme,
          callback: (token: string) => {
            onTokenRef.current?.(token);
          },
          "expired-callback": () => {
            onExpireRef.current?.();
          },
          "error-callback": () => {
            onExpireRef.current?.();
          },
        });
      } catch {
        // 偶爾會在熱重載時 double render；忽略即可
      }
    }

    tryRender();

    return () => {
      cancelled = true;
      if (pollId !== null) window.clearTimeout(pollId);
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
        widgetIdRef.current = null;
      }
    };
    // resetKey 變化會 unmount 重 mount（透過上層 key prop 也行）；這裡也納入依賴以重渲染
  }, [theme, resetKey]);

  return <div ref={containerRef} className="cf-turnstile" />;
}
