// js/accounting.js
CFS.Accounting = {
    CHART_OF_ACCOUNTS: [
        'Kas',
        'Piutang Dagang',
        'Persediaan',
        'PPN Keluaran',
        'Hutang PPh',
        'Modal Owner',
        'Penjualan',
        'HPP',
        'Beban Operasional',
        'PPh 25',
        'PPh 21'
    ],

    async getJournals() {
        let j = await CFS.Storage.get(CFS.Storage.JOURNALS_KEY);
        if (!j) j = [];
        return j;
    },

    async addJournalEntry(entry) {
        const journals = await this.getJournals();
        journals.push(entry);
        await CFS.Storage.set(CFS.Storage.JOURNALS_KEY, journals);
    },

    // Mencatat penjualan dengan double-entry
    async recordSale(klien, produk, qty, dpp, ppn, hpp) {
        const entry = {
            id: Date.now(),
            tanggal: new Date().toISOString(),
            deskripsi: `Penjualan ${produk} ${qty} kg ke ${klien}`,
            entries: [
                { akun: 'Piutang Dagang', debet: dpp + ppn, kredit: 0 },
                { akun: 'Penjualan', debet: 0, kredit: dpp },
                { akun: 'PPN Keluaran', debet: 0, kredit: ppn },
                { akun: 'HPP', debet: hpp, kredit: 0 },
                { akun: 'Persediaan', debet: 0, kredit: hpp }
            ]
        };
        await this.addJournalEntry(entry);
    },

    // Mencatat pembelian stok (opsional, saat tambah batch)
    async recordPurchase(produk, totalBiaya, qty) {
        const entry = {
            id: Date.now(),
            tanggal: new Date().toISOString(),
            deskripsi: `Pembelian stok ${produk} ${qty} kg`,
            entries: [
                { akun: 'Persediaan', debet: totalBiaya, kredit: 0 },
                { akun: 'Kas', debet: 0, kredit: totalBiaya }
            ]
        };
        await this.addJournalEntry(entry);
    },

    // Menghitung laba rugi sederhana dari jurnal
    async getProfitLoss(startDate, endDate) {
        const journals = await this.getJournals();
        let pendapatan = 0, hpp = 0, beban = 0, pajak = 0;
        journals.forEach(j => {
            if (new Date(j.tanggal) >= startDate && new Date(j.tanggal) <= endDate) {
                j.entries.forEach(e => {
                    if (e.akun === 'Penjualan') pendapatan += e.kredit - e.debet;
                    if (e.akun === 'HPP') hpp += e.debet - e.kredit;
                    if (e.akun === 'Beban Operasional') beban += e.debet - e.kredit;
                    if (e.akun === 'PPh 25' || e.akun === 'PPh 21') pajak += e.debet - e.kredit;
                });
            }
        });
        const labaKotor = pendapatan - hpp;
        const labaBersih = labaKotor - beban - pajak;
        return { pendapatan, hpp, beban, pajak, labaKotor, labaBersih };
    }
};
