const CACHE_NAME = 'barabar-cache-v2';
const STATIC_CACHE_NAME = 'barabar-static-v1';
const DYNAMIC_CACHE_NAME = 'barabar-dynamic-v1';

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/browserconfig.xml',
  '/src/main.jsx',
  '/src/App.jsx',
  '/src/firebase.js',
  '/src/styles.css',
  '/src/pages/AuthPage.jsx',
  '/src/pages/GroupListPage.jsx',
  '/src/pages/GroupDetailPage.jsx',
  '/src/utils/balance.js'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME &&
                cacheName !== CACHE_NAME) {
              console.log('Service Worker: Clearing old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - implement network-first strategy for API calls, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Handle Firebase API requests (network-first with offline fallback)
  if (url.hostname.includes('firebaseio.com') || url.hostname.includes('googleapis.com')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful API responses for offline use
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE_NAME)
              .then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => {
          // Try to get cached response when offline
          return caches.match(request);
        })
    );
    return;
  }

  // Handle static assets (cache-first)
  if (STATIC_ASSETS.includes(url.pathname) || 
      url.pathname.startsWith('/src/') || 
      url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // If not in cache, fetch from network and cache
          return fetch(request)
            .then((response) => {
              if (!response.ok) throw new Error('Network response was not ok');
              
              const responseClone = response.clone();
              caches.open(STATIC_CACHE_NAME)
                .then((cache) => cache.put(request, responseClone));
              return response;
            })
            .catch(() => {
              // Return cached version if network fails
              return caches.match(request);
            });
        })
    );
    return;
  }

  // Handle other requests (network-first with cache fallback)
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE_NAME)
            .then((cache) => cache.put(request, responseClone));
        }
        return response;
      })
      .catch(() => {
        // Try cache when network fails
        return caches.match(request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // Return offline page for navigation requests
            if (request.mode === 'navigate') {
              return caches.match('/') || 
                new Response('Offline - Please check your connection', {
                  status: 503,
                  statusText: 'Service Unavailable'
                });
            }
            
            // Return offline response for other requests
            return new Response('Offline - Please check your connection', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync-expenses') {
    event.waitUntil(syncExpenses());
  }
});

// Push notification handling
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New expense update',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    },
    actions: [
      {
        action: 'explore',
        title: 'View Expense',
        icon: '/icons/icon-96.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/icon-96.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Barabar', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Sync expenses when back online
async function syncExpenses() {
  // Implementation for syncing offline expenses
  console.log('Background sync: Syncing expenses...');
}

