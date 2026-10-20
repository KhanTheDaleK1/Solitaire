const CACHE_NAME = 'solitaire-pwa-v12';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/cards/queen-hearts.jpg',
  '/cards/queen-spades.jpg',
  '/cards/queen-diamonds.jpg',
  '/cards/queen-clubs.jpg',
  '/cards/king-hearts.jpg',
  '/cards/king-spades.jpg',
  '/cards/king-diamonds.jpg',
  '/cards/king-clubs.jpg',
  '/cards/jack-hearts.jpg',
  '/cards/jack-spades.jpg',
  '/cards/jack-diamonds.jpg',
  '/cards/jack-clubs.jpg',
  '/cards/greek/queen-hearts.jpg',
  '/cards/greek/queen-spades.jpg',
  '/cards/greek/queen-diamonds.jpg',
  '/cards/greek/queen-clubs.jpg',
  '/cards/greek/king-hearts.jpg',
  '/cards/greek/king-spades.jpg',
  '/cards/greek/king-diamonds.jpg',
  '/cards/greek/king-clubs.jpg',
  '/cards/greek/jack-hearts.jpg',
  '/cards/greek/jack-spades.jpg',
  '/cards/greek/jack-diamonds.jpg',
  '/cards/greek/jack-clubs.jpg',
  '/cards/pinup/queen-hearts.jpg',
  '/cards/pinup/queen-spades.jpg',
  '/cards/pinup/queen-diamonds.jpg',
  '/cards/pinup/queen-clubs.jpg',
  '/cards/pinup/king-hearts.jpg',
  '/cards/pinup/king-spades.jpg',
  '/cards/pinup/king-diamonds.jpg',
  '/cards/pinup/king-clubs.jpg',
  '/cards/pinup/jack-hearts.jpg',
  '/cards/pinup/jack-spades.jpg',
  '/cards/pinup/jack-diamonds.jpg',
  '/cards/pinup/jack-clubs.jpg',
  '/cards/hentai/queen-hearts.jpg',
  '/cards/hentai/queen-spades.jpg',
  '/cards/hentai/queen-diamonds.jpg',
  '/cards/hentai/queen-clubs.jpg',
  '/cards/hentai/king-hearts.jpg',
  '/cards/hentai/king-spades.jpg',
  '/cards/hentai/king-diamonds.jpg',
  '/cards/hentai/king-clubs.jpg',
  '/cards/hentai/jack-hearts.jpg',
  '/cards/hentai/jack-spades.jpg',
  '/cards/hentai/jack-diamonds.jpg',
  '/cards/hentai/jack-clubs.jpg',
  '/cards/kamasutra/queen-hearts.jpg',
  '/cards/kamasutra/queen-spades.jpg',
  '/cards/kamasutra/queen-diamonds.jpg',
  '/cards/kamasutra/queen-clubs.jpg',
  '/cards/kamasutra/king-hearts.jpg',
  '/cards/kamasutra/king-spades.jpg',
  '/cards/kamasutra/king-diamonds.jpg',
  '/cards/kamasutra/king-clubs.jpg',
  '/cards/kamasutra/jack-hearts.jpg',
  '/cards/kamasutra/jack-spades.jpg',
  '/cards/kamasutra/jack-diamonds.jpg',
  '/cards/kamasutra/jack-clubs.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Never intercept API routes or OAuth/Firebase endpoints
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('firebaseapp.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('accounts.google.com') ||
    url.hostname.includes('github.com') ||
    url.hostname.includes('githubusercontent.com') ||
    url.hostname.includes('gravatar.com')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
});
