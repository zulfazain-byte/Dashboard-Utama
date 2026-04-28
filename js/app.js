// js/app.js
CFS.Utils = {
    formatRupiah: (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num),
    formatDate: (iso) => new Date(iso).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })
};

CFS.App = {
    init() {
        this.setupTabs();
        this.setupForms();
        this.populateDropdowns();
        this.loadSettings();
        this.setupDashboardToggles();
        this.setupBackupRestore();
        this.setupBatchModal();
        CFS.Dashboard.refreshAll();
        CFS.Inventory.renderStockTable();
        this.applyWidgetVisibility();
    },

    setupTabs() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => switchTab(btn.dataset.tab));
        });
    },

    onTabSwitch(tabId) {
        if (tabId === 'tab-stock') CFS.Inventory.renderStockTable();
        if (tabId === 'tab-dashboard') CFS.Dashboard.refreshAll();
        if (tabId === 'tab-finance') {
            CFS.Dashboard.renderFinanceSummary();
            CFS.Dashboard.renderNeraca();
        }
        if (tabId === 'tab-reports') {
            CFS.Dashboard.renderLabaRugiReport();
            CFS.Dashboard.renderNeraca();
        }
    },

    setupForms() {
        // Tambah Batch
        document.getElementById('addStockForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const batchData = {
                produk: document.getElementById('stockProduk').value,
                berat: parseFloat(document.getElementById('stockBerat').value),
                hargaBeli: parseFloat(document.getElementById('stockHargaBeli').value),
                ongkir: parseFloat(document.getElementById('stockOngkir').value) || 0,
                tglProduksi: document.getElementById('stockTglProduksi').value,
                tglKadaluarsa: document.getElementById('stockTglKadaluarsa').value
            };
            const batch = await CFS.Inventory.addBatch(batchData);
            await CFS.Accounting.recordPurchase(batchData.produk, (batchData.hargaBeli * batchData.berat) + batchData.ongkir, batchData.berat);
            showToast('Berhasil', 'Batch ditambahkan.', 'success');
            e.target.reset();
            CFS.Dashboard.refreshAll();
            CFS.Inventory.renderStockTable();
        });

        // Penjualan
        document.getElementById('salesForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const klien = document.getElementById('salesKlien').value;
            const produk = document.getElementById('salesProduk').value;
            const qty = parseFloat(document.getElementById('salesQty').value);
            const tier = document.getElementById('salesTier').value;
            const manualHarga = parseFloat(document.getElementById('salesHargaManual').value) || null;
            try {
                const result = await CFS.Sales.processSale(klien, produk, qty, tier, manualHarga);
                const resultDiv = document.getElementById('salesResult');
                resultDiv.classList.remove('hidden');
                resultDiv.innerHTML = `
                    ✅ Penjualan berhasil!<br>
                    <strong>Invoice:</strong> ${CFS.Utils.formatRupiah(result.totalInvoice)}<br>
                    Batch terpakai: ${result.usedBatches.map(b => `${b.nama_produk} ${b.qty}kg`).join(', ')}
                `;
                showToast('Sukses', 'Penjualan tercatat.', 'success');
                CFS.Dashboard.refreshAll();
                CFS.Inventory.renderStockTable();
            } catch (err) {
                showToast('Gagal', err.message, 'error');
            }
        });

        // Preview harga
        document.getElementById('previewPriceBtn')?.addEventListener('click', async () => {
            const produk = document.getElementById('salesProduk').value;
            const qty = parseFloat(document.getElementById('salesQty').value);
            const tier = document.getElementById('salesTier').value;
            const manual = parseFloat(document.getElementById('salesHargaManual').value) || null;
            const preview = await CFS.Sales.previewPricing(produk, qty, tier, manual);
            const div = document.getElementById('salesResult');
            div.classList.remove('hidden');
            if (preview.error) {
                div.innerHTML = `<span class="text-red-600">${preview.error}</span>`;
            } else {
                div.innerHTML = `
                    📊 Preview:<br>
                    HPP rata-rata: ${CFS.Utils.formatRupiah(preview.hppAvg)}<br>
                    Harga Jual/kg: ${CFS.Utils.formatRupiah(preview.hargaJual)}<br>
                    Estimasi Invoice: ${CFS.Utils.formatRupiah(preview.totalInvoice)}<br>
                    Stok tersedia: ${preview.available.toFixed(1)} kg
                `;
            }
        });

        // Beban Operasional
        document.getElementById('expenseForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const akun = document.getElementById('expenseAkun').value;
            const jumlah = parseFloat(document.getElementById('expenseJumlah').value);
            const deskripsi = document.getElementById('expenseDeskripsi').value;
            await CFS.Accounting.recordExpense(akun, jumlah, deskripsi);
            showToast('Tercatat', 'Beban operasional ditambahkan.', 'success');
            e.target.reset();
            CFS.Dashboard.refreshAll();
        });

        // Filter Riwayat
        document.getElementById('filterTransaksi')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const filters = {
                produk: document.getElementById('filterProduk').value,
                klien: document.getElementById('filterKlien').value,
                startDate: document.getElementById('filterStart').value,
                endDate: document.getElementById('filterEnd').value
            };
            const trx = await CFS.Sales.getFilteredTransactions(filters);
            CFS.App.renderTransactionTable(trx);
        });

        // Ekspor Excel
        document.getElementById('exportExcelBtn')?.addEventListener('click', async () => {
            const today = new Date();
            const start = new Date(today.getFullYear(), today.getMonth(), 1);
            const rows = await CFS.Accounting.exportToExcel(start, today);
            if (rows.length === 0) return showToast('Info', 'Tidak ada data jurnal.', 'info');
            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Jurnal');
            XLSX.writeFile(wb, `jurnal_${start.toISOString().slice(0,7)}.xlsx`);
            showToast('Sukses', 'File Excel diunduh.', 'success');
        });

        // Lihat Buku Besar
        document.getElementById('viewJournalBtn')?.addEventListener('click', async () => {
            const journals = await CFS.Accounting.getJournals();
            const tbody = document.getElementById('journalTableBody');
            const viewer = document.getElementById('journalViewer');
            if (!tbody || !viewer) return;
            viewer.classList.toggle('hidden');
            const rows = [];
            journals.forEach(j => {
                j.entries.forEach(e => {
                    rows.push({
                        tanggal: new Date(j.tanggal).toLocaleDateString('id-ID'),
                        deskripsi: j.deskripsi,
                        akun: e.akun,
                        debet: e.debet,
                        kredit: e.kredit
                    });
                });
            });
            tbody.innerHTML = rows.map(r => `<tr class="border-b">
                <td class="p-2">${r.tanggal}</td>
                <td class="p-2">${r.deskripsi}</td>
                <td class="p-2">${r.akun}</td>
                <td class="p-2 text-right">${r.debet > 0 ? CFS.Utils.formatRupiah(r.debet) : ''}</td>
                <td class="p-2 text-right">${r.kredit > 0 ? CFS.Utils.formatRupiah(r.kredit) : ''}</td>
            </tr>`).join('');
        });

        // Simpan Pengaturan
        document.getElementById('saveSettingsBtn')?.addEventListener('click', async () => {
            const settings = {
                ppn: parseFloat(document.getElementById('setPPN').value),
                pph25: parseFloat(document.getElementById('setPPh25').value),
                pph21: parseFloat(document.getElementById('setPPh21').value),
                ptShare: parseFloat(document.getElementById('setPTShare').value),
                minGrosir: parseFloat(document.getElementById('setMinGrosir').value),
                minPartai: parseFloat(document.getElementById('setMinPartai').value),
                selisihGrosir: parseFloat(document.getElementById('setSelisihGrosir').value),
                marginDefault: parseFloat(document.getElementById('setMarginDefault').value) || 15000
            };
            await CFS.Settings.save(settings);
            showToast('Tersimpan', 'Pengaturan diperbarui.', 'success');
        });
    },

    setupDashboardToggles() {
        document.querySelectorAll('.widget-toggle').forEach(checkbox => {
            checkbox.addEventListener('change', async (e) => {
                const key = e.target.dataset.widget;
                const s = await CFS.Settings.get();
                s.widgetVisibility[key] = e.target.checked;
                await CFS.Settings.save(s);
                this.applyWidgetVisibility();
                if (key === 'revenueChart' && e.target.checked) CFS.Dashboard.renderRevenueChart();
            });
        });
    },

    async applyWidgetVisibility() {
        const s = await CFS.Settings.get();
        const vis = s.widgetVisibility || {};
        document.getElementById('widget-stockSummary')?.classList.toggle('hidden', !vis.stockSummary);
        document.getElementById('widget-expiringBatches')?.classList.toggle('hidden', !vis.expiringBatches);
        document.getElementById('widget-revenueChart')?.classList.toggle('hidden', !vis.revenueChart);
        document.getElementById('widget-profitLoss')?.classList.toggle('hidden', !vis.profitLoss);
        document.getElementById('widget-quickActions')?.classList.toggle('hidden', !vis.quickActions);
    },

    setupBackupRestore() {
        window.CFS.App.backupData = async () => {
            const [batches, journals, settings, transactions] = await Promise.all([
                CFS.Storage.get(CFS.Storage.STOCK_KEY),
                CFS.Storage.get(CFS.Storage.JOURNALS_KEY),
                CFS.Storage.get(CFS.Storage.SETTINGS_KEY),
                CFS.Storage.get(CFS.Storage.TRANSACTIONS_KEY)
            ]);
            const blob = new Blob([JSON.stringify({ batches, journals, settings, transactions }, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `cfs_backup_${new Date().toISOString().slice(0,10)}.json`;
            a.click();
            showToast('Backup', 'Data diekspor.', 'success');
        };

        window.CFS.App.restorePrompt = () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = async (e) => {
                const file = e.target.files[0];
                const text = await file.text();
                const data = JSON.parse(text);
                if (data.batches) await CFS.Storage.set(CFS.Storage.STOCK_KEY, data.batches);
                if (data.journals) await CFS.Storage.set(CFS.Storage.JOURNALS_KEY, data.journals);
                if (data.settings) await CFS.Storage.set(CFS.Storage.SETTINGS_KEY, data.settings);
                if (data.transactions) await CFS.Storage.set(CFS.Storage.TRANSACTIONS_KEY, data.transactions);
                alert('Data berhasil dipulihkan!');
                location.reload();
            };
            input.click();
        };
    },

    setupBatchModal() {
        const modal = document.getElementById('batchDetailModal');
        const select = document.getElementById('batchProdukSelect');
        if (!select) return;
        select.innerHTML = '<option value="">Semua Produk</option>' +
            CFS.Inventory.PRODUCT_LIST.map(p => `<option value="${p}">${p}</option>`).join('');
        select.addEventListener('change', async () => {
            await CFS.Inventory.renderBatchDetail(select.value, 'batchDetailContent');
        });
        // Isi awal
        CFS.Inventory.renderBatchDetail('', 'batchDetailContent');
    },

    async lihatBatch(produk) {
        const modal = document.getElementById('batchDetailModal');
        const select = document.getElementById('batchProdukSelect');
        if (select) select.value = produk;
        await CFS.Inventory.renderBatchDetail(produk, 'batchDetailContent');
        modal?.classList.remove('hidden');
    },

    renderTransactionTable(transactions) {
        const tbody = document.getElementById('historyTableBody');
        if (!tbody) return;
        if (!transactions || transactions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center opacity-50">Tidak ada transaksi.</td></tr>';
            return;
        }
        tbody.innerHTML = transactions.map(t => `
            <tr class="border-b hover:bg-slate-50 dark:hover:bg-slate-800">
                <td class="p-3">${new Date(t.tanggal).toLocaleDateString('id-ID')}</td>
                <td class="p-3">${t.klien}</td>
                <td class="p-3">${t.produk}</td>
                <td class="p-3 text-right">${t.qty} kg</td>
                <td class="p-3 text-right font-semibold">${CFS.Utils.formatRupiah(t.totalInvoice)}</td>
                <td class="p-3 text-center"><span class="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-xs">${t.tier}</span></td>
            </tr>
        `).join('');
    },

    async loadSettings() {
        const s = await CFS.Settings.get();
        document.getElementById('setPPN').value = s.ppn;
        document.getElementById('setPPh25').value = s.pph25;
        document.getElementById('setPPh21').value = s.pph21;
        document.getElementById('setPTShare').value = s.ptShare;
        document.getElementById('setMinGrosir').value = s.minGrosir;
        document.getElementById('setMinPartai').value = s.minPartai;
        document.getElementById('setSelisihGrosir').value = s.selisihGrosir;
        const marginEl = document.getElementById('setMarginDefault');
        if (marginEl) marginEl.value = s.marginDefault || 15000;
        // Check widget visibility checkboxes
        const vis = s.widgetVisibility || CFS.Settings.DEFAULTS.widgetVisibility;
        document.querySelectorAll('.widget-toggle').forEach(cb => {
            if (vis[cb.dataset.widget] !== undefined) cb.checked = vis[cb.dataset.widget];
        });
    },

    populateDropdowns() {
        const productOptions = CFS.Inventory.PRODUCT_LIST.map(p => `<option value="${p}">${p}</option>`).join('');
        document.querySelectorAll('#stockProduk, #salesProduk, #filterProduk').forEach(sel => {
            sel.innerHTML = '<option value="">Pilih Produk</option>' + productOptions;
        });
    }
};

// Inisialisasi setelah DOM siap
window.addEventListener('DOMContentLoaded', () => {
    CFS.App.init();
});
