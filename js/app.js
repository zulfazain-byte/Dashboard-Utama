window.CFS = window.CFS || {};

(function() {
    'use strict';

    const Storage = CFS.Storage;

    // Status inisialisasi modul
    const modulesInitialized = {
        dashboard: false,
        stock: false,
        sales: false,
        purchase: false,
        supplier: false,
        products: false,
        crm: false,
        crmDetail: false,
        pricing: false,
        finance: false,
        delivery: false,
        opname: false,
        return: false,
        history: false,
        audit: false,
        reports: false,
        notifications: false,
        settings: false,
        help: false
    };

    // Cache elemen global
    const toast = document.getElementById('toast');
    const toastIcon = document.getElementById('toastIcon');
    const toastTitle = document.getElementById('toastTitle');
    const toastMsg = document.getElementById('toastMsg');

    // Fungsi showToast
    function showToast(title, msg, type = 'info') {
        if (!toast || !toastIcon || !toastTitle || !toastMsg) return;
        toastIcon.className = 'w-9 h-9 rounded-full flex items-center justify-center text-white';
        if (type === 'success') {
            toastIcon.classList.add('bg-green-500');
            toastIcon.innerHTML = '<i class="ph ph-check"></i>';
        } else if (type === 'error') {
            toastIcon.classList.add('bg-red-500');
            toastIcon.innerHTML = '<i class="ph ph-x"></i>';
        } else if (type === 'warning') {
            toastIcon.classList.add('bg-yellow-500');
            toastIcon.innerHTML = '<i class="ph ph-warning"></i>';
        } else {
            toastIcon.classList.add('bg-blue-500');
            toastIcon.innerHTML = '<i class="ph ph-info"></i>';
        }
        toastTitle.textContent = title;
        toastMsg.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
    // Expose global showToast agar modul lain bisa pakai tanpa prefix
    window.showToast = showToast;

    // Fungsi switchTab
    function switchTab(tabId) {
        // Sembunyikan semua tab content
        document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
        // Hapus class active dari semua tombol
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active', 'bg-primary-50', 'text-primary-700', 'font-semibold');
            btn.classList.add('opacity-70');
        });
        // Tampilkan tab yang dipilih
        const target = document.getElementById(tabId);
        if (target) target.classList.add('active');
        // Tandai tombol
        const btn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
        if (btn) {
            btn.classList.add('active', 'bg-primary-50', 'text-primary-700', 'font-semibold');
            btn.classList.remove('opacity-70');
        }

        // Inisialisasi modul jika diperlukan
        switch (tabId) {
            case 'tab-dashboard':
                if (!modulesInitialized.dashboard && CFS.Dashboard) {
                    CFS.Dashboard.init();
                    modulesInitialized.dashboard = true;
                } else if (CFS.Dashboard) {
                    CFS.Dashboard.refresh();
                }
                break;
            case 'tab-stock':
                if (!modulesInitialized.stock && CFS.Inventory) {
                    CFS.Inventory.init();
                    modulesInitialized.stock = true;
                } else if (CFS.Inventory) {
                    CFS.Inventory.refreshStockTable();
                }
                break;
            case 'tab-sales':
                if (!modulesInitialized.sales && CFS.Sales) {
                    CFS.Sales.init();
                    modulesInitialized.sales = true;
                } else if (CFS.Sales) {
                    CFS.Sales.refreshTodaySales();
                    if (CFS.Inventory) CFS.Inventory.populateProductDropdowns();
                }
                break;
            case 'tab-purchase':
                // Modul pembelian belum dibuat terpisah, mungkin diintegrasikan di inventory? 
                // Untuk sekarang, kita hanya populate dropdown supplier/produk jika ada.
                if (CFS.Inventory) CFS.Inventory.populateProductDropdowns();
                // Bisa tambahkan modul Purchase nanti
                break;
            case 'tab-supplier':
                // Supplier bisa diintegrasikan di modul sendiri, kita asumsikan ada fungsi di Inventory atau Sales?
                // Untuk sekarang, cukup refresh tabel supplier dari Storage
                // Nanti bisa dibuat module supplier.js terpisah
                break;
            case 'tab-products':
                if (!modulesInitialized.products && CFS.Products) {
                    CFS.Products.init(); // jika ada
                }
                break;
            case 'tab-crm':
                if (!modulesInitialized.crm && CFS.CRM) {
                    CFS.CRM.init();
                    modulesInitialized.crm = true;
                } else if (CFS.CRM) {
                    CFS.CRM.refresh();
                }
                break;
            case 'tab-crm-detail':
                if (!modulesInitialized.crmDetail && CFS.CRMDetail) {
                    CFS.CRMDetail.init();
                }
                break;
            case 'tab-pricing':
                if (!modulesInitialized.pricing && CFS.Pricing) {
                    CFS.Pricing.init();
                }
                break;
            case 'tab-finance':
                if (!modulesInitialized.finance && CFS.Accounting) {
                    CFS.Accounting.init();
                    modulesInitialized.finance = true;
                } else if (CFS.Accounting) {
                    CFS.Accounting.refreshFinanceSummary();
                }
                break;
            case 'tab-delivery':
                if (!modulesInitialized.delivery && CFS.Delivery) {
                    CFS.Delivery.init();
                }
                break;
            case 'tab-opname':
                if (!modulesInitialized.opname && CFS.Opname) {
                    CFS.Opname.init();
                }
                break;
            case 'tab-return':
                if (!modulesInitialized.return && CFS.Return) {
                    CFS.Return.init();
                }
                break;
            case 'tab-history':
                if (!modulesInitialized.history && CFS.History) {
                    CFS.History.init();
                }
                break;
            case 'tab-audit':
                if (!modulesInitialized.audit && CFS.Audit) {
                    CFS.Audit.init();
                }
                break;
            case 'tab-reports':
                if (!modulesInitialized.reports && CFS.Reports) {
                    CFS.Reports.init();
                }
                break;
            case 'tab-notifications':
                if (!modulesInitialized.notifications && CFS.Notifications) {
                    CFS.Notifications.init();
                }
                break;
            case 'tab-settings':
                if (!modulesInitialized.settings && CFS.Settings) {
                    CFS.Settings.init();
                    modulesInitialized.settings = true;
                }
                break;
            case 'tab-help':
                // Tidak perlu inisialisasi khusus
                break;
        }
    }
    // Expose global
    window.switchTab = switchTab;

    // Backup data
    async function backupData() {
        const data = {
            batches: Storage.getBatches(),
            sales: Storage.getSales(),
            expenses: Storage.getExpenses(),
            settings: Storage.getSettings(),
            company: Storage.getCompany(),
            customers: Storage.getCustomers(),
            suppliers: Storage.getSuppliers(),
            deliveries: Storage.getDeliveries(),
            opnameList: Storage.getOpname(),
            returns: Storage.getReturns(),
            auditTrail: Storage.getAuditTrail(),
            pricing: Storage.getPricing(),
            products: Storage.getProducts()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `cibitung_frozen_backup_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        showToast('Backup', 'Data berhasil diunduh.', 'success');
        if (CFS.Storage && CFS.Storage.addAudit) CFS.Storage.addAudit('BACKUP', 'Data dibackup manual');
    }

    // Restore prompt
    function restorePrompt() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async function(e) {
            const file = e.target.files[0];
            if (!file) return;
            try {
                const text = await file.text();
                const data = JSON.parse(text);
                // Validasi sederhana
                if (!data.batches || !data.sales) throw new Error('Format tidak valid');
                // Set data ke Storage
                const Storage = CFS.Storage;
                // Hapus data lama lalu set baru
                await Storage.resetAllData(); // reset dulu
                // Setelah reset, kita isi ulang semua state
                // Karena resetAllData mengosongkan semuanya, kita bisa langsung set item
                await localforage.setItem('cfs_batches', data.batches || []);
                await localforage.setItem('cfs_sales', data.sales || []);
                await localforage.setItem('cfs_expenses', data.expenses || []);
                await localforage.setItem('cfs_settings', data.settings || Storage.defaultSettings);
                await localforage.setItem('cfs_company', data.company || Storage.defaultCompany);
                await localforage.setItem('cfs_customers', data.customers || {});
                await localforage.setItem('cfs_suppliers', data.suppliers || []);
                await localforage.setItem('cfs_deliveries', data.deliveries || []);
                await localforage.setItem('cfs_opname', data.opnameList || []);
                await localforage.setItem('cfs_returns', data.returns || []);
                await localforage.setItem('cfs_audit_trail', data.auditTrail || []);
                await localforage.setItem('cfs_pricing', data.pricing || {});
                await localforage.setItem('cfs_products', data.products || []);
                // Reload halaman agar state ter-refresh sempurna
                location.reload();
                showToast('Restore', 'Data berhasil dipulihkan. Halaman akan dimuat ulang.', 'success');
            } catch (err) {
                showToast('Error', 'File backup tidak valid.', 'error');
            }
        };
        input.click();
    }

    // Refresh semua modul yang sedang aktif
    function refreshAll() {
        if (CFS.Dashboard && modulesInitialized.dashboard) CFS.Dashboard.refresh();
        if (CFS.Inventory) CFS.Inventory.refreshStockTable();
        if (CFS.Sales) CFS.Sales.refreshTodaySales();
        if (CFS.Accounting && modulesInitialized.finance) CFS.Accounting.refreshFinanceSummary();
    }

    // Expose CFS.App
    CFS.App = {
        backupData,
        restorePrompt,
        showToast,
        refreshAll,
        switchTab
    };

    // Dark mode toggle (jika belum ada di inline, kita definisikan ulang)
    window.toggleDarkMode = function() {
        document.documentElement.classList.toggle('dark');
        localStorage.setItem('cfs_dark', document.documentElement.classList.contains('dark') ? '1' : '0');
        const darkIcon = document.getElementById('darkIcon');
        if (darkIcon) {
            darkIcon.className = document.documentElement.classList.contains('dark') ?
                'ph ph-sun text-lg text-yellow-400' : 'ph ph-moon text-lg';
        }
        const sidebarMode = document.getElementById('sidebar-mode');
        if (sidebarMode) sidebarMode.textContent = document.documentElement.classList.contains('dark') ? 'Gelap' : 'Terang';
    };

    // Inisialisasi saat DOM siap
    window.addEventListener('DOMContentLoaded', () => {
        // Pastikan Storage sudah dimuat (storage.js akan memuat async, tapi mungkin belum selesai)
        // Kita akan menggunakan setTimeout untuk memastikan storage siap, atau kita bisa memanggil refreshAll setelah loadAllData selesai.
        // Karena storage.js memiliki self-invoking async yang memuat data, kita perlu menunggu.
        // Cara sederhana: polling atau gunakan event.
        // Untuk kemudahan, kita asumsikan storage.js sudah selesai sebelum app.js dijalankan (karena script di-load berurutan dan async di dalam storage.js mungkin belum selesai).
        // Lebih baik kita gunakan mekanisme: di storage.js setelah loadAllData selesai, kita panggil callback di CFS.App.
        // Untuk sekarang, kita gunakan setTimeout 100ms untuk memberi waktu loadAllData.
        setTimeout(() => {
            if (CFS.Storage && CFS.Storage.loadAllData) {
                // sudah otomatis di storage.js, hanya perlu inisialisasi tampilan
            }
            // Inisialisasi dashboard sebagai tab default
            switchTab('tab-dashboard');
            // Update system time
            setInterval(() => {
                const el = document.getElementById('lastUpdate');
                if (el) el.textContent = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                const sysEl = document.getElementById('systemDateTime');
                if (sysEl) sysEl.textContent = new Date().toLocaleString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit' });
            }, 1000);
            // Keyboard shortcuts
            document.addEventListener('keydown', function(e) {
                if (e.ctrlKey && e.key === 'd') { e.preventDefault(); switchTab('tab-dashboard'); }
                if (e.ctrlKey && e.key === 's') { e.preventDefault(); switchTab('tab-stock'); }
                if (e.ctrlKey && e.key === 'b') { e.preventDefault(); backupData(); }
            });
            // Toggle dark mode sesuai localStorage
            if (localStorage.getItem('cfs_dark') === '1') {
                document.documentElement.classList.add('dark');
                document.getElementById('darkIcon').className = 'ph ph-sun text-lg text-yellow-400';
                document.getElementById('sidebar-mode').textContent = 'Gelap';
            }
        }, 200);
    });


    
})();
