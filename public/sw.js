// Service Worker for Quarzen's Domino PWA
// Version-based cache naming for easy busting
const CACHE_VERSION = 'v1';
const STATIC_CACHE = `domino-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `domino-dynamic-${CACHE_VERSION}`;

// App shell resources to precache on install
const APP_SHELL = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// File extensions that use cache-first strategy
const CACHE_FIRST_EXTENSIONS = [
  '.js',
  '.css',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.webp',
  '.wav',
  '.mp3',
  '.ogg',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
];

// Paths that use network-first strategy
const NETWORK_FIRST_PATTERNS = [
  'theme.json',
];

/**
 * Install event -- precache app shell resources.
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Precaching app shell');
        return cache.addAll(APP_SHELL);
      })
      .then(() => {
        // Activate immediately without waiting for existing clients to close
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Precache failed:', error);
      })
  );
});

/**
 * Activate event -- clean up old caches from previous versions.
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              // Delete caches that belong to this app but are from a different version
              return (name.startsWith('domino-') && name !== STATIC_CACHE && name !== DYNAMIC_CACHE);
            })
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        // Take control of all open clients immediately
        return self.clients.claim();
      })
  );
});

/**
 * Determine if a URL should use network-first strategy.
 */
function isNetworkFirst(url) {
  return NETWORK_FIRST_PATTERNS.some((pattern) => url.pathname.endsWith(pattern));
}

/**
 * Determine if a URL should use cache-first strategy.
 */
function isCacheFirstAsset(url) {
  return CACHE_FIRST_EXTENSIONS.some((ext) => url.pathname.endsWith(ext));
}

/**
 * Cache-first strategy: try cache, fall back to network and cache the response.
 */
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache-first fetch failed for:', request.url, error);
    // Return whatever is in cache, even if stale
    const fallback = await caches.match(request);
    if (fallback) {
      return fallback;
    }
    return new Response('Offline - resource not available', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

/**
 * Network-first strategy: try network, fall back to cache.
 * Always update cache with fresh response when network is available.
 */
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.warn('[SW] Network-first falling back to cache for:', request.url);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response('Offline - resource not available', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

/**
 * Fetch event -- route requests through appropriate caching strategy.
 */
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Route to appropriate strategy
  if (isNetworkFirst(url)) {
    event.respondWith(networkFirst(event.request));
  } else if (isCacheFirstAsset(url)) {
    event.respondWith(cacheFirst(event.request));
  } else {
    // For navigation requests (HTML), use network-first to get latest
    if (event.request.mode === 'navigate') {
      event.respondWith(networkFirst(event.request));
    } else {
      // Default: cache-first for everything else
      event.respondWith(cacheFirst(event.request));
    }
  }
});
