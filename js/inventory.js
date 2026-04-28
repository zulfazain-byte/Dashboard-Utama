// js/inventory.js
CFS.Inventory = {
    PRODUCT_LIST: [
        'Ikan Banjar', 'Ikan Dori Fillet', 'Ikan Layang', 'Ikan Belo',
        'Ikan Tongkol', 'Ikan Salem', 'Ikan Tenggiri', 'Ikan Bawal Laut', 'Cumi Cumi'
    ],

    async getBatches() {
        let batches = await CFS.Storage.get(CFS.Storage.STOCK_KEY);
        if (!batches) batches = [];
        return batches;
    },

    async saveBatches(batches) {
        await CFS.Storage.set(CFS.Storage.STOCK_KEY, batches);
    },

    // Tambah batch baru
    async addBatch(batchData) {
        const batches = await this.getBatches();
        // Hitung HPP per kg untuk batch ini
        const totalModal = (batchData.hargaBeli * batchData.berat) + (batchData.ongkir || 0);
        const hppPerKg = totalModal / batchData.berat;
        const batch = {
            id: 'BATCH_' + Date.now(),
            produk: batchData.produk,
            berat_awal: batchData.berat,
            berat_sisa: batchData.berat,
            harga_beli: batchData.hargaBeli,
            ongkir: batchData.ongkir || 0,
            tgl_produksi: batchData.tglProduksi,
            tgl_kadaluarsa: batchData.tglKadaluarsa,
            hpp_per_kg: hppPerKg,
            status: 'aktif',
            created_at: new Date().toISOString()
        };
        batches.push(batch);
        await this.saveBatches(batches);
        return batch;
    },

    // Alokasi stok untuk penjualan dengan metode FEFO
    // Mengembalikan array batch yang terpakai { id, nama_produk, qty, harga_per_kg }
    async allocateStock(productName, qtyNeeded) {
        const batches = await this.getBatches();
        const now = new Date();
        const candidates = batches.filter(b =>
            b.produk === productName &&
            b.berat_sisa > 0 &&
            new Date(b.tgl_kadaluarsa) > now
        );
        // Urutkan: expired terdekat dulu (FEFO)
        candidates.sort((a, b) => new Date(a.tgl_kadaluarsa) - new Date(b.tgl_kadaluarsa));
        let remaining = qtyNeeded;
        const usedBatches = [];
        for (let b of candidates) {
            if (remaining <= 0) break;
            const take = Math.min(b.berat_sisa, remaining);
            b.berat_sisa -= take;
            remaining -= take;
            usedBatches.push({
                id: b.id,
                nama_produk: b.produk,
                qty: take,
                harga_per_kg: b.hpp_per_kg
            });
            if (b.berat_sisa === 0) b.status = 'habis';
        }
        if (remaining > 0) {
            throw new Error(`Stok ${productName} tidak mencukupi. Kurang ${remaining.toFixed(1)} kg.`);
        }
        await this.saveBatches(batches);
        return usedBatches;
    },

    // Ringkasan stok per produk
    async getStockSummary() {
        const batches = await this.getBatches();
        const summary = {};
        this.PRODUCT_LIST.forEach(p => { summary[p] = 0; });
        batches.forEach(b => {
            if (b.berat_sisa > 0) {
                summary[b.produk] = (summary[b.produk] || 0) + b.berat_sisa;
            }
        });
        return summary;
    },

    // Dapatkan batch yang hampir expired (<= 7 hari)
    async getExpiringBatches(daysThreshold = 7) {
        const batches = await this.getBatches();
        const now = new Date();
        return batches.filter(b => {
            const exp = new Date(b.tgl_kadaluarsa);
            return b.berat_sisa > 0 && (exp - now) / (1000 * 3600 * 24) <= daysThreshold;
        });
    }
};
