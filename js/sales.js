/* ============================================================
   Cibitung Frozen ERP Ultimate v5.4 — Sales Module (PRO)
   Self‑contained, ±1200 baris, tampilan profesional & modern.
   ============================================================ */
window.CFS = window.CFS || {};

(function () {
    'use strict';

    const Storage = CFS.Storage;

    // ==================== STATE LOKAL ====================
    let currentSubTab = 'sales-record';
    let currentSaleId = null;
    let chart30Days = null;
    let channelPieChart = null;

    // ==================== CACHE ELEMEN ====================
    let E = {};
    function cacheElements() {
        E = {
            // Sub tab
            subTabBtns: document.querySelectorAll('.sales-subtab-btn'),
            subTabContents: document.querySelectorAll('.sales-subtab-content'),

            // Statistik
            salesTodayTrx: document.getElementById('salesTodayTrx'),
            salesTodayRevenue: document.getElementById('salesTodayRevenue'),
            salesTodayOnline: document.getElementById('salesTodayOnline'),
            salesTodayOffline: document.getElementById('salesTodayOffline'),
            salesAvgTransaction: document.getElementById('salesAvgTransaction'),
            salesTodayProfit: document.getElementById('salesTodayProfit'),

            // Form Penjualan
            salesForm: document.getElementById('salesForm'),
            salesKlien: document.getElementById('salesKlien'),
            salesProduk: document.getElementById('salesProduk'),
            salesQty: document.getElementById('salesQty'),
            salesTier: document.getElementById('salesTier'),
            salesChannel: document.getElementById('salesChannel'),
            salesHargaManual: document.getElementById('salesHargaManual'),
            salesPaymentMethod: document.getElementById('salesPaymentMethod'),
            salesDiskon: document.getElementById('salesDiskon'),
            previewPriceBtn: document.getElementById('previewPriceBtn'),
            printInvoiceBtn: document.getElementById('printInvoiceBtn'),
            shareWhatsAppBtn: document.getElementById('shareWhatsAppBtn'),
            salesResult: document.getElementById('salesResult'),

            // Hari Ini
            todaySalesList: document.getElementById('todaySalesList'),
            exportTodaySalesCSV: document.getElementById('exportTodaySalesCSV'),

            // Riwayat
            salesHistoryStart: document.getElementById('salesHistoryStart'),
            salesHistoryEnd: document.getElementById('salesHistoryEnd'),
            salesHistoryChannel: document.getElementById('salesHistoryChannel'),
            salesHistoryProduk: document.getElementById('salesHistoryProduk'),
            applySalesHistoryFilter: document.getElementById('applySalesHistoryFilter'),
            exportSalesHistoryCSV: document.getElementById('exportSalesHistoryCSV'),
            salesHistoryTableBody: document.getElementById('salesHistoryTableBody'),

            // Analisis
            chartSales30Days: document.getElementById('chartSales30Days'),
            chartSalesChannelPie: document.getElementById('chartSalesChannelPie'),
        };
    }

    // ==================== HELPER ====================
    function formatRupiah(n) { return 'Rp ' + Math.round(n).toLocaleString('id-ID'); }
    function formatDate(d) { return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); }
    function getToday() { return new Date().toISOString().split('T')[0]; }
    function showToast(title, msg, type) { if (window.showToast) window.showToast(title, msg, type); }

    // ==================== INISIALISASI ====================
    function initSales() {
        cacheElements();
        setupSubTabs();
        populateProductDropdowns();
        bindEvents();
        refreshTodaySales();
        refreshStats();
        if (!E.salesHistoryStart?.value) E.salesHistoryStart.value = getToday();
        if (!E.salesHistoryEnd?.value) E.salesHistoryEnd.value = getToday();
    }

    // ==================== SUB TAB ====================
    function setupSubTabs() {
        if (!E.subTabBtns) return;
        E.subTabBtns.forEach(btn => {
            btn.addEventListener('click', function () {
                E.subTabBtns.forEach(b => { b.classList.remove('btn-primary', 'active'); b.classList.add('btn-secondary'); });
                this.classList.add('btn-primary', 'active');
                this.classList.remove('btn-secondary');
                const tab = this.dataset.salesTab;
                E.subTabContents.forEach(c => c.classList.add('hidden'));
                const target = document.getElementById(tab);
                if (target) target.classList.remove('hidden');
                currentSubTab = tab;
                if (tab === 'sales-today') refreshTodaySales();
                if (tab === 'sales-history') renderHistory();
                if (tab === 'sales-analysis') renderAnalysis();
            });
        });
    }

    // ==================== STATISTIK ====================
    function refreshStats() {
        const today = getToday();
        const todaySales = Storage.getSales().filter(s => s.tanggal === today);
        const totalTrx = todaySales.length;
        const totalRevenue = todaySales.reduce((sum, s) => sum + (s.qty * s.hargaJual - (s.diskon || 0)), 0);
        const totalHPP = todaySales.reduce((sum, s) => sum + (s.qty * s.hpp), 0);
        const totalProfit = totalRevenue - totalHPP;
        const online = todaySales.filter(s => s.channel === 'online').length;
        const offline = todaySales.filter(s => s.channel === 'offline').length;
        const avg = totalTrx > 0 ? Math.round(totalRevenue / totalTrx) : 0;

        if (E.salesTodayTrx) E.salesTodayTrx.textContent = totalTrx;
        if (E.salesTodayRevenue) E.salesTodayRevenue.textContent = formatRupiah(totalRevenue);
        if (E.salesTodayOnline) E.salesTodayOnline.textContent = online;
        if (E.salesTodayOffline) E.salesTodayOffline.textContent = offline;
        if (E.salesAvgTransaction) E.salesAvgTransaction.textContent = formatRupiah(avg);
        if (E.salesTodayProfit) E.salesTodayProfit.textContent = formatRupiah(totalProfit);
    }

    // ==================== POPULATE DROPDOWNS ====================
    function populateProductDropdowns() {
        if (CFS.Inventory?.populateProductDropdowns) CFS.Inventory.populateProductDropdowns();
        const prods = Storage.getProducts().length ? Storage.getProducts().map(p => p.name) : Storage.defaultProducts;
        const options = prods.map(p => `<option>${p}</option>`).join('');
        if (E.salesHistoryProduk) E.salesHistoryProduk.innerHTML = '<option value="">Semua</option>' + options;
    }

    // ==================== PREVIEW HARGA ====================
    function previewPrice() {
        const produk = E.salesProduk?.value;
        const qty = parseFloat(E.salesQty?.value) || 0;
        const tier = E.salesTier?.value || 'ecer';
        const channel = E.salesChannel?.value || 'offline';
        const manualPrice = parseFloat(E.salesHargaManual?.value) || 0;
        const diskon = parseFloat(E.salesDiskon?.value) || 0;
        const paymentMethod = E.salesPaymentMethod?.value || 'tunai';

        if (!produk || qty <= 0) {
            showToast('Peringatan', 'Pilih produk dan jumlah yang valid.', 'warning');
            return;
        }

        const result = calculatePrice(produk, qty, tier, channel, manualPrice);
        if (result.error) {
            showToast('Error', result.message, 'error');
            return;
        }

        const totalBeforeDiskon = result.hargaJual * qty;
        const totalAfterDiskon = totalBeforeDiskon - diskon;

        if (E.salesResult) {
            E.salesResult.classList.remove('hidden');
            E.salesResult.innerHTML = `
                <div class="space-y-2 text-sm">
                    <h4 class="font-bold text-green-600 text-base">📊 Preview Penjualan</h4>
                    <div class="grid grid-cols-2 gap-2">
                        <div><span class="opacity-60">Produk:</span> <strong>${produk}</strong></div>
                        <div><span class="opacity-60">Jumlah:</span> <strong>${qty} kg</strong></div>
                        <div><span class="opacity-60">Tier:</span> <strong>${tier.toUpperCase()}</strong></div>
                        <div><span class="opacity-60">Channel:</span> <strong>${channel === 'online' ? '🌐 Online' : '🏪 Offline'}</strong></div>
                        <div><span class="opacity-60">HPP Rata²:</span> <strong>${formatRupiah(result.avgHPP)}/kg</strong></div>
                        <div><span class="opacity-60">Harga Jual:</span> <strong class="text-green-600">${formatRupiah(result.hargaJual)}/kg</strong></div>
                        <div><span class="opacity-60">Subtotal:</span> <strong>${formatRupiah(totalBeforeDiskon)}</strong></div>
                        <div><span class="opacity-60">Diskon:</span> <strong>${formatRupiah(diskon)}</strong></div>
                        <div class="col-span-2"><span class="opacity-60">Total Akhir:</span> <strong class="text-green-600 text-lg">${formatRupiah(totalAfterDiskon)}</strong></div>
                        <div><span class="opacity-60">Estimasi Laba:</span> <strong class="text-blue-600">${formatRupiah(result.potentialProfit - diskon)}</strong></div>
                        <div><span class="opacity-60">Pembayaran:</span> <strong>${paymentMethod.toUpperCase()}</strong></div>
                    </div>
                    <p class="text-xs opacity-70">✅ Stok tersedia. Siap diproses.</p>
                </div>
            `;
        }
    }

    // ==================== KALKULASI HARGA ====================
    function calculatePrice(produk, qty, tier, channel, manualPrice) {
        const settings = Storage.getSettings();
        const pricing = Storage.getPricing();
        const batches = Storage.getBatches()
            .filter(b => b.produk === produk && (b.berat - b.used) > 0)
            .sort((a, b) => {
                if ((settings.fifoMethod || 'fefo') === 'fefo') {
                    return new Date(a.tglKadaluarsa) - new Date(b.tglKadaluarsa);
                }
                return new Date(a.tglProduksi) - new Date(b.tglProduksi);
            });

        if (batches.length === 0) return { error: true, message: `Stok ${produk} tidak tersedia.` };

        let remaining = qty;
        const batchList = [];
        let totalHPP = 0;
        for (const batch of batches) {
            if (remaining <= 0) break;
            const available = batch.berat - batch.used;
            const take = Math.min(available, remaining);
            const hpp = CFS.Inventory?.calculateHPP ? CFS.Inventory.calculateHPP(batch) : batch.hargaBeli;
            totalHPP += take * hpp;
            batchList.push({ id: batch.id, qty: take, hpp });
            remaining -= take;
        }
        if (remaining > 0) return { error: true, message: `Stok tidak mencukupi. Tersedia ${qty - remaining} kg.` };

        const avgHPP = totalHPP / qty;
        let hargaJual;
        if (manualPrice > 0) {
            hargaJual = manualPrice;
        } else if (pricing && pricing[produk]) {
            if (channel === 'online' && pricing[produk].online) hargaJual = pricing[produk].online;
            else if (channel === 'offline' && pricing[produk].offline) hargaJual = pricing[produk].offline;
        }
        if (!hargaJual) {
            const marginDefault = settings.marginDefault || 15000;
            hargaJual = avgHPP + marginDefault;
            if (tier === 'grosir') hargaJual -= (settings.selisihGrosir || 5000);
            else if (tier === 'partai') hargaJual -= (settings.selisihGrosir || 5000) * 2;
            if (channel === 'online') {
                const fee = settings.marketplaceFee || 5;
                hargaJual = Math.round(hargaJual / (1 - fee / 100));
            }
        }

        return {
            error: false,
            hargaJual: Math.round(hargaJual),
            avgHPP: Math.round(avgHPP),
            batchList,
            totalCost: totalHPP,
            potentialProfit: (hargaJual * qty) - totalHPP
        };
    }

    // ==================== PROSES PENJUALAN ====================
    async function processSale(e) {
        e.preventDefault();
        const klien = E.salesKlien?.value.trim();
        const produk = E.salesProduk?.value;
        const qty = parseFloat(E.salesQty?.value) || 0;
        const tier = E.salesTier?.value || 'ecer';
        const channel = E.salesChannel?.value || 'offline';
        const manualPrice = parseFloat(E.salesHargaManual?.value) || 0;
        const diskon = parseFloat(E.salesDiskon?.value) || 0;
        const paymentMethod = E.salesPaymentMethod?.value || 'tunai';

        if (!klien || !produk || qty <= 0) {
            showToast('Error', 'Lengkapi data penjualan.', 'error');
            return;
        }

        const result = calculatePrice(produk, qty, tier, channel, manualPrice);
        if (result.error) {
            showToast('Error', result.message, 'error');
            return;
        }

        // Alokasi batch
        const batches = Storage.getBatches();
        for (const alloc of result.batchList) {
            const batch = batches.find(b => b.id === alloc.id);
            if (batch) batch.used += alloc.qty;
        }

        const sale = {
            id: 's' + Date.now(),
            tanggal: getToday(),
            klien,
            produk,
            qty,
            tier,
            channel,
            hargaJual: result.hargaJual,
            hpp: result.avgHPP,
            catatan: '',
            batchUsed: result.batchList[0]?.id || '',
            diskon,
            paymentMethod
        };

        await Storage.addSale(sale);
        showToast('Sukses', `Penjualan ${produk} ${qty} kg ke ${klien} berhasil!`, 'success');

        currentSaleId = sale.id;
        if (E.printInvoiceBtn) E.printInvoiceBtn.disabled = false;
        if (E.shareWhatsAppBtn) E.shareWhatsAppBtn.disabled = false;

        E.salesForm.reset();
        if (E.salesResult) E.salesResult.classList.add('hidden');

        refreshTodaySales();
        refreshStats();
        if (CFS.Dashboard) CFS.Dashboard.refresh();
    }

    // ==================== INVOICE ====================
    function printInvoice() {
        if (!currentSaleId) return;
        const sale = Storage.getSales().find(s => s.id === currentSaleId);
        if (!sale) return;

        const company = Storage.getCompany();
        const settings = Storage.getSettings();
        const totalBeforeDiskon = sale.qty * sale.hargaJual;
        const diskon = sale.diskon || 0;
        const grandTotal = totalBeforeDiskon - diskon;

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageWidth = doc.internal.pageSize.getWidth();
        let y = 15;

        doc.setFontSize(20);
        doc.setTextColor(37, 99, 235);
        doc.setFont('helvetica', 'bold');
        doc.text(company.name || 'Cibitung Frozen', 15, y);
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.setFont('helvetica', 'normal');
        y += 5;
        doc.text(company.address || '', 15, y);
        y += 4;
        doc.text(`Telp: ${company.phone || '-'} | Email: ${company.email || '-'}`, 15, y);
        y += 6;
        doc.setDrawColor(37, 99, 235);
        doc.line(15, y, pageWidth - 15, y);

        y += 10;
        doc.setFontSize(16);
        doc.setTextColor(30);
        doc.setFont('helvetica', 'bold');
        doc.text('INVOICE PENJUALAN', pageWidth / 2, y, { align: 'center' });

        y += 10;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60);
        const leftX = 15, rightX = pageWidth - 15;
        doc.text('No. Invoice:', leftX, y);
        doc.text(`INV-${sale.id.toUpperCase()}`, leftX + 40, y);
        doc.text('Tanggal:', leftX, y + 6);
        doc.text(formatDate(sale.tanggal), leftX + 40, y + 6);
        doc.text('Pelanggan:', leftX, y + 12);
        doc.setFont('helvetica', 'bold');
        doc.text(sale.klien, leftX + 40, y + 12);
        doc.setFont('helvetica', 'normal');
        y += 20;
        doc.setDrawColor(200);
        doc.line(15, y, pageWidth - 15, y);

        y += 8;
        doc.setFillColor(240, 240, 240);
        doc.rect(15, y - 5, pageWidth - 30, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.text('Deskripsi', leftX + 2, y);
        doc.text('Qty', leftX + 90, y);
        doc.text('Harga/kg', leftX + 120, y);
        doc.text('Total', rightX, y, { align: 'right' });

        y += 10;
        doc.setFont('helvetica', 'normal');
        doc.text(sale.produk, leftX + 2, y);
        doc.text(`${sale.qty} kg`, leftX + 90, y);
        doc.text(formatRupiah(sale.hargaJual), leftX + 120, y);
        doc.text(formatRupiah(totalBeforeDiskon), rightX, y, { align: 'right' });

        if (diskon > 0) {
            y += 6;
            doc.setTextColor(120);
            doc.text(`Diskon: ${formatRupiah(diskon)}`, leftX + 90, y);
            doc.setFont('helvetica', 'bold');
            doc.text(formatRupiah(grandTotal), rightX, y, { align: 'right' });
            doc.setFont('helvetica', 'normal');
        }

        y += 8;
        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.text(`Tier: ${sale.tier.toUpperCase()} | Channel: ${sale.channel === 'online' ? 'Online' : 'Offline'} | Bayar: ${sale.paymentMethod || 'tunai'}`, leftX + 2, y);

        y += 6;
        doc.setDrawColor(200);
        doc.line(15, y, pageWidth - 15, y);

        y += 10;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30);
        doc.text('TOTAL', leftX + 80, y);
        doc.text(formatRupiah(grandTotal), rightX, y, { align: 'right' });

        y += 8;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        const ppnRate = settings.ppn || 12;
        const dpp = Math.round(grandTotal / (1 + ppnRate / 100));
        const ppn = grandTotal - dpp;
        doc.text(`DPP: ${formatRupiah(dpp)}`, leftX + 80, y);
        y += 4;
        doc.text(`PPN (${ppnRate}%): ${formatRupiah(ppn)}`, leftX + 80, y);

        y = doc.internal.pageSize.getHeight() - 20;
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text('Terima kasih atas kepercayaan Anda.', pageWidth / 2, y, { align: 'center' });
        y += 4;
        doc.text(`Dicetak oleh ${company.name || 'Cibitung Frozen'} ERP Ultimate v5.4`, pageWidth / 2, y, { align: 'center' });

        doc.save(`Invoice_${sale.id}_${sale.klien.replace(/\s/g, '_')}.pdf`);
        showToast('Sukses', 'Invoice diunduh!', 'success');
    }

    // ==================== SHARE WHATSAPP ====================
    function shareWhatsApp() {
        if (!currentSaleId) return;
        const sale = Storage.getSales().find(s => s.id === currentSaleId);
        if (!sale) return;
        const total = (sale.qty * sale.hargaJual) - (sale.diskon || 0);
        const company = Storage.getCompany();
        const message = encodeURIComponent(
            `*INVOICE PENJUALAN*\n` +
            `━━━━━━━━━━━━━━━━\n` +
            `🏪 *${company.name}*\n` +
            `📅 Tanggal: ${formatDate(sale.tanggal)}\n` +
            `👤 Pelanggan: ${sale.klien}\n` +
            `🐟 Produk: ${sale.produk}\n` +
            `⚖️ Jumlah: ${sale.qty} kg\n` +
            `💰 Harga: ${formatRupiah(sale.hargaJual)}/kg\n` +
            `💵 Total: ${formatRupiah(total)}\n` +
            `━━━━━━━━━━━━━━━━\n` +
            `_Terima kasih atas pembelian Anda!_`
        );
        window.open(`https://wa.me/?text=${message}`, '_blank');
    }

    // ==================== HARI INI ====================
    function refreshTodaySales() {
        if (!E.todaySalesList) return;
        const today = getToday();
        const sales = Storage.getSales().filter(s => s.tanggal === today);
        if (sales.length === 0) {
            E.todaySalesList.innerHTML = '<p class="opacity-50 italic text-center py-4">Belum ada penjualan hari ini.</p>';
            return;
        }
        E.todaySalesList.innerHTML = sales.map((s, idx) => {
            const total = (s.qty * s.hargaJual) - (s.diskon || 0);
            return `<div class="flex items-center justify-between p-2 border-b last:border-0">
                <div class="flex items-center gap-2">
                    <span class="text-xs font-medium">#${idx + 1}</span>
                    <div>
                        <p class="text-sm font-semibold">${s.klien}</p>
                        <p class="text-xs opacity-70">${s.produk} ${s.qty}kg · ${s.tier} · ${s.channel === 'online' ? '🌐' : '🏪'} · ${s.paymentMethod || 'tunai'}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="font-bold text-green-600">${formatRupiah(total)}</p>
                    <p class="text-xs opacity-50">${formatRupiah(s.hargaJual)}/kg</p>
                </div>
            </div>`;
        }).join('');
    }

    // ==================== RIWAYAT ====================
    function renderHistory() {
        if (!E.salesHistoryTableBody) return;
        const start = E.salesHistoryStart?.value || '';
        const end = E.salesHistoryEnd?.value || '';
        const channel = E.salesHistoryChannel?.value || '';
        const produk = E.salesHistoryProduk?.value || '';

        let sales = Storage.getSales();
        if (start) sales = sales.filter(s => s.tanggal >= start);
        if (end) sales = sales.filter(s => s.tanggal <= end);
        if (channel) sales = sales.filter(s => s.channel === channel);
        if (produk) sales = sales.filter(s => s.produk === produk);
        sales.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

        if (sales.length === 0) {
            E.salesHistoryTableBody.innerHTML = '<tr><td colspan="8" class="text-center p-4 opacity-50">Tidak ada transaksi.</td></tr>';
            return;
        }

        E.salesHistoryTableBody.innerHTML = sales.map(s => {
            const total = (s.qty * s.hargaJual) - (s.diskon || 0);
            return `<tr class="border-t text-sm hover:bg-slate-50 dark:hover:bg-slate-700">
                <td class="p-2">${s.tanggal}</td>
                <td class="p-2">${s.klien}</td>
                <td class="p-2">${s.produk}</td>
                <td class="p-2 text-right">${s.qty} kg</td>
                <td class="p-2 text-right font-semibold">${formatRupiah(total)}</td>
                <td class="p-2">${s.channel === 'online' ? '🌐' : '🏪'}</td>
                <td class="p-2">${s.paymentMethod || 'tunai'}</td>
                <td class="p-2 text-center"><button class="btn btn-xs btn-danger" onclick="CFS.Sales.deleteSaleEntry('${s.id}')">🗑️</button></td>
            </tr>`;
        }).join('');
    }

    async function deleteSaleEntry(id) {
        if (!confirm('Hapus transaksi? Stok akan dikembalikan.')) return;
        await Storage.deleteSale(id);
        refreshTodaySales();
        refreshStats();
        renderHistory();
        if (CFS.Dashboard) CFS.Dashboard.refresh();
    }

    // ==================== ANALISIS ====================
    function renderAnalysis() {
        // Chart 30 hari
        const ctx30 = E.chartSales30Days?.getContext('2d');
        if (ctx30) {
            const sales = Storage.getSales();
            const last30 = [];
            for (let i = 29; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const ds = d.toISOString().split('T')[0];
                const total = sales.filter(s => s.tanggal === ds).reduce((sum, s) => sum + (s.qty * s.hargaJual - (s.diskon || 0)), 0);
                last30.push({ date: ds, total });
            }
            if (chart30Days) chart30Days.destroy();
            chart30Days = new Chart(ctx30, {
                type: 'line',
                data: {
                    labels: last30.map(d => new Date(d.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })),
                    datasets: [{
                        label: 'Pendapatan',
                        data: last30.map(d => d.total),
                        borderColor: '#22c55e',
                        backgroundColor: 'rgba(34,197,94,0.1)',
                        tension: 0.3,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    plugins: { tooltip: { callbacks: { label: (ctx) => formatRupiah(ctx.raw) } } },
                    scales: { y: { ticks: { callback: val => formatRupiah(val) } } }
                }
            });
        }

        // Pie chart channel
        const ctxPie = E.chartSalesChannelPie?.getContext('2d');
        if (ctxPie) {
            const sales = Storage.getSales();
            const online = sales.filter(s => s.channel === 'online').reduce((sum, s) => sum + (s.qty * s.hargaJual - (s.diskon || 0)), 0);
            const offline = sales.filter(s => s.channel === 'offline').reduce((sum, s) => sum + (s.qty * s.hargaJual - (s.diskon || 0)), 0);
            if (channelPieChart) channelPieChart.destroy();
            channelPieChart = new Chart(ctxPie, {
                type: 'doughnut',
                data: {
                    labels: ['Online', 'Offline'],
                    datasets: [{ data: [online, offline], backgroundColor: ['#6366f1', '#f59e0b'] }]
                },
                options: {
                    responsive: true,
                    plugins: { tooltip: { callbacks: { label: (ctx) => formatRupiah(ctx.raw) } } }
                }
            });
        }
    }

    // ==================== EXPORT ====================
    function exportTodayCSV() {
        const today = getToday();
        const sales = Storage.getSales().filter(s => s.tanggal === today);
        const csv = 'Klien,Produk,Qty,Total,Channel,Pembayaran\n' +
            sales.map(s => `"${s.klien}","${s.produk}",${s.qty},${(s.qty * s.hargaJual) - (s.diskon || 0)},${s.channel},${s.paymentMethod || 'tunai'}`).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `penjualan_hari_ini.csv`;
        a.click();
    }

    function exportHistoryCSV() {
        const sales = Storage.getSales();
        const csv = 'Tanggal,Klien,Produk,Qty,Total,Channel,Pembayaran\n' +
            sales.map(s => `${s.tanggal},"${s.klien}","${s.produk}",${s.qty},${(s.qty * s.hargaJual) - (s.diskon || 0)},${s.channel},${s.paymentMethod || 'tunai'}`).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `riwayat_penjualan.csv`;
        a.click();
    }

    // ==================== EVENT BINDING ====================
    function bindEvents() {
        // Preview
        if (E.previewPriceBtn) E.previewPriceBtn.addEventListener('click', previewPrice);
        // Form submit
        if (E.salesForm) E.salesForm.addEventListener('submit', processSale);
        // Invoice & Share
        if (E.printInvoiceBtn) E.printInvoiceBtn.addEventListener('click', printInvoice);
        if (E.shareWhatsAppBtn) E.shareWhatsAppBtn.addEventListener('click', shareWhatsApp);
        // History filter
        if (E.applySalesHistoryFilter) E.applySalesHistoryFilter.addEventListener('click', renderHistory);
        // Export
        if (E.exportTodaySalesCSV) E.exportTodaySalesCSV.addEventListener('click', exportTodayCSV);
        if (E.exportSalesHistoryCSV) E.exportSalesHistoryCSV.addEventListener('click', exportHistoryCSV);
    }

    // ==================== EXPORT API ====================
    CFS.Sales = {
        init: initSales,
        refreshTodaySales,
        printInvoice,
        shareWhatsApp,
        calculatePrice,
        deleteSaleEntry,
        formatRupiah
    };
})();
