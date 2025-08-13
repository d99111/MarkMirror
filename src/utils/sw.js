// Service Worker for MarkMirror Mobile PWA
// Provides offline functionality and caching

const CACHE_NAME = 'markmirror-v2.1.0';
const STATIC_CACHE_NAME = 'markmirror-static-v2.1.0';
const DYNAMIC_CACHE_NAME = 'markmirror-dynamic-v2.1.0';

// Files to cache for offline use
const STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/script/index.js',
  '/src/style/index.css',
  '/src/ui/editor.js',
  '/src/ui/simpleEditor.js',
  '/src/ui/preview.js',
  '/src/ui/analyticsPanel.js',
  '/src/utils/markdownParser.js',
  '/src/utils/storage.js',
  '/src/utils/fileHandler.js',
  '/src/utils/analytics.js',
  '/src/utils/editor-actions.js',
  '/src/style/editor-actions.css',
  '/src/ui/searchReplace.js',
  '/tests/index.html',
  '/tests/markdownParser.test.js'
];

// External resources to cache
const EXTERNAL_RESOURCES = [
  'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/default.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js',
  'https://cdn.jsdelivr.net/npm/dompurify@3.0.5/dist/purify.min.js',
  'https://cdn.jsdelivr.net/npm/marked@9.1.6/marked.min.js'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache static files
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        console.log('📦 Service Worker: Caching static files');
        return cache.addAll(STATIC_FILES);
      }),
      
      // Cache external resources
      caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
        console.log('🌐 Service Worker: Caching external resources');
        return Promise.allSettled(
          EXTERNAL_RESOURCES.map(url => 
            cache.add(url).catch(err => {
              console.warn(`Failed to cache ${url}:`, err);
            })
          )
        );
      })
    ]).then(() => {
      console.log('✅ Service Worker: Installation complete');
      // Force activation of new service worker
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete old caches
          if (cacheName !== STATIC_CACHE_NAME && 
              cacheName !== DYNAMIC_CACHE_NAME &&
              cacheName.startsWith('markmirror-')) {
            console.log('🗑️ Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker: Activation complete');
      // Take control of all pages immediately
      return self.clients.claim();
    })
  );
});

// Fetch event - serve cached files or fetch from network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      // Return cached version if available
      if (cachedResponse) {
        console.log('📦 Service Worker: Serving from cache:', request.url);
        return cachedResponse;
      }
      
      // Fetch from network
      console.log('🌐 Service Worker: Fetching from network:', request.url);
      return fetch(request).then((response) => {
        // Don't cache non-successful responses
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        
        // Clone response for caching
        const responseToCache = response.clone();
        
        // Cache dynamic content
        caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });
        
        return response;
      }).catch((error) => {
        console.error('❌ Service Worker: Fetch failed:', error);
        
        // Return offline fallback for HTML pages
        if (request.headers.get('accept').includes('text/html')) {
          return caches.match('/index.html');
        }
        
        // Return empty response for other resources
        return new Response('', {
          status: 408,
          statusText: 'Request timeout - offline'
        });
      });
    })
  );
});

// Background sync for saving data when back online
self.addEventListener('sync', (event) => {
  console.log('🔄 Service Worker: Background sync:', event.tag);
  
  if (event.tag === 'save-document') {
    event.waitUntil(
      // Try to save any pending documents
      saveDocumentWhenOnline()
    );
  }
});

// Push notifications (for future use)
self.addEventListener('push', (event) => {
  console.log('📬 Service Worker: Push received');
  
  const options = {
    body: event.data ? event.data.text() : 'MarkMirror notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'open',
        title: 'Открыть MarkMirror',
        icon: '/icons/icon-96x96.png'
      },
      {
        action: 'close',
        title: 'Закрыть',
        icon: '/icons/icon-96x96.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('MarkMirror Mobile', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Service Worker: Notification clicked');
  
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message handler for communication with main app
self.addEventListener('message', (event) => {
  console.log('💬 Service Worker: Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Helper function to save document when online
async function saveDocumentWhenOnline() {
  try {
    // This would integrate with the main app's storage system
    console.log('💾 Service Worker: Attempting to save document...');
    
    // For now, just log - in a real implementation,
    // this would sync with cloud storage or send to server
    return Promise.resolve();
  } catch (error) {
    console.error('❌ Service Worker: Failed to save document:', error);
    throw error;
  }
}

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  console.log('⏰ Service Worker: Periodic sync:', event.tag);
  
  if (event.tag === 'backup-documents') {
    event.waitUntil(
      // Backup documents periodically
      backupDocuments()
    );
  }
});

async function backupDocuments() {
  try {
    console.log('💾 Service Worker: Backing up documents...');
    // Implementation would go here
    return Promise.resolve();
  } catch (error) {
    console.error('❌ Service Worker: Backup failed:', error);
    throw error;
  }
}
