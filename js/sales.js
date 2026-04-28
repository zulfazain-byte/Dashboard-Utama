// js/sales.js
CFS.Sales = {
    async calculatePricing(productName, qty, tier, manualHarga = null) {
        // Ambil pengaturan
        const settings = await CFS.Settings.get();
        // Alokasi stok menghasilkan usedBatches (array { id, qty, harga_per_kg })
        const usedBatches = await CFS.Inventory.allocateStock(productName, qty);
        const totalHPP = usedBatches.reduce((sum, b) => sum + b.qty * b.harga_per_kg, 0);
        const hppAvg = totalHPP / qty;

        // Harga ecer = HPP + margin default
        const hargaEcer = hppAvg + settings.marginDefault;

        let hargaJualPerKg;
        if (tier === 'grosir') {
            // Grosir = ecer - selisih (grosir lebih murah)
            hargaJualPerKg = hargaEcer - settings.selisihGrosir;
            if (hargaJualPerKg < hppAvg) hargaJualPerKg = hppAvg; // jangan rugi
        } else if (tier === 'partai') {
            hargaJualPerKg = manualHarga || hargaEcer;
        } else {
            hargaJualPerKg = hargaEcer; // ecer
        }
        if (manualHarga && tier !== 'partai') {
            hargaJualPerKg = manualHarga; // override manual selalu berlaku
        }

        const dppTotal = hargaJualPerKg * qty;
        const ppn = dppTotal * (settings.ppn / 100);
        const totalInvoice = dppTotal + ppn;

        return {
            usedBatches,
            totalHPP,
            hppAvg,
            hargaEcer,
            hargaJual: hargaJualPerKg,
            dppTotal,
            ppn,
            totalInvoice,
            tier
        };
    },

    // Proses penjualan lengkap: stok teralokasi, jurnal tercatat
    async processSale(klien, productName, qty, tier, manualHarga = null) {
        const pricing = await this.calculatePricing(productName, qty, tier, manualHarga);
        // Catat jurnal akuntansi
        await CFS.Accounting.recordSale(
            klien,
            productName,
            qty,
            pricing.dppTotal,
            pricing.ppn,
            pricing.totalHPP
        );
        // Catat transaksi untuk riwayat
        await this.recordTransaction({
            klien,
            produk: productName,
            qty,
            tier,
            hargaJual: pricing.hargaJual,
            totalInvoice: pricing.totalInvoice,
            hpp: pricing.totalHPP,
            usedBatches: pricing.usedBatches,
            tanggal: new Date().toISOString()
        });
        return pricing;
    },

    async getTransactions() {
        let trx = await CFS.Storage.get(CFS.Storage.TRANSACTIONS_KEY);
        if (!trx) trx = [];
        return trx;
    },

    async recordTransaction(trx) {
        const transactions = await this.getTransactions();
        transactions.unshift(trx);
        await CFS.Storage.set(CFS.Storage.TRANSACTIONS_KEY, transactions);
    }
};
