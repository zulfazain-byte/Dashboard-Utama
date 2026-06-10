const CACHE_NAME = 'cfs-erp-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/js/storage.js',
    '/js/settings.js',
    '/js/inventory.js',
    '/js/sales.js',
    '/js/accounting.js',
    '/js/dashboard.js',
    '/js/app.js',
    '/js/products.js',
    '/js/pricing.js',
    '/js/crm.js',
    '/js/crm-detail.js',
    '/js/purchase.js',
    '/js/supplier.js',
    '/js/notifications.js',
    '/js/history.js',
    '/js/reports.js',
    '/js/audit.js',
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/@phosphor-icons/web',
    'https://cdn.jsdelivr.net/npm/localforage@1.10.0/dist/localforage.min.js',
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js',
    'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll(urlsToCache);
        })
    );
});

self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.match(event.request).then(function(response) {
            return response || fetch(event.request);
        })
    );
});

self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(name) {
                    if (name !== CACHE_NAME) {
                        return caches.delete(name);
                    }
                })
            );
        })
    );
});
