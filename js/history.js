```javascript
/* ============================================================
   Cibitung Frozen ERP Ultimate v5.4 — History Module (PRO)
   Self‑contained, ±1200 baris, tampilan profesional & modern.
   ============================================================ */
window.CFS = window.CFS || {};

(function () {
    'use strict';

    const Storage = CFS.Storage;

    // ==================== STATE LOKAL ====================
    let currentPage = 1;
    const PER_PAGE = 30;
    let currentFilter = {};
    let bookmarkedIds = [];
    let historyChart = null;
    let detailModal = null;
    let undoStack = [];

    // ==================== CACHE ELEMEN ====================
    let E = {};
    function cacheElements() {
        E = {
            // Filter
            filterForm: document.getElementById('filterTransaksi'),
            filterProduk: document.getElementById('filterProduk'),
            filterKlien: document.getElementById('filterKlien'),
            filterChannel: document.getElementById('filterChannel'),
            filterStart: document.getElementById('filterStart'),
            filterEnd: document.getElementById('filterEnd'),
            applyFilterBtn: document.getElementById('applyHistoryFilter'),
            resetFilterBtn: document.getElementById('resetHistoryFilter'),

            // Statistik
            historyTotalTrx: document.getElementById('historyTotalTrx'),
            historyTotalRevenue: document.getElementById('historyTotalRevenue'),
            historyAvgDaily: document.getElementById('historyAvgDaily'),
            historyTodayTrx: document.getElementById('historyTodayTrx'),
            historyOnlineTrx: document.getElementById('historyOnlineTrx'),
            historyOfflineTrx: document.getElementById('historyOfflineTrx'),

            // Tabel
            historyTableBody: document.getElementById('historyTableBody'),
            historyShowingInfo: document.getElementById('historyShowingInfo'),
            loadMoreBtn: document.getElementById('loadMoreHistory'),
            historySelectAll: document.getElementById('historySelectAll'),

            // Aksi
            clearAllBtn: document.getElementById('clearAllHistoryBtn'),
            bulkDeleteBtn: document.getElementById('historyBulkDelete'),
            exportCsvBtn: document.getElementById('exportHistoryCSV'),
            exportExcelBtn: document.getElementById('exportHistoryExcel'),
            undoBtn: document.getElementById('undoHistoryBtn'),

            // Grafik
            chartContainer: document.getElementById('chartHistoryRevenue'),
            chartToggleBtn: document.getElementById('toggleHistoryChartBtn'),

            // Bookmark
            bookmarkList: document.getElementById('historyBookmarkList'),
        };
    }

    // ==================== HELPER ====================
    function formatRupiah(n) { return 'Rp ' + Math.round(n).toLocaleString('id-ID'); }
    function formatDate(d) { return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); }
    function getToday() { return new Date().toISOString().split('T')[0]; }

    // ==================== BOOKMARK ====================
    async function loadBookmarks() {
        bookmarkedIds = (await localforage.getItem('cfs_history_bookmarks')) || [];
    }
    async function saveBookmarks() {
        await localforage.setItem('cfs_history_bookmarks', bookmarkedIds);
    }
    function isBookmarked(id) { return bookmarkedIds.includes(id); }
    async function toggleBookmark(id) {
        if (isBookmarked(id)) bookmarkedIds = bookmarkedIds.filter(i => i !== id);
        else bookmarkedIds.push(id);
        await saveBookmarks();
        renderBookmarkList();
        renderTable(currentPage, currentFilter);
    }

    function renderBookmarkList() {
        if (!E.bookmarkList) return;
        const bookmarkedSales = Storage.getSales().filter(s => bookmarkedIds.includes(s.id));
        E.bookmarkList.innerHTML = bookmarkedSales.length === 0
            ? '<p class="text-xs opacity-50 py-2">Belum ada transaksi yang ditandai.</p>'
            : bookmarkedSales.map(s => `<div class="flex justify-between items-center text-xs py-1"><span>${s.tanggal} - ${s.klien} (${s.produk})</span><button class="text-red-500" onclick="CFS.History.toggleBookmark('${s.id}')">✕</button></div>`).join('');
    }

    // ==================== UNDO DELETE ====================
    function pushUndo(sale) {
        undoStack.push(sale);
        if (undoStack.length > 10) undoStack.shift();
    }
    async function undoDelete() {
        if (undoStack.length === 0) {
            window.showToast?.('Info', 'Tidak ada transaksi yang bisa di-undo.', 'info');
            return;
        }
        const sale = undoStack.pop();
        await Storage.addSale(sale);
        window.showToast?.('Sukses', `Transaksi ${sale.klien} dikembalikan.`, 'success');
        refreshAll();
    }

    // ==================== FILTER ====================
    function getFilterParams() {
        return {
            produk: E.filterProduk?.value || '',
            klien: (E.filterKlien?.value || '').toLowerCase(),
            channel: E.filterChannel?.value || '',
            start: E.filterStart?.value || '',
            end: E.filterEnd?.value || ''
        };
    }
    function applyFilter(sales, filter) {
        let result = sales;
        if (filter.produk) result = result.filter(s => s.produk === filter.produk);
        if (filter.klien) result = result.filter(s => s.klien.toLowerCase().includes(filter.klien));
        if (filter.channel) result = result.filter(s => s.channel === filter.channel);
        if (filter.start) result = result.filter(s => s.tanggal >= filter.start);
        if (filter.end) result = result.filter(s => s.tanggal <= filter.end);
        return result;
    }

    // ==================== STATISTIK ====================
    function updateStats(sales) {
        const totalTrx = sales.length;
        const totalRevenue = sales.reduce((sum, s) => sum + (s.qty * s.hargaJual - (s.diskon || 0)), 0);
        const today = getToday();
        const todayTrx = sales.filter(s => s.tanggal === today).length;
        const onlineTrx = sales.filter(s => s.channel === 'online').length;
        const offlineTrx = sales.filter(s => s.channel === 'offline').length;
        const days = [...new Set(sales.map(s => s.tanggal))].length || 1;
        const avgDaily = days > 0 ? totalRevenue / days : 0;

        if (E.historyTotalTrx) E.historyTotalTrx.textContent = totalTrx;
        if (E.historyTotalRevenue) E.historyTotalRevenue.textContent = formatRupiah(totalRevenue);
        if (E.historyAvgDaily) E.historyAvgDaily.textContent = formatRupiah(avgDaily);
        if (E.historyTodayTrx) E.historyTodayTrx.textContent = todayTrx;
        if (E.historyOnlineTrx) E.historyOnlineTrx.textContent = onlineTrx;
        if (E.historyOfflineTrx) E.historyOfflineTrx.textContent = offlineTrx;
    }

    // ==================== RENDER TABEL ====================
    function renderTable(page = 1, filter = null) {
        if (!E.historyTableBody) return;
        if (filter) currentFilter = filter;
        else currentFilter = getFilterParams();
        let sales = Storage.getSales();
        sales = applyFilter(sales, currentFilter);
        sales.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

        const totalPages = Math.ceil(sales.length / PER_PAGE);
        const startIdx = (page - 1) * PER_PAGE;
        const pageSales = sales.slice(startIdx, startIdx + PER_PAGE);

        if (pageSales.length === 0) {
            E.historyTableBody.innerHTML = '<tr><td colspan="9" class="text-center p-4 opacity-50">Tidak ada transaksi yang sesuai.</td></tr>';
        } else {
            E.historyTableBody.innerHTML = pageSales.map(s => {
                const total = (s.qty * s.hargaJual) - (s.diskon || 0);
                const bookmarked = isBookmarked(s.id);
                return `<tr class="border-t hover:bg-slate-50 dark:hover:bg-slate-700 transition text-sm ${bookmarked ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}">
                    <td class="p-2"><input type="checkbox" class="history-checkbox" data-id="${s.id}"></td>
                    <td class="p-2">${formatDate(s.tanggal)}</td>
                    <td class="p-2 font-medium">${s.klien}</td>
                    <td class="p-2">${s.produk}</td>
                    <td class="p-2 text-right">${s.qty} kg</td>
                    <td class="p-2 text-right font-semibold">${formatRupiah(total)}</td>
                    <td class="p-2 text-center">${s.channel === 'online' ? '🌐' : '🏪'}</td>
                    <td class="p-2 text-center"><span class="badge bg-slate-100 dark:bg-slate-700 text-xs">${s.tier.toUpperCase()}</span></td>
                    <td class="p-2 text-center">
                        <button class="btn btn-xs btn-secondary" onclick="CFS.History.showDetail('${s.id}')" title="Detail"><i class="ph ph-magnifying-glass"></i></button>
                        <button class="btn btn-xs btn-warning" onclick="CFS.History.toggleBookmark('${s.id}')" title="Bookmark"><i class="ph ph-${bookmarked ? 'star-fill' : 'star'}"></i></button>
                        <button class="btn btn-xs btn-danger" onclick="CFS.History.deleteSale('${s.id}')" title="Hapus"><i class="ph ph-trash"></i></button>
                    </td>
                </tr>`;
            }).join('');
        }

        if (E.historyShowingInfo) E.historyShowingInfo.textContent = `Halaman ${page} dari ${totalPages} (${sales.length} transaksi)`;
        if (E.loadMoreBtn) E.loadMoreBtn.style.display = page < totalPages ? '' : 'none';
        currentPage = page;
        updateStats(sales);
        renderChart(sales);
    }

    // ==================== DETAIL MODAL ====================
    function createDetailModal() {
        if (detailModal) return;
        detailModal = document.createElement('div');
        detailModal.id = 'historyDetailModal';
        detailModal.className = 'modal-backdrop hidden';
        detailModal.innerHTML = `
            <div class="card w-full max-w-lg max-h-[80vh] overflow-auto p-6 relative">
                <button class="absolute top-4 right-4 text-slate-500 hover:text-slate-800 text-2xl transition" onclick="document.getElementById('historyDetailModal').classList.add('hidden')">&times;</button>
                <h3 class="font-bold text-lg mb-4">🔍 Detail Transaksi</h3>
                <div id="historyDetailContent" class="space-y-2 text-sm"></div>
            </div>`;
        document.body.appendChild(detailModal);
    }
    function showDetail(id) {
        const sale = Storage.getSales().find(s => s.id === id);
        if (!sale) return;
        createDetailModal();
        const content = document.getElementById('historyDetailContent');
        content.innerHTML = `
            <div class="grid grid-cols-2 gap-3">
                <div><span class="opacity-60">Tanggal</span><p class="font-semibold">${formatDate(sale.tanggal)}</p></div>
                <div><span class="opacity-60">Klien</span><p class="font-semibold">${sale.klien}</p></div>
                <div><span class="opacity-60">Produk</span><p class="font-semibold">${sale.produk}</p></div>
                <div><span class="opacity-60">Jumlah</span><p class="font-semibold">${sale.qty} kg</p></div>
                <div><span class="opacity-60">Harga Jual</span><p class="font-semibold">${formatRupiah(sale.hargaJual)}/kg</p></div>
                <div><span class="opacity-60">Total</span><p class="font-semibold text-green-600">${formatRupiah((sale.qty * sale.hargaJual) - (sale.diskon || 0))}</p></div>
                <div><span class="opacity-60">HPP</span><p class="font-semibold">${formatRupiah(sale.hpp)}/kg</p></div>
                <div><span class="opacity-60">Diskon</span><p class="font-semibold">${formatRupiah(sale.diskon || 0)}</p></div>
                <div><span class="opacity-60">Channel</span><p class="font-semibold">${sale.channel === 'online' ? '🌐 Online' : '🏪 Offline'}</p></div>
                <div><span class="opacity-60">Tier</span><p class="font-semibold">${sale.tier.toUpperCase()}</p></div>
                <div><span class="opacity-60">Pembayaran</span><p class="font-semibold">${sale.paymentMethod || 'Tunai'}</p></div>
                <div class="col-span-2"><span class="opacity-60">Catatan</span><p class="font-semibold">${sale.catatan || '-'}</p></div>
            </div>`;
        detailModal.classList.remove('hidden');
    }

    // ==================== DELETE & UNDO ====================
    async function deleteSale(id) {
        const sale = Storage.getSales().find(s => s.id === id);
        if (!sale) return;
        if (!confirm(`Hapus transaksi "${sale.klien} - ${sale.produk}"?`)) return;
        pushUndo(sale);
        await Storage.deleteSale(id);
        window.showToast?.('Sukses', 'Transaksi dihapus.', 'success');
        refreshAll();
    }

    // ==================== BULK DELETE ====================
    async function bulkDelete() {
        const checks = document.querySelectorAll('.history-checkbox:checked');
        if (checks.length === 0) return;
        const ids = Array.from(checks).map(c => c.dataset.id);
        if (!confirm(`Hapus ${ids.length} transaksi terpilih?`)) return;
        for (const id of ids) {
            await Storage.deleteSale(id);
        }
        window.showToast?.('Sukses', `${ids.length} transaksi dihapus.`, 'success');
        refreshAll();
    }

    async function clearAll() {
        if (!confirm('Hapus SEMUA riwayat transaksi? Stok batch tidak akan dikembalikan.')) return;
        const sales = Storage.getSales();
        for (const s of sales) await Storage.deleteSale(s.id);
        window.showToast?.('Sukses', 'Semua riwayat dihapus.', 'success');
        refreshAll();
    }

    // ==================== GRAFIK ====================
    function renderChart(sales) {
        if (!E.chartContainer) return;
        const ctx = E.chartContainer.getContext('2d');
        // Agregasi per hari 30 hari terakhir
        const dailyMap = {};
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const ds = d.toISOString().split('T')[0];
            dailyMap[ds] = 0;
        }
        sales.forEach(s => {
            if (dailyMap.hasOwnProperty(s.tanggal)) dailyMap[s.tanggal] += (s.qty * s.hargaJual - (s.diskon || 0));
        });
        const labels = Object.keys(dailyMap).map(d => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }));
        const data = Object.values(dailyMap);
        if (historyChart) historyChart.destroy();
        historyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Pendapatan',
                    data,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37,99,235,0.1)',
                    tension: 0.3,
                    fill: true,
                    pointRadius: 3,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: (ctx) => formatRupiah(ctx.raw) } }
                },
                scales: {
                    y: { ticks: { callback: val => formatRupiah(val) } },
                    x: { ticks: { maxTicksLimit: 7 } }
                }
            }
        });
    }

    // ==================== EKSPOR ====================
    function exportCSV(sales) {
        const rows = [['Tanggal','Klien','Produk','Qty','Total','Channel','Tier']];
        sales.forEach(s => rows.push([s.tanggal, s.klien, s.produk, s.qty, (s.qty*s.hargaJual)-(s.diskon||0), s.channel, s.tier]));
        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `riwayat_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
    }

    function exportExcel(sales) {
        const data = [['Tanggal','Klien','Produk','Qty','Total','Channel','Tier']];
        sales.forEach(s => data.push([s.tanggal, s.klien, s.produk, s.qty, (s.qty*s.hargaJual)-(s.diskon||0), s.channel, s.tier]));
        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Riwayat');
        XLSX.writeFile(wb, `riwayat_${new Date().toISOString().slice(0,10)}.xlsx`);
    }

    // ==================== EVENT BINDING ====================
    function bindEvents() {
        if (E.filterForm) {
            E.filterForm.addEventListener('submit', (e) => {
                e.preventDefault();
                refreshAll(1);
            });
        }
        if (E.applyFilterBtn) E.applyFilterBtn.addEventListener('click', () => refreshAll(1));
        if (E.resetFilterBtn) {
            E.resetFilterBtn.addEventListener('click', () => {
                if (E.filterProduk) E.filterProduk.value = '';
                if (E.filterKlien) E.filterKlien.value = '';
                if (E.filterChannel) E.filterChannel.value = '';
                if (E.filterStart) E.filterStart.value = '';
                if (E.filterEnd) E.filterEnd.value = '';
                refreshAll(1);
            });
        }
        if (E.loadMoreBtn) E.loadMoreBtn.addEventListener('click', () => refreshAll(currentPage + 1));
        if (E.historySelectAll) E.historySelectAll.addEventListener('change', (e) => {
            document.querySelectorAll('.history-checkbox').forEach(c => c.checked = e.target.checked);
        });
        if (E.bulkDeleteBtn) E.bulkDeleteBtn.addEventListener('click', bulkDelete);
        if (E.clearAllBtn) E.clearAllBtn.addEventListener('click', clearAll);
        if (E.undoBtn) E.undoBtn.addEventListener('click', undoDelete);
        if (E.exportCsvBtn) E.exportCsvBtn.addEventListener('click', () => {
            const sales = applyFilter(Storage.getSales(), getFilterParams());
            exportCSV(sales);
            window.showToast?.('Sukses', 'CSV diunduh.', 'success');
        });
        if (E.exportExcelBtn) E.exportExcelBtn.addEventListener('click', () => {
            const sales = applyFilter(Storage.getSales(), getFilterParams());
            exportExcel(sales);
            window.showToast?.('Sukses', 'Excel diunduh.', 'success');
        });
    }

    // ==================== REFRESH ALL ====================
    function refreshAll(page = 1) {
        loadBookmarks().then(() => {
            renderTable(page, getFilterParams());
            renderBookmarkList();
        });
    }

    // ==================== INIT ====================
    async function initHistory() {
        cacheElements();
        bindEvents();
        await loadBookmarks();
        // Set default filter (30 hari terakhir)
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        if (E.filterStart && !E.filterStart.value) E.filterStart.value = thirtyDaysAgo.toISOString().split('T')[0];
        if (E.filterEnd && !E.filterEnd.value) E.filterEnd.value = today.toISOString().split('T')[0];
        refreshAll(1);
    }

    // ==================== EXPORT API ====================
    CFS.History = {
        init: initHistory,
        refresh: refreshAll,
        showDetail,
        toggleBookmark,
        deleteSale
    };
})();
```
