const CACHE_NAME = 'cfs-erp-v2';
const BASE = '/Dashboard-Utama';

const urlsToCache = [
    `${BASE}/`,
    `${BASE}/index.html`,
    `${BASE}/js/storage.js`,
    `${BASE}/js/settings.js`,
    `${BASE}/js/inventory.js`,
    `${BASE}/js/sales.js`,
    `${BASE}/js/accounting.js`,
    `${BASE}/js/dashboard.js`,
    `${BASE}/js/app.js`,
    `${BASE}/js/products.js`,
    `${BASE}/js/pricing.js`,
    `${BASE}/js/crm.js`,
    `${BASE}/js/crm-detail.js`,
    `${BASE}/js/purchase.js`,
    `${BASE}/js/supplier.js`,
    `${BASE}/js/notifications.js`,
    `${BASE}/js/history.js`,
    `${BASE}/js/reports.js`,
    `${BASE}/js/audit.js`,
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/@phosphor-icons/web',
    'https://cdn.jsdelivr.net/npm/localforage@1.10.0/dist/localforage.min.js',
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js',
    'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
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
                // fallback ke index.html untuk navigasi
                if (event.request.mode === 'navigate') {
                    return caches.match(`${BASE}/index.html`);
                }
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
