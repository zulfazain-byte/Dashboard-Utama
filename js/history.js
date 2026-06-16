/* ============================================================
   Cibitung Frozen ERP Ultimate v5.4 — History Module (PRO)
   Fixed & Polished – Ekspor, Chart, Bookmark, Edit, Undo.
   ============================================================ */
window.CFS = window.CFS || {};

(function () {
    'use strict';

    const Storage = CFS.Storage;

    // ==================== STATE ====================
    let currentPage = 1;
    const PER_PAGE = 30;
    let currentFilter = {};
    let bookmarkedIds = [];
    let undoStack = [];
    let autoRefreshTimer = null;
    let displayMode = 'table'; // 'table' | 'cards'

    // Chart instances
    let revenueChart = null;
    let productChart = null;
    let customerChart = null;
    let hourlyChart = null;

    // ==================== SEARCHABLE DROPDOWN ====================
    class SearchableDropdown {
        constructor(container, options = [], settings = {}) {
            this.container = container;
            this.options = options;
            this.settings = Object.assign({
                placeholder: 'Pilih...',
                searchPlaceholder: 'Cari...',
                onChange: null
            }, settings);
            this.value = null;
            this.isOpen = false;
            this._buildUI();
            this._bindEvents();
        }

        _buildUI() {
            this.container.classList.add('searchable-dropdown');
            this.container.innerHTML = '';
            this.displayEl = document.createElement('div');
            this.displayEl.className = 'dropdown-display';
            this.displayEl.textContent = this.settings.placeholder;
            this.container.appendChild(this.displayEl);

            this.optionsBox = document.createElement('div');
            this.optionsBox.className = 'dropdown-options';

            this.searchWrap = document.createElement('div');
            this.searchWrap.className = 'dropdown-search';
            this.searchInput = document.createElement('input');
            this.searchInput.type = 'text';
            this.searchInput.placeholder = this.settings.searchPlaceholder;
            this.searchWrap.appendChild(this.searchInput);
            this.optionsBox.appendChild(this.searchWrap);

            this.optionList = document.createElement('div');
            this.optionList.className = 'dropdown-option-list';
            this.optionsBox.appendChild(this.optionList);

            this.container.appendChild(this.optionsBox);
            this._renderOptions(this.options);
        }

        _renderOptions(filteredOptions) {
            const opts = filteredOptions || this.options;
            this.optionList.innerHTML = '';
            if (opts.length === 0) {
                this.optionList.innerHTML = '<div class="dropdown-option text-gray-400">Tidak ada pilihan</div>';
                return;
            }
            opts.forEach(opt => {
                const div = document.createElement('div');
                div.className = 'dropdown-option' + (opt.value === this.value ? ' selected' : '');
                div.dataset.value = opt.value;
                div.textContent = opt.label;
                this.optionList.appendChild(div);
            });
        }

        _bindEvents() {
            this.displayEl.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggle();
            });
            document.addEventListener('click', (e) => {
                if (!this.container.contains(e.target)) this.close();
            });
            this.searchInput.addEventListener('input', () => {
                const term = this.searchInput.value.toLowerCase();
                const filtered = this.options.filter(opt => opt.label.toLowerCase().includes(term));
                this._renderOptions(filtered);
            });
            this.optionList.addEventListener('click', (e) => {
                const optionDiv = e.target.closest('.dropdown-option');
                if (!optionDiv) return;
                this.setValue(optionDiv.dataset.value);
                this.close();
                if (typeof this.settings.onChange === 'function') {
                    this.settings.onChange(this.value, this);
                }
            });
            this.searchInput.addEventListener('click', (e) => e.stopPropagation());
            this.optionsBox.addEventListener('click', (e) => e.stopPropagation());
        }

        toggle() { this.isOpen ? this.close() : this.open(); }
        open() {
            this.optionsBox.style.display = 'block';
            this.isOpen = true;
            this.searchInput.value = '';
            this._renderOptions(this.options);
            setTimeout(() => this.searchInput.focus(), 50);
        }
        close() { this.optionsBox.style.display = 'none'; this.isOpen = false; }
        setValue(value) {
            this.value = value;
            const selected = this.options.find(opt => opt.value === value);
            this.displayEl.textContent = selected ? selected.label : this.settings.placeholder;
        }
        getValue() { return this.value; }
        updateOptions(options) {
            this.options = options;
            if (this.isOpen) this._renderOptions(options);
            if (this.value && !options.find(o => o.value === this.value)) this.setValue(null);
        }
    }

    // ==================== CACHE ELEMEN ====================
    let E = {};
    function cacheElements() {
        E = {
            filterStart: document.getElementById('filterStart'),
            filterEnd: document.getElementById('filterEnd'),
            filterProdukContainer: document.getElementById('filterProdukContainer'),
            filterKlienContainer: document.getElementById('filterKlienContainer'),
            filterChannel: document.getElementById('filterChannel'),
            filterTier: document.getElementById('filterTier'),
            filterPaymentMethod: document.getElementById('filterPaymentMethod'),
            applyFilterBtn: document.getElementById('applyHistoryFilter'),
            resetFilterBtn: document.getElementById('resetHistoryFilter'),

            historyTotalTrx: document.getElementById('historyTotalTrx'),
            historyTotalRevenue: document.getElementById('historyTotalRevenue'),
            historyAvgDaily: document.getElementById('historyAvgDaily'),
            historyTodayTrx: document.getElementById('historyTodayTrx'),
            historyOnlineTrx: document.getElementById('historyOnlineTrx'),
            historyOfflineTrx: document.getElementById('historyOfflineTrx'),

            historyTableBody: document.getElementById('historyTableBody'),
            historyShowingInfo: document.getElementById('historyShowingInfo'),
            loadMoreBtn: document.getElementById('loadMoreHistory'),
            historyPageInput: document.getElementById('historyPageInput'),
            historyGoPageBtn: document.getElementById('historyGoPageBtn'),
            historySelectAll: document.getElementById('historySelectAll'),

            clearAllBtn: document.getElementById('clearAllHistoryBtn'),
            bulkDeleteBtn: document.getElementById('historyBulkDelete'),
            bulkBookmarkBtn: document.getElementById('historyBulkBookmark'),
            exportCsvBtn: document.getElementById('exportHistoryCSV'),
            exportExcelBtn: document.getElementById('exportHistoryExcel'),
            exportPdfBtn: document.getElementById('exportHistoryPDF'),
            exportJsonBtn: document.getElementById('exportHistoryJSON'),
            undoBtn: document.getElementById('undoHistoryBtn'),
            undoListBtn: document.getElementById('undoHistoryListBtn'),
            toggleDisplayBtn: document.getElementById('toggleHistoryDisplay'),

            chartRevenueCanvas: document.getElementById('chartHistoryRevenue'),
            chartProductCanvas: document.getElementById('chartHistoryByProduct'),
            chartCustomerCanvas: document.getElementById('chartHistoryByCustomer'),
            chartHourlyCanvas: document.getElementById('chartHistoryHourly'),

            bookmarkList: document.getElementById('historyBookmarkList'),
            bookmarkToggleBtn: document.getElementById('historyBookmarkToggle'),

            detailModal: document.getElementById('historyDetailModal'),
            detailContent: document.getElementById('historyDetailContent'),
            detailCloseBtn: document.getElementById('historyDetailCloseBtn'),

            editModal: document.getElementById('historyEditModal'),
            editForm: document.getElementById('historyEditForm'),
            editId: document.getElementById('historyEditId'),
            editKlien: document.getElementById('historyEditKlien'),
            editProduk: document.getElementById('historyEditProduk'),
            editQty: document.getElementById('historyEditQty'),
            editHarga: document.getElementById('historyEditHarga'),
            editDiskon: document.getElementById('historyEditDiskon'),
            editChannel: document.getElementById('historyEditChannel'),
            editTier: document.getElementById('historyEditTier'),
            editPayment: document.getElementById('historyEditPayment'),
            editCloseBtn: document.getElementById('historyEditCloseBtn'),

            diffModal: document.getElementById('historyDiffModal'),
            diffContent: document.getElementById('historyDiffContent'),
            diffCloseBtn: document.getElementById('historyDiffCloseBtn'),

            autoRefreshToggle: document.getElementById('autoRefreshHistoryToggle'),
        };
    }

    // ==================== HELPER ====================
    function formatRupiah(n) { return 'Rp ' + Math.round(n).toLocaleString('id-ID'); }
    function formatDate(d) { return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); }
    function formatDateTime(d) { return new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }
    function getToday() { return new Date().toISOString().split('T')[0]; }
    function showToast(title, msg, type) { if (window.showToast) window.showToast(title, msg, type); }

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
        renderTable(currentPage);
    }

    async function bulkBookmark() {
        const checks = document.querySelectorAll('.history-checkbox:checked');
        checks.forEach(c => {
            const id = c.dataset.id;
            if (!bookmarkedIds.includes(id)) bookmarkedIds.push(id);
        });
        await saveBookmarks();
        renderBookmarkList();
        renderTable(currentPage);
        showToast('Sukses', `${checks.length} transaksi ditandai.`, 'success');
    }

    function renderBookmarkList() {
        if (!E.bookmarkList) return;
        const bookmarkedSales = Storage.getSales().filter(s => bookmarkedIds.includes(s.id));
        E.bookmarkList.innerHTML = bookmarkedSales.length === 0
            ? '<p class="text-xs opacity-50 py-2">Belum ada transaksi yang ditandai.</p>'
            : bookmarkedSales.map(s =>
                `<div class="flex justify-between items-center text-xs py-1">
                    <span>${s.tanggal} - ${s.klien} (${s.produk})</span>
                    <button class="text-red-500" onclick="CFS.History.toggleBookmark('${s.id}')">✕</button>
                </div>`
            ).join('');
    }

    // ==================== UNDO ====================
    function pushUndo(sale) {
        undoStack.push(sale);
        if (undoStack.length > 10) undoStack.shift();
    }
    async function undoDelete() {
        if (undoStack.length === 0) {
            showToast('Info', 'Tidak ada transaksi yang bisa di-undo.', 'info');
            return;
        }
        const sale = undoStack.pop();
        await Storage.addSale(sale);
        showToast('Sukses', `Transaksi ${sale.klien} dikembalikan.`, 'success');
        refreshAll();
    }
    function clearUndoStack() {
        undoStack = [];
        showToast('Info', 'Stack undo dibersihkan.', 'info');
    }

    // ==================== FILTER ====================
    function getFilterParams() {
        return {
            produk: E.filterProdukContainer?._dropdown?.getValue() || '',
            klien: E.filterKlienContainer?._dropdown?.getValue() || '',
            channel: E.filterChannel ? E.filterChannel.value : '',
            tier: E.filterTier ? E.filterTier.value : '',
            paymentMethod: E.filterPaymentMethod ? E.filterPaymentMethod.value : '',
            start: E.filterStart ? E.filterStart.value : '',
            end: E.filterEnd ? E.filterEnd.value : ''
        };
    }
    function applyFilter(sales, filter) {
        let result = sales;
        if (filter.produk) result = result.filter(s => s.produk === filter.produk);
        if (filter.klien) result = result.filter(s => s.klien === filter.klien);
        if (filter.channel) result = result.filter(s => s.channel === filter.channel);
        if (filter.tier) result = result.filter(s => s.tier === filter.tier);
        if (filter.paymentMethod) result = result.filter(s => (s.paymentMethod || 'tunai') === filter.paymentMethod);
        if (filter.start) result = result.filter(s => s.tanggal >= filter.start);
        if (filter.end) result = result.filter(s => s.tanggal <= filter.end);
        return result;
    }

    // ==================== STATS ====================
    function updateStats(sales) {
        const totalTrx = sales.length;
        const totalRevenue = sales.reduce((sum, s) => sum + (s.qty * s.hargaJual - (s.diskon || 0)), 0);
        const today = getToday();
        const todayTrx = sales.filter(s => s.tanggal === today).length;
        const onlineTrx = sales.filter(s => s.channel === 'online').length;
        const offlineTrx = sales.filter(s => s.channel === 'offline').length;
        const daysArr = [...new Set(sales.map(s => s.tanggal))];
        const days = daysArr.length || 1;
        const avgDaily = totalRevenue / days;

        if (E.historyTotalTrx) E.historyTotalTrx.textContent = totalTrx;
        if (E.historyTotalRevenue) E.historyTotalRevenue.textContent = formatRupiah(totalRevenue);
        if (E.historyAvgDaily) E.historyAvgDaily.textContent = formatRupiah(avgDaily);
        if (E.historyTodayTrx) E.historyTodayTrx.textContent = todayTrx;
        if (E.historyOnlineTrx) E.historyOnlineTrx.textContent = onlineTrx;
        if (E.historyOfflineTrx) E.historyOfflineTrx.textContent = offlineTrx;
    }

    // ==================== TABLE & CARDS ====================
    function renderTable(page = currentPage) {
        const sales = applyFilter(Storage.getSales(), currentFilter);
        sales.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
        const totalPages = Math.ceil(sales.length / PER_PAGE);
        const startIdx = (page - 1) * PER_PAGE;
        const pageSales = sales.slice(startIdx, startIdx + PER_PAGE);

        // Render table
        if (E.historyTableBody) {
            if (pageSales.length === 0) {
                E.historyTableBody.innerHTML = '<tr><td colspan="9" class="text-center p-4 opacity-50">Tidak ada transaksi.</td></tr>';
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
                            <button class="btn btn-xs btn-info" onclick="CFS.History.editSale('${s.id}')" title="Edit"><i class="ph ph-pencil"></i></button>
                            <button class="btn btn-xs btn-warning" onclick="CFS.History.toggleBookmark('${s.id}')" title="Bookmark"><i class="ph ph-${bookmarked ? 'star-fill' : 'star'}"></i></button>
                            <button class="btn btn-xs btn-danger" onclick="CFS.History.deleteSale('${s.id}')" title="Hapus"><i class="ph ph-trash"></i></button>
                        </td>
                    </tr>`;
                }).join('');
            }
        }

        // Render cards
        const cardsContainer = document.getElementById('historyCardsContainer');
        if (cardsContainer) {
            cardsContainer.innerHTML = pageSales.map(s => {
                const total = (s.qty * s.hargaJual) - (s.diskon || 0);
                return `<div class="card p-3 mb-2 text-sm">
                    <div class="flex justify-between font-medium">
                        <span>${s.klien}</span>
                        <span class="text-green-600">${formatRupiah(total)}</span>
                    </div>
                    <div class="text-xs opacity-70">${s.produk} · ${s.qty}kg · ${s.tier} · ${s.channel==='online'?'🌐':'🏪'}</div>
                    <div class="flex gap-1 mt-1">
                        <button class="btn btn-xs btn-secondary" onclick="CFS.History.showDetail('${s.id}')"><i class="ph ph-eye"></i></button>
                        <button class="btn btn-xs btn-info" onclick="CFS.History.editSale('${s.id}')"><i class="ph ph-pencil"></i></button>
                        <button class="btn btn-xs btn-warning" onclick="CFS.History.toggleBookmark('${s.id}')"><i class="ph ph-star"></i></button>
                        <button class="btn btn-xs btn-danger" onclick="CFS.History.deleteSale('${s.id}')"><i class="ph ph-trash"></i></button>
                    </div>
                </div>`;
            }).join('');
        }

        if (E.historyShowingInfo) E.historyShowingInfo.textContent = `Halaman ${page} dari ${totalPages} (${sales.length} transaksi)`;
        if (E.loadMoreBtn) E.loadMoreBtn.style.display = page < totalPages ? '' : 'none';
        if (E.historyPageInput) {
            E.historyPageInput.max = totalPages;
            E.historyPageInput.value = page;
        }
        currentPage = page;
        updateStats(sales);
        renderCharts(sales);
    }

    // ==================== DETAIL MODAL ====================
    function showDetail(id) {
        const sale = Storage.getSales().find(s => s.id === id);
        if (!sale || !E.detailModal) return;
        const total = (sale.qty * sale.hargaJual) - (sale.diskon || 0);
        const margin = total - sale.qty * sale.hpp;
        E.detailContent.innerHTML = `
            <div class="grid grid-cols-2 gap-3">
                <div><span class="opacity-60">Tanggal</span><p class="font-semibold">${formatDateTime(sale.tanggal)}</p></div>
                <div><span class="opacity-60">Klien</span><p class="font-semibold">${sale.klien}</p></div>
                <div><span class="opacity-60">Produk</span><p class="font-semibold">${sale.produk}</p></div>
                <div><span class="opacity-60">Jumlah</span><p class="font-semibold">${sale.qty} kg</p></div>
                <div><span class="opacity-60">Harga Jual</span><p class="font-semibold">${formatRupiah(sale.hargaJual)}/kg</p></div>
                <div><span class="opacity-60">Total</span><p class="font-semibold text-green-600">${formatRupiah(total)}</p></div>
                <div><span class="opacity-60">HPP</span><p class="font-semibold">${formatRupiah(sale.hpp)}/kg</p></div>
                <div><span class="opacity-60">Diskon</span><p class="font-semibold">${formatRupiah(sale.diskon || 0)}</p></div>
                <div><span class="opacity-60">Channel</span><p class="font-semibold">${sale.channel === 'online' ? '🌐 Online' : '🏪 Offline'}</p></div>
                <div><span class="opacity-60">Tier</span><p class="font-semibold">${sale.tier.toUpperCase()}</p></div>
                <div><span class="opacity-60">Pembayaran</span><p class="font-semibold">${sale.paymentMethod || 'Tunai'}</p></div>
                <div><span class="opacity-60">Batch ID</span><p class="font-semibold">${sale.batchUsed || '-'}</p></div>
                <div class="col-span-2"><span class="opacity-60">Catatan</span><p class="font-semibold">${sale.catatan || '-'}</p></div>
                <div class="col-span-2"><span class="opacity-60">Margin</span><p class="font-semibold ${margin >= 0 ? 'text-green-600' : 'text-red-500'}">${formatRupiah(margin)}</p></div>
            </div>`;
        E.detailModal.classList.remove('hidden');
    }

    // ==================== EDIT SALE ====================
    function editSale(id) {
        const sale = Storage.getSales().find(s => s.id === id);
        if (!sale || !E.editModal) return;
        E.editId.value = sale.id;
        E.editKlien.value = sale.klien;
        E.editProduk.value = sale.produk;
        E.editQty.value = sale.qty;
        E.editHarga.value = sale.hargaJual;
        E.editDiskon.value = sale.diskon || 0;
        E.editChannel.value = sale.channel;
        E.editTier.value = sale.tier;
        E.editPayment.value = sale.paymentMethod || 'tunai';
        E.editModal.classList.remove('hidden');
    }

    async function handleEditSubmit(e) {
        e.preventDefault();
        const id = E.editId.value;
        const sale = Storage.getSales().find(s => s.id === id);
        if (!sale) return;
        sale.klien = E.editKlien.value.trim();
        sale.produk = E.editProduk.value.trim();
        sale.qty = parseFloat(E.editQty.value) || 0;
        sale.hargaJual = parseFloat(E.editHarga.value) || 0;
        sale.diskon = parseFloat(E.editDiskon.value) || 0;
        sale.channel = E.editChannel.value;
        sale.tier = E.editTier.value;
        sale.paymentMethod = E.editPayment.value;
        await Storage.saveAllData();
        showToast('Sukses', 'Transaksi diperbarui.', 'success');
        E.editModal.classList.add('hidden');
        refreshAll();
    }

    // ==================== DELETE ====================
    async function deleteSale(id) {
        const sale = Storage.getSales().find(s => s.id === id);
        if (!sale) return;
        if (!confirm(`Hapus transaksi "${sale.klien} - ${sale.produk}"?`)) return;
        pushUndo(sale);
        await Storage.deleteSale(id);
        showToast('Sukses', 'Transaksi dihapus.', 'success');
        refreshAll();
    }

    async function bulkDelete() {
        const checks = document.querySelectorAll('.history-checkbox:checked');
        if (checks.length === 0) return;
        if (!confirm(`Hapus ${checks.length} transaksi terpilih?`)) return;
        for (const c of checks) {
            const sale = Storage.getSales().find(s => s.id === c.dataset.id);
            if (sale) pushUndo(sale);
            await Storage.deleteSale(c.dataset.id);
        }
        showToast('Sukses', `${checks.length} transaksi dihapus.`, 'success');
        refreshAll();
    }

    async function clearAll() {
        if (!confirm('Hapus SEMUA riwayat transaksi? Stok tidak akan dikembalikan.')) return;
        const sales = Storage.getSales();
        for (const s of sales) {
            await Storage.deleteSale(s.id);
        }
        showToast('Sukses', 'Semua riwayat dihapus.', 'success');
        refreshAll();
    }

    // ==================== CHARTS ====================
    function renderCharts(sales) {
        renderRevenueChart(sales);
        renderProductChart(sales);
        renderCustomerChart(sales);
        renderHourlyChart(sales);
    }

    function renderRevenueChart(sales) {
        if (!E.chartRevenueCanvas) return;
        const ctx = E.chartRevenueCanvas.getContext('2d');
        const dailyMap = {};
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            dailyMap[d.toISOString().split('T')[0]] = 0;
        }
        sales.forEach(s => {
            if (dailyMap.hasOwnProperty(s.tanggal)) dailyMap[s.tanggal] += (s.qty * s.hargaJual - (s.diskon || 0));
        });
        const labels = Object.keys(dailyMap).map(d => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }));
        const data = Object.values(dailyMap);
        if (revenueChart) revenueChart.destroy();
        revenueChart = new Chart(ctx, {
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
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => formatRupiah(ctx.raw) } } },
                scales: { y: { ticks: { callback: val => formatRupiah(val) } }, x: { ticks: { maxTicksLimit: 7 } } }
            }
        });
    }

    function renderProductChart(sales) {
        if (!E.chartProductCanvas) return;
        const ctx = E.chartProductCanvas.getContext('2d');
        const map = {};
        sales.forEach(s => {
            map[s.produk] = (map[s.produk] || 0) + (s.qty * s.hargaJual - (s.diskon || 0));
        });
        const sorted = Object.entries(map).sort((a,b) => b[1] - a[1]).slice(0, 8);
        if (productChart) productChart.destroy();
        if (sorted.length === 0) return;
        productChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sorted.map(([p]) => p),
                datasets: [{ label: 'Pendapatan', data: sorted.map(([,v]) => v), backgroundColor: '#3b82f6' }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => formatRupiah(ctx.raw) } } },
                scales: { y: { ticks: { callback: val => formatRupiah(val) } } }
            }
        });
    }

    function renderCustomerChart(sales) {
        if (!E.chartCustomerCanvas) return;
        const ctx = E.chartCustomerCanvas.getContext('2d');
        const map = {};
        sales.forEach(s => {
            map[s.klien] = (map[s.klien] || 0) + (s.qty * s.hargaJual - (s.diskon || 0));
        });
        const sorted = Object.entries(map).sort((a,b) => b[1] - a[1]).slice(0, 8);
        if (customerChart) customerChart.destroy();
        if (sorted.length === 0) return;
        customerChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sorted.map(([c]) => c),
                datasets: [{ label: 'Pendapatan', data: sorted.map(([,v]) => v), backgroundColor: '#8b5cf6' }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => formatRupiah(ctx.raw) } } },
                scales: { y: { ticks: { callback: val => formatRupiah(val) } } }
            }
        });
    }

    function renderHourlyChart(sales) {
        if (!E.chartHourlyCanvas) return;
        const ctx = E.chartHourlyCanvas.getContext('2d');
        const hourly = new Array(24).fill(0);
        sales.forEach(s => {
            const hour = new Date(s.tanggal).getHours();
            if (!isNaN(hour)) hourly[hour] += (s.qty * s.hargaJual - (s.diskon || 0));
        });
        if (hourlyChart) hourlyChart.destroy();
        hourlyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Array.from({length: 24}, (_, i) => `${i}:00`),
                datasets: [{ label: 'Pendapatan', data: hourly, backgroundColor: '#f59e0b' }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => formatRupiah(ctx.raw) } } },
                scales: { y: { ticks: { callback: val => formatRupiah(val) } } }
            }
        });
    }

    // ==================== EXPORT ====================
    function getFilteredSales() {
        return applyFilter(Storage.getSales(), getFilterParams());
    }

    function exportCSV() {
        const sales = getFilteredSales();
        if (sales.length === 0) {
            showToast('Info', 'Tidak ada data untuk diekspor.', 'info');
            return;
        }
        const rows = [['Tanggal','Klien','Produk','Qty','Total','Channel','Tier','Pembayaran','Diskon','HPP','Margin']];
        sales.forEach(s => {
            const total = s.qty * s.hargaJual - (s.diskon || 0);
            const margin = total - s.qty * s.hpp;
            rows.push([s.tanggal, s.klien, s.produk, s.qty, total, s.channel, s.tier, s.paymentMethod||'tunai', s.diskon||0, s.hpp, margin]);
        });
        const csvContent = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        downloadBlob(csvContent, `riwayat_${getToday()}.csv`, 'text/csv');
        showToast('Sukses', 'CSV diunduh.', 'success');
    }

    function exportExcel() {
        if (typeof XLSX === 'undefined') {
            showToast('Error', 'Library Excel (XLSX) tidak tersedia.', 'error');
            return;
        }
        const sales = getFilteredSales();
        if (sales.length === 0) {
            showToast('Info', 'Tidak ada data untuk diekspor.', 'info');
            return;
        }
        const data = [['Tanggal','Klien','Produk','Qty','Total','Channel','Tier','Pembayaran','Diskon','HPP','Margin']];
        sales.forEach(s => {
            const total = s.qty * s.hargaJual - (s.diskon || 0);
            const margin = total - s.qty * s.hpp;
            data.push([s.tanggal, s.klien, s.produk, s.qty, total, s.channel, s.tier, s.paymentMethod||'tunai', s.diskon||0, s.hpp, margin]);
        });
        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Riwayat');
        XLSX.writeFile(wb, `riwayat_${getToday()}.xlsx`);
        showToast('Sukses', 'Excel diunduh.', 'success');
    }

    function exportPDF() {
        if (typeof window.jspdf === 'undefined') {
            showToast('Error', 'Library PDF (jsPDF) tidak tersedia.', 'error');
            return;
        }
        const sales = getFilteredSales();
        if (sales.length === 0) {
            showToast('Info', 'Tidak ada data untuk diekspor.', 'info');
            return;
        }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text('Riwayat Transaksi', 15, 20);
        doc.setFontSize(10);
        let y = 30;
        sales.slice(0, 100).forEach(s => {
            if (y > 280) { doc.addPage(); y = 20; }
            const total = s.qty * s.hargaJual - (s.diskon || 0);
            doc.text(`${formatDate(s.tanggal)} - ${s.klien} - ${s.produk} - ${formatRupiah(total)}`, 15, y);
            y += 7;
        });
        doc.save(`riwayat_${getToday()}.pdf`);
        showToast('Sukses', 'PDF diunduh.', 'success');
    }

    function exportJSON() {
        const sales = getFilteredSales();
        if (sales.length === 0) {
            showToast('Info', 'Tidak ada data untuk diekspor.', 'info');
            return;
        }
        const blob = new Blob([JSON.stringify(sales, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `riwayat_${getToday()}.json`;
        a.click();
        showToast('Sukses', 'JSON diunduh.', 'success');
    }

    function downloadBlob(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
    }

    // ==================== AUTO REFRESH ====================
    function toggleAutoRefresh() {
        if (autoRefreshTimer) {
            clearInterval(autoRefreshTimer);
            autoRefreshTimer = null;
        } else {
            autoRefreshTimer = setInterval(() => refreshAll(currentPage), 30000);
        }
    }

    // ==================== EVENT BINDING ====================
    function bindEvents() {
        if (E.applyFilterBtn) E.applyFilterBtn.addEventListener('click', () => refreshAll(1));
        if (E.resetFilterBtn) E.resetFilterBtn.addEventListener('click', () => {
            if (E.filterProdukContainer?._dropdown) E.filterProdukContainer._dropdown.setValue('');
            if (E.filterKlienContainer?._dropdown) E.filterKlienContainer._dropdown.setValue('');
            if (E.filterChannel) E.filterChannel.value = '';
            if (E.filterTier) E.filterTier.value = '';
            if (E.filterPaymentMethod) E.filterPaymentMethod.value = '';
            if (E.filterStart) E.filterStart.value = '';
            if (E.filterEnd) E.filterEnd.value = '';
            refreshAll(1);
        });

        if (E.loadMoreBtn) E.loadMoreBtn.addEventListener('click', () => refreshAll(currentPage + 1));
        if (E.historyGoPageBtn && E.historyPageInput) {
            E.historyGoPageBtn.addEventListener('click', () => {
                const page = parseInt(E.historyPageInput.value);
                const sales = applyFilter(Storage.getSales(), getFilterParams());
                const totalPages = Math.ceil(sales.length / PER_PAGE);
                if (page >= 1 && page <= totalPages) refreshAll(page);
            });
        }

        if (E.historySelectAll) E.historySelectAll.addEventListener('change', (e) => {
            document.querySelectorAll('.history-checkbox').forEach(c => c.checked = e.target.checked);
        });

        if (E.bulkDeleteBtn) E.bulkDeleteBtn.addEventListener('click', bulkDelete);
        if (E.bulkBookmarkBtn) E.bulkBookmarkBtn.addEventListener('click', bulkBookmark);
        if (E.clearAllBtn) E.clearAllBtn.addEventListener('click', clearAll);
        if (E.undoBtn) E.undoBtn.addEventListener('click', undoDelete);
        if (E.undoListBtn) E.undoListBtn.addEventListener('click', clearUndoStack);

        if (E.exportCsvBtn) E.exportCsvBtn.addEventListener('click', exportCSV);
        if (E.exportExcelBtn) E.exportExcelBtn.addEventListener('click', exportExcel);
        if (E.exportPdfBtn) E.exportPdfBtn.addEventListener('click', exportPDF);
        if (E.exportJsonBtn) E.exportJsonBtn.addEventListener('click', exportJSON);

        if (E.toggleDisplayBtn) E.toggleDisplayBtn.addEventListener('click', () => {
            displayMode = displayMode === 'table' ? 'cards' : 'table';
            const table = document.getElementById('historyTableContainer');
            const cards = document.getElementById('historyCardsContainer');
            if (table && cards) {
                table.style.display = displayMode === 'table' ? '' : 'none';
                cards.style.display = displayMode === 'cards' ? '' : 'none';
            }
        });

        if (E.editForm) E.editForm.addEventListener('submit', handleEditSubmit);
        if (E.editCloseBtn) E.editCloseBtn.addEventListener('click', () => E.editModal.classList.add('hidden'));
        if (E.detailCloseBtn) E.detailCloseBtn.addEventListener('click', () => E.detailModal.classList.add('hidden'));
        if (E.diffCloseBtn) E.diffCloseBtn.addEventListener('click', () => E.diffModal.classList.add('hidden'));

        if (E.autoRefreshToggle) E.autoRefreshToggle.addEventListener('click', toggleAutoRefresh);
    }

    // ==================== INIT ====================
    async function initHistory() {
        cacheElements();
        await loadBookmarks();
        bindEvents();

        if (E.filterProdukContainer) {
            const products = Storage.getProducts().length ? Storage.getProducts().map(p => p.name) : Storage.defaultProducts;
            new SearchableDropdown(E.filterProdukContainer, [{value:'',label:'Semua Produk'},...products.map(p => ({value:p,label:p}))], { placeholder: 'Pilih Produk' });
        }
        if (E.filterKlienContainer) {
            const customers = Object.keys(Storage.getCustomers()).sort();
            new SearchableDropdown(E.filterKlienContainer, [{value:'',label:'Semua Pelanggan'},...customers.map(c => ({value:c,label:c}))], { placeholder: 'Pilih Pelanggan' });
        }

        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        if (E.filterStart && !E.filterStart.value) E.filterStart.value = thirtyDaysAgo.toISOString().split('T')[0];
        if (E.filterEnd && !E.filterEnd.value) E.filterEnd.value = today.toISOString().split('T')[0];

        refreshAll(1);
        renderBookmarkList();
    }

    function refreshAll(page = currentPage) {
        currentFilter = getFilterParams();
        renderTable(page);
        renderBookmarkList();
    }

    // ==================== EXPORT API ====================
    CFS.History = {
        init: initHistory,
        refresh: refreshAll,
        showDetail,
        toggleBookmark,
        deleteSale,
        editSale,
        bulkBookmark,
        undoDelete,
    };
})();
