
/**
 * Enhanced Service Worker for QR Code Component Scanner PWA
 * Provides offline capabilities, caching, and cache reset functionality
 */

const CACHE_NAME = 'qr-scanner-v1.1.0'; // Updated version for cache busting
const STATIC_CACHE = 'qr-scanner-static-v1.1.0';
const DYNAMIC_CACHE = 'qr-scanner-dynamic-v1.1.0';

// Files to cache for offline functionality
const STATIC_FILES = [
    '/',
    '/index.html',
    '/qrcode.html',
    '/css/site/styles.css',
    '/css/site/font-fix.css',
    '/js/qrcode/utils.js',
    '/js/qrcode/camera-manager.js',
    '/js/qrcode/excel-processor.js',
    '/js/qrcode/range-selector.js',
    '/js/qrcode/column-mapper.js',
    '/js/qrcode/scanner.js',
    '/js/qrcode/app.js',
    '/manifest.json'
];

// External resources to cache
const EXTERNAL_RESOURCES = [
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap'
];

// Install event - cache static files
self.addEventListener('install', event => {
    console.log('[SW] Installing enhanced service worker v1.1.0');

    event.waitUntil(
        Promise.all([
            // Cache static files
            caches.open(STATIC_CACHE).then(cache => {
                console.log('[SW] Caching static files');
                return cache.addAll(STATIC_FILES.map(url => new Request(url, {cache: 'reload'})));
            }),
            // Cache external resources
            caches.open(DYNAMIC_CACHE).then(cache => {
                console.log('[SW] Caching external resources');
                return Promise.allSettled(
                    EXTERNAL_RESOURCES.map(url => 
                        cache.add(new Request(url, {cache: 'reload'})).catch(err => {
                            console.warn(`[SW] Failed to cache ${url}:`, err);
                        })
                    )
                );
            })
        ]).then(() => {
            console.log('[SW] Installation complete');
            return self.skipWaiting();
        })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('[SW] Activating enhanced service worker');

    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== STATIC_CACHE && 
                        cacheName !== DYNAMIC_CACHE && 
                        cacheName !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('[SW] Activation complete');
            return self.clients.claim();
        })
    );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip chrome-extension and other non-http requests
    if (!request.url.startsWith('http')) {
        return;
    }

    // Handle different types of requests
    if (isStaticFile(request.url)) {
        event.respondWith(cacheFirstWithNetworkFallback(request, STATIC_CACHE));
    } else if (isExternalResource(request.url)) {
        event.respondWith(cacheFirstWithNetworkFallback(request, DYNAMIC_CACHE));
    } else if (isAPIRequest(request.url)) {
        event.respondWith(networkFirst(request));
    } else {
        event.respondWith(staleWhileRevalidate(request));
    }
});

// Enhanced cache-first strategy with force refresh option
async function cacheFirstWithNetworkFallback(request, cacheName) {
    try {
        const cache = await caches.open(cacheName);
        const cachedResponse = await cache.match(request);

        // Check if we should bypass cache (for reset functionality)
        const url = new URL(request.url);
        const forceRefresh = url.searchParams.has('refresh') || 
                           url.searchParams.has('bust-cache') ||
                           request.headers.get('Cache-Control') === 'no-cache';

        if (cachedResponse && !forceRefresh) {
            console.log('[SW] Serving from cache:', request.url);

            // Trigger background update
            fetch(request).then(response => {
                if (response.ok) {
                    cache.put(request, response.clone());
                    console.log('[SW] Background cache update:', request.url);
                }
            }).catch(() => {
                // Ignore background update failures
            });

            return cachedResponse;
        }

        console.log('[SW] Fetching fresh content:', request.url);
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
            console.log('[SW] Updated cache:', request.url);
        }

        return networkResponse;

    } catch (error) {
        console.error('[SW] Cache-first failed:', error);

        // Return offline fallback for HTML pages
        if (request.destination === 'document') {
            return createOfflinePage();
        }

        throw error;
    }
}

// Check if request is for a static file
function isStaticFile(url) {
    return STATIC_FILES.some(file => url.endsWith(file)) ||
           url.includes('/css/') || 
           url.includes('/js/') ||
           url.endsWith('.html');
}

// Check if request is for an external resource
function isExternalResource(url) {
    return EXTERNAL_RESOURCES.some(resource => url.includes(resource.split('://')[1])) ||
           url.includes('fonts.googleapis.com') ||
           url.includes('cdnjs.cloudflare.com') ||
           url.includes('unpkg.com');
}

// Check if request is an API call
function isAPIRequest(url) {
    return url.includes('/api/');
}

// Network first strategy - for API calls
async function networkFirst(request) {
    try {
        console.log('[SW] Network first for:', request.url);
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;

    } catch (error) {
        console.log('[SW] Network failed, trying cache:', request.url);
        const cache = await caches.open(DYNAMIC_CACHE);
        const cachedResponse = await cache.match(request);

        if (cachedResponse) {
            return cachedResponse;
        }

        throw error;
    }
}

