// service-worker.js
const CACHE_NAME = 'blokz-reflex-v1'; // incrémente quand tu déploies des changements
const PRECACHE_URLS = [
  './',
  './index.html',
  './local.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// INSTALL : pré-cache les ressources essentielles
self.addEventListener('install', event => {
  console.log('[SW] install');
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .catch(err => console.error('[SW] precache failed', err))
  );
});

// ACTIVATE : nettoie les anciens caches
self.addEventListener('activate', event => {
  console.log('[SW] activate');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => {
        if (key !== CACHE_NAME) {
          console.log('[SW] deleting cache', key);
          return caches.delete(key);
        }
      }))
    )
  );
  self.clients.claim();
});

// FETCH : stratégie "cache-first, fallback réseau" + navigation fallback -> index.html
self.addEventListener('fetch', event => {
  // Ne gère que les GET
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);

  // Ne pas interférer avec les requêtes cross-origin (CDN/API externes)
  if (requestUrl.origin !== location.origin) {
    return; // laisse le navigateur gérer
  }

  // Pour les navigations (mode SPA / navigation directe), tenter le réseau puis fallback cache index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // met à jour le cache de la page de navigation
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Pour les assets : renvoyer depuis cache si présent, sinon chercher réseau et mettre à jour le cache
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const networkFetch = fetch(event.request)
        .then(networkResponse => {
          if (networkResponse && networkResponse.ok) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse.clone()));
          }
          return networkResponse;
        })
        .catch(() => {
          // si réseau KO et pas de cache, la promise renverra undefined — navigateur gèrera l'erreur
        });
      // retourne cache si existe, sinon attend le réseau
      return cachedResponse || networkFetch;
    })
  );
});

// Message handler : pour forcer activation depuis la page (registration.waiting.postMessage({type:'SKIP_WAITING'}))
self.addEventListener('message', event => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});


