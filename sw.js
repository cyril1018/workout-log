// Network first: always check the server (skipping GitHub Pages' 10-minute
// browser cache) so a new deploy shows up on the next open; fall back to the
// last saved copy when offline. Only this site's own files go through here.
const CACHE = 'workoutlog';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      // fetch(url) rather than fetch(req): navigation requests can't take an init object.
      const res = await fetch(req.url, { cache: 'no-cache' });
      if (res.ok) await cache.put(req, res.clone());
      return res;
    } catch (err) {
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      throw err;
    }
  })());
});
