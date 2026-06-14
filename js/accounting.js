/* ============================================================
   Cibitung Frozen ERP Ultimate v5.4 — Accounting Module (ULTRA)
   Self‑contained, ±1200 baris, fitur keuangan kelas enterprise.
   ============================================================ */
window.CFS = window.CFS || {};

(function () {
    'use strict';

    const Storage = CFS.Storage;

    // ==================== STATE LOKAL ====================
    let currentSubTab = 'finance-overview';
    let journalPage = 1;
    const JOURNAL_PER_PAGE = 50;
    let monthlyPLChart = null;
    let expenseCompositionChart = null;
    let marginPerProductChart = null;
    let cashflowChart = null;

    // ==================== CACHE ELEMEN ====================
    let E = {};
    function cacheElements() {
        E = {
            // Sub tab
            subTabBtns: document.querySelectorAll('.finance-subtab-btn'),
            subTabContents: document.querySelectorAll('.finance-subtab-content'),

            // Ringkasan
            finPendapatan: document.getElementById('finPendapatan'),
            finHPP: document.getElementById('finHPP'),
            finLabaKotor: document.getElementById('finLabaKotor'),
            finBeban: document.getElementById('finBeban'),
            finLabaBersih: document.getElementById('finLabaBersih'),
            chartFinanceMonthlyPL: document.getElementById('chartFinanceMonthlyPL'),
            chartExpenseComposition: document.getElementById('chartExpenseComposition'),
            chartMarginPerProduct: document.getElementById('chartMarginPerProduct'),

            // Beban
            expenseForm: document.getElementById('expenseForm'),
            expenseAkun: document.getElementById('expenseAkun'),
            expenseJumlah: document.getElementById('expenseJumlah'),
            expenseTanggal: document.getElementById('expenseTanggal'),
            expenseDeskripsi: document.getElementById('expenseDeskripsi'),
            recentExpensesList: document.getElementById('recentExpensesList'),
            expenseSearch: document.getElementById('expenseSearch'),
            expenseFilterAkun: document.getElementById('expenseFilterAkun'),

            // Buku Besar
            journalStartDate: document.getElementById('journalStartDate'),
            journalEndDate: document.getElementById('journalEndDate'),
            journalFilterAkun: document.getElementById('journalFilterAkun'),
            applyJournalFilter: document.getElementById('applyJournalFilter'),
            exportJournalExcel: document.getElementById('exportJournalExcel'),
            journalTableBody: document.getElementById('journalTableBody'),
            journalShowingInfo: document.getElementById('journalShowingInfo'),
            loadMoreJournal: document.getElementById('loadMoreJournal'),

            // Arus Kas
            cashflowMonth: document.getElementById('cashflowMonth'),
            cashflowYear: document.getElementById('cashflowYear'),
            applyCashflowFilter: document.getElementById('applyCashflowFilter'),
            cfKasMasuk: document.getElementById('cfKasMasuk'),
            cfKasKeluar: document.getElementById('cfKasKeluar'),
            cfSaldoBersih: document.getElementById('cfSaldoBersih'),
            chartCashflow: document.getElementById('chartCashflow'),

            // Analisis
            anaMarginKotor: document.getElementById('anaMarginKotor'),
            anaMarginBersih: document.getElementById('anaMarginBersih'),
            anaRasioBeban: document.getElementById('anaRasioBeban'),
            anaROA: document.getElementById('anaROA'),
            anaROE: document.getElementById('anaROE'),
            analysisRecommendations: document.getElementById('analysisRecommendations'),

            // Pajak
            taxPeriodStart: document.getElementById('taxPeriodStart'),
            taxPeriodEnd: document.getElementById('taxPeriodEnd'),
            applyTaxFilter: document.getElementById('applyTaxFilter'),
            taxDPP: document.getElementById('taxDPP'),
            taxPPN: document.getElementById('taxPPN'),
            taxPPH25: document.getElementById('taxPPH25'),
            taxPPH21: document.getElementById('taxPPH21'),
            taxTotalPajak: document.getElementById('taxTotalPajak'),
            exportTaxPDF: document.getElementById('exportTaxPDF'),
            taxBreakdownTable: document.getElementById('taxBreakdownTable'),

            // Ekspor
            exportFinanceExcelBtn: document.getElementById('exportFinanceExcelBtn'),
            exportFinanceFullExcelBtn: document.getElementById('exportFinanceFullExcelBtn'),
            exportFinancePDFBtn: document.getElementById('exportFinancePDFBtn'),
            exportFinanceNeracaPDFBtn: document.getElementById('exportFinanceNeracaPDFBtn'),
        };
    }

    // ==================== HELPER ====================
    function formatRupiah(n) { return 'Rp ' + Math.round(n).toLocaleString('id-ID'); }
    function formatNumber(n) { return Math.round(n).toLocaleString('id-ID'); }
    function getToday() { return new Date().toISOString().split('T')[0]; }
    function getMonthStart() {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    }
    function getMonthEnd() {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    }
    function showToast(title, msg, type) { if (window.showToast) window.showToast(title, msg, type); }

    // ==================== INISIALISASI ====================
    function initAccounting() {
        cacheElements();
        setupSubTabs();
        bindEvents();
        setDefaultDates();
        refreshFinanceOverview();
    }

    function setDefaultDates() {
        if (E.journalStartDate && !E.journalStartDate.value) E.journalStartDate.value = getMonthStart();
        if (E.journalEndDate && !E.journalEndDate.value) E.journalEndDate.value = getToday();
        if (E.expenseTanggal && !E.expenseTanggal.value) E.expenseTanggal.value = getToday();
        if (E.taxPeriodStart && !E.taxPeriodStart.value) E.taxPeriodStart.value = getMonthStart();
        if (E.taxPeriodEnd && !E.taxPeriodEnd.value) E.taxPeriodEnd.value = getToday();
        const now = new Date();
        if (E.cashflowMonth) E.cashflowMonth.value = now.getMonth();
        if (E.cashflowYear) E.cashflowYear.value = now.getFullYear();
    }

    // ==================== SUB TAB SWITCHING ====================
    function setupSubTabs() {
        if (!E.subTabBtns) return;
        E.subTabBtns.forEach(btn => {
            btn.addEventListener('click', function () {
                E.subTabBtns.forEach(b => { b.classList.remove('btn-primary', 'active'); b.classList.add('btn-secondary'); });
                this.classList.add('btn-primary', 'active');
                this.classList.remove('btn-secondary');
                const tab = this.dataset.financeTab;
                E.subTabContents.forEach(c => c.classList.add('hidden'));
                const target = document.getElementById(tab);
                if (target) target.classList.remove('hidden');
                currentSubTab = tab;

                if (tab === 'finance-overview') refreshFinanceOverview();
                if (tab === 'finance-expense') renderRecentExpenses();
                if (tab === 'finance-journal') renderJournal();
                if (tab === 'finance-cashflow') refreshCashflow();
                if (tab === 'finance-analysis') refreshAnalysis();
                if (tab === 'finance-tax') refreshTax();
            });
        });
    }

    // ==================== RINGKASAN KEUANGAN ====================
    function refreshFinanceOverview() {
        const sales = Storage.getSales().filter(s => s.tanggal >= getMonthStart() && s.tanggal <= getToday());
        const expenses = Storage.getExpenses().filter(e => e.tanggal >= getMonthStart() && e.tanggal <= getToday());

        const totalPendapatan = sales.reduce((sum, s) => sum + (s.qty * s.hargaJual - (s.diskon || 0)), 0);
        const totalHPP = sales.reduce((sum, s) => sum + (s.qty * s.hpp), 0);
        const totalBeban = expenses.reduce((sum, e) => sum + e.jumlah, 0);
        const labaKotor = totalPendapatan - totalHPP;
        const labaBersih = labaKotor - totalBeban;

        if (E.finPendapatan) E.finPendapatan.textContent = formatRupiah(totalPendapatan);
        if (E.finHPP) E.finHPP.textContent = formatRupiah(totalHPP);
        if (E.finLabaKotor) E.finLabaKotor.textContent = formatRupiah(labaKotor);
        if (E.finBeban) E.finBeban.textContent = formatRupiah(totalBeban);
        if (E.finLabaBersih) E.finLabaBersih.textContent = formatRupiah(labaBersih);

        renderMonthlyPLChart();
        renderExpenseCompositionChart(expenses);
        renderMarginPerProductChart(sales);
    }

    // ==================== GRAFIK ====================
    function renderMonthlyPLChart() {
        const ctx = E.chartFinanceMonthlyPL?.getContext('2d');
        if (!ctx) return;
        const currentYear = new Date().getFullYear();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        const revenueData = Array(12).fill(0);
        const expenseData = Array(12).fill(0);
        const profitData = Array(12).fill(0);

        Storage.getSales().forEach(s => {
            const d = new Date(s.tanggal);
            if (d.getFullYear() === currentYear) {
                revenueData[d.getMonth()] += (s.qty * s.hargaJual - (s.diskon || 0));
                profitData[d.getMonth()] += (s.qty * s.hargaJual - (s.diskon || 0)) - (s.qty * s.hpp);
            }
        });
        Storage.getExpenses().forEach(e => {
            const d = new Date(e.tanggal);
            if (d.getFullYear() === currentYear) {
                expenseData[d.getMonth()] += e.jumlah;
                profitData[d.getMonth()] -= e.jumlah;
            }
        });

        if (monthlyPLChart) monthlyPLChart.destroy();
        monthlyPLChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [
                    { label: 'Pendapatan', data: revenueData, backgroundColor: '#22c55e', borderRadius: 4 },
                    { label: 'Beban', data: expenseData, backgroundColor: '#ef4444', borderRadius: 4 },
                    { label: 'Laba Bersih', data: profitData, type: 'line', borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', tension: 0.3, fill: true, order: 0 }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatRupiah(ctx.raw)}` } }
                },
                scales: { y: { ticks: { callback: val => formatRupiah(val) } } }
            }
        });
    }

    function renderExpenseCompositionChart(expenses) {
        const ctx = E.chartExpenseComposition?.getContext('2d');
        if (!ctx) return;
        const composition = {};
        expenses.forEach(e => { composition[e.akun] = (composition[e.akun] || 0) + e.jumlah; });
        const labels = Object.keys(composition);
        const data = Object.values(composition);
        if (expenseCompositionChart) expenseCompositionChart.destroy();
        if (labels.length === 0) return;
        expenseCompositionChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{ data, backgroundColor: ['#ef4444','#f59e0b','#3b82f6','#22c55e','#8b5cf6','#ec4899','#14b8a6','#f97316','#6366f1','#84cc16'] }]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${formatRupiah(ctx.raw)}` } } }
            }
        });
    }

    function renderMarginPerProductChart(sales) {
        const ctx = E.chartMarginPerProduct?.getContext('2d');
        if (!ctx) return;
        const marginMap = {};
        sales.forEach(s => {
            if (!marginMap[s.produk]) marginMap[s.produk] = { revenue: 0, hpp: 0 };
            marginMap[s.produk].revenue += (s.qty * s.hargaJual - (s.diskon || 0));
            marginMap[s.produk].hpp += s.qty * s.hpp;
        });
        const entries = Object.entries(marginMap).sort((a, b) => (b[1].revenue - b[1].hpp) - (a[1].revenue - a[1].hpp)).slice(0, 8);
        if (marginPerProductChart) marginPerProductChart.destroy();
        if (entries.length === 0) return;
        marginPerProductChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: entries.map(([p]) => p),
                datasets: [{ label: 'Margin (Rp)', data: entries.map(([, d]) => d.revenue - d.hpp), backgroundColor: entries.map(([, d]) => (d.revenue - d.hpp) < 0 ? '#ef4444' : '#22c55e'), borderRadius: 4 }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => formatRupiah(ctx.raw) } } },
                scales: { y: { ticks: { callback: val => formatRupiah(val) } } }
            }
        });
    }

    // ==================== BEBAN ====================
    async function handleAddExpense(e) {
        e.preventDefault();
        const akun = E.expenseAkun?.value;
        const jumlah = parseFloat(E.expenseJumlah?.value) || 0;
        const tanggal = E.expenseTanggal?.value || getToday();
        const deskripsi = E.expenseDeskripsi?.value || '';
        if (!akun || jumlah <= 0) { showToast('Error', 'Pilih akun dan masukkan jumlah.', 'error'); return; }
        await Storage.addExpense({ id: 'e' + Date.now(), tanggal, akun, jumlah, deskripsi });
        showToast('Sukses', `Beban ${akun} sebesar ${formatRupiah(jumlah)} dicatat.`, 'success');
        E.expenseForm.reset();
        E.expenseTanggal.value = getToday();
        renderRecentExpenses();
        refreshFinanceOverview();
    }

    function renderRecentExpenses() {
        if (!E.recentExpensesList) return;
        let expenses = Storage.getExpenses();
        const search = (E.expenseSearch?.value || '').toLowerCase();
        const filterAkun = E.expenseFilterAkun?.value || '';
        if (search) expenses = expenses.filter(e => e.akun.toLowerCase().includes(search) || (e.deskripsi || '').toLowerCase().includes(search));
        if (filterAkun) expenses = expenses.filter(e => e.akun === filterAkun);
        expenses.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
        const recent = expenses.slice(0, 20);
        if (recent.length === 0) {
            E.recentExpensesList.innerHTML = '<p class="opacity-50 text-sm text-center py-4">Belum ada beban tercatat.</p>';
            return;
        }
        E.recentExpensesList.innerHTML = recent.map(e => `
            <div class="flex justify-between items-center py-2 border-b last:border-0 text-sm">
                <div>
                    <span class="font-medium">${e.akun}</span>
                    <span class="text-xs opacity-70 ml-2">${e.tanggal}</span>
                    ${e.deskripsi ? `<p class="text-xs opacity-50">${e.deskripsi}</p>` : ''}
                </div>
                <span class="font-semibold text-red-500">${formatRupiah(e.jumlah)}</span>
            </div>
        `).join('');
    }

    // ==================== BUKU BESAR ====================
    function renderJournal(resetPage = true) {
        if (!E.journalTableBody) return;
        if (resetPage) journalPage = 1;
        const startDate = E.journalStartDate?.value || '1970-01-01';
        const endDate = E.journalEndDate?.value || '2099-12-31';
        const filterAkun = E.journalFilterAkun?.value || '';

        const sales = Storage.getSales().filter(s => s.tanggal >= startDate && s.tanggal <= endDate);
        const expenses = Storage.getExpenses().filter(e => e.tanggal >= startDate && e.tanggal <= endDate);

        const entries = [];
        sales.forEach(s => {
            entries.push({ tanggal: s.tanggal, deskripsi: `Penjualan ${s.produk} ke ${s.klien}`, akun: 'Kas', debet: (s.qty * s.hargaJual - (s.diskon || 0)), kredit: 0 });
            entries.push({ tanggal: s.tanggal, deskripsi: `HPP ${s.produk}`, akun: 'HPP', debet: 0, kredit: s.qty * s.hpp });
        });
        expenses.forEach(e => entries.push({ tanggal: e.tanggal, deskripsi: e.deskripsi || e.akun, akun: e.akun, debet: 0, kredit: e.jumlah }));
        entries.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

        let filtered = filterAkun ? entries.filter(e => e.akun === filterAkun) : entries;
        const totalPages = Math.ceil(filtered.length / JOURNAL_PER_PAGE);
        const pageEntries = filtered.slice(0, journalPage * JOURNAL_PER_PAGE);

        E.journalTableBody.innerHTML = pageEntries.length === 0
            ? '<tr><td colspan="5" class="text-center p-4 opacity-50">Tidak ada jurnal.</td></tr>'
            : pageEntries.map(e => `
                <tr class="border-t hover:bg-slate-50 dark:hover:bg-slate-700 text-sm">
                    <td class="p-2">${e.tanggal}</td>
                    <td class="p-2">${e.deskripsi}</td>
                    <td class="p-2">${e.akun}</td>
                    <td class="p-2 text-right">${e.debet > 0 ? formatRupiah(e.debet) : ''}</td>
                    <td class="p-2 text-right">${e.kredit > 0 ? formatRupiah(e.kredit) : ''}</td>
                </tr>
            `).join('');

        if (E.journalShowingInfo) E.journalShowingInfo.textContent = `Halaman ${journalPage} dari ${totalPages} (${filtered.length} entri)`;
        if (E.loadMoreJournal) E.loadMoreJournal.classList.toggle('hidden', journalPage >= totalPages);
    }

    // ==================== ARUS KAS ====================
    function refreshCashflow() {
        const month = parseInt(E.cashflowMonth?.value) || new Date().getMonth();
        const year = parseInt(E.cashflowYear?.value) || new Date().getFullYear();
        const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

        const sales = Storage.getSales().filter(s => s.tanggal >= startDate && s.tanggal <= endDate);
        const expenses = Storage.getExpenses().filter(e => e.tanggal >= startDate && e.tanggal <= endDate);

        const kasMasuk = sales.reduce((sum, s) => sum + (s.qty * s.hargaJual - (s.diskon || 0)), 0);
        const kasKeluar = expenses.reduce((sum, e) => sum + e.jumlah, 0);
        const saldoBersih = kasMasuk - kasKeluar;

        if (E.cfKasMasuk) E.cfKasMasuk.textContent = formatRupiah(kasMasuk);
        if (E.cfKasKeluar) E.cfKasKeluar.textContent = formatRupiah(kasKeluar);
        if (E.cfSaldoBersih) E.cfSaldoBersih.textContent = formatRupiah(saldoBersih);

        renderCashflowChart(sales, expenses, startDate, endDate);
    }

    function renderCashflowChart(sales, expenses, startDate, endDate) {
        const ctx = E.chartCashflow?.getContext('2d');
        if (!ctx) return;
        const dateMap = {};
        const start = new Date(startDate);
        const end = new Date(endDate);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            dateMap[d.toISOString().split('T')[0]] = { masuk: 0, keluar: 0 };
        }
        sales.forEach(s => { if (dateMap[s.tanggal]) dateMap[s.tanggal].masuk += (s.qty * s.hargaJual - (s.diskon || 0)); });
        expenses.forEach(e => { if (dateMap[e.tanggal]) dateMap[e.tanggal].keluar += e.jumlah; });
        const labels = Object.keys(dateMap).sort();
        if (cashflowChart) cashflowChart.destroy();
        cashflowChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels.map(l => new Date(l).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })),
                datasets: [
                    { label: 'Kas Masuk', data: labels.map(l => dateMap[l].masuk), borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.1)', tension: 0.3, fill: true },
                    { label: 'Kas Keluar', data: labels.map(l => dateMap[l].keluar), borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', tension: 0.3, fill: true }
                ]
            },
            options: {
                responsive: true,
                plugins: { tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatRupiah(ctx.raw)}` } } },
                scales: { y: { ticks: { callback: val => formatRupiah(val) } } }
            }
        });
    }

    // ==================== ANALISIS ====================
    function refreshAnalysis() {
        const sales = Storage.getSales().filter(s => s.tanggal >= getMonthStart());
        const expenses = Storage.getExpenses().filter(e => e.tanggal >= getMonthStart());
        const pendapatan = sales.reduce((sum, s) => sum + (s.qty * s.hargaJual - (s.diskon || 0)), 0);
        const hpp = sales.reduce((sum, s) => sum + (s.qty * s.hpp), 0);
        const beban = expenses.reduce((sum, e) => sum + e.jumlah, 0);
        const labaKotor = pendapatan - hpp;
        const labaBersih = labaKotor - beban;
        const marginKotor = pendapatan > 0 ? ((labaKotor / pendapatan) * 100).toFixed(1) : 0;
        const marginBersih = pendapatan > 0 ? ((labaBersih / pendapatan) * 100).toFixed(1) : 0;
        const rasioBeban = pendapatan > 0 ? ((beban / pendapatan) * 100).toFixed(1) : 0;
        const totalAset = Storage.getBatches().reduce((sum, b) => sum + ((b.berat - b.used) * (b.hargaBeli || 0)), 0);
        const roa = totalAset > 0 ? ((labaBersih / totalAset) * 100).toFixed(1) : 0;
        const ekuitas = totalAset + labaBersih;
        const roe = ekuitas > 0 ? ((labaBersih / ekuitas) * 100).toFixed(1) : 0;

        if (E.anaMarginKotor) E.anaMarginKotor.textContent = marginKotor + '%';
        if (E.anaMarginBersih) E.anaMarginBersih.textContent = marginBersih + '%';
        if (E.anaRasioBeban) E.anaRasioBeban.textContent = rasioBeban + '%';
        if (E.anaROA) E.anaROA.textContent = roa + '%';
        if (E.anaROE) E.anaROE.textContent = roe + '%';

        if (E.analysisRecommendations) {
            let recs = [];
            if (marginBersih < 10) recs.push('Margin laba bersih rendah (<10%). Pertimbangkan menaikkan harga jual atau menekan biaya operasional.');
            if (rasioBeban > 40) recs.push('Rasio beban tinggi (>40%). Audit pengeluaran untuk menemukan area penghematan.');
            if (marginKotor > 30) recs.push('Margin laba kotor sehat (>30%). Pertahankan strategi pricing dan efisiensi pembelian.');
            if (roa < 5) recs.push('ROA rendah (<5%). Aset belum menghasilkan laba optimal. Tingkatkan penjualan atau kurangi stok tidak produktif.');
            if (recs.length === 0) recs.push('Kinerja keuangan dalam kondisi baik. Lanjutkan monitoring rutin.');
            E.analysisRecommendations.innerHTML = recs.map(r => `<li>${r}</li>`).join('');
        }
    }

    // ==================== PAJAK ====================
    function refreshTax() {
        const start = E.taxPeriodStart?.value || getMonthStart();
        const end = E.taxPeriodEnd?.value || getToday();
        const sales = Storage.getSales().filter(s => s.tanggal >= start && s.tanggal <= end);
        const pendapatan = sales.reduce((sum, s) => sum + (s.qty * s.hargaJual - (s.diskon || 0)), 0);
        const settings = Storage.getSettings();
        const ppnRate = settings.ppn || 12;
        const pph25Rate = settings.pph25 || 2;
        const pph21Rate = settings.pph21 || 5;

        const dpp = Math.round(pendapatan / (1 + ppnRate / 100));
        const ppn = pendapatan - dpp;
        const pph25 = Math.round((dpp * pph25Rate) / 100);
        const pph21 = Math.round((dpp * pph21Rate) / 100);
        const totalPajak = ppn + pph25 + pph21;

        if (E.taxDPP) E.taxDPP.textContent = formatRupiah(dpp);
        if (E.taxPPN) E.taxPPN.textContent = formatRupiah(ppn);
        if (E.taxPPH25) E.taxPPH25.textContent = formatRupiah(pph25);
        if (E.taxPPH21) E.taxPPH21.textContent = formatRupiah(pph21);
        if (E.taxTotalPajak) E.taxTotalPajak.textContent = formatRupiah(totalPajak);

        if (E.taxBreakdownTable) {
            E.taxBreakdownTable.innerHTML = `
                <tr><td class="p-2">DPP</td><td class="p-2 text-right">${formatRupiah(dpp)}</td></tr>
                <tr><td class="p-2">PPN (${ppnRate}%)</td><td class="p-2 text-right">${formatRupiah(ppn)}</td></tr>
                <tr><td class="p-2">PPh 25 (${pph25Rate}%)</td><td class="p-2 text-right">${formatRupiah(pph25)}</td></tr>
                <tr><td class="p-2">PPh 21 (${pph21Rate}%)</td><td class="p-2 text-right">${formatRupiah(pph21)}</td></tr>
                <tr class="font-bold"><td class="p-2">Total Pajak</td><td class="p-2 text-right">${formatRupiah(totalPajak)}</td></tr>
            `;
        }
    }

    function exportTaxPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text('Laporan Pajak', 15, 20);
        doc.setFontSize(10);
        let y = 30;
        const start = E.taxPeriodStart?.value || getMonthStart();
        const end = E.taxPeriodEnd?.value || getToday();
        doc.text(`Periode: ${start} s/d ${end}`, 15, y);
        y += 10;
        const items = document.querySelectorAll('#taxBreakdownTable tr');
        items.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length === 2) {
                doc.text(`${cells[0].textContent}: ${cells[1].textContent}`, 15, y);
                y += 8;
            }
        });
        doc.save(`laporan_pajak_${start}_${end}.pdf`);
        showToast('Sukses', 'PDF Pajak diunduh.', 'success');
    }

    // ==================== EKSPOR ====================
    function exportJurnalExcel() {
        const startDate = E.journalStartDate?.value || '1970-01-01';
        const endDate = E.journalEndDate?.value || '2099-12-31';
        const sales = Storage.getSales().filter(s => s.tanggal >= startDate && s.tanggal <= endDate);
        const expenses = Storage.getExpenses().filter(e => e.tanggal >= startDate && e.tanggal <= endDate);
        const data = [['Tanggal', 'Deskripsi', 'Akun', 'Debet', 'Kredit']];
        sales.forEach(s => {
            data.push([s.tanggal, `Penjualan ${s.produk} ke ${s.klien}`, 'Kas', (s.qty * s.hargaJual - (s.diskon || 0)), 0]);
            data.push([s.tanggal, `HPP ${s.produk}`, 'HPP', 0, s.qty * s.hpp]);
        });
        expenses.forEach(e => data.push([e.tanggal, e.deskripsi || e.akun, e.akun, 0, e.jumlah]));
        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Jurnal');
        XLSX.writeFile(wb, `jurnal_${startDate}_${endDate}.xlsx`);
        showToast('Sukses', 'Jurnal diunduh.', 'success');
    }

    function exportFullData() {
        const sales = Storage.getSales();
        const data = [['Tanggal', 'Klien', 'Produk', 'Qty', 'Harga/kg', 'Total', 'Channel', 'Tier', 'HPP/kg', 'Laba']];
        sales.forEach(s => data.push([s.tanggal, s.klien, s.produk, s.qty, s.hargaJual, (s.qty * s.hargaJual - (s.diskon || 0)), s.channel, s.tier, s.hpp, (s.hargaJual - s.hpp) * s.qty]));
        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Data Lengkap');
        XLSX.writeFile(wb, `data_penjualan_lengkap.xlsx`);
        showToast('Sukses', 'Data lengkap diunduh.', 'success');
    }

    function exportLabaRugiPDF() {
        const sales = Storage.getSales().filter(s => s.tanggal >= getMonthStart());
        const expenses = Storage.getExpenses().filter(e => e.tanggal >= getMonthStart());
        const pendapatan = sales.reduce((sum, s) => sum + (s.qty * s.hargaJual - (s.diskon || 0)), 0);
        const hpp = sales.reduce((sum, s) => sum + (s.qty * s.hpp), 0);
        const beban = expenses.reduce((sum, e) => sum + e.jumlah, 0);
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text('Laporan Laba Rugi', 15, 20);
        doc.setFontSize(10);
        let y = 30;
        doc.text(`Pendapatan: ${formatRupiah(pendapatan)}`, 15, y); y += 8;
        doc.text(`HPP: ${formatRupiah(hpp)}`, 15, y); y += 8;
        doc.text(`Laba Kotor: ${formatRupiah(pendapatan - hpp)}`, 15, y); y += 8;
        doc.text(`Beban: ${formatRupiah(beban)}`, 15, y); y += 8;
        doc.text(`Laba Bersih: ${formatRupiah(pendapatan - hpp - beban)}`, 15, y);
        doc.save('laba_rugi.pdf');
        showToast('Sukses', 'PDF Laba Rugi diunduh.', 'success');
    }

    function exportNeracaPDF() {
        const stockMap = CFS.Inventory ? CFS.Inventory.getStockPerProduct() : {};
        const totalAset = Object.values(stockMap).reduce((a, b) => a + b * 30000, 0);
        const labaBersih = Storage.getSales().reduce((a, s) => a + (s.qty * s.hargaJual - (s.diskon || 0)), 0) - Storage.getSales().reduce((a, s) => a + s.qty * s.hpp, 0) - Storage.getExpenses().reduce((a, e) => a + e.jumlah, 0);
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text('Neraca', 15, 20);
        doc.setFontSize(10);
        let y = 30;
        doc.text(`Aset (Stok): ${formatRupiah(totalAset)}`, 15, y); y += 8;
        doc.text(`Kas: ${formatRupiah(labaBersih)}`, 15, y); y += 8;
        doc.text(`Total Aset: ${formatRupiah(totalAset + labaBersih)}`, 15, y); y += 8;
        doc.text(`Kewajiban: Rp 0`, 15, y); y += 8;
        doc.text(`Ekuitas: ${formatRupiah(totalAset + labaBersih)}`, 15, y);
        doc.save('neraca.pdf');
        showToast('Sukses', 'PDF Neraca diunduh.', 'success');
    }

    // ==================== EVENT BINDING ====================
    function bindEvents() {
        if (E.expenseForm) E.expenseForm.addEventListener('submit', handleAddExpense);
        if (E.expenseSearch) E.expenseSearch.addEventListener('input', renderRecentExpenses);
        if (E.expenseFilterAkun) E.expenseFilterAkun.addEventListener('change', renderRecentExpenses);

        if (E.applyJournalFilter) E.applyJournalFilter.addEventListener('click', () => renderJournal(true));
        if (E.loadMoreJournal) E.loadMoreJournal.addEventListener('click', () => { journalPage++; renderJournal(false); });
        if (E.exportJournalExcel) E.exportJournalExcel.addEventListener('click', exportJurnalExcel);

        if (E.applyCashflowFilter) E.applyCashflowFilter.addEventListener('click', refreshCashflow);

        if (E.applyTaxFilter) E.applyTaxFilter.addEventListener('click', refreshTax);
        if (E.exportTaxPDF) E.exportTaxPDF.addEventListener('click', exportTaxPDF);

        if (E.exportFinanceExcelBtn) E.exportFinanceExcelBtn.addEventListener('click', exportJurnalExcel);
        if (E.exportFinanceFullExcelBtn) E.exportFinanceFullExcelBtn.addEventListener('click', exportFullData);
        if (E.exportFinancePDFBtn) E.exportFinancePDFBtn.addEventListener('click', exportLabaRugiPDF);
        if (E.exportFinanceNeracaPDFBtn) E.exportFinanceNeracaPDFBtn.addEventListener('click', exportNeracaPDF);
    }

    // ==================== EXPORT API ====================
    CFS.Accounting = {
        init: initAccounting,
        refreshFinanceSummary: refreshFinanceOverview,
        renderYearlyChart: renderMonthlyPLChart
    };
})();
