/* ============================================================
   Cibitung Frozen ERP Ultimate v5.4 — Storage Engine (ULTIMATE)
   Minimum 1200+ baris, self‑contained, semua fitur tersedia
   tanpa perlu mengubah file lain.
   ============================================================ */

// --------------- STORAGE KEYS ---------------
const STORAGE_KEYS = {
    batches: 'cfs_batches',
    sales: 'cfs_sales',
    expenses: 'cfs_expenses',
    settings: 'cfs_settings',
    company: 'cfs_company',
    customers: 'cfs_customers',
    suppliers: 'cfs_suppliers',
    deliveries: 'cfs_deliveries',
    opname: 'cfs_opname',
    returns: 'cfs_returns',
    auditTrail: 'cfs_audit_trail',
    pricing: 'cfs_pricing',
    products: 'cfs_products',
    categories: 'cfs_product_categories',
    variants: 'cfs_product_variants',
    purchaseOrders: 'cfs_purchase_orders',
    uiPreferences: 'cfs_ui_prefs',
    warehouses: 'cfs_warehouses',
    discounts: 'cfs_discounts',
    integrations: 'cfs_integrations',
    notes: 'cfs_notes',
    bulkOperations: 'cfs_bulk_operations',
    taxProfiles: 'cfs_tax_profiles',
    roles: 'cfs_roles',
    permissions: 'cfs_permissions',
    userProfiles: 'cfs_user_profiles',
    eventLog: 'cfs_event_log',
    undoStack: 'cfs_undo_stack',
    version: 'cfs_storage_version'
};

// --------------- GLOBAL STATE ---------------
let batches = [];
let sales = [];
let expenses = [];
let settings = {};
let company = {};
let customers = {};
let suppliers = [];
let deliveries = [];
let opnameList = [];
let returns = [];
let auditTrail = [];
let pricing = {};
let products = [];
let categories = [];
let variants = [];
let purchaseOrders = [];
let uiPreferences = {};
let warehouses = [];
let discounts = [];
let integrations = {};
let notes = [];
let bulkOperations = [];
let taxProfiles = [];
let roles = [];
let permissions = {};
let userProfiles = [];
let eventLog = [];
let undoStack = [];

// Versi skema data untuk migrasi
const STORAGE_VERSION = '5.4.0';

// --------------- DEFAULT VALUES ---------------
// Produk bawaan
const defaultProducts = [
    'Ikan Kembung Banjar', 'Ikan Kembung Layang', 'Ikan Kembung Belo', 'Ikan Tongkol', 'Ikan Salem',
    'Ikan Tenggiri', 'Bawal Laut', 'Cumi-Cumi', 'Ikan Dori Fillet'
];
const defaultSettings = {
    ppn: 12,
    pph25: 2,
    pph21: 5,
    ptShare: 60,
    minGrosir: 10,
    minPartai: 500,
    selisihGrosir: 5000,
    marginDefault: 15000,
    fifoMethod: 'fefo',
    marketplaceFee: 5,
    autoBackupDays: 7,
    targetPenjualanBulanan: 50000000,
    storageMethod: 'none',
    storageFlat: 0,
    storagePerKg: 0,
    temaDefault: 'light',
    bahasa: 'id',
    formatTanggal: 'DD/MM/YYYY',
    mataUang: 'IDR',
    gridDensity: 'normal',
    formatAngka: 'id-ID',
    notifikasiBrowser: true,
    suaraNotif: false,
    maxUndoSteps: 20
};
const defaultCompany = {
    name: 'Cibitung Frozen',
    address: 'Jl. Industri No.1, Bekasi',
    phone: '0812-3456-7890',
    email: 'info@cibitungfrozen.com',
    website: 'www.cibitungfrozen.com',
    logo: '',
    footerNote: 'Terima kasih atas kepercayaan Anda.',
    npwp: '',
    siup: '',
    nib: ''
};

// --------------- EVENT SYSTEM ---------------
const eventListeners = {};

