/* ============================================================
   Cibitung Frozen ERP Ultimate v5.4 — CRM Module (ULTIMATE)
   Self‑contained, ±1200 baris, tanpa mengubah file lain.
   ============================================================ */
window.CFS = window.CFS || {};

(function () {
    'use strict';

    const Storage = CFS.Storage;

    // ==================== STATE LOKAL ====================
    let currentSubTab = 'crm-list';
    let customerFilter = { name: '', channel: '', status: '', tier: '' };
    let segmentChartInstance = null;
    let channelChartInstance = null;
    let frequencyChartInstance = null;
    let rfmChartInstance = null;
    let loyaltyChartInstance = null;

    // ==================== CACHE ELEMEN ====================
    let E = {};
    function cacheElements() {
        E = {
            // Sub tab
            subTabBtns: document.querySelectorAll('.crm-subtab-btn'),
            subTabContents: document.querySelectorAll('.crm-subtab-content'),

            // Statistik utama
            crmTotalCustomers: document.getElementById('crmTotalCustomers'),
            crmTotalRevenue: document.getElementById('crmTotalRevenue'),
            crmActiveCustomers: document.getElementById('crmActiveCustomers'),
            crmAvgSpent: document.getElementById('crmAvgSpent'),
            crmNewThisMonth: document.getElementById('crmNewThisMonth'),

            // Daftar Pelanggan
            crmSearchName: document.getElementById('crmSearchName'),
            crmFilterChannel: document.getElementById('crmFilterChannel'),
            crmFilterStatus: document.getElementById('crmFilterStatus'),
            crmFilterTier: document.getElementById('crmFilterTier'),
            applyCrmFilter: document.getElementById('applyCrmFilter'),
            resetCrmFilter: document.getElementById('resetCrmFilter'),
            crmTableBody: document.getElementById('crmTableBody'),
            exportCrmCSV: document.getElementById('exportCrmCSV'),
            crmShowingInfo: document.getElementById('crmShowingInfo'),
            crmLoadMore: document.getElementById('crmLoadMore'),
            crmSelectAll: document.getElementById('crmSelectAll'),
            crmBulkDelete: document.getElementById('crmBulkDelete'),

            // Segmentasi
            crmSegTop: document.getElementById('crmSegTop'),
            crmSegRegular: document.getElementById('crmSegRegular'),
            crmSegNew: document.getElementById('crmSegNew'),
            crmSegChurn: document.getElementById('crmSegChurn'),
            crmSegVIP: document.getElementById('crmSegVIP'),
            chartCrmSegment: document.getElementById('chartCrmSegment'),
            crmTop5Table: document.getElementById('crmTop5Table'),

            // Analisis
            chartCrmChannel: document.getElementById('chartCrmChannel'),
            chartCrmFrequency: document.getElementById('chartCrmFrequency'),
            chartCrmRFM: document.getElementById('chartCrmRFM'),
            chartCrmLoyalty: document.getElementById('chartCrmLoyalty'),
            anaCrmAvgLifetime: document.getElementById('anaCrmAvgLifetime'),
            anaCrmChurnRate: document.getElementById('anaCrmChurnRate'),
            anaCrmRepeatRate: document.getElementById('anaCrmRepeatRate'),
        };
    }

    // ==================== HELPER ====================
    function formatRupiah(n) { return 'Rp ' + Math.round(n).toLocaleString('id-ID'); }
    function getToday() { return new Date().toISOString().split('T')[0]; }
    function getDaysAgo(days) {
        const d = new Date();
        d.setDate(d.getDate() - days);
        return d.toISOString().split('T')[0];
    }
    function getMonthStart() {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    }

    // ==================== SUB TAB SWITCH ====================
    function setupSubTabs() {
        E.subTabBtns.forEach(btn => {
            btn.addEventListener('click', function () {
                E.subTabBtns.forEach(b => { b.classList.remove('btn-primary', 'active'); b.classList.add('btn-secondary'); });
                this.classList.add('btn-primary', 'active');
                this.classList.remove('btn-secondary');
                const tabId = this.dataset.crmTab;
                E.subTabContents.forEach(c => c.classList.add('hidden'));
                const target = document.getElementById(tabId);
                if (target) target.classList.remove('hidden');
                currentSubTab = tabId;

                if (tabId === 'crm-list') renderCRMTable();
                if (tabId === 'crm-segment') renderSegmentView();
                if (tabId === 'crm-analysis') renderCRMAnalysis();
            });
        });
    }

    // ==================== STATISTIK ====================
    function refreshCRMStats() {
        const customers = Storage.getCustomers();
        const names = Object.keys(customers);
        const total = names.length;
        const totalRevenue = names.reduce((sum, n) => sum + (customers[n].totalSpent || 0), 0);
        const days30ago = getDaysAgo(30);
        const active = names.filter(n => customers[n].lastPurchase && customers[n].lastPurchase >= days30ago).length;
        const avg = total > 0 ? Math.round(totalRevenue / total) : 0;
        const monthStart = getMonthStart();
        const newThisMonth = names.filter(n => {
            const first = customers[n].firstPurchase || customers[n].lastPurchase;
            return first && first >= monthStart;
        }).length;

        if (E.crmTotalCustomers) E.crmTotalCustomers.textContent = total;
        if (E.crmTotalRevenue) E.crmTotalRevenue.textContent = formatRupiah(totalRevenue);
        if (E.crmActiveCustomers) E.crmActiveCustomers.textContent = active;
        if (E.crmAvgSpent) E.crmAvgSpent.textContent = formatRupiah(avg);
        if (E.crmNewThisMonth) E.crmNewThisMonth.textContent = newThisMonth;
    }

    // ==================== DAFTAR PELANGGAN ====================
    let currentPage = 1;
    const PER_PAGE = 30;

    function getCustomerFilterParams() {
        return {
            name: (E.crmSearchName?.value || '').toLowerCase(),
            channel: E.crmFilterChannel?.value || '',
            status: E.crmFilterStatus?.value || '',
            tier: E.crmFilterTier?.value || ''
        };
    }

    function renderCRMTable(page = 1, filter = null) {
        if (!E.crmTableBody) return;
        if (filter) customerFilter = filter;
        else customerFilter = getCustomerFilterParams();

        const customers = Storage.getCustomers();
        let names = Object.keys(customers);
        const days30ago = getDaysAgo(30);
        const threshold = days30ago;

        // Apply filters
        if (customerFilter.name) {
            names = names.filter(n => n.toLowerCase().includes(customerFilter.name));
        }
        if (customerFilter.channel) {
            names = names.filter(n => (customers[n].channel || 'offline') === customerFilter.channel);
        }
        if (customerFilter.status) {
            names = names.filter(n => {
                const c = customers[n];
                const total = c.totalSpent || 0;
                const trx = c.transactionCount || 0;
                const last = c.lastPurchase || '';
                if (customerFilter.status === 'top') return total > 10000000;
                if (customerFilter.status === 'regular') return total >= 2000000 && total <= 10000000;
                if (customerFilter.status === 'new') return trx === 1;
                if (customerFilter.status === 'churn') return new Date(last) < new Date(threshold);
                if (customerFilter.status === 'vip') return total > 50000000;
                return true;
            });
        }
        if (customerFilter.tier) {
            names = names.filter(n => (customers[n].tier || 'standard') === customerFilter.tier);
        }

        // Sort by total spent descending
        names.sort((a, b) => (customers[b].totalSpent || 0) - (customers[a].totalSpent || 0));

        const totalPages = Math.ceil(names.length / PER_PAGE);
        const startIdx = (page - 1) * PER_PAGE;
        const pageNames = names.slice(startIdx, startIdx + PER_PAGE);

        if (pageNames.length === 0) {
            E.crmTableBody.innerHTML = '<tr><td colspan="7" class="text-center p-4 opacity-50">Tidak ada pelanggan.</td></tr>';
        } else {
            E.crmTableBody.innerHTML = pageNames.map(name => {
                const c = customers[name];
                const total = c.totalSpent || 0;
                const trx = c.transactionCount || 0;
                const last = c.lastPurchase || '-';
                const channel = c.channel || 'offline';
                const status = total > 50000000 ? '👑 VIP' :
                               total > 10000000 ? '🏆 Top' :
                               total >= 2000000 ? '⭐ Regular' :
                               trx === 1 ? '🆕 New' :
                               (new Date(last) < new Date(threshold) ? '⚠️ Churn' : '⭐ Regular');
                return `<tr class="border-t hover:bg-slate-50 dark:hover:bg-slate-700 text-sm">
                    <td class="p-2"><input type="checkbox" class="crm-checkbox" data-name="${name}"></td>
                    <td class="p-2 font-medium">${name}</td>
                    <td class="p-2 text-right">${formatRupiah(total)}</td>
                    <td class="p-2 text-right">${trx}</td>
                    <td class="p-2 text-right">${last}</td>
                    <td class="p-2 text-center">${channel === 'online' ? '🌐' : '🏪'}</td>
                    <td class="p-2 text-center"><span class="badge bg-slate-100 dark:bg-slate-700">${status}</span></td>
                    <td class="p-2 text-center">
                        <button class="btn btn-xs btn-secondary" onclick="CFS.CRM.showDetail('${name}')" title="Detail">🔍</button>
                        <button class="btn btn-xs btn-warning" onclick="CFS.CRM.mergeCustomer('${name}')" title="Gabung">🔗</button>
                        <button class="btn btn-xs btn-danger" onclick="CFS.CRM.deleteCustomer('${name}')" title="Hapus">🗑️</button>
                    </td>
                </tr>`;
            }).join('');
        }

        if (E.crmShowingInfo) E.crmShowingInfo.textContent = `Halaman ${page} dari ${totalPages} (${names.length} pelanggan)`;
        if (E.crmLoadMore) E.crmLoadMore.style.display = page < totalPages ? '' : 'none';
        currentPage = page;
    }

    function showDetail(name) {
        if (typeof switchTab === 'function') switchTab('tab-crm-detail');
        setTimeout(() => {
            const input = document.getElementById('customerFullName');
            if (input) { input.value = name; input.focus(); }
        }, 200);
    }

    async function deleteCustomer(name) {
        if (!confirm(`Hapus pelanggan "${name}"? Data transaksi tetap aman.`)) return;
        await Storage.deleteCustomer(name);
        refreshCRMStats();
        renderCRMTable(currentPage);
        if (typeof showToast === 'function') showToast('Sukses', `Pelanggan "${name}" dihapus.`, 'success');
    }

    function mergeCustomer(fromName) {
        const target = prompt('Nama pelanggan tujuan penggabungan:');
        if (!target || target === fromName) return;
        if (!Storage.getCustomers()[target]) {
            if (typeof showToast === 'function') showToast('Error', 'Pelanggan tujuan tidak ditemukan.', 'error');
            return;
        }
        if (!confirm(`Gabungkan semua transaksi "${fromName}" ke "${target}"? Data "${fromName}" akan dihapus.`)) return;
        const sales = Storage.getSales();
        sales.forEach(s => { if (s.klien === fromName) s.klien = target; });
        Storage.rebuildCustomersFromSales();
        Storage.saveAllData().then(() => {
            Storage.deleteCustomer(fromName);
            refreshCRMStats();
            renderCRMTable(currentPage);
            if (typeof showToast === 'function') showToast('Sukses', `Pelanggan digabung.`, 'success');
        });
    }

    function bulkDeleteCustomers() {
        const checks = document.querySelectorAll('.crm-checkbox:checked');
        if (checks.length === 0) return;
        const names = Array.from(checks).map(c => c.dataset.name);
        if (!confirm(`Hapus ${names.length} pelanggan terpilih?`)) return;
        names.forEach(async (n) => await Storage.deleteCustomer(n));
        refreshCRMStats();
        renderCRMTable(currentPage);
        if (typeof showToast === 'function') showToast('Sukses', `${names.length} pelanggan dihapus.`, 'success');
    }

    // ==================== SEGMENTASI ====================
    function renderSegmentView() {
        const customers = Storage.getCustomers();
        const names = Object.keys(customers);
        const days30ago = getDaysAgo(30);
        const threshold = days30ago;

        let top = 0, regular = 0, newC = 0, churn = 0, vip = 0;
        const topFive = [];

        names.forEach(name => {
            const c = customers[name];
            const total = c.totalSpent || 0;
            const trx = c.transactionCount || 0;
            const last = c.lastPurchase || '';

            if (total > 50000000) vip++;
            if (total > 10000000) top++;
            else if (total >= 2000000) regular++;
            if (trx === 1) newC++;
            if (!last || new Date(last) < new Date(threshold)) churn++;

            topFive.push({ name, total });
        });

        topFive.sort((a, b) => b.total - a.total);
        const top5 = topFive.slice(0, 5);

        if (E.crmSegTop) E.crmSegTop.textContent = top;
        if (E.crmSegRegular) E.crmSegRegular.textContent = regular;
        if (E.crmSegNew) E.crmSegNew.textContent = newC;
        if (E.crmSegChurn) E.crmSegChurn.textContent = churn;
        if (E.crmSegVIP) E.crmSegVIP.textContent = vip;

        // Tabel top 5
        if (E.crmTop5Table) {
            E.crmTop5Table.innerHTML = top5.map(c => `<tr class="border-t"><td class="p-2">${c.name}</td><td class="p-2 text-right">${formatRupiah(c.total)}</td></tr>`).join('') || '<tr><td colspan="2" class="text-center p-4 opacity-50">-</td></tr>';
        }

        // Chart segmentasi
        const ctx = E.chartCrmSegment?.getContext('2d');
        if (ctx) {
            if (segmentChartInstance) segmentChartInstance.destroy();
            segmentChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['VIP', 'Top', 'Regular', 'New', 'Churn'],
                    datasets: [{
                        data: [vip, top, regular, newC, churn],
                        backgroundColor: ['#fbbf24', '#f59e0b', '#3b82f6', '#22c55e', '#ef4444']
                    }]
                },
                options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
            });
        }
    }

    // ==================== ANALISIS ====================
    function renderCRMAnalysis() {
        const customers = Storage.getCustomers();
        const names = Object.keys(customers);
        const days30ago = getDaysAgo(30);

        // 1. Channel distribution
        const channelCount = { online: 0, offline: 0 };
        names.forEach(n => {
            const ch = customers[n].channel || 'offline';
            channelCount[ch] = (channelCount[ch] || 0) + 1;
        });
        const ctxChannel = E.chartCrmChannel?.getContext('2d');
        if (ctxChannel) {
            if (channelChartInstance) channelChartInstance.destroy();
            channelChartInstance = new Chart(ctxChannel, {
                type: 'pie',
                data: {
                    labels: ['Online', 'Offline'],
                    datasets: [{ data: [channelCount.online, channelCount.offline], backgroundColor: ['#6366f1', '#f59e0b'] }]
                },
                options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
            });
        }

        // 2. Frekuensi pembelian
        const freqBins = { '1x': 0, '2-5x': 0, '6-10x': 0, '>10x': 0 };
        names.forEach(n => {
            const trx = customers[n].transactionCount || 0;
            if (trx === 1) freqBins['1x']++;
            else if (trx <= 5) freqBins['2-5x']++;
            else if (trx <= 10) freqBins['6-10x']++;
            else freqBins['>10x']++;
        });
        const ctxFreq = E.chartCrmFrequency?.getContext('2d');
        if (ctxFreq) {
            if (frequencyChartInstance) frequencyChartInstance.destroy();
            frequencyChartInstance = new Chart(ctxFreq, {
                type: 'bar',
                data: {
                    labels: Object.keys(freqBins),
                    datasets: [{ label: 'Pelanggan', data: Object.values(freqBins), backgroundColor: '#2563eb' }]
                },
                options: { responsive: true, plugins: { legend: { display: false } } }
            });
        }

        // 3. RFM Analysis (sederhana: Recency, Frequency, Monetary)
        const rfmGroups = { 'Best': 0, 'Loyal': 0, 'At Risk': 0, 'Lost': 0 };
        names.forEach(n => {
            const c = customers[n];
            const last = new Date(c.lastPurchase || '1970-01-01');
            const daysSinceLast = Math.floor((new Date() - last) / 86400000);
            const recency = daysSinceLast < 30 ? 'high' : daysSinceLast < 90 ? 'medium' : 'low';
            const frequency = (c.transactionCount || 0) > 5 ? 'high' : (c.transactionCount || 0) > 2 ? 'medium' : 'low';
            const monetary = (c.totalSpent || 0) > 5000000 ? 'high' : (c.totalSpent || 0) > 1000000 ? 'medium' : 'low';
            if (recency === 'high' && frequency === 'high' && monetary === 'high') rfmGroups['Best']++;
            else if (recency !== 'low' && frequency !== 'low') rfmGroups['Loyal']++;
            else if (recency === 'low' && frequency !== 'low') rfmGroups['At Risk']++;
            else if (recency === 'low' && frequency === 'low') rfmGroups['Lost']++;
        });
        const ctxRFM = E.chartCrmRFM?.getContext('2d');
        if (ctxRFM) {
            if (rfmChartInstance) rfmChartInstance.destroy();
            rfmChartInstance = new Chart(ctxRFM, {
                type: 'bar',
                data: {
                    labels: Object.keys(rfmGroups),
                    datasets: [{ label: 'Pelanggan', data: Object.values(rfmGroups), backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'] }]
                },
                options: { responsive: true, plugins: { legend: { display: false } } }
            });
        }

        // 4. Loyalitas (repeat purchase rate)
        const repeatCustomers = names.filter(n => (customers[n].transactionCount || 0) > 1).length;
        const repeatRate = names.length > 0 ? ((repeatCustomers / names.length) * 100).toFixed(1) : 0;
        const churnCount = names.filter(n => !customers[n].lastPurchase || new Date(customers[n].lastPurchase) < new Date(days30ago)).length;
        const churnRate = names.length > 0 ? ((churnCount / names.length) * 100).toFixed(1) : 0;
        const totalLifetime = names.reduce((sum, n) => sum + (customers[n].totalSpent || 0), 0);
        const avgLifetime = names.length > 0 ? Math.round(totalLifetime / names.length) : 0;

        if (E.anaCrmAvgLifetime) E.anaCrmAvgLifetime.textContent = formatRupiah(avgLifetime);
        if (E.anaCrmChurnRate) E.anaCrmChurnRate.textContent = churnRate + '%';
        if (E.anaCrmRepeatRate) E.anaCrmRepeatRate.textContent = repeatRate + '%';

        // 5. Loyalty chart (by recency)
        const recencyBins = { '0-30 hari': 0, '31-90 hari': 0, '91-180 hari': 0, '>180 hari': 0 };
        names.forEach(n => {
            const last = new Date(customers[n].lastPurchase || '1970-01-01');
            const diff = Math.floor((new Date() - last) / 86400000);
            if (diff <= 30) recencyBins['0-30 hari']++;
            else if (diff <= 90) recencyBins['31-90 hari']++;
            else if (diff <= 180) recencyBins['91-180 hari']++;
            else recencyBins['>180 hari']++;
        });
        const ctxLoyalty = E.chartCrmLoyalty?.getContext('2d');
        if (ctxLoyalty) {
            if (loyaltyChartInstance) loyaltyChartInstance.destroy();
            loyaltyChartInstance = new Chart(ctxLoyalty, {
                type: 'bar',
                data: {
                    labels: Object.keys(recencyBins),
                    datasets: [{ label: 'Pelanggan', data: Object.values(recencyBins), backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'] }]
                },
                options: { responsive: true, plugins: { legend: { display: false } } }
            });
        }
    }

    // ==================== EVENT BINDING ====================
    function bindEvents() {
        if (E.applyCrmFilter) E.applyCrmFilter.addEventListener('click', () => renderCRMTable(1));
        if (E.resetCrmFilter) {
            E.resetCrmFilter.addEventListener('click', () => {
                if (E.crmSearchName) E.crmSearchName.value = '';
                if (E.crmFilterChannel) E.crmFilterChannel.value = '';
                if (E.crmFilterStatus) E.crmFilterStatus.value = '';
                if (E.crmFilterTier) E.crmFilterTier.value = '';
                renderCRMTable(1);
            });
        }
        if (E.crmLoadMore) E.crmLoadMore.addEventListener('click', () => renderCRMTable(currentPage + 1));
        if (E.crmSelectAll) E.crmSelectAll.addEventListener('change', (e) => {
            document.querySelectorAll('.crm-checkbox').forEach(c => c.checked = e.target.checked);
        });
        if (E.crmBulkDelete) E.crmBulkDelete.addEventListener('click', bulkDeleteCustomers);
        if (E.exportCrmCSV) {
            E.exportCrmCSV.addEventListener('click', () => {
                const customers = Storage.getCustomers();
                const csv = 'Nama,Total Pembelian,Transaksi,Terakhir,Channel\n' +
                    Object.entries(customers).map(([n, c]) => `"${n}",${c.totalSpent||0},${c.transactionCount||0},${c.lastPurchase||''},${c.channel||'offline'}`).join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `pelanggan_${new Date().toISOString().slice(0,10)}.csv`;
                a.click();
                if (typeof showToast === 'function') showToast('Sukses', 'CSV diunduh.', 'success');
            });
        }
    }

    // ==================== INIT ====================
    function initCRMTab() {
        cacheElements();
        setupSubTabs();
        bindEvents();
        refreshCRMStats();
        renderCRMTable(1);
    }

    // ==================== EXPORT ====================
    CFS.CRM = {
        init: initCRMTab,
        refresh: () => { refreshCRMStats(); renderCRMTable(currentPage); },
        showDetail,
        deleteCustomer,
        mergeCustomer
    };
})();
