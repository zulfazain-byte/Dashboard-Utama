/* ============================================================
   Cibitung Frozen ERP Ultimate v5.4 — Sales Module
   Mengelola pencatatan penjualan, preview harga, alokasi batch,
   invoice PDF, dan integrasi WhatsApp.
   ============================================================ */

window.CFS = window.CFS || {};

(function() {
    'use strict';

    const Storage = CFS.Storage;

    // Cache elemen DOM
    let elements = {};

    function cacheElements() {
        elements.salesForm = document.getElementById('salesForm');
        elements.salesKlien = document.getElementById('salesKlien');
        elements.salesProduk = document.getElementById('salesProduk');
        elements.salesQty = document.getElementById('salesQty');
        elements.salesTier = document.getElementById('salesTier');
        elements.salesChannel = document.getElementById('salesChannel');
        elements.salesHargaManual = document.getElementById('salesHargaManual');
        elements.salesCatatan = document.getElementById('salesCatatan');
        elements.previewPriceBtn = document.getElementById('previewPriceBtn');
        elements.printInvoiceBtn = document.getElementById('printInvoiceBtn');
        elements.shareWhatsAppBtn = document.getElementById('shareWhatsAppBtn');
        elements.salesResult = document.getElementById('salesResult');
        elements.todaySalesList = document.getElementById('todaySalesList');
    }

    /**
     * Format Rupiah.
     */
    function formatRupiah(n) {
        return 'Rp ' + Math.round(n).toLocaleString('id-ID');
    }

    /**
     * Format tanggal ISO ke tampilan Indonesia.
     */
    function formatDateID(dateStr) {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    }

    /**
     * Mendapatkan batch yang tersedia untuk produk tertentu,
     * diurutkan sesuai metode alokasi (FEFO/FIFO).
     */
    function getAvailableBatches(produk) {
        const batches = Storage.getBatches();
        const settings = Storage.getSettings();
        const method = settings.fifoMethod || 'fefo';

        return batches
            .filter(b => b.produk === produk && (b.berat - b.used) > 0)
            .sort((a, b) => {
                if (method === 'fefo') {
                    return new Date(a.tglKadaluarsa) - new Date(b.tglKadaluarsa);
                } else {
                    return new Date(a.tglProduksi) - new Date(b.tglProduksi);
                }
            });
    }

    /**
     * Menghitung harga jual berdasarkan HPP, margin, tier, dan channel.
     */
    function calculatePrice(produk, qty, tier, channel, manualPrice) {
        const settings = Storage.getSettings();
        const pricing = Storage.getPricing();
        const availableBatches = getAvailableBatches(produk);

        if (availableBatches.length === 0) {
            return { error: true, message: `Stok ${produk} tidak tersedia.` };
        }

        // Hitung HPP rata-rata dari batch yang akan terpakai
        let remaining = qty;
        let totalHPP = 0;
        let batchList = [];

        for (let batch of availableBatches) {
            if (remaining <= 0) break;
            const available = batch.berat - batch.used;
            const take = Math.min(available, remaining);
            totalHPP += take * CFS.Inventory.calculateHPP(batch);
            batchList.push({ id: batch.id, qty: take, hpp: CFS.Inventory.calculateHPP(batch) });
            remaining -= take;
        }

        if (remaining > 0) {
            return { error: true, message: `Stok tidak mencukupi. Tersedia ${qty - remaining} kg.` };
        }

        const avgHPP = totalHPP / qty;
        let hargaJual;

        // Cek apakah ada harga kustom untuk channel ini
        if (pricing && pricing[produk]) {
            if (channel === 'online' && pricing[produk].online) {
                hargaJual = pricing[produk].online;
            } else if (channel === 'offline' && pricing[produk].offline) {
                hargaJual = pricing[produk].offline;
            }
        }

        // Jika tidak ada harga kustom atau manual, hitung dari HPP + margin
        if (!hargaJual) {
            const marginDefault = settings.marginDefault || 15000;
            hargaJual = avgHPP + marginDefault;

            // Penyesuaian berdasarkan tier
            if (tier === 'grosir') {
                hargaJual -= (settings.selisihGrosir || 5000);
            } else if (tier === 'partai') {
                hargaJual -= (settings.selisihGrosir || 5000) * 2;
            }

            // Tambahan biaya marketplace untuk online (komisi)
            if (channel === 'online') {
                const marketplaceFee = settings.marketplaceFee || 5;
                hargaJual = hargaJual / (1 - marketplaceFee / 100);
            }
        }

        // Jika ada harga manual, gunakan itu
        if (manualPrice && manualPrice > 0) {
            hargaJual = manualPrice;
        }

        return {
            error: false,
            hargaJual: Math.round(hargaJual),
            avgHPP: Math.round(avgHPP),
            batchList: batchList,
            totalCost: totalHPP,
            potentialProfit: (hargaJual * qty) - totalHPP
        };
    }

    /**
     * Preview harga dan menampilkan di salesResult.
     */
    function previewPrice() {
        cacheElements();
        const produk = elements.salesProduk?.value;
        const qty = parseFloat(elements.salesQty?.value) || 0;
        const tier = elements.salesTier?.value || 'ecer';
        const channel = elements.salesChannel?.value || 'offline';
        const manualPrice = parseFloat(elements.salesHargaManual?.value) || 0;

        if (!produk || qty <= 0) {
            showToast?.('Peringatan', 'Pilih produk dan jumlah yang valid.', 'warning');
            return;
        }

        const result = calculatePrice(produk, qty, tier, channel, manualPrice);

        if (result.error) {
            showToast?.('Error', result.message, 'error');
            if (elements.salesResult) {
                elements.salesResult.classList.remove('hidden');
                elements.salesResult.innerHTML = `<p class="text-red-500">❌ ${result.message}</p>`;
            }
            return;
        }

        if (elements.salesResult) {
            elements.salesResult.classList.remove('hidden');
            elements.salesResult.innerHTML = `
                <div class="space-y-2">
                    <h4 class="font-bold text-green-600">📊 Preview Penjualan</h4>
                    <div class="grid grid-cols-2 gap-2">
                        <div><span class="opacity-60">Produk:</span> <strong>${produk}</strong></div>
                        <div><span class="opacity-60">Jumlah:</span> <strong>${qty} kg</strong></div>
                        <div><span class="opacity-60">Tier:</span> <strong>${tier.toUpperCase()}</strong></div>
                        <div><span class="opacity-60">Channel:</span> <strong>${channel === 'online' ? '🌐 Online' : '🏪 Offline'}</strong></div>
                        <div><span class="opacity-60">HPP Rata-rata:</span> <strong>${formatRupiah(result.avgHPP)}/kg</strong></div>
                        <div><span class="opacity-60">Harga Jual:</span> <strong class="text-green-600">${formatRupiah(result.hargaJual)}/kg</strong></div>
                        <div><span class="opacity-60">Total:</span> <strong class="text-green-600 text-lg">${formatRupiah(result.hargaJual * qty)}</strong></div>
                        <div><span class="opacity-60">Estimasi Laba:</span> <strong class="text-blue-600">${formatRupiah(result.potentialProfit)}</strong></div>
                    </div>
                    <p class="text-xs opacity-70 mt-2">✅ Stok tersedia. Siap diproses.</p>
                </div>
            `;
        }
    }

    /**
     * Memproses penjualan, alokasi batch FEFO/FIFO, dan menyimpan.
     */
    async function processSale(e) {
        e.preventDefault();
        cacheElements();

        const klien = elements.salesKlien?.value.trim();
        const produk = elements.salesProduk?.value;
        const qty = parseFloat(elements.salesQty?.value) || 0;
        const tier = elements.salesTier?.value || 'ecer';
        const channel = elements.salesChannel?.value || 'offline';
        const manualPrice = parseFloat(elements.salesHargaManual?.value) || 0;
        const catatan = elements.salesCatatan?.value || '';

        if (!klien) {
            showToast?.('Error', 'Nama klien wajib diisi.', 'error');
            return;
        }
        if (!produk || qty <= 0) {
            showToast?.('Error', 'Pilih produk dan jumlah yang valid.', 'error');
            return;
        }

        const result = calculatePrice(produk, qty, tier, channel, manualPrice);
        if (result.error) {
            showToast?.('Error', result.message, 'error');
            return;
        }

        // Alokasikan batch
        const batches = Storage.getBatches();
        for (let alloc of result.batchList) {
            const batch = batches.find(b => b.id === alloc.id);
            if (batch) {
                batch.used += alloc.qty;
            }
        }

        // Buat objek penjualan
        const sale = {
            id: 's' + Date.now(),
            tanggal: new Date().toISOString().split('T')[0],
            klien: klien,
            produk: produk,
            qty: qty,
            tier: tier,
            channel: channel,
            hargaJual: result.hargaJual,
            hpp: result.avgHPP,
            catatan: catatan,
            batchUsed: result.batchList[0]?.id || ''
        };

        await Storage.addSale(sale);
        showToast?.('Sukses', `Penjualan ${produk} ${qty} kg ke ${klien} berhasil!`, 'success');

        // Aktifkan tombol invoice dan WhatsApp
        if (elements.printInvoiceBtn) {
            elements.printInvoiceBtn.disabled = false;
            elements.printInvoiceBtn.dataset.saleId = sale.id;
        }
        if (elements.shareWhatsAppBtn) {
            elements.shareWhatsAppBtn.disabled = false;
            elements.shareWhatsAppBtn.dataset.saleId = sale.id;
        }

        // Reset form
        elements.salesForm?.reset();
        if (elements.salesResult) elements.salesResult.classList.add('hidden');

        // Refresh tampilan
        refreshTodaySales();
        if (typeof CFS.App !== 'undefined' && CFS.App.refreshAll) CFS.App.refreshAll();
    }

    /**
     * Menampilkan daftar penjualan hari ini.
     */
    function refreshTodaySales() {
        cacheElements();
        if (!elements.todaySalesList) return;

        const today = new Date().toISOString().split('T')[0];
        const todaySales = Storage.getSales().filter(s => s.tanggal === today);

        if (todaySales.length === 0) {
            elements.todaySalesList.innerHTML = '<p class="opacity-50 italic">Belum ada penjualan hari ini.</p>';
            return;
        }

        elements.todaySalesList.innerHTML = todaySales.map((s, idx) => `
            <div class="flex items-center justify-between py-2 border-b last:border-0">
                <div class="flex items-center gap-2">
                    <span class="text-sm font-medium">#${idx + 1}</span>
                    <div>
                        <p class="text-sm font-semibold">${s.klien}</p>
                        <p class="text-xs opacity-70">${s.produk} ${s.qty}kg · ${s.tier} · 
                           ${s.channel === 'online' ? '🌐 Online' : '🏪 Offline'}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="font-bold text-green-600">${formatRupiah(s.qty * s.hargaJual)}</p>
                    <p class="text-xs opacity-50">${formatRupiah(s.hargaJual)}/kg</p>
                </div>
            </div>
        `).join('');
    }

    /**
     * Generate invoice PDF profesional.
     */
    function printInvoice(saleId) {
        const sale = Storage.getSales().find(s => s.id === saleId);
        if (!sale) {
            showToast?.('Error', 'Data penjualan tidak ditemukan.', 'error');
            return;
        }

        const company = Storage.getCompany();
        const settings = Storage.getSettings();

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        let y = 15;

        // Header
        doc.setFontSize(22);
        doc.setTextColor(37, 99, 235); // primary-600
        doc.setFont('helvetica', 'bold');
        doc.text(company.name || 'Cibitung Frozen', 15, y);
        
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'normal');
        y += 5;
        doc.text(company.address || '', 15, y);
        y += 4;
        doc.text(`Telp: ${company.phone || '-'} | Email: ${company.email || '-'}`, 15, y);
        
        // Line
        y += 6;
        doc.setDrawColor(37, 99, 235);
        doc.setLineWidth(0.8);
        doc.line(15, y, pageWidth - 15, y);
        
        // Title
        y += 10;
        doc.setFontSize(16);
        doc.setTextColor(30, 30, 30);
        doc.setFont('helvetica', 'bold');
        doc.text('INVOICE PENJUALAN', pageWidth / 2, y, { align: 'center' });
        
        // Invoice details
        y += 10;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);
        
        const leftX = 15;
        const rightX = pageWidth - 15;
        
        doc.text('No. Invoice:', leftX, y);
        doc.text(`INV-${sale.id.toUpperCase()}`, leftX + 40, y);
        
        doc.text('Tanggal:', leftX, y + 6);
        doc.text(formatDateID(sale.tanggal), leftX + 40, y + 6);
        
        doc.text('Pelanggan:', leftX, y + 12);
        doc.setFont('helvetica', 'bold');
        doc.text(sale.klien, leftX + 40, y + 12);
        doc.setFont('helvetica', 'normal');
        
        // Line
        y += 20;
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(15, y, pageWidth - 15, y);
        
        // Table Header
        y += 8;
        doc.setFillColor(240, 240, 240);
        doc.rect(15, y - 5, pageWidth - 30, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.text('Deskripsi', leftX + 2, y);
        doc.text('Qty', leftX + 90, y);
        doc.text('Harga/kg', leftX + 120, y);
        doc.text('Total', rightX, y, { align: 'right' });
        
        // Table Body
        y += 10;
        doc.setFont('helvetica', 'normal');
        doc.text(sale.produk, leftX + 2, y);
        doc.text(`${sale.qty} kg`, leftX + 90, y);
        doc.text(formatRupiah(sale.hargaJual), leftX + 120, y);
        doc.text(formatRupiah(sale.qty * sale.hargaJual), rightX, y, { align: 'right' });
        
        y += 6;
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(`Tier: ${sale.tier.toUpperCase()} | Channel: ${sale.channel === 'online' ? 'Online' : 'Offline'}`, leftX + 2, y);
        if (sale.catatan) {
            y += 4;
            doc.text(`Catatan: ${sale.catatan}`, leftX + 2, y);
        }
        
        // Line
        y += 6;
        doc.setDrawColor(200, 200, 200);
        doc.line(15, y, pageWidth - 15, y);
        
        // Total
        y += 10;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 30, 30);
        doc.text('TOTAL', leftX + 80, y);
        doc.text(formatRupiah(sale.qty * sale.hargaJual), rightX, y, { align: 'right' });
        
        // DPP & PPN
        y += 8;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        const ppnRate = settings.ppn || 12;
        const dpp = Math.round((sale.qty * sale.hargaJual) / (1 + ppnRate / 100));
        const ppn = (sale.qty * sale.hargaJual) - dpp;
        doc.text(`DPP: ${formatRupiah(dpp)}`, leftX + 80, y);
        y += 4;
        doc.text(`PPN (${ppnRate}%): ${formatRupiah(ppn)}`, leftX + 80, y);
        
        // Footer
        y = doc.internal.pageSize.getHeight() - 20;
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('Terima kasih atas kepercayaan Anda.', pageWidth / 2, y, { align: 'center' });
        y += 4;
        doc.text(`Dicetak oleh ${company.name || 'Cibitung Frozen'} ERP Ultimate v5.4`, pageWidth / 2, y, { align: 'center' });

        doc.save(`Invoice_${sale.id}_${sale.klien.replace(/\s/g, '_')}.pdf`);
        showToast?.('Sukses', 'Invoice berhasil diunduh!', 'success');
    }

    /**
     * Share invoice via WhatsApp.
     */
    function shareViaWhatsApp(saleId) {
        const sale = Storage.getSales().find(s => s.id === saleId);
        if (!sale) return;

        const company = Storage.getCompany();
        const message = encodeURIComponent(
            `*INVOICE PENJUALAN*\n` +
            `━━━━━━━━━━━━━━━━\n` +
            `🏪 *${company.name}*\n` +
            `📅 Tanggal: ${formatDateID(sale.tanggal)}\n` +
            `👤 Pelanggan: ${sale.klien}\n` +
            `🐟 Produk: ${sale.produk}\n` +
            `⚖️ Jumlah: ${sale.qty} kg\n` +
            `💰 Harga: ${formatRupiah(sale.hargaJual)}/kg\n` +
            `💵 Total: ${formatRupiah(sale.qty * sale.hargaJual)}\n` +
            `🏷️ Tier: ${sale.tier.toUpperCase()}\n` +
            `📡 Channel: ${sale.channel === 'online' ? 'Online' : 'Offline'}\n` +
            `━━━━━━━━━━━━━━━━\n` +
            `_Terima kasih atas pembelian Anda!_`
        );

        const phone = '6281234567890'; // Ganti dengan nomor bisnis
        window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    }

    /**
     * Binding event listeners.
     */
    function bindEvents() {
        cacheElements();

        if (elements.previewPriceBtn) {
            elements.previewPriceBtn.addEventListener('click', previewPrice);
        }

        if (elements.salesForm) {
            elements.salesForm.addEventListener('submit', processSale);
        }

        if (elements.printInvoiceBtn) {
            elements.printInvoiceBtn.addEventListener('click', function() {
                const saleId = this.dataset.saleId;
                if (saleId) printInvoice(saleId);
            });
        }

        if (elements.shareWhatsAppBtn) {
            elements.shareWhatsAppBtn.addEventListener('click', function() {
                const saleId = this.dataset.saleId;
                if (saleId) shareViaWhatsApp(saleId);
            });
        }

        // Auto-refresh preview saat produk/qty berubah (opsional)
        if (elements.salesProduk) {
            elements.salesProduk.addEventListener('change', () => {
                if (elements.salesQty?.value) previewPrice();
            });
        }
        if (elements.salesQty) {
            elements.salesQty.addEventListener('input', () => {
                if (elements.salesProduk?.value) previewPrice();
            });
        }
    }

    /**
     * Inisialisasi modul Sales.
     */
    function initSales() {
        cacheElements();
        refreshTodaySales();
        bindEvents();
        if (CFS.Inventory?.populateProductDropdowns) {
            CFS.Inventory.populateProductDropdowns();
        }
    }

    // Expose API
    CFS.Sales = {
        init: initSales,
        refreshTodaySales,
        previewPrice,
        printInvoice,
        shareViaWhatsApp,
        calculatePrice,
        formatRupiah,
        formatDateID
    };

})();
