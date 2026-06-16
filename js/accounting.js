/* ============================================================
   Cibitung Frozen ERP Ultimate v5.4 — Accounting Module (PRO)
   Mandiri, ±2200 baris, keuangan enterprise modern.
   ============================================================ */
window.CFS = window.CFS || {};

(function () {
    'use strict';

    const Storage = CFS.Storage;
    const STORAGE_OTHER_INCOME = 'cfs_other_income'; // pendapatan lain‑lain

    // ==================== STATE ====================
    let currentSubTab = 'finance-overview';
    let journalPage = 1;
    const JOURNAL_PER_PAGE = 50;

    // Chart instances
    let monthlyPLChart = null;
    let expenseCompositionChart = null;
    let marginPerProductChart = null;
    let cashflowChart = null;
    let budgetVsActualChart = null;
    let projectionChart = null;

    // Data for Chart of Accounts & Budget
    let chartOfAccounts = [];
    let budgets = [];

    // ==================== SEARCHABLE DROPDOWN (internal) ====================
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
            this.displayEl.addEventListener('click', (e) => { e.stopPropagation(); this.toggle(); });
            document.addEventListener('click', (e) => { if (!this.container.contains(e.target)) this.close(); });
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
                if (typeof this.settings.onChange === 'function') this.settings.onChange(this.value, this);
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
            subTabBtns: document.querySelectorAll('.finance-subtab-btn'),
            subTabContents: document.querySelectorAll('.finance-subtab-content'),

            // Periode global
            financePeriodStart: document.getElementById('financePeriodStart'),
            financePeriodEnd: document.getElementById('financePeriodEnd'),
            applyFinancePeriod: document.getElementById('applyFinancePeriod'),

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

            // COA
            coaTableBody: document.getElementById('coaTableBody'),
            newCoaKode: document.getElementById('newCoaKode'),
            newCoaNama: document.getElementById('newCoaNama'),
            newCoaTipe: document.getElementById('newCoaTipe'),
            addCoaBtn: document.getElementById('addCoaBtn'),

            // Budget
            budgetAkun: document.getElementById('budgetAkun'),
            budgetBulan: document.getElementById('budgetBulan'),
            budgetJumlah: document.getElementById('budgetJumlah'),
            addBudgetBtn: document.getElementById('addBudgetBtn'),
            budgetTableBody: document.getElementById('budgetTableBody'),
            chartBudgetVsActual: document.getElementById('chartBudgetVsActual'),

            // Proyeksi
            projectionRevenue: document.getElementById('projectionRevenue'),
            projectionProfit: document.getElementById('projectionProfit'),
            chartProjection: document.getElementById('chartProjection'),

            // Rasio
            ratioTableBody: document.getElementById('ratioTableBody'),

            // Pendapatan Lain‑lain
            otherIncomeForm: document.getElementById('otherIncomeForm'),
            otherIncomeAkun: document.getElementById('otherIncomeAkun'),
            otherIncomeJumlah: document.getElementById('otherIncomeJumlah'),
            otherIncomeTanggal: document.getElementById('otherIncomeTanggal'),
            otherIncomeDeskripsi: document.getElementById('otherIncomeDeskripsi'),
            otherIncomeList: document.getElementById('otherIncomeList'),

            // Kalkulator PPN
            ppnCalculatorInput: document.getElementById('ppnCalculatorInput'),
            ppnCalculatorResult: document.getElementById('ppnCalculatorResult'),
            ppnCalculatorBtn: document.getElementById('ppnCalculatorBtn'),

            // Notifikasi Pajak
            taxDueNotification: document.getElementById('taxDueNotification'),
        };
    }

    // ==================== HELPER ====================
    function formatRupiah(n) { return 'Rp ' + Math.round(n).toLocaleString('id-ID'); }
    function formatNumber(n) { return Math.round(n).toLocaleString('id-ID'); }
    function getToday() { return new Date().toISOString().split('T')[0]; }
    function getMonthStart() { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]; }
    function getMonthEnd() { const now = new Date(); return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]; }
    function showToast(title, msg, type) { if (window.showToast) window.showToast(title, msg, type); }

    // ==================== DATA PERSISTENCE ====================
    async function loadChartOfAccounts() {
        chartOfAccounts = (await localforage.getItem('cfs_coa')) || [
            { kode: '100', nama: 'Kas', tipe: 'aset' },
            { kode: '110', nama: 'Persediaan', tipe: 'aset' },
            { kode: '200', nama: 'Hutang', tipe: 'kewajiban' },
            { kode: '300', nama: 'Ekuitas', tipe: 'ekuitas' },
            { kode: '400', nama: 'Pendapatan', tipe: 'pendapatan' },
            { kode: '500', nama: 'HPP', tipe: 'beban' },
            { kode: '600', nama: 'Beban Operasional', tipe: 'beban' }
        ];
    }
    async function saveChartOfAccounts() { await localforage.setItem('cfs_coa', chartOfAccounts); }
    async function loadBudgets() { budgets = (await localforage.getItem('cfs_budgets')) || []; }
    async function saveBudgets() { await localforage.setItem('cfs_budgets', budgets); }
    async function loadOtherIncome() { return (await localforage.getItem(STORAGE_OTHER_INCOME)) || []; }
    async function saveOtherIncome(data) { await localforage.setItem(STORAGE_OTHER_INCOME, data); }

    // ==================== INISIALISASI ====================
    async function initAccounting() {
        cacheElements();
        await loadChartOfAccounts();
        await loadBudgets();
        setupSubTabs();
        bindEvents();
        setDefaultDates();
        populateAccountSelects();
        refreshFinanceOverview();
        checkTaxDueNotifications();
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
        if (E.financePeriodStart) E.financePeriodStart.value = getMonthStart();
        if (E.financePeriodEnd) E.financePeriodEnd.value = getToday();
        if (E.budgetBulan) E.budgetBulan.value = now.toISOString().slice(0, 7);
        if (E.otherIncomeTanggal) E.otherIncomeTanggal.value = getToday();
    }

    function populateAccountSelects() {
        const options = chartOfAccounts.map(c => `<option value="${c.kode}">${c.kode} ${c.nama}</option>`).join('');
        const selectIds = ['expenseAkun', 'journalFilterAkun', 'budgetAkun', 'otherIncomeAkun'];
        selectIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = '<option value="">Pilih Akun</option>' + options;
        });
    }

    // ==================== SUB TAB ====================
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
                if (tab === 'finance-coa') renderCOA();
                if (tab === 'finance-budget') renderBudget();
                if (tab === 'finance-projection') refreshProjection();
                if (tab === 'finance-ratios') refreshRatios();
                if (tab === 'finance-other-income') renderOtherIncome();
                if (tab === 'finance-export') {} // nothing to init
            });
        });
    }

    // ==================== GET PERIOD ====================
    function getPeriod() {
        const start = E.financePeriodStart?.value || getMonthStart();
        const end = E.financePeriodEnd?.value || getToday();
        return { start, end };
    }

    // ==================== RINGKASAN KEUANGAN ====================
    async function refreshFinanceOverview() {
        const { start, end } = getPeriod();
        const sales = Storage.getSales().filter(s => s.tanggal >= start && s.tanggal <= end);
        const expenses = Storage.getExpenses().filter(e => e.tanggal >= start && e.tanggal <= end);
        const otherIncomes = await loadOtherIncome();
        const otherIncomeTotal = otherIncomes.filter(o => o.tanggal >= start && o.tanggal <= end).reduce((sum, o) => sum + o.jumlah, 0);

        const totalPendapatan = sales.reduce((sum, s) => sum + (s.qty * s.hargaJual - (s.diskon || 0)), 0) + otherIncomeTotal;
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
        const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
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
                plugins: { tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatRupiah(ctx.raw)}` } } },
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
        const entries = Object.entries(marginMap).sort((a,b) => (b[1].revenue - b[1].hpp) - (a[1].revenue - a[1].hpp)).slice(0,8);
        if (marginPerProductChart) marginPerProductChart.destroy();
        if (entries.length === 0) return;
        marginPerProductChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: entries.map(([p]) => p),
                datasets: [{ label: 'Margin', data: entries.map(([,d]) => d.revenue - d.hpp), backgroundColor: entries.map(([,d]) => (d.revenue - d.hpp) < 0 ? '#ef4444' : '#22c55e'), borderRadius: 4 }]
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
        if (!akun || jumlah <= 0) { showToast('Error', 'Lengkapi akun dan jumlah.', 'error'); return; }
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
        if (search) expenses = expenses.filter(e => e.akun.toLowerCase().includes(search) || (e.deskripsi||'').toLowerCase().includes(search));
        if (filterAkun) expenses = expenses.filter(e => e.akun === filterAkun);
        expenses.sort((a,b) => new Date(b.tanggal) - new Date(a.tanggal));
        const recent = expenses.slice(0,20);
        if (recent.length === 0) {
            E.recentExpensesList.innerHTML = '<p class="opacity-50 text-sm text-center py-4">Belum ada beban tercatat.</p>';
            return;
        }
        E.recentExpensesList.innerHTML = recent.map(e => `
            <div class="flex justify-between items-center py-2 border-b last:border-0 text-sm">
                <div><span class="font-medium">${e.akun}</span><span class="text-xs opacity-70 ml-2">${e.tanggal}</span>${e.deskripsi ? `<p class="text-xs opacity-50">${e.deskripsi}</p>` : ''}</div>
                <span class="font-semibold text-red-500">${formatRupiah(e.jumlah)}</span>
            </div>
        `).join('');
    }

    // ==================== PENDAPATAN LAIN‑LAIN ====================
    async function handleAddOtherIncome(e) {
        e.preventDefault();
        const akun = E.otherIncomeAkun?.value;
        const jumlah = parseFloat(E.otherIncomeJumlah?.value) || 0;
        const tanggal = E.otherIncomeTanggal?.value || getToday();
        const deskripsi = E.otherIncomeDeskripsi?.value || '';
        if (!akun || jumlah <= 0) return;
        const list = await loadOtherIncome();
        list.push({ id: 'oi_' + Date.now(), tanggal, akun, jumlah, deskripsi });
        await saveOtherIncome(list);
        showToast('Sukses', `Pendapatan lain dicatat.`, 'success');
        E.otherIncomeForm.reset();
        E.otherIncomeTanggal.value = getToday();
        renderOtherIncome();
        refreshFinanceOverview();
    }

    async function renderOtherIncome() {
        if (!E.otherIncomeList) return;
        const list = await loadOtherIncome();
        list.sort((a,b) => new Date(b.tanggal) - new Date(a.tanggal));
        E.otherIncomeList.innerHTML = list.length === 0
            ? '<p class="opacity-50 text-sm py-2">Belum ada pendapatan lain.</p>'
            : list.map(o => `<div class="flex justify-between text-sm py-1"><span>${o.tanggal} - ${o.akun} (${o.deskripsi})</span><span class="text-green-600">+${formatRupiah(o.jumlah)}</span></div>`).join('');
    }

    // ==================== BUKU BESAR ====================
    function buildJournalEntries(startDate, endDate) {
        const sales = Storage.getSales().filter(s => s.tanggal >= startDate && s.tanggal <= endDate);
        const expenses = Storage.getExpenses().filter(e => e.tanggal >= startDate && e.tanggal <= endDate);
        const entries = [];
        sales.forEach(s => {
            const pendapatan = s.qty * s.hargaJual - (s.diskon || 0);
            entries.push({ tanggal: s.tanggal, deskripsi: `Penjualan ${s.produk} ke ${s.klien}`, akun: '100', debet: pendapatan, kredit: 0 });
            entries.push({ tanggal: s.tanggal, deskripsi: `Pendapatan ${s.produk}`, akun: '400', debet: 0, kredit: pendapatan });
            const hpp = s.qty * s.hpp;
            entries.push({ tanggal: s.tanggal, deskripsi: `HPP ${s.produk}`, akun: '500', debet: hpp, kredit: 0 });
            entries.push({ tanggal: s.tanggal, deskripsi: `Persediaan keluar ${s.produk}`, akun: '110', debet: 0, kredit: hpp });
        });
        expenses.forEach(e => {
            entries.push({ tanggal: e.tanggal, deskripsi: e.deskripsi || e.akun, akun: e.akun, debet: e.jumlah, kredit: 0 });
            entries.push({ tanggal: e.tanggal, deskripsi: 'Pembayaran beban', akun: '100', debet: 0, kredit: e.jumlah });
        });
        entries.sort((a,b) => new Date(b.tanggal) - new Date(a.tanggal));
        return entries;
    }

    function renderJournal(resetPage = true) {
        if (!E.journalTableBody) return;
        if (resetPage) journalPage = 1;
        const startDate = E.journalStartDate?.value || '1970-01-01';
        const endDate = E.journalEndDate?.value || '2099-12-31';
        const filterAkun = E.journalFilterAkun?.value || '';
        const entries = buildJournalEntries(startDate, endDate);
        let filtered = filterAkun ? entries.filter(e => e.akun === filterAkun) : entries;
        const totalPages = Math.ceil(filtered.length / JOURNAL_PER_PAGE);
        const pageEntries = filtered.slice(0, journalPage * JOURNAL_PER_PAGE);
        E.journalTableBody.innerHTML = pageEntries.length === 0
            ? '<tr><td colspan="5" class="text-center p-4 opacity-50">Tidak ada jurnal.</td></tr>'
            : pageEntries.map(e => `
                <tr class="border-t hover:bg-slate-50 dark:hover:bg-slate-700 text-sm">
                    <td class="p-2">${e.tanggal}</td><td class="p-2">${e.deskripsi}</td><td class="p-2">${e.akun}</td>
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
        const startDate = `${year}-${String(month+1).padStart(2,'0')}-01`;
        const endDate = new Date(year, month+1, 0).toISOString().split('T')[0];
        const sales = Storage.getSales().filter(s => s.tanggal >= startDate && s.tanggal <= endDate);
        const expenses = Storage.getExpenses().filter(e => e.tanggal >= startDate && e.tanggal <= endDate);
        const kasMasuk = sales.reduce((sum,s) => sum + (s.qty * s.hargaJual - (s.diskon || 0)), 0);
        const kasKeluar = expenses.reduce((sum,e) => sum + e.jumlah, 0);
        const saldo = kasMasuk - kasKeluar;
        if (E.cfKasMasuk) E.cfKasMasuk.textContent = formatRupiah(kasMasuk);
        if (E.cfKasKeluar) E.cfKasKeluar.textContent = formatRupiah(kasKeluar);
        if (E.cfSaldoBersih) E.cfSaldoBersih.textContent = formatRupiah(saldo);
        renderCashflowChart(sales, expenses, startDate, endDate);
    }

    function renderCashflowChart(sales, expenses, startDate, endDate) {
        const ctx = E.chartCashflow?.getContext('2d');
        if (!ctx) return;
        const dateMap = {};
        const start = new Date(startDate);
        const end = new Date(endDate);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) dateMap[d.toISOString().split('T')[0]] = { masuk: 0, keluar: 0 };
        sales.forEach(s => { if (dateMap[s.tanggal]) dateMap[s.tanggal].masuk += (s.qty * s.hargaJual - (s.diskon || 0)); });
        expenses.forEach(e => { if (dateMap[e.tanggal]) dateMap[e.tanggal].keluar += e.jumlah; });
        const labels = Object.keys(dateMap).sort();
        if (cashflowChart) cashflowChart.destroy();
        cashflowChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels.map(l => new Date(l).toLocaleDateString('id-ID',{day:'numeric',month:'short'})),
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
        const { start, end } = getPeriod();
        const sales = Storage.getSales().filter(s => s.tanggal >= start && s.tanggal <= end);
        const expenses = Storage.getExpenses().filter(e => e.tanggal >= start && e.tanggal <= end);
        const pendapatan = sales.reduce((sum,s) => sum + (s.qty * s.hargaJual - (s.diskon || 0)), 0);
        const hpp = sales.reduce((sum,s) => sum + (s.qty * s.hpp), 0);
        const beban = expenses.reduce((sum,e) => sum + e.jumlah, 0);
        const labaKotor = pendapatan - hpp;
        const labaBersih = labaKotor - beban;
        const marginKotor = pendapatan > 0 ? ((labaKotor/pendapatan)*100).toFixed(1) : 0;
        const marginBersih = pendapatan > 0 ? ((labaBersih/pendapatan)*100).toFixed(1) : 0;
        const rasioBeban = pendapatan > 0 ? ((beban/pendapatan)*100).toFixed(1) : 0;
        const totalAset = Storage.getBatches().reduce((sum,b) => sum + ((b.berat - b.used) * (b.hargaBeli || 0)), 0);
        const roa = totalAset > 0 ? ((labaBersih/totalAset)*100).toFixed(1) : 0;
        const ekuitas = totalAset + labaBersih;
        const roe = ekuitas > 0 ? ((labaBersih/ekuitas)*100).toFixed(1) : 0;
        if (E.anaMarginKotor) E.anaMarginKotor.textContent = marginKotor + '%';
        if (E.anaMarginBersih) E.anaMarginBersih.textContent = marginBersih + '%';
        if (E.anaRasioBeban) E.anaRasioBeban.textContent = rasioBeban + '%';
        if (E.anaROA) E.anaROA.textContent = roa + '%';
        if (E.anaROE) E.anaROE.textContent = roe + '%';
        if (E.analysisRecommendations) {
            let recs = [];
            if (marginBersih < 10) recs.push('Margin bersih rendah (<10%). Pertimbangkan menaikkan harga atau menekan biaya.');
            if (rasioBeban > 40) recs.push('Rasio beban tinggi (>40%). Audit pengeluaran.');
            if (marginKotor > 30) recs.push('Margin kotor sehat (>30%). Pertahankan.');
            if (roa < 5) recs.push('ROA rendah (<5%). Tingkatkan penjualan.');
            if (recs.length === 0) recs.push('Kinerja keuangan baik.');
            E.analysisRecommendations.innerHTML = recs.map(r => `<li>${r}</li>`).join('');
        }
    }

    // ==================== PAJAK ====================
    function refreshTax() {
        const start = E.taxPeriodStart?.value || getMonthStart();
        const end = E.taxPeriodEnd?.value || getToday();
        const sales = Storage.getSales().filter(s => s.tanggal >= start && s.tanggal <= end);
        const pendapatan = sales.reduce((sum,s) => sum + (s.qty * s.hargaJual - (s.diskon || 0)), 0);
        const settings = Storage.getSettings();
        const ppnRate = settings.ppn || 12;
        const pph25Rate = settings.pph25 || 2;
        const pph21Rate = settings.pph21 || 5;
        const dpp = Math.round(pendapatan / (1 + ppnRate/100));
        const ppn = pendapatan - dpp;
        const pph25 = Math.round((dpp * pph25Rate)/100);
        const pph21 = Math.round((dpp * pph21Rate)/100);
        const total = ppn + pph25 + pph21;
        if (E.taxDPP) E.taxDPP.textContent = formatRupiah(dpp);
        if (E.taxPPN) E.taxPPN.textContent = formatRupiah(ppn);
        if (E.taxPPH25) E.taxPPH25.textContent = formatRupiah(pph25);
        if (E.taxPPH21) E.taxPPH21.textContent = formatRupiah(pph21);
        if (E.taxTotalPajak) E.taxTotalPajak.textContent = formatRupiah(total);
        if (E.taxBreakdownTable) {
            E.taxBreakdownTable.innerHTML = `
                <tr><td class="p-2">DPP</td><td class="p-2 text-right">${formatRupiah(dpp)}</td></tr>
                <tr><td class="p-2">PPN (${ppnRate}%)</td><td class="p-2 text-right">${formatRupiah(ppn)}</td></tr>
                <tr><td class="p-2">PPh 25 (${pph25Rate}%)</td><td class="p-2 text-right">${formatRupiah(pph25)}</td></tr>
                <tr><td class="p-2">PPh 21 (${pph21Rate}%)</td><td class="p-2 text-right">${formatRupiah(pph21)}</td></tr>
                <tr class="font-bold"><td class="p-2">Total Pajak</td><td class="p-2 text-right">${formatRupiah(total)}</td></tr>
            `;
        }
    }

    function exportTaxPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.setFontSize(16); doc.text('Laporan Pajak', 15, 20);
        doc.setFontSize(10);
        let y = 30;
        const start = E.taxPeriodStart?.value || getMonthStart();
        const end = E.taxPeriodEnd?.value || getToday();
        doc.text(`Periode: ${start} s/d ${end}`, 15, y); y += 10;
        const rows = document.querySelectorAll('#taxBreakdownTable tr');
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length === 2) {
                doc.text(`${cells[0].textContent}: ${cells[1].textContent}`, 15, y);
                y += 8;
            }
        });
        doc.save(`laporan_pajak_${start}_${end}.pdf`);
        showToast('Sukses', 'PDF Pajak diunduh.', 'success');
    }

    // ==================== COA ====================
    function renderCOA() {
        if (!E.coaTableBody) return;
        E.coaTableBody.innerHTML = chartOfAccounts.map(c => `
            <tr><td class="p-2">${c.kode}</td><td class="p-2">${c.nama}</td><td class="p-2">${c.tipe}</td>
                <td class="p-2 text-center"><button class="btn btn-xs btn-danger" onclick="CFS.Accounting.deleteCoA('${c.kode}')">🗑️</button></td>
            </tr>`).join('');
    }

    async function addCoA() {
        const kode = E.newCoaKode?.value.trim();
        const nama = E.newCoaNama?.value.trim();
        const tipe = E.newCoaTipe?.value;
        if (!kode || !nama) return;
        if (chartOfAccounts.find(c => c.kode === kode)) { showToast('Error', 'Kode sudah ada.', 'error'); return; }
        chartOfAccounts.push({ kode, nama, tipe });
        await saveChartOfAccounts();
        renderCOA();
        populateAccountSelects();
        showToast('Sukses', 'Akun ditambahkan.', 'success');
        E.newCoaKode.value = '';
        E.newCoaNama.value = '';
    }

    async function deleteCoA(kode) {
        chartOfAccounts = chartOfAccounts.filter(c => c.kode !== kode);
        await saveChartOfAccounts();
        renderCOA();
        populateAccountSelects();
        showToast('Sukses', 'Akun dihapus.', 'success');
    }

    // ==================== BUDGET ====================
    function renderBudget() {
        if (!E.budgetTableBody) return;
        const rows = budgets.map(b => {
            const akun = chartOfAccounts.find(c => c.kode === b.kodeAkun);
            return `<tr><td class="p-2">${akun ? akun.nama : b.kodeAkun}</td><td class="p-2">${b.bulan}</td><td class="p-2 text-right">${formatRupiah(b.jumlah)}</td>
                <td class="p-2 text-center"><button class="btn btn-xs btn-danger" onclick="CFS.Accounting.deleteBudget('${b.id}')">🗑️</button></td></tr>`;
        }).join('');
        E.budgetTableBody.innerHTML = rows || '<tr><td colspan="4" class="text-center p-4 opacity-50">Belum ada anggaran.</td></tr>';
        renderBudgetVsActualChart();
    }

    async function addBudget() {
        const kodeAkun = E.budgetAkun?.value;
        const bulan = E.budgetBulan?.value;
        const jumlah = parseFloat(E.budgetJumlah?.value) || 0;
        if (!kodeAkun || !bulan || jumlah <= 0) return;
        budgets.push({ id: 'bgt_' + Date.now(), kodeAkun, bulan, jumlah });
        await saveBudgets();
        renderBudget();
        showToast('Sukses', 'Anggaran ditambahkan.', 'success');
    }

    async function deleteBudget(id) {
        budgets = budgets.filter(b => b.id !== id);
        await saveBudgets();
        renderBudget();
    }

    function renderBudgetVsActualChart() {
        const ctx = E.chartBudgetVsActual?.getContext('2d');
        if (!ctx) return;
        const { start, end } = getPeriod();
        const actualMap = {};
        Storage.getExpenses().filter(e => e.tanggal >= start && e.tanggal <= end).forEach(e => { actualMap[e.akun] = (actualMap[e.akun]||0) + e.jumlah; });
        const budgetMap = {};
        budgets.filter(b => b.bulan >= start.slice(0,7) && b.bulan <= end.slice(0,7)).forEach(b => { budgetMap[b.kodeAkun] = (budgetMap[b.kodeAkun]||0) + b.jumlah; });
        const allAkun = [...new Set([...Object.keys(actualMap), ...Object.keys(budgetMap)])];
        const labels = allAkun.map(kode => { const acc = chartOfAccounts.find(c => c.kode === kode); return acc ? acc.nama : kode; });
        const budgetData = allAkun.map(k => budgetMap[k]||0);
        const actualData = allAkun.map(k => actualMap[k]||0);
        if (budgetVsActualChart) budgetVsActualChart.destroy();
        if (allAkun.length === 0) return;
        budgetVsActualChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    { label: 'Anggaran', data: budgetData, backgroundColor: '#f59e0b' },
                    { label: 'Realisasi', data: actualData, backgroundColor: '#3b82f6' }
                ]
            },
            options: {
                responsive: true,
                plugins: { tooltip: { callbacks: { label: (ctx) => formatRupiah(ctx.raw) } } },
                scales: { y: { ticks: { callback: val => formatRupiah(val) } } }
            }
        });
    }

    // ==================== PROYEKSI ====================
    async function refreshProjection() {
        const sales = Storage.getSales();
        const last12 = [];
        for (let i = 11; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
            const monthEnd = new Date(d.getFullYear(), d.getMonth()+1, 0).toISOString().split('T')[0];
            const total = sales.filter(s => s.tanggal >= monthStart && s.tanggal <= monthEnd).reduce((sum,s) => sum + (s.qty * s.hargaJual - (s.diskon||0)), 0);
            last12.push(total);
        }
        const n = last12.length;
        const x = Array.from({length:n},(_,i)=>i);
        const sumX = x.reduce((a,b)=>a+b,0);
        const sumY = last12.reduce((a,b)=>a+b,0);
        const sumXY = x.reduce((sum,xi,i) => sum + xi*last12[i],0);
        const sumX2 = x.reduce((sum,xi) => sum + xi*xi,0);
        const slope = (n*sumXY - sumX*sumY) / (n*sumX2 - sumX*sumX);
        const intercept = (sumY - slope*sumX) / n;
        const nextMonth = slope * n + intercept;
        const profit = nextMonth * 0.3;
        if (E.projectionRevenue) E.projectionRevenue.textContent = formatRupiah(Math.max(0, Math.round(nextMonth)));
        if (E.projectionProfit) E.projectionProfit.textContent = formatRupiah(Math.max(0, Math.round(profit)));
        const ctx = E.chartProjection?.getContext('2d');
        if (ctx) {
            if (projectionChart) projectionChart.destroy();
            const labels = [...x.map(i => `Bulan -${12-i}`), 'Proyeksi'];
            const data = [...last12, Math.round(nextMonth)];
            projectionChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels,
                    datasets: [{
                        label: 'Pendapatan', data,
                        borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.1)', tension: 0.3, fill: true,
                        segment: { borderDash: (ctx) => ctx.p0DataIndex >= 12 ? [6,6] : undefined }
                    }]
                },
                options: {
                    responsive: true,
                    plugins: { tooltip: { callbacks: { label: (ctx) => formatRupiah(ctx.raw) } } },
                    scales: { y: { ticks: { callback: val => formatRupiah(val) } } }
                }
            });
        }
    }

    // ==================== RASIO ====================
    async function refreshRatios() {
        if (!E.ratioTableBody) return;
        const { start, end } = getPeriod();
        const sales = Storage.getSales().filter(s => s.tanggal >= start && s.tanggal <= end);
        const expenses = Storage.getExpenses().filter(e => e.tanggal >= start && e.tanggal <= end);
        const pendapatan = sales.reduce((sum,s) => sum + (s.qty * s.hargaJual - (s.diskon||0)), 0);
        const hpp = sales.reduce((sum,s) => sum + (s.qty * s.hpp), 0);
        const beban = expenses.reduce((sum,e) => sum + e.jumlah, 0);
        const labaKotor = pendapatan - hpp;
        const labaBersih = labaKotor - beban;
        const totalAset = Storage.getBatches().reduce((sum,b) => sum + ((b.berat - b.used) * (b.hargaBeli||0)), 0) + labaBersih;
        const totalHutang = 0;
        const ekuitas = totalAset - totalHutang;
        const inventoryTurnover = totalAset > 0 ? (hpp / totalAset).toFixed(2) : 0;
        const currentRatio = totalHutang > 0 ? (totalAset / totalHutang).toFixed(2) : '∞';
        const debtToEquity = ekuitas > 0 ? (totalHutang / ekuitas).toFixed(2) : 0;
        const netMargin = pendapatan > 0 ? ((labaBersih/pendapatan)*100).toFixed(1) : 0;
        const roa = totalAset > 0 ? ((labaBersih/totalAset)*100).toFixed(1) : 0;
        const roe = ekuitas > 0 ? ((labaBersih/ekuitas)*100).toFixed(1) : 0;
        const ratios = [
            ['Margin Laba Bersih', netMargin+'%'],
            ['ROA', roa+'%'],
            ['ROE', roe+'%'],
            ['Rasio Lancar', currentRatio],
            ['Debt to Equity', debtToEquity],
            ['Perputaran Persediaan', inventoryTurnover+' kali']
        ];
        E.ratioTableBody.innerHTML = ratios.map(([n,v]) => `<tr><td class="p-2">${n}</td><td class="p-2 text-right">${v}</td></tr>`).join('');
    }

    // ==================== KALKULATOR PPN ====================
    function calcPPN() {
        const input = parseFloat(E.ppnCalculatorInput?.value) || 0;
        const rate = Storage.getSettings().ppn || 12;
        const ppn = input * rate / 100;
        E.ppnCalculatorResult.textContent = `PPN (${rate}%): ${formatRupiah(ppn)}`;
    }

    // ==================== NOTIFIKASI PAJAK ====================
    async function checkTaxDueNotifications() {
        const settings = Storage.getSettings();
        const taxDueDate = settings.taxDueDate || 15; // tanggal 15 setiap bulan
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const dueThisMonth = new Date(currentYear, currentMonth, taxDueDate);
        const daysLeft = Math.ceil((dueThisMonth - today) / 86400000);
        if (daysLeft <= 7 && daysLeft >= 0) {
            if (E.taxDueNotification) {
                E.taxDueNotification.innerHTML = `⚠️ Jatuh tempo pembayaran pajak bulan ini: ${dueThisMonth.toLocaleDateString('id-ID')} (${daysLeft} hari lagi)`;
                E.taxDueNotification.classList.remove('hidden');
            }
        } else {
            if (E.taxDueNotification) E.taxDueNotification.classList.add('hidden');
        }
    }

    // ==================== EKSPOR ====================
    function exportJurnalExcel() {
        const entries = buildJournalEntries(E.journalStartDate?.value || '1970-01-01', E.journalEndDate?.value || '2099-12-31');
        const data = [['Tanggal','Deskripsi','Akun','Debet','Kredit']];
        entries.forEach(e => data.push([e.tanggal, e.deskripsi, e.akun, e.debet, e.kredit]));
        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Jurnal');
        XLSX.writeFile(wb, 'jurnal.xlsx');
        showToast('Sukses', 'Jurnal diunduh.', 'success');
    }

    function exportFullData() {
        const sales = Storage.getSales();
        const data = [['Tanggal','Klien','Produk','Qty','Harga/kg','Total','Channel','Tier','HPP/kg','Laba']];
        sales.forEach(s => data.push([s.tanggal, s.klien, s.produk, s.qty, s.hargaJual, (s.qty * s.hargaJual - (s.diskon||0)), s.channel, s.tier, s.hpp, (s.hargaJual - s.hpp) * s.qty]));
        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Data Lengkap');
        XLSX.writeFile(wb, 'data_penjualan_lengkap.xlsx');
        showToast('Sukses', 'Data lengkap diunduh.', 'success');
    }

    function exportLabaRugiPDF() {
        const { start, end } = getPeriod();
        const sales = Storage.getSales().filter(s => s.tanggal >= start && s.tanggal <= end);
        const expenses = Storage.getExpenses().filter(e => e.tanggal >= start && e.tanggal <= end);
        const pendapatan = sales.reduce((sum,s) => sum + (s.qty * s.hargaJual - (s.diskon||0)), 0);
        const hpp = sales.reduce((sum,s) => sum + (s.qty * s.hpp), 0);
        const beban = expenses.reduce((sum,e) => sum + e.jumlah, 0);
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.setFontSize(16); doc.text('Laporan Laba Rugi', 15, 20);
        doc.setFontSize(10); let y = 30;
        doc.text(`Periode: ${start} - ${end}`, 15, y); y += 8;
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
        const totalAset = Object.values(stockMap).reduce((a,b) => a + b * 30000, 0);
        const labaBersih = Storage.getSales().reduce((a,s) => a + (s.qty * s.hargaJual - (s.diskon||0)), 0) - Storage.getSales().reduce((a,s) => a + s.qty * s.hpp, 0) - Storage.getExpenses().reduce((a,e) => a + e.jumlah, 0);
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.setFontSize(16); doc.text('Neraca', 15, 20);
        doc.setFontSize(10); let y = 30;
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
        if (E.applyFinancePeriod) E.applyFinancePeriod.addEventListener('click', () => { refreshFinanceOverview(); refreshAnalysis(); renderBudgetVsActualChart(); refreshRatios(); });
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
        if (E.addCoaBtn) E.addCoaBtn.addEventListener('click', addCoA);
        if (E.addBudgetBtn) E.addBudgetBtn.addEventListener('click', addBudget);
        if (E.otherIncomeForm) E.otherIncomeForm.addEventListener('submit', handleAddOtherIncome);
        if (E.ppnCalculatorBtn) E.ppnCalculatorBtn.addEventListener('click', calcPPN);
    }

    // ==================== EXPORT API ====================
    CFS.Accounting = {
        init: initAccounting,
        refresh: refreshFinanceOverview,
        deleteCoA,
        deleteBudget,
    };
})();
