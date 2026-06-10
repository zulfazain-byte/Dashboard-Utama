/* ============================================================
   Cibitung Frozen ERP Ultimate v5.4 — Dashboard Module (FULL)
   ============================================================ */
window.CFS = window.CFS || {};

(function() {
    'use strict';
    const Storage = CFS.Storage;

    // Chart instances
    let revenueChart = null;
    let salesChannelChart = null;
    let stockChart = null;
    let calendarInstance = null;

    // Cache elemen
    let elements = {};

    function cacheElements() {
        elements = {
            // Header
            dashDate: document.getElementById('dashDate'),
            lastUpdate: document.getElementById('lastUpdate'),
            // Status bar
            statusTotalProducts: document.getElementById('statusTotalProducts'),
            statusTotalStock: document.getElementById('statusTotalStock'),
            statusActiveBatches: document.getElementById('statusActiveBatches'),
            statusCriticalBatches: document.getElementById('statusCriticalBatches'),
            statusTodayRevenue: document.getElementById('statusTodayRevenue'),
            statusMonthProfit: document.getElementById('statusMonthProfit'),
            statusAvgTrx: document.getElementById('statusAvgTrx'),
            // Stok summary
            dashboardSummaryCards: document.getElementById('dashboardSummaryCards'),
            // Expiring batches
            expiringBatches: document.getElementById('expiringBatches'),
            // Revenue chart
            chartRevenue: document.getElementById('chartRevenue'),
            // Sales channel chart
            chartSalesChannel: document.getElementById('chartSalesChannel'),
            // Laba rugi
            financeSummary: document.getElementById('financeSummary'),
            // Aktivitas terbaru
            recentActivityList: document.getElementById('recentActivityList'),
            // Top produk
            topProductsList: document.getElementById('topProductsList'),
            // Stok chart
            chartStockProduct: document.getElementById('chartStockProduct'),
            // Delivery status
            deliveryStatusList: document.getElementById('deliveryStatusList'),
            // Target sales
            targetSalesValue: document.getElementById('targetSalesValue'),
            targetProgressFill: document.getElementById('targetProgressFill'),
            targetAchieved: document.getElementById('targetAchieved'),
            targetPercent: document.getElementById('targetPercent'),
            // Supplier top
            topSuppliersList: document.getElementById('topSuppliersList'),
            // Notification preview
            notifPreviewList: document.getElementById('notifPreviewList'),
            // Recent orders table
            recentOrdersBody: document.getElementById('recentOrdersBody'),
            // Calendar
            dashboardCalendar: document.getElementById('dashboardCalendar'),
            // Sidebar
            storedBatchesCount: document.getElementById('storedBatchesCount'),
            storedTransactionsCount: document.getElementById('storedTransactionsCount'),
            storedCustomersCount: document.getElementById('storedCustomersCount'),
            storedSuppliersCount: document.getElementById('storedSuppliersCount'),
            storedDeliveriesCount: document.getElementById('storedDeliveriesCount'),
            // Notifikasi badge di navbar
            notifBadge: document.getElementById('notifBadge')
        };
    }

    // Helper
    function formatRupiah(n) { return 'Rp ' + Math.round(n).toLocaleString('id-ID'); }
    function getToday() { return new Date().toISOString().split('T')[0]; }

    // ==================== INISIALISASI ====================
    function initDashboard() {
        cacheElements();
        bindEvents();
        refreshDashboard();
    }

    function bindEvents() {
        // Widget toggle
        document.addEventListener('change', function(e) {
            if (e.target.classList.contains('widget-toggle')) {
                const widget = e.target.dataset.widget;
                const el = document.getElementById('widget-' + widget);
                if (el) {
                    el.style.display = e.target.checked ? '' : 'none';
                }
            }
        });
    }

    // ==================== REFRESH UTAMA ====================
    function refreshDashboard() {
        cacheElements();
        updateDateTime();
        refreshStatusBar();
        refreshStockSummary();
        refreshExpiringBatches();
        refreshRevenueChart();
        refreshSalesChannelChart();
        refreshProfitLoss();
        refreshRecentActivity();
        refreshTopProducts();
        refreshStockChart();
        refreshDeliveryStatus();
        refreshTargetSales();
        refreshTopSuppliers();
        refreshNotificationPreview();
        refreshRecentOrders();
        refreshCalendar();
        refreshSidebarStatus();
        updateNotifBadge(); // badge notifikasi real-time
    }

    // -------------------- WAKTU --------------------
    function updateDateTime() {
        const now = new Date();
        if (elements.dashDate) elements.dashDate.textContent = now.toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
        if (elements.lastUpdate) elements.lastUpdate.textContent = now.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });
    }

    // -------------------- STATUS BAR --------------------
    function refreshStatusBar() {
        const products = Storage.getProducts();
        const totalProducts = products.length > 0 ? products.length : Storage.defaultProducts.length;
        if (elements.statusTotalProducts) elements.statusTotalProducts.textContent = totalProducts;

        const stockMap = CFS.Inventory ? CFS.Inventory.getStockPerProduct() : {};
        const totalStock = Object.values(stockMap).reduce((a, b) => a + b, 0);
        if (elements.statusTotalStock) elements.statusTotalStock.textContent = totalStock + ' kg';

        const batches = Storage.getBatches();
        const activeBatches = batches.filter(b => (b.berat - b.used) > 0).length;
        if (elements.statusActiveBatches) elements.statusActiveBatches.textContent = activeBatches;

        const weekLater = new Date();
        weekLater.setDate(weekLater.getDate() + 7);
        const critical = batches.filter(b => new Date(b.tglKadaluarsa) <= weekLater && (b.berat - b.used) > 0).length;
        if (elements.statusCriticalBatches) elements.statusCriticalBatches.textContent = critical;

        const today = getToday();
        const todaySales = Storage.getSales().filter(s => s.tanggal === today);
        const todayRevenue = todaySales.reduce((sum, s) => sum + (s.qty * s.hargaJual - (s.diskon || 0)), 0);
        if (elements.statusTodayRevenue) elements.statusTodayRevenue.textContent = formatRupiah(todayRevenue);

        // Laba bulan ini
        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        const monthSales = Storage.getSales().filter(s => s.tanggal >= monthStart);
        const monthRevenue = monthSales.reduce((sum, s) => sum + (s.qty * s.hargaJual - (s.diskon || 0)), 0);
        const monthHPP = monthSales.reduce((sum, s) => sum + (s.qty * s.hpp), 0);
        const monthExpenses = Storage.getExpenses().filter(e => e.tanggal >= monthStart).reduce((sum, e) => sum + e.jumlah, 0);
        const monthProfit = monthRevenue - monthHPP - monthExpenses;
        if (elements.statusMonthProfit) elements.statusMonthProfit.textContent = formatRupiah(monthProfit);

        // Rata-rata transaksi
        const avgTrx = todaySales.length > 0 ? Math.round(todayRevenue / todaySales.length) : 0;
        if (elements.statusAvgTrx) elements.statusAvgTrx.textContent = formatRupiah(avgTrx);
    }

    // -------------------- STOK SUMMARY --------------------
    function refreshStockSummary() {
        if (!elements.dashboardSummaryCards) return;
        const stockMap = CFS.Inventory ? CFS.Inventory.getStockPerProduct() : {};
        const prods = Storage.getProducts().length ? Storage.getProducts().map(p => p.name) : Storage.defaultProducts;
        elements.dashboardSummaryCards.innerHTML = prods.map(p => {
            const stok = stockMap[p] || 0;
            return `<div class="bg-white dark:bg-slate-800 rounded p-2 text-center shadow-sm">
                <p class="text-xs opacity-60">${p}</p>
                <p class="font-bold text-sm">${stok} kg</p>
                <span class="text-xs ${stok === 0 ? 'text-red-500' : stok < 10 ? 'text-amber-500' : 'text-green-500'}">${stok === 0 ? 'Kosong' : stok < 10 ? 'Menipis' : 'Aman'}</span>
            </div>`;
        }).join('');
    }

    // -------------------- EXPIRING BATCHES --------------------
    function refreshExpiringBatches() {
        if (!elements.expiringBatches) return;
        const today = new Date();
        const weekLater = new Date(today);
        weekLater.setDate(weekLater.getDate() + 7);
        const batches = Storage.getBatches().filter(b => {
            const exp = new Date(b.tglKadaluarsa);
            return (b.berat - b.used) > 0 && exp <= weekLater && exp >= today;
        });
        if (batches.length === 0) {
            elements.expiringBatches.innerHTML = '<p class="text-green-600 text-xs">✅ Tidak ada batch kritis.</p>';
            return;
        }
        elements.expiringBatches.innerHTML = batches.map(b =>
            `<div class="flex justify-between items-center p-1 bg-red-50 dark:bg-red-900/20 rounded text-xs">
                <span>${b.produk} (${b.berat - b.used} kg)</span>
                <span class="font-bold">${b.tglKadaluarsa}</span>
            </div>`
        ).join('');
    }

    // -------------------- REVENUE CHART --------------------
    function refreshRevenueChart() {
        const ctx = elements.chartRevenue ? elements.chartRevenue.getContext('2d') : null;
        if (!ctx) return;
        const sales = Storage.getSales();
        const last7 = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const ds = d.toISOString().split('T')[0];
            const total = sales.filter(s => s.tanggal === ds).reduce((sum, s) => sum + (s.qty * s.hargaJual - (s.diskon || 0)), 0);
            last7.push({ date: ds, total });
        }
        if (revenueChart) revenueChart.destroy();
        revenueChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: last7.map(d => new Date(d.date).toLocaleDateString('id-ID', { weekday:'short' })),
                datasets: [{ label: 'Pendapatan', data: last7.map(d => d.total), backgroundColor: '#3b82f6', borderRadius: 4 }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => formatRupiah(ctx.raw) } } },
                scales: { y: { ticks: { callback: val => 'Rp ' + val.toLocaleString('id-ID') } } }
            }
        });
    }

    // -------------------- SALES CHANNEL CHART --------------------
    function refreshSalesChannelChart() {
        const ctx = elements.chartSalesChannel ? elements.chartSalesChannel.getContext('2d') : null;
        if (!ctx) return;
        const sales = Storage.getSales();
        const online = sales.filter(s => s.channel === 'online').reduce((sum, s) => sum + (s.qty * s.hargaJual - (s.diskon || 0)), 0);
        const offline = sales.filter(s => s.channel === 'offline').reduce((sum, s) => sum + (s.qty * s.hargaJual - (s.diskon || 0)), 0);
        if (salesChannelChart) salesChannelChart.destroy();
        salesChannelChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Online', 'Offline'],
                datasets: [{ data: [online, offline], backgroundColor: ['#6366f1', '#f59e0b'] }]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'bottom', labels: { font: { size: 10 } } } }
            }
        });
    }

    // -------------------- LABA RUGI --------------------
    function refreshProfitLoss() {
        if (!elements.financeSummary) return;
        const today = getToday();
        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        const sales = Storage.getSales().filter(s => s.tanggal >= monthStart && s.tanggal <= today);
        const expenses = Storage.getExpenses().filter(e => e.tanggal >= monthStart && e.tanggal <= today);
        const pendapatan = sales.reduce((sum, s) => sum + (s.qty * s.hargaJual - (s.diskon || 0)), 0);
        const hpp = sales.reduce((sum, s) => sum + (s.qty * s.hpp), 0);
        const beban = expenses.reduce((sum, e) => sum + e.jumlah, 0);
        const labaKotor = pendapatan - hpp;
        const labaBersih = labaKotor - beban;
        elements.financeSummary.innerHTML = `
            <div class="text-center"><span class="text-xs opacity-60">Pendapatan</span><p class="font-bold text-sm text-green-600">${formatRupiah(pendapatan)}</p></div>
            <div class="text-center"><span class="text-xs opacity-60">HPP</span><p class="font-bold text-sm text-red-500">${formatRupiah(hpp)}</p></div>
            <div class="text-center"><span class="text-xs opacity-60">Laba Kotor</span><p class="font-bold text-sm text-blue-600">${formatRupiah(labaKotor)}</p></div>
            <div class="text-center"><span class="text-xs opacity-60">Laba Bersih</span><p class="font-bold text-sm text-violet-600">${formatRupiah(labaBersih)}</p></div>
        `;
    }

    // -------------------- AKTIVITAS TERBARU --------------------
    function refreshRecentActivity() {
        if (!elements.recentActivityList) return;
        const recent = Storage.getSales().slice(-5).reverse();
        if (recent.length === 0) {
            elements.recentActivityList.innerHTML = '<p class="opacity-50 text-xs">-</p>';
            return;
        }
        elements.recentActivityList.innerHTML = recent.map(s =>
            `<div class="flex justify-between text-xs"><span>${s.tanggal}</span><span>${s.klien}</span><span>${s.produk} ${s.qty}kg</span><span class="font-semibold">${formatRupiah(s.qty * s.hargaJual - (s.diskon || 0))}</span></div>`
        ).join('');
    }

    // -------------------- TOP PRODUK --------------------
    function refreshTopProducts() {
        if (!elements.topProductsList) return;
        const sales = Storage.getSales();
        const map = {};
        sales.forEach(s => {
            if (!map[s.produk]) map[s.produk] = { qty: 0, revenue: 0 };
            map[s.produk].qty += s.qty;
            map[s.produk].revenue += (s.qty * s.hargaJual - (s.diskon || 0));
        });
        const sorted = Object.entries(map).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 5);
        if (sorted.length === 0) {
            elements.topProductsList.innerHTML = '<p class="opacity-50 text-xs">-</p>';
            return;
        }
        elements.topProductsList.innerHTML = sorted.map(([p, d], i) =>
            `<div class="flex justify-between text-xs"><span>${i + 1}. ${p}</span><span>${d.qty} kg</span><span class="font-semibold">${formatRupiah(d.revenue)}</span></div>`
        ).join('');
    }

    // -------------------- STOCK CHART --------------------
    function refreshStockChart() {
        const ctx = elements.chartStockProduct ? elements.chartStockProduct.getContext('2d') : null;
        if (!ctx) return;
        const stockMap = CFS.Inventory ? CFS.Inventory.getStockPerProduct() : {};
        const prods = Storage.getProducts().length ? Storage.getProducts().map(p => p.name) : Storage.defaultProducts;
        const data = prods.map(p => stockMap[p] || 0);
        if (stockChart) stockChart.destroy();
        stockChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: prods,
                datasets: [{ label: 'Stok (kg)', data: data, backgroundColor: data.map(v => v < 10 ? '#ef4444' : v < 20 ? '#f59e0b' : '#22c55e') }]
            },
            options: {
                responsive: true,
                indexAxis: 'y',
                plugins: { legend: { display: false } }
            }
        });
    }

    // -------------------- DELIVERY STATUS --------------------
    function refreshDeliveryStatus() {
        if (!elements.deliveryStatusList) return;
        const deliveries = Storage.getDeliveries();
        const pending = deliveries.filter(d => d.status !== 'sampai');
        if (pending.length === 0) {
            elements.deliveryStatusList.innerHTML = '<p class="text-green-600 text-xs">Semua selesai.</p>';
            return;
        }
        elements.deliveryStatusList.innerHTML = pending.map(d => {
            const sale = Storage.getSales().find(s => s.id === d.saleId);
            return `<div class="text-xs flex justify-between"><span>${sale ? sale.klien : '-'}</span><span>${d.courier}</span><span class="${d.status === 'dikirim' ? 'text-blue-600' : 'text-amber-600'}">${d.status}</span></div>`;
        }).join('');
    }

    // -------------------- TARGET SALES --------------------
    function refreshTargetSales() {
        const target = Storage.getSettings().targetPenjualanBulanan || 50000000;
        if (elements.targetSalesValue) elements.targetSalesValue.textContent = formatRupiah(target);
        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        const today = getToday();
        const sales = Storage.getSales().filter(s => s.tanggal >= monthStart && s.tanggal <= today);
        const achieved = sales.reduce((sum, s) => sum + (s.qty * s.hargaJual - (s.diskon || 0)), 0);
        const percent = Math.min(100, Math.round((achieved / target) * 100));
        if (elements.targetProgressFill) elements.targetProgressFill.style.width = percent + '%';
        if (elements.targetAchieved) elements.targetAchieved.textContent = formatRupiah(achieved);
        if (elements.targetPercent) elements.targetPercent.textContent = percent + '%';
    }

    // -------------------- TOP SUPPLIER --------------------
    function refreshTopSuppliers() {
        if (!elements.topSuppliersList) return;
        const batches = Storage.getBatches();
        const supplierMap = {};
        batches.forEach(b => {
            const sid = b.supplier;
            if (!sid) return;
            if (!supplierMap[sid]) supplierMap[sid] = { count: 0, qty: 0 };
            supplierMap[sid].count++;
            supplierMap[sid].qty += b.berat;
        });
        const suppliers = Storage.getSuppliers();
        const sorted = Object.entries(supplierMap)
            .map(([sid, data]) => ({ name: suppliers.find(s => s.id === sid) ? suppliers.find(s => s.id === sid).name : '?', ...data }))
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 3);
        if (sorted.length === 0) {
            elements.topSuppliersList.innerHTML = '<p class="opacity-50 text-xs">-</p>';
            return;
        }
        elements.topSuppliersList.innerHTML = sorted.map((s, i) =>
            `<div class="flex justify-between text-xs"><span>${i + 1}. ${s.name}</span><span>${s.qty} kg</span></div>`
        ).join('');
    }

    // -------------------- NOTIFIKASI PREVIEW --------------------
    function refreshNotificationPreview() {
        if (!elements.notifPreviewList) return;
        const trail = Storage.getAuditTrail().slice(0, 3);
        if (trail.length === 0) {
            elements.notifPreviewList.innerHTML = '<p class="opacity-50 text-xs">-</p>';
            return;
        }
        elements.notifPreviewList.innerHTML = trail.map(t =>
            `<div class="text-xs flex justify-between"><span>${t.aksi}</span><span>${new Date(t.waktu).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' })}</span></div>`
        ).join('');
    }

    // -------------------- RECENT ORDERS --------------------
    function refreshRecentOrders() {
        if (!elements.recentOrdersBody) return;
        const today = getToday();
        const sales = Storage.getSales().filter(s => s.tanggal === today).slice(0, 5);
        if (sales.length === 0) {
            elements.recentOrdersBody.innerHTML = '<tr><td colspan="3" class="text-center p-2 opacity-50">-</td></tr>';
            return;
        }
        elements.recentOrdersBody.innerHTML = sales.map(s => {
            const total = s.qty * s.hargaJual - (s.diskon || 0);
            return `<tr><td class="p-1">${s.klien}</td><td class="p-1">${s.produk}</td><td class="p-1 text-right font-semibold">${formatRupiah(total)}</td></tr>`;
        }).join('');
    }

    // -------------------- KALENDER --------------------
    function refreshCalendar() {
        if (!elements.dashboardCalendar || typeof FullCalendar === 'undefined') return;
        if (calendarInstance) calendarInstance.destroy();
        calendarInstance = new FullCalendar.Calendar(elements.dashboardCalendar, {
            initialView: 'dayGridMonth',
            height: 'auto',
            locale: 'id',
            headerToolbar: { left: 'prev,next', center: 'title', right: '' },
            events: Storage.getSales().map(s => ({
                title: `${s.klien} - ${s.produk}`,
                start: s.tanggal,
                color: s.channel === 'online' ? '#6366f1' : '#f59e0b',
                textColor: '#fff'
            }))
        });
        calendarInstance.render();
    }

    // -------------------- SIDEBAR STATUS --------------------
    function refreshSidebarStatus() {
        if (elements.storedBatchesCount) elements.storedBatchesCount.textContent = Storage.getBatches().length;
        if (elements.storedTransactionsCount) elements.storedTransactionsCount.textContent = Storage.getSales().length;
        if (elements.storedCustomersCount) elements.storedCustomersCount.textContent = Object.keys(Storage.getCustomers()).length;
        if (elements.storedSuppliersCount) elements.storedSuppliersCount.textContent = Storage.getSuppliers().length;
        if (elements.storedDeliveriesCount) elements.storedDeliveriesCount.textContent = Storage.getDeliveries().length;
    }

    // -------------------- NOTIFIKASI BADGE --------------------
    function updateNotifBadge() {
        if (!elements.notifBadge) return;
        const trail = Storage.getAuditTrail();
        const totalNotif = trail.length;
        elements.notifBadge.textContent = totalNotif;
        elements.notifBadge.classList.toggle('hidden', totalNotif === 0);
    }

    // Expose API
    CFS.Dashboard = {
        init: initDashboard,
        refresh: refreshDashboard
    };
})();
