// Minimal service worker — exists primarily to satisfy Chrome's PWA
// install-prompt requirement. We deliberately keep it network-first and
// do NOT cache HTML / API responses, because the recognition flow has
// to talk to /api/analyze and /api/orgs/validate every time, and a stale
// HTML shell would break the popup-driven auth gate.
//
// If we ever need offline support we can extend this; for now bumping
// VERSION is enough to invalidate any leftover caches from earlier
// experiments.

const VERSION = "v1";
const CACHE = `trashform-${VERSION}`;

self.addEventListener("install", (event) => {
  // Activate as soon as the new SW finishes installing
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

// Network-first passthrough — no caching today. Kept as a no-op handler so
// the SW counts as "controlling" the page once installed.
self.addEventListener("fetch", () => {});