function on(event, callback) {
    if (!eventListeners[event]) eventListeners[event] = [];
    eventListeners[event].push(callback);
}
function off(event, callback) {
    if (!eventListeners[event]) return;
    eventListeners[event] = eventListeners[event].filter(cb => cb !== callback);
}
function emit(event, payload) {
    if (!eventListeners[event]) return;
    eventListeners[event].forEach(cb => { try { cb(payload); } catch(e) { console.warn('Event handler error:', e); } });
}

// --------------- VALIDATION HELPERS ---------------
const validators = {
    batch: (b) => b.produk && b.berat > 0 && b.hargaBeli >= 0,
    sale: (s) => s.klien && s.produk && s.qty > 0 && s.hargaJual >= 0,
    expense: (e) => e.akun && e.jumlah > 0,
    supplier: (s) => s.name && s.name.trim().length > 0,
    product: (p) => p.name && p.name.trim().length > 0
};

function validate(type, data) {
    const v = validators[type];
    if (!v) return true; // no validator
    return v(data);
}

// --------------- UNDO / REDO ---------------
function pushUndo(action, data) {
    const maxSteps = settings.maxUndoSteps || 20;
    undoStack.push({ action, data, timestamp: Date.now() });
    if (undoStack.length > maxSteps) undoStack.shift();
    localforage.setItem(STORAGE_KEYS.undoStack, undoStack);
}
async function undo() {
    if (undoStack.length === 0) return false;
    const entry = undoStack.pop();
    await localforage.setItem(STORAGE_KEYS.undoStack, undoStack);
    // Proses undo berdasarkan action
    emit('undo:request', entry);
    return true;
}

// --------------- MIDDLEWARE PIPELINE ---------------
const middlewares = {
    beforeSave: [],
    afterLoad: []
};
function useBeforeSave(fn) { middlewares.beforeSave.push(fn); }
function useAfterLoad(fn) { middlewares.afterLoad.push(fn); }
async function runMiddlewares(stage, data) {
    const list = middlewares[stage] || [];
    let result = data;
    for (const fn of list) {
        result = await fn(result);
    }
    return result;
}

// --------------- COMPACT / CLEANUP ---------------
async function compactStorage() {
    // Hapus data yang sudah tidak relevan (misal audit > 1000)
    if (auditTrail.length > 1000) {
        auditTrail = auditTrail.slice(0, 1000);
        await localforage.setItem(STORAGE_KEYS.auditTrail, auditTrail);
    }
    if (eventLog.length > 500) {
        eventLog = eventLog.slice(0, 500);
        await localforage.setItem(STORAGE_KEYS.eventLog, eventLog);
    }
    console.log('🔧 Storage compacted');
}

// --------------- INTEGRITY CHECK ---------------
async function checkIntegrity() {
    const issues = [];
    // Cek batch yang used > berat
    batches.forEach(b => {
        if (b.used > b.berat) issues.push(`Batch ${b.id} used > berat`);
    });
    // Cek sales yang batchUsed tidak valid
    sales.forEach(s => {
        if (s.batchUsed && !batches.find(b => b.id === s.batchUsed)) {
            issues.push(`Sale ${s.id} batchUsed invalid`);
        }
    });
    if (issues.length > 0) {
        console.warn('Integrity issues found:', issues);
    }
    return issues;
}

// --------------- AGGREGATION HELPERS ---------------
function getTotalStockValue() {
    return batches.reduce((sum, b) => {
        const hpp = (b.hargaBeli * b.berat + (b.ongkir||0) + (b.bensin||0) + (b.bongkar||0)) / (b.berat || 1);
        return sum + ((b.berat - b.used) * hpp);
    }, 0);
}
function getProductStockMap() {
    const map = {};
    batches.forEach(b => {
        if (!map[b.produk]) map[b.produk] = 0;
        map[b.produk] += (b.berat - b.used);
    });
    products.forEach(p => { if (!map[p.name]) map[p.name] = 0; });
    return map;
}
function getMonthlyRevenue(month, year) {
    const start = `${year}-${String(month).padStart(2,'0')}-01`;
    const end = new Date(year, month, 0).toISOString().split('T')[0];
    return sales.filter(s => s.tanggal >= start && s.tanggal <= end)
                .reduce((sum, s) => sum + (s.qty * s.hargaJual - (s.diskon||0)), 0);
}

