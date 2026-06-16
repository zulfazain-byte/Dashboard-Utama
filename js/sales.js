/* ============================================================
   Cibitung Frozen ERP Ultimate v5.4 — Sales Module (PRO)
   Self‑contained, ±2000 baris, dukungan multi‑item & profesional.
   ============================================================ */
window.CFS = window.CFS || {};

(function () {
    'use strict';

    const Storage = CFS.Storage;

    // ==================== STATE ====================
    let currentSubTab = 'sales-record';
    let currentTransactionId = null;   // ID transaksi aktif (untuk invoice)
    let items = [];                    // Item sementara: { produk, qty, hargaManual, diskon, result }
    let editingItemIndex = -1;

    // Chart instances
    let chart30Days = null;
    let channelPieChart = null;

    // ==================== CACHE ELEMEN ====================
    let E = {};
    function cacheElements() {
        E = {
            subTabBtns: document.querySelectorAll('.sales-subtab-btn'),
            subTabContents: document.querySelectorAll('.sales-subtab-content'),

            // Statistik
            salesTodayTrx: document.getElementById('salesTodayTrx'),
            salesTodayRevenue: document.getElementById('salesTodayRevenue'),
            salesTodayOnline: document.getElementById('salesTodayOnline'),
            salesTodayOffline: document.getElementById('salesTodayOffline'),
            salesAvgTransaction: document.getElementById('salesAvgTransaction'),
            salesTodayProfit: document.getElementById('salesTodayProfit'),

            // Form Penjualan (multi-item)
            salesForm: document.getElementById('salesForm'),
            salesKlien: document.getElementById('salesKlien'),
            salesTier: document.getElementById('salesTier'),
            salesChannel: document.getElementById('salesChannel'),
            salesPaymentMethod: document.getElementById('salesPaymentMethod'),

            // Item controls
            salesProduk: document.getElementById('salesProduk'),
            salesQty: document.getElementById('salesQty'),
            salesHargaManual: document.getElementById('salesHargaManual'),
            salesItemDiskon: document.getElementById('salesItemDiskon'),
            addItemBtn: document.getElementById('addItemBtn'),
            updateItemBtn: document.getElementById('updateItemBtn'),
            cancelEditItemBtn: document.getElementById('cancelEditItemBtn'),
            itemsTableBody: document.getElementById('itemsTableBody'),
            itemsTotalDisplay: document.getElementById('itemsTotalDisplay'),

            // Tombol aksi
            previewTransactionBtn: document.getElementById('previewTransactionBtn'),
            processSaleBtn: document.getElementById('processSaleBtn'),
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
        clearItems();
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
        const allSales = Storage.getSales();
        const todaySales = allSales.filter(s => s.tanggal === today);
        const totalTrx = new Set(todaySales.map(s => s.transactionId || s.id)).size; // hitung transaksi unik
        const totalRevenue = todaySales.reduce((sum, s) => sum + (s.qty * s.hargaJual - (s.diskon || 0)), 0);
        const totalHPP = todaySales.reduce((sum, s) => sum + (s.qty * s.hpp), 0);
        const totalProfit = totalRevenue - totalHPP;
        const onlineSet = new Set(todaySales.filter(s => s.channel === 'online').map(s => s.transactionId || s.id));
        const offlineSet = new Set(todaySales.filter(s => s.channel === 'offline').map(s => s.transactionId || s.id));
        const avg = totalTrx > 0 ? Math.round(totalRevenue / totalTrx) : 0;

        if (E.salesTodayTrx) E.salesTodayTrx.textContent = totalTrx;
        if (E.salesTodayRevenue) E.salesTodayRevenue.textContent = formatRupiah(totalRevenue);
        if (E.salesTodayOnline) E.salesTodayOnline.textContent = onlineSet.size;
        if (E.salesTodayOffline) E.salesTodayOffline.textContent = offlineSet.size;
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

    // ==================== MANAJEMEN ITEM ====================
    function clearItems() {
        items = [];
        editingItemIndex = -1;
        renderItemsTable();
        resetItemForm();
        updateTotalDisplay();
    }

    function resetItemForm() {
        if (E.salesProduk) E.salesProduk.value = '';
        if (E.salesQty) E.salesQty.value = '';
        if (E.salesHargaManual) E.salesHargaManual.value = '';
        if (E.salesItemDiskon) E.salesItemDiskon.value = '';
        if (E.addItemBtn) E.addItemBtn.style.display = 'inline-flex';
        if (E.updateItemBtn) E.updateItemBtn.style.display = 'none';
        if (E.cancelEditItemBtn) E.cancelEditItemBtn.style.display = 'none';
        editingItemIndex = -1;
    }

    function renderItemsTable() {
        if (!E.itemsTableBody) return;
        if (items.length === 0) {
            E.itemsTableBody.innerHTML = '<tr><td colspan="6" class="text-center p-4 opacity-50">Belum ada produk ditambahkan.</td></tr>';
        } else {
            E.itemsTableBody.innerHTML = items.map((item, idx) => {
                const totalBeforeDiskon = item.qty * item.hargaJual;
                const diskon = item.diskon || 0;
                const total = totalBeforeDiskon - diskon;
                return `<tr class="border-t text-sm hover:bg-slate-50">
                    <td class="p-2">${item.produk}</td>
                    <td class="p-2 text-right">${item.qty} kg</td>
                    <td class="p-2 text-right">${formatRupiah(item.hargaJual)}</td>
                    <td class="p-2 text-right">${formatRupiah(diskon)}</td>
                    <td class="p-2 text-right font-semibold">${formatRupiah(total)}</td>
                    <td class="p-2 text-center">
                        <button class="btn btn-xs btn-secondary" onclick="CFS.Sales.editItem(${idx})"><i class="ph ph-pencil"></i></button>
                        <button class="btn btn-xs btn-danger" onclick="CFS.Sales.removeItem(${idx})"><i class="ph ph-trash"></i></button>
                    </td>
                </tr>`;
            }).join('');
        }
        updateTotalDisplay();
    }

    function updateTotalDisplay() {
        if (!E.itemsTotalDisplay) return;
        const totalSemua = items.reduce((sum, it) => {
            const subtotal = it.qty * it.hargaJual;
            return sum + subtotal - (it.diskon || 0);
        }, 0);
        E.itemsTotalDisplay.textContent = items.length > 0 ? formatRupiah(totalSemua) : 'Rp 0';
    }

    function addItemToList() {
        const produk = E.salesProduk?.value;
        const qty = parseFloat(E.salesQty?.value) || 0;
        const hargaManual = parseFloat(E.salesHargaManual?.value) || 0;
        const diskon = parseFloat(E.salesItemDiskon?.value) || 0;

        if (!produk || qty <= 0) {
            showToast('Peringatan', 'Pilih produk dan jumlah yang valid.', 'warning');
            return;
        }

        // Dapatkan harga jual yang sesuai
        const tier = E.salesTier?.value || 'ecer';
        const channel = E.salesChannel?.value || 'offline';
        const result = calculatePrice(produk, qty, tier, channel, hargaManual);
        if (result.error) {
            showToast('Error', result.message, 'error');
            return;
        }

        // Tambahkan ke array items dengan data lengkap
        items.push({
            produk,
            qty,
            hargaJual: result.hargaJual,
            hpp: result.avgHPP,
            diskon,
            batchList: result.batchList,
            totalCost: result.totalCost
        });

        clearItemsForm();
        renderItemsTable();
        showToast('Sukses', `${produk} ditambahkan ke transaksi.`, 'success');
    }

    function editItem(index) {
        if (index < 0 || index >= items.length) return;
        const item = items[index];
        if (E.salesProduk) E.salesProduk.value = item.produk;
        if (E.salesQty) E.salesQty.value = item.qty;
        if (E.salesHargaManual) E.salesHargaManual.value = item.hargaJual; // tampilkan harga yang sudah terpakai
        if (E.salesItemDiskon) E.salesItemDiskon.value = item.diskon || '';
        if (E.addItemBtn) E.addItemBtn.style.display = 'none';
        if (E.updateItemBtn) E.updateItemBtn.style.display = 'inline-flex';
        if (E.cancelEditItemBtn) E.cancelEditItemBtn.style.display = 'inline-flex';
        editingItemIndex = index;
    }

    function updateItem() {
        if (editingItemIndex < 0) return;
        const produk = E.salesProduk?.value;
        const qty = parseFloat(E.salesQty?.value) || 0;
        const hargaManual = parseFloat(E.salesHargaManual?.value) || 0;
        const diskon = parseFloat(E.salesItemDiskon?.value) || 0;

        if (!produk || qty <= 0) {
            showToast('Peringatan', 'Data tidak valid.', 'warning');
            return;
        }

        const tier = E.salesTier?.value || 'ecer';
        const channel = E.salesChannel?.value || 'offline';
        const result = calculatePrice(produk, qty, tier, channel, hargaManual);
        if (result.error) {
            showToast('Error', result.message, 'error');
            return;
        }

        items[editingItemIndex] = {
            produk,
            qty,
            hargaJual: result.hargaJual,
            hpp: result.avgHPP,
            diskon,
            batchList: result.batchList,
            totalCost: result.totalCost
        };

        clearItemsForm();
        renderItemsTable();
        showToast('Sukses', 'Item diperbarui.', 'success');
    }

    function removeItem(index) {
        items.splice(index, 1);
        if (editingItemIndex === index) clearItemsForm();
        else if (editingItemIndex > index) editingItemIndex--;
        renderItemsTable();
    }

    function clearItemsForm() {
        resetItemForm();
        // jangan reset items array, hanya form input
    }

    // ==================== KALKULASI HARGA (satu item) ====================
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

    // ==================== PROSES TRANSAKSI ====================
    async function processSale(e) {
        e.preventDefault();
        const klien = E.salesKlien?.value.trim();
        if (!klien) {
            showToast('Error', 'Nama pelanggan wajib diisi.', 'error');
            return;
        }
        if (items.length === 0) {
            showToast('Error', 'Tambahkan minimal satu produk.', 'error');
            return;
        }

        const channel = E.salesChannel?.value || 'offline';
        const paymentMethod = E.salesPaymentMethod?.value || 'tunai';
        const tier = E.salesTier?.value || 'ecer';

        // Validasi ulang stok untuk semua item (hindari perubahan stok di tengah proses)
        for (let item of items) {
            const reCalc = calculatePrice(item.produk, item.qty, tier, channel, item.hargaManual || 0);
            if (reCalc.error) {
                showToast('Error', `Stok ${item.produk} tidak mencukupi lagi.`, 'error');
                return;
            }
            // Update batchList & hpp dengan yang terbaru
            item.batchList = reCalc.batchList;
            item.hpp = reCalc.avgHPP;
            item.hargaJual = reCalc.hargaJual || item.hargaJual; // tetap gunakan harga yang sudah ada jika tidak manual
            item.totalCost = reCalc.totalCost;
        }

        const transactionId = 'trx_' + Date.now();
        const saleEntries = [];

        // Alokasi batch dan buat entry
        for (let item of items) {
            const batches = Storage.getBatches();
            for (const alloc of item.batchList) {
                const batch = batches.find(b => b.id === alloc.id);
                if (batch) {
                    batch.used += alloc.qty;
                }
            }

            saleEntries.push({
                id: 's' + Date.now() + Math.random().toString(36).substr(2, 6),
                transactionId,
                tanggal: getToday(),
                klien,
                produk: item.produk,
                qty: item.qty,
                tier,
                channel,
                hargaJual: item.hargaJual,
                hpp: item.hpp,
                catatan: '',
                batchUsed: item.batchList[0]?.id || '',
                diskon: item.diskon || 0,
                paymentMethod
            });
        }

        // Simpan semua entry
        for (const entry of saleEntries) {
            await Storage.addSale(entry);
        }

        currentTransactionId = transactionId;
        if (E.printInvoiceBtn) E.printInvoiceBtn.disabled = false;
        if (E.shareWhatsAppBtn) E.shareWhatsAppBtn.disabled = false;

        // Reset form
        E.salesForm.reset();
        clearItems();
        if (E.salesResult) E.salesResult.classList.add('hidden');

        refreshTodaySales();
        refreshStats();
        if (CFS.Dashboard) CFS.Dashboard.refresh();
        showToast('Sukses', `Transaksi berhasil! ${items.length} item terjual.`, 'success');
    }

    // ==================== INVOICE (multi-item) ====================
    function printInvoice() {
        if (!currentTransactionId) return;
        const allSales = Storage.getSales();
        const transSales = allSales.filter(s => s.transactionId === currentTransactionId);
        if (transSales.length === 0) return;

        const first = transSales[0];
        const company = Storage.getCompany();
        const settings = Storage.getSettings();
        const grandTotal = transSales.reduce((sum, s) => sum + (s.qty * s.hargaJual - (s.diskon || 0)), 0);

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
        doc.text(`INV-${currentTransactionId.toUpperCase()}`, leftX + 40, y);
        doc.text('Tanggal:', leftX, y + 6);
        doc.text(formatDate(first.tanggal), leftX + 40, y + 6);
        doc.text('Pelanggan:', leftX, y + 12);
        doc.setFont('helvetica', 'bold');
        doc.text(first.klien, leftX + 40, y + 12);
        doc.setFont('helvetica', 'normal');
        y += 20;

        // Header tabel
        doc.setFillColor(240, 240, 240);
        doc.rect(15, y - 5, pageWidth - 30, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.text('Produk', leftX + 2, y);
        doc.text('Qty', leftX + 70, y);
        doc.text('Harga/kg', leftX + 90, y);
        doc.text('Diskon', leftX + 120, y);
        doc.text('Subtotal', rightX, y, { align: 'right' });
        y += 10;

        doc.setFont('helvetica', 'normal');
        transSales.forEach(s => {
            const subtotal = s.qty * s.hargaJual;
            const diskon = s.diskon || 0;
            doc.text(s.produk, leftX + 2, y);
            doc.text(`${s.qty} kg`, leftX + 70, y);
            doc.text(formatRupiah(s.hargaJual), leftX + 90, y);
            doc.text(formatRupiah(diskon), leftX + 120, y);
            doc.text(formatRupiah(subtotal - diskon), rightX, y, { align: 'right' });
            y += 6;
        });

        y += 4;
        doc.setDrawColor(200);
        doc.line(15, y, pageWidth - 15, y);
        y += 8;
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

        doc.save(`Invoice_${currentTransactionId}.pdf`);
        showToast('Sukses', 'Invoice diunduh!', 'success');
    }

    function shareWhatsApp() {
        if (!currentTransactionId) return;
        const allSales = Storage.getSales();
        const transSales = allSales.filter(s => s.transactionId === currentTransactionId);
        if (transSales.length === 0) return;

        const company = Storage.getCompany();
        const first = transSales[0];
        const grandTotal = transSales.reduce((sum, s) => sum + (s.qty * s.hargaJual - (s.diskon || 0)), 0);

        let itemsText = transSales.map(s => {
            const sub = s.qty * s.hargaJual;
            const diskon = s.diskon || 0;
            return `- ${s.produk}: ${s.qty} kg x ${formatRupiah(s.hargaJual)} = ${formatRupiah(sub - diskon)}`;
        }).join('\n');

        const message = encodeURIComponent(
            `*INVOICE PENJUALAN*\n` +
            `━━━━━━━━━━━━━━━━\n` +
            `🏪 *${company.name}*\n` +
            `📅 Tanggal: ${formatDate(first.tanggal)}\n` +
            `👤 Pelanggan: ${first.klien}\n` +
            `📦 Rincian:\n${itemsText}\n` +
            `💰 Total: ${formatRupiah(grandTotal)}\n` +
            `━━━━━━━━━━━━━━━━\n` +
            `_Terima kasih atas pembelian Anda!_`
        );
        window.open(`https://wa.me/?text=${message}`, '_blank');
    }

    // ==================== HARI INI ====================
    function refreshTodaySales() {
        if (!E.todaySalesList) return;
        const today = getToday();
        const allSales = Storage.getSales();
        const todaySales = allSales.filter(s => s.tanggal === today);
        const groups = groupSalesByTransaction(todaySales);
        if (groups.length === 0) {
            E.todaySalesList.innerHTML = '<p class="opacity-50 italic text-center py-4">Belum ada penjualan hari ini.</p>';
            return;
        }
        E.todaySalesList.innerHTML = groups.map((group, idx) => {
            const total = group.items.reduce((sum, s) => sum + (s.qty * s.hargaJual - (s.diskon || 0)), 0);
            const first = group.items[0];
            const itemCount = group.items.length;
            return `<div class="p-3 border rounded mb-2 bg-white dark:bg-slate-800">
                <div class="flex justify-between items-start">
                    <div>
                        <p class="font-semibold">${first.klien} <span class="text-xs opacity-70 ml-2">${itemCount} item</span></p>
                        <p class="text-xs opacity-70">${first.channel === 'online' ? '🌐' : '🏪'} ${first.paymentMethod || 'tunai'}</p>
                    </div>
                    <div class="text-right">
                        <p class="font-bold text-green-600">${formatRupiah(total)}</p>
                    </div>
                </div>
                <div class="mt-2 text-xs">
                    ${group.items.map(s => `<div class="flex justify-between"><span>${s.produk} (${s.qty}kg)</span><span>${formatRupiah(s.qty * s.hargaJual - (s.diskon||0))}</span></div>`).join('')}
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

        let allSales = Storage.getSales();
        if (start) allSales = allSales.filter(s => s.tanggal >= start);
        if (end) allSales = allSales.filter(s => s.tanggal <= end);
        if (channel) allSales = allSales.filter(s => s.channel === channel);
        if (produk) allSales = allSales.filter(s => s.produk === produk);

        const groups = groupSalesByTransaction(allSales);
        groups.sort((a, b) => new Date(b.items[0].tanggal) - new Date(a.items[0].tanggal));

        if (groups.length === 0) {
            E.salesHistoryTableBody.innerHTML = '<tr><td colspan="6" class="text-center p-4 opacity-50">Tidak ada transaksi.</td></tr>';
            return;
        }

        E.salesHistoryTableBody.innerHTML = groups.map(group => {
            const first = group.items[0];
            const total = group.items.reduce((sum, s) => sum + (s.qty * s.hargaJual - (s.diskon || 0)), 0);
            const itemList = group.items.map(s => `${s.produk} (${s.qty}kg)`).join(', ');
            return `<tr class="border-t text-sm hover:bg-slate-50 dark:hover:bg-slate-700">
                <td class="p-2">${first.tanggal}</td>
                <td class="p-2">${first.klien}</td>
                <td class="p-2">${itemList}</td>
                <td class="p-2 text-right font-semibold">${formatRupiah(total)}</td>
                <td class="p-2">${first.channel === 'online' ? '🌐' : '🏪'}</td>
                <td class="p-2 text-center">
                    <button class="btn btn-xs btn-danger" onclick="CFS.Sales.deleteTransaction('${group.transactionId}')">🗑️</button>
                </td>
            </tr>`;
        }).join('');
    }

    async function deleteTransaction(transactionId) {
        if (!confirm('Hapus seluruh transaksi? Stok akan dikembalikan.')) return;
        const sales = Storage.getSales().filter(s => s.transactionId === transactionId);
        for (const s of sales) {
            await Storage.deleteSale(s.id);
        }
        refreshTodaySales();
        refreshStats();
        renderHistory();
        if (CFS.Dashboard) CFS.Dashboard.refresh();
    }

    // Helper mengelompokkan sale entries berdasarkan transactionId
    function groupSalesByTransaction(salesArray) {
        const map = new Map();
        for (const s of salesArray) {
            const key = s.transactionId || s.id; // fallback ke id jika single item lama
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(s);
        }
        return Array.from(map, ([transactionId, items]) => ({ transactionId, items }));
    }

    // ==================== ANALISIS ====================
    function renderAnalysis() {
        const allSales = Storage.getSales();
        const groups = groupSalesByTransaction(allSales);

        // Chart 30 hari – total per hari
        const ctx30 = E.chartSales30Days?.getContext('2d');
        if (ctx30) {
            const last30 = [];
            for (let i = 29; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const ds = d.toISOString().split('T')[0];
                const daySales = allSales.filter(s => s.tanggal === ds);
                const total = daySales.reduce((sum, s) => sum + (s.qty * s.hargaJual - (s.diskon || 0)), 0);
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

        // Pie chart channel berdasarkan total transaksi
        const ctxPie = E.chartSalesChannelPie?.getContext('2d');
        if (ctxPie) {
            const onlineTotal = groups.filter(g => g.items[0].channel === 'online')
                .reduce((sum, g) => sum + g.items.reduce((s, it) => s + (it.qty * it.hargaJual - (it.diskon || 0)), 0), 0);
            const offlineTotal = groups.filter(g => g.items[0].channel === 'offline')
                .reduce((sum, g) => sum + g.items.reduce((s, it) => s + (it.qty * it.hargaJual - (it.diskon || 0)), 0), 0);
            if (channelPieChart) channelPieChart.destroy();
            channelPieChart = new Chart(ctxPie, {
                type: 'doughnut',
                data: {
                    labels: ['Online', 'Offline'],
                    datasets: [{ data: [onlineTotal, offlineTotal], backgroundColor: ['#6366f1', '#f59e0b'] }]
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
        const allSales = Storage.getSales().filter(s => s.tanggal === today);
        const csv = 'Klien,Produk,Qty,Harga,Total,Channel,Pembayaran\n' +
            allSales.map(s => `"${s.klien}","${s.produk}",${s.qty},${s.hargaJual},${(s.qty * s.hargaJual) - (s.diskon || 0)},${s.channel},${s.paymentMethod || 'tunai'}`).join('\n');
        downloadCSV(csv, 'penjualan_hari_ini.csv');
    }

    function exportHistoryCSV() {
        const allSales = Storage.getSales();
        const csv = 'Tanggal,Klien,Produk,Qty,Harga,Total,Channel,Pembayaran\n' +
            allSales.map(s => `${s.tanggal},"${s.klien}","${s.produk}",${s.qty},${s.hargaJual},${(s.qty * s.hargaJual) - (s.diskon || 0)},${s.channel},${s.paymentMethod || 'tunai'}`).join('\n');
        downloadCSV(csv, 'riwayat_penjualan.csv');
    }

    function downloadCSV(csvContent, filename) {
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
    }

    // ==================== EVENT BINDING ====================
    function bindEvents() {
        // Item actions
        if (E.addItemBtn) E.addItemBtn.addEventListener('click', addItemToList);
        if (E.updateItemBtn) E.updateItemBtn.addEventListener('click', updateItem);
        if (E.cancelEditItemBtn) E.cancelEditItemBtn.addEventListener('click', clearItemsForm);

        // Preview transaksi (tampilkan ringkasan sebelum proses)
        if (E.previewTransactionBtn) E.previewTransactionBtn.addEventListener('click', () => {
            if (items.length === 0) {
                showToast('Info', 'Tambahkan item terlebih dahulu.', 'info');
                return;
            }
            const total = items.reduce((sum, it) => sum + (it.qty * it.hargaJual - (it.diskon || 0)), 0);
            if (E.salesResult) {
                E.salesResult.classList.remove('hidden');
                E.salesResult.innerHTML = `<div class="space-y-2 text-sm">
                    <h4 class="font-bold text-green-600">Ringkasan Transaksi</h4>
                    <p>Total item: ${items.length}</p>
                    <p>Total: <strong>${formatRupiah(total)}</strong></p>
                </div>`;
            }
        });

        // Proses transaksi
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
        deleteTransaction,
        editItem,   // exposed for table buttons
        removeItem, // exposed for table buttons
        formatRupiah
    };
})();
