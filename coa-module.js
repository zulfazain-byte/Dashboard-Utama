// ==================== CHART OF ACCOUNTS MODULE ====================

const coaData = JSON.parse(localStorage.getItem('coaData')) || [];

function renderCoaTable() {
    const tbody = document.getElementById('coaTableBody');
    
    if (!tbody) return; // Guard if element doesn't exist
    
    if (coaData.length === 0) {
        tbody.innerHTML = '<tr class="border-t"><td colspan="4" class="p-3 text-center text-gray-500">Belum ada data akun</td></tr>';
        return;
    }
    
    tbody.innerHTML = coaData.map((coa, index) => `
        <tr class="border-t hover:bg-gray-50 dark:hover:bg-slate-700 transition">
            <td class="p-3 font-semibold text-primary-600">${coa.kode}</td>
            <td class="p-3">${coa.nama}</td>
            <td class="p-3">
                <span class="badge bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    ${coa.tipe.charAt(0).toUpperCase() + coa.tipe.slice(1)}
                </span>
            </td>
            <td class="p-3 text-center flex gap-2 justify-center">
                <button onclick="editCoa(${index})" class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition font-bold">✏️</button>
                <button onclick="deleteCoa(${index})" class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition font-bold">🗑️</button>
            </td>
        </tr>
    `).join('');
}

function addCoa() {
    const kode = document.getElementById('newCoaKode')?.value.trim() || '';
    const nama = document.getElementById('newCoaNama')?.value.trim() || '';
    const tipe = document.getElementById('newCoaTipe')?.value.trim() || '';
    
    if (!kode || !nama || !tipe) {
        alert('❌ Mohon isi semua field (Kode, Nama, Tipe)');
        return;
    }
    
    // Cek duplikat kode
    if (coaData.some(coa => coa.kode === kode)) {
        alert('⚠️ Kode akun "' + kode + '" sudah ada!');
        return;
    }
    
    coaData.push({ kode, nama, tipe, createdAt: new Date().toISOString() });
    localStorage.setItem('coaData', JSON.stringify(coaData));
    
    // Reset form
    document.getElementById('newCoaKode').value = '';
    document.getElementById('newCoaNama').value = '';
    document.getElementById('newCoaTipe').value = '';
    
    renderCoaTable();
    alert('✅ Akun "' + nama + '" berhasil ditambahkan!');
}

function editCoa(index) {
    const coa = coaData[index];
    document.getElementById('newCoaKode').value = coa.kode;
    document.getElementById('newCoaNama').value = coa.nama;
    document.getElementById('newCoaTipe').value = coa.tipe;
    
    // Scroll ke form
    document.getElementById('newCoaKode').scrollIntoView({ behavior: 'smooth' });
    
    // Highlight form
    document.getElementById('newCoaKode').parentElement.parentElement.classList.add('ring-2', 'ring-yellow-500');
    
    deleteCoa(index, true);
}

function deleteCoa(index, isEdit = false) {
    if (!isEdit && !confirm('⚠️ Yakin ingin menghapus akun ini? Tindakan tidak dapat dibatalkan.')) {
        return;
    }
    
    const deletedName = coaData[index].nama;
    coaData.splice(index, 1);
    localStorage.setItem('coaData', JSON.stringify(coaData));
    renderCoaTable();
    
    if (!isEdit) {
        alert('✅ Akun "' + deletedName + '" berhasil dihapus!');
    }
}

function initCoaModule() {
    const addBtn = document.getElementById('addCoaBtn');
    if (addBtn) {
        addBtn.addEventListener('click', addCoa);
    }
    renderCoaTable();
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCoaModule);
} else {
    initCoaModule();
}
