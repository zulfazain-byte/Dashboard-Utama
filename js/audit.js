/* ============================================================
   Cibitung Frozen ERP Ultimate v5.4 — Audit Module
   Mengelola tampilan Audit Trail dengan filter dan statistik
   ============================================================ */
window.CFS = window.CFS || {};

(function() {
    'use strict';
    const Storage = CFS.Storage;

    function initAuditTab() {
        const startDateEl = document.getElementById('auditStartDate');
        const endDateEl = document.getElementById('auditEndDate');
        const categoryEl = document.getElementById('auditCategoryFilter');
        const searchEl = document.getElementById('auditSearch');
        const applyBtn = document.getElementById('applyAuditFilter');
        const exportBtn = document.getElementById('exportAuditCSV');
        const clearBtn = document.getElementById('clearAuditBtn');
        const tbody = document.getElementById('auditTrailTableBody');
        const totalLogEl = document.getElementById('auditTotalLog');
        const todayLogEl = document.getElementById('auditTodayLog');
        const topActionEl = document.getElementById('auditTopAction');
        const lastTimeEl = document.getElementById('auditLastTime');
        const showingInfo = document.getElementById('auditShowingInfo');
        const loadMoreBtn = document.getElementById('loadMoreAudit');

        // Set default tanggal (1 bulan terakhir)
        const today = new Date();
        const oneMonthAgo = new Date(today);
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        if (startDateEl) startDateEl.value = oneMonthAgo.toISOString().split('T')[0];
        if (endDateEl) endDateEl.value = today.toISOString().split('T')[0];

        let currentPage = 1;
        const perPage = 50;

        function renderAudit(resetPage = true) {
            if (resetPage) currentPage = 1;
            const startDate = startDateEl?.value || '1970-01-01';
            const endDate = endDateEl?.value || '2099-12-31';
            const category = categoryEl?.value || 'all';
            const search = (searchEl?.value || '').toLowerCase();

            let logs = Storage.getAuditTrail().filter(log => {
                const logDate = log.waktu.split('T')[0];
                if (logDate < startDate || logDate > endDate) return false;
                if (category !== 'all' && !log.aksi.includes(category)) return false;
                if (search && !log.aksi.toLowerCase().includes(search) && !log.detail.toLowerCase().includes(search)) return false;
                return true;
            });

            // Statistik
            const totalLog = logs.length;
            const todayStr = today.toISOString().split('T')[0];
            const todayLog = logs.filter(l => l.waktu.startsWith(todayStr)).length;
            const actionCount = {};
            logs.forEach(l => {
                const action = l.aksi.split(' ')[0];
                actionCount[action] = (actionCount[action] || 0) + 1;
            });
            const topAction = Object.entries(actionCount).sort((a,b) => b[1] - a[1])[0]?.[0] || '-';
            const lastTime = logs[0]?.waktu ? new Date(logs[0].waktu).toLocaleString('id-ID') : '-';

            if (totalLogEl) totalLogEl.textContent = totalLog;
            if (todayLogEl) todayLogEl.textContent = todayLog;
            if (topActionEl) topActionEl.textContent = topAction;
            if (lastTimeEl) lastTimeEl.textContent = lastTime;

            // Pagination
            const totalPages = Math.ceil(logs.length / perPage);
            const pageLogs = logs.slice(0, currentPage * perPage);

            if (tbody) {
                if (pageLogs.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="4" class="text-center p-4 opacity-50">Tidak ada log yang sesuai.</td></tr>';
                } else {
                    tbody.innerHTML = pageLogs.map(log => {
                        const time = new Date(log.waktu).toLocaleString('id-ID', {
                            day: 'numeric', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit', second: '2-digit'
                        });
                        const categoryBadge = log.aksi.includes('TAMBAH') ? 'bg-green-100 text-green-700' :
                            log.aksi.includes('EDIT') ? 'bg-blue-100 text-blue-700' :
                            log.aksi.includes('HAPUS') ? 'bg-red-100 text-red-700' :
                            log.aksi.includes('PENJUALAN') ? 'bg-emerald-100 text-emerald-700' :
                            log.aksi.includes('BEBAN') ? 'bg-amber-100 text-amber-700' :
                            log.aksi.includes('BACKUP') ? 'bg-purple-100 text-purple-700' :
                            log.aksi.includes('RESET') ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700';
                        return `<tr class="border-t hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                            <td class="p-2 text-xs">${time}</td>
                            <td class="p-2"><span class="badge text-xs ${categoryBadge}">${log.aksi}</span></td>
                            <td class="p-2">${log.detail}</td>
                            <td class="p-2 text-center"><button onclick="CFS.App.showToast('Detail','${log.detail.replace(/'/g, "\\'")}','info')" class="text-blue-500 text-xs">🔍</button></td>
                        </tr>`;
                    }).join('');
                }
            }

            if (showingInfo) {
                showingInfo.textContent = `Menampilkan ${pageLogs.length} dari ${totalLog} entri`;
            }
            if (loadMoreBtn) {
                loadMoreBtn.classList.toggle('hidden', currentPage >= totalPages);
            }
        }

        if (applyBtn) applyBtn.addEventListener('click', () => renderAudit(true));
        if (loadMoreBtn) loadMoreBtn.addEventListener('click', () => { currentPage++; renderAudit(false); });

        // Ekspor CSV
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                const logs = Storage.getAuditTrail();
                const csv = 'Waktu,Aksi,Detail\n' + logs.map(l => `"${new Date(l.waktu).toLocaleString('id-ID')}","${l.aksi}","${l.detail}"`).join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `audit_trail_${new Date().toISOString().slice(0,10)}.csv`;
                a.click();
                showToast('Sukses', 'Log audit diunduh sebagai CSV.', 'success');
            });
        }

        // Bersihkan log
        if (clearBtn) {
            clearBtn.addEventListener('click', async () => {
                if (confirm('Hapus semua log audit? Data lain tidak terpengaruh.')) {
                    await localforage.setItem('cfs_audit_trail', []);
                    Storage.getAuditTrail().length = 0;
                    renderAudit(true);
                    showToast('Sukses', 'Log audit dibersihkan.', 'success');
                }
            });
        }

        // Render awal
        renderAudit(true);
    }

    CFS.Audit = { init: initAuditTab };
})();