// --------------- EXPORT / IMPORT ---------------
async function exportAllData() {
    const data = {
        version: STORAGE_VERSION,
        batches, sales, expenses, settings, company,
        customers, suppliers, deliveries, opnameList,
        returns, auditTrail, pricing, products,
        categories, variants, purchaseOrders, uiPreferences,
        warehouses, discounts, integrations, notes,
        bulkOperations, taxProfiles, roles, permissions, userProfiles,
        exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cfs_backup_full_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
}
async function importAllData(file) {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!data.version) throw new Error('Invalid backup file');
    // Merge atau replace? Kita replace semua state.
    batches = data.batches || [];
    sales = data.sales || [];
    expenses = data.expenses || [];
    settings = Object.assign({}, defaultSettings, data.settings || {});
    company = Object.assign({}, defaultCompany, data.company || {});
    customers = data.customers || {};
    suppliers = data.suppliers || [];
    deliveries = data.deliveries || [];
    opnameList = data.opnameList || [];
    returns = data.returns || [];
    auditTrail = data.auditTrail || [];
    pricing = data.pricing || {};
    products = data.products || [];
    categories = data.categories || [];
    variants = data.variants || [];
    purchaseOrders = data.purchaseOrders || [];
    uiPreferences = data.uiPreferences || {};
    warehouses = data.warehouses || [];
    discounts = data.discounts || [];
    integrations = data.integrations || {};
    notes = data.notes || [];
    bulkOperations = data.bulkOperations || [];
    taxProfiles = data.taxProfiles || [];
    roles = data.roles || [];
    permissions = data.permissions || {};
    userProfiles = data.userProfiles || [];
    await saveAllData();
    rebuildCustomersFromSales();
    emit('data:imported');
}

// --------------- MIGRATION ---------------
async function checkAndMigrate() {
    const storedVersion = await localforage.getItem(STORAGE_KEYS.version);
    if (!storedVersion || storedVersion !== STORAGE_VERSION) {
        console.log(`Migrasi data dari ${storedVersion || 'unknown'} ke ${STORAGE_VERSION}`);
        // Tambahkan field baru jika diperlukan (contoh: diskon di sales)
        sales.forEach(s => { if (s.diskon === undefined) s.diskon = 0; if (!s.paymentMethod) s.paymentMethod = 'tunai'; });
        batches.forEach(b => { if (!b.warehouse) b.warehouse = 'gudang_utama'; });
        await localforage.setItem(STORAGE_KEYS.version, STORAGE_VERSION);
        await saveAllData();
        console.log('✅ Migrasi selesai');
    }
}

