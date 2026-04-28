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
};
