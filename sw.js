/**
 * Service Worker for QR Code Component Scanner PWA
 * Provides offline capabilities and caching for better performance
 */

const CACHE_NAME = 'qr-scanner-v1.0.0';
const STATIC_CACHE = 'qr-scanner-static-v1.0.0';
const DYNAMIC_CACHE = 'qr-scanner-dynamic-v1.0.0';

// Files to cache for offline functionality
const STATIC_FILES = [
    '/',
    '/index.html',
    '/qrcode.html',
    '/css/site/styles.css',
    '/js/qrcode/utils.js',
    '/js/qrcode/camera-manager.js',
    '/js/qrcode/excel-processor.js',
    '/js/qrcode/range-selector.js',
    '/js/qrcode/column-mapper.js',
    '/js/qrcode/scanner.js',
    '/js/qrcode/app.js'
];

// External resources to cache
const EXTERNAL_RESOURCES = [
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js'
];

// Install event - cache static files
self.addEventListener('install', event => {
    console.log('[SW] Installing service worker');
    
    event.waitUntil(
        Promise.all([
            // Cache static files
            caches.open(STATIC_CACHE).then(cache => {
                console.log('[SW] Caching static files');
                return cache.addAll(STATIC_FILES);
            }),
            // Cache external resources
            caches.open(DYNAMIC_CACHE).then(cache => {
                console.log('[SW] Caching external resources');
                return Promise.allSettled(
                    EXTERNAL_RESOURCES.map(url => 
                        cache.add(url).catch(err => {
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
    console.log('[SW] Activating service worker');
    
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
        event.respondWith(cacheFirst(request, STATIC_CACHE));
    } else if (isExternalResource(request.url)) {
        event.respondWith(cacheFirst(request, DYNAMIC_CACHE));
    } else if (isAPIRequest(request.url)) {
        event.respondWith(networkFirst(request));
    } else {
        event.respondWith(staleWhileRevalidate(request));
    }
});

// Check if request is for a static file
function isStaticFile(url) {
    return STATIC_FILES.some(file => url.endsWith(file));
}

// Check if request is for an external resource
function isExternalResource(url) {
    return EXTERNAL_RESOURCES.some(resource => url.includes(resource));
}

// Check if request is an API call
function isAPIRequest(url) {
    return url.includes('/api/') || 
           url.includes('cdnjs.cloudflare.com') ||
           url.includes('unpkg.com');
}

// Cache first strategy - for static assets
async function cacheFirst(request, cacheName) {
    try {
        const cache = await caches.open(cacheName);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            console.log('[SW] Serving from cache:', request.url);
            return cachedResponse;
        }
        
        console.log('[SW] Not in cache, fetching:', request.url);
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
        
    } catch (error) {
        console.error('[SW] Cache first failed:', error);
        
        // Return offline fallback for HTML pages
        if (request.destination === 'document') {
            return createOfflinePage();
        }
        
        throw error;
    }
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

// Stale while revalidate strategy - for other resources
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

// Create offline fallback page
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
                    padding: 2rem;
                    background: white;
                    border: 2px solid #000;
                    max-width: 400px;
                }
                .offline-title {
                    font-size: 2rem;
                    font-weight: 600;
                    margin-bottom: 1rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .offline-message {
                    margin-bottom: 2rem;
                    line-height: 1.6;
                }
                .retry-btn {
                    background: #000;
                    color: white;
                    border: 2px solid #000;
                    padding: 0.75rem 2rem;
                    font-size: 0.875rem;
                    font-weight: 500;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .retry-btn:hover {
                    background: #333;
                    transform: translateY(-1px);
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
                <button class="retry-btn" onclick="location.reload()">
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

// Handle background sync for offline actions
self.addEventListener('sync', event => {
    console.log('[SW] Background sync:', event.tag);
    
    if (event.tag === 'background-sync-scan-data') {
        event.waitUntil(syncScanData());
    }
});

// Sync scan data when back online
async function syncScanData() {
    try {
        console.log('[SW] Syncing scan data...');
        
        // Get stored scan data from IndexedDB or localStorage
        const clients = await self.clients.matchAll();
        
        if (clients.length > 0) {
            // Notify clients that sync is happening
            clients.forEach(client => {
                client.postMessage({
                    type: 'SYNC_STARTED',
                    message: 'Syncing offline scan data...'
                });
            });
        }
        
        // Here you would implement actual data synchronization
        // For now, just log that sync completed
        console.log('[SW] Scan data sync completed');
        
        if (clients.length > 0) {
            clients.forEach(client => {
                client.postMessage({
                    type: 'SYNC_COMPLETED',
                    message: 'Offline data synchronized'
                });
            });
        }
        
    } catch (error) {
        console.error('[SW] Sync failed:', error);
    }
}

// Handle push notifications (future enhancement)
self.addEventListener('push', event => {
    if (!event.data) return;
    
    const data = event.data.json();
    const options = {
        body: data.body,
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        tag: 'qr-scanner-notification',
        requireInteraction: true,
        actions: [
            {
                action: 'view',
                title: 'View',
                icon: '/icon-view.png'
            },
            {
                action: 'dismiss',
                title: 'Dismiss',
                icon: '/icon-dismiss.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    if (event.action === 'view') {
        event.waitUntil(
            clients.openWindow('/qrcode.html')
        );
    }
});

// Handle messages from clients
self.addEventListener('message', event => {
    console.log('[SW] Message received:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({
            version: CACHE_NAME,
            timestamp: new Date().toISOString()
        });
    }
});

// Periodic background sync (if supported)
if ('periodicSync' in self.registration) {
    self.addEventListener('periodicsync', event => {
        if (event.tag === 'update-scan-data') {
            event.waitUntil(updateScanData());
        }
    });
}

async function updateScanData() {
    try {
        console.log('[SW] Periodic sync: updating scan data');
        // Implement periodic data updates here
    } catch (error) {
        console.error('[SW] Periodic sync failed:', error);
    }
}

console.log('[SW] Service Worker registered and ready');
