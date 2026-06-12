/* ============================================================
   Cibitung Frozen ERP Ultimate v5.4 — Inventory Module (PRO)
   Self‑contained, ±1200 baris, tampilan profesional & modern.
   ============================================================ */
window.CFS = window.CFS || {};

(function () {
    'use strict';

    const Storage = CFS.Storage;

    // ==================== STATE ====================
    let currentSubTab = 'stock-overview';
    let batchFilter = { produk: '', gudang: '', status: '' };
    let editBatchId = null; // untuk inline edit

    // Chart instances
    let overviewChart = null;
    let stockPerProductChart = null;
    let stockValueChart = null;

    // ==================== CACHE ELEMEN ====================
    let E = {};
    function cacheElements() {
        E = {
            // Stats
            stTotalProducts: document.getElementById('stTotalProducts'),
            stTotalStock: document.getElementById('stTotalStock'),
            stActiveBatches: document.getElementById('stActiveBatches'),
            stCriticalBatches: document.getElementById('stCriticalBatches'),
            stStockValue: document.getElementById('stStockValue'),

            // Sub-tab buttons
            subTabBtns: document.querySelectorAll('.stock-subtab-btn'),
            subTabContents: document.querySelectorAll('.stock-subtab-content'),

            // Overview
            stockOverviewBody: document.getElementById('stockOverviewBody'),
            chartStockOverview: document.getElementById('chartStockOverview'),

            // Batch list
            batchFilterProduk: document.getElementById('batchFilterProduk'),
            batchFilterGudang: document.getElementById('batchFilterGudang'),
            batchFilterStatus: document.getElementById('batchFilterStatus'),
            applyBatchFilter: document.getElementById('applyBatchFilter'),
            exportBatchCSV: document.getElementById('exportBatchCSV'),
            batchTableBody: document.getElementById('batchTableBody'),
            batchSelectAll: document.getElementById('batchSelectAll'),
            batchBulkDelete: document.getElementById('batchBulkDelete'),

            // Add form
            addStockForm: document.getElementById('addStockForm'),
            stockProduk: document.getElementById('stockProduk'),
            stockBerat: document.getElementById('stockBerat'),
            stockHargaBeli: document.getElementById('stockHargaBeli'),
            stockOngkir: document.getElementById('stockOngkir'),
            stockBensin: document.getElementById('stockBensin'),
            stockToggleBongkar: document.getElementById('stockToggleBongkar'),
            stockBongkarNominal: document.getElementById('stockBongkarNominal'),
            stockPajakType: document.getElementById('stockPajakType'),
            stockPajakValue: document.getElementById('stockPajakValue'),
            stockTglProduksi: document.getElementById('stockTglProduksi'),
            stockTglKadaluarsa: document.getElementById('stockTglKadaluarsa'),
            stockSupplierSelect: document.getElementById('stockSupplierSelect'),
            stockWarehouse: document.getElementById('stockWarehouse'),

            // Edit inline modal
            editBatchModal: document.getElementById('editBatchModal'),
            editBatchForm: document.getElementById('editBatchForm'),
            editBatchId: document.getElementById('editBatchId'),
            editBatchProduk: document.getElementById('editBatchProduk'),
            editBatchBerat: document.getElementById('editBatchBerat'),
            editBatchHargaBeli: document.getElementById('editBatchHargaBeli'),
            editBatchTglProduksi: document.getElementById('editBatchTglProduksi'),
            editBatchTglKadaluarsa: document.getElementById('editBatchTglKadaluarsa'),

            // Expiring
            expiringBatchBody: document.getElementById('expiringBatchBody'),
            showExpiring7: document.getElementById('showExpiring7'),
            showExpiring30: document.getElementById('showExpiring30'),
            showExpired: document.getElementById('showExpired'),

            // Warehouse
            warehouseStockBody: document.getElementById('warehouseStockBody'),
            whUtamaFill: document.getElementById('whUtamaFill'),
            whColdFill: document.getElementById('whColdFill'),
            whUtamaText: document.getElementById('whUtamaText'),
            whColdText: document.getElementById('whColdText'),

            // Analysis
            chartStockPerProduct: document.getElementById('chartStockPerProduct'),
            chartStockValue: document.getElementById('chartStockValue'),
            restockRecommendations: document.getElementById('restockRecommendations'),
        };
    }

    // ==================== HELPER ====================
    function formatRupiah(n) { return 'Rp ' + Math.round(n).toLocaleString('id-ID'); }
    function formatNumber(n) { return n.toLocaleString('id-ID'); }
    function getToday() { return new Date().toISOString().split('T')[0]; }
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ==================== SUB TAB SWITCHING ====================
    function setupSubTabs() {
        E.subTabBtns.forEach(btn => {
            btn.addEventListener('click', function () {
                E.subTabBtns.forEach(b => { b.classList.remove('btn-primary', 'active'); b.classList.add('btn-secondary'); });
                this.classList.add('btn-primary', 'active');
                this.classList.remove('btn-secondary');
                const tab = this.dataset.stockTab;
                E.subTabContents.forEach(c => c.classList.add('hidden'));
                const target = document.getElementById(tab);
                if (target) target.classList.remove('hidden');
                currentSubTab = tab;

                // Render sesuai sub-tab
                switch (tab) {
                    case 'stock-overview': refreshOverview(); break;
                    case 'stock-batches': refreshBatchTable(); break;
                    case 'stock-expiring': refreshExpiring(); break;
                    case 'stock-warehouse': refreshWarehouse(); break;
                    case 'stock-analysis': refreshAnalysis(); break;
                }
            });
        });
    }

    // ==================== STATS ====================
    function refreshStats() {
        const batches = Storage.getBatches();
        const products = Storage.getProducts();
        const totalProducts = products.length > 0 ? products.length : (Storage.defaultProducts?.length || 0);
        const stockMap = CFS.Inventory ? CFS.Inventory.getStockPerProduct() : getProductStockMap();
        const totalStock = Object.values(stockMap).reduce((a, b) => a + b, 0);
        const activeBatches = batches.filter(b => (b.berat - b.used) > 0).length;
        const weekLater = new Date();
        weekLater.setDate(weekLater.getDate() + 7);
        const critical = batches.filter(b => new Date(b.tglKadaluarsa) <= weekLater && (b.berat - b.used) > 0).length;
        const totalValue = batches.reduce((sum, b) => sum + ((b.berat - b.used) * calculateHPP(b)), 0);

        if (E.stTotalProducts) E.stTotalProducts.textContent = totalProducts;
        if (E.stTotalStock) E.stTotalStock.textContent = formatNumber(totalStock) + ' kg';
        if (E.stActiveBatches) E.stActiveBatches.textContent = activeBatches;
        if (E.stCriticalBatches) E.stCriticalBatches.textContent = critical;
        if (E.stStockValue) E.stStockValue.textContent = formatRupiah(totalValue);
    }

    // ==================== HPP & STOCK MAP ====================
    function calculateHPP(batch) {
        const totalCost = (batch.hargaBeli * batch.berat) + (batch.ongkir || 0) + (batch.bensin || 0) + (batch.bongkar || 0);
        return batch.berat > 0 ? totalCost / batch.berat : batch.hargaBeli;
    }
    function getProductStockMap() {
        const map = {};
        Storage.getBatches().forEach(b => {
            if (!map[b.produk]) map[b.produk] = 0;
            map[b.produk] += (b.berat - b.used);
        });
        return map;
    }
    function getProductList() {
        const products = Storage.getProducts();
        return products.length > 0 ? products.map(p => p.name) : (Storage.defaultProducts || []);
    }

    // ==================== POPULATE DROPDOWNS ====================
    function populateDropdowns() {
        const prods = getProductList();
        const sups = Storage.getSuppliers();
        const prodOptions = '<option value="">Semua</option>' + prods.map(p => `<option value="${p}">${p}</option>`).join('');
        const prodOptions2 = '<option value="">Pilih Produk</option>' + prods.map(p => `<option value="${p}">${p}</option>`).join('');
        if (E.batchFilterProduk) E.batchFilterProduk.innerHTML = prodOptions;
        if (E.stockProduk) E.stockProduk.innerHTML = prodOptions2;
        if (E.stockSupplierSelect) E.stockSupplierSelect.innerHTML = '<option value="">Pilih Supplier</option>' + sups.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    }

    // ==================== OVERVIEW ====================
    function refreshOverview() {
        if (!E.stockOverviewBody) return;
        const stockMap = getProductStockMap();
        const prods = getProductList();
        E.stockOverviewBody.innerHTML = prods.map(p => {
            const stok = stockMap[p] || 0;
            const status = stok === 0 ? '🔴 Kosong' : stok < 10 ? '🟡 Menipis' : '🟢 Aman';
            const batchCount = Storage.getBatches().filter(b => b.produk === p && (b.berat - b.used) > 0).length;
            return `<tr class="border-t hover:bg-slate-50 dark:hover:bg-slate-700">
                <td class="p-2 font-medium">${p}</td>
                <td class="p-2 text-right">${formatNumber(stok)} kg</td>
                <td class="p-2 text-right">${batchCount}</td>
                <td class="p-2 text-center">${status}</td>
            </tr>`;
        }).join('');
        renderOverviewChart();
    }

    function renderOverviewChart() {
        const ctx = E.chartStockOverview?.getContext('2d');
        if (!ctx) return;
        const stockMap = getProductStockMap();
        const prods = getProductList();
        const data = prods.map(p => stockMap[p] || 0);
        if (overviewChart) overviewChart.destroy();
        overviewChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: prods,
                datasets: [{
                    label: 'Stok (kg)',
                    data,
                    backgroundColor: data.map(v => v < 10 ? '#ef4444' : v < 20 ? '#f59e0b' : '#22c55e'),
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                indexAxis: 'y',
                plugins: { legend: { display: false } }
            }
        });
    }

    // ==================== BATCH TABLE ====================
    function refreshBatchTable(filter = null) {
        if (!E.batchTableBody) return;
        if (filter) batchFilter = filter;
        else {
            batchFilter.produk = E.batchFilterProduk?.value || '';
            batchFilter.gudang = E.batchFilterGudang?.value || '';
            batchFilter.status = E.batchFilterStatus?.value || '';
        }

        let batches = Storage.getBatches();
        if (batchFilter.produk) batches = batches.filter(b => b.produk === batchFilter.produk);
        if (batchFilter.gudang) batches = batches.filter(b => (b.warehouse || 'gudang_utama') === batchFilter.gudang);
        if (batchFilter.status === 'aktif') batches = batches.filter(b => (b.berat - b.used) > 0);
        if (batchFilter.status === 'habis') batches = batches.filter(b => (b.berat - b.used) <= 0);

        batches.sort((a, b) => new Date(a.tglKadaluarsa) - new Date(b.tglKadaluarsa));

        if (batches.length === 0) {
            E.batchTableBody.innerHTML = '<tr><td colspan="10" class="text-center p-4 opacity-50">Tidak ada batch.</td></tr>';
            return;
        }

        E.batchTableBody.innerHTML = batches.map(b => {
            const sisa = b.berat - b.used;
            const hpp = calculateHPP(b);
            const warehouseLabel = b.warehouse === 'gudang_dingin' ? '❄️ Cold' : '🏭 Utama';
            const statusColor = sisa <= 0 ? 'text-red-500' : '';
            return `<tr class="border-t hover:bg-slate-50 dark:hover:bg-slate-700 text-sm">
                <td class="p-2"><input type="checkbox" class="batch-checkbox" data-id="${b.id}" ${b.used > 0 ? 'disabled' : ''}></td>
                <td class="p-2 text-xs">${b.id.slice(-6)}</td>
                <td class="p-2 font-medium">${b.produk}</td>
                <td class="p-2">${warehouseLabel}</td>
                <td class="p-2 text-right">${b.berat} kg</td>
                <td class="p-2 text-right">${b.used} kg</td>
                <td class="p-2 text-right font-semibold ${statusColor}">${sisa} kg</td>
                <td class="p-2 text-right text-xs">${formatRupiah(Math.round(hpp))}</td>
                <td class="p-2 text-xs">${b.tglProduksi} → ${b.tglKadaluarsa}</td>
                <td class="p-2 text-center">
                    <button class="btn btn-xs btn-secondary" onclick="CFS.Inventory.editBatch('${b.id}')" title="Edit"><i class="ph ph-pencil"></i></button>
                    <button class="btn btn-xs btn-danger" onclick="CFS.Inventory.deleteBatch('${b.id}')" title="Hapus" ${b.used > 0 ? 'disabled' : ''}><i class="ph ph-trash"></i></button>
                </td>
            </tr>`;
        }).join('');
    }

    // ==================== ADD BATCH ====================
    async function handleAddStock(e) {
        e.preventDefault();
        const produk = E.stockProduk?.value;
        const berat = parseFloat(E.stockBerat?.value);
        const hargaBeli = parseFloat(E.stockHargaBeli?.value);
        if (!produk || !berat || !hargaBeli) {
            window.showToast?.('Error', 'Lengkapi data wajib.', 'error');
            return;
        }
        const ongkir = parseFloat(E.stockOngkir?.value) || 0;
        const bensin = parseFloat(E.stockBensin?.value) || 0;
        const bongkar = E.stockToggleBongkar?.checked ? parseFloat(E.stockBongkarNominal?.value) || 0 : 0;
        const pajakType = E.stockPajakType?.value || 'none';
        const pajakValue = pajakType !== 'none' ? parseFloat(E.stockPajakValue?.value) || 0 : 0;
        const tglProduksi = E.stockTglProduksi?.value;
        const tglKadaluarsa = E.stockTglKadaluarsa?.value;
        if (!tglProduksi || !tglKadaluarsa) {
            window.showToast?.('Error', 'Tanggal wajib diisi.', 'error');
            return;
        }
        if (new Date(tglKadaluarsa) <= new Date(tglProduksi)) {
            window.showToast?.('Error', 'Kadaluarsa harus setelah produksi.', 'error');
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
            supplier: E.stockSupplierSelect?.value || '',
            warehouse: E.stockWarehouse?.value || 'gudang_utama'
        };

        await Storage.addBatch(newBatch);
        window.showToast?.('Sukses', `Batch ${produk} ${berat} kg ditambahkan.`, 'success');
        E.addStockForm.reset();
        if (E.stockBongkarNominal) E.stockBongkarNominal.classList.add('hidden');
        if (E.stockPajakValue) E.stockPajakValue.classList.add('hidden');
        refreshAllViews();
        if (CFS.Dashboard) CFS.Dashboard.refresh();
    }

    // ==================== EDIT BATCH (INLINE MODAL) ====================
    function editBatch(id) {
        const batch = Storage.getBatches().find(b => b.id === id);
        if (!batch) return;
        // Switch to form sub-tab and fill edit modal (or inline edit)
        // Kita akan buka modal edit
        if (E.editBatchModal) {
            E.editBatchId.value = batch.id;
            E.editBatchProduk.value = batch.produk;
            E.editBatchBerat.value = batch.berat;
            E.editBatchHargaBeli.value = batch.hargaBeli;
            E.editBatchTglProduksi.value = batch.tglProduksi;
            E.editBatchTglKadaluarsa.value = batch.tglKadaluarsa;
            E.editBatchModal.classList.remove('hidden');
        }
    }

    async function handleEditBatch(e) {
        e.preventDefault();
        const id = E.editBatchId?.value;
        const newBerat = parseFloat(E.editBatchBerat?.value);
        const newHarga = parseFloat(E.editBatchHargaBeli?.value);
        const tglProduksi = E.editBatchTglProduksi?.value;
        const tglKadaluarsa = E.editBatchTglKadaluarsa?.value;

        const batch = Storage.getBatches().find(b => b.id === id);
        if (!batch) return;
        if (newBerat < batch.used) {
            window.showToast?.('Error', 'Berat tidak boleh kurang dari terpakai.', 'error');
            return;
        }

        await Storage.updateBatch(id, {
            berat: newBerat,
            hargaBeli: newHarga,
            tglProduksi,
            tglKadaluarsa
        });

        window.showToast?.('Sukses', 'Batch diperbarui.', 'success');
        if (E.editBatchModal) E.editBatchModal.classList.add('hidden');
        refreshAllViews();
        if (CFS.Dashboard) CFS.Dashboard.refresh();
    }

    // ==================== DELETE BATCH ====================
    async function deleteBatch(id) {
        const batch = Storage.getBatches().find(b => b.id === id);
        if (!batch) return;
        if (batch.used > 0) {
            window.showToast?.('Error', 'Batch sudah terpakai.', 'error');
            return;
        }
        if (!confirm(`Hapus batch ${batch.produk}?`)) return;
        await Storage.deleteBatch(id);
        window.showToast?.('Sukses', 'Batch dihapus.', 'success');
        refreshAllViews();
    }

    async function bulkDeleteBatches() {
        const checks = document.querySelectorAll('.batch-checkbox:checked');
        if (checks.length === 0) return;
        const ids = Array.from(checks).map(c => c.dataset.id);
        if (!confirm(`Hapus ${ids.length} batch terpilih?`)) return;
        for (const id of ids) await Storage.deleteBatch(id);
        window.showToast?.('Sukses', `${ids.length} batch dihapus.`, 'success');
        refreshAllViews();
    }

    // ==================== EXPIRING ====================
    function refreshExpiring(threshold = 7) {
        if (!E.expiringBatchBody) return;
        const today = new Date();
        const limit = new Date(today);
        limit.setDate(limit.getDate() + threshold);
        let batches;
        if (threshold === 0) {
            batches = Storage.getBatches().filter(b => new Date(b.tglKadaluarsa) < today && (b.berat - b.used) > 0);
        } else {
            batches = Storage.getBatches().filter(b => {
                const exp = new Date(b.tglKadaluarsa);
                return (b.berat - b.used) > 0 && exp <= limit && exp >= today;
            });
        }
        if (batches.length === 0) {
            E.expiringBatchBody.innerHTML = '<tr><td colspan="4" class="text-center p-4 opacity-50">Tidak ada batch kritis.</td></tr>';
            return;
        }
        E.expiringBatchBody.innerHTML = batches.map(b => {
            const daysLeft = Math.ceil((new Date(b.tglKadaluarsa) - today) / 86400000);
            const urgency = daysLeft <= 3 ? 'text-red-600 font-bold' : 'text-amber-600';
            return `<tr class="border-t">
                <td class="p-2">${b.produk}</td>
                <td class="p-2 text-right">${b.berat - b.used} kg</td>
                <td class="p-2 ${urgency}">${b.tglKadaluarsa} (${daysLeft} hari)</td>
                <td class="p-2">${b.warehouse === 'gudang_dingin' ? '❄️ Cold' : '🏭 Utama'}</td>
            </tr>`;
        }).join('');
    }

    // ==================== WAREHOUSE ====================
    function refreshWarehouse() {
        if (!E.warehouseStockBody) return;
        const mapUtama = {}, mapCold = {};
        Storage.getBatches().forEach(b => {
            const w = b.warehouse === 'gudang_dingin' ? 'cold' : 'utama';
            const target = w === 'cold' ? mapCold : mapUtama;
            target[b.produk] = (target[b.produk] || 0) + (b.berat - b.used);
        });
        const prods = getProductList();
        E.warehouseStockBody.innerHTML = prods.map(p => {
            const u = mapUtama[p] || 0, c = mapCold[p] || 0;
            return `<tr class="border-t"><td class="p-2">${p}</td><td class="p-2 text-right">${u} kg</td><td class="p-2 text-right">${c} kg</td><td class="p-2 text-right">${u + c} kg</td></tr>`;
        }).join('');

        const kapUtama = 10000, kapCold = 5000;
        const totalUtama = Object.values(mapUtama).reduce((a, b) => a + b, 0);
        const totalCold = Object.values(mapCold).reduce((a, b) => a + b, 0);
        if (E.whUtamaFill) E.whUtamaFill.style.width = Math.min(100, (totalUtama / kapUtama) * 100) + '%';
        if (E.whColdFill) E.whColdFill.style.width = Math.min(100, (totalCold / kapCold) * 100) + '%';
        if (E.whUtamaText) E.whUtamaText.textContent = `${totalUtama} / ${kapUtama} kg`;
        if (E.whColdText) E.whColdText.textContent = `${totalCold} / ${kapCold} kg`;
    }

    // ==================== ANALYSIS ====================
    function refreshAnalysis() {
        const stockMap = getProductStockMap();
        const prods = getProductList();
        const data = prods.map(p => stockMap[p] || 0);

        // Chart stok per produk
        const ctx1 = E.chartStockPerProduct?.getContext('2d');
        if (ctx1) {
            if (stockPerProductChart) stockPerProductChart.destroy();
            stockPerProductChart = new Chart(ctx1, {
                type: 'bar',
                data: {
                    labels: prods,
                    datasets: [{ label: 'Stok (kg)', data, backgroundColor: '#3b82f6', borderRadius: 4 }]
                },
                options: { responsive: true, plugins: { legend: { display: false } } }
            });
        }

        // Chart nilai stok
        const ctx2 = E.chartStockValue?.getContext('2d');
        if (ctx2) {
            const valueData = prods.map(p =>
                Storage.getBatches().filter(b => b.produk === p)
                    .reduce((sum, b) => sum + (b.berat - b.used) * calculateHPP(b), 0)
            );
            if (stockValueChart) stockValueChart.destroy();
            stockValueChart = new Chart(ctx2, {
                type: 'bar',
                data: {
                    labels: prods,
                    datasets: [{ label: 'Nilai (Rp)', data: valueData, backgroundColor: '#22c55e', borderRadius: 4 }]
                },
                options: {
                    responsive: true,
                    plugins: { tooltip: { callbacks: { label: (ctx) => formatRupiah(ctx.raw) } } }
                }
            });
        }

        // Rekomendasi restock
        if (E.restockRecommendations) {
            const recs = prods.filter(p => (stockMap[p] || 0) < 10).map(p => `<p class="text-sm">⚠️ <strong>${p}</strong>: ${stockMap[p] || 0} kg — segera restock.</p>`);
            E.restockRecommendations.innerHTML = recs.length ? recs.join('') : '<p class="text-green-600 text-sm">✅ Semua stok aman.</p>';
        }
    }

    // ==================== EXPORT ====================
    function exportBatchesCSV() {
        const batches = Storage.getBatches();
        const csv = 'ID,Produk,Gudang,Berat,Terpakai,Sisa,HPP,Produksi,Kadaluarsa\n' +
            batches.map(b => `${b.id},${b.produk},${b.warehouse||'gudang_utama'},${b.berat},${b.used},${b.berat-b.used},${Math.round(calculateHPP(b))},${b.tglProduksi},${b.tglKadaluarsa}`).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `batch_${getToday()}.csv`;
        a.click();
        window.showToast?.('Sukses', 'CSV diunduh.', 'success');
    }

    // ==================== EVENT BINDING ====================
    function bindEvents() {
        // Sub-tab switching sudah di setupSubTabs
        if (E.applyBatchFilter) E.applyBatchFilter.addEventListener('click', () => refreshBatchTable());
        if (E.addStockForm) E.addStockForm.addEventListener('submit', handleAddStock);
        if (E.editBatchForm) E.editBatchForm.addEventListener('submit', handleEditBatch);
        if (E.exportBatchCSV) E.exportBatchCSV.addEventListener('click', exportBatchesCSV);
        if (E.batchBulkDelete) E.batchBulkDelete.addEventListener('click', bulkDeleteBatches);

        // Toggle bongkar & pajak
        if (E.stockToggleBongkar) E.stockToggleBongkar.addEventListener('change', function () {
            E.stockBongkarNominal?.classList.toggle('hidden', !this.checked);
        });
        if (E.stockPajakType) E.stockPajakType.addEventListener('change', function () {
            E.stockPajakValue?.classList.toggle('hidden', this.value === 'none');
        });

        // Expiring buttons
        if (E.showExpiring7) E.showExpiring7.addEventListener('click', () => refreshExpiring(7));
        if (E.showExpiring30) E.showExpiring30.addEventListener('click', () => refreshExpiring(30));
        if (E.showExpired) E.showExpired.addEventListener('click', () => refreshExpiring(0));

        // Modal backdrop
        if (E.editBatchModal) E.editBatchModal.addEventListener('click', function (e) { if (e.target === this) this.classList.add('hidden'); });
    }

    // ==================== REFRESH ALL ====================
    function refreshAllViews() {
        refreshStats();
        if (currentSubTab === 'stock-overview') refreshOverview();
        if (currentSubTab === 'stock-batches') refreshBatchTable();
        if (currentSubTab === 'stock-expiring') refreshExpiring();
        if (currentSubTab === 'stock-warehouse') refreshWarehouse();
        if (currentSubTab === 'stock-analysis') refreshAnalysis();
    }

    // ==================== INIT ====================
    async function initInventory() {
        cacheElements();
        setupSubTabs();
        populateDropdowns();
        bindEvents();
        refreshAllViews();
    }

    // ==================== EXPORT API ====================
    CFS.Inventory = {
        init: initInventory,
        refreshStockTable: refreshAllViews,
        getStockPerProduct: getProductStockMap,
        calculateHPP,
        editBatch,
        deleteBatch
    };
})();
