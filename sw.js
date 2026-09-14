// Service Worker para Smart Fit Tracker (Cache & Offline Support)
const CACHE_NAME = 'smartfit-v1.0';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './assets/icons/icon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/images/smartfit_chest_press_1789138165787.jpg',
  './assets/images/smartfit_pec_deck_1789138210707.jpg',
  './assets/images/smartfit_back_machine_1789138318602.jpg',
  './assets/images/smartfit_shoulder_press_1789138236584.jpg',
  './assets/images/smartfit_cable_arms_1789138284942.jpg',
  './assets/images/smartfit_leg_press_1789138185290.jpg',
  './assets/images/smartfit_leg_extension_1789138265921.jpg',
  './js/app.js',
  './js/state.js',
  './js/data/initialData.js',
  './js/services/db.js',
  './js/services/timer.js',
  './js/modules/workout.js',
  './js/modules/nutrition.js',
  './js/modules/analytics.js',
  './js/modules/settings.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Cacheando recursos estáticos');
      return cache.addAll(ASSETS_TO_CACHE).catch(err => console.warn('[SW] Error cacheando algunos assets:', err));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Eliminando caché antigua:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Estrategia Network First con fallback a Cache
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Guardar copia fresca en caché si es recurso válido
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Si no hay red (modo offline en el gym), responder desde caché
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          // Fallback a index.html para navegación SPA
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
