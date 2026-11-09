/* VIKRAM service worker: offline cache + push notifications. Bump VERSION on every deploy. */
const VERSION = 'vikram-v1.0.1';
const CORE = ['./', 'index.html', 'css/app.css', 'js/config.js', 'js/content.js', 'js/app.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'notes/S1_Guesstimates_Structured_Thinking.html', 'docs/PRD.html'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.hostname === 'api.github.com') return; // never cache sync traffic
  e.respondWith(caches.match(e.request, { ignoreSearch: u.origin === location.origin }).then(hit => {
    const net = fetch(e.request).then(r => { if (r.ok && (u.origin === location.origin || u.hostname.includes('fonts.g'))) { const cp = r.clone(); caches.open(VERSION).then(c => c.put(e.request, cp)); } return r; }).catch(() => hit);
    return hit || net;
  }));
});
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: 'VIKRAM', body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'VIKRAM', { body: d.body || 'Check your plan.', icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: d.tag || 'vikram', renotify: true, data: { url: d.url || './#today' } }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => { for (const c of cs) { if ('focus' in c) { c.navigate(e.notification.data.url).catch(() => {}); return c.focus(); } } return self.clients.openWindow(e.notification.data.url); }));
});
