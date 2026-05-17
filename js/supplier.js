/* ============================================================
   Cibitung Frozen ERP Ultimate v5.4 — Supplier Module
   ============================================================ */
window.CFS = window.CFS || {};
(function() {
    'use strict';
    const Storage = CFS.Storage;
    let chartSupplier = null;

    let elements = {};
    function cacheElements() {
        elements = {
            supTotalSupplier: document.getElementById('supTotalSupplier'),
            supTotalPO: document.getElementById('supTotalPO'),
            supTopSupplier: document.getElementById('supTopSupplier'),
            supTotalValue: document.getElementById('supTotalValue'),
            supSearch: document.getElementById('supSearch'),
            applySupFilter: document.getElementById('applySupFilter'),
            exportSupCSV: document.getElementById('exportSupCSV'),
            supplierTableBody: document.getElementById('supplierTableBody'),
            supEditId: document.getElementById('supEditId'),
            supplierName: document.getElementById('supplierName'),
            supplierContact: document.getElementById('supplierContact'),
            supplierAddress: document.getElementById('supplierAddress'),
            supplierEmail: document.getElementById('supplierEmail'),
            supplierBank: document.getElementById('supplierBank'),
            supplierNPWP: document.getElementById('supplierNPWP'),
            supplierNotes: document.getElementById('supplierNotes'),
            supplierForm: document.getElementById('supplierForm'),
            supSubmitBtn: document.getElementById('supSubmitBtn'),
            supCancelEditBtn: document.getElementById('supCancelEditBtn'),
            supFormTitle: document.getElementById('supFormTitle'),
            supHistorySupplier: document.getElementById('supHistorySupplier'),
            supHistoryStart: document.getElementById('supHistoryStart'),
            supHistoryEnd: document.getElementById('supHistoryEnd'),
            applySupHistoryFilter: document.getElementById('applySupHistoryFilter'),
            supHistoryTableBody: document.getElementById('supHistoryTableBody'),
            supAnalysisTopTable: document.getElementById('supAnalysisTopTable'),
            chartSupplierPurchase: document.getElementById('chartSupplierPurchase'),
        };
    }

    async function initSupplierTab() {
        cacheElements();
        setupSubTabs();
        refreshStats();
        renderSupplierTable();
        populateSupplierDropdowns();
        bindEvents();
    }

    function setupSubTabs() {
        document.querySelectorAll('.supplier-subtab-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.supplier-subtab-btn').forEach(b => { b.classList.remove('btn-primary','active'); b.classList.add('btn-secondary'); });
                this.classList.add('btn-primary','active'); this.classList.remove('btn-secondary');
                const tab = this.dataset.supplierTab;
                document.querySelectorAll('.supplier-subtab-content').forEach(c => c.classList.add('hidden'));
                document.getElementById(tab)?.classList.remove('hidden');
                if (tab === 'supplier-analysis') renderAnalysis();
                if (tab === 'supplier-history') populateSupplierDropdowns();
            });
        });
    }

    function refreshStats() {
        const sups = Storage.getSuppliers();
        const batches = Storage.getBatches();
        // Total PO = jumlah batch yang punya supplier
        const poCount = batches.filter(b => b.supplier).length;
        let totalValue = 0;
        const supplierVolume = {};
        batches.forEach(b => {
            if (b.supplier) {
                const val = (b.berat * b.hargaBeli) + (b.ongkir || 0) + (b.bensin || 0) + (b.bongkar || 0);
                totalValue += val;
                supplierVolume[b.supplier] = (supplierVolume[b.supplier] || 0) + b.berat;
            }
        });
        let topSupplier = '-';
        let topVol = 0;
        Object.entries(supplierVolume).forEach(([sid, vol]) => {
            if (vol > topVol) { topVol = vol; const sup = sups.find(s => s.id === sid); topSupplier = sup ? sup.name : sid; }
        });
        if (elements.supTotalSupplier) elements.supTotalSupplier.textContent = sups.length;
        if (elements.supTotalPO) elements.supTotalPO.textContent = poCount;
        if (elements.supTopSupplier) elements.supTopSupplier.textContent = topSupplier;
        if (elements.supTotalValue) elements.supTotalValue.textContent = 'Rp ' + totalValue.toLocaleString('id-ID');
    }

    function renderSupplierTable(filter = '') {
        const tbody = elements.supplierTableBody;
        if (!tbody) return;
        let sups = Storage.getSuppliers();
        if (filter) {
            const kw = filter.toLowerCase();
            sups = sups.filter(s => s.name.toLowerCase().includes(kw));
        }
        if (sups.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center p-4 opacity-50">Tidak ada supplier.</td></tr>';
            return;
        }
        tbody.innerHTML = sups.map(s => `
            <tr class="border-t hover:bg-slate-50 dark:hover:bg-slate-700">
                <td class="p-2 font-medium">${s.name}</td>
                <td class="p-2">${s.contact || '-'}</td>
                <td class="p-2 text-xs">${s.address || '-'}</td>
                <td class="p-2">${s.email || '-'}</td>
                <td class="p-2 text-right">${s.totalPO || 0}</td>
                <td class="p-2 text-center">
                    <button class="btn btn-xs btn-secondary" onclick="CFS.Supplier.edit('${s.id}')">✏️</button>
                    <button class="btn btn-xs btn-danger" onclick="CFS.Supplier.remove('${s.id}')">🗑️</button>
                </td>
            </tr>
        `).join('');
    }

    function populateSupplierDropdowns() {
        const sups = Storage.getSuppliers();
        const options = sups.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        const selectHistory = elements.supHistorySupplier;
        if (selectHistory) selectHistory.innerHTML = '<option value="">Semua Supplier</option>' + options;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const id = elements.supEditId.value;
        const name = elements.supplierName.value.trim();
        if (!name) { showToast('Error','Nama wajib diisi.','error'); return; }
        const data = {
            name,
            contact: elements.supplierContact.value.trim(),
            address: elements.supplierAddress.value.trim(),
            email: elements.supplierEmail.value.trim(),
            bank: elements.supplierBank.value.trim(),
            npwp: elements.supplierNPWP.value.trim(),
            notes: elements.supplierNotes.value.trim(),
        };
        if (id) {
            // Update
            const sups = Storage.getSuppliers();
            const sup = sups.find(s => s.id === id);
            if (sup) { Object.assign(sup, data); await Storage.saveAllData(); showToast('Sukses','Supplier diperbarui.','success'); }
        } else {
            await Storage.addSupplier(data);
            showToast('Sukses','Supplier ditambahkan.','success');
        }
        cancelEdit();
        refreshStats();
        renderSupplierTable();
        populateSupplierDropdowns();
        if (CFS.Dashboard) CFS.Dashboard.refresh();
    }

    function editSupplier(id) {
        const sup = Storage.getSuppliers().find(s => s.id === id);
        if (!sup) return;
        document.querySelectorAll('.supplier-subtab-btn').forEach(b => { b.classList.remove('btn-primary','active'); b.classList.add('btn-secondary'); });
        const btn = document.querySelector('[data-supplier-tab="supplier-form"]');
        if (btn) { btn.classList.add('btn-primary','active'); btn.classList.remove('btn-secondary'); }
        document.querySelectorAll('.supplier-subtab-content').forEach(c => c.classList.add('hidden'));
        document.getElementById('supplier-form')?.classList.remove('hidden');
        elements.supEditId.value = sup.id;
        elements.supplierName.value = sup.name;
        elements.supplierContact.value = sup.contact || '';
        elements.supplierAddress.value = sup.address || '';
        elements.supplierEmail.value = sup.email || '';
        elements.supplierBank.value = sup.bank || '';
        elements.supplierNPWP.value = sup.npwp || '';
        elements.supplierNotes.value = sup.notes || '';
        elements.supFormTitle.textContent = 'Edit Supplier';
        elements.supSubmitBtn.textContent = '💾 Simpan Perubahan';
        elements.supCancelEditBtn.style.display = 'inline-flex';
    }

    function cancelEdit() {
        elements.supplierForm.reset();
        elements.supEditId.value = '';
        elements.supFormTitle.textContent = 'Tambah Supplier Baru';
        elements.supSubmitBtn.textContent = '➕ Tambah Supplier';
        elements.supCancelEditBtn.style.display = 'none';
    }

    async function deleteSupplier(id) {
        if (!confirm('Hapus supplier? Data batch yang terkait tidak akan terhapus.')) return;
        await Storage.deleteSupplier(id);
        refreshStats();
        renderSupplierTable();
        populateSupplierDropdowns();
        showToast('Sukses','Supplier dihapus.','success');
    }

    function renderHistory() {
        const tbody = elements.supHistoryTableBody;
        if (!tbody) return;
        const filterSup = elements.supHistorySupplier?.value || '';
        const start = elements.supHistoryStart?.value || '1970-01-01';
        const end = elements.supHistoryEnd?.value || '2099-12-31';
        const batches = Storage.getBatches().filter(b => b.supplier && b.tglProduksi >= start && b.tglProduksi <= end && (!filterSup || b.supplier === filterSup));
        const sups = Storage.getSuppliers();
        tbody.innerHTML = batches.length === 0 ? '<tr><td colspan="5" class="text-center p-4 opacity-50">Tidak ada riwayat.</td></tr>' :
        batches.map(b => {
            const sup = sups.find(s => s.id === b.supplier);
            const total = (b.berat * b.hargaBeli) + (b.ongkir||0) + (b.bensin||0) + (b.bongkar||0);
            return `<tr class="border-t">
                <td class="p-2">${b.tglProduksi}</td>
                <td class="p-2">${sup?.name || b.supplier}</td>
                <td class="p-2">${b.produk}</td>
                <td class="p-2 text-right">${b.berat} kg</td>
                <td class="p-2 text-right">Rp ${total.toLocaleString('id-ID')}</td>
            </tr>`;
        }).join('');
    }

    function renderAnalysis() {
        const tbody = elements.supAnalysisTopTable;
        const batches = Storage.getBatches().filter(b => b.supplier);
        const sups = Storage.getSuppliers();
        const map = {};
        batches.forEach(b => {
            if (!map[b.supplier]) map[b.supplier] = { qty: 0, value: 0 };
            map[b.supplier].qty += b.berat;
            map[b.supplier].value += (b.berat * b.hargaBeli) + (b.ongkir||0) + (b.bensin||0) + (b.bongkar||0);
        });
        const sorted = Object.entries(map).sort((a,b) => b[1].qty - a[1].qty).slice(0, 10);
        if (tbody) {
            tbody.innerHTML = sorted.map(([sid, d]) => {
                const sup = sups.find(s => s.id === sid);
                return `<tr class="border-t"><td class="p-2">${sup?.name || sid}</td><td class="p-2 text-right">${d.qty} kg</td><td class="p-2 text-right">Rp ${d.value.toLocaleString('id-ID')}</td></tr>`;
            }).join('') || '<tr><td colspan="3" class="text-center p-4 opacity-50">-</td></tr>';
        }
        // Chart
        const ctx = elements.chartSupplierPurchase?.getContext('2d');
        if (ctx && sorted.length) {
            if (chartSupplier) chartSupplier.destroy();
            chartSupplier = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: sorted.map(([sid]) => { const s = sups.find(x => x.id === sid); return s ? s.name : sid; }),
                    datasets: [{ label: 'Volume (kg)', data: sorted.map(([,d]) => d.qty), backgroundColor: '#6366f1', borderRadius: 4 }]
                },
                options: { responsive: true, plugins: { legend: { display: false } } }
            });
        }
    }

    function bindEvents() {
        elements.supplierForm?.addEventListener('submit', handleSubmit);
        elements.supCancelEditBtn?.addEventListener('click', cancelEdit);
        elements.applySupFilter?.addEventListener('click', () => renderSupplierTable(elements.supSearch.value));
        elements.exportSupCSV?.addEventListener('click', () => {
            const sups = Storage.getSuppliers();
            const csv = 'Nama,Kontak,Alamat,Email,Bank,NPWP\n' + sups.map(s => `"${s.name}","${s.contact||''}","${s.address||''}","${s.email||''}","${s.bank||''}","${s.npwp||''}"`).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'supplier.csv'; a.click();
            showToast('Sukses','CSV diunduh.','success');
        });
        elements.applySupHistoryFilter?.addEventListener('click', renderHistory);
    }

    CFS.Supplier = { init: initSupplierTab, edit: editSupplier, remove: deleteSupplier };
})();
