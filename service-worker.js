self.addEventListener("install", event => {
  console.log("Service worker installé");
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  console.log("Service worker activé");
});

self.addEventListener("fetch", event => {
  event.respondWith(fetch(event.request));
});