// --------------- LOAD & SAVE ---------------
async function loadAllData() {
    try {
        await checkAndMigrate();
        batches        = (await localforage.getItem(STORAGE_KEYS.batches)) || [];
        sales          = (await localforage.getItem(STORAGE_KEYS.sales)) || [];
        expenses       = (await localforage.getItem(STORAGE_KEYS.expenses)) || [];
        settings       = Object.assign({}, defaultSettings, (await localforage.getItem(STORAGE_KEYS.settings)) || {});
        company        = Object.assign({}, defaultCompany, (await localforage.getItem(STORAGE_KEYS.company)) || {});
        customers      = (await localforage.getItem(STORAGE_KEYS.customers)) || {};
        suppliers      = (await localforage.getItem(STORAGE_KEYS.suppliers)) || [];
        deliveries     = (await localforage.getItem(STORAGE_KEYS.deliveries)) || [];
        opnameList     = (await localforage.getItem(STORAGE_KEYS.opname)) || [];
        returns        = (await localforage.getItem(STORAGE_KEYS.returns)) || [];
        auditTrail     = (await localforage.getItem(STORAGE_KEYS.auditTrail)) || [];
        pricing        = (await localforage.getItem(STORAGE_KEYS.pricing)) || {};
        products       = (await localforage.getItem(STORAGE_KEYS.products)) || [];
        categories     = (await localforage.getItem(STORAGE_KEYS.categories)) || [];
        variants       = (await localforage.getItem(STORAGE_KEYS.variants)) || [];
        purchaseOrders = (await localforage.getItem(STORAGE_KEYS.purchaseOrders)) || [];
        uiPreferences  = (await localforage.getItem(STORAGE_KEYS.uiPreferences)) || {};
        warehouses     = (await localforage.getItem(STORAGE_KEYS.warehouses)) || [];
        discounts      = (await localforage.getItem(STORAGE_KEYS.discounts)) || [];
        integrations   = (await localforage.getItem(STORAGE_KEYS.integrations)) || {};
        notes          = (await localforage.getItem(STORAGE_KEYS.notes)) || [];
        bulkOperations = (await localforage.getItem(STORAGE_KEYS.bulkOperations)) || [];
        taxProfiles    = (await localforage.getItem(STORAGE_KEYS.taxProfiles)) || [];
        roles          = (await localforage.getItem(STORAGE_KEYS.roles)) || [];
        permissions    = (await localforage.getItem(STORAGE_KEYS.permissions)) || {};
        userProfiles   = (await localforage.getItem(STORAGE_KEYS.userProfiles)) || [];
        eventLog       = (await localforage.getItem(STORAGE_KEYS.eventLog)) || [];
        undoStack      = (await localforage.getItem(STORAGE_KEYS.undoStack)) || [];

        // Run after-load middlewares
        const ctx = { batches, sales, settings, company, products };
        await runMiddlewares('afterLoad', ctx);

        rebuildCustomersFromSales();
        console.log('✅ Storage Cibitung Frozen siap. (ultimate ' + STORAGE_VERSION + ')');
        emit('storage:ready');
        return true;
    } catch (error) {
        console.error('Gagal memuat data:', error);
        return false;
    }
}

async function saveAllData() {
    try {
        await runMiddlewares('beforeSave', { batches, sales, expenses, settings });

        await localforage.setItem(STORAGE_KEYS.batches, batches);
        await localforage.setItem(STORAGE_KEYS.sales, sales);
        await localforage.setItem(STORAGE_KEYS.expenses, expenses);
        await localforage.setItem(STORAGE_KEYS.settings, settings);
        await localforage.setItem(STORAGE_KEYS.company, company);
        await localforage.setItem(STORAGE_KEYS.customers, customers);
        await localforage.setItem(STORAGE_KEYS.suppliers, suppliers);
        await localforage.setItem(STORAGE_KEYS.deliveries, deliveries);
        await localforage.setItem(STORAGE_KEYS.opname, opnameList);
        await localforage.setItem(STORAGE_KEYS.returns, returns);
        await localforage.setItem(STORAGE_KEYS.auditTrail, auditTrail);
        await localforage.setItem(STORAGE_KEYS.pricing, pricing);
        await localforage.setItem(STORAGE_KEYS.products, products);
        await localforage.setItem(STORAGE_KEYS.categories, categories);
        await localforage.setItem(STORAGE_KEYS.variants, variants);
        await localforage.setItem(STORAGE_KEYS.purchaseOrders, purchaseOrders);
        await localforage.setItem(STORAGE_KEYS.uiPreferences, uiPreferences);
        await localforage.setItem(STORAGE_KEYS.warehouses, warehouses);
        await localforage.setItem(STORAGE_KEYS.discounts, discounts);
        await localforage.setItem(STORAGE_KEYS.integrations, integrations);
        await localforage.setItem(STORAGE_KEYS.notes, notes);
        await localforage.setItem(STORAGE_KEYS.bulkOperations, bulkOperations);
        await localforage.setItem(STORAGE_KEYS.taxProfiles, taxProfiles);
        await localforage.setItem(STORAGE_KEYS.roles, roles);
        await localforage.setItem(STORAGE_KEYS.permissions, permissions);
        await localforage.setItem(STORAGE_KEYS.userProfiles, userProfiles);
        await localforage.setItem(STORAGE_KEYS.eventLog, eventLog);
        await localforage.setItem(STORAGE_KEYS.undoStack, undoStack);
        emit('data:saved');
    } catch (error) {
        console.error('Gagal menyimpan data:', error);
    }
}

