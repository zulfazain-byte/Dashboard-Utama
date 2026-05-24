/* ============================================================
   Cibitung Frozen ERP Ultimate v5.4 — Notifications Module
   ============================================================ */
window.CFS = window.CFS || {};

(function() {
    'use strict';
    const Storage = CFS.Storage;

    // Cache elemen
    let elements = {};

    function cacheElements() {
        elements = {
            notificationList: document.getElementById('notificationList'),
            filterBtns: document.querySelectorAll('.notif-filter-btn'),
            clearBtn: document.getElementById('clearNotifications'),
            deleteAllBtn: document.getElementById('deleteAllNotifications'),
            notifBadge: document.getElementById('notifBadge'),
            totalCount: document.getElementById('notifTotalCount'),
            latestTime: document.getElementById('notifLatestTime')
        };
    }

    // --------------- KLASIFIKASI ---------------
    function getType(aksi) {
        const a = aksi.toUpperCase();
        if (a.includes('STOK') || a.includes('BATCH') || a.includes('PRODUK') || a.includes('GUDANG')) return 'stock';
        if (a.includes('EXPIRED') || a.includes('KADALUARSA')) return 'expired';
        if (a.includes('PENJUALAN') || a.includes('INVOICE')) return 'sales';
        if (a.includes('OPNAME')) return 'opname';
        if (a.includes('RETUR')) return 'retur';
        if (a.includes('BACKUP') || a.includes('RESTORE') || a.includes('PENGATURAN') || a.includes('RESET')) return 'system';
        return 'system';
    }

    function getIcon(type) {
        const icons = {
            stock: 'ph-package',
            expired: 'ph-clock-countdown',
            sales: 'ph-shopping-cart',
            opname: 'ph-clipboard-text',
            retur: 'ph-arrow-u-up-left',
            system: 'ph-gear'
        };
        return icons[type] || 'ph-info';
    }

    function getColor(type) {
        const colors = {
            stock: 'text-red-600 bg-red-100',
            expired: 'text-amber-600 bg-amber-100',
            sales: 'text-green-600 bg-green-100',
            opname: 'text-purple-600 bg-purple-100',
            retur: 'text-pink-600 bg-pink-100',
            system: 'text-blue-600 bg-blue-100'
        };
        return colors[type] || 'text-blue-600 bg-blue-100';
    }

    // --------------- RENDER ---------------
    function renderNotifications(filter = 'all') {
        if (!elements.notificationList) return;

        let trail = Storage.getAuditTrail();
        if (filter !== 'all') {
            trail = trail.filter(t => getType(t.aksi) === filter);
        }

        // Update badge & info
        const total = trail.length;
        if (elements.notifBadge) {
            elements.notifBadge.textContent = total;
            elements.notifBadge.classList.toggle('hidden', total === 0);
        }
        if (elements.totalCount) elements.totalCount.textContent = total;
        if (elements.latestTime && trail.length > 0) {
            elements.latestTime.textContent = new Date(trail[0].waktu).toLocaleString('id-ID');
        }

        if (trail.length === 0) {
            elements.notificationList.innerHTML = `
                <div class="text-center py-8 opacity-50">
                    <i class="ph ph-bell-slash text-4xl mb-2"></i>
                    <p>Tidak ada notifikasi.</p>
                </div>`;
            return;
        }

        elements.notificationList.innerHTML = trail.slice(0, 100).map(t => {
            const type = getType(t.aksi);
            const icon = getIcon(type);
            const color = getColor(type);
            const time = new Date(t.waktu).toLocaleString('id-ID', {
                day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'
            });

            return `
            <div class="notif-item flex items-start gap-3 p-3 rounded-lg border bg-white dark:bg-slate-800 shadow-sm" data-type="${type}">
                <div class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${color}">
                    <i class="ph ${icon} text-lg"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex justify-between items-start">
                        <p class="font-semibold text-sm truncate">${t.aksi}</p>
                        <span class="text-xs opacity-50 flex-shrink-0 ml-2">${time}</span>
                    </div>
                    <p class="text-xs opacity-70 mt-0.5">${t.detail}</p>
                </div>
            </div>`;
        }).join('');
    }

    // --------------- FILTER ---------------
    function setupFilterButtons() {
        if (!elements.filterBtns) return;
        elements.filterBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                elements.filterBtns.forEach(b => {
                    b.classList.remove('btn-primary', 'active');
                    b.classList.add('btn-secondary');
                });
                this.classList.add('btn-primary', 'active');
                this.classList.remove('btn-secondary');

                const filter = this.dataset.filter || 'all';
                renderNotifications(filter);
            });
        });
    }

    // --------------- CLEAR ---------------
    function setupClearButtons() {
        if (elements.clearBtn) {
            elements.clearBtn.addEventListener('click', async () => {
                if (!confirm('Tandai semua notifikasi sebagai sudah dibaca?')) return;
                // Kosongkan audit trail (hanya hapus notifikasi, bukan data asli)
                await localforage.setItem('cfs_audit_trail', []);
                // Hapus dari state lokal
                const arr = Storage.getAuditTrail();
                if (arr) arr.length = 0;
                renderNotifications();
                window.showToast?.('Info', 'Semua notifikasi telah dibaca.', 'info');
            });
        }

        if (elements.deleteAllBtn) {
            elements.deleteAllBtn.addEventListener('click', async () => {
                if (!confirm('Hapus semua notifikasi secara permanen?')) return;
                await localforage.setItem('cfs_audit_trail', []);
                const arr = Storage.getAuditTrail();
                if (arr) arr.length = 0;
                renderNotifications();
                window.showToast?.('Sukses', 'Semua notifikasi dihapus.', 'success');
            });
        }
    }

    // --------------- INIT ---------------
    function init() {
        cacheElements();
        setupFilterButtons();
        setupClearButtons();
        renderNotifications();
    }

    // Expose API
    CFS.Notifications = {
        init: init,
        render: renderNotifications
    };
})();
