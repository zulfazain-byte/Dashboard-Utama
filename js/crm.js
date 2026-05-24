/* ============================================================
   Cibitung Frozen ERP Ultimate v5.4 — CRM Module (Upgrade Lengkap)
   ============================================================ */
window.CFS = window.CFS || {};

(function() {
    'use strict';
    const Storage = CFS.Storage;

    // Chart instances
    let segmentChart = null, channelChart = null, frequencyChart = null;
    let currentSort = { field: 'totalSpent', order: 'desc' };

    function initCRMTab() {
        setupCRMSubTabs();
        refreshAll();
    }

    // ----- SUB TAB SWITCH -----
    function setupCRMSubTabs() {
        document.querySelectorAll('.crm-subtab-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.crm-subtab-btn').forEach(b => {
                    b.classList.remove('btn-primary', 'active');
                    b.classList.add('btn-secondary');
                });
                this.classList.add('btn-primary', 'active');
                this.classList.remove('btn-secondary');
                const tab = this.dataset.crmTab;
                document.querySelectorAll('.crm-subtab-content').forEach(c => c.classList.add('hidden'));
                const target = document.getElementById(tab);
                if (target) target.classList.remove('hidden');

                if (tab === 'crm-list') renderCRMTable();
                if (tab === 'crm-segment') renderSegmentView();
                if (tab === 'crm-analysis') renderCRMAnalysis();
            });
        });
    }

    // ----- REFRESH SEMUA -----
    function refreshAll() {
        renderCRMStats();
        renderCRMTable();
        bindCRMEvents();
        renderSegmentView();
        renderCRMAnalysis();
    }

    // ----- STATISTIK UTAMA -----
    function renderCRMStats() {
        const customers = Storage.getCustomers();
        const names = Object.keys(customers);
        const total = names.length;
        setText('crmTotalCustomers', total);

        let totalRevenue = 0;
        names.forEach(n => { totalRevenue += customers[n].totalSpent || 0; });
        setText('crmTotalRevenue', 'Rp ' + totalRevenue.toLocaleString('id-ID'));

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const threshold = thirtyDaysAgo.toISOString().split('T')[0];
        const activeCount = names.filter(n => customers[n].lastPurchase && customers[n].lastPurchase >= threshold).length;
        setText('crmActiveCustomers', activeCount);

        const avg = total > 0 ? Math.round(totalRevenue / total) : 0;
        setText('crmAvgSpent', 'Rp ' + avg.toLocaleString('id-ID'));
    }

    // ----- TABEL DAFTAR PELANGGAN -----
    function renderCRMTable(filter = {}) {
        const tbody = document.getElementById('crmTableBody');
        if (!tbody) return;
        const customers = Storage.getCustomers();
        let names = Object.keys(customers);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const threshold = thirtyDaysAgo.toISOString().split('T')[0];

        // Filter
        const searchName = (document.getElementById('crmSearchName')?.value || '').toLowerCase();
        const filterChannel = document.getElementById('crmFilterChannel')?.value || '';
        const filterStatus = document.getElementById('crmFilterStatus')?.value || '';

        if (searchName) {
            names = names.filter(n => n.toLowerCase().includes(searchName));
        }
        if (filterChannel) {
            names = names.filter(n => (customers[n].channel || 'offline') === filterChannel);
        }
        if (filterStatus) {
            names = names.filter(n => {
                const c = customers[n];
                const total = c.totalSpent || 0;
                const trx = c.transactionCount || 0;
                const last = c.lastPurchase || '';
                if (filterStatus === 'top') return total > 10000000;
                if (filterStatus === 'regular') return total >= 2000000 && total <= 10000000;
                if (filterStatus === 'new') return trx === 1;
                if (filterStatus === 'churn') return new Date(last) < thirtyDaysAgo;
                return true;
            });
        }

        // Sort
        const sorted = names.sort((a, b) => {
            const ca = customers[a], cb = customers[b];
            let va, vb;
            switch (currentSort.field) {
                case 'name': va = a; vb = b; break;
                case 'totalSpent': va = ca.totalSpent || 0; vb = cb.totalSpent || 0; break;
                case 'transactionCount': va = ca.transactionCount || 0; vb = cb.transactionCount || 0; break;
                case 'lastPurchase': va = ca.lastPurchase || ''; vb = cb.lastPurchase || ''; break;
                default: va = ca.totalSpent || 0; vb = cb.totalSpent || 0;
            }
            if (typeof va === 'string') return currentSort.order === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
            return currentSort.order === 'asc' ? va - vb : vb - va;
        });

        if (sorted.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center p-4 opacity-50">Tidak ada pelanggan.</td></tr>';
            return;
        }

        tbody.innerHTML = sorted.map(name => {
            const c = customers[name];
            const total = c.totalSpent || 0;
            const trx = c.transactionCount || 0;
            const last = c.lastPurchase || '-';
            const status = total > 10000000 ? '🏆 Top' : (total >= 2000000 ? '⭐ Regular' : (trx === 1 ? '🆕 New' : (new Date(last) < thirtyDaysAgo ? '⚠️ Churn' : '⭐ Regular')));
            return `<tr class="border-t hover:bg-slate-50 dark:hover:bg-slate-700">
                <td class="p-2 font-medium">${name}</td>
                <td class="p-2 text-right">Rp ${total.toLocaleString('id-ID')}</td>
                <td class="p-2 text-right">${trx}</td>
                <td class="p-2 text-right">${last}</td>
                <td class="p-2 text-center">${c.channel === 'online' ? '🌐' : '🏪'}</td>
                <td class="p-2 text-center"><span class="badge bg-slate-100 dark:bg-slate-700">${status}</span></td>
                <td class="p-2 text-center">
                    <button class="btn btn-xs btn-secondary" onclick="CFS.CRM.showDetail('${name}')">🔍</button>
                    <button class="btn btn-xs btn-danger" onclick="CFS.CRM.deleteCustomer('${name}')">🗑️</button>
                </td>
            </tr>`;
        }).join('');

        // Sortable headers
        document.querySelectorAll('.crm-sortable').forEach(th => {
            th.addEventListener('click', function() {
                const field = this.dataset.sort;
                if (currentSort.field === field) {
                    currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
                } else {
                    currentSort.field = field;
                    currentSort.order = 'desc';
                }
                renderCRMTable();
            });
        });
    }

    // ----- SEGMENTASI -----
    function renderSegmentView() {
        const customers = Storage.getCustomers();
        const names = Object.keys(customers);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const threshold = thirtyDaysAgo.toISOString().split('T')[0];

        let top = 0, regular = 0, newC = 0, churn = 0;
        const topFive = [];

        names.forEach(name => {
            const c = customers[name];
            const total = c.totalSpent || 0;
            const trx = c.transactionCount || 0;
            const last = c.lastPurchase || '';

            if (total > 10000000) top++;
            else if (total >= 2000000) regular++;
            if (trx === 1) newC++;
            if (!last || new Date(last) < thirtyDaysAgo) churn++;

            topFive.push({ name, total });
        });

        topFive.sort((a,b) => b.total - a.total);
        const top5 = topFive.slice(0, 5);

        setText('crmSegTop', top);
        setText('crmSegRegular', regular);
        setText('crmSegNew', newC);
        setText('crmSegChurn', churn);

        // Tabel top 5
        const top5Table = document.getElementById('crmTop5Table');
        if (top5Table) {
            top5Table.innerHTML = top5.length > 0
                ? top5.map(c => `<tr class="border-t"><td class="p-2">${c.name}</td><td class="p-2 text-right">Rp ${c.total.toLocaleString('id-ID')}</td></tr>`).join('')
                : '<tr><td colspan="2" class="text-center p-4 opacity-50">-</td></tr>';
        }

        // Grafik segmentasi
        const ctx = document.getElementById('chartCrmSegment')?.getContext('2d');
        if (ctx) {
            if (segmentChart) segmentChart.destroy();
            segmentChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Top', 'Regular', 'New', 'Churn'],
                    datasets: [{ data: [top, regular, newC, churn], backgroundColor: ['#f59e0b', '#3b82f6', '#22c55e', '#ef4444'] }]
                },
                options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
            });
        }
    }

    // ----- ANALISIS -----
    function renderCRMAnalysis() {
        const customers = Storage.getCustomers();
        const names = Object.keys(customers);

        // Channel
        const channelCount = { online: 0, offline: 0 };
        names.forEach(n => {
            const ch = customers[n].channel || 'offline';
            channelCount[ch] = (channelCount[ch] || 0) + 1;
        });

        const ctxChannel = document.getElementById('chartCrmChannel')?.getContext('2d');
        if (ctxChannel) {
            if (channelChart) channelChart.destroy();
            channelChart = new Chart(ctxChannel, {
                type: 'pie',
                data: {
                    labels: ['Online', 'Offline'],
                    datasets: [{ data: [channelCount.online, channelCount.offline], backgroundColor: ['#6366f1', '#f59e0b'] }]
                },
                options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
            });
        }

        // Frekuensi pembelian
        const freqBins = { '1x': 0, '2-5x': 0, '6-10x': 0, '>10x': 0 };
        names.forEach(n => {
            const trx = customers[n].transactionCount || 0;
            if (trx === 1) freqBins['1x']++;
            else if (trx <= 5) freqBins['2-5x']++;
            else if (trx <= 10) freqBins['6-10x']++;
            else freqBins['>10x']++;
        });

        const ctxFreq = document.getElementById('chartCrmFrequency')?.getContext('2d');
        if (ctxFreq) {
            if (frequencyChart) frequencyChart.destroy();
            frequencyChart = new Chart(ctxFreq, {
                type: 'bar',
                data: {
                    labels: Object.keys(freqBins),
                    datasets: [{ label: 'Pelanggan', data: Object.values(freqBins), backgroundColor: '#2563eb' }]
                },
                options: { responsive: true, plugins: { legend: { display: false } } }
            });
        }
    }

    // ----- AKSI -----
    function showDetail(name) {
        if (typeof switchTab === 'function') switchTab('tab-crm-detail');
        setTimeout(() => {
            const input = document.getElementById('customerFullName');
            if (input) { input.value = name; input.focus(); }
        }, 200);
    }

    async function deleteCustomer(name) {
        if (!confirm(`Hapus pelanggan ${name}? Data transaksi tetap aman.`)) return;
        await Storage.deleteCustomer(name);
        refreshAll();
        if (typeof showToast === 'function') showToast('Sukses', 'Pelanggan dihapus.', 'success');
    }

    // ----- EVENT BINDING -----
    function bindCRMEvents() {
        // Pencarian real‑time
        const searchInput = document.getElementById('crmSearchName');
        if (searchInput) {
            searchInput.addEventListener('input', debounce(renderCRMTable, 300));
        }
        document.getElementById('applyCrmFilter')?.addEventListener('click', renderCRMTable);
        document.getElementById('exportCrmCSV')?.addEventListener('click', exportCSV);
    }

    function exportCSV() {
        const customers = Storage.getCustomers();
        const csv = 'Nama,Total Pembelian,Transaksi,Terakhir,Channel\n' +
            Object.entries(customers).map(([n,c]) => `"${n}",${c.totalSpent||0},${c.transactionCount||0},${c.lastPurchase||''},${c.channel||'offline'}`).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `pelanggan_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        showToast?.('Sukses', 'CSV diunduh.', 'success');
    }

    // ----- UTILS -----
    function setText(id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    function debounce(fn, delay) {
        let timer;
        return function(...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    // Expose
    CFS.CRM = {
        init: initCRMTab,
        showDetail,
        deleteCustomer,
        refreshAll
    };
})();