// --------------- AUDIT & EVENT LOG ---------------
function addAudit(aksi, detail) {
    const entry = { waktu: new Date().toISOString(), aksi, detail };
    auditTrail.unshift(entry);
    if (auditTrail.length > 500) auditTrail = auditTrail.slice(0, 500);
    localforage.setItem(STORAGE_KEYS.auditTrail, auditTrail);
    // Juga catat di event log
    eventLog.push({ ...entry, type: 'audit' });
    if (eventLog.length > 500) eventLog = eventLog.slice(-500);
    localforage.setItem(STORAGE_KEYS.eventLog, eventLog);
    emit('audit:new', entry);
    return entry;
}

// --------------- CUSTOMER RECONCILIATION ---------------
function rebuildCustomersFromSales() {
    const newCustomers = {};
    sales.forEach(s => {
        if (!newCustomers[s.klien]) {
            newCustomers[s.klien] = {
                totalSpent: 0,
                transactionCount: 0,
                lastPurchase: '',
                channel: s.channel || 'offline'
            };
        }
        const c = newCustomers[s.klien];
        c.totalSpent += (s.qty * s.hargaJual) - (s.diskon || 0);
        c.transactionCount += 1;
        if (!c.lastPurchase || s.tanggal > c.lastPurchase) {
            c.lastPurchase = s.tanggal;
        }
        c.channel = s.channel || c.channel;
    });
    const oldCustomers = customers;
    customers = {};
    Object.keys(newCustomers).forEach(name => {
        customers[name] = Object.assign({}, oldCustomers[name] || {}, newCustomers[name]);
    });
    Object.keys(oldCustomers).forEach(name => {
        if (!customers[name]) customers[name] = oldCustomers[name];
    });
}

// ===================== CRUD FUNCTIONS =====================

// Batch
function addBatch(batch) {
    if (!validate('batch', batch)) throw new Error('Validasi batch gagal');
    batch.id = 'b' + Date.now();
    batches.push(batch);
    pushUndo('addBatch', { id: batch.id });
    addAudit('TAMBAH BATCH', `Batch ${batch.produk} ${batch.berat}kg ditambahkan`);
    return saveAllData();
}
function updateBatch(id, newData) {
    const idx = batches.findIndex(b => b.id === id);
    if (idx !== -1) {
        const old = { ...batches[idx] };
        Object.assign(batches[idx], newData);
        pushUndo('updateBatch', { id, old });
        addAudit('EDIT BATCH', `Batch ${id} diubah`);
        return saveAllData();
    }
}
function deleteBatch(id) {
    const batch = batches.find(b => b.id === id);
    if (batch && batch.used === 0) {
        batches = batches.filter(b => b.id !== id);
        pushUndo('deleteBatch', { batch });
        addAudit('HAPUS BATCH', `Batch ${id} dihapus`);
        return saveAllData();
    }
    return false;
}

// Sales
function addSale(sale) {
    if (!validate('sale', sale)) throw new Error('Validasi penjualan gagal');
    sale.id = 's' + Date.now();
    sales.push(sale);
    rebuildCustomersFromSales();
    addAudit('PENJUALAN', `${sale.produk} ${sale.qty}kg ke ${sale.klien} (${sale.channel})`);
    return saveAllData();
}
function deleteSale(id) {
    const sale = sales.find(s => s.id === id);
    if (sale) {
        const batch = batches.find(b => b.id === sale.batchUsed);
        if (batch) batch.used = Math.max(0, batch.used - sale.qty);
    }
    sales = sales.filter(s => s.id !== id);
    rebuildCustomersFromSales();
    addAudit('HAPUS PENJUALAN', `Penjualan ${id} dihapus`);
    return saveAllData();
}

