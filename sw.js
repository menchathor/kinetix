// Service Worker para Kinetix PWA (Cache & Offline Support)
const CACHE_NAME = 'kinetix-v1.14';

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
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[SW] Descargando recursos frescos ignorando caché HTTP del teléfono...');
      await Promise.all(
        ASSETS_TO_CACHE.map(async (url) => {
          try {
            // cache: 'reload' fuerza al navegador móvil a ir al servidor y actualizar su caché HTTP
            const req = new Request(url, { cache: 'reload' });
            const res = await fetch(req);
            if (res && res.ok) {
              await cache.put(url, res);
            }
          } catch (err) {
            console.warn('[SW] Error cacheando asset:', url, err);
          }
        })
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Eliminando caché antigua:', key);
            return caches.delete(key);
          }
        })
      );
      await self.clients.claim();
      // Notificar a todas las pestañas abiertas para que recarguen con la nueva versión
      const clientList = await self.clients.matchAll({ type: 'window' });
      for (const client of clientList) {
        client.postMessage({ type: 'SW_UPDATED', version: CACHE_NAME });
      }
    })()
  );
});

// Estrategia Network First con bypass de caché HTTP para código (.html, .js, .json)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('convex.cloud')) return;

  const url = new URL(event.request.url);
  const isCodeOrHtml =
    event.request.mode === 'navigate' ||
    url.pathname.endsWith('/') ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.json');

  event.respondWith(
    (async () => {
      try {
        const fetchOptions = isCodeOrHtml ? { cache: 'no-cache' } : {};
        const networkResponse = await fetch(event.request, fetchOptions);
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          const cache = await caches.open(CACHE_NAME);
          await cache.put(event.request, responseToCache);
        }
        return networkResponse;
      } catch {
        // Fallback offline (ignorando query strings como ?v=1.14 para encontrar el módulo en caché)
        const cachedResponse =
          (await caches.match(event.request)) ||
          (await caches.match(event.request, { ignoreSearch: true }));
        if (cachedResponse) return cachedResponse;

        if (event.request.mode === 'navigate') {
          return caches.match('./index.html', { ignoreSearch: true });
        }
      }
    })()
  );
});

