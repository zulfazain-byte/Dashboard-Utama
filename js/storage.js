// js/storage.js
// Inisialisasi localForage dan fungsi-fungsi dasar CRUD

localforage.config({
    name: 'CibitungFrozen',
    storeName: 'main'
});

const CFS = window.CFS || {};

CFS.Storage = {
    async get(key) {
        return await localforage.getItem(key);
    },
    async set(key, value) {
        return await localforage.setItem(key, value);
    },
    async remove(key) {
        return await localforage.removeItem(key);
    },
    async clearAll() {
        return await localforage.clear();
    },
    // Kunci utama
    STOCK_KEY: 'stock_batches',
    JOURNALS_KEY: 'journals',
    SETTINGS_KEY: 'settings',
    TRANSACTIONS_KEY: 'transactions'
};
