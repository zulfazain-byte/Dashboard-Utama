/* ============================================================
   Cibitung Frozen ERP Ultimate v5.4 — Finance Module (Upgrade)
   ============================================================ */
window.CFS = window.CFS || {};

(function() {
    'use strict';
    const Storage = CFS.Storage;

    // Chart instances
    let monthlyPLChart = null;
    let expenseCompositionChart = null;
    let marginPerProductChart = null;
    let cashflowChart = null;

    // Pagination state
    let journalPage = 1;
    const journalPerPage = 50;

    function initFinanceTab() {
        cacheFinanceElements();
        setupFinanceSubTabs();
        setupExpenseForm();
        setupJournalFilters();
        setupCashflowFilters();
        setupExportButtons();
        
        // Set default dates
        const today = new Date();
        if (elements.journalStartDate) elements.journalStartDate.value = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        if (elements.journalEndDate) elements.journalEndDate.value = today.toISOString().split('T')[0];
        if (elements.expenseTanggal) elements.expenseTanggal.value = today.toISOString().split('T')[0];
        if (elements.cashflowMonth) elements.cashflowMonth.value = today.getMonth();
        
        refreshFinanceOverview();
        renderRecentExpenses();
        renderJournal();
        refreshCashflow();
        refreshAnalysis();
    }

    // Cache semua elemen
    let elements = {};
    function cacheFinanceElements() {
        elements = {
            // Ringkasan
            finPendapatan: document.getElementById('finPendapatan'),
            finHPP: document.getElementById('finHPP'),
            finLabaKotor: document.getElementById('finLabaKotor'),
            finBeban: document.getElementById('finBeban'),
            finLabaBersih: document.getElementById('finLabaBersih'),
            
            // Expense form
            expenseForm: document.getElementById('expenseForm'),
            expenseAkun: document.getElementById('expenseAkun'),
            expenseJumlah: document.getElementById('expenseJumlah'),
            expenseTanggal: document.getElementById('expenseTanggal'),
            expenseDeskripsi: document.getElementById('expenseDeskripsi'),
            recentExpensesList: document.getElementById('recentExpensesList'),
            
            // Journal
            journalStartDate: document.getElementById('journalStartDate'),
            journalEndDate: document.getElementById('journalEndDate'),
            journalFilterAkun: document.getElementById('journalFilterAkun'),
            applyJournalFilter: document.getElementById('applyJournalFilter'),
            exportJournalExcel: document.getElementById('exportJournalExcel'),
            journalTableBody: document.getElementById('journalTableBody'),
            journalShowingInfo: document.getElementById('journalShowingInfo'),
            loadMoreJournal: document.getElementById('loadMoreJournal'),
            
            // Cashflow
            cashflowMonth: document.getElementById('cashflowMonth'),
            cashflowYear: document.getElementById('cashflowYear'),
            applyCashflowFilter: document.getElementById('applyCashflowFilter'),
            cfKasMasuk: document.getElementById('cfKasMasuk'),
            cfKasKeluar: document.getElementById('cfKasKeluar'),
            cfSaldoBersih: document.getElementById('cfSaldoBersih'),
            
            // Analysis
            anaMarginKotor: document.getElementById('anaMarginKotor'),
            anaMarginBersih: document.getElementById('anaMarginBersih'),
            anaRasioBeban: document.getElementById('anaRasioBeban'),
            analysisRecommendations: document.getElementById('analysisRecommendations'),
            
            // Export buttons
            exportFinanceExcelBtn: document.getElementById('exportFinanceExcelBtn'),
            exportFinanceFullExcelBtn: document.getElementById('exportFinanceFullExcelBtn'),
            exportFinancePDFBtn: document.getElementById('exportFinancePDFBtn'),
            exportFinanceNeracaPDFBtn: document.getElementById('exportFinanceNeracaPDFBtn'),
        };
    }

    // Setup sub-tab navigasi
    function setupFinanceSubTabs() {
        document.querySelectorAll('.finance-subtab-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.finance-subtab-btn').forEach(b => {
                    b.classList.remove('btn-primary', 'active');
                    b.classList.add('btn-secondary');
                });
                this.classList.add('btn-primary', 'active');
                this.classList.remove('btn-secondary');
                
                document.querySelectorAll('.finance-subtab-content').forEach(c => c.classList.add('hidden'));
                const targetId = this.dataset.financeTab;
                const target = document.getElementById(targetId);
                if (target) target.classList.remove('hidden');
                
                // Refresh konten sesuai sub-tab
                if (targetId === 'finance-overview') refreshFinanceOverview();
                if (targetId === 'finance-expense') renderRecentExpenses();
                if (targetId === 'finance-journal') renderJournal();
                if (targetId === 'finance-cashflow') refreshCashflow();
                if (targetId === 'finance-analysis') refreshAnalysis();
            });
        });
    }

    // ==================== RINGKASAN KEUANGAN ====================
    function refreshFinanceOverview() {
        const today = new Date();
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        const monthEnd = today.toISOString().split('T')[0];
        
        const sales = Storage.getSales().filter(s => s.tanggal >= monthStart && s.tanggal <= monthEnd);
        const expenses = Storage.getExpenses().filter(e => e.tanggal >= monthStart && e.tanggal <= monthEnd);
        
        const totalPendapatan = sales.reduce((sum, s) => sum + (s.qty * s.hargaJual), 0);
        const totalHPP = sales.reduce((sum, s) => sum + (s.qty * s.hpp), 0);
        const totalBeban = expenses.reduce((sum, e) => sum + e.jumlah, 0);
        const labaKotor = totalPendapatan - totalHPP;
        const labaBersih = labaKotor - totalBeban;
        
        if (elements.finPendapatan) elements.finPendapatan.textContent = formatRupiah(totalPendapatan);
        if (elements.finHPP) elements.finHPP.textContent = formatRupiah(totalHPP);
        if (elements.finLabaKotor) elements.finLabaKotor.textContent = formatRupiah(labaKotor);
        if (elements.finBeban) elements.finBeban.textContent = formatRupiah(totalBeban);
        if (elements.finLabaBersih) elements.finLabaBersih.textContent = formatRupiah(labaBersih);
        
        renderMonthlyPLChart();
        renderExpenseCompositionChart(expenses);
        renderMarginPerProductChart(sales);
    }

    function renderMonthlyPLChart() {
        const ctx = document.getElementById('chartFinanceMonthlyPL')?.getContext('2d');
        if (!ctx) return;
        
        const currentYear = new Date().getFullYear();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        const revenueData = Array(12).fill(0);
        const expenseData = Array(12).fill(0);
        const profitData = Array(12).fill(0);
        
        Storage.getSales().forEach(s => {
            const d = new Date(s.tanggal);
            if (d.getFullYear() === currentYear) {
                revenueData[d.getMonth()] += s.qty * s.hargaJual;
                profitData[d.getMonth()] += (s.qty * s.hargaJual) - (s.qty * s.hpp);
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
                scales: { y: { ticks: { callback: (val) => formatRupiah(val) } } }
            }
        });
    }

    function renderExpenseCompositionChart(expenses) {
        const ctx = document.getElementById('chartExpenseComposition')?.getContext('2d');
        if (!ctx) return;
        
        const composition = {};
        expenses.forEach(e => {
            composition[e.akun] = (composition[e.akun] || 0) + e.jumlah;
        });
        
        const labels = Object.keys(composition);
        const data = Object.values(composition);
        const colors = ['#ef4444','#f59e0b','#3b82f6','#22c55e','#8b5cf6','#ec4899','#14b8a6','#f97316','#6366f1','#84cc16'];
        
        if (expenseCompositionChart) expenseCompositionChart.destroy();
        if (labels.length === 0) return;
        expenseCompositionChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{ data: data, backgroundColor: colors.slice(0, labels.length) }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${formatRupiah(ctx.raw)}` } }
                }
            }
        });
    }

    function renderMarginPerProductChart(sales) {
        const ctx = document.getElementById('chartMarginPerProduct')?.getContext('2d');
        if (!ctx) return;
        
        const marginMap = {};
        sales.forEach(s => {
            if (!marginMap[s.produk]) marginMap[s.produk] = { revenue: 0, hpp: 0 };
            marginMap[s.produk].revenue += s.qty * s.hargaJual;
            marginMap[s.produk].hpp += s.qty * s.hpp;
        });
        
        const entries = Object.entries(marginMap).sort((a,b) => (b[1].revenue - b[1].hpp) - (a[1].revenue - a[1].hpp)).slice(0, 8);
        
        if (marginPerProductChart) marginPerProductChart.destroy();
        if (entries.length === 0) return;
        marginPerProductChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: entries.map(([p]) => p),
                datasets: [{
                    label: 'Margin (Rp)',
                    data: entries.map(([,d]) => d.revenue - d.hpp),
                    backgroundColor: entries.map(([,d]) => (d.revenue - d.hpp) < 0 ? '#ef4444' : '#22c55e'),
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => formatRupiah(ctx.raw) } } },
                scales: { y: { ticks: { callback: (val) => formatRupiah(val) } } }
            }
        });
    }

    // ==================== BEBAN ====================
    function setupExpenseForm() {
        if (!elements.expenseForm || elements.expenseForm.dataset.listener) return;
        elements.expenseForm.dataset.listener = 'true';
        
        elements.expenseForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const akun = elements.expenseAkun?.value;
            const jumlah = parseFloat(elements.expenseJumlah?.value) || 0;
            const tanggal = elements.expenseTanggal?.value || new Date().toISOString().split('T')[0];
            const deskripsi = elements.expenseDeskripsi?.value || '';
            
            if (!akun || jumlah <= 0) {
                showToast('Error', 'Pilih akun dan masukkan jumlah yang valid.', 'error');
                return;
            }
            
            await Storage.addExpense({ id: 'e' + Date.now(), tanggal, akun, jumlah, deskripsi });
            showToast('Sukses', `Beban ${akun} sebesar ${formatRupiah(jumlah)} dicatat.`, 'success');
            elements.expenseForm.reset();
            elements.expenseTanggal.value = new Date().toISOString().split('T')[0];
            renderRecentExpenses();
            refreshFinanceOverview();
        });
    }

    function renderRecentExpenses() {
        if (!elements.recentExpensesList) return;
        const expenses = Storage.getExpenses().slice(-10).reverse();
        if (expenses.length === 0) {
            elements.recentExpensesList.innerHTML = '<p class="opacity-50 text-sm">Belum ada beban tercatat.</p>';
            return;
        }
        elements.recentExpensesList.innerHTML = expenses.map(e => `
            <div class="flex justify-between py-2 border-b last:border-0 text-sm">
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
    function setupJournalFilters() {
        if (elements.applyJournalFilter) {
            elements.applyJournalFilter.addEventListener('click', () => { journalPage = 1; renderJournal(); });
        }
        if (elements.loadMoreJournal) {
            elements.loadMoreJournal.addEventListener('click', () => { journalPage++; renderJournal(false); });
        }
    }

    function renderJournal(resetPage = true) {
        if (!elements.journalTableBody) return;
        if (resetPage) journalPage = 1;
        
        const startDate = elements.journalStartDate?.value || '1970-01-01';
        const endDate = elements.journalEndDate?.value || '2099-12-31';
        const filterAkun = elements.journalFilterAkun?.value || '';
        
        const sales = Storage.getSales().filter(s => s.tanggal >= startDate && s.tanggal <= endDate);
        const expenses = Storage.getExpenses().filter(e => e.tanggal >= startDate && e.tanggal <= endDate);
        
        const entries = [];
        sales.forEach(s => {
            entries.push({ tanggal: s.tanggal, deskripsi: `Penjualan ${s.produk} ke ${s.klien}`, akun: 'Kas', debet: s.qty * s.hargaJual, kredit: 0 });
            entries.push({ tanggal: s.tanggal, deskripsi: `HPP ${s.produk}`, akun: 'HPP', debet: 0, kredit: s.qty * s.hpp });
        });
        expenses.forEach(e => {
            entries.push({ tanggal: e.tanggal, deskripsi: e.deskripsi || e.akun, akun: e.akun, debet: 0, kredit: e.jumlah });
        });
        
        entries.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
        
        let filtered = filterAkun ? entries.filter(e => e.akun === filterAkun) : entries;
        const totalPages = Math.ceil(filtered.length / journalPerPage);
        const pageEntries = filtered.slice(0, journalPage * journalPerPage);
        
        elements.journalTableBody.innerHTML = pageEntries.length === 0
            ? '<tr><td colspan="5" class="text-center p-4 opacity-50">Tidak ada jurnal.</td></tr>'
            : pageEntries.map(e => `
                <tr class="border-t hover:bg-slate-50 dark:hover:bg-slate-700">
                    <td class="p-2">${e.tanggal}</td>
                    <td class="p-2">${e.deskripsi}</td>
                    <td class="p-2">${e.akun}</td>
                    <td class="p-2 text-right">${e.debet > 0 ? formatRupiah(e.debet) : ''}</td>
                    <td class="p-2 text-right">${e.kredit > 0 ? formatRupiah(e.kredit) : ''}</td>
                </tr>
            `).join('');
        
        if (elements.journalShowingInfo) elements.journalShowingInfo.textContent = `Menampilkan ${pageEntries.length} dari ${filtered.length} entri`;
        if (elements.loadMoreJournal) elements.loadMoreJournal.classList.toggle('hidden', journalPage >= totalPages);
        
        // Export Excel
        if (elements.exportJournalExcel && !elements.exportJournalExcel.dataset.listener) {
            elements.exportJournalExcel.dataset.listener = 'true';
            elements.exportJournalExcel.addEventListener('click', () => {
                const data = [['Tanggal','Deskripsi','Akun','Debet','Kredit']];
                filtered.forEach(e => data.push([e.tanggal, e.deskripsi, e.akun, e.debet || '', e.kredit || '']));
                const ws = XLSX.utils.aoa_to_sheet(data);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Jurnal');
                XLSX.writeFile(wb, `jurnal_${startDate}_${endDate}.xlsx`);
                showToast('Sukses', 'Jurnal diunduh sebagai Excel.', 'success');
            });
        }
    }

    // ==================== ARUS KAS ====================
    function setupCashflowFilters() {
        if (elements.applyCashflowFilter) {
            elements.applyCashflowFilter.addEventListener('click', refreshCashflow);
        }
    }

    function refreshCashflow() {
        const month = parseInt(elements.cashflowMonth?.value) || new Date().getMonth();
        const year = parseInt(elements.cashflowYear?.value) || new Date().getFullYear();
        
        const startDate = `${year}-${String(month+1).padStart(2,'0')}-01`;
        const endDate = new Date(year, month+1, 0).toISOString().split('T')[0];
        
        const sales = Storage.getSales().filter(s => s.tanggal >= startDate && s.tanggal <= endDate);
        const expenses = Storage.getExpenses().filter(e => e.tanggal >= startDate && e.tanggal <= endDate);
        
        const kasMasuk = sales.reduce((sum, s) => sum + (s.qty * s.hargaJual), 0);
        const kasKeluar = expenses.reduce((sum, e) => sum + e.jumlah, 0);
        const saldoBersih = kasMasuk - kasKeluar;
        
        if (elements.cfKasMasuk) elements.cfKasMasuk.textContent = formatRupiah(kasMasuk);
        if (elements.cfKasKeluar) elements.cfKasKeluar.textContent = formatRupiah(kasKeluar);
        if (elements.cfSaldoBersih) elements.cfSaldoBersih.textContent = formatRupiah(saldoBersih);
        
        renderCashflowChart(sales, expenses, startDate, endDate);
    }

    function renderCashflowChart(sales, expenses, startDate, endDate) {
        const ctx = document.getElementById('chartCashflow')?.getContext('2d');
        if (!ctx) return;
        
        const dateMap = {};
        const start = new Date(startDate);
        const end = new Date(endDate);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            dateMap[d.toISOString().split('T')[0]] = { masuk: 0, keluar: 0 };
        }
        sales.forEach(s => { if (dateMap[s.tanggal]) dateMap[s.tanggal].masuk += s.qty * s.hargaJual; });
        expenses.forEach(e => { if (dateMap[e.tanggal]) dateMap[e.tanggal].keluar += e.jumlah; });
        
        const labels = Object.keys(dateMap).sort();
        const masukData = labels.map(l => dateMap[l].masuk);
        const keluarData = labels.map(l => dateMap[l].keluar);
        
        if (cashflowChart) cashflowChart.destroy();
        cashflowChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels.map(l => new Date(l).toLocaleDateString('id-ID', { day:'numeric', month:'short' })),
                datasets: [
                    { label: 'Kas Masuk', data: masukData, borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.1)', tension: 0.3, fill: true },
                    { label: 'Kas Keluar', data: keluarData, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', tension: 0.3, fill: true }
                ]
            },
            options: {
                responsive: true,
                plugins: { tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatRupiah(ctx.raw)}` } } },
                scales: { y: { ticks: { callback: (val) => formatRupiah(val) } } }
            }
        });
    }

    // ==================== ANALISIS ====================
    function refreshAnalysis() {
        const today = new Date();
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        const sales = Storage.getSales().filter(s => s.tanggal >= monthStart);
        const expenses = Storage.getExpenses().filter(e => e.tanggal >= monthStart);
        
        const pendapatan = sales.reduce((sum, s) => sum + (s.qty * s.hargaJual), 0);
        const hpp = sales.reduce((sum, s) => sum + (s.qty * s.hpp), 0);
        const beban = expenses.reduce((sum, e) => sum + e.jumlah, 0);
        const labaKotor = pendapatan - hpp;
        const labaBersih = labaKotor - beban;
        
        const marginKotor = pendapatan > 0 ? ((labaKotor / pendapatan) * 100).toFixed(1) : 0;
        const marginBersih = pendapatan > 0 ? ((labaBersih / pendapatan) * 100).toFixed(1) : 0;
        const rasioBeban = pendapatan > 0 ? ((beban / pendapatan) * 100).toFixed(1) : 0;
        
        if (elements.anaMarginKotor) elements.anaMarginKotor.textContent = marginKotor + '%';
        if (elements.anaMarginBersih) elements.anaMarginBersih.textContent = marginBersih + '%';
        if (elements.anaRasioBeban) elements.anaRasioBeban.textContent = rasioBeban + '%';
        
        // Rekomendasi
        if (elements.analysisRecommendations) {
            let recs = [];
            if (marginBersih < 10) recs.push('Margin laba bersih rendah. Pertimbangkan untuk menaikkan harga jual atau menekan biaya operasional.');
            if (rasioBeban > 40) recs.push('Rasio beban terlalu tinggi (>40%). Lakukan audit pengeluaran untuk menemukan area penghematan.');
            if (marginKotor > 30) recs.push('Margin laba kotor sehat (>30%). Pertahankan strategi pricing dan efisiensi pembelian.');
            if (pendapatan === 0) recs.push('Belum ada pendapatan bulan ini. Fokus pada penjualan dan pemasaran.');
            if (recs.length === 0) recs.push('Kinerja keuangan dalam kondisi baik. Lanjutkan monitoring rutin.');
            elements.analysisRecommendations.innerHTML = recs.map(r => `<li>${r}</li>`).join('');
        }
    }

    // ==================== EKSPOR ====================
    function setupExportButtons() {
        if (elements.exportFinanceExcelBtn) {
            elements.exportFinanceExcelBtn.addEventListener('click', () => {
                const sales = Storage.getSales();
                const expenses = Storage.getExpenses();
                const data = [['Tanggal','Deskripsi','Akun','Debet','Kredit']];
                sales.forEach(s => {
                    data.push([s.tanggal, `Penjualan ${s.produk} ke ${s.klien}`, 'Kas', s.qty * s.hargaJual, 0]);
                    data.push([s.tanggal, `HPP ${s.produk}`, 'HPP', 0, s.qty * s.hpp]);
                });
                expenses.forEach(e => data.push([e.tanggal, e.deskripsi || e.akun, e.akun, 0, e.jumlah]));
                const ws = XLSX.utils.aoa_to_sheet(data);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Jurnal');
                XLSX.writeFile(wb, `jurnal_keuangan.xlsx`);
                showToast('Sukses', 'Excel diunduh.', 'success');
            });
        }
        
        if (elements.exportFinanceFullExcelBtn) {
            elements.exportFinanceFullExcelBtn.addEventListener('click', () => {
                const sales = Storage.getSales();
                const data = [['Tanggal','Klien','Produk','Qty','Harga/kg','Total','Channel','Tier','HPP/kg','Laba']];
                sales.forEach(s => data.push([s.tanggal, s.klien, s.produk, s.qty, s.hargaJual, s.qty*s.hargaJual, s.channel, s.tier, s.hpp, (s.hargaJual-s.hpp)*s.qty]));
                const ws = XLSX.utils.aoa_to_sheet(data);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Penjualan');
                XLSX.writeFile(wb, `data_penjualan_lengkap.xlsx`);
                showToast('Sukses', 'Excel lengkap diunduh.', 'success');
            });
        }
        
        if (elements.exportFinancePDFBtn) {
            elements.exportFinancePDFBtn.addEventListener('click', () => {
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                const sales = Storage.getSales();
                const expenses = Storage.getExpenses();
                const pendapatan = sales.reduce((a,s) => a+s.qty*s.hargaJual, 0);
                const hpp = sales.reduce((a,s) => a+s.qty*s.hpp, 0);
                const beban = expenses.reduce((a,e) => a+e.jumlah, 0);
                
                doc.setFontSize(16);
                doc.text('Laporan Laba Rugi', 20, 20);
                doc.setFontSize(12);
                doc.text(`Pendapatan: ${formatRupiah(pendapatan)}`, 20, 35);
                doc.text(`HPP: ${formatRupiah(hpp)}`, 20, 45);
                doc.text(`Laba Kotor: ${formatRupiah(pendapatan-hpp)}`, 20, 55);
                doc.text(`Beban: ${formatRupiah(beban)}`, 20, 65);
                doc.text(`Laba Bersih: ${formatRupiah(pendapatan-hpp-beban)}`, 20, 75);
                doc.save(`laba_rugi.pdf`);
                showToast('Sukses', 'PDF diunduh.', 'success');
            });
        }
        
        if (elements.exportFinanceNeracaPDFBtn) {
            elements.exportFinanceNeracaPDFBtn.addEventListener('click', () => {
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                const stockMap = CFS.Inventory?.getStockPerProduct() || {};
                const totalAset = Object.values(stockMap).reduce((a,b) => a+b*30000, 0);
                const labaBersih = Storage.getSales().reduce((a,s) => a+s.qty*s.hargaJual,0) - Storage.getSales().reduce((a,s) => a+s.qty*s.hpp,0) - Storage.getExpenses().reduce((a,e) => a+e.jumlah,0);
                
                doc.setFontSize(16);
                doc.text('Neraca', 20, 20);
                doc.setFontSize(12);
                doc.text(`Aset (Stok): ${formatRupiah(totalAset)}`, 20, 35);
                doc.text(`Kas: ${formatRupiah(labaBersih)}`, 20, 45);
                doc.text(`Total Aset: ${formatRupiah(totalAset+labaBersih)}`, 20, 55);
                doc.text(`Kewajiban: Rp 0`, 20, 70);
                doc.text(`Ekuitas: ${formatRupiah(totalAset+labaBersih)}`, 20, 80);
                doc.save(`neraca.pdf`);
                showToast('Sukses', 'PDF diunduh.', 'success');
            });
        }
    }

    function formatRupiah(n) {
        return 'Rp ' + Math.round(n).toLocaleString('id-ID');
    }

    CFS.Accounting = CFS.Accounting || {};
    CFS.Accounting.init = initFinanceTab;
    CFS.Accounting.refreshFinanceSummary = refreshFinanceOverview;
    CFS.Accounting.renderYearlyChart = renderMonthlyPLChart;
})();
