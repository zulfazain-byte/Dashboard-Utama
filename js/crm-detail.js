/* ============================================================
   Cibitung Frozen ERP Ultimate v5.4 — CRM Detail Module (Upgrade)
   Mendukung sub‑tab: Form, Daftar, Riwayat, Analisis
   ============================================================ */
window.CFS = window.CFS || {};

(function() {
    'use strict';

    const Storage = CFS.Storage;

    // Cache elemen utama
    let elements = {};

    function cacheElements() {
        elements = {
            // Sub tab buttons
            subTabBtns: document.querySelectorAll('.custdetail-subtab-btn'),
            // Form
            form: document.getElementById('customerDetailForm'),
            fullName: document.getElementById('customerFullName'),
            phone: document.getElementById('customerPhone'),
            email: document.getElementById('customerEmail'),
            address: document.getElementById('customerAddress'),
            ktp: document.getElementById('customerKTP'),
            npwp: document.getElementById('customerNPWP'),
            type: document.getElementById('customerType'),
            channel: document.getElementById('customerPreferredChannel'),
            notes: document.getElementById('customerNotes'),
            // Table (daftar pelanggan)
            detailTableBody: document.getElementById('customerDetailTableBody'),
            detailSearch: document.getElementById('custDetailSearch'),
            detailFilterChannel: document.getElementById('custDetailFilterChannel'),
            applyDetailFilter: document.getElementById('applyCustDetailFilter'),
            exportDetailCSV: document.getElementById('exportCustDetailCSV'),
            // History
            historySearch: document.getElementById('custHistorySearch'),
            historyStart: document.getElementById('custHistoryStart'),
            historyEnd: document.getElementById('custHistoryEnd'),
            applyHistoryFilter: document.getElementById('applyCustHistoryFilter'),
            historyTableBody: document.getElementById('custHistoryTableBody'),
            // Analysis
            chartCustChannel: document.getElementById('chartCustChannel'),
            chartCustTop5: document.getElementById('chartCustTop5')
        };
    }

    let channelChart = null, top5Chart = null;

    // --------------- SUB TAB SWITCH ---------------
    function setupSubTabs() {
        if (!elements.subTabBtns) return;
        elements.subTabBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                elements.subTabBtns.forEach(b => {
                    b.classList.remove('btn-primary', 'active');
                    b.classList.add('btn-secondary');
                });
                this.classList.add('btn-primary', 'active');
                this.classList.remove('btn-secondary');

                const targetId = this.dataset.custdetailTab;
                document.querySelectorAll('.custdetail-subtab-content').forEach(c => c.classList.add('hidden'));
                const target = document.getElementById(targetId);
                if (target) target.classList.remove('hidden');

                // Inisialisasi konten sesuai tab
                if (targetId === 'custdetail-list') renderCustomerTable();
                else if (targetId === 'custdetail-history') renderHistory();
                else if (targetId === 'custdetail-analysis') renderAnalysis();
            });
        });
    }

    // --------------- RENDER DAFTAR PELANGGAN (dengan filter) ---------------
    function renderCustomerTable() {
        if (!elements.detailTableBody) return;

        const customers = Storage.getCustomers();
        let names = Object.keys(customers);

        // Filter
        const search = elements.detailSearch?.value.trim().toLowerCase() || '';
        const channelFilter = elements.detailFilterChannel?.value || '';

        if (search) {
            names = names.filter(n => n.toLowerCase().includes(search) || 
                            (customers[n].phone || '').includes(search) ||
                            (customers[n].email || '').toLowerCase().includes(search));
        }
        if (channelFilter) {
            names = names.filter(n => (customers[n].preferredChannel || customers[n].channel || 'offline') === channelFilter);
        }

        if (names.length === 0) {
            elements.detailTableBody.innerHTML = '<tr><td colspan="7" class="text-center p-4 opacity-50">Tidak ada data pelanggan.</td></tr>';
            return;
        }

        elements.detailTableBody.innerHTML = names.map(name => {
            const c = customers[name];
            return `
                <tr class="border-t hover:bg-slate-50 dark:hover:bg-slate-700 text-sm">
                    <td class="p-2 font-medium">${name}</td>
                    <td class="p-2">${c.phone || '-'}</td>
                    <td class="p-2">${c.email || '-'}</td>
                    <td class="p-2">${c.ktp || '-'}</td>
                    <td class="p-2">${c.type || 'ecer'}</td>
                    <td class="p-2">${c.preferredChannel === 'online' ? '🌐 Online' : '🏪 Offline'}</td>
                    <td class="p-2 text-center">
                        <button class="btn btn-xs btn-secondary" onclick="CFS.CRMDetail.editCustomer('${name}')">
                            <i class="ph ph-pencil"></i> Edit
                        </button>
                        <button class="btn btn-xs btn-danger" onclick="CFS.CRMDetail.deleteCustomer('${name}')">
                            <i class="ph ph-trash"></i> Hapus
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // --------------- FORM HANDLER ---------------
    function editCustomer(name) {
        const customer = Storage.getCustomers()[name];
        if (!customer) return;

        // Switch to form sub-tab
        document.querySelectorAll('.custdetail-subtab-btn').forEach(b => {
            b.classList.remove('btn-primary', 'active');
            b.classList.add('btn-secondary');
        });
        const formBtn = document.querySelector('[data-custdetail-tab="custdetail-form"]');
        if (formBtn) {
            formBtn.classList.add('btn-primary', 'active');
            formBtn.classList.remove('btn-secondary');
        }
        document.querySelectorAll('.custdetail-subtab-content').forEach(c => c.classList.add('hidden'));
        const formDiv = document.getElementById('custdetail-form');
        if (formDiv) formDiv.classList.remove('hidden');

        // Isi form
        cacheElements();
        if (elements.fullName) elements.fullName.value = name;
        if (elements.phone) elements.phone.value = customer.phone || '';
        if (elements.email) elements.email.value = customer.email || '';
        if (elements.address) elements.address.value = customer.address || '';
        if (elements.ktp) elements.ktp.value = customer.ktp || '';
        if (elements.npwp) elements.npwp.value = customer.npwp || '';
        if (elements.type) elements.type.value = customer.type || 'ecer';
        if (elements.channel) elements.channel.value = customer.preferredChannel || 'offline';
        if (elements.notes) elements.notes.value = customer.notes || '';

        const formTitle = document.getElementById('custdetailFormTitle');
        if (formTitle) formTitle.textContent = 'Edit Pelanggan: ' + name;
    }

    async function deleteCustomer(name) {
        if (!confirm(`Hapus semua data pelanggan "${name}"?`)) return;
        await Storage.deleteCustomer(name);
        renderCustomerTable();
        if (typeof showToast === 'function') showToast('Sukses', `Pelanggan "${name}" dihapus.`, 'success');
    }

    async function handleSubmit(e) {
        e.preventDefault();
        cacheElements();

        const name = elements.fullName?.value.trim();
        if (!name) {
            if (typeof showToast === 'function') showToast('Error', 'Nama pelanggan wajib diisi.', 'error');
            return;
        }

        const detail = {
            phone: elements.phone?.value || '',
            email: elements.email?.value || '',
            address: elements.address?.value || '',
            ktp: elements.ktp?.value || '',
            npwp: elements.npwp?.value || '',
            type: elements.type?.value || 'ecer',
            preferredChannel: elements.channel?.value || 'offline',
            notes: elements.notes?.value || ''
        };

        await Storage.saveCustomerDetail(name, detail);
        if (typeof showToast === 'function') showToast('Sukses', `Detail pelanggan "${name}" disimpan.`, 'success');

        // Reset form
        elements.form.reset();
        const formTitle = document.getElementById('custdetailFormTitle');
        if (formTitle) formTitle.textContent = 'Tambah Pelanggan Baru';
        renderCustomerTable();
    }

    // --------------- RIWAYAT TRANSAKSI ---------------
    function renderHistory() {
        if (!elements.historyTableBody) return;
        const sales = Storage.getSales();
        const search = elements.historySearch?.value.trim().toLowerCase() || '';
        const start = elements.historyStart?.value || '';
        const end = elements.historyEnd?.value || '';

        let filtered = sales;
        if (search) {
            filtered = filtered.filter(s => s.klien.toLowerCase().includes(search));
        }
        if (start) filtered = filtered.filter(s => s.tanggal >= start);
        if (end) filtered = filtered.filter(s => s.tanggal <= end);

        filtered.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

        if (filtered.length === 0) {
            elements.historyTableBody.innerHTML = '<tr><td colspan="6" class="text-center p-4 opacity-50">Tidak ada riwayat transaksi.</td></tr>';
            return;
        }

        elements.historyTableBody.innerHTML = filtered.map(s => {
            const total = (s.qty * s.hargaJual) - (s.diskon || 0);
            return `<tr class="border-t">
                <td class="p-2">${s.tanggal}</td>
                <td class="p-2">${s.klien}</td>
                <td class="p-2">${s.produk}</td>
                <td class="p-2 text-right">${s.qty} kg</td>
                <td class="p-2 text-right">Rp ${total.toLocaleString('id-ID')}</td>
                <td class="p-2">${s.channel === 'online' ? '🌐' : '🏪'}</td>
            </tr>`;
        }).join('');
    }

    // --------------- ANALISIS ---------------
    function renderAnalysis() {
        const customers = Storage.getCustomers();
        const names = Object.keys(customers);

        // 1. Channel distribution pie chart
        const channelCount = { online: 0, offline: 0 };
        names.forEach(n => {
            const ch = customers[n].preferredChannel || customers[n].channel || 'offline';
            channelCount[ch] = (channelCount[ch] || 0) + 1;
        });
        const ctxChannel = elements.chartCustChannel?.getContext('2d');
        if (ctxChannel) {
            if (channelChart) channelChart.destroy();
            channelChart = new Chart(ctxChannel, {
                type: 'pie',
                data: {
                    labels: ['Online', 'Offline'],
                    datasets: [{
                        data: [channelCount.online, channelCount.offline],
                        backgroundColor: ['#6366f1', '#f59e0b']
                    }]
                },
                options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
            });
        }

        // 2. Top 5 customers by total spent
        const topFive = names.map(name => ({ name, total: customers[name].totalSpent || 0 }))
                            .sort((a, b) => b.total - a.total)
                            .slice(0, 5);
        const ctxTop5 = elements.chartCustTop5?.getContext('2d');
        if (ctxTop5) {
            if (top5Chart) top5Chart.destroy();
            top5Chart = new Chart(ctxTop5, {
                type: 'bar',
                data: {
                    labels: topFive.map(c => c.name),
                    datasets: [{
                        label: 'Total Pembelian',
                        data: topFive.map(c => c.total),
                        backgroundColor: '#2563eb'
                    }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: { y: { ticks: { callback: val => 'Rp ' + val.toLocaleString('id-ID') } } }
                }
            });
        }
    }

    // --------------- EVENT LISTENERS ---------------
    function bindEvents() {
        // Form submit
        if (elements.form && !elements.form.dataset.listener) {
            elements.form.addEventListener('submit', handleSubmit);
            elements.form.dataset.listener = 'true';
        }

        // Filter daftar pelanggan
        if (elements.applyDetailFilter) {
            elements.applyDetailFilter.addEventListener('click', renderCustomerTable);
        }

        // Filter riwayat
        if (elements.applyHistoryFilter) {
            elements.applyHistoryFilter.addEventListener('click', renderHistory);
        }

        // Ekspor CSV
        if (elements.exportDetailCSV) {
            elements.exportDetailCSV.addEventListener('click', () => {
                const customers = Storage.getCustomers();
                const names = Object.keys(customers);
                const csv = 'Nama,Telepon,Email,KTP,Tipe,Channel\n' +
                    names.map(n => {
                        const c = customers[n];
                        return `"${n}","${c.phone||''}","${c.email||''}","${c.ktp||''}","${c.type||''}","${c.preferredChannel||'offline'}"`;
                    }).join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `pelanggan_detail_${new Date().toISOString().slice(0,10)}.csv`;
                a.click();
                if (typeof showToast === 'function') showToast('Sukses', 'Data diekspor.', 'success');
            });
        }
    }

    // --------------- INIT ---------------
    function init() {
        cacheElements();
        setupSubTabs();
        bindEvents();
        // Tampilkan daftar pelanggan sebagai default
        renderCustomerTable();
        // Inisialisasi analisis jika langsung dibuka
        // (tidak langsung, karena mungkin tidak terlihat)
    }

    // Expose API
    CFS.CRMDetail = {
        init: init,
        editCustomer: editCustomer,
        deleteCustomer: deleteCustomer
    };
})();
