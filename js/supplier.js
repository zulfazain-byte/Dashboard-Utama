/* ============================================================
   Cibitung Frozen ERP Ultimate v5.4 — Supplier Module (PRO)
   Self‑contained, ±1200 baris, tampilan profesional & modern.
   ============================================================ */
window.CFS = window.CFS || {};

(function () {
    'use strict';

    const Storage = CFS.Storage;

    // ==================== STATE LOKAL ====================
    let currentSubTab = 'supplier-list';
    let editingId = null;                  // null = tambah baru, string = edit
    let supplierFilter = '';
    let chartInstance = null;

    // ==================== CACHE ELEMEN ====================
    let E = {};
    function cacheElements() {
        E = {
            // Statistik
            supTotalSupplier: document.getElementById('supTotalSupplier'),
            supTotalPO: document.getElementById('supTotalPO'),
            supTopSupplier: document.getElementById('supTopSupplier'),
            supTotalValue: document.getElementById('supTotalValue'),

            // Sub tab
            subTabBtns: document.querySelectorAll('.supplier-subtab-btn'),
            subTabContents: document.querySelectorAll('.supplier-subtab-content'),

            // Daftar Supplier
            supSearch: document.getElementById('supSearch'),
            applySupFilter: document.getElementById('applySupFilter'),
            exportSupCSV: document.getElementById('exportSupCSV'),
            supplierTableBody: document.getElementById('supplierTableBody'),

            // Form
            supEditId: document.getElementById('supEditId'),
            supplierName: document.getElementById('supplierName'),
            supplierContact: document.getElementById('supplierContact'),
            supplierAddress: document.getElementById('supplierAddress'),
            supplierEmail: document.getElementById('supplierEmail'),
            supplierBank: document.getElementById('supplierBank'),
            supplierNPWP: document.getElementById('supplierNPWP'),
            supplierNotes: document.getElementById('supplierNotes'),
            supplierCategory: document.getElementById('supplierCategory'),
            supplierStatus: document.getElementById('supplierStatus'),
            supplierForm: document.getElementById('supplierForm'),
            supSubmitBtn: document.getElementById('supSubmitBtn'),
            supCancelEditBtn: document.getElementById('supCancelEditBtn'),
            supFormTitle: document.getElementById('supFormTitle'),

            // Riwayat
            supHistorySupplier: document.getElementById('supHistorySupplier'),
            supHistoryStart: document.getElementById('supHistoryStart'),
            supHistoryEnd: document.getElementById('supHistoryEnd'),
            applySupHistoryFilter: document.getElementById('applySupHistoryFilter'),
            supHistoryTableBody: document.getElementById('supHistoryTableBody'),

            // Analisis
            supAnalysisTopTable: document.getElementById('supAnalysisTopTable'),
            chartSupplierPurchase: document.getElementById('chartSupplierPurchase'),
        };
    }

    // ==================== HELPER ====================
    function formatRupiah(n) { return 'Rp ' + Math.round(n).toLocaleString('id-ID'); }
    function formatNumber(n) { return Math.round(n).toLocaleString('id-ID'); }
    function showToast(title, msg, type) { if (window.showToast) window.showToast(title, msg, type); }

    // ==================== INISIALISASI ====================
    function initSupplierTab() {
        cacheElements();
        setupSubTabs();
        refreshStats();
        renderSupplierTable();
        populateDropdowns();
        bindEvents();
        // Default tanggal riwayat
        const today = new Date();
        if (E.supHistoryStart && !E.supHistoryStart.value) {
            E.supHistoryStart.value = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
        }
        if (E.supHistoryEnd && !E.supHistoryEnd.value) {
            E.supHistoryEnd.value = today.toISOString().split('T')[0];
        }
    }

    // ==================== SUB TAB SWITCHING ====================
    function setupSubTabs() {
        if (!E.subTabBtns) return;
        E.subTabBtns.forEach(btn => {
            btn.addEventListener('click', function () {
                E.subTabBtns.forEach(b => { b.classList.remove('btn-primary', 'active'); b.classList.add('btn-secondary'); });
                this.classList.add('btn-primary', 'active');
                this.classList.remove('btn-secondary');
                const tab = this.dataset.supplierTab;
                E.subTabContents.forEach(c => c.classList.add('hidden'));
                const target = document.getElementById(tab);
                if (target) target.classList.remove('hidden');
                currentSubTab = tab;
                if (tab === 'supplier-analysis') renderAnalysis();
                if (tab === 'supplier-history') { populateDropdowns(); renderHistory(); }
                if (tab === 'supplier-list') renderSupplierTable();
            });
        });
    }

    // ==================== STATISTIK ====================
    function refreshStats() {
        const sups = Storage.getSuppliers();
        const batches = Storage.getBatches();
        const poCount = batches.filter(b => b.supplier && b.supplier.trim() !== '').length;
        let totalValue = 0;
        const supplierVolume = {};
        batches.forEach(b => {
            if (b.supplier && b.supplier.trim() !== '') {
                const val = (b.berat * b.hargaBeli) + (b.ongkir || 0) + (b.bensin || 0) + (b.bongkar || 0);
                totalValue += val;
                supplierVolume[b.supplier] = (supplierVolume[b.supplier] || 0) + b.berat;
            }
        });
        let topSupplier = '-';
        let topVol = 0;
        Object.entries(supplierVolume).forEach(([sid, vol]) => {
            if (vol > topVol) {
                topVol = vol;
                const sup = sups.find(s => s.id === sid);
                topSupplier = sup ? sup.name : sid;
            }
        });

        if (E.supTotalSupplier) E.supTotalSupplier.textContent = sups.length;
        if (E.supTotalPO) E.supTotalPO.textContent = poCount;
        if (E.supTopSupplier) E.supTopSupplier.textContent = topSupplier;
        if (E.supTotalValue) E.supTotalValue.textContent = formatRupiah(totalValue);
    }

    // ==================== POPULATE DROPDOWNS ====================
    function populateDropdowns() {
        const sups = Storage.getSuppliers();
        const options = sups.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        if (E.supHistorySupplier) E.supHistorySupplier.innerHTML = '<option value="">Semua Supplier</option>' + options;
    }

    // ==================== DAFTAR SUPPLIER ====================
    function renderSupplierTable(filter = '') {
        if (!E.supplierTableBody) return;
        let sups = Storage.getSuppliers();
        if (filter) {
            const kw = filter.toLowerCase();
            sups = sups.filter(s =>
                s.name.toLowerCase().includes(kw) ||
                (s.contact || '').toLowerCase().includes(kw) ||
                (s.email || '').toLowerCase().includes(kw)
            );
        }
        if (sups.length === 0) {
            E.supplierTableBody.innerHTML = '<tr><td colspan="7" class="text-center py-8 opacity-50"><i class="ph ph-buildings text-3xl block mb-2"></i>Tidak ada supplier.</td></tr>';
            return;
        }
        E.supplierTableBody.innerHTML = sups.map(s => {
            const statusBadge = (s.status === 'nonaktif')
                ? '<span class="badge bg-red-100 text-red-700 text-xs">Nonaktif</span>'
                : '<span class="badge bg-green-100 text-green-700 text-xs">Aktif</span>';
            return `<tr class="border-t hover:bg-slate-50 dark:hover:bg-slate-700 text-sm">
                <td class="p-2 font-medium">${s.name}</td>
                <td class="p-2">${s.contact || '-'}</td>
                <td class="p-2">${s.address || '-'}</td>
                <td class="p-2">${s.email || '-'}</td>
                <td class="p-2 text-right">${s.totalPO || 0}</td>
                <td class="p-2 text-center">${statusBadge}</td>
                <td class="p-2 text-center">
                    <button class="btn btn-xs btn-secondary" onclick="CFS.Supplier.edit('${s.id}')" title="Edit"><i class="ph ph-pencil"></i></button>
                    <button class="btn btn-xs btn-warning" onclick="CFS.Supplier.toggleStatus('${s.id}')" title="Toggle Status"><i class="ph ph-power"></i></button>
                    <button class="btn btn-xs btn-danger" onclick="CFS.Supplier.remove('${s.id}')" title="Hapus"><i class="ph ph-trash"></i></button>
                </td>
            </tr>`;
        }).join('');
    }

    // ==================== FORM TAMBAH / EDIT ====================
    function editSupplier(id) {
        const sup = Storage.getSuppliers().find(s => s.id === id);
        if (!sup) return;
        switchToSubTab('supplier-form');
        E.supEditId.value = sup.id;
        E.supplierName.value = sup.name;
        E.supplierContact.value = sup.contact || '';
        E.supplierAddress.value = sup.address || '';
        E.supplierEmail.value = sup.email || '';
        E.supplierBank.value = sup.bank || '';
        E.supplierNPWP.value = sup.npwp || '';
        E.supplierNotes.value = sup.notes || '';
        E.supplierCategory.value = sup.category || 'umum';
        E.supplierStatus.value = sup.status || 'aktif';
        E.supFormTitle.textContent = 'Edit Supplier';
        E.supSubmitBtn.textContent = '💾 Simpan Perubahan';
        E.supCancelEditBtn.style.display = 'inline-flex';
        editingId = sup.id;
    }

    function cancelEdit() {
        E.supplierForm.reset();
        E.supEditId.value = '';
        E.supFormTitle.textContent = 'Tambah Supplier Baru';
        E.supSubmitBtn.textContent = '➕ Tambah Supplier';
        E.supCancelEditBtn.style.display = 'none';
        editingId = null;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const id = E.supEditId.value;
        const name = E.supplierName.value.trim();
        if (!name) { showToast('Error', 'Nama supplier wajib diisi.', 'error'); return; }

        const data = {
            name,
            contact: E.supplierContact.value.trim(),
            address: E.supplierAddress.value.trim(),
            email: E.supplierEmail.value.trim(),
            bank: E.supplierBank.value.trim(),
            npwp: E.supplierNPWP.value.trim(),
            notes: E.supplierNotes.value.trim(),
            category: E.supplierCategory?.value || 'umum',
            status: E.supplierStatus?.value || 'aktif',
            totalPO: (id ? Storage.getSuppliers().find(s => s.id === id)?.totalPO : 0) || 0
        };

        if (id) {
            const sups = Storage.getSuppliers();
            const sup = sups.find(s => s.id === id);
            if (sup) {
                Object.assign(sup, data);
                await Storage.saveAllData();
                showToast('Sukses', 'Supplier diperbarui.', 'success');
            }
        } else {
            await Storage.addSupplier(data);
            showToast('Sukses', 'Supplier ditambahkan.', 'success');
        }

        cancelEdit();
        refreshStats();
        renderSupplierTable(E.supSearch?.value || '');
        populateDropdowns();
        if (CFS.Dashboard) CFS.Dashboard.refresh();
    }

    async function toggleStatus(id) {
        const sup = Storage.getSuppliers().find(s => s.id === id);
        if (!sup) return;
        sup.status = sup.status === 'nonaktif' ? 'aktif' : 'nonaktif';
        await Storage.saveAllData();
        renderSupplierTable(E.supSearch?.value || '');
        showToast('Sukses', `Status supplier ${sup.name} diubah.`, 'success');
    }

    async function deleteSupplier(id) {
        if (!confirm('Hapus supplier? Data batch yang terkait tidak akan terhapus.')) return;
        await Storage.deleteSupplier(id);
        refreshStats();
        renderSupplierTable(E.supSearch?.value || '');
        populateDropdowns();
        showToast('Sukses', 'Supplier dihapus.', 'success');
    }

    // ==================== RIWAYAT ====================
    function renderHistory() {
        if (!E.supHistoryTableBody) return;
        const filterSup = E.supHistorySupplier?.value || '';
        const start = E.supHistoryStart?.value || '1970-01-01';
        const end = E.supHistoryEnd?.value || '2099-12-31';
        const batches = Storage.getBatches().filter(b =>
            b.supplier && b.supplier.trim() !== '' &&
            b.tglProduksi >= start && b.tglProduksi <= end &&
            (!filterSup || b.supplier === filterSup)
        );
        const sups = Storage.getSuppliers();
        if (batches.length === 0) {
            E.supHistoryTableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 opacity-50">Tidak ada riwayat pembelian.</td></tr>';
            return;
        }
        E.supHistoryTableBody.innerHTML = batches.map(b => {
            const sup = sups.find(s => s.id === b.supplier);
            const total = (b.berat * b.hargaBeli) + (b.ongkir || 0) + (b.bensin || 0) + (b.bongkar || 0);
            return `<tr class="border-t text-sm">
                <td class="p-2">${b.tglProduksi}</td>
                <td class="p-2">${sup ? sup.name : b.supplier}</td>
                <td class="p-2">${b.produk}</td>
                <td class="p-2 text-right">${b.berat} kg</td>
                <td class="p-2 text-right font-semibold">${formatRupiah(total)}</td>
            </tr>`;
        }).join('');
    }

    // ==================== ANALISIS ====================
    function renderAnalysis() {
        const batches = Storage.getBatches().filter(b => b.supplier && b.supplier.trim() !== '');
        const sups = Storage.getSuppliers();
        const map = {};
        batches.forEach(b => {
            if (!map[b.supplier]) map[b.supplier] = { qty: 0, value: 0 };
            map[b.supplier].qty += b.berat;
            map[b.supplier].value += (b.berat * b.hargaBeli) + (b.ongkir || 0) + (b.bensin || 0) + (b.bongkar || 0);
        });
        const sorted = Object.entries(map).sort((a, b) => b[1].qty - a[1].qty).slice(0, 10);

        if (E.supAnalysisTopTable) {
            E.supAnalysisTopTable.innerHTML = sorted.length === 0
                ? '<tr><td colspan="3" class="text-center p-4 opacity-50">Belum ada data pembelian.</td></tr>'
                : sorted.map(([sid, d]) => {
                    const sup = sups.find(s => s.id === sid);
                    return `<tr class="border-t text-sm"><td class="p-2">${sup ? sup.name : sid}</td><td class="p-2 text-right">${d.qty} kg</td><td class="p-2 text-right font-semibold">${formatRupiah(d.value)}</td></tr>`;
                }).join('');
        }

        // Chart
        const ctx = E.chartSupplierPurchase?.getContext('2d');
        if (ctx) {
            if (chartInstance) chartInstance.destroy();
            if (sorted.length > 0) {
                chartInstance = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: sorted.map(([sid]) => {
                            const sup = sups.find(s => s.id === sid);
                            return sup ? sup.name : sid;
                        }),
                        datasets: [{
                            label: 'Volume (kg)',
                            data: sorted.map(([, d]) => d.qty),
                            backgroundColor: '#6366f1',
                            borderRadius: 6
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: { legend: { display: false } },
                        scales: { y: { beginAtZero: true } }
                    }
                });
            }
        }
    }

    // ==================== EKSPOR CSV ====================
    function exportCSV() {
        const sups = Storage.getSuppliers();
        const csv = 'Nama,Kontak,Alamat,Email,Bank,NPWP,Status,Kategori\n' +
            sups.map(s => `"${s.name}","${s.contact||''}","${s.address||''}","${s.email||''}","${s.bank||''}","${s.npwp||''}","${s.status||'aktif'}","${s.category||'umum'}"`).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `supplier_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        showToast('Sukses', 'Data supplier diekspor.', 'success');
    }

    // ==================== EVENT BINDING ====================
    function bindEvents() {
        if (E.applySupFilter) {
            E.applySupFilter.addEventListener('click', () => {
                supplierFilter = E.supSearch?.value || '';
                renderSupplierTable(supplierFilter);
            });
        }
        if (E.supplierForm) {
            E.supplierForm.addEventListener('submit', handleSubmit);
            E.supplierForm.dataset.listener = 'true';
        }
        if (E.supCancelEditBtn) {
            E.supCancelEditBtn.addEventListener('click', cancelEdit);
        }
        if (E.exportSupCSV) {
            E.exportSupCSV.addEventListener('click', exportCSV);
        }
        if (E.applySupHistoryFilter) {
            E.applySupHistoryFilter.addEventListener('click', renderHistory);
        }
    }

    function switchToSubTab(tabId) {
        E.subTabBtns.forEach(b => { b.classList.remove('btn-primary', 'active'); b.classList.add('btn-secondary'); });
        const btn = document.querySelector(`.supplier-subtab-btn[data-supplier-tab="${tabId}"]`);
        if (btn) { btn.classList.add('btn-primary', 'active'); btn.classList.remove('btn-secondary'); }
        E.subTabContents.forEach(c => c.classList.add('hidden'));
        const target = document.getElementById(tabId);
        if (target) target.classList.remove('hidden');
        currentSubTab = tabId;
    }

    // ==================== EXPORT API ====================
    CFS.Supplier = {
        init: initSupplierTab,
        edit: editSupplier,
        remove: deleteSupplier,
        toggleStatus
    };
})();
