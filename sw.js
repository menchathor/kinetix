// Service Worker para Kinetix PWA (Cache & Offline Support)
const CACHE_NAME = 'kinetix-v1.9';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './assets/icons/icon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/images/rest_day_hero.jpg',
  './assets/images/smartfit_ill_chest_press.jpg',
  './assets/images/smartfit_ill_cable_row.jpg',
  './assets/images/smartfit_ill_shoulder_press.jpg',
  './assets/images/smartfit_ill_lat_pulldown.jpg',
  './assets/images/smartfit_ill_triceps_pushdown.jpg',
  './assets/images/smartfit_ill_biceps_curl.jpg',
  './assets/images/smartfit_ill_leg_press.jpg',
  './assets/images/smartfit_ill_leg_extension.jpg',
  './assets/images/smartfit_ill_leg_curl.jpg',
  './assets/images/smartfit_ill_calf_press.jpg',
  './assets/images/smartfit_ill_ab_crunch.jpg',
  './assets/images/smartfit_ill_pec_deck.jpg',
  './assets/images/smartfit_ill_lateral_raise.jpg',
  './assets/images/smartfit_ill_face_pull.jpg',
  './assets/images/smartfit_ill_hip_thrust.jpg',
  './assets/images/smartfit_ill_abductor_adductor.jpg',
  './assets/images/smartfit_ill_captains_chair.jpg',
  './assets/images/smartfit_ill_cardio_treadmill.jpg',
  './assets/images/smartfit_ill_cardio_bike.jpg',
  './js/config.js',
  './js/app.js',
  './js/state.js',
  './js/data/initialData.js',
  './js/services/convex.js',
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
  if (event.request.url.includes('convex.cloud')) return;

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
