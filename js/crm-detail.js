/* ============================================================
   Cibitung Frozen ERP Ultimate v5.4 — CRM Detail Module
   Mengelola tab Detail Pelanggan (form + tabel)
   ============================================================ */
window.CFS = window.CFS || {};

(function() {
    'use strict';

    const Storage = CFS.Storage;

    // Cache elemen
    let elements = {};

    function cacheElements() {
        elements = {
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
            tableBody: document.getElementById('customerDetailTableBody')
        };
    }

    /**
     * Render tabel daftar pelanggan dengan data lengkap.
     */
    function renderTable() {
        if (!elements.tableBody) return;

        const customers = Storage.getCustomers();
        const names = Object.keys(customers);

        if (names.length === 0) {
            elements.tableBody.innerHTML = '<tr><td colspan="7" class="text-center p-4 opacity-50">Belum ada data pelanggan.</td></tr>';
            return;
        }

        elements.tableBody.innerHTML = names.map(name => {
            const c = customers[name];
            return `
                <tr class="border-t hover:bg-slate-50 dark:hover:bg-slate-700 transition text-sm">
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

    /**
     * Isi form dengan data pelanggan untuk diedit.
     */
    function editCustomer(name) {
        const customer = Storage.getCustomers()[name];
        if (!customer) return;

        cacheElements(); // pastikan elemen tersedia

        if (elements.fullName) elements.fullName.value = name;
        if (elements.phone) elements.phone.value = customer.phone || '';
        if (elements.email) elements.email.value = customer.email || '';
        if (elements.address) elements.address.value = customer.address || '';
        if (elements.ktp) elements.ktp.value = customer.ktp || '';
        if (elements.npwp) elements.npwp.value = customer.npwp || '';
        if (elements.type) elements.type.value = customer.type || 'ecer';
        if (elements.channel) elements.channel.value = customer.preferredChannel || 'offline';
        if (elements.notes) elements.notes.value = customer.notes || '';

        // Ganti judul form (opsional)
        const formTitle = document.getElementById('custdetailFormTitle');
        if (formTitle) formTitle.textContent = 'Edit Pelanggan: ' + name;
    }

    /**
     * Hapus pelanggan.
     */
    async function deleteCustomer(name) {
        if (!confirm(`Hapus semua data pelanggan "${name}"?`)) return;

        await Storage.deleteCustomer(name);
        renderTable();
        if (typeof showToast === 'function') {
            showToast('Sukses', `Pelanggan "${name}" dihapus.`, 'success');
        }
    }

    /**
     * Handler submit form.
     */
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
        if (typeof showToast === 'function') {
            showToast('Sukses', `Detail pelanggan "${name}" disimpan.`, 'success');
        }

        // Reset form & refresh tabel
        elements.form.reset();
        const formTitle = document.getElementById('custdetailFormTitle');
        if (formTitle) formTitle.textContent = 'Tambah / Edit Pelanggan';
        renderTable();
    }

    /**
     * Inisialisasi tab Detail Pelanggan.
     */
    function init() {
        cacheElements();

        // Event listener untuk form
        if (elements.form) {
            elements.form.addEventListener('submit', handleSubmit);
            elements.form.dataset.listener = 'true'; // penanda agar tidak di-bind ulang
        }

        // Render tabel awal
        renderTable();
    }

    // Expose API ke global
    CFS.CRMDetail = {
        init: init,
        renderTable: renderTable,
        editCustomer: editCustomer,
        deleteCustomer: deleteCustomer
    };

})();
