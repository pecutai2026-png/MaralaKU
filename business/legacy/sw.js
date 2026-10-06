const CACHE = 'bumm-marala-v11';
const ASSETS = ['./', './index.html', './styles.css', './dashboard-period.css', './table-actions.css', './invoice-builder.css', './invoice-builder-fixes.css', './invoice-list-filters.css', './invoice-list-fixes.css', './revenue-tools.css', './payment-module.css', './app.js', './manifest.webmanifest'];
self.addEventListener('install', (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS))));
self.addEventListener('activate', (event) => event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))));
self.addEventListener('fetch', (event) => event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request))));
