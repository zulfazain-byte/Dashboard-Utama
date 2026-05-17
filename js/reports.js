/* ============================================================
   Cibitung Frozen ERP Ultimate v5.4 — Reports Module
   Mengisi semua laporan di tab Laporan (Upgrade Kompleks)
   ============================================================ */
window.CFS = window.CFS || {};

(function() {
    'use strict';
    const Storage = CFS.Storage;

    // Instance grafik
    let dailyChartInstance = null;

    function initReportsTab() {
        // Elemen filter
        const startDateEl = document.getElementById('reportStartDate');
        const endDateEl = document.getElementById('reportEndDate');
        const channelFilterEl = document.getElementById('reportChannelFilter');
        const productFilterEl = document.getElementById('reportProductFilter');
        const applyBtn = document.getElementById('applyReportFilter');
        const exportExcelBtn = document.getElementById('exportReportExcel');
        const exportPDFBtn = document.getElementById('exportReportPDF');
        const filterInfoEl = document.getElementById('reportFilterInfo');

        // Isi dropdown produk
        function populateProductFilter() {
            if (!productFilterEl) return;
            const prods = Storage.getProducts();
            const list = prods.length ? prods.map(p => p.name) : Storage.defaultProducts;
            productFilterEl.innerHTML = '<option value="all">Semua</option>' + list.map(p => `<option value="${p}">${p}</option>`).join('');
        }
        populateProductFilter();

        // Set default tanggal
        if (startDateEl && !startDateEl.value) {
            const sales = Storage.getSales();
            startDateEl.value = sales.length ? sales[0].tanggal : new Date().toISOString().split('T')[0];
        }
        if (endDateEl && !endDateEl.value) endDateEl.value = new Date().toISOString().split('T')[0];

        // Render semua laporan
        function renderReports() {
            const startDate = startDateEl?.value || '1970-01-01';
            const endDate = endDateEl?.value || '2099-12-31';
            const channel = channelFilterEl?.value || 'all';
            const produk = productFilterEl?.value || 'all';

            let sales = Storage.getSales().filter(s => s.tanggal >= startDate && s.tanggal <= endDate);
            let expenses = Storage.getExpenses().filter(e => e.tanggal >= startDate && e.tanggal <= endDate);

            if (channel !== 'all') sales = sales.filter(s => s.channel === channel);
            if (produk !== 'all') sales = sales.filter(s => s.produk === produk);

            if (filterInfoEl) filterInfoEl.textContent = `Menampilkan ${sales.length} penjualan & ${expenses.length} beban. Periode: ${startDate} s/d ${endDate}`;

            // Hitung ringkasan
            const totalPendapatan = sales.reduce((sum, s) => sum + (s.qty * s.hargaJual), 0);
            const totalHPP = sales.reduce((sum, s) => sum + (s.qty * s.hpp), 0);
            const totalBeban = expenses.reduce((sum, e) => sum + e.jumlah, 0);
            const labaKotor = totalPendapatan - totalHPP;
            const labaBersih = labaKotor - totalBeban;

            // Ringkasan 5 kartu
            document.getElementById('rptPendapatan').textContent = 'Rp ' + totalPendapatan.toLocaleString('id-ID');
            document.getElementById('rptHPP').textContent = 'Rp ' + totalHPP.toLocaleString('id-ID');
            document.getElementById('rptLabaKotor').textContent = 'Rp ' + labaKotor.toLocaleString('id-ID');
            document.getElementById('rptBeban').textContent = 'Rp ' + totalBeban.toLocaleString('id-ID');
            document.getElementById('rptLabaBersih').textContent = 'Rp ' + labaBersih.toLocaleString('id-ID');

            // Laba Rugi Detail
            const detailLR = document.getElementById('reportDetailLabaRugi');
            if (detailLR) {
                detailLR.innerHTML = `
                    <tr class="border-t"><td class="p-2">Pendapatan Kotor</td><td class="p-2 text-right">Rp ${totalPendapatan.toLocaleString('id-ID')}</td></tr>
                    <tr><td class="p-2">HPP</td><td class="p-2 text-right">Rp ${totalHPP.toLocaleString('id-ID')}</td></tr>
                    <tr class="font-semibold"><td class="p-2">Laba Kotor</td><td class="p-2 text-right">Rp ${labaKotor.toLocaleString('id-ID')}</td></tr>
                    <tr><td class="p-2">Beban Operasional</td><td class="p-2 text-right">Rp ${totalBeban.toLocaleString('id-ID')}</td></tr>
                    <tr class="font-semibold text-green-600"><td class="p-2">Laba Bersih</td><td class="p-2 text-right">Rp ${labaBersih.toLocaleString('id-ID')}</td></tr>
                `;
            }

            // Neraca
            const neracaTable = document.getElementById('reportNeracaTable');
            if (neracaTable) {
                const stockMap = CFS.Inventory?.getStockPerProduct() || {};
                const totalAset = Object.values(stockMap).reduce((sum, stok) => sum + (stok * 30000), 0);
                neracaTable.innerHTML = `
                    <tr><td class="p-2 font-semibold">Aset</td><td class="p-2 text-right"></td></tr>
                    <tr><td class="p-2 pl-6">Stok (estimasi)</td><td class="p-2 text-right">Rp ${totalAset.toLocaleString('id-ID')}</td></tr>
                    <tr><td class="p-2 pl-6">Kas (Laba Bersih)</td><td class="p-2 text-right">Rp ${labaBersih.toLocaleString('id-ID')}</td></tr>
                    <tr><td class="p-2 font-semibold">Kewajiban</td><td class="p-2 text-right">Rp 0</td></tr>
                    <tr><td class="p-2 font-semibold">Ekuitas</td><td class="p-2 text-right">Rp ${(totalAset + labaBersih).toLocaleString('id-ID')}</td></tr>
                `;
            }

            // Channel
            const channelTable = document.getElementById('reportChannelTable');
            if (channelTable) {
                const chMap = {};
                sales.forEach(s => {
                    const name = s.channel === 'online' ? '🌐 Online' : '🏪 Offline';
                    if (!chMap[name]) chMap[name] = { trx: 0, total: 0 };
                    chMap[name].trx++;
                    chMap[name].total += s.qty * s.hargaJual;
                });
                channelTable.innerHTML = Object.entries(chMap).map(([k, v]) => `<tr class="border-t"><td class="p-2">${k}</td><td class="p-2 text-right">${v.trx}</td><td class="p-2 text-right">Rp ${v.total.toLocaleString('id-ID')}</td></tr>`).join('') || '<tr><td colspan="3" class="text-center p-4 opacity-50">-</td></tr>';
            }

            // Top Produk
            const topProdTable = document.getElementById('reportTopProducts');
            if (topProdTable) {
                const prodMap = {};
                sales.forEach(s => { if (!prodMap[s.produk]) prodMap[s.produk] = { qty: 0, rev: 0 }; prodMap[s.produk].qty += s.qty; prodMap[s.produk].rev += s.qty * s.hargaJual; });
                const sorted = Object.entries(prodMap).sort((a, b) => b[1].rev - a[1].rev).slice(0, 5);
                topProdTable.innerHTML = sorted.map(([p, d]) => `<tr class="border-t"><td class="p-2">${p}</td><td class="p-2 text-right">${d.qty} kg</td><td class="p-2 text-right">Rp ${d.rev.toLocaleString('id-ID')}</td></tr>`).join('') || '<tr><td colspan="3" class="text-center p-4 opacity-50">-</td></tr>';
            }

            // Stok per Gudang
            const stokGudangTable = document.getElementById('reportStokGudang');
            if (stokGudangTable) {
                const gMap = {};
                Storage.getBatches().forEach(b => {
                    if (!gMap[b.produk]) gMap[b.produk] = { utama: 0, cold: 0 };
                    if (b.warehouse === 'gudang_utama') gMap[b.produk].utama += (b.berat - b.used);
                    else gMap[b.produk].cold += (b.berat - b.used);
                });
                const prods = Storage.getProducts().length ? Storage.getProducts().map(p => p.name) : Storage.defaultProducts;
                stokGudangTable.innerHTML = prods.map(p => { const d = gMap[p] || { utama: 0, cold: 0 }; return `<tr class="border-t"><td class="p-2">${p}</td><td class="p-2 text-right">${d.utama} kg</td><td class="p-2 text-right">${d.cold} kg</td><td class="p-2 text-right">${d.utama + d.cold} kg</td></tr>`; }).join('');
            }

            // Margin per Produk
            const marginTable = document.getElementById('reportMarginTable');
            if (marginTable) {
                const mMap = {};
                sales.forEach(s => { if (!mMap[s.produk]) mMap[s.produk] = { rev: 0, hpp: 0 }; mMap[s.produk].rev += s.qty * s.hargaJual; mMap[s.produk].hpp += s.qty * s.hpp; });
                marginTable.innerHTML = Object.entries(mMap).map(([p, d]) => `<tr class="border-t"><td class="p-2">${p}</td><td class="p-2 text-right">Rp ${d.rev.toLocaleString('id-ID')}</td><td class="p-2 text-right">Rp ${d.hpp.toLocaleString('id-ID')}</td><td class="p-2 text-right">Rp ${(d.rev - d.hpp).toLocaleString('id-ID')}</td></tr>`).join('') || '<tr><td colspan="4" class="text-center p-4 opacity-50">-</td></tr>';
            }

            // Top Pelanggan
            const topCustTable = document.getElementById('reportTopCustomers');
            if (topCustTable) {
                const cMap = {};
                sales.forEach(s => { if (!cMap[s.klien]) cMap[s.klien] = { trx: 0, total: 0 }; cMap[s.klien].trx++; cMap[s.klien].total += s.qty * s.hargaJual; });
                const sortedC = Object.entries(cMap).sort((a, b) => b[1].total - a[1].total).slice(0, 5);
                topCustTable.innerHTML = sortedC.map(([c, d]) => `<tr class="border-t"><td class="p-2">${c}</td><td class="p-2 text-right">${d.trx}</td><td class="p-2 text-right">Rp ${d.total.toLocaleString('id-ID')}</td></tr>`).join('') || '<tr><td colspan="3" class="text-center p-4 opacity-50">-</td></tr>';
            }

            // Proyeksi
            const proyeksiTable = document.getElementById('reportProyeksi');
            if (proyeksiTable) {
                const total = sales.reduce((a, s) => a + s.qty * s.hargaJual, 0);
                const diffDays = Math.max(1, (new Date(endDate) - new Date(startDate)) / 86400000);
                const avg = total / (diffDays / 30);
                const months = [];
                for (let i = 1; i <= 3; i++) { const d = new Date(); d.setMonth(d.getMonth() + i); months.push({ bulan: d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }), val: Math.round(avg * i) }); }
                proyeksiTable.innerHTML = months.map(m => `<tr class="border-t"><td class="p-2">${m.bulan}</td><td class="p-2 text-right">Rp ${m.val.toLocaleString('id-ID')}</td></tr>`).join('');
            }

            // Retur
            const returTable = document.getElementById('reportRetur');
            if (returTable) {
                const retur = Storage.getReturns().filter(r => r.tanggal >= startDate && r.tanggal <= endDate);
                returTable.innerHTML = retur.map(r => `<tr class="border-t"><td class="p-2">${r.tanggal}</td><td class="p-2">${Storage.getSales().find(s => s.id === r.saleId)?.produk || '-'}</td><td class="p-2 text-right">${r.qty} kg</td><td class="p-2">${r.alasan}</td></tr>`).join('') || '<tr><td colspan="4" class="text-center p-4 opacity-50">-</td></tr>';
            }

            // Opname
            const opnameTable = document.getElementById('reportOpname');
            if (opnameTable) {
                const opname = Storage.getOpname().filter(o => o.tanggal >= startDate && o.tanggal <= endDate);
                opnameTable.innerHTML = opname.map(o => `<tr class="border-t"><td class="p-2">${o.tanggal}</td><td class="p-2">${o.produk}</td><td class="p-2 text-right ${o.selisih < 0 ? 'text-red-600' : 'text-green-600'}">${o.selisih} kg</td></tr>`).join('') || '<tr><td colspan="3" class="text-center p-4 opacity-50">-</td></tr>';
            }

            // Grafik Harian
            renderDailyChart(sales, expenses, startDate, endDate);
        }

        function renderDailyChart(sales, expenses, startDate, endDate) {
            const ctx = document.getElementById('chartReportDaily')?.getContext('2d');
            if (!ctx) return;
            const dateMap = {};
            const start = new Date(startDate);
            const end = new Date(endDate);
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const ds = d.toISOString().split('T')[0];
                dateMap[ds] = { pendapatan: 0, beban: 0 };
            }
            sales.forEach(s => { if (dateMap[s.tanggal]) dateMap[s.tanggal].pendapatan += s.qty * s.hargaJual; });
            expenses.forEach(e => { if (dateMap[e.tanggal]) dateMap[e.tanggal].beban += e.jumlah; });
            const labels = Object.keys(dateMap).sort();
            const pendapatanData = labels.map(l => dateMap[l].pendapatan);
            const bebanData = labels.map(l => dateMap[l].beban);

            if (dailyChartInstance) dailyChartInstance.destroy();
            dailyChartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels.map(l => new Date(l).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })),
                    datasets: [
                        { label: 'Pendapatan', data: pendapatanData, borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.1)', tension: 0.3, fill: true },
                        { label: 'Beban', data: bebanData, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', tension: 0.3, fill: true }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: { tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: Rp ${ctx.raw.toLocaleString('id-ID')}` } } },
                    scales: { y: { ticks: { callback: (val) => 'Rp ' + val.toLocaleString('id-ID') } } }
                }
            });
        }

        if (applyBtn) applyBtn.addEventListener('click', renderReports);

        if (exportExcelBtn) {
            exportExcelBtn.addEventListener('click', () => {
                const sales = Storage.getSales().filter(s => s.tanggal >= (startDateEl?.value || '1970-01-01') && s.tanggal <= (endDateEl?.value || '2099-12-31'));
                const expenses = Storage.getExpenses().filter(e => e.tanggal >= (startDateEl?.value || '1970-01-01') && e.tanggal <= (endDateEl?.value || '2099-12-31'));
                const data = [['Tanggal', 'Deskripsi', 'Akun', 'Debet', 'Kredit']];
                sales.forEach(s => {
                    data.push([s.tanggal, `Penjualan ${s.produk} ke ${s.klien}`, 'Kas', s.qty * s.hargaJual, 0]);
                    data.push([s.tanggal, `HPP ${s.produk}`, 'HPP', 0, s.qty * s.hpp]);
                });
                expenses.forEach(e => data.push([e.tanggal, e.deskripsi || e.akun, e.akun, 0, e.jumlah]));
                const ws = XLSX.utils.aoa_to_sheet(data);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Laporan');
                XLSX.writeFile(wb, `laporan_${startDateEl?.value || 'periode'}.xlsx`);
                showToast('Sukses', 'Laporan Excel diunduh.', 'success');
            });
        }

        if (exportPDFBtn) {
            exportPDFBtn.addEventListener('click', () => {
                // Placeholder – bisa diintegrasikan dengan jsPDF nanti
                alert('Fitur ekspor PDF laporan akan segera hadir.');
            });
        }

        // Render pertama kali
        renderReports();
    }

    // Ekspos ke CFS
    CFS.Reports = { init: initReportsTab };
})();
