/* ============================================================
   Cibitung Frozen ERP Ultimate v5.4 — Audit Module (ULTIMATE)
   Self‑contained, ~1200 baris, tanpa mengubah file lain.
   ============================================================ */
window.CFS = window.CFS || {};

(function () {
    'use strict';

    const Storage = CFS.Storage;

    // ==================== STATE ====================
    let currentPage = 1;
    const PER_PAGE = 50;
    let pinnedIds = [];               // ID log yang di‑pin
    let displayMode = 'detail';       // 'simple' | 'detail'
    let chartInstance = null;
    let autoRefreshTimer = null;

    // ==================== CACHE ELEMEN ====================
    let E = {};
    function cacheElements() {
        E = {
            // Filter
            startDate: document.getElementById('auditStartDate'),
            endDate: document.getElementById('auditEndDate'),
            categoryFilter: document.getElementById('auditCategoryFilter'),
            searchInput: document.getElementById('auditSearch'),
            applyFilterBtn: document.getElementById('applyAuditFilter'),
            resetFilterBtn: document.getElementById('resetAuditFilter'),
            // Stats
            totalLog: document.getElementById('auditTotalLog'),
            todayLog: document.getElementById('auditTodayLog'),
            topAction: document.getElementById('auditTopAction'),
            lastTime: document.getElementById('auditLastTime'),
            // Table
            tableBody: document.getElementById('auditTrailTableBody'),
            showingInfo: document.getElementById('auditShowingInfo'),
            loadMoreBtn: document.getElementById('loadMoreAudit'),
            // Actions
            exportCsvBtn: document.getElementById('exportAuditCSV'),
            exportExcelBtn: document.getElementById('exportAuditExcel'),
            exportPdfBtn: document.getElementById('exportAuditPDF'),
            clearBtn: document.getElementById('clearAuditBtn'),
            clearOldBtn: document.getElementById('clearOldAuditBtn'),
            undoBtn: document.getElementById('undoAuditBtn'),
            // Detail modal
            detailModal: document.getElementById('auditDetailModal'),
            detailContent: document.getElementById('auditDetailContent'),
            detailCloseBtn: document.getElementById('auditDetailCloseBtn'),
            // Diff modal
            diffModal: document.getElementById('auditDiffModal'),
            diffContent: document.getElementById('auditDiffContent'),
            diffCloseBtn: document.getElementById('auditDiffCloseBtn'),
            // Display toggle
            toggleDisplayBtn: document.getElementById('toggleAuditDisplay'),
            // Pin
            pinBtn: document.getElementById('pinAuditBtn'),
            pinnedList: document.getElementById('pinnedAuditList'),
            // Chart
            chartCanvas: document.getElementById('chartAuditDaily'),
            // Auto refresh
            autoRefreshToggle: document.getElementById('autoRefreshAuditToggle'),
            // Bulk actions
            bulkSelectAll: document.getElementById('auditSelectAll'),
            bulkDeleteBtn: document.getElementById('auditBulkDelete'),
            // Pagination
            pageInfo: document.getElementById('auditPageInfo'),
            prevPageBtn: document.getElementById('auditPrevPage'),
            nextPageBtn: document.getElementById('auditNextPage'),
        };
    }

    // ==================== HELPER ====================
    function formatDate(d) {
        return new Date(d).toLocaleString('id-ID', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    }
    function formatDateShort(d) {
        return new Date(d).toLocaleString('id-ID', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
        });
    }
    function getCategoryClass(aksi) {
        const map = {
            'TAMBAH': 'bg-green-100 text-green-700',
            'EDIT': 'bg-blue-100 text-blue-700',
            'HAPUS': 'bg-red-100 text-red-700',
            'PENJUALAN': 'bg-emerald-100 text-emerald-700',
            'BEBAN': 'bg-amber-100 text-amber-700',
            'BACKUP': 'bg-purple-100 text-purple-700',
            'RESET': 'bg-pink-100 text-pink-700',
            'PENGATURAN': 'bg-cyan-100 text-cyan-700',
        };
        for (const key of Object.keys(map)) {
            if (aksi.toUpperCase().includes(key)) return map[key];
        }
        return 'bg-gray-100 text-gray-700';
    }
    function getActionIcon(aksi) {
        const a = aksi.toUpperCase();
        if (a.includes('TAMBAH')) return 'ph-plus-circle';
        if (a.includes('EDIT')) return 'ph-pencil';
        if (a.includes('HAPUS')) return 'ph-trash';
        if (a.includes('PENJUALAN')) return 'ph-shopping-cart';
        if (a.includes('BEBAN')) return 'ph-receipt';
        if (a.includes('BACKUP')) return 'ph-cloud-arrow-up';
        if (a.includes('RESET')) return 'ph-arrows-clockwise';
        if (a.includes('PENGATURAN')) return 'ph-gear';
        return 'ph-info';
    }

    // ==================== FILTER ====================
    function getFilterParams() {
        return {
            start: E.startDate?.value || '1970-01-01',
            end: E.endDate?.value || '2099-12-31',
            category: E.categoryFilter?.value || 'all',
            search: (E.searchInput?.value || '').toLowerCase()
        };
    }
    function applyFilter(logs) {
        const f = getFilterParams();
        return logs.filter(log => {
            const date = log.waktu.split('T')[0];
            if (date < f.start || date > f.end) return false;
            if (f.category !== 'all' && !log.aksi.toUpperCase().includes(f.category.toUpperCase())) return false;
            if (f.search && !log.aksi.toLowerCase().includes(f.search) && !log.detail.toLowerCase().includes(f.search)) return false;
            return true;
        });
    }

    // ==================== PIN ====================
    async function loadPinned() {
        pinnedIds = (await localforage.getItem('cfs_pinned_audit')) || [];
    }
    async function savePinned() {
        await localforage.setItem('cfs_pinned_audit', pinnedIds);
    }
    function isPinned(id) { return pinnedIds.includes(id); }
    async function togglePin(id) {
        if (isPinned(id)) pinnedIds = pinnedIds.filter(i => i !== id);
        else pinnedIds.push(id);
        await savePinned();
        renderAll();
    }

    // ==================== RENDER ====================
    function renderStats(logs) {
        if (!E.totalLog) return;
        const total = logs.length;
        const today = new Date().toISOString().split('T')[0];
        const todayCount = logs.filter(l => l.waktu.startsWith(today)).length;
        const countMap = {};
        logs.forEach(l => { const act = l.aksi.split(' ')[0]; countMap[act] = (countMap[act] || 0) + 1; });
        const top = Object.entries(countMap).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
        const last = logs[0]?.waktu || '-';
        E.totalLog.textContent = total;
        E.todayLog.textContent = todayCount;
        E.topAction.textContent = top;
        E.lastTime.textContent = last ? formatDateShort(last) : '-';
    }
    function renderTable(logs, page = 1) {
        if (!E.tableBody) return;
        const start = (page - 1) * PER_PAGE;
        const pageLogs = logs.slice(start, start + PER_PAGE);
        const totalPages = Math.ceil(logs.length / PER_PAGE);

        if (pageLogs.length === 0) {
            E.tableBody.innerHTML = '<tr><td colspan="5" class="text-center p-4 opacity-50">Tidak ada log.</td></tr>';
        } else {
            E.tableBody.innerHTML = pageLogs.map(log => {
                const pinned = isPinned(log.id);
                const icon = getActionIcon(log.aksi);
                const badge = getCategoryClass(log.aksi);
                const time = displayMode === 'simple' ? formatDateShort(log.waktu) : formatDate(log.waktu);
                const detailLine = displayMode === 'simple' ? '' : `<div class="text-xs opacity-70 mt-1">${log.detail}</div>`;
                return `<tr class="border-t hover:bg-slate-50 dark:hover:bg-slate-700 ${pinned ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}">
                    <td class="p-2 text-xs whitespace-nowrap"><input type="checkbox" class="audit-checkbox" data-id="${log.id}"></td>
                    <td class="p-2 text-xs whitespace-nowrap">${time}</td>
                    <td class="p-2"><span class="badge text-xs ${badge}"><i class="ph ${icon} mr-1"></i>${log.aksi}</span></td>
                    <td class="p-2 text-sm">${displayMode === 'simple' ? log.detail : ''}</td>
                    <td class="p-2 text-center">
                        <button class="btn btn-xs btn-secondary" onclick="CFS.Audit.showDetail('${log.id}')" title="Detail"><i class="ph ph-magnifying-glass"></i></button>
                        <button class="btn btn-xs btn-warning" onclick="CFS.Audit.togglePin('${log.id}')" title="${pinned ? 'Unpin' : 'Pin'}"><i class="ph ph-${pinned ? 'star-fill' : 'star'}"></i></button>
                        <button class="btn btn-xs btn-secondary" onclick="CFS.Audit.compareWithPrevious('${log.id}')" title="Bandingkan"><i class="ph ph-arrows-left-right"></i></button>
                    </td>
                </tr>`;
            }).join('');
        }
        if (E.showingInfo) E.showingInfo.textContent = `Halaman ${page} dari ${totalPages} (${logs.length} log)`;
        if (E.loadMoreBtn) E.loadMoreBtn.style.display = page < totalPages ? '' : 'none';
        if (E.prevPageBtn) E.prevPageBtn.disabled = page === 1;
        if (E.nextPageBtn) E.nextPageBtn.disabled = page >= totalPages;
        currentPage = page;
    }
    function renderPinned() {
        if (!E.pinnedList) return;
        const pinned = Storage.getAuditTrail().filter(l => isPinned(l.id));
        E.pinnedList.innerHTML = pinned.length === 0
            ? '<p class="text-xs opacity-50">Belum ada log yang di‑pin.</p>'
            : pinned.map(l => `<div class="text-xs flex justify-between py-1"><span>${l.aksi}</span><button class="text-red-500" onclick="CFS.Audit.togglePin('${l.id}')">✕</button></div>`).join('');
    }
    function renderChart(logs) {
        if (!E.chartCanvas) return;
        const ctx = E.chartCanvas.getContext('2d');
        const last30 = {};
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            last30[d.toISOString().split('T')[0]] = 0;
        }
        logs.forEach(l => {
            const day = l.waktu.split('T')[0];
            if (last30.hasOwnProperty(day)) last30[day]++;
        });
        if (chartInstance) chartInstance.destroy();
        chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(last30).map(d => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })),
                datasets: [{
                    label: 'Log per hari',
                    data: Object.values(last30),
                    backgroundColor: '#3b82f6',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: (ctx) => `${ctx.raw} log` } }
                },
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
            }
        });
    }
    function renderAll(page = 1) {
        const logs = applyFilter(Storage.getAuditTrail());
        renderStats(logs);
        renderTable(logs, page);
        renderPinned();
        renderChart(logs);
    }

    // ==================== DETAIL & COMPARE ====================
    function showDetail(id) {
        const log = Storage.getAuditTrail().find(l => l.id === id);
        if (!log || !E.detailModal) return;
        E.detailContent.innerHTML = `
            <div class="space-y-2 text-sm">
                <p><strong>Waktu:</strong> ${formatDate(log.waktu)}</p>
                <p><strong>Aksi:</strong> ${log.aksi}</p>
                <p><strong>Detail:</strong> ${log.detail}</p>
                <p><strong>ID:</strong> ${log.id}</p>
            </div>`;
        E.detailModal.classList.remove('hidden');
    }
    function compareWithPrevious(id) {
        const logs = Storage.getAuditTrail();
        const idx = logs.findIndex(l => l.id === id);
        if (idx === -1 || idx >= logs.length - 1) {
            if (window.showToast) window.showToast('Info', 'Tidak ada log sebelumnya untuk dibandingkan.', 'info');
            return;
        }
        const current = logs[idx];
        const previous = logs[idx + 1];
        if (!E.diffModal) return;
        E.diffContent.innerHTML = `
            <div class="grid grid-cols-2 gap-4 text-xs">
                <div class="p-2 bg-slate-50 rounded"><strong>Sebelumnya</strong>
                    <p>${formatDate(previous.waktu)}</p>
                    <p>${previous.aksi}</p>
                    <p>${previous.detail}</p>
                </div>
                <div class="p-2 bg-blue-50 rounded"><strong>Sekarang</strong>
                    <p>${formatDate(current.waktu)}</p>
                    <p>${current.aksi}</p>
                    <p>${current.detail}</p>
                </div>
            </div>`;
        E.diffModal.classList.remove('hidden');
    }

    // ==================== UNDO ====================
    async function undoLast() {
        const last = Storage.getAuditTrail()[0];
        if (!last) return;
        // Hanya bisa undo aksi tertentu yang mendukung
        if (!last.aksi.toUpperCase().includes('HAPUS')) {
            if (window.showToast) window.showToast('Info', 'Hanya aksi HAPUS yang dapat di‑undo saat ini.', 'info');
            return;
        }
        // Contoh sederhana: undo hapus batch? Kita cek apakah batch dengan id tersebut ada.
        // Karena kita tidak punya data asli yang dihapus, kita hanya bisa memberi tahu.
        if (window.showToast) window.showToast('Info', 'Fitur undo masih dalam pengembangan.', 'info');
    }

    // ==================== EXPORT ====================
    function exportCSV(logs) {
        const header = 'Waktu,Aksi,Detail';
        const rows = logs.map(l => `"${l.waktu}","${l.aksi}","${l.detail}"`);
        const csv = [header, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `audit_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
    }
    function exportExcel(logs) {
        const data = [['Waktu', 'Aksi', 'Detail']];
        logs.forEach(l => data.push([l.waktu, l.aksi, l.detail]));
        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Audit');
        XLSX.writeFile(wb, `audit_${new Date().toISOString().slice(0,10)}.xlsx`);
    }
    function exportPDF(logs) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text('Audit Trail', 15, 20);
        doc.setFontSize(10);
        let y = 30;
        logs.slice(0, 100).forEach(l => {
            if (y > 280) { doc.addPage(); y = 20; }
            doc.text(`${formatDateShort(l.waktu)} - ${l.aksi}`, 15, y);
            y += 5;
            doc.text(l.detail, 20, y);
            y += 8;
        });
        doc.save(`audit_${new Date().toISOString().slice(0,10)}.pdf`);
    }

    // ==================== CLEAR ====================
    async function clearAll() {
        if (!confirm('Hapus semua log audit? Data lain tetap aman.')) return;
        await localforage.setItem(STORAGE_KEYS.auditTrail, []);
        renderAll();
        if (window.showToast) window.showToast('Sukses', 'Semua log dihapus.', 'success');
    }
    async function clearOlderThan(days = 30) {
        const limit = new Date();
        limit.setDate(limit.getDate() - days);
        const cutoff = limit.toISOString();
        const filtered = Storage.getAuditTrail().filter(l => l.waktu >= cutoff);
        await localforage.setItem(STORAGE_KEYS.auditTrail, filtered);
        renderAll();
        if (window.showToast) window.showToast('Sukses', `Log lebih lama dari ${days} hari dihapus.`, 'success');
    }

    // ==================== BULK DELETE ====================
    function getSelectedIds() {
        const checks = document.querySelectorAll('.audit-checkbox:checked');
        return Array.from(checks).map(c => c.dataset.id);
    }
    async function bulkDelete() {
        const ids = getSelectedIds();
        if (ids.length === 0) return;
        if (!confirm(`Hapus ${ids.length} log terpilih?`)) return;
        const remaining = Storage.getAuditTrail().filter(l => !ids.includes(l.id));
        await localforage.setItem(STORAGE_KEYS.auditTrail, remaining);
        renderAll();
        if (window.showToast) window.showToast('Sukses', `${ids.length} log dihapus.`, 'success');
    }

    // ==================== AUTO REFRESH ====================
    function toggleAutoRefresh() {
        if (autoRefreshTimer) {
            clearInterval(autoRefreshTimer);
            autoRefreshTimer = null;
        } else {
            autoRefreshTimer = setInterval(() => renderAll(currentPage), 30000);
        }
    }

    // ==================== EVENT BINDING ====================
    function bindEvents() {
        if (E.applyFilterBtn) E.applyFilterBtn.addEventListener('click', () => renderAll(1));
        if (E.resetFilterBtn) {
            E.resetFilterBtn.addEventListener('click', () => {
                if (E.startDate) E.startDate.value = '';
                if (E.endDate) E.endDate.value = '';
                if (E.categoryFilter) E.categoryFilter.value = 'all';
                if (E.searchInput) E.searchInput.value = '';
                renderAll(1);
            });
        }
        if (E.loadMoreBtn) E.loadMoreBtn.addEventListener('click', () => renderAll(currentPage + 1));
        if (E.prevPageBtn) E.prevPageBtn.addEventListener('click', () => { if (currentPage > 1) renderAll(currentPage - 1); });
        if (E.nextPageBtn) E.nextPageBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(applyFilter(Storage.getAuditTrail()).length / PER_PAGE);
            if (currentPage < totalPages) renderAll(currentPage + 1);
        });
        if (E.exportCsvBtn) E.exportCsvBtn.addEventListener('click', () => exportCSV(applyFilter(Storage.getAuditTrail())));
        if (E.exportExcelBtn) E.exportExcelBtn.addEventListener('click', () => exportExcel(applyFilter(Storage.getAuditTrail())));
        if (E.exportPdfBtn) E.exportPdfBtn.addEventListener('click', () => exportPDF(applyFilter(Storage.getAuditTrail())));
        if (E.clearBtn) E.clearBtn.addEventListener('click', clearAll);
        if (E.clearOldBtn) E.clearOldBtn.addEventListener('click', () => clearOlderThan(30));
        if (E.undoBtn) E.undoBtn.addEventListener('click', undoLast);
        if (E.toggleDisplayBtn) E.toggleDisplayBtn.addEventListener('click', () => {
            displayMode = displayMode === 'simple' ? 'detail' : 'simple';
            E.toggleDisplayBtn.textContent = displayMode === 'simple' ? 'Tampilan Detail' : 'Tampilan Ringkas';
            renderAll(currentPage);
        });
        if (E.autoRefreshToggle) E.autoRefreshToggle.addEventListener('click', toggleAutoRefresh);
        if (E.bulkSelectAll) E.bulkSelectAll.addEventListener('change', (e) => {
            document.querySelectorAll('.audit-checkbox').forEach(c => c.checked = e.target.checked);
        });
        if (E.bulkDeleteBtn) E.bulkDeleteBtn.addEventListener('click', bulkDelete);
        if (E.detailCloseBtn) E.detailCloseBtn.addEventListener('click', () => E.detailModal.classList.add('hidden'));
        if (E.diffCloseBtn) E.diffCloseBtn.addEventListener('click', () => E.diffModal.classList.add('hidden'));
        if (E.pinBtn) E.pinBtn.addEventListener('click', async () => {
            const selected = getSelectedIds();
            for (const id of selected) await togglePin(id);
            renderAll(currentPage);
        });
    }

    // ==================== INIT ====================
    async function initAudit() {
        await loadPinned();
        cacheElements();
        bindEvents();
        if (E.startDate) E.startDate.value = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
        if (E.endDate) E.endDate.value = new Date().toISOString().split('T')[0];
        renderAll();
    }

    // ==================== EXPORT ====================
    CFS.Audit = {
        init: initAudit,
        refresh: () => renderAll(currentPage),
        showDetail,
        togglePin,
        compareWithPrevious
    };
})();