// Stale while revalidate strategy
async function staleWhileRevalidate(request) {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);

    const fetchPromise = fetch(request).then(networkResponse => {
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    }).catch(error => {
        console.warn('[SW] Network request failed:', error);
    });

    // Return cached version immediately if available
    if (cachedResponse) {
        console.log('[SW] Serving stale content:', request.url);
        return cachedResponse;
    }

    // Otherwise wait for network
    return fetchPromise;
}

// Enhanced message handling with cache reset functionality
self.addEventListener('message', event => {
    console.log('[SW] Message received:', event.data);

    if (!event.data || !event.data.type) return;

    switch (event.data.type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;

        case 'CLEAR_CACHE':
            event.waitUntil(clearAllCaches().then(() => {
                console.log('[SW] All caches cleared');
                // Notify client that cache is cleared
                event.ports[0]?.postMessage({ success: true, message: 'Cache cleared' });
                // Broadcast to all clients
                self.clients.matchAll().then(clients => {
                    clients.forEach(client => {
                        client.postMessage({
                            type: 'CACHE_CLEARED',
                            message: 'Cache cleared successfully'
                        });
                    });
                });
            }));
            break;

        case 'FORCE_REFRESH':
            event.waitUntil(forceRefreshCache().then(() => {
                console.log('[SW] Cache force refreshed');
                event.ports[0]?.postMessage({ success: true, message: 'Cache refreshed' });
            }));
            break;

        case 'GET_VERSION':
            event.ports[0]?.postMessage({
                version: CACHE_NAME,
                timestamp: new Date().toISOString(),
                caches: [STATIC_CACHE, DYNAMIC_CACHE]
            });
            break;

        case 'GET_CACHE_STATUS':
            event.waitUntil(getCacheStatus().then(status => {
                event.ports[0]?.postMessage(status);
            }));
            break;
    }
});

// Clear all caches
async function clearAllCaches() {
    try {
        const cacheNames = await caches.keys();
        const deletePromises = cacheNames.map(name => {
            console.log('[SW] Deleting cache:', name);
            return caches.delete(name);
        });
        await Promise.all(deletePromises);
        return true;
    } catch (error) {
        console.error('[SW] Failed to clear caches:', error);
        throw error;
    }
}

// Force refresh cache with latest content
async function forceRefreshCache() {
    try {
        // Clear current caches
        await clearAllCaches();

        // Recache with fresh content
        const staticCache = await caches.open(STATIC_CACHE);
        const dynamicCache = await caches.open(DYNAMIC_CACHE);

        await Promise.all([
            staticCache.addAll(STATIC_FILES.map(url => new Request(url, {cache: 'reload'}))),
            Promise.allSettled(
                EXTERNAL_RESOURCES.map(url => 
                    dynamicCache.add(new Request(url, {cache: 'reload'}))
                )
            )
        ]);

        return true;
    } catch (error) {
        console.error('[SW] Force refresh failed:', error);
        throw error;
    }
}

// Get cache status information
async function getCacheStatus() {
    try {
        const cacheNames = await caches.keys();
        const status = {
            caches: cacheNames,
            version: CACHE_NAME,
            lastUpdate: new Date().toISOString()
        };

        // Get cache sizes
        for (const cacheName of cacheNames) {
            const cache = await caches.open(cacheName);
            const keys = await cache.keys();
            status[`${cacheName}_size`] = keys.length;
        }

        return status;
    } catch (error) {
        console.error('[SW] Failed to get cache status:', error);
        return { error: error.message };
    }
}

// Create enhanced offline fallback page
function createOfflinePage() {
    const offlineHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Offline - QR Scanner</title>
        <style>
            body {
                font-family: system-ui, -apple-system, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                background: #f5f5f5;
                color: #333;
            }
            .offline-container {
                text-align: center;
                max-width: 400px;
                padding: 2rem;
                background: white;
                border: 1px solid #000;
            }
            .offline-title {
                font-size: 1.5rem;
                font-weight: 500;
                margin-bottom: 1rem;
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }
            .offline-message {
                margin-bottom: 1.5rem;
                line-height: 1.6;
            }
            .retry-button {
                background: #000;
                color: white;
                border: 1px solid #000;
                padding: 0.5rem 1rem;
                font-size: 0.75rem;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                cursor: pointer;
                transition: all 0.15s;
            }
            .retry-button:hover {
                background: #333;
            }
        </style>
    </head>
    <body>
        <div class="offline-container">
            <h1 class="offline-title">Offline</h1>
            <p class="offline-message">
                You are currently offline. The QR Code Component Scanner 
                requires an internet connection for full functionality.
            </p>
            <button class="retry-button" onclick="location.reload()">
                Retry Connection
            </button>
        </div>
    </body>
    </html>
    `;

    return new Response(offlineHTML, {
        headers: {
            'Content-Type': 'text/html',
            'Cache-Control': 'no-cache'
        }
    });
}

console.log('[SW] Enhanced Service Worker v1.1.0 loaded with cache reset functionality');
