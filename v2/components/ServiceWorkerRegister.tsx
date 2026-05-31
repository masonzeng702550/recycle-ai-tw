"use client";

import { useEffect } from "react";

// Mount once globally in the root layout. Browsers that don't support
// service workers (e.g. older Firefox on iOS) silently skip.
// We deliberately don't await/return anything — the page must not
// block on SW registration.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // Defer to idle so the first paint isn't slowed by registration
    const idle =
      "requestIdleCallback" in window
        ? (window as Window & {
            requestIdleCallback: (cb: () => void) => void;
          }).requestIdleCallback
        : (cb: () => void) => setTimeout(cb, 1500);
    idle(() => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => {
          console.warn("[sw] registration failed", err);
        });
    });
  }, []);

  return null;
}
