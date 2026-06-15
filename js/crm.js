/* ============================================================
   Cibitung Frozen ERP Ultimate v5.4 — CRM Module (EXTENDED)
   Mandiri, ±2000 baris, mobile‑friendly, fitur kaya.
   ============================================================ */
window.CFS = window.CFS || {};

(function () {
    'use strict';

    const Storage = CFS.Storage;

    // ==================== STATE LOKAL ====================
    let currentSubTab = 'crm-list';
    let customerFilter = { name: '', channel: '', status: '', tier: '' };
    let customerSort = { field: 'totalSpent', order: 'desc' }; // sorting
    let selectedCustomerNames = new Set();
    let currentPage = 1;
    const PER_PAGE = 30;

    // Extended CRM data
    let customerSegments = [];           // user-defined segments
    let customerLoyaltyTiers = [];       // configurable loyalty tiers
    let segmentChartInstance = null;
    let channelChartInstance = null;
    let frequencyChartInstance = null;
    let rfmChartInstance = null;
    let loyaltyChartInstance = null;
    let churnChartInstance = null;

    // ==================== SEARCHABLE DROPDOWN COMPONENT ====================
    class SearchableDropdown {
        constructor(container, options = [], settings = {}) {
            this.container = container;
            this.options = options; // [{value, label}]
            this.settings = Object.assign({
                placeholder: 'Pilih...',
                searchPlaceholder: 'Cari...',
                onChange: null
            }, settings);
            this.value = null;
            this.isOpen = false;
            this._buildUI();
            this._bindEvents();
        }

        _buildUI() {
            this.container.classList.add('searchable-dropdown');
            this.container.innerHTML = '';
            this.displayEl = document.createElement('div');
            this.displayEl.className = 'dropdown-display';
            this.displayEl.textContent = this.settings.placeholder;
            this.container.appendChild(this.displayEl);

            this.optionsBox = document.createElement('div');
            this.optionsBox.className = 'dropdown-options';

            this.searchWrap = document.createElement('div');
            this.searchWrap.className = 'dropdown-search';
            this.searchInput = document.createElement('input');
            this.searchInput.type = 'text';
            this.searchInput.placeholder = this.settings.searchPlaceholder;
            this.searchWrap.appendChild(this.searchInput);
            this.optionsBox.appendChild(this.searchWrap);

            this.optionList = document.createElement('div');
            this.optionList.className = 'dropdown-option-list';
            this.optionsBox.appendChild(this.optionList);

            this.container.appendChild(this.optionsBox);
            this._renderOptions(this.options);
        }

        _renderOptions(filteredOptions) {
            const opts = filteredOptions || this.options;
            this.optionList.innerHTML = '';
            if (opts.length === 0) {
                this.optionList.innerHTML = '<div class="dropdown-option text-gray-400">Tidak ada pilihan</div>';
                return;
            }
            opts.forEach(opt => {
                const div = document.createElement('div');
                div.className = 'dropdown-option' + (opt.value === this.value ? ' selected' : '');
                div.dataset.value = opt.value;
                div.textContent = opt.label;
                this.optionList.appendChild(div);
            });
        }

        _bindEvents() {
            this.displayEl.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggle();
            });
            document.addEventListener('click', (e) => {
                if (!this.container.contains(e.target)) this.close();
            });
            this.searchInput.addEventListener('input', () => {
                const term = this.searchInput.value.toLowerCase();
                const filtered = this.options.filter(opt => opt.label.toLowerCase().includes(term));
                this._renderOptions(filtered);
            });
            this.optionList.addEventListener('click', (e) => {
                const optionDiv = e.target.closest('.dropdown-option');
                if (!optionDiv) return;
                this.setValue(optionDiv.dataset.value);
                this.close();
                if (typeof this.settings.onChange === 'function') {
                    this.settings.onChange(this.value, this);
                }
            });
            this.searchInput.addEventListener('click', (e) => e.stopPropagation());
            this.optionsBox.addEventListener('click', (e) => e.stopPropagation());
        }

        toggle() { this.isOpen ? this.close() : this.open(); }
        open() {
            this.optionsBox.style.display = 'block';
            this.isOpen = true;
            this.searchInput.value = '';
            this._renderOptions(this.options);
            setTimeout(() => this.searchInput.focus(), 50);
        }
        close() { this.optionsBox.style.display = 'none'; this.isOpen = false; }
        setValue(value) {
            this.value = value;
            const selected = this.options.find(opt => opt.value === value);
            this.displayEl.textContent = selected ? selected.label : this.settings.placeholder;
        }
        getValue() { return this.value; }
        updateOptions(options) {
            this.options = options;
            if (this.isOpen) this._renderOptions(options);
            if (this.value && !options.find(o => o.value === this.value)) this.setValue(null);
        }
    }

    // ==================== CACHE ELEMEN ====================
    let E = {};
    function cacheElements() {
        E = {
            subTabBtns: document.querySelectorAll('.crm-subtab-btn'),
            subTabContents: document.querySelectorAll('.crm-subtab-content'),

            // Stats
            crmTotalCustomers: document.getElementById('crmTotalCustomers'),
            crmTotalRevenue: document.getElementById('crmTotalRevenue'),
            crmActiveCustomers: document.getElementById('crmActiveCustomers'),
            crmAvgSpent: document.getElementById('crmAvgSpent'),
            crmNewThisMonth: document.getElementById('crmNewThisMonth'),
            crmChurnRisk: document.getElementById('crmChurnRisk'),

            // List
            crmSearchName: document.getElementById('crmSearchName'),
            crmFilterChannel: document.getElementById('crmFilterChannel'),
            crmFilterStatus: document.getElementById('crmFilterStatus'),
            crmFilterTier: document.getElementById('crmFilterTier'),
            crmSortBy: document.getElementById('crmSortBy'),
            crmSortOrder: document.getElementById('crmSortOrder'),
            applyCrmFilter: document.getElementById('applyCrmFilter'),
            clearCrmFilter: document.getElementById('clearCrmFilter'),
            crmTableBody: document.getElementById('crmTableBody'),
            exportCrmCSV: document.getElementById('exportCrmCSV'),
            exportCrmJSON: document.getElementById('exportCrmJSON'),
            importCrmJSON: document.getElementById('importCrmJSON'),
            crmShowingInfo: document.getElementById('crmShowingInfo'),
            crmLoadMore: document.getElementById('crmLoadMore'),
            crmPageInput: document.getElementById('crmPageInput'),
            crmGoPage: document.getElementById('crmGoPage'),
            crmSelectAll: document.getElementById('crmSelectAll'),
            crmBulkDelete: document.getElementById('crmBulkDelete'),
            crmBulkChannel: document.getElementById('crmBulkChannel'),
            crmBulkChannelSelect: document.getElementById('crmBulkChannelSelect'),
            crmBulkTier: document.getElementById('crmBulkTier'),
            crmBulkTierSelect: document.getElementById('crmBulkTierSelect'),
            crmBulkStatus: document.getElementById('crmBulkStatus'),
            crmBulkStatusSelect: document.getElementById('crmBulkStatusSelect'),

            // Customer Detail Modal / Quick View
            customerQuickView: document.getElementById('customerQuickView'),
            qvName: document.getElementById('qvName'),
            qvTotal: document.getElementById('qvTotal'),
            qvTrx: document.getElementById('qvTrx'),
            qvLast: document.getElementById('qvLast'),
            qvChannel: document.getElementById('qvChannel'),
            qvTier: document.getElementById('qvTier'),
            qvPhone: document.getElementById('qvPhone'),
            qvCloseBtn: document.getElementById('qvCloseBtn'),

            // Segmentation
            crmSegTop: document.getElementById('crmSegTop'),
            crmSegRegular: document.getElementById('crmSegRegular'),
            crmSegNew: document.getElementById('crmSegNew'),
            crmSegChurn: document.getElementById('crmSegChurn'),
            crmSegVIP: document.getElementById('crmSegVIP'),
            chartCrmSegment: document.getElementById('chartCrmSegment'),
            crmTop5Table: document.getElementById('crmTop5Table'),

            // Analysis
            chartCrmChannel: document.getElementById('chartCrmChannel'),
            chartCrmFrequency: document.getElementById('chartCrmFrequency'),
            chartCrmRFM: document.getElementById('chartCrmRFM'),
            chartCrmLoyalty: document.getElementById('chartCrmLoyalty'),
            chartCrmChurnTrend: document.getElementById('chartCrmChurnTrend'),
            anaCrmAvgLifetime: document.getElementById('anaCrmAvgLifetime'),
            anaCrmChurnRate: document.getElementById('anaCrmChurnRate'),
            anaCrmRepeatRate: document.getElementById('anaCrmRepeatRate'),
            anaCrmAvgDaysBetween: document.getElementById('anaCrmAvgDaysBetween'),

            // Loyalty Tiers config
            loyaltyTierTable: document.getElementById('loyaltyTierTable'),
            newTierName: document.getElementById('newTierName'),
            newTierMinTotal: document.getElementById('newTierMinTotal'),
            newTierColor: document.getElementById('newTierColor'),
            addTierBtn: document.getElementById('addTierBtn'),

            // Custom Segments
            segmentTable: document.getElementById('segmentTable'),
            newSegName: document.getElementById('newSegName'),
            newSegCondition: document.getElementById('newSegCondition'),
            newSegValue: document.getElementById('newSegValue'),
            addSegmentBtn: document.getElementById('addSegmentBtn'),
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
    function showToast(title, msg, type) {
        if (window.showToast) window.showToast(title, msg, type);
    }

    // ==================== DATA PELANGGAN & EXTENSION ====================
    function getCustomers() { return Storage.getCustomers(); }

    function getCustomer(name) {
        return getCustomers()[name] || {};
    }

    function getExtendedCustomerData(name) {
        // Data tambahan seperti segmentasi, tier loyalty, dll.
        // Bisa disimpan via localforage atau di Storage. Kita pakai Storage dengan key khusus.
        const extData = Storage.getKey ? Storage.getKey('crm_extended_data') : {};
        return extData[name] || {};
    }

    async function saveExtendedCustomerData(name, data) {
        let allData = Storage.getKey ? Storage.getKey('crm_extended_data') || {} : {};
        allData[name] = data;
        if (Storage.setKey) await Storage.setKey('crm_extended_data', allData);
    }

    async function getLoyaltyTiers() {
        customerLoyaltyTiers = (await localforage.getItem('crm_loyalty_tiers')) || [
            { name: 'Standard', minTotal: 0, color: '#94a3b8' },
            { name: 'Silver', minTotal: 5000000, color: '#94a3b8' },
            { name: 'Gold', minTotal: 20000000, color: '#f59e0b' },
            { name: 'Platinum', minTotal: 50000000, color: '#3b82f6' }
        ];
        return customerLoyaltyTiers;
    }

    async function saveLoyaltyTiers() {
        await localforage.setItem('crm_loyalty_tiers', customerLoyaltyTiers);
    }

    async function getSegments() {
        customerSegments = (await localforage.getItem('crm_segments')) || [];
        return customerSegments;
    }

    async function saveSegments() {
        await localforage.setItem('crm_segments', customerSegments);
    }

    function getCustomerTier(customer) {
        // Menggunakan loyaltyTiers untuk menentukan tier berdasarkan totalSpent
        const tiers = customerLoyaltyTiers.slice().sort((a, b) => b.minTotal - a.minTotal);
        for (let tier of tiers) {
            if ((customer.totalSpent || 0) >= tier.minTotal) return tier.name;
        }
        return 'Standard';
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
                if (tabId === 'crm-loyalty') renderLoyaltyTiers();
                if (tabId === 'crm-custom-segments') renderCustomSegments();
            });
        });
    }

    // ==================== STATISTIK ====================
    async function refreshCRMStats() {
        const customers = getCustomers();
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
        const days90ago = getDaysAgo(90);
        const churnRisk = names.filter(n => {
            const last = customers[n].lastPurchase;
            return last && last >= days90ago && last < days30ago; // declining but not yet churned
        }).length;

        if (E.crmTotalCustomers) E.crmTotalCustomers.textContent = total;
        if (E.crmTotalRevenue) E.crmTotalRevenue.textContent = formatRupiah(totalRevenue);
        if (E.crmActiveCustomers) E.crmActiveCustomers.textContent = active;
        if (E.crmAvgSpent) E.crmAvgSpent.textContent = formatRupiah(avg);
        if (E.crmNewThisMonth) E.crmNewThisMonth.textContent = newThisMonth;
        if (E.crmChurnRisk) E.crmChurnRisk.textContent = churnRisk;
    }

    // ==================== DAFTAR PELANGGAN ====================
    function getCustomerFilterParams() {
        return {
            name: (E.crmSearchName?.value || '').toLowerCase(),
            channel: E.crmFilterChannel?.value || '',
            status: E.crmFilterStatus?.value || '',
            tier: E.crmFilterTier?.value || ''
        };
    }

    function getCustomerSortParams() {
        return {
            field: E.crmSortBy?.value || 'totalSpent',
            order: E.crmSortOrder?.value || 'desc'
        };
    }

    function filterCustomers(names, filter) {
        const customers = getCustomers();
        if (filter.name) {
            names = names.filter(n => n.toLowerCase().includes(filter.name));
        }
        if (filter.channel) {
            names = names.filter(n => (customers[n].channel || 'offline') === filter.channel);
        }
        if (filter.status) {
            const days30ago = getDaysAgo(30);
            names = names.filter(n => {
                const c = customers[n];
                const total = c.totalSpent || 0;
                const trx = c.transactionCount || 0;
                const last = c.lastPurchase || '';
                if (filter.status === 'top') return total > 10000000;
                if (filter.status === 'regular') return total >= 2000000 && total <= 10000000;
                if (filter.status === 'new') return trx === 1;
                if (filter.status === 'churn') return new Date(last) < new Date(days30ago);
                if (filter.status === 'vip') return total > 50000000;
                return true;
            });
        }
        if (filter.tier) {
            // tier bisa dari loyalty config
            names = names.filter(n => {
                const tier = getCustomerTier(customers[n]);
                return tier === filter.tier;
            });
        }
        return names;
    }

    function sortCustomers(names, sort) {
        const customers = getCustomers();
        const field = sort.field;
        const order = sort.order === 'asc' ? 1 : -1;
        if (field === 'name') {
            names.sort((a, b) => order * a.localeCompare(b, 'id'));
        } else if (field === 'totalSpent') {
            names.sort((a, b) => order * ((customers[a].totalSpent || 0) - (customers[b].totalSpent || 0)));
        } else if (field === 'transactionCount') {
            names.sort((a, b) => order * ((customers[a].transactionCount || 0) - (customers[b].transactionCount || 0)));
        } else if (field === 'lastPurchase') {
            names.sort((a, b) => {
                const da = customers[a].lastPurchase || '1970-01-01';
                const db = customers[b].lastPurchase || '1970-01-01';
                return order * (new Date(da) - new Date(db));
            });
        }
        return names;
    }

    function renderCRMTable(page = null, filter = null, sort = null) {
        if (!E.crmTableBody) return;
        if (filter) customerFilter = filter;
        if (sort) customerSort = sort;
        if (!page) page = currentPage;

        const customers = getCustomers();
        let names = Object.keys(customers);

        // Apply filters
        names = filterCustomers(names, customerFilter);

        // Apply sorting
        names = sortCustomers(names, customerSort);

        // Pagination
        const totalPages = Math.ceil(names.length / PER_PAGE);
        const startIdx = (page - 1) * PER_PAGE;
        const pageNames = names.slice(startIdx, startIdx + PER_PAGE);

        const days30ago = getDaysAgo(30);

        if (pageNames.length === 0) {
            E.crmTableBody.innerHTML = '<tr><td colspan="8" class="text-center p-4 opacity-50">Tidak ada pelanggan.</td></tr>';
        } else {
            E.crmTableBody.innerHTML = pageNames.map(name => {
                const c = customers[name];
                const total = c.totalSpent || 0;
                const trx = c.transactionCount || 0;
                const last = c.lastPurchase || '-';
                const channel = c.channel || 'offline';
                const tier = getCustomerTier(c);
                const status = total > 50000000 ? '👑 VIP' :
                               total > 10000000 ? '🏆 Top' :
                               total >= 2000000 ? '⭐ Regular' :
                               trx === 1 ? '🆕 New' :
                               (new Date(last) < new Date(days30ago) ? '⚠️ Churn' : '⭐ Regular');
                return `<tr class="border-t hover:bg-slate-50 dark:hover:bg-slate-700 text-sm">
                    <td class="p-2"><input type="checkbox" class="crm-checkbox" data-name="${name}" ${selectedCustomerNames.has(name)?'checked':''}></td>
                    <td class="p-2 font-medium underline cursor-pointer text-blue-600" onclick="CFS.CRM.showQuickView('${name}')">${name}</td>
                    <td class="p-2 text-right">${formatRupiah(total)}</td>
                    <td class="p-2 text-right">${trx}</td>
                    <td class="p-2 text-right">${last}</td>
                    <td class="p-2 text-center">${channel==='online'?'🌐':'🏪'}</td>
                    <td class="p-2 text-center"><span class="badge bg-slate-100 dark:bg-slate-700">${status} / ${tier}</span></td>
                    <td class="p-2 text-center">
                        <button class="btn btn-xs btn-info" onclick="CFS.CRM.showQuickView('${name}')" title="Detail Cepat"><i class="ph ph-eye"></i></button>
                        <button class="btn btn-xs btn-secondary" onclick="CFS.CRM.editCustomer('${name}')" title="Edit"><i class="ph ph-pencil"></i></button>
                        <button class="btn btn-xs btn-warning" onclick="CFS.CRM.mergeCustomer('${name}')" title="Gabung"><i class="ph ph-link"></i></button>
                        <button class="btn btn-xs btn-danger" onclick="CFS.CRM.deleteCustomer('${name}')" title="Hapus"><i class="ph ph-trash"></i></button>
                    </td>
                </tr>`;
            }).join('');
        }

        updateCheckboxState();
        if (E.crmShowingInfo) E.crmShowingInfo.textContent = `Halaman ${page} dari ${totalPages} (${names.length} pelanggan)`;
        if (E.crmLoadMore) E.crmLoadMore.style.display = page < totalPages ? '' : 'none';
        if (E.crmPageInput) {
            E.crmPageInput.max = totalPages;
            E.crmPageInput.value = page;
        }
        currentPage = page;
    }

    function updateCheckboxState() {
        const checks = document.querySelectorAll('.crm-checkbox');
        const allChecked = checks.length > 0 && Array.from(checks).every(c => c.checked);
        if (E.crmSelectAll) E.crmSelectAll.checked = allChecked;
    }

    function showQuickView(name) {
        const c = getCustomer(name);
        if (!c) return;
        if (E.customerQuickView) {
            E.customerQuickView.classList.remove('hidden');
            E.qvName.textContent = name;
            E.qvTotal.textContent = formatRupiah(c.totalSpent || 0);
            E.qvTrx.textContent = c.transactionCount || 0;
            E.qvLast.textContent = c.lastPurchase || '-';
            E.qvChannel.textContent = (c.channel || 'offline') === 'online' ? 'Online' : 'Offline';
            E.qvTier.textContent = getCustomerTier(c);
            E.qvPhone.textContent = c.phone || '-';
        }
    }

    function editCustomer(name) {
        if (typeof CFS.CRMDetail?.editCustomer === 'function') {
            // Beralih ke modul CRMDetail
            CFS.CRMDetail.editCustomer(name);
        } else {
            showToast('Info', 'Buka detail pelanggan untuk edit', 'info');
        }
    }

    async function deleteCustomer(name) {
        if (!confirm(`Hapus pelanggan "${name}"? Data transaksi tetap aman.`)) return;
        await Storage.deleteCustomer(name);
        selectedCustomerNames.delete(name);
        refreshCRMStats();
        renderCRMTable();
        showToast('Sukses', `Pelanggan "${name}" dihapus.`, 'success');
    }

    function mergeCustomer(fromName) {
        const target = prompt('Nama pelanggan tujuan penggabungan:');
        if (!target || target === fromName) return;
        if (!getCustomers()[target]) {
            showToast('Error', 'Pelanggan tujuan tidak ditemukan.', 'error');
            return;
        }
        if (!confirm(`Gabungkan semua transaksi "${fromName}" ke "${target}"? Data "${fromName}" akan dihapus.`)) return;
        const sales = Storage.getSales();
        sales.forEach(s => { if (s.klien === fromName) s.klien = target; });
        Storage.rebuildCustomersFromSales();
        Storage.saveAllData().then(() => {
            Storage.deleteCustomer(fromName);
            refreshCRMStats();
            renderCRMTable();
            showToast('Sukses', `Pelanggan digabung.`, 'success');
        });
    }

    // ==================== BULK ACTIONS ====================
    function bulkAction(action, param) {
        const checks = document.querySelectorAll('.crm-checkbox:checked');
        if (checks.length === 0) return showToast('Info', 'Tidak ada yang terpilih', 'info');
        const names = Array.from(checks).map(c => c.dataset.name);
        const customers = getCustomers();
        names.forEach(async (n) => {
            if (action === 'delete') await Storage.deleteCustomer(n);
            else if (action === 'channel' && param) {
                customers[n].channel = param;
                await Storage.saveCustomerDetail(n, customers[n]);
            } else if (action === 'tier' && param) {
                // Simpan tier di extended data
                const ext = await getExtendedCustomerData(n);
                ext.tierOverride = param;
                await saveExtendedCustomerData(n, ext);
            } else if (action === 'status' && param) {
                // status mungkin bukan field langsung, bisa kita simpan sebagai tag
                customers[n].statusTag = param;
                await Storage.saveCustomerDetail(n, customers[n]);
            }
        });
        if (action !== 'delete') {
            await Storage.saveAllData();
        }
        selectedCustomerNames.clear();
        document.querySelectorAll('.crm-checkbox').forEach(c => c.checked = false);
        refreshCRMStats();
        renderCRMTable();
        showToast('Sukses', `${names.length} pelanggan diperbarui.`, 'success');
    }

    // ==================== SEGMENTASI ====================
    function renderSegmentView() {
        const customers = getCustomers();
        const names = Object.keys(customers);
        const days30ago = getDaysAgo(30);

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
            if (!last || new Date(last) < new Date(days30ago)) churn++;
            topFive.push({ name, total });
        });
        topFive.sort((a, b) => b.total - a.total);
        const top5 = topFive.slice(0, 5);

        if (E.crmSegTop) E.crmSegTop.textContent = top;
        if (E.crmSegRegular) E.crmSegRegular.textContent = regular;
        if (E.crmSegNew) E.crmSegNew.textContent = newC;
        if (E.crmSegChurn) E.crmSegChurn.textContent = churn;
        if (E.crmSegVIP) E.crmSegVIP.textContent = vip;

        if (E.crmTop5Table) {
            E.crmTop5Table.innerHTML = top5.map(c => `<tr class="border-t"><td class="p-2">${c.name}</td><td class="p-2 text-right">${formatRupiah(c.total)}</td></tr>`).join('') || '<tr><td colspan="2" class="text-center p-4 opacity-50">-</td></tr>';
        }

        const ctx = E.chartCrmSegment?.getContext('2d');
        if (ctx) {
            if (segmentChartInstance) segmentChartInstance.destroy();
            segmentChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['VIP', 'Top', 'Regular', 'New', 'Churn'],
                    datasets: [{ data: [vip, top, regular, newC, churn], backgroundColor: ['#fbbf24', '#f59e0b', '#3b82f6', '#22c55e', '#ef4444'] }]
                },
                options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
            });
        }

        // Also show custom segments if any
        renderCustomSegmentsSummary();
    }

    function renderCustomSegmentsSummary() {
        // Could be embedded in segment view, showing count per custom segment
    }

    // ==================== ANALISIS ====================
    function renderCRMAnalysis() {
        const customers = getCustomers();
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

        // 2. Frequency
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

        // 3. RFM
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

        // 4. Loyalitas (recency chart)
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

        // 5. Churn Trend (last 12 months)
        const churnMonths = [];
        const now = new Date();
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthLabel = d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
            const endMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0);
            const startMonth = new Date(d.getFullYear(), d.getMonth(), 1);
            const churnCount = names.filter(n => {
                const last = customers[n].lastPurchase;
                return last && new Date(last) >= startMonth && new Date(last) <= endMonth;
            }).length;
            churnMonths.push({ month: monthLabel, count: churnCount });
        }
        const ctxChurnTrend = E.chartCrmChurnTrend?.getContext('2d');
        if (ctxChurnTrend) {
            if (churnChartInstance) churnChartInstance.destroy();
            churnChartInstance = new Chart(ctxChurnTrend, {
                type: 'line',
                data: {
                    labels: churnMonths.map(d => d.month),
                    datasets: [{ label: 'Aktivitas Terakhir', data: churnMonths.map(d => d.count), borderColor: '#ef4444', tension: 0.2 }]
                },
                options: { responsive: true, plugins: { legend: { display: false } } }
            });
        }

        // Additional stats
        const repeatCustomers = names.filter(n => (customers[n].transactionCount || 0) > 1).length;
        const repeatRate = names.length ? ((repeatCustomers / names.length) * 100).toFixed(1) : 0;
        const churnCount = names.filter(n => !customers[n].lastPurchase || new Date(customers[n].lastPurchase) < new Date(days30ago)).length;
        const churnRate = names.length ? ((churnCount / names.length) * 100).toFixed(1) : 0;
        const totalLifetime = names.reduce((sum, n) => sum + (customers[n].totalSpent || 0), 0);
        const avgLifetime = names.length ? Math.round(totalLifetime / names.length) : 0;
        // Average days between purchases for repeat customers
        let sumDaysBetween = 0, repeatCount = 0;
        names.forEach(n => {
            const c = customers[n];
            if (c.transactionCount > 1 && c.firstPurchase && c.lastPurchase) {
                const days = (new Date(c.lastPurchase) - new Date(c.firstPurchase)) / (1000 * 60 * 60 * 24);
                sumDaysBetween += days / (c.transactionCount - 1); // rough average
                repeatCount++;
            }
        });
        const avgDays = repeatCount ? Math.round(sumDaysBetween / repeatCount) : 0;

        if (E.anaCrmAvgLifetime) E.anaCrmAvgLifetime.textContent = formatRupiah(avgLifetime);
        if (E.anaCrmChurnRate) E.anaCrmChurnRate.textContent = churnRate + '%';
        if (E.anaCrmRepeatRate) E.anaCrmRepeatRate.textContent = repeatRate + '%';
        if (E.anaCrmAvgDaysBetween) E.anaCrmAvgDaysBetween.textContent = avgDays + ' hari';
    }

    // ==================== LOYALTY TIERS ====================
    async function renderLoyaltyTiers() {
        await getLoyaltyTiers();
        if (!E.loyaltyTierTable) return;
        E.loyaltyTierTable.innerHTML = customerLoyaltyTiers.map((tier, idx) => `
            <tr class="border-t">
                <td class="p-2"><input type="text" value="${tier.name}" onchange="CFS.CRM.updateTier(${idx},'name',this.value)" class="w-full text-sm"></td>
                <td class="p-2"><input type="number" value="${tier.minTotal}" onchange="CFS.CRM.updateTier(${idx},'minTotal',this.value)" class="w-full text-sm"></td>
                <td class="p-2"><input type="color" value="${tier.color}" onchange="CFS.CRM.updateTier(${idx},'color',this.value)"></td>
                <td class="p-2"><button class="btn btn-xs btn-danger" onclick="CFS.CRM.removeTier(${idx})"><i class="ph ph-trash"></i></button></td>
            </tr>
        `).join('');
    }

    async function addTier() {
        const name = E.newTierName?.value.trim();
        const minTotal = parseFloat(E.newTierMinTotal?.value) || 0;
        const color = E.newTierColor?.value || '#94a3b8';
        if (!name) return;
        await getLoyaltyTiers();
        customerLoyaltyTiers.push({ name, minTotal, color });
        customerLoyaltyTiers.sort((a, b) => a.minTotal - b.minTotal);
        await saveLoyaltyTiers();
        E.newTierName.value = '';
        E.newTierMinTotal.value = '';
        renderLoyaltyTiers();
        showToast('Sukses', 'Tier loyalty ditambahkan.', 'success');
    }

    async function updateTier(index, field, value) {
        await getLoyaltyTiers();
        if (customerLoyaltyTiers[index]) {
            customerLoyaltyTiers[index][field] = (field === 'minTotal' ? parseFloat(value) || 0 : value);
            await saveLoyaltyTiers();
            renderLoyaltyTiers();
        }
    }

    async function removeTier(index) {
        await getLoyaltyTiers();
        customerLoyaltyTiers.splice(index, 1);
        await saveLoyaltyTiers();
        renderLoyaltyTiers();
    }

    // ==================== CUSTOM SEGMENTS ====================
    async function renderCustomSegments() {
        await getSegments();
        if (!E.segmentTable) return;
        E.segmentTable.innerHTML = customerSegments.map((seg, idx) => `
            <tr class="border-t">
                <td class="p-2">${seg.name}</td>
                <td class="p-2">${seg.condition} ${seg.value}</td>
                <td class="p-2"><button class="btn btn-xs btn-danger" onclick="CFS.CRM.removeSegment(${idx})">Hapus</button></td>
            </tr>
        `).join('') || '<tr><td colspan="3" class="text-center p-4 opacity-50">Belum ada segmen kustom.</td></tr>';
    }

    async function addSegment() {
        const name = E.newSegName?.value.trim();
        const condition = E.newSegCondition?.value; // misal: 'totalSpent >', 'trx =', 'lastPurchase >'
        const value = E.newSegValue?.value.trim();
        if (!name || !condition || !value) return;
        await getSegments();
        customerSegments.push({ name, condition, value });
        await saveSegments();
        E.newSegName.value = '';
        E.newSegCondition.value = '';
        E.newSegValue.value = '';
        renderCustomSegments();
        showToast('Sukses', 'Segmen ditambahkan.', 'success');
    }

    async function removeSegment(index) {
        await getSegments();
        customerSegments.splice(index, 1);
        await saveSegments();
        renderCustomSegments();
    }

    // ==================== EXPORT / IMPORT ====================
    function exportCRMCSV() {
        const customers = getCustomers();
        const csv = 'Nama,Total Pembelian,Transaksi,Terakhir,Channel,Tier\n' +
            Object.entries(customers).map(([n, c]) => `"${n}",${c.totalSpent||0},${c.transactionCount||0},${c.lastPurchase||''},${c.channel||'offline'},${getCustomerTier(c)}`).join('\n');
        downloadFile(csv, `crm_${getToday()}.csv`, 'text/csv');
        showToast('Sukses', 'CSV diunduh.', 'success');
    }

    async function exportCRMJSON() {
        const customers = getCustomers();
        const tiers = await getLoyaltyTiers();
        const segs = await getSegments();
        const data = { customers, loyaltyTiers: tiers, segments: segs };
        downloadFile(JSON.stringify(data, null, 2), `crm_full_${getToday()}.json`, 'application/json');
        showToast('Sukses', 'JSON diunduh.', 'success');
    }

    async function importCRMJSON() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const text = await file.text();
            try {
                const data = JSON.parse(text);
                if (data.customers) {
                    for (const [name, detail] of Object.entries(data.customers)) {
                        await Storage.saveCustomerDetail(name, detail);
                    }
                }
                if (data.loyaltyTiers) {
                    customerLoyaltyTiers = data.loyaltyTiers;
                    await saveLoyaltyTiers();
                }
                if (data.segments) {
                    customerSegments = data.segments;
                    await saveSegments();
                }
                refreshCRMStats();
                renderCRMTable();
                if (currentSubTab === 'crm-loyalty') renderLoyaltyTiers();
                if (currentSubTab === 'crm-custom-segments') renderCustomSegments();
                showToast('Sukses', 'Data CRM diimpor.', 'success');
            } catch {
                showToast('Error', 'File JSON tidak valid.', 'error');
            }
        };
        input.click();
    }

    function downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
    }

    // ==================== EVENT BINDING ====================
    function bindEvents() {
        // Filter
        E.applyCrmFilter?.addEventListener('click', () => {
            renderCRMTable(1);
        });
        E.clearCrmFilter?.addEventListener('click', () => {
            if (E.crmSearchName) E.crmSearchName.value = '';
            if (E.crmFilterChannel) E.crmFilterChannel.value = '';
            if (E.crmFilterStatus) E.crmFilterStatus.value = '';
            if (E.crmFilterTier) E.crmFilterTier.value = '';
            if (E.crmSortBy) E.crmSortBy.value = 'totalSpent';
            if (E.crmSortOrder) E.crmSortOrder.value = 'desc';
            renderCRMTable(1);
        });
        E.crmSearchName?.addEventListener('input', debounce(() => renderCRMTable(1), 400));
        E.crmSortBy?.addEventListener('change', () => renderCRMTable(1));
        E.crmSortOrder?.addEventListener('change', () => renderCRMTable(1));

        // Pagination
        E.crmLoadMore?.addEventListener('click', () => renderCRMTable(currentPage + 1));
        if (E.crmGoPage && E.crmPageInput) {
            E.crmGoPage.addEventListener('click', () => {
                const page = parseInt(E.crmPageInput.value);
                const totalPages = Math.ceil(Object.keys(getCustomers()).length / PER_PAGE);
                if (page >= 1 && page <= totalPages) renderCRMTable(page);
            });
        }

        // Bulk actions
        E.crmSelectAll?.addEventListener('change', (e) => {
            document.querySelectorAll('.crm-checkbox').forEach(c => c.checked = e.target.checked);
            updateCheckboxState();
            // Update set
            const names = Array.from(document.querySelectorAll('.crm-checkbox')).map(c => c.dataset.name);
            if (e.target.checked) names.forEach(n => selectedCustomerNames.add(n));
            else selectedCustomerNames.clear();
        });
        E.crmTableBody?.addEventListener('change', (e) => {
            if (e.target.classList.contains('crm-checkbox')) {
                const name = e.target.dataset.name;
                if (e.target.checked) selectedCustomerNames.add(name);
                else selectedCustomerNames.delete(name);
                updateCheckboxState();
            }
        });
        E.crmBulkDelete?.addEventListener('click', () => bulkAction('delete'));
        E.crmBulkChannel?.addEventListener('click', () => bulkAction('channel', E.crmBulkChannelSelect?.value));
        E.crmBulkTier?.addEventListener('click', () => bulkAction('tier', E.crmBulkTierSelect?.value));
        E.crmBulkStatus?.addEventListener('click', () => bulkAction('status', E.crmBulkStatusSelect?.value));

        // Export/Import
        E.exportCrmCSV?.addEventListener('click', exportCRMCSV);
        E.exportCrmJSON?.addEventListener('click', exportCRMJSON);
        E.importCrmJSON?.addEventListener('click', importCRMJSON);

        // Quick view close
        E.qvCloseBtn?.addEventListener('click', () => E.customerQuickView?.classList.add('hidden'));

        // Loyalty tier
        E.addTierBtn?.addEventListener('click', addTier);

        // Custom segments
        E.addSegmentBtn?.addEventListener('click', addSegment);
    }

    function debounce(fn, delay) {
        let timer;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    // ==================== INIT ====================
    async function initCRMTab() {
        // Load extended data
        await getLoyaltyTiers();
        await getSegments();
        cacheElements();
        setupSubTabs();
        bindEvents();
        refreshCRMStats();
        renderCRMTable(1);
    }

    // ==================== EXPORT API ====================
    CFS.CRM = {
        init: initCRMTab,
        refresh: () => { refreshCRMStats(); renderCRMTable(currentPage); },
        showQuickView,
        editCustomer,
        deleteCustomer,
        mergeCustomer,
        updateTier,
        removeTier,
        removeSegment
    };
})();
