const CACHE_NAME = 'college-app-cache-v1';
const urlsToCache = [
  '/',
  '/dashboard',
  '/about',
  '/signup',
  '/onboarding',
  '/favicon.ico',
  '/manifest.json',
  // PWA icons
  '/images/icon512_maskable.png',
  '/images/icon512_rounded.png',
  '/images/android-chrome-192x192.png',
  '/images/apple-touch-icon.png',
  // Add static assets that are likely to exist
  '/next.svg',
  '/vercel.svg'
];

const self = this;

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('🔧 [SW] Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 [SW] Cache opened:', CACHE_NAME);
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('✅ [SW] All resources cached successfully');
        // Don't force immediate activation - let it activate naturally
      })
      .catch((error) => {
        console.error('❌ [SW] Failed to cache resources:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🔄 [SW] Service Worker activating...');
  const cacheWhitelist = [CACHE_NAME];

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('🗑️ [SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ [SW] Service Worker activated');
      
      // Schedule the first notification check
      console.log('📅 [SW] Scheduling initial notification check...');
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip caching for API requests
  if (url.pathname.startsWith('/api/') || 
      url.hostname.includes('trycloudflare.com') ||
      url.hostname.includes('localhost') && url.port === '3001' ||
      event.request.method !== 'GET') {
    // For API requests, just pass through to network
    return event.respondWith(fetch(event.request));
  }
  
  // For non-API requests, use cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        if (response) {
          console.log('Serving from cache:', event.request.url);
          return response;
        }
        
        console.log('Fetching from network:', event.request.url);
        return fetch(event.request).then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response because it's a stream
          const responseToCache = response.clone();
          
          // Add successful responses to cache
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        });
      })
      .catch((error) => {
        console.error('Fetch failed:', error);
        // When both network and cache fail, return the offline page
        return caches.match('/offline.html').then((response) => {
          if (response) {
            // If offline.html is in cache, show it
            console.log('Showing offline page from cache');
            return response;
          } 
          // If offline.html isn't cached yet, show a basic error message
          console.log('Offline page not found in cache, showing basic message');
          return new Response('Offline - Please check your internet connection', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
  );
});

self.addEventListener('push', async (event) => {
  console.log('🔔 [SW] Push event received');
  
  if (!event.data) {
    console.error('❌ [SW] Push event has no data');
    return;
  }
  
  try {
    const payload = event.data.json();
    console.log('📦 [SW] Push payload:', payload);
    
    const { title, message, icon } = payload;
    
    const notificationOptions = {
      body: message || 'You have a new notification',
      icon: icon || '/images/icon512_rounded.png',
      badge: '/images/icon512_rounded.png',
      vibrate: [200, 100, 200],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      },
      actions: [
        {
          action: 'view',
          title: 'View',
        },
        {
          action: 'close',
          title: 'Close',
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(title || 'Notification', notificationOptions)
        .then(() => console.log('✅ [SW] Notification shown successfully'))
        .catch(err => console.error('❌ [SW] Error showing notification:', err))
    );
  } catch (error) {
    console.error('❌ [SW] Error parsing push data:', error);
    
    // Fallback notification
    event.waitUntil(
      self.registration.showNotification('New Notification', {
        body: 'You have a new notification',
        icon: '/images/icon512_rounded.png'
      })
    );
  }
})

// Handle messages from the client (for testing)
self.addEventListener('message', (event) => {
  console.log('📨 [SW] Message received:', event.data);
  
  if (event.data.type === 'SIMULATE_PUSH') {
    // Simulate a push event
    const { title, message, icon } = event.data.payload;
    
    self.registration.showNotification(title || 'Test Notification', {
      body: message || 'This is a test notification',
      icon: icon || '/images/icon512_rounded.png',
      badge: '/images/icon512_rounded.png',
      vibrate: [200, 100, 200],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      }
    }).then(() => {
      console.log('✅ [SW] Test notification shown');
      // Send response back to client
      event.ports[0]?.postMessage({ success: true });
    }).catch(err => {
      console.error('❌ [SW] Error showing test notification:', err);
      event.ports[0]?.postMessage({ success: false, error: err.message });
    });
  }
});

self.addEventListener('notificationclick', (event) => {
  console.log('👆 [SW] Notification clicked:', event.action);
  event.notification.close();
  
  let responseUrl = '/dashboard';
  
  if (event.action === 'view') {
    responseUrl = '/dashboard';
  } else if (event.action === 'close') {
    return; // Just close the notification
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Check if there's already a window/tab open
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(responseUrl);
        }
      })
      .catch((error) => {
        console.error('❌ [SW] Error handling notification click:', error);
      })
  );
})




