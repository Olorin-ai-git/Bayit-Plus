// Service Worker for CVPlus Offline Functionality
const CACHE_NAME = 'cvplus-v1';
const OFFLINE_URL = '/offline.html';

const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/favicon.ico',
  // Add other critical assets here
];

const API_CACHE_PATTERNS = [
  /^https:\/\/api\.cvplus\.ai\/sessions\//,
  /^https:\/\/api\.cvplus\.ai\/features\//
];

// Install event - cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => cacheName !== CACHE_NAME)
            .map(cacheName => caches.delete(cacheName))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', event => {
  // Handle navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Handle API requests with cache-first strategy for session data
  if (isApiRequest(event.request)) {
    event.respondWith(handleApiRequest(event.request));
    return;
  }

  // Handle static assets with cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

// Background sync for queued actions
self.addEventListener('sync', event => {
  if (event.tag === 'session-sync') {
    event.waitUntil(syncQueuedActions());
  }
});

// Message handling for communication with main thread
self.addEventListener('message', event => {
  const { type, data } = event.data;

  switch (type) {
    case 'QUEUE_ACTION':
      queueAction(data);
      break;
    
    case 'GET_SYNC_STATUS':
      event.ports[0].postMessage({ 
        syncStatus: self.registration.sync ? 'enabled' : 'disabled'
      });
      break;
  }
});

// Helper functions
function isApiRequest(request) {
  return API_CACHE_PATTERNS.some(pattern => pattern.test(request.url));
}

async function handleApiRequest(request) {
  const cacheName = `api-${CACHE_NAME}`;
  
  try {
    // Try network first
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // Return cached version if available
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response for failed API calls
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'This request will be retried when you\'re back online' 
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

async function syncQueuedActions() {
  try {
    // Get queued actions from IndexedDB
    const actions = await getQueuedActions();
    
    for (const action of actions) {
      try {
        await executeAction(action);
        await removeQueuedAction(action.id);
      } catch (error) {
        console.error('Failed to sync action:', error);
        // Update retry count or handle failure
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

function queueAction(actionData) {
  // Store action in IndexedDB for later sync
  // This would integrate with the OfflineSessionManager's IndexedDB
  console.log('Queuing action for background sync:', actionData);
}

async function getQueuedActions() {
  // Retrieve actions from IndexedDB
  return [];
}

async function executeAction(action) {
  // Execute the queued action via API call
  const response = await fetch(action.endpoint, {
    method: action.method,
    headers: action.headers,
    body: JSON.stringify(action.payload)
  });
  
  if (!response.ok) {
    throw new Error(`Action execution failed: ${response.status}`);
  }
  
  return response;
}

async function removeQueuedAction(actionId) {
  // Remove successfully executed action from IndexedDB
  console.log('Removing completed action:', actionId);
}