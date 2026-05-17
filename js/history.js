/* ============================================================
   Cibitung Frozen ERP Ultimate v5.4 — History Module
   Mengelola riwayat transaksi dengan filter, statistik, grafik
   ============================================================ */
window.CFS = window.CFS || {};

(function() {
    'use strict';
    const Storage = CFS.Storage;

    let currentPage = 1;
    const perPage = 30;
    let historyChartInstance = null;

    function initHistoryTab() {
        const startDateEl = document.getElementById('historyStartDate');
        const endDateEl = document.getElementById('historyEndDate');
        const produkEl = document.getElementById('historyFilterProduk');
        const channelEl = document.getElementById('historyFilterChannel');
        const tierEl = document.getElementById('historyFilterTier');
        const klienEl = document.getElementById('historyFilterKlien');
        const applyBtn = document.getElementById('applyHistoryFilter');
        const resetBtn = document.getElementById('resetHistoryFilter');
        const exportCSV = document.getElementById('exportHistoryCSV');
        const exportExcel = document.getElementById('exportHistoryExcel');
        const clearAllBtn = document.getElementById('clearAllHistoryBtn');
        const loadMoreBtn = document.getElementById('loadMoreHistory');
        const tbody = document.getElementById('historyTableBody');
        const filterInfo = document.getElementById('historyFilterInfo');

        // Isi dropdown produk
        function populateProdukFilter() {
            if (!produkEl) return;
            const prods = Storage.getProducts();
            const list = prods.length ? prods.map(p => p.name) : Storage.defaultProducts;
            produkEl.innerHTML = '<option value="">Semua Produk</option>' + list.map(p => `<option value="${p}">${p}</option>`).join('');
        }
        populateProdukFilter();

        // Set default tanggal (30 hari terakhir)
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        if (startDateEl && !startDateEl.value) startDateEl.value = thirtyDaysAgo.toISOString().split('T')[0];
        if (endDateEl && !endDateEl.value) endDateEl.value = today.toISOString().split('T')[0];

        function renderHistory(resetPage = true) {
            if (resetPage) currentPage = 1;

            const startDate = startDateEl?.value || '1970-01-01';
            const endDate = endDateEl?.value || '2099-12-31';
            const produk = produkEl?.value || '';
            const channel = channelEl?.value || '';
            const tier = tierEl?.value || '';
            const klien = (klienEl?.value || '').toLowerCase();

            let sales = Storage.getSales().filter(s => s.tanggal >= startDate && s.tanggal <= endDate);
            if (produk) sales = sales.filter(s => s.produk === produk);
            if (channel) sales = sales.filter(s => s.channel === channel);
            if (tier) sales = sales.filter(s => s.tier === tier);
            if (klien) sales = sales.filter(s => s.klien.toLowerCase().includes(klien));

            // Urutkan terbaru dulu
            sales.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

            // Statistik
            const totalTrx = sales.length;
            const totalRevenue = sales.reduce((sum, s) => sum + (s.qty * s.hargaJual), 0);
            const todayStr = today.toISOString().split('T')[0];
            const todayTrx = sales.filter(s => s.tanggal === todayStr).length;
            const onlineTrx = sales.filter(s => s.channel === 'online').length;
            const offlineTrx = sales.filter(s => s.channel === 'offline').length;
            const days = [...new Set(sales.map(s => s.tanggal))].length || 1;
            const avgDaily = days > 0 ? totalRevenue / days : 0;

            document.getElementById('historyTotalTrx').textContent = totalTrx;
            document.getElementById('historyTotalRevenue').textContent = 'Rp ' + totalRevenue.toLocaleString('id-ID');
            document.getElementById('historyAvgDaily').textContent = 'Rp ' + Math.round(avgDaily).toLocaleString('id-ID');
            document.getElementById('historyTodayTrx').textContent = todayTrx;
            document.getElementById('historyOnlineTrx').textContent = onlineTrx;
            document.getElementById('historyOfflineTrx').textContent = offlineTrx;

            if (filterInfo) {
                filterInfo.textContent = `Menampilkan ${totalTrx} transaksi (${startDate} s/d ${endDate})`;
            }

            // Pagination
            const totalPages = Math.ceil(sales.length / perPage);
            const pageSales = sales.slice(0, currentPage * perPage);

            if (tbody) {
                if (pageSales.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="10" class="text-center p-4 opacity-50">Tidak ada transaksi yang sesuai.</td></tr>';
                } else {
                    tbody.innerHTML = pageSales.map(s => `
                        <tr class="border-t hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                            <td class="p-2 text-xs">${new Date(s.tanggal).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' })}</td>
                            <td class="p-2 font-medium">${s.klien}</td>
                            <td class="p-2">${s.produk}</td>
                            <td class="p-2 text-right">${s.qty} kg</td>
                            <td class="p-2 text-right">Rp ${s.hargaJual.toLocaleString('id-ID')}</td>
                            <td class="p-2 text-right font-semibold text-green-600">Rp ${(s.qty * s.hargaJual).toLocaleString('id-ID')}</td>
                            <td class="p-2 text-right text-xs opacity-70">Rp ${s.hpp.toLocaleString('id-ID')}</td>
                            <td class="p-2 text-center">${s.channel === 'online' ? '<span class="badge bg-indigo-100 text-indigo-700">🌐 Online</span>' : '<span class="badge bg-amber-100 text-amber-700">🏪 Offline</span>'}</td>
                            <td class="p-2 text-center"><span class="badge bg-slate-100 dark:bg-slate-700">${s.tier.toUpperCase()}</span></td>
                            <td class="p-2 text-center">
                                <div class="flex gap-1 justify-center">
                                    <button onclick="CFS.History.showSaleDetail('${s.id}')" class="btn btn-xs btn-secondary" title="Detail">🔍</button>
                                    <button onclick="CFS.History.printInvoice('${s.id}')" class="btn btn-xs btn-secondary" title="Cetak Invoice">🖨️</button>
                                    <button onclick="CFS.History.deleteSaleEntry('${s.id}')" class="btn btn-xs btn-danger" title="Hapus">🗑️</button>
                                </div>
                            </td>
                        </tr>
                    `).join('');
                }
            }

            document.getElementById('historyShowingInfo').textContent = `Menampilkan ${pageSales.length} dari ${totalTrx} transaksi`;
            if (loadMoreBtn) loadMoreBtn.classList.toggle('hidden', currentPage >= totalPages);

            // Render grafik
            renderHistoryChart(sales);
        }

        function renderHistoryChart(sales) {
            const ctx = document.getElementById('chartHistoryRevenue')?.getContext('2d');
            if (!ctx) return;

            const last30 = [];
            for (let i = 29; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const ds = d.toISOString().split('T')[0];
                const total = sales.filter(s => s.tanggal === ds).reduce((sum, s) => sum + (s.qty * s.hargaJual), 0);
                last30.push({ date: ds, total });
            }

            if (historyChartInstance) historyChartInstance.destroy();
            historyChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: last30.map(d => new Date(d.date).toLocaleDateString('id-ID', { day:'numeric', month:'short' })),
                    datasets: [{
                        label: 'Pendapatan',
                        data: last30.map(d => d.total),
                        backgroundColor: '#3b82f6',
                        borderRadius: 4,
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: false },
                        tooltip: { callbacks: { label: (ctx) => 'Rp ' + ctx.raw.toLocaleString('id-ID') } }
                    },
                    scales: { y: { ticks: { callback: (val) => 'Rp ' + val.toLocaleString('id-ID') } } }
                }
            });
        }

        // Detail transaksi via toast
        CFS.History = {
            showSaleDetail: function(id) {
                const sale = Storage.getSales().find(s => s.id === id);
                if (!sale) return;
                showToast(
                    'Detail Transaksi',
                    `Tanggal: ${new Date(sale.tanggal).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}\nKlien: ${sale.klien}\nProduk: ${sale.produk}\nQty: ${sale.qty} kg\nHarga: Rp ${sale.hargaJual.toLocaleString('id-ID')}/kg\nTotal: Rp ${(sale.qty * sale.hargaJual).toLocaleString('id-ID')}\nChannel: ${sale.channel === 'online' ? 'Online' : 'Offline'}\nTier: ${sale.tier.toUpperCase()}\nCatatan: ${sale.catatan || '-'}`,
                    'info'
                );
            },
            printInvoice: function(id) {
                if (CFS.Sales && CFS.Sales.printInvoice) CFS.Sales.printInvoice(id);
                else showToast('Info', 'Fitur cetak invoice tersedia di tab Penjualan.', 'info');
            },
            deleteSaleEntry: async function(id) {
                if (!confirm('Hapus transaksi ini? Stok batch akan dikembalikan.')) return;
                await Storage.deleteSale(id);
                renderHistory(true);
                if (CFS.Dashboard) CFS.Dashboard.refresh();
                showToast('Sukses', 'Transaksi dihapus dan stok dikembalikan.', 'success');
            },
            init: initHistoryTab
        };

        // Event listener
        if (applyBtn) applyBtn.addEventListener('click', () => renderHistory(true));
        if (resetBtn) resetBtn.addEventListener('click', () => {
            if (startDateEl) startDateEl.value = thirtyDaysAgo.toISOString().split('T')[0];
            if (endDateEl) endDateEl.value = today.toISOString().split('T')[0];
            if (produkEl) produkEl.value = '';
            if (channelEl) channelEl.value = '';
            if (tierEl) tierEl.value = '';
            if (klienEl) klienEl.value = '';
            renderHistory(true);
        });
        if (loadMoreBtn) loadMoreBtn.addEventListener('click', () => { currentPage++; renderHistory(false); });

        // Ekspor CSV
        if (exportCSV) exportCSV.addEventListener('click', () => {
            const sales = Storage.getSales();
            const csv = 'Tanggal,Klien,Produk,Qty (kg),Harga/kg,Total,Channel,Tier\n' + sales.map(s => `${s.tanggal},"${s.klien}","${s.produk}",${s.qty},${s.hargaJual},${s.qty * s.hargaJual},${s.channel},${s.tier}`).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `riwayat_transaksi_${new Date().toISOString().slice(0,10)}.csv`;
            a.click();
            showToast('Sukses', 'Riwayat diunduh sebagai CSV.', 'success');
        });

        // Ekspor Excel
        if (exportExcel) exportExcel.addEventListener('click', () => {
            const sales = Storage.getSales();
            const data = [['Tanggal', 'Klien', 'Produk', 'Qty (kg)', 'Harga/kg', 'Total', 'Channel', 'Tier']];
            sales.forEach(s => data.push([s.tanggal, s.klien, s.produk, s.qty, s.hargaJual, s.qty * s.hargaJual, s.channel, s.tier]));
            const ws = XLSX.utils.aoa_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Riwayat');
            XLSX.writeFile(wb, `riwayat_transaksi_${new Date().toISOString().slice(0,10)}.xlsx`);
            showToast('Sukses', 'Riwayat diunduh sebagai Excel.', 'success');
        });

        // Hapus semua riwayat
        if (clearAllBtn) clearAllBtn.addEventListener('click', async () => {
            if (!confirm('HAPUS SEMUA RIWAYAT? Stok batch tidak akan dikembalikan. Lanjutkan?')) return;
            const sales = Storage.getSales();
            for (const s of sales) await Storage.deleteSale(s.id);
            renderHistory(true);
            if (CFS.Dashboard) CFS.Dashboard.refresh();
            showToast('Sukses', 'Semua riwayat dihapus.', 'success');
        });

        // Render pertama kali
        renderHistory(true);
    }

    CFS.History = CFS.History || {};
    CFS.History.init = initHistoryTab;
})();
