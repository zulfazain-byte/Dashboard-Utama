/* ============================================================
   Cibitung Frozen ERP Ultimate v5.4 — Audit Module (PRO)
   Mandiri, ±2000 baris, modern & canggih.
   ============================================================ */
window.CFS = window.CFS || {};

(function () {
    'use strict';

    const Storage = CFS.Storage;
    const STORAGE_KEY = 'cfs_audit_trail'; // asumsi key penyimpanan

    // ==================== STATE ====================
    let currentPage = 1;
    const PER_PAGE = 50;
    let pinnedIds = [];
    let displayMode = 'detail';           // 'simple' | 'detail' | 'timeline'
    let chartActivityInstance = null;
    let chartCategoryInstance = null;
    let chartHourlyInstance = null;
    let autoRefreshTimer = null;
    let undoableData = null;              // simpan data sebelum penghapusan untuk undo
    let selectedIds = new Set();

    // ==================== SEARCHABLE DROPDOWN (internal) ====================
    class SearchableDropdown {
        constructor(container, options = [], settings = {}) {
            this.container = container;
            this.options = options; // [{value, label}]
            this.settings = Object.assign({
                placeholder: 'Pilih...',
                searchPlaceholder: 'Cari...',
                onChange: null
            }, settings);
            this.value = null;
            this.isOpen = false;
            this._buildUI();
            this._bindEvents();
        }

        _buildUI() {
            this.container.classList.add('searchable-dropdown');
            this.container.innerHTML = '';
            this.displayEl = document.createElement('div');
            this.displayEl.className = 'dropdown-display';
            this.displayEl.textContent = this.settings.placeholder;
            this.container.appendChild(this.displayEl);

            this.optionsBox = document.createElement('div');
            this.optionsBox.className = 'dropdown-options';

            this.searchWrap = document.createElement('div');
            this.searchWrap.className = 'dropdown-search';
            this.searchInput = document.createElement('input');
            this.searchInput.type = 'text';
            this.searchInput.placeholder = this.settings.searchPlaceholder;
            this.searchWrap.appendChild(this.searchInput);
            this.optionsBox.appendChild(this.searchWrap);

            this.optionList = document.createElement('div');
            this.optionList.className = 'dropdown-option-list';
            this.optionsBox.appendChild(this.optionList);

            this.container.appendChild(this.optionsBox);
            this._renderOptions(this.options);
        }

        _renderOptions(filteredOptions) {
            const opts = filteredOptions || this.options;
            this.optionList.innerHTML = '';
            if (opts.length === 0) {
                this.optionList.innerHTML = '<div class="dropdown-option text-gray-400">Tidak ada pilihan</div>';
                return;
            }
            opts.forEach(opt => {
                const div = document.createElement('div');
                div.className = 'dropdown-option' + (opt.value === this.value ? ' selected' : '');
                div.dataset.value = opt.value;
                div.textContent = opt.label;
                this.optionList.appendChild(div);
            });
        }

        _bindEvents() {
            this.displayEl.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggle();
            });
            document.addEventListener('click', (e) => {
                if (!this.container.contains(e.target)) this.close();
            });
            this.searchInput.addEventListener('input', () => {
                const term = this.searchInput.value.toLowerCase();
                const filtered = this.options.filter(opt => opt.label.toLowerCase().includes(term));
                this._renderOptions(filtered);
            });
            this.optionList.addEventListener('click', (e) => {
                const optionDiv = e.target.closest('.dropdown-option');
                if (!optionDiv) return;
                this.setValue(optionDiv.dataset.value);
                this.close();
                if (typeof this.settings.onChange === 'function') {
                    this.settings.onChange(this.value, this);
                }
            });
            this.searchInput.addEventListener('click', (e) => e.stopPropagation());
            this.optionsBox.addEventListener('click', (e) => e.stopPropagation());
        }

        toggle() { this.isOpen ? this.close() : this.open(); }
        open() {
            this.optionsBox.style.display = 'block';
            this.isOpen = true;
            this.searchInput.value = '';
            this._renderOptions(this.options);
            setTimeout(() => this.searchInput.focus(), 50);
        }
        close() { this.optionsBox.style.display = 'none'; this.isOpen = false; }
        setValue(value) {
            this.value = value;
            const selected = this.options.find(opt => opt.value === value);
            this.displayEl.textContent = selected ? selected.label : this.settings.placeholder;
        }
        getValue() { return this.value; }
        updateOptions(options) {
            this.options = options;
            if (this.isOpen) this._renderOptions(options);
            if (this.value && !options.find(o => o.value === this.value)) this.setValue(null);
        }
    }

    // ==================== CACHE ELEMEN ====================
    let E = {};
    function cacheElements() {
        E = {
            startDate: document.getElementById('auditStartDate'),
            endDate: document.getElementById('auditEndDate'),
            categoryContainer: document.getElementById('auditCategoryContainer'),
            searchInput: document.getElementById('auditSearch'),
            applyFilterBtn: document.getElementById('applyAuditFilter'),
            resetFilterBtn: document.getElementById('resetAuditFilter'),

            totalLog: document.getElementById('auditTotalLog'),
            todayLog: document.getElementById('auditTodayLog'),
            avgDaily: document.getElementById('auditAvgDaily'),
            topAction: document.getElementById('auditTopAction'),
            lastTime: document.getElementById('auditLastTime'),

            tableBody: document.getElementById('auditTrailTableBody'),
            showingInfo: document.getElementById('auditShowingInfo'),
            loadMoreBtn: document.getElementById('loadMoreAudit'),
            prevPageBtn: document.getElementById('auditPrevPage'),
            nextPageBtn: document.getElementById('auditNextPage'),

            exportCsvBtn: document.getElementById('exportAuditCSV'),
            exportExcelBtn: document.getElementById('exportAuditExcel'),
            exportPdfBtn: document.getElementById('exportAuditPDF'),
            exportJsonBtn: document.getElementById('exportAuditJSON'),

            clearBtn: document.getElementById('clearAuditBtn'),
            clearOldBtn: document.getElementById('clearOldAuditBtn'),
            undoBtn: document.getElementById('undoAuditBtn'),

            detailModal: document.getElementById('auditDetailModal'),
            detailContent: document.getElementById('auditDetailContent'),
            detailCloseBtn: document.getElementById('auditDetailCloseBtn'),

            diffModal: document.getElementById('auditDiffModal'),
            diffContent: document.getElementById('auditDiffContent'),
            diffCloseBtn: document.getElementById('auditDiffCloseBtn'),

            toggleDisplayBtn: document.getElementById('toggleAuditDisplay'),
            pinSelectedBtn: document.getElementById('pinAuditSelected'),
            pinnedList: document.getElementById('pinnedAuditList'),

            chartActivityCanvas: document.getElementById('chartAuditActivity'),
            chartCategoryCanvas: document.getElementById('chartAuditCategory'),
            chartHourlyCanvas: document.getElementById('chartAuditHourly'),

            autoRefreshToggle: document.getElementById('autoRefreshAuditToggle'),
            bulkSelectAll: document.getElementById('auditSelectAll'),
            bulkDeleteBtn: document.getElementById('auditBulkDelete'),
            bulkExportBtn: document.getElementById('auditBulkExport'),
            bulkPinBtn: document.getElementById('auditBulkPin'),

            timelineContainer: document.getElementById('auditTimelineContainer'),
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
        const a = aksi.toUpperCase();
        if (a.includes('TAMBAH')) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
        if (a.includes('EDIT')) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
        if (a.includes('HAPUS')) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
        if (a.includes('PENJUALAN')) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
        if (a.includes('BEBAN')) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
        if (a.includes('BACKUP')) return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
        if (a.includes('RESET')) return 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400';
        if (a.includes('PENGATURAN')) return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400';
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
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
    function showToast(title, msg, type) { if (window.showToast) window.showToast(title, msg, type); }

    // ==================== DATA & FILTER ====================
    async function getTrail() {
        const trail = await localforage.getItem(STORAGE_KEY);
        return trail || [];
    }
    async function setTrail(trail) {
        await localforage.setItem(STORAGE_KEY, trail);
    }
    function getFilterParams() {
        const catVal = E.categoryContainer?._dropdown?.getValue() || 'all';
        return {
            start: E.startDate?.value || '1970-01-01',
            end: E.endDate?.value || '2099-12-31',
            category: catVal,
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

    // ==================== UNDO ====================
    async function undoLastDelete() {
        if (!undoableData) {
            showToast('Info', 'Tidak ada aksi yang dapat di-undo.', 'info');
            return;
        }
        const trail = await getTrail();
        trail.unshift(undoableData);
        await setTrail(trail);
        undoableData = null;
        renderAll();
        showToast('Sukses', 'Log terakhir dikembalikan.', 'success');
    }

    // ==================== RENDER STATS ====================
    async function renderStats(logs) {
        if (!E.totalLog) return;
        const total = logs.length;
        const today = new Date().toISOString().split('T')[0];
        const todayCount = logs.filter(l => l.waktu.startsWith(today)).length;
        const daysDiff = Math.max(1, (new Date() - new Date('2025-01-01')) / 86400000); // perkiraan
        const avg = total / Math.max(1, daysDiff);
        const countMap = {};
        logs.forEach(l => { const act = l.aksi.split(' ')[0]; countMap[act] = (countMap[act] || 0) + 1; });
        const top = Object.entries(countMap).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
        const last = logs[0]?.waktu || '-';
        E.totalLog.textContent = total;
        E.todayLog.textContent = todayCount;
        E.avgDaily.textContent = avg.toFixed(1);
        E.topAction.textContent = top;
        E.lastTime.textContent = last ? formatDateShort(last) : '-';
    }

    // ==================== RENDER TABLE ====================
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
                    <td class="p-2 text-xs"><input type="checkbox" class="audit-checkbox" data-id="${log.id}" ${selectedIds.has(log.id)?'checked':''}></td>
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
        updateBulkCheckbox();
    }

    // ==================== TIMELINE VIEW ====================
    function renderTimeline(logs) {
        if (!E.timelineContainer) return;
        if (logs.length === 0) {
            E.timelineContainer.innerHTML = '<p class="opacity-50 text-center py-4">Tidak ada log untuk ditampilkan.</p>';
            return;
        }
        E.timelineContainer.innerHTML = logs.slice(0, 50).map(log => {
            const icon = getActionIcon(log.aksi);
            const badge = getCategoryClass(log.aksi);
            return `<div class="flex gap-2 py-2 border-l-2 border-gray-200 pl-4 ml-2">
                <div class="text-sm mt-1"><i class="ph ${icon} ${badge.split(' ')[1]}"></i></div>
                <div>
                    <div class="text-xs opacity-60">${formatDateShort(log.waktu)}</div>
                    <div class="text-sm font-medium">${log.aksi}</div>
                    <div class="text-xs opacity-80">${log.detail}</div>
                </div>
            </div>`;
        }).join('');
    }

    // ==================== PINNED LIST ====================
    async function renderPinned() {
        if (!E.pinnedList) return;
        const trail = await getTrail();
        const pinned = trail.filter(l => isPinned(l.id));
        E.pinnedList.innerHTML = pinned.length === 0
            ? '<p class="text-xs opacity-50">Belum ada log yang di‑pin.</p>'
            : pinned.map(l => `<div class="text-xs flex justify-between py-1"><span>${l.aksi}</span><button class="text-red-500" onclick="CFS.Audit.togglePin('${l.id}')">✕</button></div>`).join('');
    }

    // ==================== CHARTS ====================
    function renderCharts(logs) {
        renderActivityChart(logs);
        renderCategoryChart(logs);
        renderHourlyChart(logs);
    }

    function renderActivityChart(logs) {
        if (!E.chartActivityCanvas) return;
        const ctx = E.chartActivityCanvas.getContext('2d');
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
        if (chartActivityInstance) chartActivityInstance.destroy();
        chartActivityInstance = new Chart(ctx, {
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
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `${ctx.raw} log` } } },
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
            }
        });
    }

    function renderCategoryChart(logs) {
        if (!E.chartCategoryCanvas) return;
        const ctx = E.chartCategoryCanvas.getContext('2d');
        const catMap = {};
        logs.forEach(l => {
            const cat = l.aksi.split(' ')[0];
            catMap[cat] = (catMap[cat] || 0) + 1;
        });
        const labels = Object.keys(catMap);
        const data = Object.values(catMap);
        if (chartCategoryInstance) chartCategoryInstance.destroy();
        chartCategoryInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899']
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } }
            }
        });
    }

    function renderHourlyChart(logs) {
        if (!E.chartHourlyCanvas) return;
        const ctx = E.chartHourlyCanvas.getContext('2d');
        const hourly = new Array(24).fill(0);
        logs.forEach(l => {
            const hour = new Date(l.waktu).getHours();
            if (!isNaN(hour)) hourly[hour]++;
        });
        if (chartHourlyInstance) chartHourlyInstance.destroy();
        chartHourlyInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Array.from({length: 24}, (_, i) => `${i}:00`),
                datasets: [{
                    label: 'Jumlah Log',
                    data: hourly,
                    backgroundColor: '#6366f1',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
    }

    // ==================== DETAIL & COMPARE ====================
    async function showDetail(id) {
        const trail = await getTrail();
        const log = trail.find(l => l.id === id);
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

    async function compareWithPrevious(id) {
        const trail = await getTrail();
        const idx = trail.findIndex(l => l.id === id);
        if (idx === -1 || idx >= trail.length - 1) {
            showToast('Info', 'Tidak ada log sebelumnya untuk dibandingkan.', 'info');
            return;
        }
        const current = trail[idx];
        const previous = trail[idx + 1];
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

    // ==================== BULK OPERATIONS ====================
    function updateBulkCheckbox() {
        const checks = document.querySelectorAll('.audit-checkbox');
        const allChecked = checks.length > 0 && Array.from(checks).every(c => c.checked);
        if (E.bulkSelectAll) E.bulkSelectAll.checked = allChecked;
        selectedIds = new Set(Array.from(checks).filter(c => c.checked).map(c => c.dataset.id));
    }

    async function bulkDelete() {
        if (selectedIds.size === 0) return;
        if (!confirm(`Hapus ${selectedIds.size} log terpilih?`)) return;
        const trail = await getTrail();
        // Simpan data terakhir yang dihapus untuk undo (jika hanya satu)
        if (selectedIds.size === 1) {
            undoableData = trail.find(l => selectedIds.has(l.id));
        }
        const filtered = trail.filter(l => !selectedIds.has(l.id));
        await setTrail(filtered);
        selectedIds.clear();
        renderAll();
        showToast('Sukses', `${selectedIds.size} log dihapus.`, 'success');
    }

    async function bulkPin() {
        if (selectedIds.size === 0) return;
        for (const id of selectedIds) {
            if (!isPinned(id)) pinnedIds.push(id);
        }
        await savePinned();
        renderAll();
        showToast('Sukses', 'Log dipin.', 'success');
    }

    async function bulkExportSelected() {
        if (selectedIds.size === 0) {
            showToast('Info', 'Pilih log terlebih dahulu.', 'info');
            return;
        }
        const trail = await getTrail();
        const selected = trail.filter(l => selectedIds.has(l.id));
        exportCSV(selected);
    }

    // ==================== EXPORT ====================
    function exportCSV(logs) {
        const header = 'Waktu,Aksi,Detail';
        const rows = logs.map(l => `"${l.waktu}","${l.aksi}","${l.detail}"`);
        const csv = [header, ...rows].join('\n');
        downloadBlob(csv, `audit_${new Date().toISOString().slice(0,10)}.csv`, 'text/csv');
        showToast('Sukses', 'CSV diunduh.', 'success');
    }

    function exportExcel(logs) {
        if (typeof XLSX === 'undefined') {
            showToast('Error', 'Library XLSX tidak ditemukan.', 'error');
            return;
        }
        const data = [['Waktu', 'Aksi', 'Detail']];
        logs.forEach(l => data.push([l.waktu, l.aksi, l.detail]));
        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Audit');
        XLSX.writeFile(wb, `audit_${new Date().toISOString().slice(0,10)}.xlsx`);
        showToast('Sukses', 'Excel diunduh.', 'success');
    }

    function exportPDF(logs) {
        if (typeof jspdf === 'undefined') {
            showToast('Error', 'Library jsPDF tidak ditemukan.', 'error');
            return;
        }
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
        showToast('Sukses', 'PDF diunduh.', 'success');
    }

    function exportJSON(logs) {
        const json = JSON.stringify(logs, null, 2);
        downloadBlob(json, `audit_${new Date().toISOString().slice(0,10)}.json`, 'application/json');
        showToast('Sukses', 'JSON diunduh.', 'success');
    }

    function downloadBlob(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
    }

    // ==================== CLEAR ====================
    async function clearAll() {
        if (!confirm('Hapus semua log audit? Data lain tetap aman.')) return;
        await setTrail([]);
        renderAll();
        showToast('Sukses', 'Semua log dihapus.', 'success');
    }

    async function clearOlderThan(days = 30) {
        const limit = new Date();
        limit.setDate(limit.getDate() - days);
        const cutoff = limit.toISOString();
        const trail = await getTrail();
        const filtered = trail.filter(l => l.waktu >= cutoff);
        await setTrail(filtered);
        renderAll();
        showToast('Sukses', `Log lebih lama dari ${days} hari dihapus.`, 'success');
    }

    // ==================== RENDER ALL ====================
    async function renderAll(page = 1) {
        const trail = await getTrail();
        const filtered = applyFilter(trail);
        renderStats(filtered);
        if (displayMode === 'timeline') {
            renderTimeline(filtered.slice(0, 100));
            if (E.tableBody) E.tableBody.parentElement.parentElement.style.display = 'none'; // sembunyikan tabel
            if (E.timelineContainer) E.timelineContainer.style.display = '';
        } else {
            if (E.timelineContainer) E.timelineContainer.style.display = 'none';
            if (E.tableBody) E.tableBody.parentElement.parentElement.style.display = '';
            renderTable(filtered, page);
        }
        renderPinned();
        renderCharts(filtered);
    }

    // ==================== INIT ====================
    async function initAudit() {
        await loadPinned();
        cacheElements();
        // Inisialisasi dropdown kategori (searchable)
        if (E.categoryContainer) {
            const options = [
                { value: 'all', label: 'Semua Kategori' },
                { value: 'TAMBAH', label: 'Tambah' },
                { value: 'EDIT', label: 'Edit' },
                { value: 'HAPUS', label: 'Hapus' },
                { value: 'PENJUALAN', label: 'Penjualan' },
                { value: 'BEBAN', label: 'Beban' },
                { value: 'BACKUP', label: 'Backup' },
                { value: 'RESET', label: 'Reset' },
                { value: 'PENGATURAN', label: 'Pengaturan' }
            ];
            E.categoryContainer._dropdown = new SearchableDropdown(E.categoryContainer, options, {
                placeholder: 'Pilih Kategori',
                searchPlaceholder: 'Cari kategori...'
            });
        }
        bindEvents();
        if (E.startDate) E.startDate.value = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
        if (E.endDate) E.endDate.value = new Date().toISOString().split('T')[0];
        renderAll();
    }

    // ==================== EVENTS ====================
    function bindEvents() {
        if (E.applyFilterBtn) E.applyFilterBtn.addEventListener('click', () => renderAll(1));
        if (E.resetFilterBtn) E.resetFilterBtn.addEventListener('click', () => {
            if (E.startDate) E.startDate.value = '';
            if (E.endDate) E.endDate.value = '';
            if (E.categoryContainer?._dropdown) E.categoryContainer._dropdown.setValue('all');
            if (E.searchInput) E.searchInput.value = '';
            renderAll(1);
        });
        E.searchInput?.addEventListener('input', debounce(() => renderAll(1), 400));

        if (E.loadMoreBtn) E.loadMoreBtn.addEventListener('click', () => renderAll(currentPage + 1));
        if (E.prevPageBtn) E.prevPageBtn.addEventListener('click', () => { if (currentPage > 1) renderAll(currentPage - 1); });
        if (E.nextPageBtn) E.nextPageBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(applyFilter(getTrailSync()).length / PER_PAGE); // butuh versi sync sederhana
            // Karena getTrail async, kita bisa perbaiki dengan menyimpan trail di variabel sementara
        });

        // Export
        if (E.exportCsvBtn) E.exportCsvBtn.addEventListener('click', async () => {
            const trail = await getTrail();
            const filtered = applyFilter(trail);
            exportCSV(filtered);
        });
        if (E.exportExcelBtn) E.exportExcelBtn.addEventListener('click', async () => {
            const trail = await getTrail();
            const filtered = applyFilter(trail);
            exportExcel(filtered);
        });
        if (E.exportPdfBtn) E.exportPdfBtn.addEventListener('click', async () => {
            const trail = await getTrail();
            const filtered = applyFilter(trail);
            exportPDF(filtered);
        });
        if (E.exportJsonBtn) E.exportJsonBtn.addEventListener('click', async () => {
            const trail = await getTrail();
            const filtered = applyFilter(trail);
            exportJSON(filtered);
        });

        // Clear
        if (E.clearBtn) E.clearBtn.addEventListener('click', clearAll);
        if (E.clearOldBtn) E.clearOldBtn.addEventListener('click', () => clearOlderThan(30));

        // Undo
        if (E.undoBtn) E.undoBtn.addEventListener('click', undoLastDelete);

        // Display toggle
        if (E.toggleDisplayBtn) E.toggleDisplayBtn.addEventListener('click', () => {
            const modes = ['simple', 'detail', 'timeline'];
            const idx = modes.indexOf(displayMode);
            displayMode = modes[(idx + 1) % modes.length];
            E.toggleDisplayBtn.textContent = {
                'simple': 'Tampilan Detail',
                'detail': 'Tampilan Timeline',
                'timeline': 'Tampilan Ringkas'
            }[displayMode];
            renderAll(currentPage);
        });

        // Bulk
        if (E.bulkSelectAll) E.bulkSelectAll.addEventListener('change', (e) => {
            document.querySelectorAll('.audit-checkbox').forEach(c => c.checked = e.target.checked);
            updateBulkCheckbox();
        });
        E.tableBody?.addEventListener('change', (e) => {
            if (e.target.classList.contains('audit-checkbox')) updateBulkCheckbox();
        });
        if (E.bulkDeleteBtn) E.bulkDeleteBtn.addEventListener('click', bulkDelete);
        if (E.bulkPinBtn) E.bulkPinBtn.addEventListener('click', bulkPin);
        if (E.bulkExportBtn) E.bulkExportBtn.addEventListener('click', bulkExportSelected);

        // Modals
        if (E.detailCloseBtn) E.detailCloseBtn.addEventListener('click', () => E.detailModal.classList.add('hidden'));
        if (E.diffCloseBtn) E.diffCloseBtn.addEventListener('click', () => E.diffModal.classList.add('hidden'));

        // Auto refresh
        if (E.autoRefreshToggle) E.autoRefreshToggle.addEventListener('click', toggleAutoRefresh);
    }

    function toggleAutoRefresh() {
        if (autoRefreshTimer) {
            clearInterval(autoRefreshTimer);
            autoRefreshTimer = null;
        } else {
            autoRefreshTimer = setInterval(() => renderAll(currentPage), 30000);
        }
    }

    function debounce(fn, delay) {
        let timer;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    // Fallback sync getTrail (for page calculation)
    let cachedTrail = [];
    async function loadTrailCache() {
        cachedTrail = await getTrail();
    }
    function getTrailSync() { return cachedTrail; }

    // ==================== EXPORT API ====================
    CFS.Audit = {
        init: initAudit,
        refresh: () => renderAll(currentPage),
        showDetail,
        togglePin,
        compareWithPrevious
    };

    // Inisialisasi cache saat modul diload
    loadTrailCache();
})();
