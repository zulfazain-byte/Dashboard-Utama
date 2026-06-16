/* ============================================================
   Cibitung Frozen ERP Ultimate v5.4 — Dashboard Module (NEXT GEN)
   Mandiri, ±2200 baris, efek 3D, animasi modern, prediksi & heatmap.
   ============================================================ */
window.CFS = window.CFS || {};

(function () {
    'use strict';

    const Storage = CFS.Storage;

    // ==================== CHART INSTANCES ====================
    let revenueChart = null;
    let salesChannelChart = null;
    let stockChart = null;
    let trendChart = null;
    let gaugeChart = null;
    let thermometerChart = null;
    let heatmapChart = null;
    let forecastChart = null;

    // ==================== STATE ====================
    let autoRefreshTimer = null;
    let refreshInterval = 30000; // 30 detik
    let currentDashboardTab = 'overview';
    let compactMode = false;
    let particleCanvas = null;
    let particleCtx = null;
    let particles = [];
    let animationFrame = null;

    // ==================== CACHE ELEMEN ====================
    let E = {};
    function cacheElements() {
        E = {
            // Header
            dashDate: document.getElementById('dashDate'),
            lastUpdate: document.getElementById('lastUpdate'),
            dashGreeting: document.getElementById('dashGreeting'),
            refreshBtn: document.getElementById('dashRefreshBtn'),
            autoRefreshToggle: document.getElementById('dashAutoRefreshToggle'),

            // Dashboard tabs
            dashTabBtns: document.querySelectorAll('.dash-tab-btn'),
            dashTabContents: document.querySelectorAll('.dash-tab-content'),

            // Status bar
            statusTotalProducts: document.getElementById('statusTotalProducts'),
            statusTotalStock: document.getElementById('statusTotalStock'),
            statusActiveBatches: document.getElementById('statusActiveBatches'),
            statusCriticalBatches: document.getElementById('statusCriticalBatches'),
            statusTodayRevenue: document.getElementById('statusTodayRevenue'),
            statusMonthProfit: document.getElementById('statusMonthProfit'),
            statusAvgTrx: document.getElementById('statusAvgTrx'),
            statusOnlineOrders: document.getElementById('statusOnlineOrders'),

            // Stok summary
            dashboardSummaryCards: document.getElementById('dashboardSummaryCards'),

            // Expiring batches
            expiringBatches: document.getElementById('expiringBatches'),

            // Charts
            chartRevenue: document.getElementById('chartRevenue'),
            chartSalesChannel: document.getElementById('chartSalesChannel'),
            chartStockProduct: document.getElementById('chartStockProduct'),
            chartTrend: document.getElementById('chartTrend'),
            chartGauge: document.getElementById('chartGauge'),
            chartThermometer: document.getElementById('chartThermometer'),
            chartHeatmap: document.getElementById('chartHeatmap'),
            chartForecast: document.getElementById('chartForecast'),

            // Laba rugi
            financeSummary: document.getElementById('financeSummary'),

            // Aktivitas terbaru
            recentActivityList: document.getElementById('recentActivityList'),

            // Top produk
            topProductsList: document.getElementById('topProductsList'),

            // Quick actions
            quickActions: document.getElementById('quickActions'),

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

            // Badge
            notifBadge: document.getElementById('notifBadge'),

            // Compact toggle
            compactToggle: document.getElementById('dashCompactToggle'),

            // Particle canvas
            particleCanvas: document.getElementById('particleCanvas'),
        };
    }

    // ==================== HELPER ====================
    function formatRupiah(n) { return 'Rp ' + Math.round(n).toLocaleString('id-ID'); }
    function formatNumber(n) { return Math.round(n).toLocaleString('id-ID'); }
    function getToday() { return new Date().toISOString().split('T')[0]; }
    function getWeekAgo() {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        return d.toISOString().split('T')[0];
    }
    function getMonthStart() {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    }
    function getGreeting() {
        const hour = new Date().getHours();
        if (hour < 11) return 'Selamat Pagi';
        if (hour < 15) return 'Selamat Siang';
        if (hour < 18) return 'Selamat Sore';
        return 'Selamat Malam';
    }

    // ==================== ANIMASI PARTICLE BACKGROUND ====================
    function initParticles() {
        if (!E.particleCanvas) return;
        particleCanvas = E.particleCanvas;
        particleCtx = particleCanvas.getContext('2d');
        resizeParticles();
        window.addEventListener('resize', resizeParticles);
        createParticles();
        animateParticles();
    }

    function resizeParticles() {
        if (!particleCanvas) return;
        particleCanvas.width = window.innerWidth;
        particleCanvas.height = window.innerHeight;
    }

    function createParticles() {
        particles = [];
        const count = Math.min(80, Math.floor(window.innerWidth / 15));
        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * particleCanvas.width,
                y: Math.random() * particleCanvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                radius: Math.random() * 2 + 1,
                alpha: Math.random() * 0.5 + 0.2
            });
        }
    }

    function animateParticles() {
        if (!particleCtx || !particleCanvas) return;
        particleCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0 || p.x > particleCanvas.width) p.vx *= -1;
            if (p.y < 0 || p.y > particleCanvas.height) p.vy *= -1;
            particleCtx.beginPath();
            particleCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            particleCtx.fillStyle = `rgba(37, 99, 235, ${p.alpha})`;
            particleCtx.fill();
        });
        animationFrame = requestAnimationFrame(animateParticles);
    }

    // ==================== ANGKA BERTAMBAH (COUNTING) ====================
    function animateValue(element, start, end, duration) {
        if (!element) return;
        const range = end - start;
        const increment = range / (duration / 16);
        let current = start;
        const timer = setInterval(() => {
            current += increment;
            if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
                element.textContent = end;
                clearInterval(timer);
            } else {
                element.textContent = Math.round(current);
            }
        }, 16);
    }

    // ==================== EFEK 3D CARD (CSS CLASS) ====================
    function apply3DCardEffect() {
        document.querySelectorAll('.card-3d').forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const rotateX = (y - centerY) / 10;
                const rotateY = (centerX - x) / 10;
                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02,1.02,1.02)`;
                card.style.transition = 'transform 0.1s ease';
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1,1,1)';
                card.style.transition = 'transform 0.5s ease';
            });
        });
    }

    // ==================== INIT ====================
    function initDashboard() {
        cacheElements();
        initParticles();
        apply3DCardEffect();
        bindEvents();
        refreshDashboard();
        startAutoRefresh();
    }

    // ==================== AUTO REFRESH ====================
    function startAutoRefresh() {
        if (autoRefreshTimer) clearInterval(autoRefreshTimer);
        autoRefreshTimer = setInterval(() => refreshDashboard(), refreshInterval);
    }
    function stopAutoRefresh() {
        if (autoRefreshTimer) {
            clearInterval(autoRefreshTimer);
            autoRefreshTimer = null;
        }
    }
    function toggleAutoRefresh() {
        if (autoRefreshTimer) {
            stopAutoRefresh();
            if (E.autoRefreshToggle) E.autoRefreshToggle.innerHTML = '<i class="ph ph-pause-circle"></i> Auto Refresh: OFF';
        } else {
            startAutoRefresh();
            if (E.autoRefreshToggle) E.autoRefreshToggle.innerHTML = '<i class="ph ph-arrow-clockwise"></i> Auto Refresh: ON';
        }
    }

    // ==================== EVENT BINDING ====================
    function bindEvents() {
        document.addEventListener('change', function (e) {
            if (e.target.classList.contains('widget-toggle')) {
                const widget = e.target.dataset.widget;
                const el = document.getElementById('widget-' + widget);
                if (el) el.style.display = e.target.checked ? '' : 'none';
            }
        });

        if (E.refreshBtn) E.refreshBtn.addEventListener('click', () => refreshDashboard());
        if (E.autoRefreshToggle) E.autoRefreshToggle.addEventListener('click', toggleAutoRefresh);
        if (E.compactToggle) E.compactToggle.addEventListener('click', toggleCompactMode);

        E.dashTabBtns?.forEach(btn => {
            btn.addEventListener('click', function () {
                E.dashTabBtns.forEach(b => { b.classList.remove('btn-primary', 'active'); b.classList.add('btn-secondary'); });
                this.classList.add('btn-primary', 'active');
                this.classList.remove('btn-secondary');
                const tabId = this.dataset.dashTab;
                E.dashTabContents?.forEach(c => c.classList.add('hidden'));
                const target = document.getElementById(tabId);
                if (target) target.classList.remove('hidden');
                currentDashboardTab = tabId;
                if (tabId === 'dash-financial') { refreshRevenueChart(); refreshProfitLoss(); }
                if (tabId === 'dash-operational') { refreshStockChart(); refreshDeliveryStatus(); }
            });
        });
    }

    function toggleCompactMode() {
        compactMode = !compactMode;
        document.querySelectorAll('.dash-widget').forEach(w => {
            w.classList.toggle('p-2', compactMode);
            w.classList.toggle('p-6', !compactMode);
        });
        if (E.compactToggle) E.compactToggle.textContent = compactMode ? '🗂️ Normal' : '📐 Compact';
        localStorage.setItem('cfs_dash_compact', compactMode ? '1' : '0');
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
        updateNotifBadge();
        refreshTrendChart();
        refreshGaugeChart();
        refreshThermometerChart();
        refreshHeatmap();
        refreshForecast();
    }

    // -------------------- WAKTU --------------------
    function updateDateTime() {
        const now = new Date();
        if (E.dashDate) E.dashDate.textContent = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        if (E.lastUpdate) E.lastUpdate.textContent = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        if (E.dashGreeting) E.dashGreeting.textContent = `👋 ${getGreeting()}, Owner`;
    }

    // -------------------- STATUS BAR (with count animation) --------------------
    function refreshStatusBar() {
        const products = Storage.getProducts();
        const totalProducts = products.length > 0 ? products.length : (Storage.defaultProducts?.length || 0);
        animateValue(E.statusTotalProducts, parseInt(E.statusTotalProducts?.textContent || 0), totalProducts, 400);

        const stockMap = CFS.Inventory ? CFS.Inventory.getStockPerProduct() : {};
        const totalStock = Object.values(stockMap).reduce((a, b) => a + b, 0);
        animateValue(E.statusTotalStock, parseInt(E.statusTotalStock?.textContent || 0), totalStock, 400);
        if (E.statusTotalStock) setTimeout(() => E.statusTotalStock.textContent = formatNumber(totalStock) + ' kg', 400);

        const batches = Storage.getBatches();
        const activeBatches = batches.filter(b => (b.berat - b.used) > 0).length;
        animateValue(E.statusActiveBatches, parseInt(E.statusActiveBatches?.textContent || 0), activeBatches, 400);

        const weekLater = new Date();
        weekLater.setDate(weekLater.getDate() + 7);
        const critical = batches.filter(b => new Date(b.tglKadaluarsa) <= weekLater && (b.berat - b.used) > 0).length;
        animateValue(E.statusCriticalBatches, parseInt(E.statusCriticalBatches?.textContent || 0), critical, 400);

        const today = getToday();
        const todaySales = Storage.getSales().filter(s => s.tanggal === today);
        const todayRevenue = todaySales.reduce((sum, s) => sum + (s.qty * s.hargaJual - (s.diskon || 0)), 0);
        animateValue(E.statusTodayRevenue, parseInt(E.statusTodayRevenue?.textContent?.replace(/\D/g,'') || 0), todayRevenue, 500);

        const monthStart = getMonthStart();
        const monthSales = Storage.getSales().filter(s => s.tanggal >= monthStart);
        const monthRevenue = monthSales.reduce((sum, s) => sum + (s.qty * s.hargaJual - (s.diskon || 0)), 0);
        const monthHPP = monthSales.reduce((sum, s) => sum + (s.qty * s.hpp), 0);
        const monthExpenses = Storage.getExpenses().filter(e => e.tanggal >= monthStart).reduce((sum, e) => sum + e.jumlah, 0);
        const monthProfit = monthRevenue - monthHPP - monthExpenses;
        animateValue(E.statusMonthProfit, parseInt(E.statusMonthProfit?.textContent?.replace(/\D/g,'') || 0), monthProfit, 500);

        const avgTrx = todaySales.length > 0 ? Math.round(todayRevenue / todaySales.length) : 0;
        animateValue(E.statusAvgTrx, parseInt(E.statusAvgTrx?.textContent?.replace(/\D/g,'') || 0), avgTrx, 500);

        const onlineOrders = todaySales.filter(s => s.channel === 'online').length;
        animateValue(E.statusOnlineOrders, parseInt(E.statusOnlineOrders?.textContent || 0), onlineOrders, 400);
    }

    // -------------------- STOK SUMMARY (dengan progress bar) --------------------
    function refreshStockSummary() {
        if (!E.dashboardSummaryCards) return;
        const stockMap = CFS.Inventory ? CFS.Inventory.getStockPerProduct() : {};
        const prods = Storage.getProducts().length ? Storage.getProducts().map(p => p.name) : (Storage.defaultProducts || []);
        E.dashboardSummaryCards.innerHTML = prods.map(p => {
            const stok = stockMap[p] || 0;
            const statusColor = stok === 0 ? 'border-red-400 bg-red-50 dark:bg-red-900/20' :
                                stok < 10 ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20' :
                                'border-green-400 bg-green-50 dark:bg-green-900/20';
            const textColor = stok === 0 ? 'text-red-600' : stok < 10 ? 'text-amber-600' : 'text-green-600';
            const progressWidth = Math.min(100, (stok / 20) * 100); // asumsi kapasitas 20kg per produk
            return `<div class="border ${statusColor} rounded-xl p-3 text-center shadow-sm hover:shadow-md transition-all duration-200 card-3d">
                <p class="text-xs opacity-70 font-medium">${p}</p>
                <p class="font-bold text-lg mt-1">${formatNumber(stok)} <span class="text-xs font-normal">kg</span></p>
                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-2">
                    <div class="h-1.5 rounded-full ${stok===0?'bg-red-500':stok<10?'bg-amber-500':'bg-green-500'}" style="width:${progressWidth}%"></div>
                </div>
                <span class="text-xs font-semibold ${textColor} mt-1 block">${stok === 0 ? '🔴 Kosong' : stok < 10 ? '🟡 Menipis' : '🟢 Aman'}</span>
            </div>`;
        }).join('');
    }

    // -------------------- EXPIRING BATCHES --------------------
    function refreshExpiringBatches() {
        if (!E.expiringBatches) return;
        const today = new Date();
        const weekLater = new Date(today);
        weekLater.setDate(weekLater.getDate() + 7);
        const batches = Storage.getBatches().filter(b => {
            const exp = new Date(b.tglKadaluarsa);
            return (b.berat - b.used) > 0 && exp <= weekLater && exp >= today;
        });
        if (batches.length === 0) {
            E.expiringBatches.innerHTML = '<div class="text-center py-2 text-green-600 text-sm"><i class="ph ph-check-circle mr-1"></i> Tidak ada batch kritis</div>';
            return;
        }
        E.expiringBatches.innerHTML = batches.map(b => {
            const daysLeft = Math.ceil((new Date(b.tglKadaluarsa) - today) / 86400000);
            const urgency = daysLeft <= 3 ? 'bg-red-100 border-red-300 text-red-700' : 'bg-amber-100 border-amber-300 text-amber-700';
            return `<div class="flex justify-between items-center p-2 border rounded-lg mb-1 ${urgency}">
                <span class="font-medium text-sm">${b.produk}</span>
                <span class="text-xs">${b.berat - b.used} kg</span>
                <span class="text-xs font-bold">${daysLeft} hari</span>
            </div>`;
        }).join('');
    }

    // -------------------- REVENUE CHART (dengan animasi) --------------------
    function refreshRevenueChart() {
        const ctx = E.chartRevenue?.getContext('2d');
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
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(37,99,235,0.4)');
        gradient.addColorStop(1, 'rgba(37,99,235,0.02)');
        revenueChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: last7.map(d => new Date(d.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' })),
                datasets: [{
                    label: 'Pendapatan',
                    data: last7.map(d => d.total),
                    backgroundColor: gradient,
                    borderColor: '#2563eb',
                    borderWidth: 1.5,
                    borderRadius: 8,
                    hoverBackgroundColor: '#1d4ed8'
                }]
            },
            options: {
                responsive: true,
                animation: { duration: 1500, easing: 'easeOutQuart' },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#1e293b',
                        titleColor: '#f1f5f9',
                        bodyColor: '#f1f5f9',
                        callbacks: { label: (ctx) => formatRupiah(ctx.raw) }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { callback: val => formatRupiah(val) },
                        grid: { color: 'rgba(0,0,0,0.05)' }
                    },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    // -------------------- SALES CHANNEL CHART (3D donut) --------------------
    function refreshSalesChannelChart() {
        const ctx = E.chartSalesChannel?.getContext('2d');
        if (!ctx) return;
        const sales = Storage.getSales();
        const online = sales.filter(s => s.channel === 'online').reduce((sum, s) => sum + (s.qty * s.hargaJual - (s.diskon || 0)), 0);
        const offline = sales.filter(s => s.channel === 'offline').reduce((sum, s) => sum + (s.qty * s.hargaJual - (s.diskon || 0)), 0);
        if (salesChannelChart) salesChannelChart.destroy();
        salesChannelChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Online', 'Offline'],
                datasets: [{
                    data: [online, offline],
                    backgroundColor: ['#6366f1', '#f59e0b'],
                    borderWidth: 4,
                    borderColor: '#ffffff',
                    hoverBorderColor: '#ffffff',
                    hoverBorderWidth: 6,
                }]
            },
            options: {
                responsive: true,
                cutout: '65%',
                animation: { animateRotate: true, duration: 2000 },
                plugins: {
                    legend: { position: 'bottom', labels: { font: { size: 11 }, usePointStyle: true, padding: 20 } },
                    tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${formatRupiah(ctx.raw)}` } }
                }
            }
        });
    }

    // -------------------- LABA RUGI (dengan indikator tren) --------------------
    function refreshProfitLoss() {
        if (!E.financeSummary) return;
        const today = getToday();
        const monthStart = getMonthStart();
        const sales = Storage.getSales().filter(s => s.tanggal >= monthStart && s.tanggal <= today);
        const expenses = Storage.getExpenses().filter(e => e.tanggal >= monthStart && e.tanggal <= today);
        const pendapatan = sales.reduce((sum, s) => sum + (s.qty * s.hargaJual - (s.diskon || 0)), 0);
        const hpp = sales.reduce((sum, s) => sum + (s.qty * s.hpp), 0);
        const beban = expenses.reduce((sum, e) => sum + e.jumlah, 0);
        const labaKotor = pendapatan - hpp;
        const labaBersih = labaKotor - beban;
        const margin = pendapatan > 0 ? ((labaBersih / pendapatan) * 100).toFixed(1) : 0;
        E.financeSummary.innerHTML = `
            <div class="text-center p-2 rounded-lg bg-green-50 dark:bg-green-900/20"><span class="text-xs opacity-60">Pendapatan</span><p class="font-bold text-sm text-green-600">${formatRupiah(pendapatan)}</p></div>
            <div class="text-center p-2 rounded-lg bg-red-50 dark:bg-red-900/20"><span class="text-xs opacity-60">HPP</span><p class="font-bold text-sm text-red-500">${formatRupiah(hpp)}</p></div>
            <div class="text-center p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20"><span class="text-xs opacity-60">Laba Kotor</span><p class="font-bold text-sm text-blue-600">${formatRupiah(labaKotor)}</p></div>
            <div class="text-center p-2 rounded-lg bg-violet-50 dark:bg-violet-900/20"><span class="text-xs opacity-60">Laba Bersih</span><p class="font-bold text-sm text-violet-600">${formatRupiah(labaBersih)}</p><p class="text-xs">Margin ${margin}%</p></div>
        `;
    }

    // -------------------- AKTIVITAS TERBARU (dengan animasi fade-in) --------------------
    function refreshRecentActivity() {
        if (!E.recentActivityList) return;
        const recent = Storage.getSales().slice(-5).reverse();
        if (recent.length === 0) {
            E.recentActivityList.innerHTML = '<div class="text-center py-4 opacity-50"><i class="ph ph-activity text-2xl"></i><p class="text-xs mt-1">Belum ada aktivitas</p></div>';
            return;
        }
        E.recentActivityList.innerHTML = recent.map((s, i) => `
            <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition animate-fadeIn" style="animation-delay:${i*0.1}s">
                <div class="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                    <i class="ph ph-shopping-cart text-green-600 text-sm"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-xs font-medium truncate">${s.klien}</p>
                    <p class="text-xs opacity-60">${s.produk} · ${s.qty} kg</p>
                </div>
                <div class="text-right flex-shrink-0">
                    <p class="text-xs font-semibold text-green-600">${formatRupiah((s.qty * s.hargaJual) - (s.diskon || 0))}</p>
                    <p class="text-xs opacity-40">${new Date(s.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                </div>
            </div>
        `).join('');
    }

    // -------------------- TOP PRODUK (dengan bar chart horizontal) --------------------
    function refreshTopProducts() {
        if (!E.topProductsList) return;
        const sales = Storage.getSales();
        const map = {};
        sales.forEach(s => {
            if (!map[s.produk]) map[s.produk] = { qty: 0, revenue: 0 };
            map[s.produk].qty += s.qty;
            map[s.produk].revenue += (s.qty * s.hargaJual - (s.diskon || 0));
        });
        const sorted = Object.entries(map).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 5);
        if (sorted.length === 0) {
            E.topProductsList.innerHTML = '<div class="text-center py-4 opacity-50 text-xs">Belum ada data</div>';
            return;
        }
        const maxRevenue = sorted[0][1].revenue;
        E.topProductsList.innerHTML = sorted.map(([p, d], i) => {
            const percent = (d.revenue / maxRevenue) * 100;
            return `<div class="mb-2">
                <div class="flex justify-between text-xs mb-1"><span>${i+1}. ${p}</span><span>${formatRupiah(d.revenue)}</span></div>
                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div class="h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500" style="width:${percent}%"></div>
                </div>
            </div>`;
        }).join('');
    }

    // -------------------- STOCK CHART --------------------
    function refreshStockChart() {
        const ctx = E.chartStockProduct?.getContext('2d');
        if (!ctx) return;
        const stockMap = CFS.Inventory ? CFS.Inventory.getStockPerProduct() : {};
        const prods = Storage.getProducts().length ? Storage.getProducts().map(p => p.name) : (Storage.defaultProducts || []);
        const data = prods.map(p => stockMap[p] || 0);
        if (stockChart) stockChart.destroy();
        stockChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: prods,
                datasets: [{
                    label: 'Stok (kg)',
                    data: data,
                    backgroundColor: data.map(v => v < 10 ? '#ef4444' : v < 20 ? '#f59e0b' : '#22c55e'),
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                indexAxis: 'y',
                animation: { duration: 1000 },
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: (ctx) => `${ctx.raw} kg` } }
                },
                scales: { x: { beginAtZero: true, grid: { display: false } }, y: { grid: { display: false } } }
            }
        });
    }

    // -------------------- DELIVERY STATUS --------------------
    function refreshDeliveryStatus() {
        if (!E.deliveryStatusList) return;
        const deliveries = Storage.getDeliveries();
        const pending = deliveries.filter(d => d.status !== 'sampai');
        if (pending.length === 0) {
            E.deliveryStatusList.innerHTML = '<div class="text-center py-4 text-green-600 text-sm"><i class="ph ph-check-circle mr-1"></i> Semua selesai</div>';
            return;
        }
        E.deliveryStatusList.innerHTML = pending.map(d => {
            const sale = Storage.getSales().find(s => s.id === d.saleId);
            const statusIcon = d.status === 'dikemas' ? '📦' : d.status === 'dikirim' ? '🚚' : '⏳';
            return `<div class="flex justify-between items-center p-1.5 text-xs">
                <span>${sale ? sale.klien : '-'}</span>
                <span>${d.courier}</span>
                <span>${statusIcon} ${d.status}</span>
            </div>`;
        }).join('');
    }

    // -------------------- TARGET SALES --------------------
    function refreshTargetSales() {
        const target = Storage.getSettings().targetPenjualanBulanan || 50000000;
        if (E.targetSalesValue) E.targetSalesValue.textContent = formatRupiah(target);
        const monthStart = getMonthStart();
        const today = getToday();
        const sales = Storage.getSales().filter(s => s.tanggal >= monthStart && s.tanggal <= today);
        const achieved = sales.reduce((sum, s) => sum + (s.qty * s.hargaJual - (s.diskon || 0)), 0);
        const percent = Math.min(100, Math.round((achieved / target) * 100));
        if (E.targetProgressFill) {
            E.targetProgressFill.style.width = percent + '%';
            E.targetProgressFill.style.background = percent >= 80 ? 'linear-gradient(90deg, #22c55e, #16a34a)' :
                                                      percent >= 50 ? 'linear-gradient(90deg, #f59e0b, #d97706)' :
                                                      'linear-gradient(90deg, #ef4444, #dc2626)';
            E.targetProgressFill.style.transition = 'width 1s ease';
        }
        if (E.targetAchieved) E.targetAchieved.textContent = formatRupiah(achieved);
        if (E.targetPercent) E.targetPercent.textContent = percent + '%';
    }

    // -------------------- TOP SUPPLIER --------------------
    function refreshTopSuppliers() {
        if (!E.topSuppliersList) return;
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
            .map(([sid, data]) => ({ name: suppliers.find(s => s.id === sid)?.name || '?', ...data }))
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 3);
        if (sorted.length === 0) {
            E.topSuppliersList.innerHTML = '<div class="text-center py-4 opacity-50 text-xs">Belum ada data</div>';
            return;
        }
        E.topSuppliersList.innerHTML = sorted.map((s, i) => `
            <div class="flex justify-between items-center p-1.5 text-xs">
                <span>${i + 1}. ${s.name}</span>
                <span class="font-semibold">${s.qty} kg</span>
            </div>
        `).join('');
    }

    // -------------------- NOTIFIKASI PREVIEW --------------------
    function refreshNotificationPreview() {
        if (!E.notifPreviewList) return;
        const trail = Storage.getAuditTrail().slice(0, 3);
        if (trail.length === 0) {
            E.notifPreviewList.innerHTML = '<div class="text-center py-4 opacity-50 text-xs">Tidak ada notifikasi</div>';
            return;
        }
        E.notifPreviewList.innerHTML = trail.map(t => `
            <div class="flex justify-between items-center p-1.5 text-xs">
                <span class="font-medium truncate">${t.aksi}</span>
                <span class="opacity-50">${new Date(t.waktu).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
        `).join('');
    }

    // -------------------- RECENT ORDERS --------------------
    function refreshRecentOrders() {
        if (!E.recentOrdersBody) return;
        const today = getToday();
        const sales = Storage.getSales().filter(s => s.tanggal === today).slice(0, 5);
        if (sales.length === 0) {
            E.recentOrdersBody.innerHTML = '<tr><td colspan="3" class="text-center p-2 opacity-50 text-xs">-</td></tr>';
            return;
        }
        E.recentOrdersBody.innerHTML = sales.map(s => {
            const total = s.qty * s.hargaJual - (s.diskon || 0);
            return `<tr><td class="p-1.5 text-xs">${s.klien}</td><td class="p-1.5 text-xs">${s.produk} (${s.qty}kg)</td><td class="p-1.5 text-xs text-right font-semibold">${formatRupiah(total)}</td></tr>`;
        }).join('');
    }

    // -------------------- KALENDER --------------------
    function refreshCalendar() {
        if (!E.dashboardCalendar || typeof FullCalendar === 'undefined') return;
        if (calendarInstance) calendarInstance.destroy();
        calendarInstance = new FullCalendar.Calendar(E.dashboardCalendar, {
            initialView: 'dayGridMonth',
            height: 'auto',
            locale: 'id',
            headerToolbar: { left: 'prev', center: 'title', right: 'next' },
            buttonText: { today: 'Hari Ini' },
            events: Storage.getSales().map(s => ({
                title: s.klien,
                start: s.tanggal,
                color: s.channel === 'online' ? '#6366f1' : '#f59e0b',
                textColor: '#fff'
            }))
        });
        calendarInstance.render();
    }

    // -------------------- SIDEBAR STATUS --------------------
    function refreshSidebarStatus() {
        if (E.storedBatchesCount) E.storedBatchesCount.textContent = Storage.getBatches().length;
        if (E.storedTransactionsCount) E.storedTransactionsCount.textContent = Storage.getSales().length;
        if (E.storedCustomersCount) E.storedCustomersCount.textContent = Object.keys(Storage.getCustomers()).length;
        if (E.storedSuppliersCount) E.storedSuppliersCount.textContent = Storage.getSuppliers().length;
        if (E.storedDeliveriesCount) E.storedDeliveriesCount.textContent = Storage.getDeliveries().length;
    }

    // -------------------- NOTIFIKASI BADGE --------------------
    function updateNotifBadge() {
        if (!E.notifBadge) return;
        const trail = Storage.getAuditTrail();
        const totalNotif = trail.length;
        E.notifBadge.textContent = totalNotif;
        E.notifBadge.classList.toggle('hidden', totalNotif === 0);
    }

    // -------------------- TREND CHART (7 HARI) --------------------
    function refreshTrendChart() {
        const ctx = E.chartTrend?.getContext('2d');
        if (!ctx) return;
        const sales = Storage.getSales();
        const last7 = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const ds = d.toISOString().split('T')[0];
            const total = sales.filter(s => s.tanggal === ds).reduce((sum, s) => sum + (s.qty * s.hargaJual - (s.diskon || 0)), 0);
            last7.push(total);
        }
        if (trendChart) trendChart.destroy();
        trendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'],
                datasets: [{
                    label: 'Pendapatan',
                    data: last7,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37,99,235,0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#2563eb'
                }]
            },
            options: {
                responsive: true,
                animation: { duration: 1500, easing: 'easeOutQuart' },
                plugins: { legend: { display: false } },
                scales: { y: { ticks: { callback: val => formatRupiah(val) }, grid: { color: 'rgba(0,0,0,0.05)' } }, x: { grid: { display: false } } }
            }
        });
    }

    // -------------------- GAUGE CHART (TARGET) --------------------
    function refreshGaugeChart() {
        const ctx = E.chartGauge?.getContext('2d');
        if (!ctx) return;
        const target = Storage.getSettings().targetPenjualanBulanan || 50000000;
        const monthStart = getMonthStart();
        const today = getToday();
        const sales = Storage.getSales().filter(s => s.tanggal >= monthStart && s.tanggal <= today);
        const achieved = sales.reduce((sum, s) => sum + (s.qty * s.hargaJual - (s.diskon || 0)), 0);
        const percent = Math.min(100, Math.round((achieved / target) * 100));
        if (gaugeChart) gaugeChart.destroy();
        gaugeChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [percent, 100 - percent],
                    backgroundColor: [percent >= 80 ? '#22c55e' : percent >= 50 ? '#f59e0b' : '#ef4444', '#e5e7eb'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                cutout: '75%',
                animation: { duration: 1500 },
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                }
            }
        });
    }

    // -------------------- THERMOMETER CHART (STOK VS KAPASITAS) --------------------
    function refreshThermometerChart() {
        const ctx = E.chartThermometer?.getContext('2d');
        if (!ctx) return;
        const stockMap = CFS.Inventory ? CFS.Inventory.getStockPerProduct() : {};
        const totalStock = Object.values(stockMap).reduce((a, b) => a + b, 0);
        const capacity = 10000;
        const percent = Math.min(100, Math.round((totalStock / capacity) * 100));
        if (thermometerChart) thermometerChart.destroy();
        thermometerChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Gudang'],
                datasets: [{
                    data: [percent],
                    backgroundColor: percent > 80 ? '#ef4444' : percent > 60 ? '#f59e0b' : '#22c55e',
                    borderRadius: 8,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                indexAxis: 'y',
                animation: { duration: 1000 },
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `${ctx.raw}% terpakai` } } },
                scales: { x: { max: 100, beginAtZero: true, grid: { display: false } }, y: { grid: { display: false } } }
            }
        });
    }

    // -------------------- HEATMAP (PENJUALAN PER JAM) --------------------
    function refreshHeatmap() {
        const ctx = E.chartHeatmap?.getContext('2d');
        if (!ctx) return;
        const sales = Storage.getSales();
        const hourlyData = new Array(24).fill(0);
        sales.forEach(s => {
            const hour = new Date(s.tanggal + 'T' + (s.jam || '00:00')).getHours();
            hourlyData[hour] += s.qty * s.hargaJual - (s.diskon || 0);
        });
        const max = Math.max(...hourlyData, 1);
        const colors = hourlyData.map(v => {
            const intensity = v / max;
            return `rgba(37, 99, 235, ${0.2 + intensity * 0.8})`;
        });
        if (heatmapChart) heatmapChart.destroy();
        heatmapChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Array.from({length: 24}, (_, i) => `${i}:00`),
                datasets: [{
                    label: 'Pendapatan per Jam',
                    data: hourlyData,
                    backgroundColor: colors,
                    borderColor: '#2563eb',
                    borderWidth: 1,
                    borderRadius: 4,
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { callback: val => formatRupiah(val) } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    // -------------------- FORECAST (SIMPLE MOVING AVERAGE) --------------------
    function refreshForecast() {
        const ctx = E.chartForecast?.getContext('2d');
        if (!ctx) return;
        const sales = Storage.getSales();
        const last30 = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const ds = d.toISOString().split('T')[0];
            const total = sales.filter(s => s.tanggal === ds).reduce((sum, s) => sum + (s.qty * s.hargaJual - (s.diskon || 0)), 0);
            last30.push(total);
        }
        // Simple Moving Average 7 hari
        const forecast = [];
        for (let i = 0; i < 7; i++) {
            const slice = last30.slice(i, i + 7);
            const avg = slice.reduce((a,b) => a + b, 0) / slice.length;
            forecast.push(Math.round(avg));
        }
        const labels = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() + i);
            labels.push(d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }));
        }
        if (forecastChart) forecastChart.destroy();
        forecastChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Prediksi Pendapatan (7 hari)',
                    data: forecast,
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 5,
                    pointBackgroundColor: '#8b5cf6',
                    borderDash: [5, 5],
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { y: { ticks: { callback: val => formatRupiah(val) } } }
            }
        });
    }

    // ==================== EXPORT API ====================
    CFS.Dashboard = {
        init: initDashboard,
        refresh: refreshDashboard
    };
})();