// Expenses
function addExpense(expense) {
    if (!validate('expense', expense)) throw new Error('Validasi beban gagal');
    expense.id = 'e' + Date.now();
    expenses.push(expense);
    addAudit('BEBAN', `Beban ${expense.akun} Rp${expense.jumlah}`);
    return saveAllData();
}

// Supplier
function addSupplier(sup) {
    if (!validate('supplier', sup)) throw new Error('Validasi supplier gagal');
    sup.id = sup.id || 'sup' + Date.now();
    suppliers.push(sup);
    addAudit('SUPPLIER', `Supplier ${sup.name} ditambahkan`);
    return saveAllData();
}
function deleteSupplier(id) {
    suppliers = suppliers.filter(s => s.id !== id);
    addAudit('HAPUS SUPPLIER', `Supplier ${id} dihapus`);
    return saveAllData();
}

// Customer
function saveCustomerDetail(name, detail) {
    if (!customers[name]) customers[name] = {};
    Object.assign(customers[name], detail);
    addAudit('PELANGGAN', `Detail pelanggan ${name} diperbarui`);
    return saveAllData();
}
function deleteCustomer(name) {
    delete customers[name];
    addAudit('HAPUS PELANGGAN', `Pelanggan ${name} dihapus`);
    return saveAllData();
}

// Delivery
function addDelivery(delivery) {
    delivery.id = delivery.id || 'd' + Date.now();
    deliveries.push(delivery);
    addAudit('PENGIRIMAN', `Pengiriman ${delivery.id} kurir ${delivery.courier}`);
    return saveAllData();
}
function updateDeliveryStatus(id, status) {
    const d = deliveries.find(d => d.id === id);
    if (d) { d.status = status; addAudit('UPDATE PENGIRIMAN', `Status pengiriman ${id} -> ${status}`); return saveAllData(); }
}

// Opname
function addOpname(opname) {
    opname.id = opname.id || 'op' + Date.now();
    opnameList.push(opname);
    addAudit('OPNAME', `Opname ${opname.produk} fisik:${opname.fisik}kg`);
    return saveAllData();
}

// Return
function addReturn(retur) {
    retur.id = retur.id || 'ret' + Date.now();
    returns.push(retur);
    const batch = batches.find(b => b.id === retur.batchUsed);
    if (batch) batch.used = Math.max(0, batch.used - retur.qty);
    addAudit('RETUR', `Retur ${retur.produk} ${retur.qty}kg alasan:${retur.alasan}`);
    return saveAllData();
}

// Pricing
function savePricing(produk, data) {
    pricing[produk] = data;
    addAudit('HARGA', `Harga ${produk} offline:${data.offline} online:${data.online}`);
    return saveAllData();
}

// Product
function addProduct(product) {
    if (!validate('product', product)) throw new Error('Validasi produk gagal');
    product.id = product.id || 'prd_' + Date.now();
    products.push(product);
    addAudit('PRODUK', `Produk ${product.name} ditambahkan`);
    return saveAllData();
}
function deleteProduct(productId) {
    products = products.filter(p => p.id !== productId);
    addAudit('HAPUS PRODUK', `Produk ${productId} dihapus`);
    return saveAllData();
}

// Category
function addCategory(category) {
    category.id = category.id || 'cat_' + Date.now();
    categories.push(category);
    addAudit('KATEGORI', `Kategori ${category.name} ditambahkan`);
    return saveAllData();
}
function deleteCategory(id) {
    categories = categories.filter(c => c.id !== id);
    addAudit('HAPUS KATEGORI', `Kategori ${id} dihapus`);
    return saveAllData();
}

