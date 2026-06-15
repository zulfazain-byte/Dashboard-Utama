/* ============================================================
   Cibitung Frozen ERP Ultimate v5.4 — CRM Detail Module (EXTENDED)
   Mandiri, ±2000 baris, mobile‑friendly, banyak fitur baru.
   ============================================================ */
window.CFS = window.CFS || {};

(function () {
    'use strict';

    const Storage = CFS.Storage;

    // ==================== STATE LOKAL ====================
    let currentSubTab = 'custdetail-form';
    let customerNotes = [];
    let customerDocuments = [];
    let customerGroups = [];          // {id, name, discount, notes}
    let customerInteractions = [];    // {id, customer, type, date, note}
    let noteSortOrder = 'desc';
    let documentFilter = 'all';
    let interactionFilterType = 'all';
    let editingCustomer = null;      // name of currently editing customer
    let selectedCustomerIds = new Set();

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
            subTabBtns: document.querySelectorAll('.custdetail-subtab-btn'),
            subTabContents: document.querySelectorAll('.custdetail-subtab-content'),

            // Form
            form: document.getElementById('customerDetailForm'),
            fullName: document.getElementById('customerFullName'),
            phone: document.getElementById('customerPhone'),
            email: document.getElementById('customerEmail'),
            address: document.getElementById('customerAddress'),
            ktp: document.getElementById('customerKTP'),
            npwp: document.getElementById('customerNPWP'),
            type: document.getElementById('customerType'),
            groupSelect: document.getElementById('customerGroup'),
            channel: document.getElementById('customerPreferredChannel'),
            notes: document.getElementById('customerNotes'),
            tags: document.getElementById('customerTags'),
            birthday: document.getElementById('customerBirthday'),
            loyaltyPoints: document.getElementById('customerLoyaltyPoints'),
            creditLimit: document.getElementById('customerCreditLimit'),
            status: document.getElementById('customerStatus'),
            reference: document.getElementById('customerReference'),
            customField1: document.getElementById('customerCustom1'),
            formTitle: document.getElementById('custdetailFormTitle'),
            saveBtn: document.getElementById('custDetailSaveBtn'),
            resetBtn: document.getElementById('custDetailResetBtn'),
            customerSelectForm: document.getElementById('custDetailCustomerSelect'),

            // Daftar Pelanggan
            detailSearch: document.getElementById('custDetailSearch'),
            detailFilterChannel: document.getElementById('custDetailFilterChannel'),
            detailFilterType: document.getElementById('custDetailFilterType'),
            detailFilterGroup: document.getElementById('custDetailFilterGroup'),
            detailFilterStatus: document.getElementById('custDetailFilterStatus'),
            applyDetailFilter: document.getElementById('applyCustDetailFilter'),
            clearDetailFilter: document.getElementById('clearCustDetailFilter'),
            exportDetailCSV: document.getElementById('exportCustDetailCSV'),
            exportDetailJSON: document.getElementById('exportCustDetailJSON'),
            importDetailJSON: document.getElementById('importCustDetailJSON'),
            customerTableBody: document.getElementById('customerDetailTableBody'),
            customerSelectAll: document.getElementById('custSelectAll'),
            bulkDelete: document.getElementById('custBulkDelete'),
            bulkGroup: document.getElementById('custBulkGroup'),
            bulkGroupSelect: document.getElementById('custBulkGroupSelect'),
            bulkStatus: document.getElementById('custBulkStatus'),
            bulkStatusSelect: document.getElementById('custBulkStatusSelect'),

            // Riwayat Transaksi
            historySearch: document.getElementById('custHistorySearch'),
            historyStart: document.getElementById('custHistoryStart'),
            historyEnd: document.getElementById('custHistoryEnd'),
            historyCustomer: document.getElementById('custHistoryCustomer'),
            applyHistoryFilter: document.getElementById('applyCustHistoryFilter'),
            exportHistoryCSV: document.getElementById('exportCustHistoryCSV'),
            historyTableBody: document.getElementById('custHistoryTableBody'),

            // Analisis
            chartCustChannel: document.getElementById('chartCustChannel'),
            chartCustTop5: document.getElementById('chartCustTop5'),
            chartCustGrowth: document.getElementById('chartCustGrowth'),
            anaTotalCustomers: document.getElementById('anaCustTotalCustomers'),
            anaNewThisMonth: document.getElementById('anaCustNewThisMonth'),
            anaAvgFrequency: document.getElementById('anaCustAvgFrequency'),
            anaAvgSpent: document.getElementById('anaCustAvgSpent'),

            // Catatan Internal
            noteInput: document.getElementById('custNoteInput'),
            noteCustomerSelect: document.getElementById('custNoteCustomerSelect'),
            noteCustomerContainer: document.getElementById('custNoteCustomerContainer'),
            addNoteBtn: document.getElementById('custAddNoteBtn'),
            notesList: document.getElementById('custNotesList'),
            noteSortBtn: document.getElementById('custNoteSortBtn'),

            // Dokumen
            docInput: document.getElementById('custDocInput'),
            docCustomerSelect: document.getElementById('custDocCustomerSelect'),
            docCustomerContainer: document.getElementById('custDocCustomerContainer'),
            docTypeSelect: document.getElementById('custDocTypeSelect'),
            addDocBtn: document.getElementById('custAddDocBtn'),
            docList: document.getElementById('custDocList'),
            docFilterSelect: document.getElementById('custDocFilterSelect'),

            // Interaksi
            interactionInput: document.getElementById('interactionInput'),
            interactionCustomer: document.getElementById('interactionCustomer'),
            interactionCustomerContainer: document.getElementById('interactionCustomerContainer'),
            interactionType: document.getElementById('interactionType'),
            interactionDate: document.getElementById('interactionDate'),
            addInteractionBtn: document.getElementById('addInteractionBtn'),
            interactionList: document.getElementById('interactionList'),
            interactionFilterType: document.getElementById('interactionFilterType'),

            // Grup Pelanggan
            newGroupName: document.getElementById('newGroupName'),
            newGroupDiscount: document.getElementById('newGroupDiscount'),
            addGroupBtn: document.getElementById('addGroupBtn'),
            groupTableBody: document.getElementById('groupTableBody'),

            // Stats
            cdTotalPelanggan: document.getElementById('cdTotalPelanggan'),
            cdPelangganAktif: document.getElementById('cdPelangganAktif'),
            cdTopSpender: document.getElementById('cdTopSpender'),
            cdRataBelanja: document.getElementById('cdRataBelanja')
        };
    }

    // ==================== UTILS ====================
    function formatRupiah(n) { return 'Rp ' + Math.round(n).toLocaleString('id-ID'); }
    function getToday() { return new Date().toISOString().split('T')[0]; }
    function getMonthStart() {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    }
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
    function generateId(prefix = 'id') {
        return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // ==================== LOAD DATA ====================
    async function loadData() {
        customerNotes = (await localforage.getItem('cfs_customer_notes')) || [];
        customerDocuments = (await localforage.getItem('cfs_customer_documents')) || [];
        customerGroups = (await localforage.getItem('cfs_customer_groups')) || [
            { id: 'g_ecer', name: 'Eceran', discount: 0, notes: '' },
            { id: 'g_grosir', name: 'Grosir', discount: 5, notes: 'Minimal pembelian 50kg' },
            { id: 'g_reseller', name: 'Reseller', discount: 10, notes: 'Harga khusus' }
        ];
        customerInteractions = (await localforage.getItem('cfs_customer_interactions')) || [];
    }

    async function saveNotes() { await localforage.setItem('cfs_customer_notes', customerNotes); }
    async function saveDocuments() { await localforage.setItem('cfs_customer_documents', customerDocuments); }
    async function saveGroups() { await localforage.setItem('cfs_customer_groups', customerGroups); }
    async function saveInteractions() { await localforage.setItem('cfs_customer_interactions', customerInteractions); }

    // ==================== SUB TAB SWITCH ====================
    function setupSubTabs() {
        E.subTabBtns.forEach(btn => {
            btn.addEventListener('click', function () {
                E.subTabBtns.forEach(b => { b.classList.remove('btn-primary', 'active'); b.classList.add('btn-secondary'); });
                this.classList.add('btn-primary', 'active');
                this.classList.remove('btn-secondary');
                const tabId = this.dataset.custdetailTab;
                E.subTabContents.forEach(c => c.classList.add('hidden'));
                const target = document.getElementById(tabId);
                if (target) target.classList.remove('hidden');
                currentSubTab = tabId;
                switch (tabId) {
                    case 'custdetail-list': renderCustomerTable(); break;
                    case 'custdetail-history': renderHistory(); break;
                    case 'custdetail-analysis': renderAnalysis(); break;
                    case 'custdetail-notes': renderNotes(); break;
                    case 'custdetail-documents': renderDocuments(); break;
                    case 'custdetail-interactions': renderInteractions(); break;
                    case 'custdetail-groups': renderGroupTable(); break;
                }
            });
        });
    }

    // ==================== STATISTIK ====================
    function refreshStats() {
        const customers = Storage.getCustomers();
        const names = Object.keys(customers);
        const total = names.length;
        const active30 = names.filter(n => customers[n].lastPurchase && new Date(customers[n].lastPurchase) >= new Date(Date.now() - 30*86400000)).length;
        const totalSpentAll = names.reduce((sum, n) => sum + (customers[n].totalSpent || 0), 0);
        const avg = total > 0 ? Math.round(totalSpentAll / total) : 0;
        const topSpender = names.sort((a,b) => (customers[b].totalSpent||0) - (customers[a].totalSpent||0))[0] || '-';
        if (E.cdTotalPelanggan) E.cdTotalPelanggan.textContent = total;
        if (E.cdPelangganAktif) E.cdPelangganAktif.textContent = active30;
        if (E.cdTopSpender) E.cdTopSpender.textContent = topSpender;
        if (E.cdRataBelanja) E.cdRataBelanja.textContent = formatRupiah(avg);
    }

    // ==================== POPULATE DROPDOWNS ====================
    function populateAllDropdowns() {
        populateCustomerSelects();
        populateGroupSelects();
        populateHistoryCustomerSelect();
        populateFilterSelects();
    }

    function populateCustomerSelects() {
        const customers = Storage.getCustomers();
        const names = Object.keys(customers).sort((a,b)=>a.localeCompare(b,'id'));
        const options = [{value:'',label:'Pilih Pelanggan'}].concat(names.map(n=>({value:n,label:n})));

        if (E.customerSelectForm) {
            const dropdown = new SearchableDropdown(E.customerSelectForm, options, {
                placeholder:'Cari / Pilih Pelanggan untuk Edit',
                onChange: (val) => { if(val) editCustomer(val); }
            });
            E.customerSelectForm._dropdown = dropdown;
        }
        if (E.noteCustomerContainer) {
            if (!E.noteCustomerContainer._dropdown) {
                const dropdown = new SearchableDropdown(E.noteCustomerContainer, options, {placeholder:'Pilih Pelanggan'});
                E.noteCustomerContainer._dropdown = dropdown;
            } else {
                E.noteCustomerContainer._dropdown.updateOptions(options);
            }
        }
        if (E.docCustomerContainer) {
            if (!E.docCustomerContainer._dropdown) {
                const dropdown = new SearchableDropdown(E.docCustomerContainer, options, {placeholder:'Pilih Pelanggan'});
                E.docCustomerContainer._dropdown = dropdown;
            } else {
                E.docCustomerContainer._dropdown.updateOptions(options);
            }
        }
        if (E.interactionCustomerContainer) {
            if (!E.interactionCustomerContainer._dropdown) {
                const dropdown = new SearchableDropdown(E.interactionCustomerContainer, options, {placeholder:'Pilih Pelanggan'});
                E.interactionCustomerContainer._dropdown = dropdown;
            } else {
                E.interactionCustomerContainer._dropdown.updateOptions(options);
            }
        }
    }

    function populateGroupSelects() {
        const groupOpts = groupsToOptions();
        if (E.groupSelect) {
            E.groupSelect.innerHTML = '<option value="">Tanpa Grup</option>'+groupOpts.map(g=>`<option value="${g.name}">${g.name}</option>`).join('');
        }
        if (E.bulkGroupSelect) {
            E.bulkGroupSelect.innerHTML = '<option value="">--Pilih Grup--</option>'+groupOpts.map(g=>`<option value="${g.name}">${g.name}</option>`).join('');
        }
    }

    function groupsToOptions() {
        return customerGroups.map(g => ({value:g.name, label:g.name}));
    }

    function populateHistoryCustomerSelect() {
        if (!E.historyCustomer) return;
        const names = Object.keys(Storage.getCustomers()).sort((a,b)=>a.localeCompare(b,'id'));
        E.historyCustomer.innerHTML = '<option value="">Semua Pelanggan</option>'+names.map(n=>`<option value="${n}">${n}</option>`).join('');
    }

    function populateFilterSelects() {
        if (E.detailFilterGroup) {
            E.detailFilterGroup.innerHTML = '<option value="">Semua Grup</option>'+customerGroups.map(g=>`<option value="${g.name}">${g.name}</option>`).join('');
        }
        if (E.detailFilterStatus) {
            E.detailFilterStatus.innerHTML = '<option value="">Semua Status</option><option value="active">Aktif</option><option value="inactive">Nonaktif</option>';
        }
    }

    // ==================== FORM PELANGGAN ====================
    function resetForm() {
        if (E.form) E.form.reset();
        if (E.formTitle) E.formTitle.textContent = 'Tambah Pelanggan Baru';
        if (E.saveBtn) E.saveBtn.textContent = 'Simpan Pelanggan';
        editingCustomer = null;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const name = E.fullName?.value.trim();
        if (!name) { window.showToast?.('Error','Nama wajib diisi','error'); return; }
        const customers = Storage.getCustomers();
        const existing = editingCustomer ? name : null; // jika edit, name bisa sama dengan sebelumnya
        const detail = {
            phone: E.phone?.value || '',
            email: E.email?.value || '',
            address: E.address?.value || '',
            ktp: E.ktp?.value || '',
            npwp: E.npwp?.value || '',
            type: E.type?.value || 'ecer',
            group: E.groupSelect?.value || '',
            preferredChannel: E.channel?.value || 'offline',
            notes: E.notes?.value || '',
            tags: (E.tags?.value || '').split(',').map(t=>t.trim()).filter(Boolean),
            birthday: E.birthday?.value || '',
            loyaltyPoints: parseInt(E.loyaltyPoints?.value) || 0,
            creditLimit: parseFloat(E.creditLimit?.value) || 0,
            status: E.status?.value || 'active',
            reference: E.reference?.value || '',
            customField1: E.customField1?.value || ''
        };
        await Storage.saveCustomerDetail(name, detail);
        window.showToast?.('Sukses', `Pelanggan "${name}" disimpan.`,'success');
        resetForm();
        refreshStats();
        renderCustomerTable();
        populateAllDropdowns();
    }

    function editCustomer(name) {
        const customer = Storage.getCustomers()[name];
        if (!customer) return;
        const formBtn = document.querySelector('[data-custdetail-tab="custdetail-form"]');
        if (formBtn) {
            E.subTabBtns.forEach(b=>{b.classList.remove('btn-primary','active');b.classList.add('btn-secondary');});
            formBtn.classList.add('btn-primary','active');
            E.subTabContents.forEach(c=>c.classList.add('hidden'));
            document.getElementById('custdetail-form')?.classList.remove('hidden');
            currentSubTab = 'custdetail-form';
        }
        cacheElements();
        E.fullName.value = name;
        E.phone.value = customer.phone || '';
        E.email.value = customer.email || '';
        E.address.value = customer.address || '';
        E.ktp.value = customer.ktp || '';
        E.npwp.value = customer.npwp || '';
        E.type.value = customer.type || 'ecer';
        E.groupSelect.value = customer.group || '';
        E.channel.value = customer.preferredChannel || 'offline';
        E.notes.value = customer.notes || '';
        E.tags.value = (customer.tags || []).join(', ');
        E.birthday.value = customer.birthday || '';
        E.loyaltyPoints.value = customer.loyaltyPoints || 0;
        E.creditLimit.value = customer.creditLimit || '';
        E.status.value = customer.status || 'active';
        E.reference.value = customer.reference || '';
        E.customField1.value = customer.customField1 || '';
        E.formTitle.textContent = `Edit Pelanggan: ${name}`;
        E.saveBtn.textContent = '💾 Perbarui';
        editingCustomer = name;
    }

    async function deleteCustomer(name) {
        if (!confirm(`Hapus semua data pelanggan "${name}"?`)) return;
        await Storage.deleteCustomer(name);
        refreshStats();
        renderCustomerTable();
        populateAllDropdowns();
        window.showToast?.('Sukses', `Pelanggan "${name}" dihapus.`,'success');
    }

    // ==================== DAFTAR PELANGGAN ====================
    function renderCustomerTable() {
        if (!E.customerTableBody) return;
        const customers = Storage.getCustomers();
        let names = Object.keys(customers);
        const search = (E.detailSearch?.value || '').toLowerCase();
        const channelFilter = E.detailFilterChannel?.value || '';
        const typeFilter = E.detailFilterType?.value || '';
        const groupFilter = E.detailFilterGroup?.value || '';
        const statusFilter = E.detailFilterStatus?.value || '';

        if (search) names = names.filter(n => n.toLowerCase().includes(search) || (customers[n].phone||'').includes(search) || (customers[n].email||'').toLowerCase().includes(search));
        if (channelFilter) names = names.filter(n => (customers[n].preferredChannel||'offline') === channelFilter);
        if (typeFilter) names = names.filter(n => (customers[n].type||'ecer') === typeFilter);
        if (groupFilter) names = names.filter(n => (customers[n].group||'') === groupFilter);
        if (statusFilter) names = names.filter(n => (customers[n].status||'active') === statusFilter);
        names.sort((a,b)=>a.localeCompare(b,'id'));

        if (names.length===0) {
            E.customerTableBody.innerHTML = '<tr><td colspan="9" class="text-center p-4 opacity-50">Tidak ada data.</td></tr>';
            return;
        }
        E.customerTableBody.innerHTML = names.map(name => {
            const c = customers[name];
            const tagsHtml = (c.tags||[]).map(t=>`<span class="tag-badge">${t}</span>`).join('')||'-';
            return `<tr class="border-t hover:bg-slate-50 dark:hover:bg-slate-700 text-sm">
                <td class="p-2"><input type="checkbox" class="cust-checkbox" data-name="${escapeHtml(name)}" ${selectedCustomerIds.has(name)?'checked':''}></td>
                <td class="p-2 font-medium underline cursor-pointer text-blue-600" onclick="CFS.CRMDetail.editCustomer('${escapeHtml(name)}')">${escapeHtml(name)}</td>
                <td class="p-2">${c.phone||'-'}</td>
                <td class="p-2">${c.group||'-'}</td>
                <td class="p-2">${c.type||'ecer'}</td>
                <td class="p-2">${c.preferredChannel==='online'?'🌐 Online':'🏪 Offline'}</td>
                <td class="p-2">${c.status==='inactive'?'🔴 Nonaktif':'🟢 Aktif'}</td>
                <td class="p-2">${tagsHtml}</td>
                <td class="p-2 text-center">
                    <button class="btn btn-xs btn-secondary" onclick="CFS.CRMDetail.editCustomer('${escapeHtml(name)}')" title="Edit"><i class="ph ph-pencil"></i></button>
                    <button class="btn btn-xs btn-info" onclick="CFS.CRMDetail.duplicateCustomer('${escapeHtml(name)}')" title="Duplikat"><i class="ph ph-copy"></i></button>
                    <button class="btn btn-xs btn-danger" onclick="CFS.CRMDetail.deleteCustomer('${escapeHtml(name)}')" title="Hapus"><i class="ph ph-trash"></i></button>
                </td>
            </tr>`;
        }).join('');
        updateSelectedCustomers();
    }

    function updateSelectedCustomers() {
        const checks = document.querySelectorAll('.cust-checkbox');
        selectedCustomerIds.clear();
        checks.forEach(c => { if(c.checked) selectedCustomerIds.add(c.dataset.name); });
        if (E.customerSelectAll) E.customerSelectAll.checked = checks.length>0 && selectedCustomerIds.size===checks.length;
    }

    // ==================== BULK ACTIONS ====================
    async function bulkDeleteCustomers() {
        if (selectedCustomerIds.size===0) return showToast('Info','Tidak ada yang dipilih','info');
        if (!confirm(`Hapus ${selectedCustomerIds.size} pelanggan?`)) return;
        for (const name of selectedCustomerIds) await Storage.deleteCustomer(name);
        selectedCustomerIds.clear();
        refreshStats(); renderCustomerTable(); populateAllDropdowns();
        showToast('Sukses','Pelanggan terpilih dihapus','success');
    }
    async function bulkChangeGroup() {
        const group = E.bulkGroupSelect?.value;
        if (!group || selectedCustomerIds.size===0) return;
        for (const name of selectedCustomerIds) {
            const cust = Storage.getCustomers()[name];
            if (cust) { cust.group = group; await Storage.saveCustomerDetail(name, cust); }
        }
        renderCustomerTable(); populateAllDropdowns();
        showToast('Sukses',`Grup diubah ke ${group}`,'success');
    }
    async function bulkChangeStatus() {
        const status = E.bulkStatusSelect?.value;
        if (!status || selectedCustomerIds.size===0) return;
        for (const name of selectedCustomerIds) {
            const cust = Storage.getCustomers()[name];
            if (cust) { cust.status = status; await Storage.saveCustomerDetail(name, cust); }
        }
        renderCustomerTable(); populateAllDropdowns();
        showToast('Sukses',`Status diubah`,'success');
    }

    // ==================== RIWAYAT TRANSAKSI ====================
    function renderHistory() {
        if (!E.historyTableBody) return;
        let sales = Storage.getSales();
        const search = (E.historySearch?.value||'').toLowerCase();
        const start = E.historyStart?.value || '';
        const end = E.historyEnd?.value || '';
        const customerFilter = E.historyCustomer?.value || '';
        if (search) sales = sales.filter(s => s.klien.toLowerCase().includes(search));
        if (start) sales = sales.filter(s => s.tanggal >= start);
        if (end) sales = sales.filter(s => s.tanggal <= end);
        if (customerFilter) sales = sales.filter(s => s.klien === customerFilter);
        sales.sort((a,b)=>new Date(b.tanggal)-new Date(a.tanggal));
        if (sales.length===0) {
            E.historyTableBody.innerHTML = '<tr><td colspan="6" class="text-center p-4">Tidak ada data.</td></tr>';
            return;
        }
        E.historyTableBody.innerHTML = sales.map(s => {
            const total = (s.qty * s.hargaJual) - (s.diskon||0);
            return `<tr class="border-t text-sm">
                <td class="p-2">${s.tanggal}</td>
                <td class="p-2">${escapeHtml(s.klien)}</td>
                <td class="p-2">${s.produk}</td>
                <td class="p-2 text-right">${s.qty} kg</td>
                <td class="p-2 text-right">${formatRupiah(total)}</td>
                <td class="p-2">${s.channel==='online'?'🌐':'🏪'}</td>
            </tr>`;
        }).join('');
    }

    // ==================== ANALISIS ====================
    let channelChart=null, top5Chart=null, growthChart=null;
    function renderAnalysis() {
        const customers = Storage.getCustomers();
        const names = Object.keys(customers);
        // Channel
        const chCount={online:0,offline:0};
        names.forEach(n=>{ const ch=customers[n].preferredChannel||'offline'; chCount[ch]=(chCount[ch]||0)+1; });
        const ctxChannel = E.chartCustChannel?.getContext('2d');
        if(ctxChannel){ if(channelChart)channelChart.destroy(); channelChart=new Chart(ctxChannel,{type:'pie',data:{labels:['Online','Offline'],datasets:[{data:[chCount.online,chCount.offline],backgroundColor:['#6366f1','#f59e0b']}]},options:{responsive:true,plugins:{legend:{position:'bottom'}}}});}
        // Top5
        const top5=names.map(n=>({name:n,total:customers[n].totalSpent||0})).sort((a,b)=>b.total-a.total).slice(0,5);
        const ctxTop5=E.chartCustTop5?.getContext('2d');
        if(ctxTop5){ if(top5Chart)top5Chart.destroy(); top5Chart=new Chart(ctxTop5,{type:'bar',data:{labels:top5.map(c=>c.name),datasets:[{label:'Total Pembelian',data:top5.map(c=>c.total),backgroundColor:'#2563eb'}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{ticks:{callback:val=>formatRupiah(val)}}}}});}
        // Growth
        const monthLabels=[], newPerMonth=[];
        for(let i=5;i>=0;i--){ const d=new Date(); d.setMonth(d.getMonth()-i); const label=d.toLocaleDateString('id-ID',{month:'short',year:'numeric'}); monthLabels.push(label); const ms=new Date(d.getFullYear(),d.getMonth(),1).toISOString().split('T')[0]; const me=new Date(d.getFullYear(),d.getMonth()+1,0).toISOString().split('T')[0]; const cnt=names.filter(n=>{const first=customers[n].firstPurchase||customers[n].lastPurchase; return first&&first>=ms&&first<=me;}).length; newPerMonth.push(cnt); }
        const ctxGrowth=E.chartCustGrowth?.getContext('2d');
        if(ctxGrowth){ if(growthChart)growthChart.destroy(); growthChart=new Chart(ctxGrowth,{type:'line',data:{labels:monthLabels,datasets:[{label:'Pelanggan Baru',data:newPerMonth,borderColor:'#22c55e',tension:0.3,fill:true,backgroundColor:'rgba(34,197,94,0.1)'}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{stepSize:1}}}}});}
        // Quick stats
        const thisMonthStart=getMonthStart(); const newThisMonth=names.filter(n=>{const f=customers[n].firstPurchase||customers[n].lastPurchase; return f&&f>=thisMonthStart;}).length; const totalTrx=names.reduce((s,n)=>s+(customers[n].transactionCount||0),0); const avgFreq=names.length?(totalTrx/names.length).toFixed(1):0; const totalSpent=names.reduce((s,n)=>s+(customers[n].totalSpent||0),0); const avgSpent=names.length?Math.round(totalSpent/names.length):0;
        if(E.anaNewThisMonth)E.anaNewThisMonth.textContent=newThisMonth; if(E.anaAvgFrequency)E.anaAvgFrequency.textContent=avgFreq; if(E.anaAvgSpent)E.anaAvgSpent.textContent=formatRupiah(avgSpent);
    }

    // ==================== CATATAN ====================
    async function renderNotes() {
        if (!E.notesList) return;
        await loadData();
        let sorted = [...customerNotes];
        sorted.sort((a,b)=> noteSortOrder==='asc'?new Date(a.tanggal)-new Date(b.tanggal):new Date(b.tanggal)-new Date(a.tanggal));
        E.notesList.innerHTML = sorted.length===0?'<p class="text-sm opacity-50">Belum ada catatan.</p>':
            sorted.map(n=>`<div class="p-2 border rounded text-sm mb-2"><div class="flex justify-between"><strong>${escapeHtml(n.customer)}</strong><span class="text-xs opacity-50">${new Date(n.tanggal).toLocaleString('id-ID')}</span></div><p class="mt-1">${escapeHtml(n.konten)}</p><button class="text-xs text-red-500" onclick="CFS.CRMDetail.deleteNote('${n.id}')"><i class="ph ph-trash"></i> Hapus</button></div>`).join('');
    }
    async function addNote() {
        const customer = E.noteCustomerContainer?._dropdown?.getValue() || E.noteCustomerSelect?.value;
        const konten = E.noteInput?.value.trim();
        if (!customer || !konten) return;
        customerNotes.push({ id: generateId('note'), customer, konten, tanggal: new Date().toISOString() });
        await saveNotes();
        E.noteInput.value = '';
        renderNotes();
        window.showToast?.('Sukses','Catatan ditambahkan','success');
    }
    async function deleteNote(id) { customerNotes=customerNotes.filter(n=>n.id!==id); await saveNotes(); renderNotes(); }
    function toggleNoteSort() { noteSortOrder= noteSortOrder==='desc'?'asc':'desc'; if(E.noteSortBtn)E.noteSortBtn.textContent= noteSortOrder==='desc'?'↓ Terbaru':'↑ Terlama'; renderNotes(); }

    // ==================== DOKUMEN ====================
    async function renderDocuments() {
        if (!E.docList) return;
        let filtered = [...customerDocuments];
        if (documentFilter!=='all') filtered=filtered.filter(d=>d.tipe===documentFilter);
        E.docList.innerHTML = filtered.length===0?'<p class="text-sm opacity-50">Belum ada dokumen.</p>':
            filtered.map(d=>`<div class="p-2 border rounded text-sm mb-2 flex justify-between items-center"><div><strong>${escapeHtml(d.customer)}</strong> - ${d.namaFile} <span class="badge text-xs ml-2">${d.tipe}</span></div><div><a href="${d.url}" target="_blank" class="btn btn-xs btn-secondary mr-1">Lihat</a><button class="btn btn-xs btn-danger" onclick="CFS.CRMDetail.deleteDocument('${d.id}')">🗑️</button></div></div>`).join('');
    }
    async function addDocument() {
        const customer = E.docCustomerContainer?._dropdown?.getValue() || E.docCustomerSelect?.value;
        const file = E.docInput.files[0];
        const tipe = E.docTypeSelect?.value || 'other';
        if (!customer || !file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            customerDocuments.push({ id: generateId('doc'), customer, namaFile: file.name, url: ev.target.result, tipe });
            await saveDocuments();
            renderDocuments();
            window.showToast?.('Sukses','Dokumen ditambahkan','success');
        };
        reader.readAsDataURL(file);
    }
    async function deleteDocument(id) { customerDocuments=customerDocuments.filter(d=>d.id!==id); await saveDocuments(); renderDocuments(); }

    // ==================== INTERAKSI ====================
    async function renderInteractions() {
        if (!E.interactionList) return;
        let filtered = [...customerInteractions];
        if (interactionFilterType!=='all') filtered=filtered.filter(i=>i.type===interactionFilterType);
        filtered.sort((a,b)=>new Date(b.date)-new Date(a.date));
        E.interactionList.innerHTML = filtered.length===0?'<p class="text-sm opacity-50">Belum ada interaksi.</p>':
            filtered.map(i=>`<div class="p-2 border rounded text-sm mb-2 flex justify-between"><div><strong>${escapeHtml(i.customer)}</strong> - ${i.type} <span class="text-xs opacity-50">${new Date(i.date).toLocaleString('id-ID')}</span><p>${escapeHtml(i.note)}</p></div><button class="btn btn-xs btn-danger" onclick="CFS.CRMDetail.deleteInteraction('${i.id}')">🗑️</button></div>`).join('');
    }
    async function addInteraction() {
        const customer = E.interactionCustomerContainer?._dropdown?.getValue() || E.interactionCustomer?.value;
        const type = E.interactionType?.value || 'call';
        const date = E.interactionDate?.value || getToday();
        const note = E.interactionInput?.value.trim();
        if (!customer || !note) return;
        customerInteractions.push({ id: generateId('int'), customer, type, date, note });
        await saveInteractions();
        E.interactionInput.value = '';
        renderInteractions();
        window.showToast?.('Sukses','Interaksi dicatat','success');
    }
    async function deleteInteraction(id) { customerInteractions=customerInteractions.filter(i=>i.id!==id); await saveInteractions(); renderInteractions(); }

    // ==================== GRUP PELANGGAN ====================
    function renderGroupTable() {
        if (!E.groupTableBody) return;
        E.groupTableBody.innerHTML = customerGroups.map(g => {
            const count = Object.values(Storage.getCustomers()).filter(c=>c.group===g.name).length;
            return `<tr class="border-t text-sm"><td class="p-2">${g.name}</td><td class="p-2">${g.discount}%</td><td class="p-2">${g.notes||'-'}</td><td class="p-2">${count} pelanggan</td><td class="p-2 text-center"><button class="btn btn-xs btn-secondary" onclick="CFS.CRMDetail.editGroup('${g.id}')">Edit</button><button class="btn btn-xs btn-danger" onclick="CFS.CRMDetail.deleteGroup('${g.id}')">Hapus</button></td></tr>`;
        }).join('') || '<tr><td colspan="5" class="text-center p-4">Belum ada grup.</td></tr>';
    }
    async function addGroup() {
        const name = E.newGroupName?.value.trim();
        const discount = parseFloat(E.newGroupDiscount?.value)||0;
        if (!name) return;
        customerGroups.push({ id: generateId('grp'), name, discount, notes: '' });
        await saveGroups();
        E.newGroupName.value = ''; E.newGroupDiscount.value = '';
        renderGroupTable(); populateAllDropdowns();
        showToast('Sukses','Grup ditambahkan','success');
    }
    function editGroup(id) {
        const grp = customerGroups.find(g=>g.id===id);
        if(!grp)return;
        const newName=prompt('Nama grup:',grp.name); if(!newName)return;
        const newDisc=prompt('Diskon (%):',grp.discount);
        grp.name=newName.trim();
        grp.discount=parseFloat(newDisc)||0;
        saveGroups().then(()=>{renderGroupTable();populateAllDropdowns();});
    }
    async function deleteGroup(id) {
        if(!confirm('Hapus grup? Pelanggan dalam grup akan kehilangan grup.'))return;
        customerGroups=customerGroups.filter(g=>g.id!==id);
        await saveGroups();
        renderGroupTable(); populateAllDropdowns();
    }

    // ==================== EXPORT / IMPORT ====================
    function exportDetailCSV() {
        const customers = Storage.getCustomers();
        const names = Object.keys(customers).sort();
        const csv = ['Nama,Telepon,Email,Alamat,KTP,NPWP,Tipe,Grup,Channel,Tags,Birthday,LoyaltyPoints,CreditLimit,Status,Reference'];
        names.forEach(n=>{const c=customers[n]; csv.push(`"${n}","${c.phone||''}","${c.email||''}","${c.address||''}","${c.ktp||''}","${c.npwp||''}","${c.type||''}","${c.group||''}","${c.preferredChannel||'offline'}","${(c.tags||[]).join(';')}","${c.birthday||''}",${c.loyaltyPoints||0},${c.creditLimit||0},"${c.status||'active'}","${c.reference||''}"`);});
        downloadBlob(csv.join('\n'),`pelanggan_${getToday()}.csv`);
        showToast('Sukses','CSV diekspor','success');
    }
    function exportDetailJSON() {
        const data = { customers: Storage.getCustomers(), groups: customerGroups, notes: customerNotes, documents: customerDocuments, interactions: customerInteractions };
        downloadBlob(JSON.stringify(data,null,2),`crm_full_${getToday()}.json`);
        showToast('Sukses','JSON diekspor','success');
    }
    function importDetailJSON() {
        const input = document.createElement('input'); input.type='file'; input.accept='.json';
        input.onchange = async e => {
            const file = e.target.files[0]; if(!file)return;
            const text = await file.text();
            try {
                const data = JSON.parse(text);
                if(data.customers) for(const [name,detail] of Object.entries(data.customers)) await Storage.saveCustomerDetail(name,detail);
                if(data.groups) { customerGroups = data.groups; await saveGroups(); }
                if(data.notes) { customerNotes = data.notes; await saveNotes(); }
                if(data.documents) { customerDocuments = data.documents; await saveDocuments(); }
                if(data.interactions) { customerInteractions = data.interactions; await saveInteractions(); }
                refreshStats(); renderCustomerTable(); populateAllDropdowns();
                showToast('Sukses','Data diimpor dari JSON','success');
            } catch { showToast('Error','File JSON tidak valid','error'); }
        };
        input.click();
    }
    function downloadBlob(content, filename) {
        const blob = new Blob([content],{type:'text/plain'});
        const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; a.click();
    }

    // ==================== EVENT BINDING ====================
    function bindEvents() {
        // Sub tabs already bound
        // Form
        E.form?.addEventListener('submit', handleSubmit);
        E.resetBtn?.addEventListener('click', resetForm);
        // Daftar
        E.applyDetailFilter?.addEventListener('click', renderCustomerTable);
        E.clearDetailFilter?.addEventListener('click', ()=>{
            E.detailSearch.value=''; E.detailFilterChannel.value=''; E.detailFilterType.value=''; E.detailFilterGroup.value=''; E.detailFilterStatus.value='';
            renderCustomerTable();
        });
        E.detailSearch?.addEventListener('input', debounce(renderCustomerTable, 400));
        E.exportDetailCSV?.addEventListener('click', exportDetailCSV);
        E.exportDetailJSON?.addEventListener('click', exportDetailJSON);
        E.importDetailJSON?.addEventListener('click', importDetailJSON);
        E.customerSelectAll?.addEventListener('change', function(){ document.querySelectorAll('.cust-checkbox').forEach(c=>c.checked=this.checked); updateSelectedCustomers(); });
        E.customerTableBody?.addEventListener('change', function(e){ if(e.target.classList.contains('cust-checkbox')) updateSelectedCustomers(); });
        E.bulkDelete?.addEventListener('click', bulkDeleteCustomers);
        E.bulkGroup?.addEventListener('click', bulkChangeGroup);
        E.bulkStatus?.addEventListener('click', bulkChangeStatus);
        // History
        E.applyHistoryFilter?.addEventListener('click', renderHistory);
        E.exportHistoryCSV?.addEventListener('click', ()=>{
            const sales = Storage.getSales();
            const csv = 'Tanggal,Klien,Produk,Qty,Total,Channel\n'+sales.map(s=>`${s.tanggal},"${s.klien}","${s.produk}",${s.qty},${(s.qty*s.hargaJual)-(s.diskon||0)},${s.channel}`).join('\n');
            downloadBlob(csv,`riwayat_${getToday()}.csv`);
            showToast('Sukses','Riwayat diekspor','success');
        });
        // Notes
        E.addNoteBtn?.addEventListener('click', addNote);
        E.noteSortBtn?.addEventListener('click', toggleNoteSort);
        // Documents
        E.addDocBtn?.addEventListener('click', addDocument);
        E.docFilterSelect?.addEventListener('change', function(){ documentFilter=this.value; renderDocuments(); });
        // Interactions
        E.addInteractionBtn?.addEventListener('click', addInteraction);
        E.interactionFilterType?.addEventListener('change', function(){ interactionFilterType=this.value; renderInteractions(); });
        // Groups
        E.addGroupBtn?.addEventListener('click', addGroup);
    }

    function debounce(fn, delay) {
        let timer;
        return function(...args){ clearTimeout(timer); timer=setTimeout(()=>fn.apply(this,args), delay); };
    }
    function showToast(title,msg,type){ window.showToast?.(title,msg,type); }

    // ==================== INIT ====================
    async function init() {
        await loadData();
        cacheElements();
        setupSubTabs();
        bindEvents();
        populateAllDropdowns();
        refreshStats();
        renderCustomerTable();
        renderGroupTable();
    }

    // ==================== EXPORT API ====================
    CFS.CRMDetail = {
        init,
        editCustomer,
        deleteCustomer,
        duplicateCustomer: function(name){ const c=Storage.getCustomers()[name]; if(!c)return; const newName=name+' (Copy)'; Storage.saveCustomerDetail(newName,{...c, firstPurchase:null,lastPurchase:null,totalSpent:0,transactionCount:0}).then(()=>{refreshStats();renderCustomerTable();populateAllDropdowns();showToast('Sukses',`Duplikat ${newName} dibuat`,'success');}); },
        deleteNote,
        deleteDocument,
        deleteInteraction,
        editGroup,
        deleteGroup
    };
})();
