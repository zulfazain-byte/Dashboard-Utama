/* ============================================================
   Cibitung Frozen ERP Ultimate v5.4 — Storage Module (Fixed)
   ============================================================ */

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
    products: 'cfs_products'
};

// State global aplikasi
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

// Produk bawaan
const defaultProducts = [
    'Ikan Kembung Banjar', 'Ikan Kembung Layang', 'Ikan Kembung Belo', 'Ikan Tongkol', 'Ikan Salem',
    'Ikan Tenggiri', 'Bawal Laut', 'Cumi-Cumi', 'Ikan Dori Fillet'
];

// Pengaturan default
const defaultSettings = {
    ppn: 12, pph25: 2, pph21: 5, ptShare: 60,
    minGrosir: 10, minPartai: 500, selisihGrosir: 5000,
    marginDefault: 15000, fifoMethod: 'fefo', marketplaceFee: 5,
    autoBackupDays: 7, targetPenjualanBulanan: 50000000,
    storageMethod: 'none', storageFlat: 0, storagePerKg: 0
};

// Profil perusahaan default
const defaultCompany = {
    name: 'Cibitung Frozen',
    address: 'Jl. Industri No.1, Bekasi',
    phone: '0812-3456-7890',
    email: 'info@cibitungfrozen.com',
    website: 'www.cibitungfrozen.com'
};

// ===================== FUNGSI UTAMA STORAGE =====================

async function loadAllData() {
    try {
        batches = (await localforage.getItem(STORAGE_KEYS.batches)) || [];
        sales = (await localforage.getItem(STORAGE_KEYS.sales)) || [];
        expenses = (await localforage.getItem(STORAGE_KEYS.expenses)) || [];
        settings = Object.assign({}, defaultSettings, (await localforage.getItem(STORAGE_KEYS.settings)) || {});
        company = Object.assign({}, defaultCompany, (await localforage.getItem(STORAGE_KEYS.company)) || {});
        customers = (await localforage.getItem(STORAGE_KEYS.customers)) || {};
        suppliers = (await localforage.getItem(STORAGE_KEYS.suppliers)) || [];
        deliveries = (await localforage.getItem(STORAGE_KEYS.deliveries)) || [];
        opnameList = (await localforage.getItem(STORAGE_KEYS.opname)) || [];
        returns = (await localforage.getItem(STORAGE_KEYS.returns)) || [];
        auditTrail = (await localforage.getItem(STORAGE_KEYS.auditTrail)) || [];
        pricing = (await localforage.getItem(STORAGE_KEYS.pricing)) || {};
        products = (await localforage.getItem(STORAGE_KEYS.products)) || [];

        // Jika pertama kali, isi dengan data sampel
        if (!batches.length && !sales.length) {
            seedSampleData();
            await saveAllData();
        }

        rebuildCustomersFromSales();
        console.log('✅ Storage Cibitung Frozen siap.');
        return true;
    } catch (error) {
        console.error('Gagal memuat data:', error);
        return false;
    }
}

async function saveAllData() {
    try {
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
    } catch (error) {
        console.error('Gagal menyimpan data:', error);
    }
}

function addAudit(aksi, detail) {
    const entry = { waktu: new Date().toISOString(), aksi, detail };
    auditTrail.unshift(entry);
    if (auditTrail.length > 500) auditTrail = auditTrail.slice(0, 500);
    localforage.setItem(STORAGE_KEYS.auditTrail, auditTrail);
    return entry;
}

// ===================== SEEDER DATA SAMPEL =====================