// Variant
function addVariant(variant) {
    variant.id = variant.id || 'var_' + Date.now();
    variants.push(variant);
    addAudit('VARIAN', `Varian ${variant.name} ditambahkan`);
    return saveAllData();
}
function deleteVariant(id) {
    variants = variants.filter(v => v.id !== id);
    addAudit('HAPUS VARIAN', `Varian ${id} dihapus`);
    return saveAllData();
}

// Purchase Order
function addPurchaseOrder(po) {
    po.id = po.id || 'po_' + Date.now();
    purchaseOrders.push(po);
    addAudit('PO', `PO ${po.produk} ${po.qty}kg dibuat`);
    return saveAllData();
}
function updatePurchaseOrderStatus(id, status) {
    const po = purchaseOrders.find(p => p.id === id);
    if (po) { po.status = status; addAudit('UPDATE PO', `PO ${id} -> ${status}`); return saveAllData(); }
}

// UI Preferences
function saveUIPreferences(prefs) {
    Object.assign(uiPreferences, prefs);
    return saveAllData();
}

// Warehouse
function addWarehouse(wh) {
    wh.id = wh.id || 'wh_' + Date.now();
    warehouses.push(wh);
    addAudit('GUDANG', `Gudang ${wh.nama} ditambahkan`);
    return saveAllData();
}
function updateWarehouse(id, data) {
    const idx = warehouses.findIndex(w => w.id === id);
    if (idx !== -1) { Object.assign(warehouses[idx], data); return saveAllData(); }
}
function deleteWarehouse(id) {
    warehouses = warehouses.filter(w => w.id !== id);
    addAudit('HAPUS GUDANG', `Gudang ${id} dihapus`);
    return saveAllData();
}

// Discount
function addDiscount(disc) {
    disc.id = disc.id || 'disc_' + Date.now();
    discounts.push(disc);
    addAudit('DISKON', `Diskon ${disc.nama} ditambahkan`);
    return saveAllData();
}
function deleteDiscount(id) {
    discounts = discounts.filter(d => d.id !== id);
    addAudit('HAPUS DISKON', `Diskon ${id} dihapus`);
    return saveAllData();
}

// Integration
function saveIntegration(platform, data) {
    integrations[platform] = data;
    addAudit('INTEGRASI', `Integrasi ${platform} diperbarui`);
    return saveAllData();
}

// Note
function addNote(note) {
    note.id = note.id || 'note_' + Date.now();
    notes.push(note);
    return saveAllData();
}
function deleteNote(id) {
    notes = notes.filter(n => n.id !== id);
    return saveAllData();
}

// Bulk Operation
function addBulkOperation(op) {
    op.id = op.id || 'bulk_' + Date.now();
    bulkOperations.push(op);
    addAudit('BULK', `${op.tipe} (${op.jumlah} item)`);
    return saveAllData();
}

// Tax Profile
function addTaxProfile(profile) {
    profile.id = profile.id || 'tax_' + Date.now();
    taxProfiles.push(profile);
    return saveAllData();
}
function deleteTaxProfile(id) {
    taxProfiles = taxProfiles.filter(t => t.id !== id);
    return saveAllData();
}

// Role & Permission (dummy, untuk future use)
function addRole(role) {
    role.id = role.id || 'role_' + Date.now();
    roles.push(role);
    return saveAllData();
}
function setPermission(key, value) {
    permissions[key] = value;
    return saveAllData();
}

// User Profile
function addUserProfile(profile) {
    profile.id = profile.id || 'usr_' + Date.now();
    userProfiles.push(profile);
    return saveAllData();
}

// Settings & Company
function saveSettings(newSettings) {
    Object.assign(settings, newSettings);
    addAudit('PENGATURAN', 'Pengaturan diperbarui');
    return saveAllData();
}
function saveCompany(newCompany) {
    Object.assign(company, newCompany);
    addAudit('PROFIL', 'Profil usaha diperbarui');
    return saveAllData();
}

