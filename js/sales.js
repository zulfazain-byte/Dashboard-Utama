// js/sales.js
CFS.Sales = {
    async calculatePricing(productName, qty, tier, manualHarga = null) {
        const settings = await CFS.Settings.get();
        const usedBatches = await CFS.Inventory.allocateStock(productName, qty);
        const totalHPP = usedBatches.reduce((sum, b) => sum + b.qty * b.harga_per_kg, 0);
        const hppAvg = totalHPP / qty;
        const hargaEcer = hppAvg + settings.marginDefault;
        let hargaJualPerKg;
        if (tier === 'grosir') {
            hargaJualPerKg = hargaEcer - settings.selisihGrosir;
            if (hargaJualPerKg < hppAvg) hargaJualPerKg = hppAvg;
        } else if (tier === 'partai') {
            hargaJualPerKg = manualHarga || hargaEcer;
        } else {
            hargaJualPerKg = hargaEcer;
        }
        if (manualHarga && tier !== 'partai') hargaJualPerKg = manualHarga;
        const dppTotal = hargaJualPerKg * qty;
        const ppn = dppTotal * (settings.ppn / 100);
        const totalInvoice = dppTotal + ppn;
        return { usedBatches, totalHPP, hppAvg, hargaEcer, hargaJual: hargaJualPerKg, dppTotal, ppn, totalInvoice, tier };
    },

    async previewPricing(productName, qty, tier, manualHarga = null) {
        if (!productName || qty <= 0) return null;
        const settings = await CFS.Settings.get();
        const summary = await CFS.Inventory.getStockSummary();
        const available = summary[productName] || 0;
        if (qty > available) return { error: `Stok tidak cukup! Tersedia ${available.toFixed(1)} kg.` };
        const batches = await CFS.Inventory.getBatches();
        const now = new Date();
        const candidates = batches
            .filter(b => b.produk === productName && b.berat_sisa > 0 && new Date(b.tgl_kadaluarsa) > now)
            .sort((a,b) => new Date(a.tgl_kadaluarsa) - new Date(b.tgl_kadaluarsa));
        let remaining = qty;
        let totalHPP = 0;
        for (let b of candidates) {
            if (remaining <= 0) break;
            const take = Math.min(b.berat_sisa, remaining);
            totalHPP += take * b.hpp_per_kg;
            remaining -= take;
        }
        const hppAvg = totalHPP / qty;
        const hargaEcer = hppAvg + settings.marginDefault;
        let hargaJual;
        if (tier === 'grosir') {
            hargaJual = hargaEcer - settings.selisihGrosir;
            if (hargaJual < hppAvg) hargaJual = hppAvg;
        } else if (tier === 'partai') {
            hargaJual = manualHarga || hargaEcer;
        } else {
            hargaJual = hargaEcer;
        }
        if (manualHarga && tier !== 'partai') hargaJual = manualHarga;
        const dppTotal = hargaJual * qty;
        const ppn = dppTotal * (settings.ppn / 100);
        return { hargaJual, dppTotal, ppn, totalInvoice: dppTotal + ppn, hppAvg, available };
    },

    async processSale(klien, productName, qty, tier, manualHarga = null) {
        const pricing = await this.calculatePricing(productName, qty, tier, manualHarga);
        await CFS.Accounting.recordSale(klien, productName, qty, pricing.dppTotal, pricing.ppn, pricing.totalHPP);
        const trx = {
            id: Date.now(),
            klien,
            produk: productName,
            qty,
            tier,
            hargaJual: pricing.hargaJual,
            totalInvoice: pricing.totalInvoice,
            hpp: pricing.totalHPP,
            usedBatches: pricing.usedBatches,
            tanggal: new Date().toISOString()
        };
        await this.recordTransaction(trx);
        return pricing;
    },

    async getTransactions() {
        let trx = await CFS.Storage.get(CFS.Storage.TRANSACTIONS_KEY);
        return trx || [];
    },

    async recordTransaction(trx) {
        const transactions = await this.getTransactions();
        transactions.unshift(trx);
        await CFS.Storage.set(CFS.Storage.TRANSACTIONS_KEY, transactions);
    },

    async getFilteredTransactions(filters = {}) {
        let trx = await this.getTransactions();
        if (filters.produk) trx = trx.filter(t => t.produk === filters.produk);
        if (filters.klien) trx = trx.filter(t => t.klien.toLowerCase().includes(filters.klien.toLowerCase()));
        if (filters.startDate) trx = trx.filter(t => new Date(t.tanggal) >= new Date(filters.startDate));
        if (filters.endDate) trx = trx.filter(t => new Date(t.tanggal) <= new Date(filters.endDate));
        return trx;
    }
};
