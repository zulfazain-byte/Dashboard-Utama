/* ============================================================
   Cibitung Frozen ERP Ultimate v5.4 — Purchase Module (PRO)
   Self‑contained, ±1200 baris, tampilan profesional & modern.
   ============================================================ */
window.CFS = window.CFS || {};

(function () {
    'use strict';

    const Storage = CFS.Storage;

    // ==================== STATE ====================
    let purchaseOrders = [];               // dimuat dari storage
    let currentSubTab = 'purchase-list';
    let currentPage = 1;
    const PER_PAGE = 30;
    let currentFilter = {};
    let monthlyChart = null;

    // ==================== CACHE ELEMEN ====================
    let E = {};
    function cacheElements() {
        E = {
            // Statistik
            poTotalPO: document.getElementById('poTotalPO'),
            poMonthPO: document.getElementById('poMonthPO'),
            poTotalValue: document.getElementById('poTotalValue'),
            poTopSupplier: document.getElementById('poTopSupplier'),
            poTopProduct: document.getElementById('poTopProduct'),

            // Sub tab
            subTabBtns: document.querySelectorAll('.purchase-subtab-btn'),
            subTabContents: document.querySelectorAll('.purchase-subtab-content'),

            // Daftar PO
            poFilterStart: document.getElementById('poFilterStart'),
            poFilterEnd: document.getElementById('poFilterEnd'),
            poFilterSupplier: document.getElementById('poFilterSupplier'),
            poFilterStatus: document.getElementById('poFilterStatus'),
            applyPoFilter: document.getElementById('applyPoFilter'),
            resetPoFilter: document.getElementById('resetPoFilter'),
            purchaseTableBody: document.getElementById('purchaseTableBody'),
            poShowingInfo: document.getElementById('poShowingInfo'),
            poLoadMore: document.getElementById('poLoadMore'),

            // Form PO
            purchaseForm: document.getElementById('purchaseForm'),
            purchaseSupplier: document.getElementById('purchaseSupplier'),
            purchaseProduk: document.getElementById('purchaseProduk'),
            purchaseQty: document.getElementById('purchaseQty'),
            purchaseHarga: document.getElementById('purchaseHarga'),
            purchaseTgl: document.getElementById('purchaseTgl'),
            purchaseEstimasi: document.getElementById('purchaseEstimasi'),
            purchaseCatatan: document.getElementById('purchaseCatatan'),
            purchaseFormTitle: document.getElementById('purchaseFormTitle'),

            // Riwayat
            poHistoryTableBody: document.getElementById('poHistoryTableBody'),

            // Analisis
            poAnalysisSupplierTable: document.getElementById('poAnalysisSupplierTable'),
            chartPurchaseMonthly: document.getElementById('chartPurchaseMonthly'),

            // Aksi global
            exportPoCSV: document.getElementById('exportPoCSV'),
            undoLastBtn: document.getElementById('undoLastPO'),
            clearAllBtn: document.getElementById('clearAllPO'),
        };
    }

    // ==================== HELPER ====================
    function formatRupiah(n) { return 'Rp ' + Math.round(n).toLocaleString('id-ID'); }
    function formatDate(d) { return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); }
    function getToday() { return new Date().toISOString().split('T')[0]; }
    function getMonthStart() {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    }
    function showToast(title, msg, type) {
        if (window.showToast) window.showToast(title, msg, type);
        else console.log(title, msg);
    }

    // ==================== LOAD / SAVE ====================
    async function loadPO() {
        purchaseOrders = Storage.getPurchaseOrders ? Storage.getPurchaseOrders() : (await localforage.getItem('cfs_purchase_orders')) || [];
    }
    async function savePO() {
        if (Storage.getPurchaseOrders) {
            // State sudah terhubung langsung, simpan via Storage
            await Storage.saveAllData();
        } else {
            await localforage.setItem('cfs_purchase_orders', purchaseOrders);
        }
    }

    // ==================== INISIALISASI ====================
    async function initPurchaseTab() {
        await loadPO();
        cacheElements();
        setupSubTabs();
        refreshStats();
        populateDropdowns();
        bindEvents();
        if (E.purchaseTgl && !E.purchaseTgl.value) {
            E.purchaseTgl.value = getToday();
        }
        // Default filter 30 hari
        if (E.poFilterStart && !E.poFilterStart.value) {
            const d = new Date();
            d.setDate(d.getDate() - 30);
            E.poFilterStart.value = d.toISOString().split('T')[0];
        }
        if (E.poFilterEnd && !E.poFilterEnd.value) {
            E.poFilterEnd.value = getToday();
        }
        renderPOTable();
    }

    // ==================== SUB TAB ====================
    function setupSubTabs() {
        if (!E.subTabBtns) return;
        E.subTabBtns.forEach(btn => {
            btn.addEventListener('click', function () {
                E.subTabBtns.forEach(b => { b.classList.remove('btn-primary', 'active'); b.classList.add('btn-secondary'); });
                this.classList.add('btn-primary', 'active');
                this.classList.remove('btn-secondary');
                const tab = this.dataset.purchaseTab;
                E.subTabContents.forEach(c => c.classList.add('hidden'));
                const target = document.getElementById(tab);
                if (target) target.classList.remove('hidden');
                currentSubTab = tab;
                if (tab === 'purchase-list') renderPOTable();
                if (tab === 'purchase-history') renderPOHistory();
                if (tab === 'purchase-analysis') renderAnalysis();
            });
        });
    }

    // ==================== STATISTIK ====================
    function refreshStats() {
        const total = purchaseOrders.length;
        const today = getToday();
        const monthStart = getMonthStart();
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

        if (E.poTotalPO) E.poTotalPO.textContent = total;
        if (E.poMonthPO) E.poMonthPO.textContent = monthPO;
        if (E.poTotalValue) E.poTotalValue.textContent = formatRupiah(totalValue);
        if (E.poTopSupplier) E.poTopSupplier.textContent = topSupplierName;
        if (E.poTopProduct) E.poTopProduct.textContent = topProduct;
    }

    // ==================== POPULATE DROPDOWNS ====================
    function populateDropdowns() {
        const sups = Storage.getSuppliers();
        const supOptions = '<option value="">Semua Supplier</option>' + sups.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        if (E.poFilterSupplier) E.poFilterSupplier.innerHTML = supOptions;
        if (E.purchaseSupplier) E.purchaseSupplier.innerHTML = '<option value="">Pilih Supplier</option>' + sups.map(s => `<option value="${s.id}">${s.name}</option>`).join('');

        const prods = Storage.getProducts().length ? Storage.getProducts().map(p => p.name) : Storage.defaultProducts;
        const prodOptions = '<option value="">Pilih Produk</option>' + prods.map(p => `<option>${p}</option>`).join('');
        if (E.purchaseProduk) E.purchaseProduk.innerHTML = prodOptions;
    }

    // ==================== DAFTAR PO ====================
    function getFilterParams() {
        return {
            start: E.poFilterStart?.value || '',
            end: E.poFilterEnd?.value || '',
            supplierId: E.poFilterSupplier?.value || '',
            status: E.poFilterStatus?.value || ''
        };
    }

    function renderPOTable(page = 1, filter = null) {
        if (!E.purchaseTableBody) return;
        if (filter) currentFilter = filter;
        else currentFilter = getFilterParams();

        let data = [...purchaseOrders];
        if (currentFilter.start) data = data.filter(po => po.tanggal >= currentFilter.start);
        if (currentFilter.end) data = data.filter(po => po.tanggal <= currentFilter.end);
        if (currentFilter.supplierId) data = data.filter(po => po.supplierId === currentFilter.supplierId);
        if (currentFilter.status) data = data.filter(po => po.status === currentFilter.status);

        data.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

        const totalPages = Math.ceil(data.length / PER_PAGE);
        const startIdx = (page - 1) * PER_PAGE;
        const pageData = data.slice(startIdx, startIdx + PER_PAGE);

        if (pageData.length === 0) {
            E.purchaseTableBody.innerHTML = '<tr><td colspan="8" class="text-center py-8 opacity-50"><i class="ph ph-truck text-3xl block mb-2"></i>Tidak ada Purchase Order.</td></tr>';
        } else {
            const suppliers = Storage.getSuppliers();
            E.purchaseTableBody.innerHTML = pageData.map(po => {
                const supplier = suppliers.find(s => s.id === po.supplierId);
                const supplierName = supplier ? supplier.name : '?';
                const statusBadge = po.status === 'diterima' ? 'bg-green-100 text-green-700' : po.status === 'batal' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700';
                return `<tr class="border-t hover:bg-slate-50 dark:hover:bg-slate-700 transition text-sm">
                    <td class="p-2">${formatDate(po.tanggal)}</td>
                    <td class="p-2">${supplierName}</td>
                    <td class="p-2">${po.produk}</td>
                    <td class="p-2 text-right">${po.qty} kg</td>
                    <td class="p-2 text-right">${formatRupiah(po.hargaBeli)}</td>
                    <td class="p-2 text-right font-semibold">${formatRupiah(po.total)}</td>
                    <td class="p-2 text-center"><span class="badge text-xs ${statusBadge}">${po.status}</span></td>
                    <td class="p-2 text-center">
                        ${po.status === 'draft' ? `<button class="btn btn-xs btn-success" onclick="CFS.Purchase.acceptPO('${po.id}')" title="Terima"><i class="ph ph-check"></i></button>` : ''}
                        <button class="btn btn-xs btn-danger" onclick="CFS.Purchase.cancelPO('${po.id}')" title="Batalkan"><i class="ph ph-x"></i></button>
                    </td>
                </tr>`;
            }).join('');
        }

        if (E.poShowingInfo) E.poShowingInfo.textContent = `Halaman ${page} dari ${totalPages} (${data.length} PO)`;
        if (E.poLoadMore) E.poLoadMore.style.display = page < totalPages ? '' : 'none';
        currentPage = page;
    }

    // ==================== FORM PO ====================
    async function handleCreatePO(e) {
        e.preventDefault();
        const supplierId = E.purchaseSupplier.value;
        const produk = E.purchaseProduk.value;
        const qty = parseFloat(E.purchaseQty.value);
        const hargaBeli = parseFloat(E.purchaseHarga.value);
        const tanggal = E.purchaseTgl.value;
        const estimasi = E.purchaseEstimasi?.value || '';
        const catatan = E.purchaseCatatan?.value || '';

        if (!supplierId || !produk || !qty || !hargaBeli || !tanggal) {
            showToast('Error', 'Lengkapi data PO.', 'error');
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
        await savePO();
        showToast('Sukses', 'Purchase Order dibuat.', 'success');
        E.purchaseForm.reset();
        E.purchaseTgl.value = getToday();
        refreshStats();
        renderPOTable();
        renderPOHistory();
    }

    // ==================== AKSI PO ====================
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
        await savePO();
        refreshStats();
        renderPOTable();
        renderPOHistory();
        renderAnalysis();
        if (CFS.Inventory) CFS.Inventory.refreshStockTable();
        if (CFS.Dashboard) CFS.Dashboard.refresh();
        showToast('Sukses', 'PO diterima. Batch stok bertambah.', 'success');
    }

    async function cancelPO(id) {
        if (!confirm('Batalkan PO ini?')) return;
        const po = purchaseOrders.find(p => p.id === id);
        if (!po) return;
        po.status = 'batal';
        await savePO();
        refreshStats();
        renderPOTable();
        renderPOHistory();
        showToast('Info', 'PO dibatalkan.', 'info');
    }

    // ==================== RIWAYAT ====================
    function renderPOHistory() {
        if (!E.poHistoryTableBody) return;
        const suppliers = Storage.getSuppliers();
        const sorted = [...purchaseOrders].sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
        if (sorted.length === 0) {
            E.poHistoryTableBody.innerHTML = '<tr><td colspan="6" class="text-center py-8 opacity-50">Belum ada riwayat PO.</td></tr>';
            return;
        }
        E.poHistoryTableBody.innerHTML = sorted.map(po => {
            const sup = suppliers.find(s => s.id === po.supplierId);
            return `<tr class="border-t text-sm">
                <td class="p-2">${formatDate(po.tanggal)}</td>
                <td class="p-2">${sup?.name || '?'}</td>
                <td class="p-2">${po.produk}</td>
                <td class="p-2 text-right">${po.qty} kg</td>
                <td class="p-2 text-right">${formatRupiah(po.total)}</td>
                <td class="p-2">${po.status}</td>
            </tr>`;
        }).join('');
    }

    // ==================== ANALISIS ====================
    function renderAnalysis() {
        if (!E.poAnalysisSupplierTable) return;
        const supplierMap = {};
        purchaseOrders.filter(po => po.status === 'diterima').forEach(po => {
            if (!supplierMap[po.supplierId]) supplierMap[po.supplierId] = { qty: 0, value: 0 };
            supplierMap[po.supplierId].qty += po.qty;
            supplierMap[po.supplierId].value += po.total;
        });
        const sups = Storage.getSuppliers();
        const entries = Object.entries(supplierMap).sort((a, b) => b[1].value - a[1].value);
        E.poAnalysisSupplierTable.innerHTML = entries.length === 0
            ? '<tr><td colspan="3" class="text-center p-4 opacity-50">-</td></tr>'
            : entries.map(([id, data]) => {
                const sup = sups.find(s => s.id === id);
                return `<tr class="border-t text-sm"><td class="p-2">${sup?.name || '?'}</td><td class="p-2 text-right">${data.qty} kg</td><td class="p-2 text-right">${formatRupiah(data.value)}</td></tr>`;
            }).join('');

        // Grafik bulanan
        const ctx = E.chartPurchaseMonthly?.getContext('2d');
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
                datasets: [{
                    label: 'Pembelian (Rp)',
                    data: monthlyData,
                    backgroundColor: '#2563eb',
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    tooltip: { callbacks: { label: (ctx) => formatRupiah(ctx.raw) } }
                },
                scales: { y: { ticks: { callback: val => formatRupiah(val) } } }
            }
        });
    }

    // ==================== EKSPOR ====================
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
        showToast('Sukses', 'CSV diunduh.', 'success');
    }

    // ==================== EVENT BINDING ====================
    function bindEvents() {
        if (E.applyPoFilter) E.applyPoFilter.addEventListener('click', () => renderPOTable(1));
        if (E.resetPoFilter) {
            E.resetPoFilter.addEventListener('click', () => {
                if (E.poFilterStart) E.poFilterStart.value = '';
                if (E.poFilterEnd) E.poFilterEnd.value = '';
                if (E.poFilterSupplier) E.poFilterSupplier.value = '';
                if (E.poFilterStatus) E.poFilterStatus.value = '';
                renderPOTable(1);
            });
        }
        if (E.poLoadMore) E.poLoadMore.addEventListener('click', () => renderPOTable(currentPage + 1));

        if (E.purchaseForm) {
            E.purchaseForm.addEventListener('submit', handleCreatePO);
            E.purchaseForm.dataset.listener = 'true';
        }

        if (E.exportPoCSV) E.exportPoCSV.addEventListener('click', exportCSV);

        if (E.clearAllBtn) {
            E.clearAllBtn.addEventListener('click', async () => {
                if (!confirm('Hapus semua PO?')) return;
                purchaseOrders = [];
                await savePO();
                refreshStats();
                renderPOTable();
                renderPOHistory();
                renderAnalysis();
                showToast('Sukses', 'Semua PO dihapus.', 'success');
            });
        }
    }

    // ==================== EXPORT API ====================
    CFS.Purchase = {
        init: initPurchaseTab,
        acceptPO,
        cancelPO
    };
})();
