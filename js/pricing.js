/* ============================================================
   Cibitung Frozen ERP Ultimate v5.4 — Pricing Module (Upgrade)
   Mengelola harga jual online/offline, simulasi margin,
   riwayat perubahan, grafik, dan ekspor/impor CSV.
   ============================================================ */
window.CFS = window.CFS || {};

(function() {
    'use strict';
    const Storage = CFS.Storage;

    let priceChart = null;

    function initPricingTab() {
        renderPricingTable();
        bindPricingEvents();
        refreshPriceChart();
        renderPricingHistory();
        setupFormulaButton();
        setupImportExport();
    }

    // ==================== RENDER TABEL HARGA ====================
    function renderPricingTable() {
        const tbody = document.getElementById('pricingTableBody');
        if (!tbody) return;

        const products = Storage.getProducts().length > 0
            ? Storage.getProducts().map(p => p.name)
            : Storage.defaultProducts;

        const pricing = Storage.getPricing() || {};
        const batches = Storage.getBatches();

        // Hitung HPP rata-rata per produk
        const hppMap = {};
        products.forEach(p => {
            const productBatches = batches.filter(b => b.produk === p && (b.berat - b.used) > 0);
            if (productBatches.length > 0) {
                const totalHPP = productBatches.reduce((sum, b) => sum + CFS.Inventory.calculateHPP(b) * (b.berat - b.used), 0);
                const totalWeight = productBatches.reduce((sum, b) => sum + (b.berat - b.used), 0);
                hppMap[p] = totalWeight > 0 ? Math.round(totalHPP / totalWeight) : 0;
            } else {
                hppMap[p] = 0;
            }
        });

        tbody.innerHTML = products.map(produk => {
            const p = pricing[produk] || {};
            const hpp = hppMap[produk] || 0;
            const offline = p.offline || '';
            const online = p.online || '';
            const onlineFee = p.onlineFee || '';
            const grosir = p.grosir || '';
            const partai = p.partai || '';

            const marginOffline = offline ? offline - hpp : 0;
            const marginOnline = online ? online - hpp : 0;

            return `
                <tr class="border-t hover:bg-slate-50 dark:hover:bg-slate-700 transition" data-produk="${produk}">
                    <td class="p-2 font-medium">${produk}</td>
                    <td class="p-2 text-right text-xs opacity-70">${hpp > 0 ? 'Rp ' + hpp.toLocaleString('id-ID') : '-'}</td>
                    <td class="p-2 text-right">
                        <input type="number" class="price-input price-offline w-24 text-right" 
                               data-produk="${produk}" data-field="offline" 
                               value="${offline}" placeholder="Otomatis" step="100">
                    </td>
                    <td class="p-2 text-right">
                        <input type="number" class="price-input price-online w-24 text-right" 
                               data-produk="${produk}" data-field="online" 
                               value="${online}" placeholder="Otomatis" step="100">
                    </td>
                    <td class="p-2 text-right">
                        <input type="number" class="price-input price-fee w-16 text-right" 
                               data-produk="${produk}" data-field="onlineFee" 
                               value="${onlineFee}" placeholder="%" step="0.1">
                    </td>
                    <td class="p-2 text-right">
                        <input type="number" class="price-input price-grosir w-24 text-right" 
                               data-produk="${produk}" data-field="grosir" 
                               value="${grosir}" placeholder="Otomatis" step="100">
                    </td>
                    <td class="p-2 text-right">
                        <input type="number" class="price-input price-partai w-24 text-right" 
                               data-produk="${produk}" data-field="partai" 
                               value="${partai}" placeholder="Otomatis" step="100">
                    </td>
                    <td class="p-2 text-right ${marginOffline >= 0 ? 'text-green-600' : 'text-red-600'}">
                        ${offline ? 'Rp ' + marginOffline.toLocaleString('id-ID') : '-'}
                    </td>
                    <td class="p-2 text-right ${marginOnline >= 0 ? 'text-green-600' : 'text-red-600'}">
                        ${online ? 'Rp ' + marginOnline.toLocaleString('id-ID') : '-'}
                    </td>
                    <td class="p-2 text-center">
                        <button class="btn btn-xs btn-primary save-single-btn" data-produk="${produk}">
                            <i class="ph ph-floppy-disk"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // Event untuk input perubahan (update margin secara real-time)
        tbody.querySelectorAll('.price-input').forEach(input => {
            input.addEventListener('input', function() {
                updateMarginDisplay(this);
            });
        });

        // Event untuk tombol simpan per produk
        tbody.querySelectorAll('.save-single-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const produk = this.dataset.produk;
                saveSingleProductPricing(produk);
            });
        });
    }

    // ==================== UPDATE MARGIN REAL-TIME ====================
    function updateMarginDisplay(inputEl) {
        const produk = inputEl.dataset.produk;
        const row = document.querySelector(`tr[data-produk="${produk}"]`);
        if (!row) return;

        const batches = Storage.getBatches().filter(b => b.produk === produk && (b.berat - b.used) > 0);
        let hpp = 0;
        if (batches.length > 0) {
            const totalHPP = batches.reduce((sum, b) => sum + CFS.Inventory.calculateHPP(b) * (b.berat - b.used), 0);
            const totalWeight = batches.reduce((sum, b) => sum + (b.berat - b.used), 0);
            hpp = totalWeight > 0 ? Math.round(totalHPP / totalWeight) : 0;
        }

        const offlineInput = row.querySelector('.price-offline');
        const onlineInput = row.querySelector('.price-online');
        const offlineVal = parseFloat(offlineInput?.value) || 0;
        const onlineVal = parseFloat(onlineInput?.value) || 0;

        const marginOffCell = row.cells[7];
        const marginOnCell = row.cells[8];

        if (offlineVal > 0) {
            const margin = offlineVal - hpp;
            marginOffCell.textContent = 'Rp ' + margin.toLocaleString('id-ID');
            marginOffCell.className = `p-2 text-right ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`;
        } else {
            marginOffCell.textContent = '-';
            marginOffCell.className = 'p-2 text-right';
        }

        if (onlineVal > 0) {
            const margin = onlineVal - hpp;
            marginOnCell.textContent = 'Rp ' + margin.toLocaleString('id-ID');
            marginOnCell.className = `p-2 text-right ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`;
        } else {
            marginOnCell.textContent = '-';
            marginOnCell.className = 'p-2 text-right';
        }

        // Update simulasi jika produk ini sedang dipilih
        updateMarginSimulation(produk);
    }

    // ==================== SIMPAN HARGA SATU PRODUK ====================
    async function saveSingleProductPricing(produk) {
        const row = document.querySelector(`tr[data-produk="${produk}"]`);
        if (!row) return;

        const offline = parseFloat(row.querySelector('.price-offline')?.value) || 0;
        const online = parseFloat(row.querySelector('.price-online')?.value) || 0;
        const onlineFee = parseFloat(row.querySelector('.price-fee')?.value) || 0;
        const grosir = parseFloat(row.querySelector('.price-grosir')?.value) || 0;
        const partai = parseFloat(row.querySelector('.price-partai')?.value) || 0;

        await Storage.savePricing(produk, {
            offline: offline || undefined,
            online: online || undefined,
            onlineFee: onlineFee || undefined,
            grosir: grosir || undefined,
            partai: partai || undefined
        });

        showToast('Sukses', `Harga ${produk} disimpan.`, 'success');
        renderPricingHistory();
        refreshPriceChart();
    }

    // ==================== SIMPAN SEMUA HARGA ====================
    async function saveAllPricing() {
        const rows = document.querySelectorAll('#pricingTableBody tr[data-produk]');
        for (const row of rows) {
            const produk = row.dataset.produk;
            const offline = parseFloat(row.querySelector('.price-offline')?.value) || 0;
            const online = parseFloat(row.querySelector('.price-online')?.value) || 0;
            const onlineFee = parseFloat(row.querySelector('.price-fee')?.value) || 0;
            const grosir = parseFloat(row.querySelector('.price-grosir')?.value) || 0;
            const partai = parseFloat(row.querySelector('.price-partai')?.value) || 0;

            await Storage.savePricing(produk, {
                offline: offline || undefined,
                online: online || undefined,
                onlineFee: onlineFee || undefined,
                grosir: grosir || undefined,
                partai: partai || undefined
            });
        }
        showToast('Sukses', 'Semua harga disimpan.', 'success');
        renderPricingHistory();
        refreshPriceChart();
    }

    // ==================== FORMULA DEFAULT ====================
    function setupFormulaButton() {
        const btn = document.getElementById('btnPricingApplyFormula');
        if (!btn) return;

        btn.addEventListener('click', () => {
            const settings = Storage.getSettings();
            const marginDefault = settings.marginDefault || 15000;
            const marketplaceFee = settings.marketplaceFee || 5;
            const selisihGrosir = settings.selisihGrosir || 5000;

            const rows = document.querySelectorAll('#pricingTableBody tr[data-produk]');
            rows.forEach(row => {
                const produk = row.dataset.produk;
                const batches = Storage.getBatches().filter(b => b.produk === produk && (b.berat - b.used) > 0);
                let hpp = 0;
                if (batches.length > 0) {
                    const totalHPP = batches.reduce((sum, b) => sum + CFS.Inventory.calculateHPP(b) * (b.berat - b.used), 0);
                    const totalWeight = batches.reduce((sum, b) => sum + (b.berat - b.used), 0);
                    hpp = totalWeight > 0 ? Math.round(totalHPP / totalWeight) : 0;
                }

                if (hpp > 0) {
                    const offlinePrice = hpp + marginDefault;
                    const onlinePrice = Math.round((hpp + marginDefault) / (1 - marketplaceFee / 100));
                    const grosirPrice = offlinePrice - selisihGrosir;
                    const partaiPrice = offlinePrice - (selisihGrosir * 2);

                    const offlineInput = row.querySelector('.price-offline');
                    const onlineInput = row.querySelector('.price-online');
                    const feeInput = row.querySelector('.price-fee');
                    const grosirInput = row.querySelector('.price-grosir');
                    const partaiInput = row.querySelector('.price-partai');

                    if (offlineInput) offlineInput.value = offlinePrice;
                    if (onlineInput) onlineInput.value = onlinePrice;
                    if (feeInput) feeInput.value = marketplaceFee;
                    if (grosirInput) grosirInput.value = grosirPrice;
                    if (partaiInput) partaiInput.value = partaiPrice;

                    updateMarginDisplay(offlineInput);
                }
            });

            showToast('Info', 'Formula default diterapkan. Jangan lupa simpan.', 'info');
        });
    }

    // ==================== GRAFIK PERBANDINGAN HARGA ====================
    function refreshPriceChart() {
        const ctx = document.getElementById('chartPriceComparison')?.getContext('2d');
        if (!ctx) return;

        const products = Storage.getProducts().length > 0
            ? Storage.getProducts().map(p => p.name)
            : Storage.defaultProducts;
        const pricing = Storage.getPricing() || {};

        const labels = [];
        const offlineData = [];
        const onlineData = [];

        products.forEach(p => {
            const price = pricing[p] || {};
            if (price.offline || price.online) {
                labels.push(p);
                offlineData.push(price.offline || 0);
                onlineData.push(price.online || 0);
            }
        });

        if (priceChart) priceChart.destroy();

        if (labels.length === 0) {
            // Tidak ada data, gambar kosong
            return;
        }

        priceChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Offline', data: offlineData, backgroundColor: '#f59e0b', borderRadius: 4 },
                    { label: 'Online', data: onlineData, backgroundColor: '#6366f1', borderRadius: 4 }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.dataset.label}: Rp ${ctx.raw.toLocaleString('id-ID')}`
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            callback: (val) => 'Rp ' + val.toLocaleString('id-ID')
                        }
                    }
                }
            }
        });
    }

    // ==================== SIMULASI MARGIN ====================
    function updateMarginSimulation(produk) {
        const simDiv = document.getElementById('pricingMarginSimulation');
        if (!simDiv) return;

        if (!produk) {
            simDiv.innerHTML = '<p class="opacity-50">Pilih produk untuk melihat simulasi margin.</p>';
            return;
        }

        const row = document.querySelector(`tr[data-produk="${produk}"]`);
        if (!row) return;

        const offline = parseFloat(row.querySelector('.price-offline')?.value) || 0;
        const online = parseFloat(row.querySelector('.price-online')?.value) || 0;
        const fee = parseFloat(row.querySelector('.price-fee')?.value) || 0;

        const batches = Storage.getBatches().filter(b => b.produk === produk && (b.berat - b.used) > 0);
        let hpp = 0;
        if (batches.length > 0) {
            const totalHPP = batches.reduce((sum, b) => sum + CFS.Inventory.calculateHPP(b) * (b.berat - b.used), 0);
            const totalWeight = batches.reduce((sum, b) => sum + (b.berat - b.used), 0);
            hpp = totalWeight > 0 ? Math.round(totalHPP / totalWeight) : 0;
        }

        let html = `<p class="font-semibold">${produk}</p>`;
        html += `<p>HPP: <strong>Rp ${hpp.toLocaleString('id-ID')}</strong>/kg</p>`;

        if (offline > 0) {
            const margin = offline - hpp;
            const persen = hpp > 0 ? ((margin / hpp) * 100).toFixed(1) : 0;
            html += `<p>Offline: Rp ${offline.toLocaleString('id-ID')} | Margin: Rp ${margin.toLocaleString('id-ID')} (${persen}%)</p>`;
        }
        if (online > 0) {
            const margin = online - hpp;
            const persen = hpp > 0 ? ((margin / hpp) * 100).toFixed(1) : 0;
            const feeAmount = Math.round(online * fee / 100);
            html += `<p>Online: Rp ${online.toLocaleString('id-ID')} | Margin: Rp ${margin.toLocaleString('id-ID')} (${persen}%)</p>`;
            html += `<p class="text-xs opacity-70">Komisi (${fee}%): Rp ${feeAmount.toLocaleString('id-ID')} | Bersih setelah komisi: Rp ${(online - feeAmount).toLocaleString('id-ID')}</p>`;
        }

        simDiv.innerHTML = html;
    }

    // ==================== RIWAYAT PERUBAHAN HARGA ====================
    function renderPricingHistory() {
        const tbody = document.getElementById('pricingHistoryTableBody');
        if (!tbody) return;

        const trail = Storage.getAuditTrail().filter(t => t.aksi.includes('HARGA') || t.aksi.includes('PRICING'));
        const recent = trail.slice(0, 20);

        if (recent.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center p-4 opacity-50">Belum ada perubahan harga.</td></tr>';
            return;
        }

        tbody.innerHTML = recent.map(t => `
            <tr class="border-t text-sm">
                <td class="p-2">${new Date(t.waktu).toLocaleString('id-ID')}</td>
                <td class="p-2">${t.detail.split(' ')[0] || '-'}</td>
                <td class="p-2">${t.detail}</td>
            </tr>
        `).join('');
    }

    // ==================== IMPOR / EKSPOR CSV ====================
    function setupImportExport() {
        document.getElementById('btnPricingExport')?.addEventListener('click', () => {
            const pricing = Storage.getPricing() || {};
            const products = Storage.getProducts().length > 0
                ? Storage.getProducts().map(p => p.name)
                : Storage.defaultProducts;

            let csv = 'Produk,Harga Offline,Harga Online,Komisi Online (%),Harga Grosir,Harga Partai\n';
            products.forEach(p => {
                const pr = pricing[p] || {};
                csv += `"${p}",${pr.offline || ''},${pr.online || ''},${pr.onlineFee || ''},${pr.grosir || ''},${pr.partai || ''}\n`;
            });

            const blob = new Blob([csv], { type: 'text/csv' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `harga_jual_${new Date().toISOString().slice(0,10)}.csv`;
            a.click();
            showToast('Sukses', 'Harga diekspor ke CSV.', 'success');
        });

        document.getElementById('btnPricingImport')?.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.csv';
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const text = await file.text();
                const lines = text.split('\n').filter(l => l.trim());
                if (lines.length < 2) return;

                for (let i = 1; i < lines.length; i++) {
                    const cols = lines[i].split(',');
                    const produk = cols[0]?.replace(/"/g, '').trim();
                    if (!produk) continue;
                    const offline = parseFloat(cols[1]) || undefined;
                    const online = parseFloat(cols[2]) || undefined;
                    const onlineFee = parseFloat(cols[3]) || undefined;
                    const grosir = parseFloat(cols[4]) || undefined;
                    const partai = parseFloat(cols[5]) || undefined;

                    await Storage.savePricing(produk, {
                        offline: offline || undefined,
                        online: online || undefined,
                        onlineFee: onlineFee || undefined,
                        grosir: grosir || undefined,
                        partai: partai || undefined
                    });
                }
                renderPricingTable();
                bindPricingEvents();
                refreshPriceChart();
                renderPricingHistory();
                showToast('Sukses', 'Harga diimpor dari CSV.', 'success');
            };
            input.click();
        });
    }

    // ==================== EVENT BINDING ====================
    function bindPricingEvents() {
        // Simpan semua
        document.getElementById('btnPricingSaveAll')?.addEventListener('click', saveAllPricing);

        // Klik pada baris untuk simulasi margin
        document.querySelectorAll('#pricingTableBody tr[data-produk]').forEach(row => {
            row.addEventListener('click', function(e) {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
                const produk = this.dataset.produk;
                updateMarginSimulation(produk);
            });
        });
    }

    // Expose ke CFS
    CFS.Pricing = { init: initPricingTab };
})();
