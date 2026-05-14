/* ============================================================
   Cibitung Frozen ERP Ultimate v5.4 — Dashboard Module
   Mengelola seluruh widget, grafik, dan ringkasan di dashboard.
   ============================================================ */

window.CFS = window.CFS || {};

(function() {
    'use strict';

    const Storage = CFS.Storage;

    // --------------------- CACHE ELEMEN ---------------------
    let elements = {};

    function cacheElements() {
        elements.dashDate = document.getElementById('dashDate');
        elements.lastUpdate = document.getElementById('lastUpdate');
        elements.statusTotalProducts = document.getElementById('statusTotalProducts');
        elements.statusTotalStock = document.getElementById('statusTotalStock');
        elements.statusActiveBatches = document.getElementById('statusActiveBatches');
        elements.statusCriticalBatches = document.getElementById('statusCriticalBatches');
        elements.statusTodayRevenue = document.getElementById('statusTodayRevenue');
        elements.dashboardSummaryCards = document.getElementById('dashboardSummaryCards');
        elements.expiringBatches = document.getElementById('expiringBatches');
        elements.chartRevenue = document.getElementById('chartRevenue');
        elements.chartSalesChannel = document.getElementById('chartSalesChannel');
        elements.financeSummary = document.getElementById('financeSummary');
        elements.recentActivityList = document.getElementById('recentActivityList');
        elements.topProductsList = document.getElementById('topProductsList');
        elements.chartStockProduct = document.getElementById('chartStockProduct');
        elements.deliveryStatusList = document.getElementById('deliveryStatusList');
        elements.targetSalesValue = document.getElementById('targetSalesValue');
        elements.targetProgressFill = document.getElementById('targetProgressFill');
        elements.targetAchieved = document.getElementById('targetAchieved');
        elements.targetPercent = document.getElementById('targetPercent');
        elements.dashboardCalendar = document.getElementById('dashboardCalendar');

        // Sidebar status
        elements.storedBatchesCount = document.getElementById('storedBatchesCount');
        elements.storedTransactionsCount = document.getElementById('storedTransactionsCount');
        elements.storedCustomersCount = document.getElementById('storedCustomersCount');
        elements.storedSuppliersCount = document.getElementById('storedSuppliersCount');
        elements.storedDeliveriesCount = document.getElementById('storedDeliveriesCount');
    }

    // --------------------- HELPER ---------------------------
    function formatRupiah(n) {
        return (CFS.Accounting && CFS.Accounting.formatRupiah) ? CFS.Accounting.formatRupiah(n) : 'Rp ' + Math.round(n).toLocaleString('id-ID');
    }

    function formatDateID(dateStr) {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    }

    function getToday() {
        return new Date().toISOString().split('T')[0];
    }

    // --------------------- WIDGET: STOK SUMMARY ---------------------
    function refreshStockSummary() {
        const map = CFS.Inventory ? CFS.Inventory.getStockPerProduct() : {};
        const container = elements.dashboardSummaryCards;
        if (!container) return;

        const allProducts = (Storage.getProducts().length > 0)
            ? Storage.getProducts().map(p => p.name)
            : Storage.defaultProducts;

        container.innerHTML = allProducts.map(p => `
            <div class="card p-3 text-center hover-lift">
                <p class="text-xs opacity-60">${p}</p>
                <p class="font-bold text-lg">${map[p] || 0} kg</p>
                <div class="mt-1">
                    <span class="text-xs ${(map[p] || 0) === 0 ? 'text-red-500' : (map[p] || 0) < 10 ? 'text-amber-500' : 'text-green-500'}">
                        ${(map[p] || 0) === 0 ? '⚠️ Kosong' : (map[p] || 0) < 10 ? '📉 Menipis' : '✅ Aman'}
                    </span>
                </div>
            </div>
        `).join('');
    }

    // --------------------- WIDGET: EXPIRING BATCHES -----------------
    function refreshExpiringBatches() {
        const container = elements.expiringBatches;
        if (!container) return;

        const today = new Date();
        const weekLater = new Date(today);
        weekLater.setDate(weekLater.getDate() + 7);

        const batches = Storage.getBatches().filter(b => {
            const expDate = new Date(b.tglKadaluarsa);
            return expDate <= weekLater && (b.berat - b.used) > 0;
        });

        if (batches.length === 0) {
            container.innerHTML = '<p class="text-green-600 font-medium">✅ Tidak ada batch yang hampir kadaluarsa.</p>';
            return;
        }

        container.innerHTML = batches.map(b => `
            <div class="flex justify-between items-center p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200">
                <div>
                    <span class="font-semibold">${b.produk}</span>
                    <span class="text-sm opacity-70 ml-2">Sisa ${b.berat - b.used} kg</span>
                </div>
                <span class="text-xs text-red-600 font-bold">Exp: ${formatDateID(b.tglKadaluarsa)}</span>
            </div>
        `).join('');
    }

    // --------------------- WIDGET: REVENUE CHART -------------------
    let revenueChartInstance = null;
    function refreshRevenueChart() {
        const ctx = elements.chartRevenue?.getContext('2d');
        if (!ctx) return;

        const sales = Storage.getSales();
        const last7 = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const ds = d.toISOString().split('T')[0];
            const total = sales.filter(s => s.tanggal === ds).reduce((sum, s) => sum + (s.qty * s.hargaJual), 0);
            last7.push({ date: ds, total });
        }

        if (revenueChartInstance) revenueChartInstance.destroy();
        revenueChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: last7.map(d => {
                    const dt = new Date(d.date);
                    return dt.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
                }),
                datasets: [{
                    label: 'Pendapatan',
                    data: last7.map(d => d.total),
                    backgroundColor: '#3b82f6',
                    borderRadius: 6,
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: (ctx) => formatRupiah(ctx.raw) } }
                },
                scales: {
                    y: { ticks: { callback: (val) => formatRupiah(val) } }
                }
            }
        });
    }

    // --------------------- WIDGET: SALES CHANNEL CHART -------------
    let salesChannelChartInstance = null;
    function refreshSalesChannelChart() {
        const ctx = elements.chartSalesChannel?.getContext('2d');
        if (!ctx) return;

        const sales = Storage.getSales();
        const online = sales.filter(s => s.channel === 'online').reduce((sum, s) => sum + (s.qty * s.hargaJual), 0);
        const offline = sales.filter(s => s.channel === 'offline').reduce((sum, s) => sum + (s.qty * s.hargaJual), 0);

        if (salesChannelChartInstance) salesChannelChartInstance.destroy();
        salesChannelChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Online', 'Offline'],
                datasets: [{
                    data: [online, offline],
                    backgroundColor: ['#6366f1', '#f59e0b'],
                    borderWidth: 2,
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: { callbacks: { label: (ctx) => formatRupiah(ctx.raw) } }
                }
            }
        });
    }

    // --------------------- WIDGET: PROFIT LOSS --------------------
    function refreshProfitLoss() {
        const container = elements.financeSummary;
        if (!container) return;

        const today = getToday();
        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        const sales = Storage.getSales().filter(s => s.tanggal >= monthStart && s.tanggal <= today);
        const expenses = Storage.getExpenses().filter(e => e.tanggal >= monthStart && e.tanggal <= today);

        const pendapatan = sales.reduce((sum, s) => sum + (s.qty * s.hargaJual), 0);
        const hpp = sales.reduce((sum, s) => sum + (s.qty * s.hpp), 0);
        const beban = expenses.reduce((sum, e) => sum + e.jumlah, 0);
        const labaKotor = pendapatan - hpp;
        const labaBersih = labaKotor - beban;

        container.innerHTML = `
            <div class="card p-3 text-center"><span class="text-xs opacity-60">Pendapatan</span><p class="font-bold text-lg text-green-600">${formatRupiah(pendapatan)}</p></div>
            <div class="card p-3 text-center"><span class="text-xs opacity-60">HPP</span><p class="font-bold text-lg text-red-500">${formatRupiah(hpp)}</p></div>
            <div class="card p-3 text-center"><span class="text-xs opacity-60">Laba Kotor</span><p class="font-bold text-lg text-blue-600">${formatRupiah(labaKotor)}</p></div>
            <div class="card p-3 text-center"><span class="text-xs opacity-60">Laba Bersih</span><p class="font-bold text-lg text-violet-600">${formatRupiah(labaBersih)}</p></div>
        `;
    }

    // --------------------- WIDGET: RECENT ACTIVITY ----------------
    function refreshRecentActivity() {
        const container = elements.recentActivityList;
        if (!container) return;

        const recentSales = Storage.getSales().slice(-5).reverse();
        if (recentSales.length === 0) {
            container.innerHTML = '<p class="opacity-50 italic">Belum ada aktivitas.</p>';
            return;
        }

        container.innerHTML = recentSales.map(s => `
            <div class="flex items-center gap-2 text-sm">
                <span class="text-xs opacity-50">${s.tanggal}</span>
                <span class="font-medium">${s.klien}</span>
                <span class="opacity-70">beli</span>
                <span class="font-semibold">${s.produk} ${s.qty}kg</span>
                <span class="text-green-600 ml-auto">${formatRupiah(s.qty * s.hargaJual)}</span>
            </div>
        `).join('');
    }

    // --------------------- WIDGET: TOP PRODUCTS -------------------
    function refreshTopProducts() {
        const container = elements.topProductsList;
        if (!container) return;

        const sales = Storage.getSales();
        const productMap = {};
        sales.forEach(s => {
            if (!productMap[s.produk]) productMap[s.produk] = { qty: 0, revenue: 0 };
            productMap[s.produk].qty += s.qty;
            productMap[s.produk].revenue += s.qty * s.hargaJual;
        });

        const sorted = Object.entries(productMap).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 5);

        if (sorted.length === 0) {
            container.innerHTML = '<p class="opacity-50 italic">Data akan muncul setelah ada transaksi.</p>';
            return;
        }

        container.innerHTML = sorted.map(([produk, data], idx) => `
            <div class="flex items-center gap-2">
                <span class="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-xs font-bold text-amber-600">${idx+1}</span>
                <span class="font-medium flex-1">${produk}</span>
                <span class="text-sm opacity-70">${data.qty} kg</span>
                <span class="font-semibold text-green-600">${formatRupiah(data.revenue)}</span>
            </div>
        `).join('');
    }

    // --------------------- WIDGET: STOCK CHART --------------------
    let stockChartInstance = null;
    function refreshStockChart() {
        const ctx = elements.chartStockProduct?.getContext('2d');
        if (!ctx) return;

        const map = CFS.Inventory ? CFS.Inventory.getStockPerProduct() : {};
        const allProducts = (Storage.getProducts().length > 0)
            ? Storage.getProducts().map(p => p.name)
            : Storage.defaultProducts;

        const labels = allProducts;
        const data = allProducts.map(p => map[p] || 0);

        if (stockChartInstance) stockChartInstance.destroy();
        stockChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Stok (kg)',
                    data: data,
                    backgroundColor: data.map(val => val < 10 ? '#ef4444' : val < 20 ? '#f59e0b' : '#22c55e'),
                    borderRadius: 4,
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                plugins: { legend: { display: false } }
            }
        });
    }

    // --------------------- WIDGET: DELIVERY STATUS ----------------
    function refreshDeliveryStatus() {
        const container = elements.deliveryStatusList;
        if (!container) return;

        const deliveries = Storage.getDeliveries();
        const pending = deliveries.filter(d => d.status === 'dikemas' || d.status === 'dikirim');

        if (pending.length === 0) {
            container.innerHTML = '<p class="opacity-50 italic">Semua pengiriman telah sampai.</p>';
            return;
        }

        container.innerHTML = pending.map(d => {
            const sale = Storage.getSales().find(s => s.id === d.saleId);
            const statusColor = d.status === 'dikemas' ? 'text-amber-600' : 'text-blue-600';
            return `
                <div class="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-800 rounded">
                    <div>
                        <span class="font-medium">${sale ? sale.klien : '-'}</span>
                        <span class="text-sm opacity-70 ml-2">${d.courier} - ${d.tracking || '-'}</span>
                    </div>
                    <span class="text-xs font-bold ${statusColor}">
                        ${d.status === 'dikemas' ? '📦 Dikemas' : '🚚 Dikirim'}
                    </span>
                </div>
            `;
        }).join('');
    }

    // --------------------- WIDGET: TARGET SALES -------------------
    function refreshTargetSales() {
        const containerTarget = elements.targetSalesValue;
        const progressFill = elements.targetProgressFill;
        const achievedEl = elements.targetAchieved;
        const percentEl = elements.targetPercent;

        if (!containerTarget || !progressFill) return;

        const settings = Storage.getSettings();
        const target = settings.targetPenjualanBulanan || 50000000;
        containerTarget.textContent = formatRupiah(target);

        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        const today = getToday();
        const sales = Storage.getSales().filter(s => s.tanggal >= monthStart && s.tanggal <= today);
        const achieved = sales.reduce((sum, s) => sum + (s.qty * s.hargaJual), 0);

        const percent = Math.min(100, Math.round((achieved / target) * 100));
        progressFill.style.width = percent + '%';
        if (achievedEl) achievedEl.textContent = formatRupiah(achieved);
        if (percentEl) percentEl.textContent = percent + '%';
    }

    // --------------------- WIDGET: KALENDER -----------------------
    let calendarInstance = null;
    function refreshCalendar() {
        const container = elements.dashboardCalendar;
        if (!container || typeof FullCalendar === 'undefined') return;

        if (calendarInstance) {
            calendarInstance.destroy();
        }

        calendarInstance = new FullCalendar.Calendar(container, {
            initialView: 'dayGridMonth',
            height: 'auto',
            locale: 'id',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: ''
            },
            events: Storage.getSales().map(s => ({
                title: `${s.klien} - ${s.produk}`,
                start: s.tanggal,
                color: s.channel === 'online' ? '#6366f1' : '#f59e0b',
                textColor: '#fff',
            })),
        });
        calendarInstance.render();
    }

    // --------------------- SIDEBAR STATUS -------------------------
    function refreshSidebarStatus() {
        if (elements.storedBatchesCount) elements.storedBatchesCount.textContent = Storage.getBatches().length;
        if (elements.storedTransactionsCount) elements.storedTransactionsCount.textContent = Storage.getSales().length;
        if (elements.storedCustomersCount) elements.storedCustomersCount.textContent = Object.keys(Storage.getCustomers()).length;
        if (elements.storedSuppliersCount) elements.storedSuppliersCount.textContent = Storage.getSuppliers().length;
        if (elements.storedDeliveriesCount) elements.storedDeliveriesCount.textContent = Storage.getDeliveries().length;
    }

    // --------------------- MAIN REFRESH ---------------------------
    function refreshDashboard() {
        cacheElements();

        // Update waktu
        if (elements.dashDate) {
            elements.dashDate.textContent = new Date().toLocaleDateString('id-ID', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
            });
        }

        // Status bar
        const map = CFS.Inventory ? CFS.Inventory.getStockPerProduct() : {};
        const totalStock = Object.values(map).reduce((sum, val) => sum + val, 0);
        if (elements.statusTotalStock) elements.statusTotalStock.textContent = totalStock + ' kg';
        if (elements.statusActiveBatches) elements.statusActiveBatches.textContent = Storage.getBatches().filter(b => (b.berat - b.used) > 0).length;
        if (elements.statusCriticalBatches) {
            const weekLater = new Date();
            weekLater.setDate(weekLater.getDate() + 7);
            elements.statusCriticalBatches.textContent = Storage.getBatches().filter(b => new Date(b.tglKadaluarsa) <= weekLater && (b.berat - b.used) > 0).length;
        }
        if (elements.statusTodayRevenue) {
            const todaySales = Storage.getSales().filter(s => s.tanggal === getToday());
            const todayRev = todaySales.reduce((sum, s) => sum + (s.qty * s.hargaJual), 0);
            elements.statusTodayRevenue.textContent = formatRupiah(todayRev);
        }
        // Jumlah produk
        const productsList = Storage.getProducts();
        if (elements.statusTotalProducts) elements.statusTotalProducts.textContent = productsList.length > 0 ? productsList.length : Storage.defaultProducts.length;

        // Widget
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
        refreshCalendar();
        refreshSidebarStatus();
    }

    // --------------------- EVENT LISTENER -------------------------
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

    // --------------------- INITIALIZATION -------------------------
    function initDashboard() {
        cacheElements();
        bindEvents();
        refreshDashboard();
    }

    // Expose API
    CFS.Dashboard = {
        init: initDashboard,
        refresh: refreshDashboard,
        refreshStockSummary,
        refreshExpiringBatches,
        refreshRevenueChart,
        refreshSalesChannelChart,
        refreshProfitLoss,
        refreshRecentActivity,
        refreshTopProducts,
        refreshStockChart,
        refreshDeliveryStatus,
        refreshTargetSales,
        refreshCalendar
    };

})();
