// Service Worker para Kinetix PWA (offline real, sin CDNs en runtime)
const CACHE_NAME = 'kinetix-v1.18';
const CACHE_PREFIX = 'kinetix-';

const CODE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/css/fonts.css',
  './assets/css/tailwind.css',
  './assets/fonts/barlow-400.woff2',
  './assets/fonts/barlow-500.woff2',
  './assets/fonts/barlow-600.woff2',
  './assets/fonts/barlow-700.woff2',
  './assets/fonts/barlow-condensed-600.woff2',
  './assets/fonts/barlow-condensed-700.woff2',
  './assets/vendor/chart.umd.min.js',
  './assets/icons/icon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './js/config.js',
  './js/app.js',
  './js/state.js',
  './js/utils/escape.js',
  './js/ui/toast.js',
  './js/ui/icons.js',
  './js/data/initialData.js',
  './js/services/convex.js',
  './js/services/db.js',
  './js/services/timer.js',
  './js/services/merge.js',
  './js/modules/workout.js',
  './js/modules/workout-render.js',
  './js/modules/workout-utils.js',
  './js/modules/nutrition.js',
  './js/modules/analytics.js',
  './js/modules/settings.js'
];

const IMAGE_ASSETS = [
  './assets/images/rest_day_hero.webp',
  './assets/images/smartfit_ill_chest_press.webp',
  './assets/images/smartfit_ill_cable_row.webp',
  './assets/images/smartfit_ill_shoulder_press.webp',
  './assets/images/smartfit_ill_lat_pulldown.webp',
  './assets/images/smartfit_ill_triceps_pushdown.webp',
  './assets/images/smartfit_ill_biceps_curl.webp',
  './assets/images/smartfit_ill_leg_press.webp',
  './assets/images/smartfit_ill_leg_extension.webp',
  './assets/images/smartfit_ill_leg_curl.webp',
  './assets/images/smartfit_ill_calf_press.webp',
  './assets/images/smartfit_ill_ab_crunch.webp',
  './assets/images/smartfit_ill_pec_deck.webp',
  './assets/images/smartfit_ill_lateral_raise.webp',
  './assets/images/smartfit_ill_face_pull.webp',
  './assets/images/smartfit_ill_hip_thrust.webp',
  './assets/images/smartfit_ill_abductor_adductor.webp',
  './assets/images/smartfit_ill_captains_chair.webp',
  './assets/images/smartfit_ill_cardio_treadmill.webp',
  './assets/images/smartfit_ill_cardio_bike.webp'
];

const ASSETS_TO_CACHE = [...CODE_ASSETS, ...IMAGE_ASSETS];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // No fallar toda la instalación si un asset individual no responde.
      await Promise.allSettled(
        ASSETS_TO_CACHE.map(async (url) => {
          try {
            const request = new Request(url, { cache: 'reload' });
            const response = await fetch(request);
            if (response && response.ok) {
              await cache.put(url, response);
            }
          } catch {
            console.warn('[SW] No se pudo precachear:', url);
          }
        })
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
      await self.clients.claim();

      const clientList = await self.clients.matchAll({ type: 'window' });
      for (const client of clientList) {
        client.postMessage({ type: 'SW_UPDATED', version: CACHE_NAME });
      }
    })()
  );
});

function isCodeRequest(request, url) {
  return (
    request.mode === 'navigate' ||
    url.pathname.endsWith('/') ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.json') ||
    url.pathname.endsWith('.css')
  );
}

async function cachedFallback(request) {
  const cached =
    (await caches.match(request)) ||
    (await caches.match(request, { ignoreSearch: true }));
  if (cached) return cached;

  if (request.mode === 'navigate') {
    return caches.match('./index.html', { ignoreSearch: true });
  }
  return null;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request, { cache: 'no-cache' });
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
      return response;
    }

    // Un proxy/portal puede devolver 502/503 sin estar realmente offline.
    const cached = await cachedFallback(request);
    return cached || response;
  } catch {
    const cached = await cachedFallback(request);
    return cached || Response.error();
  }
}

async function cacheFirst(request) {
  const cached = await cachedFallback(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
      return response;
    }

    const retryCached = await cachedFallback(request);
    return retryCached || response;
  } catch {
    return Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Sólo cacheamos same-origin. Los CDNs y Convex no se interceptan.
  if (url.origin !== self.location.origin) return;

  event.respondWith(isCodeRequest(request, url) ? networkFirst(request) : cacheFirst(request));
});
