const CACHE_NAME = 'cfs-erp-v2';
const urlsToCache = [
    '/Dashboard-Utama/',
    '/Dashboard-Utama/index.html',
    '/Dashboard-Utama/js/storage.js',
    '/Dashboard-Utama/js/settings.js',
    '/Dashboard-Utama/js/inventory.js',
    '/Dashboard-Utama/js/sales.js',
    '/Dashboard-Utama/js/accounting.js',
    '/Dashboard-Utama/js/dashboard.js',
    '/Dashboard-Utama/js/app.js',
    '/Dashboard-Utama/js/products.js',
    '/Dashboard-Utama/js/pricing.js',
    '/Dashboard-Utama/js/crm.js',
    '/Dashboard-Utama/js/crm-detail.js',
    '/Dashboard-Utama/js/purchase.js',
    '/Dashboard-Utama/js/supplier.js',
    '/Dashboard-Utama/js/notifications.js',
    '/Dashboard-Utama/js/history.js',
    '/Dashboard-Utama/js/reports.js',
    '/Dashboard-Utama/js/audit.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request).catch(() => {
                return caches.match('/Dashboard-Utama/index.html');
            });
        })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
        ))
    );
});
