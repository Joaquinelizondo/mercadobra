// Service Worker para Mercadobra & OxI Pro Suite PWA
const CACHE_NAME = 'mercadobra-pwa-v1'

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/apple-touch-icon.png'
]

// Instalación: pre-cachear activos esenciales
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('PWA Cache install partial warning:', err)
      })
    })
  )
  self.skipWaiting()
})

// Activación: limpiar caches viejos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    })
  )
  self.clients.claim()
})

// Fetch: Network-first para navegación y API, Stale-while-revalidate para estáticos
self.addEventListener('fetch', event => {
  const req = event.request

  // Ignorar peticiones que no sean GET
  if (req.method !== 'GET') return

  // Ignorar peticiones a la API o dominios externos
  const url = new URL(req.url)
  if (url.pathname.startsWith('/api') || url.origin !== self.location.origin) {
    return
  }

  // Navegación (HTML de las rutas cliente): Network-first con fallback a cache
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          const resClone = res.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(req, resClone))
          return res
        })
        .catch(() => caches.match('/index.html') || caches.match(req))
    )
    return
  }

  // Activos estáticos (JS, CSS, imágenes): Stale-while-revalidate
  event.respondWith(
    caches.match(req).then(cached => {
      const fetchPromise = fetch(req).then(networkRes => {
        if (networkRes && networkRes.status === 200) {
          const resClone = networkRes.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(req, resClone))
        }
        return networkRes
      }).catch(() => cached)

      return cached || fetchPromise
    })
  )
})
