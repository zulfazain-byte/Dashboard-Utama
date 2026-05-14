/* ============================================================
   Cibitung Frozen ERP Ultimate v5.4 — Accounting Module
   Mengelola keuangan, beban operasional, buku besar, laporan
   laba rugi, neraca, grafik tahunan, serta ekspor Excel/PDF.
   ============================================================ */

window.CFS = window.CFS || {};

(function() {
    'use strict';

    const Storage = CFS.Storage;

    // --------------------- CACHE ELEMEN ---------------------
    let elements = {};

    function cacheElements() {
        elements.financeSummaryContainer = document.getElementById('financeSummaryContainer');
        elements.expenseForm = document.getElementById('expenseForm');
        elements.expenseAkun = document.getElementById('expenseAkun');
        elements.expenseJumlah = document.getElementById('expenseJumlah');
        elements.expenseDeskripsi = document.getElementById('expenseDeskripsi');
        elements.exportExcelBtn = document.getElementById('exportExcelBtn');
        elements.viewJournalBtn = document.getElementById('viewJournalBtn');
        elements.exportPDFReportBtn = document.getElementById('exportPDFReportBtn');
        elements.journalViewer = document.getElementById('journalViewer');
        elements.journalTableBody = document.getElementById('journalTableBody');
        elements.chartYearlyPL = document.getElementById('chartYearlyPL');
    }

    // --------------------- HELPER ---------------------------
    function formatRupiah(n) {
        return 'Rp ' + Math.round(n).toLocaleString('id-ID');
    }

    function formatDateID(dateStr) {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    }

    function getMonthStart() {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    }

    function getMonthEnd() {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    }

    /**
     * Mengambil semua transaksi penjualan dan beban dalam rentang tanggal tertentu.
     */
    function getTransactionsInRange(startDate, endDate) {
        const sales = Storage.getSales().filter(s => s.tanggal >= startDate && s.tanggal <= endDate);
        const expenses = Storage.getExpenses().filter(e => e.tanggal >= startDate && e.tanggal <= endDate);
        return { sales, expenses };
    }

    // --------------------- RINGKASAN KEUANGAN ---------------------
    function refreshFinanceSummary() {
        cacheElements();
        if (!elements.financeSummaryContainer) return;

        const { sales, expenses } = getTransactionsInRange(getMonthStart(), getMonthEnd());

        const totalPendapatan = sales.reduce((sum, s) => sum + (s.qty * s.hargaJual), 0);
        const totalHPP = sales.reduce((sum, s) => sum + (s.qty * s.hpp), 0);
        const totalBeban = expenses.reduce((sum, e) => sum + e.jumlah, 0);
        const labaKotor = totalPendapatan - totalHPP;
        const labaBersih = labaKotor - totalBeban;

        elements.financeSummaryContainer.innerHTML = `
            <div class="card p-3 text-center hover-lift">
                <span class="text-xs opacity-60">Pendapatan</span>
                <p class="text-lg font-bold text-green-600">${formatRupiah(totalPendapatan)}</p>
            </div>
            <div class="card p-3 text-center hover-lift">
                <span class="text-xs opacity-60">HPP</span>
                <p class="text-lg font-bold text-red-500">${formatRupiah(totalHPP)}</p>
            </div>
            <div class="card p-3 text-center hover-lift">
                <span class="text-xs opacity-60">Laba Kotor</span>
                <p class="text-lg font-bold text-blue-600">${formatRupiah(labaKotor)}</p>
            </div>
            <div class="card p-3 text-center hover-lift">
                <span class="text-xs opacity-60">Laba Bersih</span>
                <p class="text-lg font-bold text-violet-600">${formatRupiah(labaBersih)}</p>
            </div>
        `;
    }

    // --------------------- BEBAN OPERASIONAL ---------------------
    async function handleAddExpense(e) {
        e.preventDefault();
        cacheElements();

        const akun = elements.expenseAkun?.value;
        const jumlah = parseFloat(elements.expenseJumlah?.value) || 0;
        const deskripsi = elements.expenseDeskripsi?.value || '';

        if (!akun || jumlah <= 0) {
            showToast?.('Error', 'Pilih akun dan masukkan jumlah yang valid.', 'error');
            return;
        }

        const expense = {
            id: 'e' + Date.now(),
            tanggal: new Date().toISOString().split('T')[0],
            akun: akun,
            jumlah: jumlah,
            deskripsi: deskripsi
        };

        await Storage.addExpense(expense);
        showToast?.('Sukses', `Beban ${akun} sebesar ${formatRupiah(jumlah)} berhasil dicatat.`, 'success');
        e.target.reset();
        refreshFinanceSummary();
        if (typeof CFS.App !== 'undefined' && CFS.App.refreshAll) CFS.App.refreshAll();
    }

    // --------------------- BUKU BESAR (JURNAL) ---------------------
    function toggleJournalViewer() {
        cacheElements();
        if (!elements.journalViewer) return;

        const isHidden = elements.journalViewer.classList.contains('hidden');
        if (isHidden) {
            renderJournal();
            elements.journalViewer.classList.remove('hidden');
        } else {
            elements.journalViewer.classList.add('hidden');
        }
    }

    function renderJournal(startDate = null, endDate = null) {
        cacheElements();
        if (!elements.journalTableBody) return;

        const start = startDate || getMonthStart();
        const end = endDate || getMonthEnd();
        const { sales, expenses } = getTransactionsInRange(start, end);

        // Buat jurnal dengan format debet/kredit
        const journalEntries = [];

        sales.forEach(s => {
            journalEntries.push({
                tanggal: s.tanggal,
                deskripsi: `Penjualan ${s.produk} ke ${s.klien}`,
                akun: 'Kas',
                debet: s.qty * s.hargaJual,
                kredit: 0
            });
            journalEntries.push({
                tanggal: s.tanggal,
                deskripsi: `HPP ${s.produk}`,
                akun: 'HPP',
                debet: 0,
                kredit: s.qty * s.hpp
            });
        });

        expenses.forEach(e => {
            journalEntries.push({
                tanggal: e.tanggal,
                deskripsi: e.deskripsi || e.akun,
                akun: e.akun,
                debet: 0,
                kredit: e.jumlah
            });
        });

        // Urutkan berdasarkan tanggal
        journalEntries.sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));

        if (journalEntries.length === 0) {
            elements.journalTableBody.innerHTML = '<tr><td colspan="5" class="text-center p-4 opacity-50">Belum ada transaksi bulan ini.</td></tr>';
            return;
        }

        elements.journalTableBody.innerHTML = journalEntries.map(entry => `
            <tr class="border-t hover:bg-slate-50 dark:hover:bg-slate-800 transition text-sm">
                <td class="p-2">${formatDateID(entry.tanggal)}</td>
                <td class="p-2">${entry.deskripsi}</td>
                <td class="p-2">${entry.akun}</td>
                <td class="p-2 text-right">${entry.debet > 0 ? formatRupiah(entry.debet) : ''}</td>
                <td class="p-2 text-right">${entry.kredit > 0 ? formatRupiah(entry.kredit) : ''}</td>
            </tr>
        `).join('');
    }

    // --------------------- EKSPOR EXCEL ---------------------------
    function exportToExcel() {
        const { sales, expenses } = getTransactionsInRange(getMonthStart(), getMonthEnd());
        const data = [['Tanggal', 'Deskripsi', 'Akun', 'Debet', 'Kredit']];

        sales.forEach(s => {
            data.push([s.tanggal, `Penjualan ${s.produk} ke ${s.klien}`, 'Kas', s.qty * s.hargaJual, 0]);
            data.push([s.tanggal, `HPP ${s.produk}`, 'HPP', 0, s.qty * s.hpp]);
        });
        expenses.forEach(e => {
            data.push([e.tanggal, e.deskripsi || e.akun, e.akun, 0, e.jumlah]);
        });

        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Jurnal');
        XLSX.writeFile(wb, `jurnal_bulan_${new Date().getMonth()+1}_${new Date().getFullYear()}.xlsx`);
        showToast?.('Sukses', 'File Excel berhasil diunduh.', 'success');
    }

    // --------------------- EKSPOR PDF LAPORAN ----------------------
    function exportPDFReport() {
        const { sales, expenses } = getTransactionsInRange(getMonthStart(), getMonthEnd());
        const company = Storage.getCompany();
        const settings = Storage.getSettings();

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

        const totalPendapatan = sales.reduce((sum, s) => sum + (s.qty * s.hargaJual), 0);
        const totalHPP = sales.reduce((sum, s) => sum + (s.qty * s.hpp), 0);
        const totalBeban = expenses.reduce((sum, e) => sum + e.jumlah, 0);
        const labaKotor = totalPendapatan - totalHPP;
        const labaBersih = labaKotor - totalBeban;
        const ppnRate = settings.ppn || 12;
        const dpp = Math.round(totalPendapatan / (1 + ppnRate / 100));
        const ppn = totalPendapatan - dpp;

        let y = 20;
        const leftX = 15;
        const pageWidth = doc.internal.pageSize.getWidth();

        // Header
        doc.setFontSize(18);
        doc.setTextColor(37, 99, 235);
        doc.text('LAPORAN KEUANGAN BULANAN', pageWidth / 2, y, { align: 'center' });
        y += 8;
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`${company.name || 'Cibitung Frozen'} - ${new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`, pageWidth / 2, y, { align: 'center' });

        y += 12;
        doc.setDrawColor(37, 99, 235);
        doc.line(leftX, y, pageWidth - leftX, y);

        // Ringkasan
        y += 10;
        doc.setFontSize(12);
        doc.setTextColor(30);
        doc.text('Ringkasan', leftX, y);
        y += 8;
        doc.setFontSize(10);
        const summaryData = [
            ['Pendapatan', formatRupiah(totalPendapatan)],
            ['HPP', formatRupiah(totalHPP)],
            ['Laba Kotor', formatRupiah(labaKotor)],
            ['Beban Operasional', formatRupiah(totalBeban)],
            ['Laba Bersih', formatRupiah(labaBersih)],
            ['DPP', formatRupiah(dpp)],
            [`PPN (${ppnRate}%)`, formatRupiah(ppn)],
        ];
        summaryData.forEach(row => {
            doc.text(row[0], leftX + 5, y);
            doc.text(row[1], pageWidth - leftX - 5, y, { align: 'right' });
            y += 6;
        });

        // Detail penjualan
        y += 5;
        doc.setDrawColor(200);
        doc.line(leftX, y, pageWidth - leftX, y);
        y += 8;
        doc.setFontSize(12);
        doc.setTextColor(30);
        doc.text('Detail Penjualan', leftX, y);
        y += 7;
        doc.setFontSize(9);
        if (sales.length === 0) {
            doc.text('Tidak ada penjualan bulan ini.', leftX + 5, y);
            y += 6;
        } else {
            sales.forEach(s => {
                doc.text(`${formatDateID(s.tanggal)} - ${s.klien} (${s.produk} ${s.qty}kg)`, leftX + 5, y);
                doc.text(formatRupiah(s.qty * s.hargaJual), pageWidth - leftX - 5, y, { align: 'right' });
                y += 5;
            });
        }

        // Detail beban
        y += 5;
        doc.setDrawColor(200);
        doc.line(leftX, y, pageWidth - leftX, y);
        y += 8;
        doc.setFontSize(12);
        doc.text('Detail Beban', leftX, y);
        y += 7;
        doc.setFontSize(9);
        if (expenses.length === 0) {
            doc.text('Tidak ada beban bulan ini.', leftX + 5, y);
        } else {
            expenses.forEach(e => {
                doc.text(`${formatDateID(e.tanggal)} - ${e.akun}: ${e.deskripsi || ''}`, leftX + 5, y);
                doc.text(formatRupiah(e.jumlah), pageWidth - leftX - 5, y, { align: 'right' });
                y += 5;
            });
        }

        // Footer
        y = doc.internal.pageSize.getHeight() - 20;
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Dibuat oleh ${company.name || 'Cibitung Frozen'} ERP Ultimate v5.4 - ${new Date().toLocaleString('id-ID')}`, pageWidth / 2, y, { align: 'center' });

        doc.save(`Laporan_Keuangan_${new Date().toISOString().slice(0,7)}.pdf`);
        showToast?.('Sukses', 'Laporan PDF berhasil diunduh.', 'success');
    }

    // --------------------- GRAFIK TAHUNAN -------------------------
    let yearlyChartInstance = null;

    function renderYearlyChart() {
        cacheElements();
        const ctx = elements.chartYearlyPL?.getContext('2d');
        if (!ctx) return;

        const currentYear = new Date().getFullYear();
        const sales = Storage.getSales().filter(s => s.tanggal.startsWith(currentYear));
        const expenses = Storage.getExpenses().filter(e => e.tanggal.startsWith(currentYear));

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        const revenueData = Array(12).fill(0);
        const expenseData = Array(12).fill(0);

        sales.forEach(s => {
            const month = new Date(s.tanggal).getMonth();
            revenueData[month] += s.qty * s.hargaJual;
        });
        expenses.forEach(e => {
            const month = new Date(e.tanggal).getMonth();
            expenseData[month] += e.jumlah;
        });

        if (yearlyChartInstance) {
            yearlyChartInstance.destroy();
        }

        yearlyChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [
                    {
                        label: 'Pendapatan',
                        data: revenueData,
                        backgroundColor: '#22c55e',
                        borderRadius: 4,
                    },
                    {
                        label: 'Beban',
                        data: expenseData,
                        backgroundColor: '#ef4444',
                        borderRadius: 4,
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.dataset.label}: ${formatRupiah(ctx.raw)}`
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            callback: (val) => formatRupiah(val)
                        }
                    }
                }
            }
        });
    }

    // --------------------- INISIALISASI ---------------------------
    function bindEvents() {
        cacheElements();

        if (elements.expenseForm) {
            elements.expenseForm.addEventListener('submit', handleAddExpense);
        }

        if (elements.viewJournalBtn) {
            elements.viewJournalBtn.addEventListener('click', toggleJournalViewer);
        }

        if (elements.exportExcelBtn) {
            elements.exportExcelBtn.addEventListener('click', exportToExcel);
        }

        if (elements.exportPDFReportBtn) {
            elements.exportPDFReportBtn.addEventListener('click', exportPDFReport);
        }
    }

    function initAccounting() {
        cacheElements();
        refreshFinanceSummary();
        renderYearlyChart();
        bindEvents();
        // Tutup buku besar awalnya
        if (elements.journalViewer) {
            elements.journalViewer.classList.add('hidden');
        }
    }

    // Expose API
    CFS.Accounting = {
        init: initAccounting,
        refreshFinanceSummary,
        renderYearlyChart,
        toggleJournalViewer,
        exportToExcel,
        exportPDFReport,
        formatRupiah,
        formatDateID
    };

})();
