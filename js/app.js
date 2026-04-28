// js/app.js
CFS.Utils = {
    formatRupiah: (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num),
    formatDate: (isoString) => new Date(isoString).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })
};

// Global state untuk UI
CFS.App = {
    init() {
        this.setupTabs();
        this.setupForms();
        this.populateDropdowns();
        this.loadSettingsToForm();
        CFS.Dashboard.refreshAll();
        CFS.Inventory.renderStockTable(); // fungsi render akan kita tambahkan di inventory.js nanti
    },

    setupTabs() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });
    },

    switchTab(tabId) {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
        document.getElementById(tabId).classList.add('active');
        document.querySelectorAll('.tab-btn').forEach(b => {
            b.classList.remove('bg-blue-50', 'text-blue-700');
            b.classList.add('text-slate-600');
            if (b.dataset.tab === tabId) {
                b.classList.add('bg-blue-50', 'text-blue-700');
                b.classList.remove('text-slate-600');
            }
        });
        if (tabId === 'tab-stock') CFS.Inventory.renderStockTable();
        if (tabId === 'tab-dashboard') CFS.Dashboard.refreshAll();
        if (tabId === 'tab-finance') CFS.Dashboard.renderFinanceSummary();
    },

    setupForms() {
        // Tambah Stok
        document.getElementById('addStockForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const batchData = {
                produk: document.getElementById('stockProduk').value,
                berat: parseFloat(document.getElementById('stockBerat').value),
                hargaBeli: parseFloat(document.getElementById('stockHargaBeli').value),
                ongkir: parseFloat(document.getElementById('stockOngkir').value) || 0,
                tglProduksi: document.getElementById('stockTglProduksi').value,
                tglKadaluarsa: document.getElementById('stockTglKadaluarsa').value
            };
            await CFS.Inventory.addBatch(batchData);
            await CFS.Accounting.recordPurchase(batchData.produk, (batchData.hargaBeli * batchData.berat) + batchData.ongkir, batchData.berat);
            alert('Batch berhasil ditambahkan');
            e.target.reset();
            CFS.Dashboard.refreshAll();
            CFS.Inventory.renderStockTable();
        });

        // Penjualan
        document.getElementById('salesForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const klien = document.getElementById('salesKlien').value;
            const produk = document.getElementById('salesProduk').value;
            const qty = parseFloat(document.getElementById('salesQty').value);
            const tier = document.getElementById('salesTier').value;
            const manualHarga = parseFloat(document.getElementById('salesHargaManual').value) || null;
            try {
                const result = await CFS.Sales.processSale(klien, produk, qty, tier, manualHarga);
                document.getElementById('salesResult').classList.remove('hidden');
                document.getElementById('salesResult').innerHTML = `
                    ✅ Penjualan berhasil!<br>
                    Invoice: ${CFS.Utils.formatRupiah(result.totalInvoice)}<br>
                    Batch yang terpakai: ${result.usedBatches.map(b => `${b.nama_produk} ${b.qty}kg`).join(', ')}
                `;
                CFS.Dashboard.refreshAll();
                CFS.Inventory.renderStockTable();
            } catch (err) {
                alert(err.message);
            }
        });

        // Simpan pengaturan
        document.getElementById('saveSettingsBtn')?.addEventListener('click', async () => {
            const settings = {
                ppn: parseFloat(document.getElementById('setPPN').value),
                pph25: parseFloat(document.getElementById('setPPh25').value),
                pph21: parseFloat(document.getElementById('setPPh21').value),
                ptShare: parseFloat(document.getElementById('setPTShare').value),
                minGrosir: parseFloat(document.getElementById('setMinGrosir').value),
                minPartai: parseFloat(document.getElementById('setMinPartai').value),
                selisihGrosir: parseFloat(document.getElementById('setSelisihGrosir').value),
                marginDefault: parseFloat(document.getElementById('setMarginDefault').value) || 15000
            };
            await CFS.Settings.save(settings);
            alert('Pengaturan disimpan');
        });
    },

    populateDropdowns() {
        const productOptions = CFS.Inventory.PRODUCT_LIST.map(p => `<option value="${p}">${p}</option>`).join('');
        document.querySelectorAll('#stockProduk, #salesProduk').forEach(sel => {
            sel.innerHTML = '<option value="">Pilih Produk</option>' + productOptions;
        });
    },

    async loadSettingsToForm() {
        const s = await CFS.Settings.get();
        document.getElementById('setPPN').value = s.ppn;
        document.getElementById('setPPh25').value = s.pph25;
        document.getElementById('setPPh21').value = s.pph21;
        document.getElementById('setPTShare').value = s.ptShare;
        document.getElementById('setMinGrosir').value = s.minGrosir;
        document.getElementById('setMinPartai').value = s.minPartai;
        document.getElementById('setSelisihGrosir').value = s.selisihGrosir;
        if (document.getElementById('setMarginDefault')) {
            document.getElementById('setMarginDefault').value = s.marginDefault;
        }
    }
};

// Render tabel stok dari inventory (tambahan di inventory.js)
CFS.Inventory.renderStockTable = async function() {
    const summary = await this.getStockSummary();
    const batches = await this.getBatches();
    const tbody = document.getElementById('stockTableBody');
    if (!tbody) return;
    tbody.innerHTML = this.PRODUCT_LIST.map(p => {
        const total = summary[p]?.toFixed(1) || 0;
        const countActive = batches.filter(b => b.produk === p && b.berat_sisa > 0).length;
        return `<tr class="border-b">
            <td class="p-3">${p}</td>
            <td class="p-3 text-right font-semibold">${total} kg</td>
            <td class="p-3 text-right">${countActive}</td>
            <td class="p-3 text-right"><button onclick="CFS.App.lihatBatch('${p}')" class="text-blue-600 text-sm">Detail</button></td>
        </tr>`;
    }).join('');
};

CFS.App.lihatBatch = async function(produk) {
    const batches = await CFS.Inventory.getBatches();
    const filtered = batches.filter(b => b.produk === produk);
    alert(filtered.map(b => `Batch ${b.id}: ${b.berat_sisa} kg, Exp: ${b.tgl_kadaluarsa}`).join('\n'));
};

// Backup & Restore
CFS.App.backupData = async () => {
    const [batches, journals, settings, transactions] = await Promise.all([
        CFS.Storage.get(CFS.Storage.STOCK_KEY),
        CFS.Storage.get(CFS.Storage.JOURNALS_KEY),
        CFS.Storage.get(CFS.Storage.SETTINGS_KEY),
        CFS.Storage.get(CFS.Storage.TRANSACTIONS_KEY)
    ]);
    const blob = new Blob([JSON.stringify({ batches, journals, settings, transactions }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cfs_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
};

CFS.App.restorePrompt = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        const text = await file.text();
        const data = JSON.parse(text);
        if (data.batches) await CFS.Storage.set(CFS.Storage.STOCK_KEY, data.batches);
        if (data.journals) await CFS.Storage.set(CFS.Storage.JOURNALS_KEY, data.journals);
        if (data.settings) await CFS.Storage.set(CFS.Storage.SETTINGS_KEY, data.settings);
        if (data.transactions) await CFS.Storage.set(CFS.Storage.TRANSACTIONS_KEY, data.transactions);
        alert('Data berhasil dipulihkan!');
        location.reload();
    };
    input.click();
};

// Jalankan setelah semua siap
window.addEventListener('DOMContentLoaded', () => {
    CFS.App.init();
});
