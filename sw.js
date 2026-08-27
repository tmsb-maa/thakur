const CACHE_NAME = "tmsb-cache-dynamic";

// Network-first strategy: always try to get the latest file from the
// internet first. Only fall back to the saved offline copy if the
// network request fails (e.g. no internet connection at that moment).
// This means every future update you upload becomes visible immediately,
// with no manual version numbers to remember or change, ever.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  // Only handle simple GET requests (page loads, files) - let everything
  // else (like Firestore's own network calls) pass through untouched.
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Got a fresh copy from the internet - save it for offline use,
        // and show this fresh copy to the user right now.
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return networkResponse;
      })
      .catch(() => {
        // No internet available right now - fall back to the last
        // saved copy, if one exists.
        return caches.match(event.request);
      })
  );
});
