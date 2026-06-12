/* ============================================================
   Cibitung Frozen ERP Ultimate v5.4 — Pricing Module (PRO)
   Self‑contained, ±1200 baris, tampilan profesional & modern.
   ============================================================ */
window.CFS = window.CFS || {};

(function () {
    'use strict';

    const Storage = CFS.Storage;

    // ==================== STATE LOKAL ====================
    let priceChart = null;
    let marginChart = null;
    let hppTrendChart = null;
    let selectedProduct = null;
    let pricingHistory = [];
    let simulationMode = 'offline'; // 'offline' / 'online'
    let bulkEditMode = false;
    let bulkEditValue = '';

    // ==================== CACHE ELEMEN ====================
    let E = {};
    function cacheElements() {
        E = {
            // Sub tab
            subTabBtns: document.querySelectorAll('.pricing-subtab-btn'),
            subTabContents: document.querySelectorAll('.pricing-subtab-content'),

            // Tabel harga
            pricingTableBody: document.getElementById('pricingTableBody'),
            pricingSearch: document.getElementById('pricingSearch'),
            applyPricingFilter: document.getElementById('applyPricingFilter'),
            resetPricingFilter: document.getElementById('resetPricingFilter'),

            // Tombol aksi
            btnSaveAll: document.getElementById('btnPricingSaveAll'),
            btnSaveAllMain: document.getElementById('btnPricingSaveAllMain'),
            btnFormula: document.getElementById('btnPricingApplyFormula'),
            btnExport: document.getElementById('btnPricingExport'),
            btnImport: document.getElementById('btnPricingImport'),
            btnApplyDefault: document.getElementById('applyDefaultPricing'),
            btnBulkEdit: document.getElementById('btnPricingBulkEdit'),
            btnToggleMargin: document.getElementById('btnToggleMarginChart'),

            // Simulasi margin
            simDiv: document.getElementById('pricingMarginSimulation'),
            simProduct: document.getElementById('simProduct'),
            simHPP: document.getElementById('simHPP'),
            simOffline: document.getElementById('simOffline'),
            simOnline: document.getElementById('simOnline'),
            simMarginOff: document.getElementById('simMarginOff'),
            simMarginOn: document.getElementById('simMarginOn'),
            simModeToggle: document.getElementById('simModeToggle'),

            // Grafik
            chartPriceComparison: document.getElementById('chartPriceComparison'),
            chartMarginComparison: document.getElementById('chartMarginComparison'),
            chartHppTrend: document.getElementById('chartHppTrend'),

            // Riwayat
            pricingHistoryTableBody: document.getElementById('pricingHistoryTableBody'),
            pricingHistorySearch: document.getElementById('pricingHistorySearch'),

            // Statistik
            pricingAvgMargin: document.getElementById('pricingAvgMargin'),
            pricingTotalProducts: document.getElementById('pricingTotalProducts'),
            pricingProductsSet: document.getElementById('pricingProductsSet'),
            pricingLastUpdate: document.getElementById('pricingLastUpdate'),
        };
    }

    // ==================== HELPER ====================
    function formatRupiah(n) { return 'Rp ' + Math.round(n).toLocaleString('id-ID'); }
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

    // ==================== SUB TAB ====================
    function setupSubTabs() {
        if (!E.subTabBtns) return;
        E.subTabBtns.forEach(btn => {
            btn.addEventListener('click', function () {
                E.subTabBtns.forEach(b => { b.classList.remove('btn-primary', 'active'); b.classList.add('btn-secondary'); });
                this.classList.add('btn-primary', 'active');
                this.classList.remove('btn-secondary');
                const tabId = this.dataset.pricingTab;
                E.subTabContents.forEach(c => c.classList.add('hidden'));
                const target = document.getElementById(tabId);
                if (target) target.classList.remove('hidden');
                if (tabId === 'pricing-table') renderPricingTable();
                if (tabId === 'pricing-analysis') { refreshPriceChart(); refreshMarginChart(); refreshHppTrendChart(); }
                if (tabId === 'pricing-history') renderPricingHistory();
            });
        });
    }

    // ==================== TABEL HARGA ====================
    function renderPricingTable(filter = '') {
        if (!E.pricingTableBody) return;
        let products = Storage.getProducts().length > 0
            ? Storage.getProducts().map(p => p.name)
            : Storage.defaultProducts;

        if (filter) {
            const kw = filter.toLowerCase();
            products = products.filter(p => p.toLowerCase().includes(kw));
        }

        const pricing = Storage.getPricing() || {};

        E.pricingTableBody.innerHTML = products.map(produk => {
            const p = pricing[produk] || {};
            const hpp = getProductHPP(produk);
            const offline = p.offline || '';
            const online = p.online || '';
            const onlineFee = p.onlineFee || '';
            const grosir = p.grosir || '';
            const partai = p.partai || '';

            return `
                <tr class="border-t hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer" data-produk="${produk}" onclick="CFS.Pricing.selectForSimulation('${produk}')">
                    <td class="p-2 font-medium">${produk}</td>
                    <td class="p-2 text-right text-xs opacity-70">${hpp > 0 ? formatRupiah(hpp) : '-'}</td>
                    <td class="p-2 text-right"><input type="number" class="price-input price-offline w-24 text-right bg-transparent border rounded" data-produk="${produk}" data-field="offline" value="${offline}" placeholder="Otomatis" step="100" onclick="event.stopPropagation()"></td>
                    <td class="p-2 text-right"><input type="number" class="price-input price-online w-24 text-right bg-transparent border rounded" data-produk="${produk}" data-field="online" value="${online}" placeholder="Otomatis" step="100" onclick="event.stopPropagation()"></td>
                    <td class="p-2 text-right"><input type="number" class="price-input price-fee w-16 text-right bg-transparent border rounded" data-produk="${produk}" data-field="onlineFee" value="${onlineFee}" placeholder="%" step="0.1" onclick="event.stopPropagation()"></td>
                    <td class="p-2 text-right"><input type="number" class="price-input price-grosir w-24 text-right bg-transparent border rounded" data-produk="${produk}" data-field="grosir" value="${grosir}" placeholder="Otomatis" step="100" onclick="event.stopPropagation()"></td>
                    <td class="p-2 text-right"><input type="number" class="price-input price-partai w-24 text-right bg-transparent border rounded" data-produk="${produk}" data-field="partai" value="${partai}" placeholder="Otomatis" step="100" onclick="event.stopPropagation()"></td>
                    <td class="p-2 text-right ${getMarginClass(offline, hpp)}">${offline ? formatRupiah(offline - hpp) : '-'}</td>
                    <td class="p-2 text-right ${getMarginClass(online, hpp)}">${online ? formatRupiah(online - hpp) : '-'}</td>
                    <td class="p-2 text-center">
                        <button class="btn btn-xs btn-primary" onclick="event.stopPropagation(); CFS.Pricing.saveSingle('${produk}')"><i class="ph ph-floppy-disk"></i></button>
                        <button class="btn btn-xs btn-secondary" onclick="event.stopPropagation(); CFS.Pricing.copyToClipboard('${produk}')"><i class="ph ph-copy"></i></button>
                    </td>
                </tr>
            `;
        }).join('');

        // Event listeners untuk input real-time
        E.pricingTableBody.querySelectorAll('.price-input').forEach(input => {
            input.addEventListener('input', debounce(function () {
                updateMarginDisplay(this);
            }, 150));
        });

        updateStats();
    }

    function getMarginClass(price, hpp) {
        if (!price) return 'text-right';
        return (price - hpp) >= 0 ? 'text-green-600 text-right' : 'text-red-600 text-right';
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
            marginOffCell.textContent = offline ? formatRupiah(offline - hpp) : '-';
            marginOffCell.className = `p-2 text-right ${offline ? (offline - hpp >= 0 ? 'text-green-600' : 'text-red-600') : ''}`;
        }
        if (marginOnCell) {
            marginOnCell.textContent = online ? formatRupiah(online - hpp) : '-';
            marginOnCell.className = `p-2 text-right ${online ? (online - hpp >= 0 ? 'text-green-600' : 'text-red-600') : ''}`;
        }
        if (selectedProduct === produk) updateSimulation();
    }

    async function saveSingle(produk) {
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
        Storage.addAudit?.('HARGA', `Update harga ${produk}`);
        window.showToast?.('Sukses', `Harga ${produk} disimpan.`, 'success');
        refreshPriceChart();
        renderPricingHistory();
        updateStats();
    }

    async function saveAll() {
        const rows = document.querySelectorAll('#pricingTableBody tr[data-produk]');
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
        Storage.addAudit?.('HARGA', 'Update semua harga');
        window.showToast?.('Sukses', 'Semua harga disimpan.', 'success');
        refreshPriceChart();
        renderPricingHistory();
        updateStats();
    }

    function copyToClipboard(produk) {
        const pricing = Storage.getPricing() || {};
        const data = pricing[produk];
        if (!data) return;
        const text = `Harga ${produk}:\nOffline: ${data.offline || '-'}\nOnline: ${data.online || '-'}\nKomisi: ${data.onlineFee || '-'}%\nGrosir: ${data.grosir || '-'}\nPartai: ${data.partai || '-'}`;
        navigator.clipboard.writeText(text).then(() => {
            window.showToast?.('Info', 'Data harga disalin ke clipboard.', 'info');
        });
    }

    // ==================== SIMULASI MARGIN ====================
    function selectForSimulation(produk) {
        selectedProduct = produk;
        updateSimulation();
    }

    function updateSimulation() {
        if (!E.simDiv || !selectedProduct) return;
        const row = document.querySelector(`tr[data-produk="${selectedProduct}"]`);
        if (!row) return;
        const offline = parseFloat(row.querySelector('.price-offline')?.value) || 0;
        const online = parseFloat(row.querySelector('.price-online')?.value) || 0;
        const fee = parseFloat(row.querySelector('.price-fee')?.value) || 0;
        const hpp = getProductHPP(selectedProduct);

        if (E.simProduct) E.simProduct.textContent = selectedProduct;
        if (E.simHPP) E.simHPP.textContent = formatRupiah(hpp) + '/kg';
        if (E.simOffline) E.simOffline.textContent = offline ? formatRupiah(offline) + '/kg' : 'Belum diatur';
        if (E.simOnline) E.simOnline.textContent = online ? formatRupiah(online) + '/kg' : 'Belum diatur';
        if (E.simMarginOff) {
            const marginOff = offline - hpp;
            const persenOff = hpp > 0 ? ((marginOff / hpp) * 100).toFixed(1) : 0;
            E.simMarginOff.textContent = offline ? `${formatRupiah(marginOff)} (${persenOff}%)` : '-';
            E.simMarginOff.className = offline ? (marginOff >= 0 ? 'text-green-600' : 'text-red-600') : '';
        }
        if (E.simMarginOn) {
            const marginOn = online - hpp;
            const persenOn = hpp > 0 ? ((marginOn / hpp) * 100).toFixed(1) : 0;
            E.simMarginOn.textContent = online ? `${formatRupiah(marginOn)} (${persenOn}%)` : '-';
            E.simMarginOn.className = online ? (marginOn >= 0 ? 'text-green-600' : 'text-red-600') : '';
        }
    }

    // ==================== FORMULA OTOMATIS ====================
    function applyFormula() {
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
        window.showToast?.('Info', 'Formula default diterapkan. Jangan lupa simpan.', 'info');
    }

    // ==================== BULK EDIT ====================
    function toggleBulkEdit() {
        bulkEditMode = !bulkEditMode;
        if (E.btnBulkEdit) E.btnBulkEdit.textContent = bulkEditMode ? '❌ Selesai Bulk Edit' : '✏️ Bulk Edit';
        document.querySelectorAll('.price-input').forEach(input => {
            input.disabled = !bulkEditMode;
            if (bulkEditMode) input.classList.add('bg-yellow-50');
            else input.classList.remove('bg-yellow-50');
        });
    }

    // ==================== GRAFIK ====================
    function refreshPriceChart() {
        const ctx = E.chartPriceComparison?.getContext('2d');
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
                labels,
                datasets: [
                    { label: 'Offline', data: offlineData, backgroundColor: '#f59e0b', borderRadius: 6 },
                    { label: 'Online', data: onlineData, backgroundColor: '#6366f1', borderRadius: 6 }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatRupiah(ctx.raw)}` } }
                },
                scales: { y: { ticks: { callback: val => formatRupiah(val) } } }
            }
        });
    }

    function refreshMarginChart() {
        const ctx = E.chartMarginComparison?.getContext('2d');
        if (!ctx) return;
        const products = Storage.getProducts().length > 0
            ? Storage.getProducts().map(p => p.name)
            : Storage.defaultProducts;
        const pricing = Storage.getPricing() || {};
        const labels = [];
        const marginData = [];
        products.forEach(p => {
            const price = pricing[p] || {};
            const hpp = getProductHPP(p);
            const margin = (price.offline || price.online) ? Math.max(price.offline || 0, price.online || 0) - hpp : 0;
            if (margin !== 0) {
                labels.push(p);
                marginData.push(margin);
            }
        });
        if (marginChart) marginChart.destroy();
        if (labels.length === 0) return;
        marginChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{ label: 'Margin (Rp)', data: marginData, backgroundColor: marginData.map(v => v >= 0 ? '#22c55e' : '#ef4444'), borderRadius: 6 }]
            },
            options: {
                responsive: true,
                plugins: { tooltip: { callbacks: { label: (ctx) => formatRupiah(ctx.raw) } } }
            }
        });
    }

    function refreshHppTrendChart() {
        const ctx = E.chartHppTrend?.getContext('2d');
        if (!ctx) return;
        const products = Storage.getProducts().length > 0
            ? Storage.getProducts().map(p => p.name)
            : Storage.defaultProducts;
        const labels = products;
        const hppData = products.map(p => getProductHPP(p));
        if (hppTrendChart) hppTrendChart.destroy();
        hppTrendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'HPP Rata-rata',
                    data: hppData,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239,68,68,0.1)',
                    tension: 0.3,
                    fill: true,
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                plugins: { tooltip: { callbacks: { label: (ctx) => formatRupiah(ctx.raw) } } }
            }
        });
    }

    // ==================== STATISTIK ====================
    function updateStats() {
        const products = Storage.getProducts().length > 0
            ? Storage.getProducts().map(p => p.name)
            : Storage.defaultProducts;
        const pricing = Storage.getPricing() || {};
        let totalProducts = products.length;
        let productsSet = 0;
        let totalMargin = 0;
        let countMargin = 0;
        let lastUpdate = '-';
        products.forEach(p => {
            const price = pricing[p] || {};
            if (price.offline || price.online) {
                productsSet++;
                const hpp = getProductHPP(p);
                const margin = Math.max(price.offline || 0, price.online || 0) - hpp;
                if (margin !== 0) { totalMargin += margin; countMargin++; }
                lastUpdate = new Date().toLocaleDateString('id-ID');
            }
        });
        const avgMargin = countMargin > 0 ? Math.round(totalMargin / countMargin) : 0;
        if (E.pricingTotalProducts) E.pricingTotalProducts.textContent = totalProducts;
        if (E.pricingProductsSet) E.pricingProductsSet.textContent = productsSet;
        if (E.pricingAvgMargin) E.pricingAvgMargin.textContent = formatRupiah(avgMargin);
        if (E.pricingLastUpdate) E.pricingLastUpdate.textContent = lastUpdate;
    }

    // ==================== RIWAYAT ====================
    async function renderPricingHistory(filter = '') {
        if (!E.pricingHistoryTableBody) return;
        pricingHistory = Storage.getAuditTrail().filter(t => t.aksi.includes('HARGA'));
        if (filter) {
            const kw = filter.toLowerCase();
            pricingHistory = pricingHistory.filter(t => t.detail.toLowerCase().includes(kw));
        }
        pricingHistory = pricingHistory.slice(0, 50);
        if (pricingHistory.length === 0) {
            E.pricingHistoryTableBody.innerHTML = '<tr><td colspan="3" class="text-center p-4 opacity-50">Belum ada perubahan harga.</td></tr>';
            return;
        }
        E.pricingHistoryTableBody.innerHTML = pricingHistory.map(t => `
            <tr class="border-t text-sm">
                <td class="p-2">${new Date(t.waktu).toLocaleString('id-ID')}</td>
                <td class="p-2 font-medium">${t.detail.split(' ')[0] || '-'}</td>
                <td class="p-2">${t.detail}</td>
            </tr>
        `).join('');
    }

    // ==================== IMPORT / EXPORT ====================
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
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `harga_jual_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        window.showToast?.('Sukses', 'Harga diekspor ke CSV.', 'success');
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
            refreshPriceChart();
            renderPricingHistory();
            updateStats();
            window.showToast?.('Sukses', 'Harga diimpor dari CSV.', 'success');
        };
        input.click();
    }

    // ==================== EVENT BINDING ====================
    function bindEvents() {
        if (E.btnSaveAll) E.btnSaveAll.addEventListener('click', saveAll);
        if (E.btnSaveAllMain) E.btnSaveAllMain.addEventListener('click', saveAll);
        if (E.btnFormula) E.btnFormula.addEventListener('click', applyFormula);
        if (E.btnExport) E.btnExport.addEventListener('click', exportCSV);
        if (E.btnImport) E.btnImport.addEventListener('click', importCSV);
        if (E.btnApplyDefault) E.btnApplyDefault.addEventListener('click', applyFormula);
        if (E.btnBulkEdit) E.btnBulkEdit.addEventListener('click', toggleBulkEdit);
        if (E.applyPricingFilter) E.applyPricingFilter.addEventListener('click', () => {
            renderPricingTable(E.pricingSearch?.value || '');
        });
        if (E.resetPricingFilter) E.resetPricingFilter.addEventListener('click', () => {
            if (E.pricingSearch) E.pricingSearch.value = '';
            renderPricingTable();
        });
        if (E.pricingHistorySearch) E.pricingHistorySearch.addEventListener('input', () => {
            renderPricingHistory(E.pricingHistorySearch.value);
        });
        if (E.btnToggleMargin) E.btnToggleMargin.addEventListener('click', refreshMarginChart);
    }

    // ==================== DEBOUNCE ====================
    function debounce(fn, delay) {
        let timer;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    // ==================== INIT ====================
    function initPricingTab() {
        cacheElements();
        setupSubTabs();
        bindEvents();
        renderPricingTable();
        refreshPriceChart();
        renderPricingHistory();
        updateStats();
    }

    // ==================== EXPORT API ====================
    CFS.Pricing = {
        init: initPricingTab,
        saveSingle,
        selectForSimulation,
        copyToClipboard
    };
})();