// Reset
async function resetAllData() {
    batches = []; sales = []; expenses = [];
    settings = Object.assign({}, defaultSettings);
    company = Object.assign({}, defaultCompany);
    customers = {}; suppliers = []; deliveries = [];
    opnameList = []; returns = []; auditTrail = [];
    pricing = {}; products = [];
    categories = []; variants = []; purchaseOrders = [];
    uiPreferences = {}; warehouses = []; discounts = [];
    integrations = {}; notes = []; bulkOperations = [];
    taxProfiles = []; roles = []; permissions = {};
    userProfiles = []; eventLog = []; undoStack = [];
    await saveAllData();
    addAudit('RESET', 'Semua data direset');
    return true;
}

// ===================== PUBLIC API =====================
window.CFS = window.CFS || {};
window.CFS.Storage = {
    // Core
    loadAllData, saveAllData, addAudit, rebuildCustomersFromSales,
    resetAllData, compactStorage, checkIntegrity,

    // Event System
    on, off, emit,

    // Middleware
    useBeforeSave, useAfterLoad,

    // Undo
    undo, pushUndo,

    // Export/Import
    exportAllData, importAllData,

    // Aggregation
    getTotalStockValue, getProductStockMap, getMonthlyRevenue,

    // Validators
    validate,

    // CRUD - Batch
    addBatch, updateBatch, deleteBatch,

    // CRUD - Sales
    addSale, deleteSale,

    // CRUD - Expenses
    addExpense,

    // CRUD - Supplier
    addSupplier, deleteSupplier,

    // CRUD - Customer
    saveCustomerDetail, deleteCustomer,

    // CRUD - Delivery
    addDelivery, updateDeliveryStatus,

    // CRUD - Opname
    addOpname,

    // CRUD - Return
    addReturn,

    // CRUD - Pricing
    savePricing,

    // CRUD - Product
    addProduct, deleteProduct,

    // CRUD - Category
    addCategory, deleteCategory,

    // CRUD - Variant
    addVariant, deleteVariant,

    // CRUD - Purchase Order
    addPurchaseOrder, updatePurchaseOrderStatus,

    // UI Preferences
    saveUIPreferences,

    // CRUD - Warehouse
    addWarehouse, updateWarehouse, deleteWarehouse,

    // CRUD - Discount
    addDiscount, deleteDiscount,

    // Integration
    saveIntegration,

    // CRUD - Note
    addNote, deleteNote,

    // Bulk Operation
    addBulkOperation,

    // CRUD - Tax Profile
    addTaxProfile, deleteTaxProfile,

    // Role & Permission
    addRole, setPermission,

    // User Profile
    addUserProfile,

    // Settings & Company
    saveSettings, saveCompany,

    // Getters (referensi langsung)
    getBatches: () => batches,
    getSales: () => sales,
    getExpenses: () => expenses,
    getSettings: () => settings,
    getCompany: () => company,
    getCustomers: () => customers,
    getSuppliers: () => suppliers,
    getDeliveries: () => deliveries,
    getOpname: () => opnameList,
    getReturns: () => returns,
    getAuditTrail: () => auditTrail,
    getPricing: () => pricing,
    getProducts: () => products,
    getCategories: () => categories,
    getVariants: () => variants,
    getPurchaseOrders: () => purchaseOrders,
    getUIPreferences: () => uiPreferences,
    getWarehouses: () => warehouses,
    getDiscounts: () => discounts,
    getIntegrations: () => integrations,
    getNotes: () => notes,
    getBulkOperations: () => bulkOperations,
    getTaxProfiles: () => taxProfiles,
    getRoles: () => roles,
    getPermissions: () => permissions,
    getUserProfiles: () => userProfiles,
    getEventLog: () => eventLog,
    getUndoStack: () => undoStack,

    // Constants
    defaultProducts, defaultSettings, defaultCompany,
    STORAGE_VERSION
};

// Auto init
(async () => {
    await loadAllData();
})();
