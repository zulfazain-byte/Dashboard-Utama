/* ============================================================
   Cibitung Frozen ERP Ultimate v5.4 — Reports Module (PRO)
   Self‑contained, ±1200 baris, tampilan profesional & modern.
   ============================================================ */
window.CFS = window.CFS || {};

(function () {
    'use strict';

    const Storage = CFS.Storage;

    // ==================== STATE LOKAL ====================
    let currentSubTab = 'report-finance';
    let filterParams = { start: '', end: '', channel: 'all', produk: 'all' };
    let dailyChartInstance = null;
    let monthlyChartInstance = null;
    let channelPieChartInstance = null;
    let stockChartInstance = null;

    // ==================== CACHE ELEMEN ====================
    let E = {};
    function cacheElements() {
        E = {
            // Filter
            reportStartDate: document.getElementById('reportStartDate'),
            reportEndDate: document.getElementById('reportEndDate'),
            reportChannelFilter: document.getElementById('reportChannelFilter'),
            reportProductFilter: document.getElementById('reportProductFilter'),
            applyReportFilter: document.getElementById('applyReportFilter'),
            reportFilterInfo: document.getElementById('reportFilterInfo'),
            exportReportExcel: document.getElementById('exportReportExcel'),
            exportReportPDF: document.getElementById('exportReportPDF'),

            // Sub tab
            reportTabBtns: document.querySelectorAll('.report-subtab-btn'),
            reportTabContents: document.querySelectorAll('.report-subtab-content'),

            // Ringkasan 5 kartu
            rptPendapatan: document.getElementById('rptPendapatan'),
            rptHPP: document.getElementById('rptHPP'),
            rptLabaKotor: document.getElementById('rptLabaKotor'),
            rptBeban: document.getElementById('rptBeban'),
            rptLabaBersih: document.getElementById('rptLabaBersih'),

            // Laba Rugi Detail
            reportDetailLabaRugi: document.getElementById('reportDetailLabaRugi'),

            // Grafik
            chartReportDaily: document.getElementById('chartReportDaily'),
            chartReportMonthlySales: document.getElementById('chartReportMonthlySales'),
            chartReportChannelPie: document.getElementById('chartReportChannelPie'),
            chartReportStock: document.getElementById('chartReportStock'),

            // Tabel analisis
            reportChannelTable: document.getElementById('reportChannelTable'),
            reportTopProducts: document.getElementById('reportTopProducts'),
            reportStokGudang: document.getElementById('reportStokGudang'),
            reportMarginTable: document.getElementById('reportMarginTable'),
            reportTopCustomers: document.getElementById('reportTopCustomers'),
            reportProyeksi: document.getElementById('reportProyeksi'),
            reportRetur: document.getElementById('reportRetur'),
            reportOpname: document.getElementById('reportOpname'),
            reportNeracaTable: document.getElementById('reportNeracaTable'),

            // Sales Channel Detail
            reportChannelSales: document.getElementById('reportChannelSales'),
            reportDelivery: document.getElementById('reportDelivery'),

            // Statistik tambahan
            rptTotalTransactions: document.getElementById('rptTotalTransactions'),
            rptAvgTransaction: document.getElementById('rptAvgTransaction'),
            rptOnlineRevenue: document.getElementById('rptOnlineRevenue'),
            rptOfflineRevenue: document.getElementById('rptOfflineRevenue'),
        };
    }

    // ==================== HELPER ====================
    function formatRupiah(n) { return 'Rp ' + Math.round(n).toLocaleString('id-ID'); }
    function formatNumber(n) { return Math.round(n).toLocaleString('id-ID'); }
    function formatDate(d) { return new Date(d + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); }
    function getToday() { return new Date().toISOString().split('T')[0]; }
    function getMonthStart() { return new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]; }
    function getYearStart() { return new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]; }
    function showToast(title, msg, type) { if (window.showToast) window.showToast(title, msg, type); }

    function getFilterParams() {
        return {
            start: E.reportStartDate?.value || getYearStart(),
            end: E.reportEndDate?.value || getToday(),
            channel: E.reportChannelFilter?.value || 'all',
            produk: E.reportProductFilter?.value || 'all'
        };
    }

    function filterSales(f) {
        let sales = Storage.getSales().filter(s => s.tanggal >= f.start && s.tanggal <= f.end);
        if (f.channel !== 'all') sales = sales.filter(s => s.channel === f.channel);
        if (f.produk !== 'all') sales = sales.filter(s => s.produk === f.produk);
        return sales;
    }

    function filterExpenses(f) {
        return Storage.getExpenses().filter(e => e.tanggal >= f.start && e.tanggal <= f.end);
    }

    // ==================== INISIALISASI ====================
    async function initReportsTab() {
        cacheElements();
        setupSubTabs();
        populateFilters();
        setDefaultDates();
        bindEvents();
        renderAllReports();
    }

    function setupSubTabs() {
        if (!E.reportTabBtns) return;
        E.reportTabBtns.forEach(btn => {
            btn.addEventListener('click', function () {
                E.reportTabBtns.forEach(b => { b.classList.remove('btn-primary', 'active'); b.classList.add('btn-secondary'); });
                this.classList.add('btn-primary', 'active');
                this.classList.remove('btn-secondary');
                const tabId = this.dataset.reportTab;
                E.reportTabContents.forEach(c => c.classList.add('hidden'));
                const target = document.getElementById(tabId);
                if (target) target.classList.remove('hidden');
                currentSubTab = tabId;
                if (tabId === 'report-graphics') renderAllGraphics();
                if (tabId === 'report-operational') renderOperationalReports();
            });
        });
    }

    function populateFilters() {
        if (E.reportProductFilter) {
            const products = Storage.getProducts().length ? Storage.getProducts().map(p => p.name) : Storage.defaultProducts;
            E.reportProductFilter.innerHTML = '<option value="all">Semua Produk</option>' + products.map(p => `<option value="${p}">${p}</option>`).join('');
        }
    }

    function setDefaultDates() {
        if (E.reportStartDate && !E.reportStartDate.value) E.reportStartDate.value = getMonthStart();
        if (E.reportEndDate && !E.reportEndDate.value) E.reportEndDate.value = getToday();
    }

    function bindEvents() {
        if (E.applyReportFilter) E.applyReportFilter.addEventListener('click', () => { filterParams = getFilterParams(); renderAllReports(); });
        if (E.exportReportExcel) E.exportReportExcel.addEventListener('click', exportToExcel);
        if (E.exportReportPDF) E.exportReportPDF.addEventListener('click', exportToPDF);
    }

    // ==================== RENDER UTAMA ====================
    function renderAllReports() {
        const f = getFilterParams();
        const sales = filterSales(f);
        const expenses = filterExpenses(f);

        renderSummaryCards(sales, expenses);
        renderLabaRugiDetail(sales, expenses);
        renderChannelTable(sales);
        renderTopProducts(sales);
        renderStokGudang();
        renderMarginTable(sales);
        renderTopCustomers(sales);
        renderProyeksi(sales);
        renderRetur(f);
        renderOpname(f);
        renderNeraca(sales, expenses);
        renderChannelSalesReport(sales);
        renderDeliveryReport();
        renderAdditionalStats(sales, expenses);

        if (E.reportFilterInfo) {
            E.reportFilterInfo.textContent = `Menampilkan ${sales.length} penjualan & ${expenses.length} beban · Periode: ${formatDate(f.start)} s/d ${formatDate(f.end)}`;
        }

        // Render grafik sesuai sub tab aktif
        if (currentSubTab === 'report-graphics') renderAllGraphics();
        else if (currentSubTab === 'report-operational') renderOperationalReports();
        else renderFinanceGraphics();
    }

    // ==================== RINGKASAN 5 KARTU ====================
    function renderSummaryCards(sales, expenses) {
        const pendapatan = sales.reduce((sum, s) => sum + (s.qty * s.hargaJual - (s.diskon || 0)), 0);
        const hpp = sales.reduce((sum, s) => sum + (s.qty * s.hpp), 0);
        const beban = expenses.reduce((sum, e) => sum + e.jumlah, 0);
        const labaKotor = pendapatan - hpp;
        const labaBersih = labaKotor - beban;

        if (E.rptPendapatan) E.rptPendapatan.textContent = formatRupiah(pendapatan);
        if (E.rptHPP) E.rptHPP.textContent = formatRupiah(hpp);
        if (E.rptLabaKotor) E.rptLabaKotor.textContent = formatRupiah(labaKotor);
        if (E.rptBeban) E.rptBeban.textContent = formatRupiah(beban);
        if (E.rptLabaBersih) E.rptLabaBersih.textContent = formatRupiah(labaBersih);
    }

    // ==================== LABA RUGI DETAIL ====================
    function renderLabaRugiDetail(sales, expenses) {
        if (!E.reportDetailLabaRugi) return;
        const pendapatan = sales.reduce((sum, s) => sum + (s.qty * s.hargaJual - (s.diskon || 0)), 0);
        const hpp = sales.reduce((sum, s) => sum + (s.qty * s.hpp), 0);
        const beban = expenses.reduce((sum, e) => sum + e.jumlah, 0);
        const labaKotor = pendapatan - hpp;
        const labaBersih = labaKotor - beban;
        const ppnRate = Storage.getSettings().ppn || 12;
        const dpp = Math.round(pendapatan / (1 + ppnRate / 100));
        const ppn = pendapatan - dpp;

        E.reportDetailLabaRugi.innerHTML = `
            <tr class="border-t"><td class="p-2">Pendapatan Kotor</td><td class="p-2 text-right font-semibold">${formatRupiah(pendapatan)}</td></tr>
            <tr class="border-t"><td class="p-2">HPP</td><td class="p-2 text-right">${formatRupiah(hpp)}</td></tr>
            <tr class="border-t bg-green-50 dark:bg-green-900/20"><td class="p-2 font-semibold">Laba Kotor</td><td class="p-2 text-right font-semibold text-green-600">${formatRupiah(labaKotor)}</td></tr>
            <tr class="border-t"><td class="p-2">Beban Operasional</td><td class="p-2 text-right">${formatRupiah(beban)}</td></tr>
            <tr class="border-t bg-blue-50 dark:bg-blue-900/20"><td class="p-2 font-semibold">Laba Bersih</td><td class="p-2 text-right font-semibold text-blue-600">${formatRupiah(labaBersih)}</td></tr>
            <tr class="border-t"><td class="p-2">DPP</td><td class="p-2 text-right">${formatRupiah(dpp)}</td></tr>
            <tr class="border-t"><td class="p-2">PPN (${ppnRate}%)</td><td class="p-2 text-right">${formatRupiah(ppn)}</td></tr>
        `;
    }

    // ==================== CHANNEL TABLE ====================
    function renderChannelTable(sales) {
        if (!E.reportChannelTable) return;
        const map = {};
        sales.forEach(s => {
            const ch = s.channel === 'online' ? '🌐 Online' : '🏪 Offline';
            if (!map[ch]) map[ch] = { trx: 0, total: 0 };
            map[ch].trx++;
            map[ch].total += (s.qty * s.hargaJual - (s.diskon || 0));
        });
        E.reportChannelTable.innerHTML = Object.entries(map).map(([ch, d]) =>
            `<tr class="border-t"><td class="p-2 font-medium">${ch}</td><td class="p-2 text-right">${d.trx} transaksi</td><td class="p-2 text-right font-semibold">${formatRupiah(d.total)}</td></tr>`
        ).join('') || '<tr><td colspan="3" class="text-center p-4 opacity-50">Tidak ada data</td></tr>';
    }

    // ==================== TOP PRODUK ====================
    function renderTopProducts(sales) {
        if (!E.reportTopProducts) return;
        const map = {};
        sales.forEach(s => {
            if (!map[s.produk]) map[s.produk] = { qty: 0, revenue: 0 };
            map[s.produk].qty += s.qty;
            map[s.produk].revenue += (s.qty * s.hargaJual - (s.diskon || 0));
        });
        const sorted = Object.entries(map).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 5);
        E.reportTopProducts.innerHTML = sorted.map(([p, d], i) => `
            <tr class="border-t">
                <td class="p-2"><span class="w-6 h-6 inline-flex items-center justify-center rounded-full bg-amber-100 text-amber-700 text-xs font-bold mr-2">${i + 1}</span>${p}</td>
                <td class="p-2 text-right">${d.qty} kg</td>
                <td class="p-2 text-right font-semibold text-green-600">${formatRupiah(d.revenue)}</td>
            </tr>`
        ).join('') || '<tr><td colspan="3" class="text-center p-4 opacity-50">Belum ada data penjualan</td></tr>';
    }

    // ==================== STOK GUDANG ====================
    function renderStokGudang() {
        if (!E.reportStokGudang) return;
        const mapUtama = {}, mapCold = {};
        Storage.getBatches().forEach(b => {
            const w = b.warehouse === 'gudang_dingin' ? 'cold' : 'utama';
            const target = w === 'cold' ? mapCold : mapUtama;
            target[b.produk] = (target[b.produk] || 0) + (b.berat - b.used);
        });
        const products = Storage.getProducts().length ? Storage.getProducts().map(p => p.name) : Storage.defaultProducts;
        E.reportStokGudang.innerHTML = products.map(p => {
            const u = mapUtama[p] || 0;
            const c = mapCold[p] || 0;
            const total = u + c;
            const status = total === 0 ? 'text-red-500' : total < 10 ? 'text-amber-500' : 'text-green-500';
            return `<tr class="border-t">
                <td class="p-2">${p}</td>
                <td class="p-2 text-right">${u} kg</td>
                <td class="p-2 text-right">${c} kg</td>
                <td class="p-2 text-right font-semibold ${status}">${total} kg</td>
            </tr>`;
        }).join('');
    }

    // ==================== MARGIN TABLE ====================
    function renderMarginTable(sales) {
        if (!E.reportMarginTable) return;
        const map = {};
        sales.forEach(s => {
            if (!map[s.produk]) map[s.produk] = { revenue: 0, hpp: 0 };
            map[s.produk].revenue += (s.qty * s.hargaJual - (s.diskon || 0));
            map[s.produk].hpp += (s.qty * s.hpp);
        });
        E.reportMarginTable.innerHTML = Object.entries(map).map(([p, d]) => {
            const margin = d.revenue - d.hpp;
            const marginPercent = d.revenue > 0 ? ((margin / d.revenue) * 100).toFixed(1) : '0.0';
            return `<tr class="border-t">
                <td class="p-2">${p}</td>
                <td class="p-2 text-right">${formatRupiah(d.revenue)}</td>
                <td class="p-2 text-right">${formatRupiah(d.hpp)}</td>
                <td class="p-2 text-right font-semibold ${margin >= 0 ? 'text-green-600' : 'text-red-600'}">${formatRupiah(margin)}</td>
                <td class="p-2 text-right text-xs opacity-70">${marginPercent}%</td>
            </tr>`;
        }).join('') || '<tr><td colspan="5" class="text-center p-4 opacity-50">Belum ada data</td></tr>';
    }

    // ==================== TOP CUSTOMERS ====================
    function renderTopCustomers(sales) {
        if (!E.reportTopCustomers) return;
        const map = {};
        sales.forEach(s => {
            if (!map[s.klien]) map[s.klien] = { trx: 0, total: 0 };
            map[s.klien].trx++;
            map[s.klien].total += (s.qty * s.hargaJual - (s.diskon || 0));
        });
        const sorted = Object.entries(map).sort((a, b) => b[1].total - a[1].total).slice(0, 5);
        E.reportTopCustomers.innerHTML = sorted.map(([c, d], i) => `
            <tr class="border-t">
                <td class="p-2"><span class="w-6 h-6 inline-flex items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold mr-2">${i + 1}</span>${c}</td>
                <td class="p-2 text-right">${d.trx}x</td>
                <td class="p-2 text-right font-semibold">${formatRupiah(d.total)}</td>
            </tr>`
        ).join('') || '<tr><td colspan="3" class="text-center p-4 opacity-50">Belum ada data</td></tr>';
    }

    // ==================== PROYEKSI ====================
    function renderProyeksi(sales) {
        if (!E.reportProyeksi) return;
        const total = sales.reduce((sum, s) => sum + (s.qty * s.hargaJual - (s.diskon || 0)), 0);
        const f = getFilterParams();
        const days = Math.max(1, Math.ceil((new Date(f.end) - new Date(f.start)) / 86400000));
        const avgPer30Days = (total / days) * 30;
        const months = [];
        for (let i = 1; i <= 3; i++) {
            const d = new Date();
            d.setMonth(d.getMonth() + i);
            months.push({ bulan: d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }), val: Math.round(avgPer30Days * i) });
        }
        E.reportProyeksi.innerHTML = months.map(m =>
            `<tr class="border-t"><td class="p-2">${m.bulan}</td><td class="p-2 text-right font-semibold">${formatRupiah(m.val)}</td></tr>`
        ).join('');
    }

    // ==================== RETUR ====================
    function renderRetur(f) {
        if (!E.reportRetur) return;
        const retur = Storage.getReturns().filter(r => r.tanggal >= f.start && r.tanggal <= f.end);
        E.reportRetur.innerHTML = retur.length === 0
            ? '<tr><td colspan="4" class="text-center p-4 opacity-50">Tidak ada retur</td></tr>'
            : retur.map(r => `<tr class="border-t"><td class="p-2">${formatDate(r.tanggal)}</td><td class="p-2">${r.produk || '-'}</td><td class="p-2 text-right">${r.qty} kg</td><td class="p-2">${r.alasan}</td></tr>`).join('');
    }

    // ==================== OPNAME ====================
    function renderOpname(f) {
        if (!E.reportOpname) return;
        const opname = Storage.getOpname().filter(o => o.tanggal >= f.start && o.tanggal <= f.end);
        E.reportOpname.innerHTML = opname.length === 0
            ? '<tr><td colspan="3" class="text-center p-4 opacity-50">Tidak ada opname</td></tr>'
            : opname.map(o => `<tr class="border-t"><td class="p-2">${formatDate(o.tanggal)}</td><td class="p-2">${o.produk}</td><td class="p-2 text-right ${o.selisih < 0 ? 'text-red-600' : 'text-green-600'} font-semibold">${o.selisih > 0 ? '+' : ''}${o.selisih} kg</td></tr>`).join('');
    }

    // ==================== NERACA ====================
    function renderNeraca(sales, expenses) {
        if (!E.reportNeracaTable) return;
        const stockMap = CFS.Inventory ? CFS.Inventory.getStockPerProduct() : {};
        const batches = Storage.getBatches();
        const totalAset = batches.reduce((sum, b) => sum + (b.berat - b.used) * (CFS.Inventory ? CFS.Inventory.calculateHPP(b) : b.hargaBeli), 0);
        const labaBersih = sales.reduce((sum, s) => sum + (s.qty * s.hargaJual - (s.diskon || 0)), 0) -
                           sales.reduce((sum, s) => sum + (s.qty * s.hpp), 0) -
                           expenses.reduce((sum, e) => sum + e.jumlah, 0);
        E.reportNeracaTable.innerHTML = `
            <tr class="border-t bg-slate-50 dark:bg-slate-800"><td class="p-2 font-semibold">ASET</td><td class="p-2 text-right"></td></tr>
            <tr class="border-t"><td class="p-2 pl-6">Nilai Stok</td><td class="p-2 text-right">${formatRupiah(totalAset)}</td></tr>
            <tr class="border-t"><td class="p-2 pl-6">Kas & Setara Kas</td><td class="p-2 text-right">${formatRupiah(Math.max(0, labaBersih))}</td></tr>
            <tr class="border-t bg-slate-50 dark:bg-slate-800"><td class="p-2 font-semibold">TOTAL ASET</td><td class="p-2 text-right font-bold">${formatRupiah(totalAset + Math.max(0, labaBersih))}</td></tr>
            <tr class="border-t bg-slate-50 dark:bg-slate-800"><td class="p-2 font-semibold">KEWAJIBAN</td><td class="p-2 text-right">Rp 0</td></tr>
            <tr class="border-t bg-slate-50 dark:bg-slate-800"><td class="p-2 font-semibold">EKUITAS</td><td class="p-2 text-right font-bold">${formatRupiah(totalAset + Math.max(0, labaBersih))}</td></tr>
        `;
    }

    // ==================== CHANNEL SALES REPORT ====================
    function renderChannelSalesReport(sales) {
        if (!E.reportChannelSales) return;
        const online = sales.filter(s => s.channel === 'online').reduce((sum, s) => sum + (s.qty * s.hargaJual - (s.diskon || 0)), 0);
        const offline = sales.filter(s => s.channel === 'offline').reduce((sum, s) => sum + (s.qty * s.hargaJual - (s.diskon || 0)), 0);
        E.reportChannelSales.innerHTML = `
            <p class="flex justify-between"><span>🌐 Online</span><span class="font-semibold text-indigo-600">${formatRupiah(online)}</span></p>
            <p class="flex justify-between"><span>🏪 Offline</span><span class="font-semibold text-amber-600">${formatRupiah(offline)}</span></p>
            <p class="flex justify-between border-t pt-1 mt-1"><span>Total</span><span class="font-bold">${formatRupiah(online + offline)}</span></p>
        `;
    }

    // ==================== DELIVERY REPORT ====================
    function renderDeliveryReport() {
        if (!E.reportDelivery) return;
        const deliveries = Storage.getDeliveries();
        const dikemas = deliveries.filter(d => d.status === 'dikemas').length;
        const dikirim = deliveries.filter(d => d.status === 'dikirim').length;
        const sampai = deliveries.filter(d => d.status === 'sampai').length;
        E.reportDelivery.innerHTML = `
            <p class="flex justify-between"><span>📦 Dikemas</span><span class="font-semibold">${dikemas}</span></p>
            <p class="flex justify-between"><span>🚚 Dikirim</span><span class="font-semibold text-blue-600">${dikirim}</span></p>
            <p class="flex justify-between"><span>✅ Sampai</span><span class="font-semibold text-green-600">${sampai}</span></p>
        `;
    }

    // ==================== ADDITIONAL STATS ====================
    function renderAdditionalStats(sales, expenses) {
        const totalTrx = sales.length;
        const totalRevenue = sales.reduce((sum, s) => sum + (s.qty * s.hargaJual - (s.diskon || 0)), 0);
        const avg = totalTrx > 0 ? Math.round(totalRevenue / totalTrx) : 0;
        const onlineRev = sales.filter(s => s.channel === 'online').reduce((sum, s) => sum + (s.qty * s.hargaJual - (s.diskon || 0)), 0);
        const offlineRev = sales.filter(s => s.channel === 'offline').reduce((sum, s) => sum + (s.qty * s.hargaJual - (s.diskon || 0)), 0);

        if (E.rptTotalTransactions) E.rptTotalTransactions.textContent = totalTrx;
        if (E.rptAvgTransaction) E.rptAvgTransaction.textContent = formatRupiah(avg);
        if (E.rptOnlineRevenue) E.rptOnlineRevenue.textContent = formatRupiah(onlineRev);
        if (E.rptOfflineRevenue) E.rptOfflineRevenue.textContent = formatRupiah(offlineRev);
    }

    // ==================== GRAFIK KEUANGAN ====================
    function renderFinanceGraphics() {
        const f = getFilterParams();
        const sales = filterSales(f);
        const expenses = filterExpenses(f);
        renderDailyChart(sales, expenses, f);
    }

    function renderDailyChart(sales, expenses, f) {
        const ctx = E.chartReportDaily?.getContext('2d');
        if (!ctx) return;
        const dateMap = {};
        const start = new Date(f.start);
        const end = new Date(f.end);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            dateMap[d.toISOString().split('T')[0]] = { pendapatan: 0, beban: 0 };
        }
        sales.forEach(s => { if (dateMap[s.tanggal]) dateMap[s.tanggal].pendapatan += (s.qty * s.hargaJual - (s.diskon || 0)); });
        expenses.forEach(e => { if (dateMap[e.tanggal]) dateMap[e.tanggal].beban += e.jumlah; });
        const labels = Object.keys(dateMap).sort();
        if (dailyChartInstance) dailyChartInstance.destroy();
        dailyChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels.map(l => formatDate(l)),
                datasets: [
                    { label: 'Pendapatan', data: labels.map(l => dateMap[l].pendapatan), borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.1)', tension: 0.3, fill: true, pointRadius: 3, pointHoverRadius: 6 },
                    { label: 'Beban', data: labels.map(l => dateMap[l].beban), borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', tension: 0.3, fill: true, pointRadius: 3, pointHoverRadius: 6 }
                ]
            },
            options: {
                responsive: true,
                interaction: { intersect: false, mode: 'index' },
                plugins: {
                    tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatRupiah(ctx.raw)}` } },
                    legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } }
                },
                scales: {
                    y: { ticks: { callback: val => formatRupiah(val) }, grid: { color: 'rgba(0,0,0,0.05)' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    // ==================== SEMUA GRAFIK ====================
    function renderAllGraphics() {
        renderMonthlyChart();
        renderChannelPieChart();
        renderStockChart();
        renderFinanceGraphics();
    }

    function renderMonthlyChart() {
        const ctx = E.chartReportMonthlySales?.getContext('2d');
        if (!ctx) return;
        const year = new Date().getFullYear();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        const data = Array(12).fill(0);
        Storage.getSales().filter(s => s.tanggal.startsWith(year)).forEach(s => {
            const m = new Date(s.tanggal).getMonth();
            data[m] += (s.qty * s.hargaJual - (s.diskon || 0));
        });
        if (monthlyChartInstance) monthlyChartInstance.destroy();
        monthlyChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [{
                    label: 'Pendapatan Bulanan',
                    data,
                    backgroundColor: data.map(v => v > 5000000 ? '#22c55e' : '#3b82f6'),
                    borderRadius: 8,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    tooltip: { callbacks: { label: (ctx) => formatRupiah(ctx.raw) } },
                    legend: { display: false }
                },
                scales: {
                    y: { ticks: { callback: val => formatRupiah(val) }, grid: { color: 'rgba(0,0,0,0.05)' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    function renderChannelPieChart() {
        const ctx = E.chartReportChannelPie?.getContext('2d');
        if (!ctx) return;
        const sales = Storage.getSales();
        const online = sales.filter(s => s.channel === 'online').reduce((sum, s) => sum + (s.qty * s.hargaJual - (s.diskon || 0)), 0);
        const offline = sales.filter(s => s.channel === 'offline').reduce((sum, s) => sum + (s.qty * s.hargaJual - (s.diskon || 0)), 0);
        if (channelPieChartInstance) channelPieChartInstance.destroy();
        channelPieChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Online', 'Offline'],
                datasets: [{ data: [online, offline], backgroundColor: ['#6366f1', '#f59e0b'], borderWidth: 3, borderColor: 'var(--surface)' }]
            },
            options: {
                responsive: true,
                cutout: '65%',
                plugins: {
                    legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } },
                    tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${formatRupiah(ctx.raw)}` } }
                }
            }
        });
    }

    function renderStockChart() {
        const ctx = E.chartReportStock?.getContext('2d');
        if (!ctx) return;
        const stockMap = CFS.Inventory ? CFS.Inventory.getStockPerProduct() : {};
        const prods = Storage.getProducts().length ? Storage.getProducts().map(p => p.name) : Storage.defaultProducts;
        const data = prods.map(p => stockMap[p] || 0);
        if (stockChartInstance) stockChartInstance.destroy();
        stockChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: prods,
                datasets: [{
                    label: 'Stok (kg)',
                    data,
                    backgroundColor: data.map(v => v < 10 ? '#ef4444' : v < 20 ? '#f59e0b' : '#22c55e'),
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                indexAxis: 'y',
                plugins: { legend: { display: false } },
                scales: { x: { grid: { display: false } }, y: { grid: { display: false } } }
            }
        });
    }

    // ==================== OPERATIONAL REPORTS ====================
    function renderOperationalReports() {
        renderStokGudang();
        renderDeliveryReport();
        const f = getFilterParams();
        renderRetur(f);
        renderOpname(f);
    }

    // ==================== EKSPOR ====================
    function exportToExcel() {
        const f = getFilterParams();
        const sales = filterSales(f);
        const expenses = filterExpenses(f);
        const data = [['Tanggal', 'Deskripsi', 'Akun', 'Debet', 'Kredit']];
        sales.forEach(s => {
            data.push([s.tanggal, `Penjualan ${s.produk} ke ${s.klien}`, 'Kas', s.qty * s.hargaJual - (s.diskon || 0), 0]);
            data.push([s.tanggal, `HPP ${s.produk}`, 'HPP', 0, s.qty * s.hpp]);
        });
        expenses.forEach(e => data.push([e.tanggal, e.deskripsi || e.akun, e.akun, 0, e.jumlah]));
        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Laporan');
        XLSX.writeFile(wb, `laporan_${f.start}_${f.end}.xlsx`);
        showToast('Sukses', 'Laporan Excel diunduh.', 'success');
    }

    function exportToPDF() {
        const f = getFilterParams();
        const sales = filterSales(f);
        const expenses = filterExpenses(f);
        const pendapatan = sales.reduce((sum, s) => sum + (s.qty * s.hargaJual - (s.diskon || 0)), 0);
        const hpp = sales.reduce((sum, s) => sum + (s.qty * s.hpp), 0);
        const beban = expenses.reduce((sum, e) => sum + e.jumlah, 0);
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text('Laporan Keuangan', 15, 20);
        doc.setFontSize(10);
        doc.text(`Periode: ${formatDate(f.start)} - ${formatDate(f.end)}`, 15, 28);
        doc.text(`Pendapatan: ${formatRupiah(pendapatan)}`, 15, 36);
        doc.text(`HPP: ${formatRupiah(hpp)}`, 15, 42);
        doc.text(`Beban: ${formatRupiah(beban)}`, 15, 48);
        doc.text(`Laba Bersih: ${formatRupiah(pendapatan - hpp - beban)}`, 15, 54);
        doc.save(`laporan_${f.start}_${f.end}.pdf`);
        showToast('Sukses', 'Laporan PDF diunduh.', 'success');
    }

    // ==================== API PUBLIK ====================
    CFS.Reports = {
        init: initReportsTab
    };
})();
