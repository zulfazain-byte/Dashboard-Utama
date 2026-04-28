// js/dashboard.js
CFS.Dashboard = {
    async renderSummary() {
        const summary = await CFS.Inventory.getStockSummary();
        const container = document.getElementById('dashboardSummaryCards');
        if (!container) return;
        container.innerHTML = CFS.Inventory.PRODUCT_LIST.map(p => {
            const kg = summary[p]?.toFixed(1) || '0.0';
            return `<div class="bg-white border rounded-xl p-4 shadow-sm">
                <p class="text-sm text-slate-500">${p}</p>
                <p class="text-2xl font-bold text-slate-800">${kg} kg</p>
            </div>`;
        }).join('');
    },

    async renderExpiringBatches() {
        const expBatches = await CFS.Inventory.getExpiringBatches(7);
        const container = document.getElementById('expiringBatches');
        if (!container) return;
        if (expBatches.length === 0) {
            container.innerHTML = '<p class="text-green-600">✔ Tidak ada batch yang hampir kadaluarsa.</p>';
            return;
        }
        container.innerHTML = expBatches.map(b => {
            const daysLeft = Math.ceil((new Date(b.tgl_kadaluarsa) - new Date()) / (1000 * 3600 * 24));
            return `<div class="text-red-600 border border-red-200 p-2 rounded mb-1">
                ⚠ ${b.produk} Batch ${b.id}: sisa ${b.berat_sisa} kg, expired dalam ${daysLeft} hari
            </div>`;
        }).join('');
    },

    async renderFinanceSummary() {
        const settings = await CFS.Settings.get();
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const pl = await CFS.Accounting.getProfitLoss(startOfMonth, today);
        const container = document.getElementById('financeSummary');
        if (!container) return;
        container.innerHTML = `
            <div class="bg-white p-4 rounded-xl border"><p class="text-sm text-slate-500">Pendapatan Bulan Ini</p><p class="text-xl font-bold">${CFS.Utils.formatRupiah(pl.pendapatan)}</p></div>
            <div class="bg-white p-4 rounded-xl border"><p class="text-sm text-slate-500">HPP</p><p class="text-xl font-bold">${CFS.Utils.formatRupiah(pl.hpp)}</p></div>
            <div class="bg-white p-4 rounded-xl border"><p class="text-sm text-slate-500">Laba Kotor</p><p class="text-xl font-bold">${CFS.Utils.formatRupiah(pl.labaKotor)}</p></div>
            <div class="bg-white p-4 rounded-xl border"><p class="text-sm text-slate-500">Laba Bersih</p><p class="text-xl font-bold text-emerald-600">${CFS.Utils.formatRupiah(pl.labaBersih)}</p></div>
        `;
    },

    async refreshAll() {
        await this.renderSummary();
        await this.renderExpiringBatches();
        await this.renderFinanceSummary();
    }
    // js/dashboard.js - tambahkan setelah renderFinanceSummary

    // Inisialisasi chart (Revenue Harian)
    async renderRevenueChart() {
        const ctx = document.getElementById('chartRevenue')?.getContext('2d');
        if (!ctx) return;
        const trx = await CFS.Sales.getFilteredTransactions();
        // Agregasi per hari (7 hari terakhir)
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
                scales: {
                    y: { ticks: { callback: v => CFS.Utils.formatRupiah(v) } }
                }
            }
        });
    },

    // Widget visibility (simpan di settings)
    async getWidgetVisibility() {
        const s = await CFS.Settings.get();
        return s.widgetVisibility || {
            stockSummary: true,
            expiringBatches: true,
            revenueChart: true,
            profitLoss: true
        };
    },

    async setWidgetVisibility(key, value) {
        const s = await CFS.Settings.get();
        if (!s.widgetVisibility) s.widgetVisibility = {};
        s.widgetVisibility[key] = value;
        await CFS.Settings.save(s);
    },

    async applyWidgetVisibility() {
        const vis = await this.getWidgetVisibility();
        document.getElementById('widget-stockSummary')?.classList.toggle('hidden', !vis.stockSummary);
        document.getElementById('widget-expiringBatches')?.classList.toggle('hidden', !vis.expiringBatches);
        document.getElementById('widget-revenueChart')?.classList.toggle('hidden', !vis.revenueChart);
        document.getElementById('widget-profitLoss')?.classList.toggle('hidden', !vis.profitLoss);
    }
};
