const CACHE_NAME = "pos-cache-v1"
const API_CACHE_NAME = "pos-api-cache-v1"

const STATIC_ASSETS = ["/", "/manifest.json", "/offline.html"]

// Install event - cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()),
  )
})

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
              return caches.delete(cacheName)
            }
          }),
        )
      })
      .then(() => self.clients.claim()),
  )
})

// Fetch event - serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  const { request } = event

  // Handle API requests
  if (request.url.includes("/api/")) {
    event.respondWith(handleApiRequest(request))
    return
  }

  // Handle static assets
  event.respondWith(
    caches
      .match(request)
      .then((response) => {
        if (response) {
          return response
        }
        return fetch(request).then((response) => {
          // Cache successful responses
          if (response.status === 200) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone))
          }
          return response
        })
      })
      .catch(() => {
        // Return offline page for navigation requests
        if (request.mode === "navigate") {
          return caches.match("/offline.html")
        }
      }),
  )
})

// Handle API requests with caching strategy
async function handleApiRequest(request) {
  const url = new URL(request.url)

  try {
    // Try network first
    const networkResponse = await fetch(request)

    // Cache successful GET requests
    if (request.method === "GET" && networkResponse.ok) {
      const cache = await caches.open(API_CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch (error) {
    // Network failed, try cache for GET requests
    if (request.method === "GET") {
      const cachedResponse = await caches.match(request)
      if (cachedResponse) {
        return cachedResponse
      }
    }

    // For POST requests (sales), store in IndexedDB for later sync
    if (request.method === "POST" && url.pathname === "/api/sales") {
      // This would be handled by the main app
      return new Response(JSON.stringify({ error: "Offline - will sync later" }), {
        status: 202,
        headers: { "Content-Type": "application/json" },
      })
    }

    throw error
  }
}

// Background sync event with shorter tag
self.addEventListener("sync", (event) => {
  console.log("Background sync event triggered:", event.tag)

  if (event.tag === "sync") {
    event.waitUntil(syncPendingSales())
  }
})

// Sync pending sales when back online
async function syncPendingSales() {
  try {
    console.log("Service Worker: Starting background sync...")

    // This would communicate with the main app to sync pending sales
    const clients = await self.clients.matchAll()

    if (clients.length > 0) {
      clients.forEach((client) => {
        client.postMessage({ type: "SYNC_SALES" })
      })
      console.log("Service Worker: Sync message sent to clients")
    } else {
      console.log("Service Worker: No active clients found")
    }
  } catch (error) {
    console.error("Service Worker: Background sync failed:", error)
  }
}

// Push notification event
self.addEventListener("push", (event) => {
  const options = {
    body: event.data ? event.data.text() : "New notification",
    icon: "/icon-192x192.png",
    badge: "/badge-72x72.png",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
  }

  event.waitUntil(self.registration.showNotification("POS System", options))
})
