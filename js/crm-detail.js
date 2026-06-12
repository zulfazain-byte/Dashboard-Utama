/* ============================================================
   Cibitung Frozen ERP Ultimate v5.4 — CRM Detail Module (ULTIMATE)
   Mandiri, ±1200 baris, tanpa mengubah file lain.
   ============================================================ */
window.CFS = window.CFS || {};

(function () {
    'use strict';

    const Storage = CFS.Storage;

    // ==================== STATE LOKAL ====================
    let currentSubTab = 'custdetail-form';
    let customerNotes = [];               // catatan internal per pelanggan
    let customerDocuments = [];           // dokumen terkait pelanggan (nama file, url, tipe)
    let noteSortOrder = 'desc';          // 'asc' / 'desc'
    let documentFilter = 'all';          // 'all' / 'pdf' / 'image' / 'other'

    // ==================== CACHE ELEMEN ====================
    let E = {};
    function cacheElements() {
        E = {
            // Sub tab buttons
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
            channel: document.getElementById('customerPreferredChannel'),
            notes: document.getElementById('customerNotes'),
            tags: document.getElementById('customerTags'),
            formTitle: document.getElementById('custdetailFormTitle'),
            saveBtn: document.getElementById('custDetailSaveBtn'),
            resetBtn: document.getElementById('custDetailResetBtn'),

            // Daftar Pelanggan
            detailSearch: document.getElementById('custDetailSearch'),
            detailFilterChannel: document.getElementById('custDetailFilterChannel'),
            detailFilterType: document.getElementById('custDetailFilterType'),
            applyDetailFilter: document.getElementById('applyCustDetailFilter'),
            exportDetailCSV: document.getElementById('exportCustDetailCSV'),
            detailTableBody: document.getElementById('customerDetailTableBody'),

            // Riwayat Transaksi
            historySearch: document.getElementById('custHistorySearch'),
            historyStart: document.getElementById('custHistoryStart'),
            historyEnd: document.getElementById('custHistoryEnd'),
            applyHistoryFilter: document.getElementById('applyCustHistoryFilter'),
            exportHistoryCSV: document.getElementById('exportCustHistoryCSV'),
            historyTableBody: document.getElementById('custHistoryTableBody'),
            historyProductFilter: document.getElementById('custHistoryProductFilter'),

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
            addNoteBtn: document.getElementById('custAddNoteBtn'),
            notesList: document.getElementById('custNotesList'),
            noteSortBtn: document.getElementById('custNoteSortBtn'),

            // Dokumen
            docInput: document.getElementById('custDocInput'),
            docCustomerSelect: document.getElementById('custDocCustomerSelect'),
            docTypeSelect: document.getElementById('custDocTypeSelect'),
            addDocBtn: document.getElementById('custAddDocBtn'),
            docList: document.getElementById('custDocList'),
            docFilterSelect: document.getElementById('custDocFilterSelect'),

            // Stats
            cdTotalPelanggan: document.getElementById('cdTotalPelanggan'),
            cdPelangganAktif: document.getElementById('cdPelangganAktif'),
            cdTopSpender: document.getElementById('cdTopSpender'),
            cdRataBelanja: document.getElementById('cdRataBelanja'),
        };
    }

    // ==================== HELPER ====================
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

                // Inisialisasi konten sesuai sub tab
                switch (tabId) {
                    case 'custdetail-list': renderCustomerTable(); break;
                    case 'custdetail-history': renderHistory(); break;
                    case 'custdetail-analysis': renderAnalysis(); break;
                    case 'custdetail-notes': renderNotes(); break;
                    case 'custdetail-documents': renderDocuments(); break;
                }
            });
        });
    }

    // ==================== STATISTIK ====================
    function refreshStats() {
        const customers = Storage.getCustomers();
        const names = Object.keys(customers);
        const total = names.length;
        const today = getToday();
        const monthStart = getMonthStart();
        const active30 = names.filter(n => customers[n].lastPurchase && customers[n].lastPurchase >= new Date(Date.now() - 30*86400000).toISOString().split('T')[0]).length;
        const totalSpentAll = names.reduce((sum, n) => sum + (customers[n].totalSpent || 0), 0);
        const avg = total > 0 ? Math.round(totalSpentAll / total) : 0;
        const topSpender = names.sort((a, b) => (customers[b].totalSpent || 0) - (customers[a].totalSpent || 0))[0] || '-';

        if (E.cdTotalPelanggan) E.cdTotalPelanggan.textContent = total;
        if (E.cdPelangganAktif) E.cdPelangganAktif.textContent = active30;
        if (E.cdTopSpender) E.cdTopSpender.textContent = topSpender;
        if (E.cdRataBelanja) E.cdRataBelanja.textContent = formatRupiah(avg);
    }

    // ==================== FORM PELANGGAN ====================
    function resetForm() {
        if (E.form) E.form.reset();
        if (E.formTitle) E.formTitle.textContent = 'Tambah Pelanggan Baru';
        if (E.saveBtn) E.saveBtn.textContent = 'Simpan Pelanggan';
        if (E.tags) E.tags.value = '';
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const name = E.fullName?.value.trim();
        if (!name) {
            window.showToast?.('Error', 'Nama pelanggan wajib diisi.', 'error');
            return;
        }
        const detail = {
            phone: E.phone?.value || '',
            email: E.email?.value || '',
            address: E.address?.value || '',
            ktp: E.ktp?.value || '',
            npwp: E.npwp?.value || '',
            type: E.type?.value || 'ecer',
            preferredChannel: E.channel?.value || 'offline',
            notes: E.notes?.value || '',
            tags: (E.tags?.value || '').split(',').map(t => t.trim()).filter(Boolean)
        };
        await Storage.saveCustomerDetail(name, detail);
        window.showToast?.('Sukses', `Detail pelanggan "${name}" disimpan.`, 'success');
        resetForm();
        refreshStats();
        renderCustomerTable();
    }

    function editCustomer(name) {
        const customer = Storage.getCustomers()[name];
        if (!customer) return;

        // Pindah ke sub tab form
        const formBtn = document.querySelector('[data-custdetail-tab="custdetail-form"]');
        if (formBtn) {
            E.subTabBtns.forEach(b => { b.classList.remove('btn-primary', 'active'); b.classList.add('btn-secondary'); });
            formBtn.classList.add('btn-primary', 'active');
            formBtn.classList.remove('btn-secondary');
            E.subTabContents.forEach(c => c.classList.add('hidden'));
            document.getElementById('custdetail-form')?.classList.remove('hidden');
            currentSubTab = 'custdetail-form';
        }

        cacheElements();
        if (E.fullName) E.fullName.value = name;
        if (E.phone) E.phone.value = customer.phone || '';
        if (E.email) E.email.value = customer.email || '';
        if (E.address) E.address.value = customer.address || '';
        if (E.ktp) E.ktp.value = customer.ktp || '';
        if (E.npwp) E.npwp.value = customer.npwp || '';
        if (E.type) E.type.value = customer.type || 'ecer';
        if (E.channel) E.channel.value = customer.preferredChannel || 'offline';
        if (E.notes) E.notes.value = customer.notes || '';
        if (E.tags) E.tags.value = (customer.tags || []).join(', ');
        if (E.formTitle) E.formTitle.textContent = `Edit Pelanggan: ${name}`;
        if (E.saveBtn) E.saveBtn.textContent = '💾 Perbarui';
    }

    async function deleteCustomer(name) {
        if (!confirm(`Hapus semua data pelanggan "${name}"?`)) return;
        await Storage.deleteCustomer(name);
        refreshStats();
        renderCustomerTable();
        window.showToast?.('Sukses', `Pelanggan "${name}" dihapus.`, 'success');
    }

    // ==================== DAFTAR PELANGGAN ====================
    function renderCustomerTable() {
        if (!E.detailTableBody) return;
        const customers = Storage.getCustomers();
        let names = Object.keys(customers);

        // Filter
        const search = (E.detailSearch?.value || '').toLowerCase();
        const channelFilter = E.detailFilterChannel?.value || '';
        const typeFilter = E.detailFilterType?.value || '';

        if (search) {
            names = names.filter(n =>
                n.toLowerCase().includes(search) ||
                (customers[n].phone || '').includes(search) ||
                (customers[n].email || '').toLowerCase().includes(search)
            );
        }
        if (channelFilter) names = names.filter(n => (customers[n].preferredChannel || customers[n].channel || 'offline') === channelFilter);
        if (typeFilter) names = names.filter(n => (customers[n].type || 'ecer') === typeFilter);

        names.sort((a, b) => a.localeCompare(b, 'id'));

        if (names.length === 0) {
            E.detailTableBody.innerHTML = '<tr><td colspan="7" class="text-center p-4 opacity-50">Tidak ada data pelanggan.</td></tr>';
            return;
        }

        E.detailTableBody.innerHTML = names.map(name => {
            const c = customers[name];
            return `
                <tr class="border-t hover:bg-slate-50 dark:hover:bg-slate-700 text-sm">
                    <td class="p-2 font-medium">${escapeHtml(name)}</td>
                    <td class="p-2">${c.phone || '-'}</td>
                    <td class="p-2">${c.email || '-'}</td>
                    <td class="p-2">${c.type || 'ecer'}</td>
                    <td class="p-2">${c.preferredChannel === 'online' ? '🌐 Online' : '🏪 Offline'}</td>
                    <td class="p-2">${(c.tags || []).join(', ') || '-'}</td>
                    <td class="p-2 text-center">
                        <button class="btn btn-xs btn-secondary" onclick="CFS.CRMDetail.editCustomer('${escapeHtml(name)}')" title="Edit"><i class="ph ph-pencil"></i></button>
                        <button class="btn btn-xs btn-danger" onclick="CFS.CRMDetail.deleteCustomer('${escapeHtml(name)}')" title="Hapus"><i class="ph ph-trash"></i></button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // ==================== RIWAYAT TRANSAKSI ====================
    function renderHistory() {
        if (!E.historyTableBody) return;
        let sales = Storage.getSales();
        const search = (E.historySearch?.value || '').toLowerCase();
        const start = E.historyStart?.value || '';
        const end = E.historyEnd?.value || '';
        const productFilter = E.historyProductFilter?.value || '';

        if (search) sales = sales.filter(s => s.klien.toLowerCase().includes(search));
        if (start) sales = sales.filter(s => s.tanggal >= start);
        if (end) sales = sales.filter(s => s.tanggal <= end);
        if (productFilter) sales = sales.filter(s => s.produk === productFilter);

        sales.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

        if (sales.length === 0) {
            E.historyTableBody.innerHTML = '<tr><td colspan="6" class="text-center p-4 opacity-50">Tidak ada riwayat transaksi.</td></tr>';
            return;
        }

        E.historyTableBody.innerHTML = sales.map(s => {
            const total = (s.qty * s.hargaJual) - (s.diskon || 0);
            return `<tr class="border-t text-sm">
                <td class="p-2">${s.tanggal}</td>
                <td class="p-2">${escapeHtml(s.klien)}</td>
                <td class="p-2">${s.produk}</td>
                <td class="p-2 text-right">${s.qty} kg</td>
                <td class="p-2 text-right">${formatRupiah(total)}</td>
                <td class="p-2">${s.channel === 'online' ? '🌐' : '🏪'}</td>
            </tr>`;
        }).join('');
    }

    function populateHistoryProductFilter() {
        if (!E.historyProductFilter) return;
        const products = Storage.getProducts().length ? Storage.getProducts().map(p => p.name) : Storage.defaultProducts;
        E.historyProductFilter.innerHTML = '<option value="">Semua Produk</option>' + products.map(p => `<option value="${p}">${p}</option>`).join('');
    }

    // ==================== ANALISIS ====================
    let channelChart = null, top5Chart = null, growthChart = null;

    function renderAnalysis() {
        const customers = Storage.getCustomers();
        const names = Object.keys(customers);

        // 1. Channel distribution
        const channelCount = { online: 0, offline: 0 };
        names.forEach(n => {
            const ch = customers[n].preferredChannel || customers[n].channel || 'offline';
            channelCount[ch] = (channelCount[ch] || 0) + 1;
        });
        const ctxChannel = E.chartCustChannel?.getContext('2d');
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

        // 2. Top 5 customers
        const top5 = names.map(n => ({ name: n, total: customers[n].totalSpent || 0 }))
                          .sort((a, b) => b.total - a.total)
                          .slice(0, 5);
        const ctxTop5 = E.chartCustTop5?.getContext('2d');
        if (ctxTop5) {
            if (top5Chart) top5Chart.destroy();
            top5Chart = new Chart(ctxTop5, {
                type: 'bar',
                data: {
                    labels: top5.map(c => c.name),
                    datasets: [{ label: 'Total Pembelian', data: top5.map(c => c.total), backgroundColor: '#2563eb' }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: { y: { ticks: { callback: val => formatRupiah(val) } } }
                }
            });
        }

        // 3. Growth (pelanggan baru per bulan)
        const monthLabels = [];
        const newPerMonth = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const label = d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
            monthLabels.push(label);
            const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
            const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
            const newCount = names.filter(n => {
                const firstPurchase = customers[n].firstPurchase || customers[n].lastPurchase;
                return firstPurchase && firstPurchase >= monthStart && firstPurchase <= monthEnd;
            }).length;
            newPerMonth.push(newCount);
        }
        const ctxGrowth = E.chartCustGrowth?.getContext('2d');
        if (ctxGrowth) {
            if (growthChart) growthChart.destroy();
            growthChart = new Chart(ctxGrowth, {
                type: 'line',
                data: {
                    labels: monthLabels,
                    datasets: [{ label: 'Pelanggan Baru', data: newPerMonth, borderColor: '#22c55e', tension: 0.3, fill: true, backgroundColor: 'rgba(34,197,94,0.1)' }]
                },
                options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
            });
        }

        // 4. Quick stats
        const thisMonthStart = getMonthStart();
        const newThisMonth = names.filter(n => {
            const first = customers[n].firstPurchase || customers[n].lastPurchase;
            return first && first >= thisMonthStart;
        }).length;
        const totalTrx = names.reduce((sum, n) => sum + (customers[n].transactionCount || 0), 0);
        const avgFrequency = names.length > 0 ? (totalTrx / names.length).toFixed(1) : 0;
        const totalSpent = names.reduce((sum, n) => sum + (customers[n].totalSpent || 0), 0);
        const avgSpent = names.length > 0 ? Math.round(totalSpent / names.length) : 0;
        if (E.anaNewThisMonth) E.anaNewThisMonth.textContent = newThisMonth;
        if (E.anaAvgFrequency) E.anaAvgFrequency.textContent = avgFrequency;
        if (E.anaAvgSpent) E.anaAvgSpent.textContent = formatRupiah(avgSpent);
    }

    // ==================== CATATAN INTERNAL ====================
    async function renderNotes() {
        if (!E.notesList) return;
        await loadNotes();
        let sorted = [...customerNotes];
        if (noteSortOrder === 'asc') sorted.sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));
        else sorted.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

        if (sorted.length === 0) {
            E.notesList.innerHTML = '<p class="text-sm opacity-50">Belum ada catatan.</p>';
        } else {
            E.notesList.innerHTML = sorted.map(note => `
                <div class="p-2 border rounded text-sm mb-2">
                    <div class="flex justify-between">
                        <strong>${escapeHtml(note.customer)}</strong>
                        <span class="text-xs opacity-50">${new Date(note.tanggal).toLocaleString('id-ID')}</span>
                    </div>
                    <p class="mt-1">${escapeHtml(note.konten)}</p>
                    <button class="text-xs text-red-500 mt-1" onclick="CFS.CRMDetail.deleteNote('${note.id}')"><i class="ph ph-trash"></i> Hapus</button>
                </div>
            `).join('');
        }
        populateNoteCustomerSelect();
    }

    async function loadNotes() {
        customerNotes = (await localforage.getItem('cfs_customer_notes')) || [];
    }
    async function saveNotes() {
        await localforage.setItem('cfs_customer_notes', customerNotes);
    }
    async function addNote() {
        const customer = E.noteCustomerSelect?.value;
        const konten = E.noteInput?.value.trim();
        if (!customer || !konten) return;
        customerNotes.push({
            id: 'note_' + Date.now(),
            customer,
            konten,
            tanggal: new Date().toISOString()
        });
        await saveNotes();
        if (E.noteInput) E.noteInput.value = '';
        renderNotes();
        window.showToast?.('Sukses', 'Catatan ditambahkan.', 'success');
    }
    async function deleteNote(id) {
        customerNotes = customerNotes.filter(n => n.id !== id);
        await saveNotes();
        renderNotes();
    }
    function toggleNoteSort() {
        noteSortOrder = noteSortOrder === 'desc' ? 'asc' : 'desc';
        if (E.noteSortBtn) E.noteSortBtn.textContent = noteSortOrder === 'desc' ? '↓ Terbaru' : '↑ Terlama';
        renderNotes();
    }
    function populateNoteCustomerSelect() {
        if (!E.noteCustomerSelect) return;
        const names = Object.keys(Storage.getCustomers());
        E.noteCustomerSelect.innerHTML = '<option value="">Pilih Pelanggan</option>' + names.map(n => `<option value="${n}">${n}</option>`).join('');
    }

    // ==================== DOKUMEN ====================
    async function renderDocuments() {
        if (!E.docList) return;
        await loadDocuments();
        let filtered = [...customerDocuments];
        if (documentFilter !== 'all') filtered = filtered.filter(d => d.tipe === documentFilter);
        if (filtered.length === 0) {
            E.docList.innerHTML = '<p class="text-sm opacity-50">Belum ada dokumen.</p>';
        } else {
            E.docList.innerHTML = filtered.map(doc => `
                <div class="p-2 border rounded text-sm mb-2 flex justify-between items-center">
                    <div>
                        <strong>${escapeHtml(doc.customer)}</strong> - ${doc.namaFile}
                        <span class="badge text-xs ml-2">${doc.tipe}</span>
                    </div>
                    <div>
                        <a href="${doc.url}" target="_blank" class="btn btn-xs btn-secondary mr-1">Lihat</a>
                        <button class="btn btn-xs btn-danger" onclick="CFS.CRMDetail.deleteDocument('${doc.id}')">🗑️</button>
                    </div>
                </div>
            `).join('');
        }
        populateDocCustomerSelect();
    }

    async function loadDocuments() {
        customerDocuments = (await localforage.getItem('cfs_customer_documents')) || [];
    }
    async function saveDocuments() {
        await localforage.setItem('cfs_customer_documents', customerDocuments);
    }
    async function addDocument() {
        const customer = E.docCustomerSelect?.value;
        const fileInput = E.docInput;
        const tipe = E.docTypeSelect?.value || 'other';
        if (!customer || !fileInput.files || fileInput.files.length === 0) return;
        const file = fileInput.files[0];
        // Simulasi URL (baca sebagai data URL)
        const reader = new FileReader();
        reader.onload = async (ev) => {
            customerDocuments.push({
                id: 'doc_' + Date.now(),
                customer,
                namaFile: file.name,
                url: ev.target.result,
                tipe
            });
            await saveDocuments();
            renderDocuments();
            window.showToast?.('Sukses', 'Dokumen ditambahkan.', 'success');
        };
        reader.readAsDataURL(file);
    }
    async function deleteDocument(id) {
        customerDocuments = customerDocuments.filter(d => d.id !== id);
        await saveDocuments();
        renderDocuments();
    }
    function populateDocCustomerSelect() {
        if (!E.docCustomerSelect) return;
        const names = Object.keys(Storage.getCustomers());
        E.docCustomerSelect.innerHTML = '<option value="">Pilih Pelanggan</option>' + names.map(n => `<option value="${n}">${n}</option>`).join('');
    }

    // ==================== EVENT BINDING ====================
    function bindEvents() {
        if (E.form && !E.form.dataset.listener) {
            E.form.addEventListener('submit', handleSubmit);
            E.form.dataset.listener = 'true';
        }
        if (E.resetBtn) E.resetBtn.addEventListener('click', resetForm);
        if (E.applyDetailFilter) E.applyDetailFilter.addEventListener('click', renderCustomerTable);
        if (E.exportDetailCSV) {
            E.exportDetailCSV.addEventListener('click', () => {
                const customers = Storage.getCustomers();
                const names = Object.keys(customers);
                const csv = 'Nama,Telepon,Email,KTP,Tipe,Channel,Tags\n' +
                    names.map(n => {
                        const c = customers[n];
                        return `"${n}","${c.phone||''}","${c.email||''}","${c.ktp||''}","${c.type||''}","${c.preferredChannel||'offline'}","${(c.tags||[]).join(';')}"`;
                    }).join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `pelanggan_detail_${new Date().toISOString().slice(0,10)}.csv`;
                a.click();
                window.showToast?.('Sukses', 'Data diekspor.', 'success');
            });
        }
        if (E.applyHistoryFilter) E.applyHistoryFilter.addEventListener('click', renderHistory);
        if (E.exportHistoryCSV) {
            E.exportHistoryCSV.addEventListener('click', () => {
                const sales = Storage.getSales();
                const csv = 'Tanggal,Klien,Produk,Qty,Total,Channel\n' +
                    sales.map(s => `${s.tanggal},"${s.klien}","${s.produk}",${s.qty},${(s.qty*s.hargaJual)-(s.diskon||0)},${s.channel}`).join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `riwayat_pelanggan_${new Date().toISOString().slice(0,10)}.csv`;
                a.click();
                window.showToast?.('Sukses', 'Riwayat diekspor.', 'success');
            });
        }
        if (E.addNoteBtn) E.addNoteBtn.addEventListener('click', addNote);
        if (E.noteSortBtn) E.noteSortBtn.addEventListener('click', toggleNoteSort);
        if (E.addDocBtn) E.addDocBtn.addEventListener('click', addDocument);
        if (E.docFilterSelect) {
            E.docFilterSelect.addEventListener('change', function () {
                documentFilter = this.value;
                renderDocuments();
            });
        }
    }

    // ==================== INIT ====================
    async function init() {
        cacheElements();
        setupSubTabs();
        bindEvents();
        refreshStats();
        populateHistoryProductFilter();
        populateNoteCustomerSelect();
        populateDocCustomerSelect();
        renderCustomerTable();
    }

    // ==================== EXPORT ====================
    CFS.CRMDetail = {
        init,
        editCustomer,
        deleteCustomer,
        deleteNote,
        deleteDocument
    };
})();
