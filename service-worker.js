// service-worker.js
const CACHE_NAME = 'blokz-reflex-v1'; // change ce nom quand tu mets à jour les assets
const PRECACHE_URLS = [
  './',
  './index.html',
  './local.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// INSTALL : pré-cache les ressources
self.addEventListener('install', event => {
  console.log('[SW] install');
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .catch(err => console.error('[SW] precache failed', err))
  );
});

// ACTIVATE : nettoyage des caches obsolètes
self.addEventListener('activate', event => {
  console.log('[SW] activate');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => {
        if (key !== CACHE_NAME) {
          console.log('[SW] delete cache', key);
          return caches.delete(key);
        }
      }))
    )
  );
  self.clients.claim();
});

// FETCH : cache-first, fallback réseau, navigation fallback -> index.html
self.addEventListener('fetch', event => {
  // On gère uniquement les GET pour éviter les problèmes avec POST etc.
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);

  // Si requête cross-origin, laisse le réseau la gérer (ne pas mettre en cache automatiquement)
  if (requestUrl.origin !== location.origin) return;

  // Si navigation (entrée d'URL / rechargement), essaie le réseau, sinon renvoie index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then(response => {
        // Met à jour le cache de la page si OK
        if (response && response.ok) {
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
        }
        return response;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Pour les assets : renvoie le cache si présent, sinon fetch -> et met en cache la réponse
  event.respondWith(
    caches.match(event.request).then(cached => {
      const networkFetch = fetch(event.request)
        .then(networkResponse => {
          if (networkResponse && networkResponse.ok) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse.clone()));
          }
          return networkResponse;
        })
        .catch(() => {
          // réseau KO : si pas de cache, ça retournera undefined (browser gèrera)
        });
      // retourne cache si existant, sinon la réponse réseau
      return cached || networkFetch;
    })
  );
});

// Message handler : permet de forcer activation depuis la page
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});



