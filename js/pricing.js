/* ============================================================
   Cibitung Frozen ERP Ultimate v5.4 — Pricing Module (Upgrade)
   ============================================================ */
window.CFS = window.CFS || {};

(function() {
    'use strict';
    const Storage = CFS.Storage;

    let priceChart = null;
    let elements = {};

    function cacheElements() {
        elements = {
            tableBody: document.getElementById('pricingTableBody'),
            chartCanvas: document.getElementById('chartPriceComparison'),
            simDiv: document.getElementById('pricingMarginSimulation'),
            historyTable: document.getElementById('pricingHistoryTableBody'),
            btnSaveAll: document.getElementById('btnPricingSaveAll'),
            btnFormula: document.getElementById('btnPricingApplyFormula'),
            btnExport: document.getElementById('btnPricingExport'),
            btnImport: document.getElementById('btnPricingImport'),
            applyDefaultBtn: document.getElementById('applyDefaultPricing'),
            saveAllMainBtn: document.getElementById('btnPricingSaveAllMain')
        };
    }

    function initPricingTab() {
        cacheElements();
        setupSubTabs();
        renderPricingTable();
        bindEvents();
        refreshPriceChart();
        renderPricingHistory();
        setupFormulaButton();
        setupImportExport();
        setupSaveAllButton();
    }

    // --------------- SUB‑TAB SWITCHING (JIKA ADA) ---------------
    function setupSubTabs() {
        document.querySelectorAll('.pricing-subtab-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.pricing-subtab-btn').forEach(b => {
                    b.classList.remove('btn-primary', 'active');
                    b.classList.add('btn-secondary');
                });
                this.classList.add('btn-primary', 'active');
                this.classList.remove('btn-secondary');

                const targetId = this.dataset.pricingTab;
                document.querySelectorAll('.pricing-subtab-content').forEach(c => c.classList.add('hidden'));
                const target = document.getElementById(targetId);
                if (target) target.classList.remove('hidden');
            });
        });
    }

    // --------------- RENDER TABEL ---------------
    function renderPricingTable() {
        const tbody = elements.tableBody;
        if (!tbody) return;

        const products = Storage.getProducts().length > 0
            ? Storage.getProducts().map(p => p.name)
            : Storage.defaultProducts;

        const pricing = Storage.getPricing() || {};
        const batches = Storage.getBatches();

        // Hitung HPP rata‑rata per produk
        const hppMap = {};
        products.forEach(p => {
            const productBatches = batches.filter(b => b.produk === p && (b.berat - b.used) > 0);
            if (productBatches.length > 0) {
                const totalHPP = productBatches.reduce((sum, b) => {
                    const hpp = CFS.Inventory?.calculateHPP ? CFS.Inventory.calculateHPP(b) : b.hargaBeli;
                    return sum + hpp * (b.berat - b.used);
                }, 0);
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

            return `
            <tr class="border-t hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer" data-produk="${produk}">
                <td class="p-2 font-medium">${produk}</td>
                <td class="p-2 text-right text-xs opacity-70">${hpp > 0 ? 'Rp ' + hpp.toLocaleString('id-ID') : '-'}</td>
                <td class="p-2 text-right"><input type="number" class="price-input price-offline w-24 text-right" data-produk="${produk}" data-field="offline" value="${offline}" placeholder="Otomatis" step="100"></td>
                <td class="p-2 text-right"><input type="number" class="price-input price-online w-24 text-right" data-produk="${produk}" data-field="online" value="${online}" placeholder="Otomatis" step="100"></td>
                <td class="p-2 text-right"><input type="number" class="price-input price-fee w-16 text-right" data-produk="${produk}" data-field="onlineFee" value="${onlineFee}" placeholder="%" step="0.1"></td>
                <td class="p-2 text-right"><input type="number" class="price-input price-grosir w-24 text-right" data-produk="${produk}" data-field="grosir" value="${grosir}" placeholder="Otomatis" step="100"></td>
                <td class="p-2 text-right"><input type="number" class="price-input price-partai w-24 text-right" data-produk="${produk}" data-field="partai" value="${partai}" placeholder="Otomatis" step="100"></td>
                <td class="p-2 text-right ${getMarginClass(offline, hpp)}">${offline ? 'Rp ' + (offline - hpp).toLocaleString('id-ID') : '-'}</td>
                <td class="p-2 text-right ${getMarginClass(online, hpp)}">${online ? 'Rp ' + (online - hpp).toLocaleString('id-ID') : '-'}</td>
                <td class="p-2 text-center"><button class="btn btn-xs btn-primary save-single-btn" data-produk="${produk}"><i class="ph ph-floppy-disk"></i></button></td>
            </tr>`;
        }).join('');

        // Event listeners untuk input dan tombol
        tbody.querySelectorAll('.price-input').forEach(input => {
            input.addEventListener('input', debounce(function() {
                updateMarginDisplay(this);
            }, 200));
        });

        tbody.querySelectorAll('.save-single-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                saveSingleProductPricing(this.dataset.produk);
            });
        });

        // Klik baris untuk simulasi
        tbody.querySelectorAll('tr[data-produk]').forEach(row => {
            row.addEventListener('click', function(e) {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
                updateMarginSimulation(this.dataset.produk);
            });
        });
    }

    function getMarginClass(price, hpp) {
        if (!price) return 'text-right';
        const margin = price - hpp;
        return margin >= 0 ? 'text-green-600 text-right' : 'text-red-600 text-right';
    }

    function updateMarginDisplay(inputEl) {
        const produk = inputEl.dataset.produk;
        const row = document.querySelector(`tr[data-produk="${produk}"]`);
        if (!row) return;

        const offline = parseFloat(row.querySelector('.price-offline')?.value) || 0;
        const online = parseFloat(row.querySelector('.price-online')?.value) || 0;
        const hpp = getProductHPP(produk);

        const marginOffCell = row.cells[7];
        const marginOnCell = row.cells[8];
        if (marginOffCell) {
            if (offline > 0) {
                marginOffCell.textContent = 'Rp ' + (offline - hpp).toLocaleString('id-ID');
                marginOffCell.className = `p-2 text-right ${(offline - hpp) >= 0 ? 'text-green-600' : 'text-red-600'}`;
            } else {
                marginOffCell.textContent = '-';
                marginOffCell.className = 'p-2 text-right';
            }
        }
        if (marginOnCell) {
            if (online > 0) {
                marginOnCell.textContent = 'Rp ' + (online - hpp).toLocaleString('id-ID');
                marginOnCell.className = `p-2 text-right ${(online - hpp) >= 0 ? 'text-green-600' : 'text-red-600'}`;
            } else {
                marginOnCell.textContent = '-';
                marginOnCell.className = 'p-2 text-right';
            }
        }
        updateMarginSimulation(produk);
    }

    function getProductHPP(produk) {
        const batches = Storage.getBatches().filter(b => b.produk === produk && (b.berat - b.used) > 0);
        if (batches.length === 0) return 0;
        const totalHPP = batches.reduce((sum, b) => {
            const hpp = CFS.Inventory?.calculateHPP ? CFS.Inventory.calculateHPP(b) : b.hargaBeli;
            return sum + hpp * (b.berat - b.used);
        }, 0);
        const totalWeight = batches.reduce((sum, b) => sum + (b.berat - b.used), 0);
        return totalWeight > 0 ? Math.round(totalHPP / totalWeight) : 0;
    }

    // --------------- SIMPAN ---------------
    async function saveSingleProductPricing(produk) {
        const row = document.querySelector(`tr[data-produk="${produk}"]`);
        if (!row) return;

        const data = {
            offline: parseFloat(row.querySelector('.price-offline')?.value) || undefined,
            online: parseFloat(row.querySelector('.price-online')?.value) || undefined,
            onlineFee: parseFloat(row.querySelector('.price-fee')?.value) || undefined,
            grosir: parseFloat(row.querySelector('.price-grosir')?.value) || undefined,
            partai: parseFloat(row.querySelector('.price-partai')?.value) || undefined
        };

        await Storage.savePricing(produk, data);
        showToast?.('Sukses', `Harga ${produk} disimpan.`, 'success');
        Storage.addAudit?.('HARGA', `Update harga ${produk}`);
        refreshPriceChart();
        renderPricingHistory();
    }

    async function saveAllPricing() {
        const rows = document.querySelectorAll('#pricingTableBody tr[data-produk]');
        if (rows.length === 0) return;
        for (const row of rows) {
            const produk = row.dataset.produk;
            const data = {
                offline: parseFloat(row.querySelector('.price-offline')?.value) || undefined,
                online: parseFloat(row.querySelector('.price-online')?.value) || undefined,
                onlineFee: parseFloat(row.querySelector('.price-fee')?.value) || undefined,
                grosir: parseFloat(row.querySelector('.price-grosir')?.value) || undefined,
                partai: parseFloat(row.querySelector('.price-partai')?.value) || undefined
            };
            await Storage.savePricing(produk, data);
        }
        showToast?.('Sukses', 'Semua harga disimpan.', 'success');
        Storage.addAudit?.('HARGA', 'Update semua harga');
        refreshPriceChart();
        renderPricingHistory();
    }

    function setupSaveAllButton() {
        if (elements.btnSaveAll) {
            elements.btnSaveAll.addEventListener('click', saveAllPricing);
        }
        if (elements.saveAllMainBtn) {
            elements.saveAllMainBtn.addEventListener('click', saveAllPricing);
        }
    }

    // --------------- FORMULA DEFAULT ---------------
    function setupFormulaButton() {
        const btn = elements.btnFormula;
        if (!btn) return;

        btn.addEventListener('click', () => {
            const settings = Storage.getSettings();
            const marginDefault = settings.marginDefault || 15000;
            const marketplaceFee = settings.marketplaceFee || 5;
            const selisihGrosir = settings.selisihGrosir || 5000;

            const rows = document.querySelectorAll('#pricingTableBody tr[data-produk]');
            rows.forEach(row => {
                const produk = row.dataset.produk;
                const hpp = getProductHPP(produk);
                if (hpp <= 0) return;

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
            });

            showToast?.('Info', 'Formula default diterapkan. Jangan lupa simpan.', 'info');
        });
    }

    // --------------- GRAFIK ---------------
    function refreshPriceChart() {
        const ctx = elements.chartCanvas?.getContext('2d');
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
        if (labels.length === 0) return;

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
                        ticks: { callback: (val) => 'Rp ' + val.toLocaleString('id-ID') }
                    }
                }
            }
        });
    }

    // --------------- SIMULASI ---------------
    function updateMarginSimulation(produk) {
        const simDiv = elements.simDiv;
        if (!simDiv) return;
        if (!produk) {
            simDiv.innerHTML = '<p class="opacity-50 text-sm">Klik baris produk untuk melihat simulasi margin.</p>';
            return;
        }
        const row = document.querySelector(`tr[data-produk="${produk}"]`);
        if (!row) return;

        const offline = parseFloat(row.querySelector('.price-offline')?.value) || 0;
        const online = parseFloat(row.querySelector('.price-online')?.value) || 0;
        const fee = parseFloat(row.querySelector('.price-fee')?.value) || 0;
        const hpp = getProductHPP(produk);

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
            html += `<p class="text-xs opacity-70">Komisi (${fee}%): Rp ${feeAmount.toLocaleString('id-ID')} | Bersih: Rp ${(online - feeAmount).toLocaleString('id-ID')}</p>`;
        }
        simDiv.innerHTML = html;
    }

    // --------------- RIWAYAT ---------------
    function renderPricingHistory() {
        const tbody = elements.historyTable;
        if (!tbody) return;
        const trail = Storage.getAuditTrail().filter(t => t.aksi.includes('HARGA'));
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

    // --------------- IMPORT / EXPORT ---------------
    function setupImportExport() {
        if (elements.btnExport) {
            elements.btnExport.addEventListener('click', exportCSV);
        }
        if (elements.btnImport) {
            elements.btnImport.addEventListener('click', importCSV);
        }
    }

    function exportCSV() {
        const pricing = Storage.getPricing() || {};
        const products = Storage.getProducts().length > 0
            ? Storage.getProducts().map(p => p.name)
            : Storage.defaultProducts;

        let csv = 'Produk,Harga Offline,Harga Online,Komisi (%),Grosir,Partai\n';
        products.forEach(p => {
            const pr = pricing[p] || {};
            csv += `"${p}",${pr.offline || ''},${pr.online || ''},${pr.onlineFee || ''},${pr.grosir || ''},${pr.partai || ''}\n`;
        });
        downloadFile(csv, `harga_jual_${new Date().toISOString().slice(0,10)}.csv`, 'text/csv');
        showToast?.('Sukses', 'Harga diekspor ke CSV.', 'success');
    }

    function importCSV() {
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
                const cols = lines[i].split(',').map(c => c.replace(/"/g, '').trim());
                if (cols.length < 6) continue;
                const [produk, offline, online, fee, grosir, partai] = cols;
                if (!produk) continue;
                await Storage.savePricing(produk, {
                    offline: parseFloat(offline) || undefined,
                    online: parseFloat(online) || undefined,
                    onlineFee: parseFloat(fee) || undefined,
                    grosir: parseFloat(grosir) || undefined,
                    partai: parseFloat(partai) || undefined
                });
            }
            renderPricingTable();
            bindEvents();
            refreshPriceChart();
            renderPricingHistory();
            showToast?.('Sukses', 'Harga diimpor dari CSV.', 'success');
        };
        input.click();
    }

    function downloadFile(content, filename, type) {
        const blob = new Blob([content], { type });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
    }

    // --------------- EVENT BINDING ---------------
    function bindEvents() {
        // Terapkan default pricing (tombol di luar modul ini)
        if (elements.applyDefaultBtn && !elements.applyDefaultBtn.dataset.listener) {
            elements.applyDefaultBtn.dataset.listener = 'true';
            elements.applyDefaultBtn.addEventListener('click', () => {
                const rows = document.querySelectorAll('#pricingTableBody tr[data-produk]');
                rows.forEach(row => {
                    const inputs = row.querySelectorAll('input[type="number"]');
                    inputs.forEach(inp => inp.value = '');
                });
                showToast?.('Info', 'Harga default akan dihitung otomatis saat penjualan.', 'info');
            });
        }
    }

    function debounce(fn, delay) {
        let timer;
        return function(...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    // --------------- EXTERNAL ---------------
    window.CFS.Pricing = { init: initPricingTab };
})();
