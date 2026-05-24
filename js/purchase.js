/* ============================================================
   Cibitung Frozen ERP Ultimate v5.4 — Purchase Module (Upgrade)
   ============================================================ */
window.CFS = window.CFS || {};

(function() {
    'use strict';
    const Storage = CFS.Storage;

    let purchaseOrders = [];
    let monthlyChart = null;

    // Cache elemen
    let elements = {};

    function cacheElements() {
        elements = {
            // Statistik
            poTotalPO: document.getElementById('poTotalPO'),
            poMonthPO: document.getElementById('poMonthPO'),
            poTotalValue: document.getElementById('poTotalValue'),
            poTopSupplier: document.getElementById('poTopSupplier'),
            poTopProduct: document.getElementById('poTopProduct'),
            // Daftar PO
            poFilterStart: document.getElementById('poFilterStart'),
            poFilterEnd: document.getElementById('poFilterEnd'),
            poFilterSupplier: document.getElementById('poFilterSupplier'),
            poFilterStatus: document.getElementById('poFilterStatus'),
            applyPoFilter: document.getElementById('applyPoFilter'),
            exportPoCSV: document.getElementById('exportPoCSV'),
            purchaseTableBody: document.getElementById('purchaseTableBody'),
            // Form PO
            purchaseForm: document.getElementById('purchaseForm'),
            purchaseSupplier: document.getElementById('purchaseSupplier'),
            purchaseProduk: document.getElementById('purchaseProduk'),
            purchaseQty: document.getElementById('purchaseQty'),
            purchaseHarga: document.getElementById('purchaseHarga'),
            purchaseTgl: document.getElementById('purchaseTgl'),
            purchaseEstimasi: document.getElementById('purchaseEstimasi'),
            purchaseCatatan: document.getElementById('purchaseCatatan'),
            // Riwayat
            poHistoryTableBody: document.getElementById('poHistoryTableBody'),
            // Analisis
            poAnalysisSupplierTable: document.getElementById('poAnalysisSupplierTable'),
            chartPurchaseMonthly: document.getElementById('chartPurchaseMonthly'),
        };
    }

    // ---------- INIT ----------
    async function initPurchaseTab() {
        await loadPOData();
        cacheElements();
        setupSubTabs();
        refreshStats();
        renderPOTable();
        populateDropdowns();
        bindEvents();
        if (elements.purchaseTgl && !elements.purchaseTgl.value) {
            elements.purchaseTgl.value = new Date().toISOString().split('T')[0];
        }
    }

    async function loadPOData() {
        purchaseOrders = (await localforage.getItem('cfs_purchase_orders')) || [];
    }

    async function savePOData() {
        await localforage.setItem('cfs_purchase_orders', purchaseOrders);
    }

    // ---------- SUB‑TAB SWITCHING ----------
    function setupSubTabs() {
        document.querySelectorAll('.purchase-subtab-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.purchase-subtab-btn').forEach(b => {
                    b.classList.remove('btn-primary', 'active');
                    b.classList.add('btn-secondary');
                });
                this.classList.add('btn-primary', 'active');
                this.classList.remove('btn-secondary');

                const tab = this.dataset.purchaseTab;
                document.querySelectorAll('.purchase-subtab-content').forEach(c => c.classList.add('hidden'));
                const target = document.getElementById(tab);
                if (target) target.classList.remove('hidden');

                if (tab === 'purchase-list') renderPOTable();
                if (tab === 'purchase-history') renderPOHistory();
                if (tab === 'purchase-analysis') renderAnalysis();
            });
        });
    }

    // ---------- STATISTIK ----------
    function refreshStats() {
        const total = purchaseOrders.length;
        const today = new Date();
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        const monthPO = purchaseOrders.filter(po => po.tanggal >= monthStart).length;
        const totalValue = purchaseOrders.reduce((sum, po) => sum + po.total, 0);

        // Supplier teraktif
        const supplierCount = {};
        purchaseOrders.forEach(po => {
            supplierCount[po.supplierId] = (supplierCount[po.supplierId] || 0) + 1;
        });
        const topSupplierId = Object.entries(supplierCount).sort((a, b) => b[1] - a[1])[0]?.[0];
        const topSupplierName = topSupplierId ? (Storage.getSuppliers().find(s => s.id === topSupplierId)?.name || '?') : '-';

        // Produk terbanyak
        const productCount = {};
        purchaseOrders.forEach(po => {
            productCount[po.produk] = (productCount[po.produk] || 0) + po.qty;
        });
        const topProduct = Object.entries(productCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';

        if (elements.poTotalPO) elements.poTotalPO.textContent = total;
        if (elements.poMonthPO) elements.poMonthPO.textContent = monthPO;
        if (elements.poTotalValue) elements.poTotalValue.textContent = formatRupiah(totalValue);
        if (elements.poTopSupplier) elements.poTopSupplier.textContent = topSupplierName;
        if (elements.poTopProduct) elements.poTopProduct.textContent = topProduct;
    }

    function formatRupiah(n) {
        return 'Rp ' + Math.round(n).toLocaleString('id-ID');
    }

    // ---------- DAFTAR PO ----------
    function renderPOTable(filter = {}) {
        if (!elements.purchaseTableBody) return;
        let data = [...purchaseOrders];
        if (filter.start) data = data.filter(po => po.tanggal >= filter.start);
        if (filter.end) data = data.filter(po => po.tanggal <= filter.end);
        if (filter.supplierId) data = data.filter(po => po.supplierId === filter.supplierId);
        if (filter.status) data = data.filter(po => po.status === filter.status);

        data.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

        if (data.length === 0) {
            elements.purchaseTableBody.innerHTML = '<tr><td colspan="8" class="text-center p-4 opacity-50">Tidak ada PO.</td></tr>';
            return;
        }

        const suppliers = Storage.getSuppliers();
        elements.purchaseTableBody.innerHTML = data.map(po => {
            const supplier = suppliers.find(s => s.id === po.supplierId);
            const supplierName = supplier ? supplier.name : '?';
            const statusBadge = po.status === 'diterima' ? 'bg-green-100 text-green-700'
                               : po.status === 'batal' ? 'bg-red-100 text-red-700'
                               : 'bg-blue-100 text-blue-700';
            return `<tr class="border-t hover:bg-slate-50 dark:hover:bg-slate-700">
                <td class="p-2">${po.tanggal}</td>
                <td class="p-2">${supplierName}</td>
                <td class="p-2">${po.produk}</td>
                <td class="p-2 text-right">${po.qty} kg</td>
                <td class="p-2 text-right">${formatRupiah(po.hargaBeli)}</td>
                <td class="p-2 text-right font-semibold">${formatRupiah(po.total)}</td>
                <td class="p-2 text-center"><span class="badge ${statusBadge}">${po.status}</span></td>
                <td class="p-2 text-center">
                    ${po.status === 'draft' ? `<button class="btn btn-xs btn-success" onclick="CFS.Purchase.acceptPO('${po.id}')">✅ Terima</button>` : ''}
                    <button class="btn btn-xs btn-danger" onclick="CFS.Purchase.cancelPO('${po.id}')">❌ Batal</button>
                </td>
            </tr>`;
        }).join('');
    }

    function populateDropdowns() {
        const sups = Storage.getSuppliers();
        const supOptions = '<option value="">Semua</option>' + sups.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        if (elements.poFilterSupplier) elements.poFilterSupplier.innerHTML = supOptions;
        if (elements.purchaseSupplier) elements.purchaseSupplier.innerHTML = '<option value="">Pilih Supplier</option>' + sups.map(s => `<option value="${s.id}">${s.name}</option>`).join('');

        const prods = Storage.getProducts().length ? Storage.getProducts().map(p => p.name) : Storage.defaultProducts;
        if (elements.purchaseProduk) elements.purchaseProduk.innerHTML = '<option value="">Pilih Produk</option>' + prods.map(p => `<option>${p}</option>`).join('');
    }

    // ---------- FORM PO ----------
    async function handleCreatePO(e) {
        e.preventDefault();
        const supplierId = elements.purchaseSupplier.value;
        const produk = elements.purchaseProduk.value;
        const qty = parseFloat(elements.purchaseQty.value);
        const hargaBeli = parseFloat(elements.purchaseHarga.value);
        const tanggal = elements.purchaseTgl.value;
        const estimasi = elements.purchaseEstimasi?.value || '';
        const catatan = elements.purchaseCatatan?.value || '';

        if (!supplierId || !produk || !qty || !hargaBeli || !tanggal) {
            (window.showToast || showToast)('Error', 'Lengkapi data PO.', 'error');
            return;
        }

        const newPO = {
            id: 'po_' + Date.now(),
            tanggal,
            supplierId,
            produk,
            qty,
            hargaBeli,
            total: qty * hargaBeli,
            estimasi,
            catatan,
            status: 'draft'
        };
        purchaseOrders.push(newPO);
        await savePOData();
        (window.showToast || showToast)('Sukses', 'Purchase Order dibuat.', 'success');
        elements.purchaseForm.reset();
        elements.purchaseTgl.value = new Date().toISOString().split('T')[0];
        refreshStats();
        renderPOTable();
        renderPOHistory();
    }

    // ---------- AKSI PO ----------
    async function acceptPO(id) {
        const po = purchaseOrders.find(p => p.id === id);
        if (!po) return;
        if (!confirm(`Terima PO ini? Stok batch akan ditambahkan.`)) return;

        const newBatch = {
            id: 'b' + Date.now(),
            produk: po.produk,
            berat: po.qty,
            hargaBeli: po.hargaBeli,
            ongkir: 0,
            bensin: 0,
            bongkar: 0,
            pajakType: 'none',
            pajakValue: 0,
            tglProduksi: po.tanggal,
            tglKadaluarsa: new Date(new Date(po.tanggal).getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            used: 0,
            supplier: po.supplierId,
            warehouse: 'gudang_utama'
        };
        await Storage.addBatch(newBatch);
        po.status = 'diterima';
        await savePOData();
        refreshStats();
        renderPOTable();
        renderPOHistory();
        renderAnalysis();
        if (CFS.Inventory) CFS.Inventory.refreshStockTable();
        if (CFS.Dashboard) CFS.Dashboard.refresh();
        (window.showToast || showToast)('Sukses', 'PO diterima. Batch stok bertambah.', 'success');
    }

    async function cancelPO(id) {
        if (!confirm('Batalkan PO ini?')) return;
        const po = purchaseOrders.find(p => p.id === id);
        if (!po) return;
        po.status = 'batal';
        await savePOData();
        refreshStats();
        renderPOTable();
        renderPOHistory();
        (window.showToast || showToast)('Info', 'PO dibatalkan.', 'info');
    }

    // ---------- RIWAYAT ----------
    function renderPOHistory() {
        if (!elements.poHistoryTableBody) return;
        const suppliers = Storage.getSuppliers();
        if (purchaseOrders.length === 0) {
            elements.poHistoryTableBody.innerHTML = '<tr><td colspan="6" class="text-center p-4 opacity-50">Belum ada PO.</td></tr>';
            return;
        }
        elements.poHistoryTableBody.innerHTML = purchaseOrders
            .slice()
            .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal))
            .map(po => {
                const sup = suppliers.find(s => s.id === po.supplierId);
                return `<tr class="border-t">
                    <td class="p-2">${po.tanggal}</td>
                    <td class="p-2">${sup?.name || '?'}</td>
                    <td class="p-2">${po.produk}</td>
                    <td class="p-2 text-right">${po.qty} kg</td>
                    <td class="p-2 text-right">${formatRupiah(po.total)}</td>
                    <td class="p-2">${po.status}</td>
                </tr>`;
            }).join('');
    }

    // ---------- ANALISIS ----------
    function renderAnalysis() {
        if (!elements.poAnalysisSupplierTable) return;
        const supplierMap = {};
        purchaseOrders.filter(po => po.status === 'diterima').forEach(po => {
            if (!supplierMap[po.supplierId]) supplierMap[po.supplierId] = { qty: 0, value: 0 };
            supplierMap[po.supplierId].qty += po.qty;
            supplierMap[po.supplierId].value += po.total;
        });
        const sups = Storage.getSuppliers();
        const entries = Object.entries(supplierMap).sort((a, b) => b[1].value - a[1].value);
        elements.poAnalysisSupplierTable.innerHTML = entries.length === 0
            ? '<tr><td colspan="3" class="text-center p-4 opacity-50">-</td></tr>'
            : entries.map(([id, data]) => {
                const sup = sups.find(s => s.id === id);
                return `<tr class="border-t"><td class="p-2">${sup?.name || '?'}</td><td class="p-2 text-right">${data.qty} kg</td><td class="p-2 text-right">${formatRupiah(data.value)}</td></tr>`;
            }).join('');

        // Grafik bulanan
        const ctx = elements.chartPurchaseMonthly?.getContext('2d');
        if (!ctx) return;
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        const monthlyData = Array(12).fill(0);
        purchaseOrders.filter(po => po.status === 'diterima').forEach(po => {
            const m = new Date(po.tanggal).getMonth();
            monthlyData[m] += po.total;
        });
        if (monthlyChart) monthlyChart.destroy();
        monthlyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [{ label: 'Pembelian (Rp)', data: monthlyData, backgroundColor: '#2563eb' }]
            },
            options: {
                responsive: true,
                plugins: { tooltip: { callbacks: { label: (ctx) => formatRupiah(ctx.raw) } } },
                scales: { y: { ticks: { callback: val => formatRupiah(val) } } }
            }
        });
    }

    // ---------- EKSPOR ----------
    function exportCSV() {
        const rows = [['Tanggal', 'Supplier', 'Produk', 'Qty', 'Total', 'Status']];
        const sups = Storage.getSuppliers();
        purchaseOrders.forEach(po => {
            const sup = sups.find(s => s.id === po.supplierId);
            rows.push([po.tanggal, sup?.name || '?', po.produk, po.qty, po.total, po.status]);
        });
        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `purchase_orders_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        (window.showToast || showToast)('Sukses', 'CSV diunduh.', 'success');
    }

    // ---------- EVENT BINDING ----------
    function bindEvents() {
        if (elements.applyPoFilter) {
            elements.applyPoFilter.addEventListener('click', () => {
                renderPOTable({
                    start: elements.poFilterStart?.value,
                    end: elements.poFilterEnd?.value,
                    supplierId: elements.poFilterSupplier?.value,
                    status: elements.poFilterStatus?.value
                });
            });
        }

        if (elements.purchaseForm) {
            elements.purchaseForm.addEventListener('submit', handleCreatePO);
            elements.purchaseForm.dataset.listener = 'true';
        }

        if (elements.exportPoCSV) {
            elements.exportPoCSV.addEventListener('click', exportCSV);
        }
    }

    // ---------- EXPORT API ----------
    CFS.Purchase = {
        init: initPurchaseTab,
        acceptPO: acceptPO,
        cancelPO: cancelPO
    };
})();
