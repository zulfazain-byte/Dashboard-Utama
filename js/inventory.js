/* ============================================================
   Cibitung Frozen ERP Ultimate v5.4 — Inventory Module
   Mengelola stok, batch, dan produk.
   ============================================================ */

window.CFS = window.CFS || {};

(function() {
    'use strict';

    const Storage = CFS.Storage;

    // Cache elemen
    let elements = {};

    function cacheElements() {
        elements.stockTableBody = document.getElementById('stockTableBody');
        elements.usedBatchesToday = document.getElementById('usedBatchesToday');
        elements.addStockForm = document.getElementById('addStockForm');
        elements.stockProduk = document.getElementById('stockProduk');
        elements.stockBerat = document.getElementById('stockBerat');
        elements.stockHargaBeli = document.getElementById('stockHargaBeli');
        elements.stockOngkir = document.getElementById('stockOngkir');
        elements.stockBensin = document.getElementById('stockBensin');
        elements.stockToggleBongkar = document.getElementById('stockToggleBongkar');
        elements.stockBongkarNominal = document.getElementById('stockBongkarNominal');
        elements.stockPajakType = document.getElementById('stockPajakType');
        elements.stockPajakValue = document.getElementById('stockPajakValue');
        elements.stockTglProduksi = document.getElementById('stockTglProduksi');
        elements.stockTglKadaluarsa = document.getElementById('stockTglKadaluarsa');
        elements.stockSupplier = document.getElementById('stockSupplier');
        elements.stockWarehouse = document.getElementById('stockWarehouse');

        elements.batchDetailModal = document.getElementById('batchDetailModal');
        elements.batchDetailContent = document.getElementById('batchDetailContent');
        elements.batchProdukSelect = document.getElementById('batchProdukSelect');

        elements.editBatchModal = document.getElementById('editBatchModal');
        elements.editBatchForm = document.getElementById('editBatchForm');
        elements.editBatchId = document.getElementById('editBatchId');
        elements.editBatchProduk = document.getElementById('editBatchProduk');
        elements.editBatchBerat = document.getElementById('editBatchBerat');
        elements.editBatchHargaBeli = document.getElementById('editBatchHargaBeli');
        elements.editBatchTglProduksi = document.getElementById('editBatchTglProduksi');
        elements.editBatchTglKadaluarsa = document.getElementById('editBatchTglKadaluarsa');
    }

    /**
     * Menghitung total stok per produk dari seluruh batch.
     * @returns {Object} map produk -> total kg tersedia
     */
    function getStockPerProduct() {
        const map = {};
        const batches = Storage.getBatches();
        batches.forEach(b => {
            if (!map[b.produk]) map[b.produk] = 0;
            map[b.produk] += (b.berat - b.used);
        });
        // Isi produk default yang mungkin belum ada batch-nya
        CFS.Storage.defaultProducts.forEach(p => {
            if (!map[p]) map[p] = 0;
        });
        return map;
    }

    /**
     * Merender tabel ringkasan stok (tab stok).
     */
    function refreshStockTable() {
        cacheElements();
        if (!elements.stockTableBody) return;

        const map = getStockPerProduct();
        const allProducts = CFS.Storage.getProducts().length > 0
            ? CFS.Storage.getProducts().map(p => p.name)
            : CFS.Storage.defaultProducts;

        elements.stockTableBody.innerHTML = allProducts.map(produk => {
            const stok = map[produk] || 0;
            const batchesAktif = Storage.getBatches().filter(b => b.produk === produk && (b.berat - b.used) > 0).length;
            const status = stok === 0
                ? '<span class="text-red-500 font-semibold">Kosong</span>'
                : stok < 10
                    ? '<span class="text-amber-500 font-semibold">Menipis</span>'
                    : '<span class="text-green-500 font-semibold">Aman</span>';
            return `
                <tr class="border-t hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                    <td class="p-3 font-medium">${produk}</td>
                    <td class="p-3 text-right">${stok.toLocaleString('id-ID')} kg</td>
                    <td class="p-3 text-right">${batchesAktif}</td>
                    <td class="p-3 text-center">${status}</td>
                    <td class="p-3 text-center">
                        <button onclick="CFS.Inventory.deleteProduct('${produk}')"
                                class="btn btn-danger btn-xs">
                            <i class="ph ph-trash"></i> Hapus Semua Batch
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Menampilkan batch yang sudah terpakai hari ini.
     */
    function refreshUsedBatchesToday() {
        cacheElements();
        if (!elements.usedBatchesToday) return;

        const today = new Date().toISOString().split('T')[0];
        const usedBatches = Storage.getBatches().filter(b => b.used > 0);
        const todayUsed = usedBatches.filter(b => {
            // Cek apakah batch ini digunakan dalam transaksi hari ini
            const salesToday = Storage.getSales().filter(s => s.tanggal === today && s.batchUsed === b.id);
            return salesToday.length > 0;
        });

        if (todayUsed.length === 0) {
            elements.usedBatchesToday.innerHTML = '<p class="opacity-50 italic">Belum ada batch terpakai hari ini.</p>';
            return;
        }

        elements.usedBatchesToday.innerHTML = todayUsed.map(b => `
            <div class="flex justify-between py-1">
                <span>${b.produk} (Batch #${b.id.slice(-4)})</span>
                <span class="font-semibold">${b.used} kg / ${b.berat} kg</span>
            </div>
        `).join('');
    }

    /**
     * Mengisi dropdown produk (untuk form stok, penjualan, filter, dll).
     * Bisa dipanggil dari modul lain via CFS.Inventory.populateProductDropdowns.
     */
    function populateProductDropdowns() {
        cacheElements();
        const produkList = CFS.Storage.getProducts().length > 0
            ? CFS.Storage.getProducts().map(p => p.name)
            : CFS.Storage.defaultProducts;

        const ids = ['stockProduk', 'salesProduk', 'filterProduk', 'batchProdukSelect',
                     'purchaseProduk', 'opnameProduk'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            const currentVal = el.value;
            el.innerHTML = '<option value="">Pilih Produk</option>' +
                produkList.map(p => `<option value="${p}">${p}</option>`).join('');
            if (currentVal && produkList.includes(currentVal)) {
                el.value = currentVal;
            }
        });
    }

    /**
     * Handler untuk toggle bongkar muat (menampilkan input nominal).
     */
    function setupStockFormToggles() {
        if (elements.stockToggleBongkar && elements.stockBongkarNominal) {
            elements.stockToggleBongkar.addEventListener('change', function() {
                elements.stockBongkarNominal.classList.toggle('hidden', !this.checked);
                if (!this.checked) elements.stockBongkarNominal.value = '0';
            });
        }

        if (elements.stockPajakType && elements.stockPajakValue) {
            elements.stockPajakType.addEventListener('change', function() {
                const show = this.value !== 'none';
                elements.stockPajakValue.classList.toggle('hidden', !show);
                if (!show) elements.stockPajakValue.value = '0';
            });
        }
    }

    /**
     * Menangani submit form tambah batch.
     */
    async function handleAddStock(e) {
        e.preventDefault();
        cacheElements();

        const produk = elements.stockProduk?.value;
        const berat = parseFloat(elements.stockBerat?.value);
        const hargaBeli = parseFloat(elements.stockHargaBeli?.value);
        if (!produk || !berat || !hargaBeli) {
            showToast?.('Error', 'Lengkapi data produk, berat, dan harga beli.', 'error');
            return;
        }

        const ongkir = parseFloat(elements.stockOngkir?.value) || 0;
        const bensin = parseFloat(elements.stockBensin?.value) || 0;
        const bongkar = elements.stockToggleBongkar?.checked
            ? parseFloat(elements.stockBongkarNominal?.value) || 0
            : 0;
        const pajakType = elements.stockPajakType?.value || 'none';
        const pajakValue = pajakType !== 'none'
            ? parseFloat(elements.stockPajakValue?.value) || 0
            : 0;

        const tglProduksi = elements.stockTglProduksi?.value;
        const tglKadaluarsa = elements.stockTglKadaluarsa?.value;
        const supplier = elements.stockSupplier?.value || '';
        const warehouse = elements.stockWarehouse?.value || 'gudang_utama';

        if (!tglProduksi || !tglKadaluarsa) {
            showToast?.('Error', 'Tanggal produksi dan kadaluarsa wajib diisi.', 'error');
            return;
        }

        // Validasi tanggal
        if (new Date(tglKadaluarsa) <= new Date(tglProduksi)) {
            showToast?.('Error', 'Tanggal kadaluarsa harus setelah tanggal produksi.', 'error');
            return;
        }

        const newBatch = {
            id: 'b' + Date.now(),
            produk,
            berat,
            hargaBeli,
            ongkir,
            bensin,
            bongkar,
            pajakType,
            pajakValue,
            tglProduksi,
            tglKadaluarsa,
            used: 0,
            supplier,
            warehouse
        };

        await Storage.addBatch(newBatch);
        showToast?.('Sukses', `Batch ${produk} ${berat} kg berhasil ditambahkan.`, 'success');
        e.target.reset();
        if (elements.stockBongkarNominal) elements.stockBongkarNominal.classList.add('hidden');
        if (elements.stockPajakValue) elements.stockPajakValue.classList.add('hidden');

        // Refresh UI
        refreshAllInventoryViews();
        if (typeof CFS.App !== 'undefined' && CFS.App.refreshAll) CFS.App.refreshAll();
    }

    /**
     * Menampilkan detail batch di modal.
     */
    function showBatchDetailModal() {
        cacheElements();
        if (!elements.batchDetailModal || !elements.batchDetailContent) return;

        const filterProduk = elements.batchProdukSelect?.value || '';
        const allBatches = Storage.getBatches();
        const filtered = filterProduk
            ? allBatches.filter(b => b.produk === filterProduk)
            : allBatches;

        elements.batchDetailContent.innerHTML = filtered.length === 0
            ? '<p class="opacity-50 italic">Tidak ada batch.</p>'
            : filtered.map(b => {
                const sisa = b.berat - b.used;
                const hpp = calculateHPP(b);
                return `
                <div class="border rounded-lg p-4 mb-3 bg-slate-50 dark:bg-slate-800 hover:shadow-md transition">
                    <div class="flex justify-between items-start">
                        <div>
                            <h4 class="font-bold text-lg">${b.produk}</h4>
                            <p class="text-xs opacity-70">Batch ID: ${b.id}</p>
                        </div>
                        <div class="text-right">
                            <span class="badge ${sisa > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                                ${sisa > 0 ? 'Aktif' : 'Habis'}
                            </span>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-sm">
                        <div><span class="opacity-60">Berat:</span> <strong>${b.berat} kg</strong></div>
                        <div><span class="opacity-60">Terpakai:</span> <strong>${b.used} kg</strong></div>
                        <div><span class="opacity-60">Sisa:</span> <strong>${sisa} kg</strong></div>
                        <div><span class="opacity-60">HPP:</span> <strong>Rp ${hpp.toLocaleString('id-ID')}/kg</strong></div>
                        <div><span class="opacity-60">Harga Beli:</span> Rp ${b.hargaBeli.toLocaleString('id-ID')}</div>
                        <div><span class="opacity-60">Ongkir:</span> Rp ${b.ongkir.toLocaleString('id-ID')}</div>
                        <div><span class="opacity-60">Bensin:</span> Rp ${b.bensin.toLocaleString('id-ID')}</div>
                        <div><span class="opacity-60">Bongkar:</span> Rp ${b.bongkar.toLocaleString('id-ID')}</div>
                    </div>
                    <div class="text-xs mt-2 opacity-70">
                        Produksi: ${formatDateID(b.tglProduksi)} | Kadaluarsa: ${formatDateID(b.tglKadaluarsa)}
                    </div>
                    ${b.supplier ? `<div class="text-xs opacity-70">Supplier: ${b.supplier}</div>` : ''}
                    <div class="mt-3 flex gap-2">
                        <button onclick="CFS.Inventory.openEditBatchModal('${b.id}')"
                                class="btn btn-secondary btn-xs">
                            <i class="ph ph-pencil"></i> Edit
                        </button>
                        <button onclick="CFS.Inventory.deleteBatch('${b.id}')"
                                class="btn btn-danger btn-xs"
                                ${b.used > 0 ? 'disabled' : ''}>
                            <i class="ph ph-trash"></i> Hapus
                        </button>
                    </div>
                </div>`;
            }).join('');

        elements.batchDetailModal.classList.remove('hidden');
    }

    /**
     * Menghitung HPP per kg berdasarkan biaya total batch.
     */
    function calculateHPP(batch) {
        const totalCost = (batch.hargaBeli * batch.berat) + batch.ongkir + batch.bensin + batch.bongkar;
        return batch.berat > 0 ? totalCost / batch.berat : batch.hargaBeli;
    }

    /**
     * Membuka modal edit batch dan mengisi form dengan data batch.
     */
    function openEditBatchModal(batchId) {
        cacheElements();
        const batch = Storage.getBatches().find(b => b.id === batchId);
        if (!batch) return;

        elements.editBatchId.value = batch.id;
        elements.editBatchProduk.value = batch.produk;
        elements.editBatchBerat.value = batch.berat;
        elements.editBatchHargaBeli.value = batch.hargaBeli;
        elements.editBatchTglProduksi.value = batch.tglProduksi;
        elements.editBatchTglKadaluarsa.value = batch.tglKadaluarsa;

        elements.editBatchModal.classList.remove('hidden');
    }

    /**
     * Menangani submit form edit batch.
     */
    async function handleEditBatch(e) {
        e.preventDefault();
        cacheElements();

        const id = elements.editBatchId.value;
        const newBerat = parseFloat(elements.editBatchBerat.value);
        const newHarga = parseFloat(elements.editBatchHargaBeli.value);
        const tglProduksi = elements.editBatchTglProduksi.value;
        const tglKadaluarsa = elements.editBatchTglKadaluarsa.value;

        if (!id || !newBerat || !newHarga || !tglProduksi || !tglKadaluarsa) {
            showToast?.('Error', 'Lengkapi semua field.', 'error');
            return;
        }

        const batch = Storage.getBatches().find(b => b.id === id);
        if (!batch) return;

        if (newBerat < batch.used) {
            showToast?.('Error', 'Berat tidak boleh kurang dari yang sudah terpakai.', 'error');
            return;
        }

        await Storage.updateBatch(id, {
            berat: newBerat,
            hargaBeli: newHarga,
            tglProduksi,
            tglKadaluarsa
        });

        showToast?.('Sukses', 'Batch berhasil diperbarui.', 'success');
        elements.editBatchModal.classList.add('hidden');
        showBatchDetailModal(); // refresh modal detail
        refreshAllInventoryViews();
        if (typeof CFS.App !== 'undefined' && CFS.App.refreshAll) CFS.App.refreshAll();
    }

    /**
     * Menghapus batch jika belum terpakai.
     */
    async function deleteBatch(batchId) {
        const batch = Storage.getBatches().find(b => b.id === batchId);
        if (!batch) return;

        if (batch.used > 0) {
            showToast?.('Error', 'Batch tidak bisa dihapus karena sudah terpakai dalam penjualan.', 'error');
            return;
        }

        if (!confirm(`Hapus batch ${batch.produk} (${batch.berat} kg)?`)) return;

        await Storage.deleteBatch(batchId);
        showToast?.('Sukses', 'Batch berhasil dihapus.', 'success');
        showBatchDetailModal();
        refreshAllInventoryViews();
        if (typeof CFS.App !== 'undefined' && CFS.App.refreshAll) CFS.App.refreshAll();
    }

    /**
     * Menghapus semua batch untuk produk tertentu (dari tabel stok).
     */
    async function deleteProductBatches(produk) {
        if (!confirm(`Hapus SEMUA batch untuk produk ${produk}?`)) return;

        const toDelete = Storage.getBatches().filter(b => b.produk === produk && b.used === 0);
        for (const b of toDelete) {
            await Storage.deleteBatch(b.id);
        }
        showToast?.('Sukses', `Batch untuk ${produk} yang belum terpakai telah dihapus.`, 'success');
        refreshAllInventoryViews();
        if (typeof CFS.App !== 'undefined' && CFS.App.refreshAll) CFS.App.refreshAll();
    }

    /**
     * Format tanggal ISO ke format Indonesia.
     */
    function formatDateID(dateStr) {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    }

    /**
     * Refresh semua view terkait inventori.
     */
    function refreshAllInventoryViews() {
        refreshStockTable();
        refreshUsedBatchesToday();
        populateProductDropdowns();
    }

    /**
     * Inisialisasi event listener.
     */
    function bindEvents() {
        if (elements.addStockForm) {
            elements.addStockForm.addEventListener('submit', handleAddStock);
        }
        if (elements.editBatchForm) {
            elements.editBatchForm.addEventListener('submit', handleEditBatch);
        }
        if (elements.batchProdukSelect) {
            elements.batchProdukSelect.addEventListener('change', showBatchDetailModal);
        }
        // Tutup modal saat klik backdrop (optional, sudah ada tombol close)
        if (elements.batchDetailModal) {
            elements.batchDetailModal.addEventListener('click', function(e) {
                if (e.target === this) this.classList.add('hidden');
            });
        }
        if (elements.editBatchModal) {
            elements.editBatchModal.addEventListener('click', function(e) {
                if (e.target === this) this.classList.add('hidden');
            });
        }

        setupStockFormToggles();
    }

    /**
     * Inisialisasi modul Inventori.
     */
    function initInventory() {
        cacheElements();
        refreshAllInventoryViews();
        bindEvents();
    }

    // Expose API
    CFS.Inventory = {
        init: initInventory,
        refreshStockTable,
        getStockPerProduct,
        populateProductDropdowns,
        showBatchDetailModal,
        openEditBatchModal,
        deleteBatch,
        deleteProduct: deleteProductBatches, // alias untuk tombol di tabel
        calculateHPP,
        formatDateID,
    };

})();