function seedSampleData() {
    const today = new Date();
    const addDays = (date, days) => { const d = new Date(date); d.setDate(d.getDate() + days); return d; };
    const fmt = (d) => d.toISOString().split('T')[0];

    // Batch sampel
    const produkSample = ['Ikan Kembung Banjar', 'Ikan Kembung Layang', 'Ikan Kembung Belo', 'Ikan Tongkol', 'Ikan Salem'];
    produkSample.forEach((produk, i) => {
        batches.push({
            id: 'b' + (Date.now() + i),
            produk: produk,
            berat: 100 + i * 20,
            hargaBeli: 45000 + i * 5000,
            ongkir: 50000,
            bensin: 20000,
            bongkar: i % 2 === 0 ? 30000 : 0,
            pajakType: 'none',
            pajakValue: 0,
            tglProduksi: fmt(addDays(today, -30)),
            tglKadaluarsa: fmt(addDays(today, 60 + i * 10)),
            used: 0,
            supplier: '',
            warehouse: 'gudang_utama'
        });
    });

    // Supplier sampel
    suppliers.push(
        { id: 'sup1', name: 'PT Samudera Segar', contact: '021-5551234', address: 'Jl. Pelabuhan No.5', email: 'sales@samudera.com', bank: 'BCA 1234567890', totalPO: 0, npwp: '', notes: '' },
        { id: 'sup2', name: 'UD Mina Jaya', contact: '0812-9876-5432', address: 'Jl. Raya Pantura Km 20', email: 'mina@jaya.co.id', bank: 'BRI 0987-6543-2109', totalPO: 0, npwp: '', notes: '' }
    );

    // Penjualan sampel
    sales.push({
        id: 's' + Date.now(),
        tanggal: fmt(today),
        klien: 'Budi Santoso',
        produk: 'Ikan Salmon',
        qty: 5,
        tier: 'ecer',
        channel: 'offline',
        hargaJual: 65000,
        hpp: 50000,
        catatan: '',
        batchUsed: batches[0].id,
        diskon: 0,
        paymentMethod: 'tunai'
    });
    batches[0].used += 5;

    // Beban sampel
    expenses.push(
        { id: 'e1', tanggal: fmt(today), akun: 'Beban Listrik', jumlah: 150000, deskripsi: 'Listrik bulan ini' },
        { id: 'e2', tanggal: fmt(addDays(today, -2)), akun: 'Beban Transport', jumlah: 50000, deskripsi: 'Bensin operasional' }
    );

    // Pengiriman sampel
    deliveries.push({
        id: 'd1',
        saleId: sales[0].id,
        courier: 'SiCepat',
        tracking: 'SCP123456789',
        status: 'dikirim',
        estimasi: fmt(addDays(today, 2)),
        tglKirim: fmt(today),
        notes: ''
    });

    // Opname sampel
    opnameList.push({
        id: 'op1',
        tanggal: fmt(addDays(today, -7)),
        produk: 'Ikan Salmon',
        sistem: 100,
        fisik: 98,
        selisih: -2,
        catatan: 'Penyusutan alami'
    });

    // Produk kustom
    defaultProducts.forEach(p => {
        if (!products.find(prod => prod.name === p)) {
            products.push({
                id: 'prd_' + p.replace(/\s/g, '_').toLowerCase(),
                name: p,
                category: 'Ikan',
                minStock: 10,
                unit: 'kg',
                brand: '',
                sku: 'CF-' + p.substring(0, 4).toUpperCase()
            });
        }
    });

    rebuildCustomersFromSales();
}

// ===================== HELPER =====================

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

// ===================== FUNGSI SPESIFIK MODUL =====================

function addBatch(batch) {
    batch.id = 'b' + Date.now();
    batches.push(batch);
    addAudit('TAMBAH BATCH', `Batch ${batch.produk} ${batch.berat}kg ditambahkan`);
    return saveAllData();
}

function updateBatch(id, newData) {
    const index = batches.findIndex(b => b.id === id);
    if (index !== -1) {
        Object.assign(batches[index], newData);
        addAudit('EDIT BATCH', `Batch ${id} diubah`);
        return saveAllData();
    }
}

function deleteBatch(id) {
    const batch = batches.find(b => b.id === id);
    if (batch && batch.used > 0) return false;
    batches = batches.filter(b => b.id !== id);
    addAudit('HAPUS BATCH', `Batch ${id} dihapus`);
    return saveAllData();
}

function addSale(sale) {
    sale.id = 's' + Date.now();
    sales.push(sale);
    rebuildCustomersFromSales();
    addAudit('PENJUALAN', `Penjualan ${sale.produk} ${sale.qty}kg ke ${sale.klien} (${sale.channel})`);
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

function addExpense(expense) {
    expense.id = 'e' + Date.now();
    expenses.push(expense);
    addAudit('BEBAN', `Beban ${expense.akun} Rp${expense.jumlah}`);
    return saveAllData();
}

function addSupplier(sup) {
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

function addOpname(opname) {
    opname.id = opname.id || 'op' + Date.now();
    opnameList.push(opname);
    addAudit('OPNAME', `Opname ${opname.produk} fisik:${opname.fisik}kg`);
    return saveAllData();
}

function addReturn(retur) {
    retur.id = retur.id || 'ret' + Date.now();
    returns.push(retur);
    const batch = batches.find(b => b.id === retur.batchUsed);
    if (batch) batch.used = Math.max(0, batch.used - retur.qty);
    addAudit('RETUR', `Retur ${retur.produk} ${retur.qty}kg alasan:${retur.alasan}`);
    return saveAllData();
}

function savePricing(produk, data) {
    pricing[produk] = data;
    addAudit('HARGA', `Harga ${produk} offline:${data.offline} online:${data.online}`);
    return saveAllData();
}

function addProduct(product) {
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

async function resetAllData() {
    batches = [];
    sales = [];
    expenses = [];
    settings = Object.assign({}, defaultSettings);
    company = Object.assign({}, defaultCompany);
    customers = {};
    suppliers = [];
    deliveries = [];
    opnameList = [];
    returns = [];
    auditTrail = [];
    pricing = {};
    products = [];
    await saveAllData();
    addAudit('RESET', 'Semua data direset');
    return true;
}

// ===================== EXPORT GLOBAL =====================
window.CFS = window.CFS || {};
window.CFS.Storage = {
    loadAllData, saveAllData, addAudit, rebuildCustomersFromSales,
    addBatch, updateBatch, deleteBatch,
    addSale, deleteSale,
    addExpense,
    addSupplier, deleteSupplier,
    saveCustomerDetail, deleteCustomer,
    addDelivery, updateDeliveryStatus,
    addOpname, addReturn,
    savePricing, addProduct, deleteProduct,
    saveSettings, saveCompany, resetAllData,
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
    defaultProducts, defaultSettings, defaultCompany
};

// Auto init
(async () => {
    await loadAllData();
})();
