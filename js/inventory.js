/* ============================================================
   Cibitung Frozen ERP Ultimate v5.4 — Inventory Module (Full Upgrade)
   ============================================================ */
window.CFS = window.CFS || {};
(function() {
    'use strict';
    const Storage = CFS.Storage;

    // Chart instances
    let overviewChart = null, stockPerProductChart = null, stockValueChart = null;

    // ===================== INISIALISASI UTAMA =====================
    async function initInventory() {
        cacheAllElements();
        populateAllDropdowns();
        bindAllEvents();
        refreshAllViews();
        // Set default tanggal produksi ke hari ini
        if (elements.stockTglProduksi && !elements.stockTglProduksi.value) {
            elements.stockTglProduksi.value = new Date().toISOString().split('T')[0];
        }
    }

    // Semua elemen DOM yang digunakan
    let elements = {};
    function cacheAllElements() {
        elements = {
            // Stats
            stTotalProducts: document.getElementById('stTotalProducts'),
            stTotalStock: document.getElementById('stTotalStock'),
            stActiveBatches: document.getElementById('stActiveBatches'),
            stCriticalBatches: document.getElementById('stCriticalBatches'),
            stStockValue: document.getElementById('stStockValue'),
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
            // Legacy elements (jika masih dipakai)
            stockTableBody: document.getElementById('stockTableBody'),
            usedBatchesToday: document.getElementById('usedBatchesToday'),
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
            // Legacy modals (jika masih ada)
            batchDetailModal: document.getElementById('batchDetailModal'),
            batchDetailContent: document.getElementById('batchDetailContent'),
            batchProdukSelect: document.getElementById('batchProdukSelect'),
            editBatchModal: document.getElementById('editBatchModal'),
            editBatchForm: document.getElementById('editBatchForm'),
            editBatchId: document.getElementById('editBatchId'),
            editBatchProduk: document.getElementById('editBatchProduk'),
            editBatchBerat: document.getElementById('editBatchBerat'),
            editBatchHargaBeli: document.getElementById('editBatchHargaBeli'),
            editBatchTglProduksi: document.getElementById('editBatchTglProduksi'),
            editBatchTglKadaluarsa: document.getElementById('editBatchTglKadaluarsa')
        };
    }

    function populateAllDropdowns() {
        const prods = Storage.getProducts().length ? Storage.getProducts().map(p => p.name) : Storage.defaultProducts;
        const prodOptions = '<option value="">Semua</option>' + prods.map(p => `<option>${p}</option>`).join('');
        const prodOptions2 = '<option value="">Pilih Produk</option>' + prods.map(p => `<option>${p}</option>`).join('');

        if (elements.batchFilterProduk) elements.batchFilterProduk.innerHTML = prodOptions;
        if (elements.stockProduk) elements.stockProduk.innerHTML = prodOptions2;

        const sups = Storage.getSuppliers();
        if (elements.stockSupplierSelect) {
            elements.stockSupplierSelect.innerHTML = '<option value="">Pilih Supplier</option>' + sups.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        }
        // Populate legacy dropdowns if they exist
        if (elements.batchProdukSelect) elements.batchProdukSelect.innerHTML = prodOptions;
    }

    // ===================== STATISTIK =====================
    function refreshStats() {
        const batches = Storage.getBatches();
        const products = Storage.getProducts().length ? Storage.getProducts().map(p => p.name) : Storage.defaultProducts;
        const totalProducts = products.length;
        const stockMap = getStockPerProduct();
        const totalStock = Object.values(stockMap).reduce((a, b) => a + b, 0);
        const activeBatches = batches.filter(b => (b.berat - b.used) > 0).length;
        const weekLater = new Date();
        weekLater.setDate(weekLater.getDate() + 7);
        const critical = batches.filter(b => new Date(b.tglKadaluarsa) <= weekLater && (b.berat - b.used) > 0).length;
        const stockValue = batches.reduce((sum, b) => sum + ((b.berat - b.used) * calculateHPP(b)), 0);

        if (elements.stTotalProducts) elements.stTotalProducts.textContent = totalProducts;
        if (elements.stTotalStock) elements.stTotalStock.textContent = totalStock + ' kg';
        if (elements.stActiveBatches) elements.stActiveBatches.textContent = activeBatches;
        if (elements.stCriticalBatches) elements.stCriticalBatches.textContent = critical;
        if (elements.stStockValue) elements.stStockValue.textContent = 'Rp ' + Math.round(stockValue).toLocaleString('id-ID');
    }

    // ===================== FUNGSI STOK DASAR =====================
    function getStockPerProduct() {
        const batches = Storage.getBatches();
        const map = {};
        batches.forEach(b => {
            if (!map[b.produk]) map[b.produk] = 0;
            map[b.produk] += (b.berat - b.used);
        });
        (Storage.getProducts().length ? Storage.getProducts().map(p => p.name) : Storage.defaultProducts)
            .forEach(p => { if (!map[p]) map[p] = 0; });
        return map;
    }

    function calculateHPP(batch) {
        const totalCost = (batch.hargaBeli * batch.berat) + (batch.ongkir || 0) + (batch.bensin || 0) + (batch.bongkar || 0);
        return batch.berat > 0 ? totalCost / batch.berat : batch.hargaBeli;
    }

    function formatDateID(dateStr) {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    }

    // ===================== RINGKASAN STOK =====================
    function renderOverview() {
        const stockMap = getStockPerProduct();
        const products = Storage.getProducts().length ? Storage.getProducts().map(p => p.name) : Storage.defaultProducts;
        if (elements.stockOverviewBody) {
            elements.stockOverviewBody.innerHTML = products.map(p => {
                const stok = stockMap[p] || 0;
                const status = stok === 0 ? '🔴 Kosong' : stok < 10 ? '🟡 Menipis' : '🟢 Aman';
                const batchCount = Storage.getBatches().filter(b => b.produk === p && (b.berat - b.used) > 0).length;
                return `<tr class="border-t"><td class="p-2 font-medium">${p}</td><td class="p-2 text-right">${stok} kg</td><td class="p-2 text-right">${batchCount}</td><td class="p-2 text-center">${status}</td></tr>`;
            }).join('');
        }
        renderOverviewChart();
    }

    function renderOverviewChart() {
        const ctx = elements.chartStockOverview?.getContext('2d');
        if (!ctx) return;
        const stockMap = getStockPerProduct();
        const products = Storage.getProducts().length ? Storage.getProducts().map(p => p.name) : Storage.defaultProducts;
        const data = products.map(p => stockMap[p] || 0);
        if (overviewChart) overviewChart.destroy();
        overviewChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: products,
                datasets: [{ label: 'Stok (kg)', data, backgroundColor: data.map(v => v < 10 ? '#ef4444' : v < 20 ? '#f59e0b' : '#22c55e') }]
            },
            options: { responsive: true, indexAxis: 'y', plugins: { legend: { display: false } } }
        });
    }

    // ===================== DAFTAR BATCH =====================
    function renderBatchTable(filter = {}) {
        if (!elements.batchTableBody) return;
        let batches = Storage.getBatches();
        if (filter.produk) batches = batches.filter(b => b.produk === filter.produk);
        if (filter.gudang) batches = batches.filter(b => (b.warehouse || 'gudang_utama') === filter.gudang);
        if (filter.status === 'aktif') batches = batches.filter(b => (b.berat - b.used) > 0);
        if (filter.status === 'habis') batches = batches.filter(b => (b.berat - b.used) <= 0);
        batches.sort((a, b) => new Date(a.tglKadaluarsa) - new Date(b.tglKadaluarsa));

        if (!batches.length) {
            elements.batchTableBody.innerHTML = '<tr><td colspan="10" class="text-center p-4 opacity-50">Tidak ada batch.</td></tr>';
            return;
        }
        elements.batchTableBody.innerHTML = batches.map(b => {
            const sisa = b.berat - b.used;
            const hpp = calculateHPP(b);
            return `<tr class="border-t hover:bg-slate-50 dark:hover:bg-slate-700">
                <td class="p-2 text-xs">${b.id.slice(-6)}</td>
                <td class="p-2 font-medium">${b.produk}</td>
                <td class="p-2">${b.warehouse === 'gudang_dingin' ? '❄️ Cold' : '🏭 Utama'}</td>
                <td class="p-2 text-right">${b.berat} kg</td>
                <td class="p-2 text-right">${b.used} kg</td>
                <td class="p-2 text-right font-semibold ${sisa <= 0 ? 'text-red-500' : ''}">${sisa} kg</td>
                <td class="p-2 text-right">Rp ${Math.round(hpp).toLocaleString('id-ID')}</td>
                <td class="p-2">${b.tglProduksi}</td>
                <td class="p-2">${b.tglKadaluarsa}</td>
                <td class="p-2 text-center">
                    <button class="btn btn-xs btn-secondary" onclick="CFS.Inventory.editBatchInline('${b.id}')">✏️</button>
                    <button class="btn btn-xs btn-danger" onclick="CFS.Inventory.deleteBatch('${b.id}')" ${sisa !== b.berat ? 'disabled' : ''}>🗑️</button>
                </td>
            </tr>`;
        }).join('');
    }

    // ===================== FORM TAMBAH =====================
    async function handleAddStock(e) {
        e.preventDefault();
        const produk = elements.stockProduk?.value;
        const berat = parseFloat(elements.stockBerat?.value);
        const hargaBeli = parseFloat(elements.stockHargaBeli?.value);
        if (!produk || !berat || !hargaBeli) {
            showToast?.('Error', 'Lengkapi data produk, berat, dan harga beli.', 'error');
            return;
        }
        const ongkir = parseFloat(elements.stockOngkir?.value) || 0;
        const bensin = parseFloat(elements.stockBensin?.value) || 0;
        const bongkar = elements.stockToggleBongkar?.checked ? parseFloat(elements.stockBongkarNominal?.value) || 0 : 0;
        const pajakType = elements.stockPajakType?.value || 'none';
        const pajakValue = pajakType !== 'none' ? parseFloat(elements.stockPajakValue?.value) || 0 : 0;
        const tglProduksi = elements.stockTglProduksi?.value;
        const tglKadaluarsa = elements.stockTglKadaluarsa?.value;
        if (!tglProduksi || !tglKadaluarsa) {
            showToast?.('Error', 'Tanggal produksi dan kadaluarsa wajib diisi.', 'error');
            return;
        }
        if (new Date(tglKadaluarsa) <= new Date(tglProduksi)) {
            showToast?.('Error', 'Tanggal kadaluarsa harus setelah produksi.', 'error');
            return;
        }

        const newBatch = {
            id: 'b' + Date.now(),
            produk, berat, hargaBeli, ongkir, bensin, bongkar,
            pajakType, pajakValue,
            tglProduksi, tglKadaluarsa,
            used: 0,
            supplier: elements.stockSupplierSelect?.value || '',
            warehouse: elements.stockWarehouse?.value || 'gudang_utama'
        };

        await Storage.addBatch(newBatch);
        showToast?.('Sukses', `Batch ${produk} ${berat} kg ditambahkan.`, 'success');
        elements.addStockForm.reset();
        elements.stockBongkarNominal?.classList.add('hidden');
        elements.stockPajakValue?.classList.add('hidden');
        if (elements.stockTglProduksi) elements.stockTglProduksi.value = new Date().toISOString().split('T')[0];
        refreshAllViews();
        if (CFS.Dashboard?.refresh) CFS.Dashboard.refresh();
    }

    // ===================== EDIT & HAPUS BATCH =====================
    async function editBatchInline(id) {
        const batch = Storage.getBatches().find(b => b.id === id);
        if (!batch) return;
        const newBerat = prompt('Berat baru (kg):', batch.berat);
        if (newBerat === null) return;
        const newHarga = prompt('Harga beli per kg baru:', batch.hargaBeli);
        if (newHarga === null) return;
        const newProduksi = prompt('Tanggal produksi (YYYY-MM-DD):', batch.tglProduksi);
        if (newProduksi === null) return;
        const newKadaluarsa = prompt('Tanggal kadaluarsa (YYYY-MM-DD):', batch.tglKadaluarsa);
        if (newKadaluarsa === null) return;

        const parsedBerat = parseFloat(newBerat);
        if (isNaN(parsedBerat) || parsedBerat < batch.used) {
            showToast?.('Error', 'Berat tidak boleh kurang dari yang sudah terpakai.', 'error');
            return;
        }
        await Storage.updateBatch(id, {
            berat: parsedBerat,
            hargaBeli: parseFloat(newHarga) || batch.hargaBeli,
            tglProduksi: newProduksi,
            tglKadaluarsa: newKadaluarsa
        });
        showToast?.('Sukses', 'Batch diperbarui.', 'success');
        refreshAllViews();
        if (CFS.Dashboard?.refresh) CFS.Dashboard.refresh();
    }

    async function deleteBatch(id) {
        const batch = Storage.getBatches().find(b => b.id === id);
        if (!batch) return;
        if (batch.used > 0) {
            showToast?.('Error', 'Batch tidak bisa dihapus karena sudah terpakai.', 'error');
            return;
        }
        if (!confirm(`Hapus batch ${batch.produk} (${batch.berat} kg)?`)) return;
        await Storage.deleteBatch(id);
        showToast?.('Sukses', 'Batch dihapus.', 'success');
        refreshAllViews();
        if (CFS.Dashboard?.refresh) CFS.Dashboard.refresh();
    }

    // ===================== KADALUARSA =====================
    function renderExpiring(threshold = 7) {
        if (!elements.expiringBatchBody) return;
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
        if (!batches.length) {
            elements.expiringBatchBody.innerHTML = '<tr><td colspan="4" class="text-center p-4 opacity-50">Tidak ada batch.</td></tr>';
            return;
        }
        elements.expiringBatchBody.innerHTML = batches.map(b =>
            `<tr class="border-t"><td class="p-2">${b.produk}</td><td class="p-2 text-right">${b.berat - b.used} kg</td><td class="p-2">${b.tglKadaluarsa}</td><td class="p-2">${b.warehouse === 'gudang_dingin' ? '❄️ Cold' : '🏭 Utama'}</td></tr>`
        ).join('');
    }

    // ===================== GUDANG =====================
    function renderWarehouse() {
        if (!elements.warehouseStockBody) return;
        const mapUtama = {}, mapCold = {};
        Storage.getBatches().forEach(b => {
            const w = b.warehouse === 'gudang_dingin' ? 'cold' : 'utama';
            (w === 'cold' ? mapCold : mapUtama)[b.produk] = ((w === 'cold' ? mapCold : mapUtama)[b.produk] || 0) + (b.berat - b.used);
        });
        const products = Storage.getProducts().length ? Storage.getProducts().map(p => p.name) : Storage.defaultProducts;
        elements.warehouseStockBody.innerHTML = products.map(p => {
            const u = mapUtama[p] || 0, c = mapCold[p] || 0;
            return `<tr class="border-t"><td class="p-2">${p}</td><td class="p-2 text-right">${u} kg</td><td class="p-2 text-right">${c} kg</td><td class="p-2 text-right">${u + c} kg</td></tr>`;
        }).join('');

        const kapUtama = 10000, kapCold = 5000;
        const totalUtama = Object.values(mapUtama).reduce((a, b) => a + b, 0);
        const totalCold = Object.values(mapCold).reduce((a, b) => a + b, 0);
        if (elements.whUtamaFill) elements.whUtamaFill.style.width = Math.min(100, (totalUtama / kapUtama) * 100) + '%';
        if (elements.whColdFill) elements.whColdFill.style.width = Math.min(100, (totalCold / kapCold) * 100) + '%';
        if (elements.whUtamaText) elements.whUtamaText.textContent = `${totalUtama} / ${kapUtama} kg`;
        if (elements.whColdText) elements.whColdText.textContent = `${totalCold} / ${kapCold} kg`;
    }

    // ===================== ANALISIS =====================
    function renderAnalysis() {
        const stockMap = getStockPerProduct();
        const products = Storage.getProducts().length ? Storage.getProducts().map(p => p.name) : Storage.defaultProducts;
        const data = products.map(p => stockMap[p] || 0);
        // Chart stok per produk
        const ctx1 = elements.chartStockPerProduct?.getContext('2d');
        if (ctx1) {
            if (stockPerProductChart) stockPerProductChart.destroy();
            stockPerProductChart = new Chart(ctx1, {
                type: 'bar', data: { labels: products, datasets: [{ label: 'Stok (kg)', data, backgroundColor: '#3b82f6' }] },
                options: { responsive: true }
            });
        }
        // Chart nilai stok
        const ctx2 = elements.chartStockValue?.getContext('2d');
        if (ctx2) {
            const valueData = products.map(p =>
                Storage.getBatches().filter(b => b.produk === p)
                    .reduce((sum, b) => sum + (b.berat - b.used) * calculateHPP(b), 0)
            );
            if (stockValueChart) stockValueChart.destroy();
            stockValueChart = new Chart(ctx2, {
                type: 'bar', data: { labels: products, datasets: [{ label: 'Nilai (Rp)', data: valueData, backgroundColor: '#22c55e' }] },
                options: {
                    responsive: true,
                    plugins: { tooltip: { callbacks: { label: (ctx) => 'Rp ' + ctx.raw.toLocaleString('id-ID') } } }
                }
            });
        }
        // Rekomendasi restock
        if (elements.restockRecommendations) {
            const recs = products
                .filter(p => (stockMap[p] || 0) < 10)
                .map(p => `<p>⚠️ <strong>${p}</strong>: stok ${stockMap[p] || 0} kg — segera lakukan restock.</p>`);
            elements.restockRecommendations.innerHTML = recs.length ? recs.join('') : '<p class="text-green-600">✅ Semua stok dalam kondisi aman.</p>';
        }
    }

    // ===================== REFRESH SEMUA =====================
    function refreshAllViews() {
        refreshStats();
        renderOverview();
        renderBatchTable();
        renderExpiring(7);
        renderWarehouse();
        renderAnalysis();
        // Update legacy jika ada
        if (elements.stockTableBody) refreshLegacyStockTable();
        if (elements.usedBatchesToday) refreshUsedBatchesToday();
    }

    function refreshLegacyStockTable() {
        const map = getStockPerProduct();
        const products = Storage.getProducts().length ? Storage.getProducts().map(p => p.name) : Storage.defaultProducts;
        elements.stockTableBody.innerHTML = products.map(produk => {
            const stok = map[produk] || 0;
            const batchesAktif = Storage.getBatches().filter(b => b.produk === produk && (b.berat - b.used) > 0).length;
            const status = stok === 0 ? '<span class="text-red-500 font-semibold">Kosong</span>' : stok < 10 ? '<span class="text-amber-500 font-semibold">Menipis</span>' : '<span class="text-green-500 font-semibold">Aman</span>';
            return `<tr class="border-t"><td class="p-3 font-medium">${produk}</td><td class="p-3 text-right">${stok} kg</td><td class="p-3 text-right">${batchesAktif}</td><td class="p-3 text-center">${status}</td><td class="p-3 text-center"><button onclick="CFS.Inventory.deleteProduct('${produk}')" class="btn btn-danger btn-xs">🗑️</button></td></tr>`;
        }).join('');
    }

    function refreshUsedBatchesToday() {
        if (!elements.usedBatchesToday) return;
        const today = new Date().toISOString().split('T')[0];
        const salesToday = Storage.getSales().filter(s => s.tanggal === today);
        const usedIds = [...new Set(salesToday.map(s => s.batchUsed))];
        const usedBatches = Storage.getBatches().filter(b => usedIds.includes(b.id));
        if (!usedBatches.length) {
            elements.usedBatchesToday.innerHTML = '<p class="opacity-50 italic">Belum ada batch terpakai hari ini.</p>';
            return;
        }
        elements.usedBatchesToday.innerHTML = usedBatches.map(b =>
            `<div class="flex justify-between py-1"><span>${b.produk} (${b.id.slice(-4)})</span><span class="font-semibold">${b.used} / ${b.berat} kg</span></div>`
        ).join('');
    }

    async function deleteProductBatches(produk) {
        if (!confirm(`Hapus SEMUA batch untuk ${produk}?`)) return;
        const toDelete = Storage.getBatches().filter(b => b.produk === produk && b.used === 0);
        for (const b of toDelete) await Storage.deleteBatch(b.id);
        showToast?.('Sukses', `Batch ${produk} yang belum terpakai dihapus.`, 'success');
        refreshAllViews();
    }

    // ===================== EVENT BINDING =====================
    function bindAllEvents() {
        // Sub-tab navigation
        document.querySelectorAll('.stock-subtab-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.stock-subtab-btn').forEach(b => { b.classList.remove('btn-primary','active'); b.classList.add('btn-secondary'); });
                this.classList.add('btn-primary','active'); this.classList.remove('btn-secondary');
                document.querySelectorAll('.stock-subtab-content').forEach(c => c.classList.add('hidden'));
                const target = document.getElementById(this.dataset.stockTab);
                if (target) target.classList.remove('hidden');
                const tab = this.dataset.stockTab;
                if (tab === 'stock-batches') renderBatchTable();
                if (tab === 'stock-expiring') renderExpiring(7);
                if (tab === 'stock-warehouse') renderWarehouse();
                if (tab === 'stock-analysis') renderAnalysis();
            });
        });

        // Filter batch
        if (elements.applyBatchFilter) elements.applyBatchFilter.addEventListener('click', () => {
            renderBatchTable({
                produk: elements.batchFilterProduk?.value,
                gudang: elements.batchFilterGudang?.value,
                status: elements.batchFilterStatus?.value
            });
        });

        // Export CSV batch
        if (elements.exportBatchCSV) elements.exportBatchCSV.addEventListener('click', () => {
            const batches = Storage.getBatches();
            const csv = 'ID,Produk,Gudang,Berat,Terpakai,Sisa,HPP,Produksi,Kadaluarsa\n' +
                batches.map(b => `${b.id},${b.produk},${b.warehouse||'gudang_utama'},${b.berat},${b.used},${b.berat-b.used},${Math.round(calculateHPP(b))},${b.tglProduksi},${b.tglKadaluarsa}`).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `batch_${new Date().toISOString().slice(0,10)}.csv`; a.click();
            showToast?.('Sukses', 'CSV diunduh.', 'success');
        });

        // Form tambah batch
        if (elements.addStockForm) elements.addStockForm.addEventListener('submit', handleAddStock);
        if (elements.stockToggleBongkar) elements.stockToggleBongkar.addEventListener('change', function() {
            elements.stockBongkarNominal?.classList.toggle('hidden', !this.checked);
        });
        if (elements.stockPajakType) elements.stockPajakType.addEventListener('change', function() {
            elements.stockPajakValue?.classList.toggle('hidden', this.value === 'none');
        });

        // Tombol kadaluarsa
        if (elements.showExpiring7) elements.showExpiring7.addEventListener('click', () => renderExpiring(7));
        if (elements.showExpiring30) elements.showExpiring30.addEventListener('click', () => renderExpiring(30));
        if (elements.showExpired) elements.showExpired.addEventListener('click', () => renderExpiring(0));

        // Modal backdrop legacy
        if (elements.batchDetailModal) elements.batchDetailModal.addEventListener('click', function(e) { if (e.target === this) this.classList.add('hidden'); });
        if (elements.editBatchModal) elements.editBatchModal.addEventListener('click', function(e) { if (e.target === this) this.classList.add('hidden'); });
        if (elements.editBatchForm) elements.editBatchForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const id = elements.editBatchId.value;
            const berat = parseFloat(elements.editBatchBerat.value);
            const harga = parseFloat(elements.editBatchHargaBeli.value);
            const tglProd = elements.editBatchTglProduksi.value;
            const tglKad = elements.editBatchTglKadaluarsa.value;
            const batch = Storage.getBatches().find(b => b.id === id);
            if (!batch) return;
            if (berat < batch.used) { showToast?.('Error', 'Berat < terpakai.', 'error'); return; }
            await Storage.updateBatch(id, { berat, hargaBeli: harga, tglProduksi: tglProd, tglKadaluarsa: tglKad });
            showToast?.('Sukses', 'Batch diperbarui.', 'success');
            elements.editBatchModal.classList.add('hidden');
            refreshAllViews();
        });
    }

    // ===================== API PUBLIK =====================
    CFS.Inventory = {
        init: initInventory,
        refreshStockTable: refreshAllViews,
        getStockPerProduct,
        populateProductDropdowns: populateAllDropdowns,
        calculateHPP,
        formatDateID,
        editBatchInline,
        deleteBatch,
        deleteProduct: deleteProductBatches,
        openEditBatchModal(batchId) {
            const batch = Storage.getBatches().find(b => b.id === batchId);
            if (!batch || !elements.editBatchModal) return;
            elements.editBatchId.value = batch.id;
            elements.editBatchProduk.value = batch.produk;
            elements.editBatchBerat.value = batch.berat;
            elements.editBatchHargaBeli.value = batch.hargaBeli;
            elements.editBatchTglProduksi.value = batch.tglProduksi;
            elements.editBatchTglKadaluarsa.value = batch.tglKadaluarsa;
            elements.editBatchModal.classList.remove('hidden');
        },
        showBatchDetailModal() {
            if (!elements.batchDetailModal) return;
            const filter = elements.batchProdukSelect?.value || '';
            const batches = filter ? Storage.getBatches().filter(b => b.produk === filter) : Storage.getBatches();
            elements.batchDetailContent.innerHTML = batches.map(b => {
                const sisa = b.berat - b.used;
                return `<div class="border rounded-lg p-4 mb-3 bg-slate-50"><h4 class="font-bold">${b.produk}</h4><p>Sisa: ${sisa} kg | HPP: Rp ${Math.round(calculateHPP(b)).toLocaleString('id-ID')}</p><button onclick="CFS.Inventory.editBatchInline('${b.id}')" class="btn btn-xs btn-secondary">✏️</button></div>`;
            }).join('') || '<p>Tidak ada batch.</p>';
            elements.batchDetailModal.classList.remove('hidden');
        }
    };
})();
