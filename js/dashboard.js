// js/dashboard.js
CFS.Dashboard = {
    async renderStockSummary() {
        const summary = await CFS.Inventory.getStockSummary();
        const container = document.getElementById('dashboardSummaryCards');
        if (!container) return;
        container.innerHTML = CFS.Inventory.PRODUCT_LIST.map(p => {
            const kg = summary[p]?.toFixed(1) || '0.0';
            const percentage = Math.min((summary[p] / 100) * 100, 100).toFixed(0);
            return `<div class="card p-4 text-center">
                <p class="text-sm font-medium truncate">${p}</p>
                <p class="text-2xl font-bold mt-1">${kg} kg</p>
                <div class="progress-bar mt-2"><div class="progress-fill bg-blue-500" style="width:${percentage}%"></div></div>
            </div>`;
        }).join('');
    },

    async renderExpiringBatches() {
        const expBatches = await CFS.Inventory.getExpiringBatches(7);
        const container = document.getElementById('expiringBatches');
        if (!container) return;
        if (expBatches.length === 0) {
            container.innerHTML = '<div class="text-green-600 font-medium">✅ Tidak ada batch mendekati kadaluarsa.</div>';
            return;
        }
        container.innerHTML = expBatches.map(b => {
            const daysLeft = Math.ceil((new Date(b.tgl_kadaluarsa) - new Date()) / (1000*3600*24));
            return `<div class="flex justify-between items-center bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-2">
                <span class="font-medium">${b.produk} (${b.id})</span>
                <span class="text-sm">Sisa ${b.berat_sisa.toFixed(1)} kg</span>
                <span class="text-xs text-red-600 font-semibold">${daysLeft} hari</span>
            </div>`;
        }).join('');
    },

    async renderRevenueChart() {
        const ctx = document.getElementById('chartRevenue')?.getContext('2d');
        if (!ctx) return;
        const trx = await CFS.Sales.getTransactions();
        const daily = {};
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const key = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
            daily[key] = 0;
        }
        trx.forEach(t => {
            const d = new Date(t.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
            if (daily[d] !== undefined) daily[d] += t.totalInvoice;
        });
        const labels = Object.keys(daily);
        const data = Object.values(daily);
        if (window._revenueChartInstance) window._revenueChartInstance.destroy();
        window._revenueChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Pendapatan (Invoice)',
                    data,
                    backgroundColor: '#3b82f6',
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { labels: { color: '#64748b' } } },
                scales: {
                    y: {
                        ticks: { callback: v => CFS.Utils.formatRupiah(v) }
                    }
                }
            }
        });
    },

    async renderFinanceSummary() {
        const container = document.getElementById('financeSummary');
        if (!container) return;
        const today = new Date();
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        const pl = await CFS.Accounting.getProfitLoss(start, today);
        container.innerHTML = `
            <div class="card p-4"><p class="text-xs opacity-70">Pendapatan</p><p class="text-xl font-bold">${CFS.Utils.formatRupiah(pl.pendapatan)}</p></div>
            <div class="card p-4"><p class="text-xs opacity-70">HPP</p><p class="text-xl font-bold">${CFS.Utils.formatRupiah(pl.hpp)}</p></div>
            <div class="card p-4"><p class="text-xs opacity-70">Laba Kotor</p><p class="text-xl font-bold">${CFS.Utils.formatRupiah(pl.labaKotor)}</p></div>
            <div class="card p-4"><p class="text-xs opacity-70">Laba Bersih</p><p class="text-xl font-bold text-emerald-600">${CFS.Utils.formatRupiah(pl.labaBersih)}</p></div>
        `;
        // Duplicate ke financeSummaryContainer jika ada
        const container2 = document.getElementById('financeSummaryContainer');
        if (container2) container2.innerHTML = container.innerHTML;
    },

    async renderNeraca() {
        const container = document.getElementById('reportNeraca');
        if (!container) return;
        const neraca = await CFS.Accounting.getNeraca();
        container.innerHTML = `
            <div class="flex justify-between"><span>Total Aset</span><span class="font-semibold">${CFS.Utils.formatRupiah(neraca.aset)}</span></div>
            <div class="flex justify-between"><span>Total Kewajiban</span><span class="font-semibold">${CFS.Utils.formatRupiah(neraca.kewajiban)}</span></div>
            <div class="flex justify-between"><span>Ekuitas</span><span class="font-semibold">${CFS.Utils.formatRupiah(neraca.ekuitas)}</span></div>
            <hr class="my-2"><div class="flex justify-between font-bold"><span>Cek Keseimbangan</span><span>${neraca.aset === neraca.kewajiban + neraca.ekuitas ? '✅' : '❌'}</span></div>
        `;
    },

    async renderLabaRugiReport() {
        const container = document.getElementById('reportLabaRugi');
        if (!container) return;
        const today = new Date();
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        const pl = await CFS.Accounting.getProfitLoss(start, today);
        container.innerHTML = `
            <div class="flex justify-between"><span>Pendapatan</span><span>${CFS.Utils.formatRupiah(pl.pendapatan)}</span></div>
            <div class="flex justify-between"><span>HPP</span><span>${CFS.Utils.formatRupiah(pl.hpp)}</span></div>
            <div class="flex justify-between"><span>Beban Operasional</span><span>${CFS.Utils.formatRupiah(pl.beban)}</span></div>
            <div class="flex justify-between"><span>Pajak</span><span>${CFS.Utils.formatRupiah(pl.pajak)}</span></div>
            <hr class="my-1"><div class="flex justify-between font-bold"><span>Laba Bersih</span><span>${CFS.Utils.formatRupiah(pl.labaBersih)}</span></div>
        `;
    },

    async refreshAll() {
        await this.renderStockSummary();
        await this.renderExpiringBatches();
        await this.renderRevenueChart();
        await this.renderFinanceSummary();
        await this.renderNeraca();
        await this.renderLabaRugiReport();
    }
};
