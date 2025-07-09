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
          
          // Only cache GET requests - POST requests are not supported by Cache API
          if (event.request.method === 'GET') {
            // Add successful responses to cache
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
          }
          
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
const {title,message,icon} = await event.data.json()

event.waitUntil(
  self.registration.showNotification(title, {
    body: message,
    icon: icon
  })
)

})

self.addEventListener('notificationclick',(event)=>{
  event.notification.close()
  event.waitUntil(
    clients.openWindow('/')
    .then(()=>{
      if(clients.getFocused()){
        clients.getFocused().focus()
      }
    })
    .catch((error)=>{
      console.error('Error focusing window:',error) 
    })
  )
})




