/* ============================================================
   Cibitung Frozen ERP Ultimate v5.4 — Products Module (EXTENDED)
   Self‑contained, ±2000 baris, fitur lengkap & terintegrasi,
   termasuk searchable dropdown mobile‑friendly untuk banyak produk.
   ============================================================ */
window.CFS = window.CFS || {};

(function () {
    'use strict';

    const Storage = CFS.Storage;

    // ==================== STATE ====================
    let products = [];                 // mirror dari Storage.getProducts()
    let categories = [];              // dari localforage
    let variants = [];                // dari localforage
    let filteredProducts = [];        // hasil filter
    let currentFilter = {
        search: '',
        category: '',
        status: 'all',                // 'all', 'active', 'inactive'
        supplier: '',
        tags: [],
        minStockLevel: 0,
        sortBy: 'name',
        sortOrder: 'asc'
    };
    let selectedIds = new Set();
    let editingId = null;
    let undoStack = [];               // max 20
    let currentPage = 1;
    const PER_PAGE = 25;
    let settings = {
        showThumbnail: true,
        compactView: false
    };

    // ==================== CACHE ELEMEN ====================
    let E = {};
    function cacheElements() {
        E = {
            // Statistik
            prodTotalProduct: document.getElementById('prodTotalProduct'),
            prodActiveProduct: document.getElementById('prodActiveProduct'),
            prodLowStock: document.getElementById('prodLowStock'),
            prodTotalCategory: document.getElementById('prodTotalCategory'),
            prodTotalVariants: document.getElementById('prodTotalVariants'),
            prodTotalValue: document.getElementById('prodTotalValue'),

            // Sub tab
            subTabBtns: document.querySelectorAll('.products-subtab-btn'),
            subTabContents: document.querySelectorAll('.products-subtab-content'),

            // Daftar Produk
            prodSearch: document.getElementById('prodSearch'),
            prodFilterCategory: document.getElementById('prodFilterCategory'),
            prodFilterStatus: document.getElementById('prodFilterStatus'),
            prodFilterSupplier: document.getElementById('prodFilterSupplier'),
            prodFilterTags: document.getElementById('prodFilterTags'),
            prodSortBy: document.getElementById('prodSortBy'),
            prodSortOrder: document.getElementById('prodSortOrder'),
            applyProdFilter: document.getElementById('applyProdFilter'),
            clearProdFilter: document.getElementById('clearProdFilter'),
            productTableBody: document.getElementById('productTableBody'),
            prodTableWrapper: document.getElementById('prodTableWrapper'),
            prodSelectAll: document.getElementById('prodSelectAll'),
            prodBulkActions: document.getElementById('prodBulkActions'),
            prodBulkDelete: document.getElementById('prodBulkDelete'),
            prodBulkCategory: document.getElementById('prodBulkCategory'),
            prodBulkCategorySelect: document.getElementById('prodBulkCategorySelect'),
            prodBulkStatus: document.getElementById('prodBulkStatus'),
            prodBulkSupplier: document.getElementById('prodBulkSupplier'),
            prodBulkSupplierInput: document.getElementById('prodBulkSupplierInput'),
            exportProductsCSV2: document.getElementById('exportProductsCSV2'),
            exportProductsJSON: document.getElementById('exportProductsJSON'),
            importProductsJSON: document.getElementById('importProductsJSON'),
            prodUndoBtn: document.getElementById('prodUndoBtn'),
            prodShowingInfo: document.getElementById('prodShowingInfo'),
            prodLoadMore: document.getElementById('prodLoadMore'),
            prodPageInput: document.getElementById('prodPageInput'),
            prodGoPage: document.getElementById('prodGoPage'),

            // Form
            productCustomForm: document.getElementById('productCustomForm'),
            prodEditId: document.getElementById('prodEditId'),
            newProductName: document.getElementById('newProductName'),
            newProductCategory: document.getElementById('newProductCategory'),
            newProductSKU: document.getElementById('newProductSKU'),
            newProductBarcode: document.getElementById('newProductBarcode'),
            newProductSupplier: document.getElementById('newProductSupplier'),
            newProductCostPrice: document.getElementById('newProductCostPrice'),
            newProductSellingPrice: document.getElementById('newProductSellingPrice'),
            newProductMinStock: document.getElementById('newProductMinStock'),
            newProductUnit: document.getElementById('newProductUnit'),
            newProductBrand: document.getElementById('newProductBrand'),
            newProductTags: document.getElementById('newProductTags'),
            newProductTagsContainer: document.getElementById('newProductTagsContainer'),
            newProductDescription: document.getElementById('newProductDescription'),
            newProductStatus: document.getElementById('newProductStatus'),
            newProductImageInput: document.getElementById('newProductImageInput'),
            newProductImagePreview: document.getElementById('newProductImagePreview'),
            prodSubmitBtn: document.getElementById('prodSubmitBtn'),
            prodCancelEditBtn: document.getElementById('prodCancelEditBtn'),
            prodFormTitle: document.getElementById('prodFormTitle'),

            // Kategori
            newCategoryName: document.getElementById('newCategoryName'),
            newCategoryIcon: document.getElementById('newCategoryIcon'),
            addCategoryBtn: document.getElementById('addCategoryBtn'),
            categoryTableBody: document.getElementById('categoryTableBody'),

            // Varian
            variantProduk: document.getElementById('variantProduk'),
            variantProdukContainer: document.getElementById('variantProdukContainer'),
            variantName: document.getElementById('variantName'),
            variantWeight: document.getElementById('variantWeight'),
            variantPrice: document.getElementById('variantPrice'),
            variantCost: document.getElementById('variantCost'),
            variantImageInput: document.getElementById('variantImageInput'),
            variantImagePreview: document.getElementById('variantImagePreview'),
            addVariantBtn: document.getElementById('addVariantBtn'),
            variantTableBody: document.getElementById('variantTableBody'),

            // Import / Export
            exportProductsCSV: document.getElementById('exportProductsCSV'),
            importProductsCSV: document.getElementById('importProductsCSV'),
            downloadTemplateCSV: document.getElementById('downloadTemplateCSV'),

            // Quick Edit
            quickEditModal: document.getElementById('quickEditModal'),
            quickEditForm: document.getElementById('quickEditForm'),
            quickEditName: document.getElementById('quickEditName'),
            quickEditCategory: document.getElementById('quickEditCategory'),
            quickEditMinStock: document.getElementById('quickEditMinStock'),
            quickEditUnit: document.getElementById('quickEditUnit'),
            quickEditSupplier: document.getElementById('quickEditSupplier'),
            quickEditBarcode: document.getElementById('quickEditBarcode'),
            quickEditStatus: document.getElementById('quickEditStatus'),
            quickEditId: document.getElementById('quickEditId'),
            quickEditCloseBtn: document.getElementById('quickEditCloseBtn'),

            // Detail Modal
            detailModal: document.getElementById('productDetailModal'),
            detailContent: document.getElementById('productDetailContent'),
            detailCloseBtn: document.getElementById('detailCloseBtn')
        };
    }

    // ==================== CUSTOM STYLES ====================
    function addCustomStyles() {
        if (document.getElementById('cfs-products-extended-styles')) return;
        const style = document.createElement('style');
        style.id = 'cfs-products-extended-styles';
        style.textContent = `
            /* Searchable Dropdown */
            .searchable-dropdown {
                position: relative;
                display: inline-block;
                width: 100%;
            }
            .searchable-dropdown .dropdown-display {
                border: 1px solid #d1d5db;
                border-radius: 0.375rem;
                padding: 0.5rem 2rem 0.5rem 0.75rem;
                background: white;
                cursor: pointer;
                min-height: 2.5rem;
                display: flex;
                align-items: center;
                justify-content: space-between;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .searchable-dropdown .dropdown-display::after {
                content: '▾';
                position: absolute;
                right: 0.75rem;
                pointer-events: none;
            }
            .searchable-dropdown .dropdown-options {
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                max-height: 15rem;
                overflow-y: auto;
                background: white;
                border: 1px solid #d1d5db;
                border-top: none;
                border-radius: 0 0 0.375rem 0.375rem;
                z-index: 50;
                display: none;
                box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
                margin-top: -1px;
            }
            .searchable-dropdown .dropdown-search {
                position: sticky;
                top: 0;
                background: white;
                padding: 0.5rem;
                border-bottom: 1px solid #e5e7eb;
            }
            .searchable-dropdown .dropdown-search input {
                width: 100%;
                border: 1px solid #d1d5db;
                border-radius: 0.25rem;
                padding: 0.25rem 0.5rem;
            }
            .searchable-dropdown .dropdown-option {
                padding: 0.5rem 0.75rem;
                cursor: pointer;
                border-bottom: 1px solid #f3f4f6;
            }
            .searchable-dropdown .dropdown-option:hover {
                background-color: #f3f4f6;
            }
            .searchable-dropdown .dropdown-option.selected {
                background-color: #e0f2fe;
                font-weight: 500;
            }
            .searchable-dropdown .dropdown-option:last-child {
                border-bottom: none;
            }

            /* Table responsive */
            .product-table-responsive {
                overflow-x: auto;
                -webkit-overflow-scrolling: touch;
            }
            .product-table-responsive table {
                min-width: 800px;
            }

            /* Tag badges */
            .tag-badge {
                display: inline-block;
                background: #e0f2fe;
                color: #0369a1;
                padding: 0.1rem 0.5rem;
                border-radius: 999px;
                font-size: 0.75rem;
                margin: 0.15rem;
            }
            .tag-badge .remove-tag {
                cursor: pointer;
                margin-left: 0.25rem;
                font-weight: bold;
            }

            /* Image preview */
            .image-preview {
                max-width: 150px;
                max-height: 150px;
                margin-top: 0.5rem;
                border: 1px solid #e5e7eb;
                border-radius: 0.375rem;
            }

            /* Tablet & mobile adjustments */
            @media (max-width: 640px) {
                .product-actions-cell {
                    white-space: nowrap;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // ==================== HELPER ====================
    function formatNumber(n) { return n.toLocaleString('id-ID'); }
    function showToast(title, msg, type) {
        if (window.showToast) window.showToast(title, msg, type);
    }
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
    function generateId(prefix = 'id') {
        return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // ==================== SEARCHABLE DROPDOWN COMPONENT ====================
    class SearchableDropdown {
        constructor(container, options = [], settings = {}) {
            this.container = container;
            this.options = options; // [{value, label, selected}]
            this.settings = Object.assign({
                placeholder: 'Pilih...',
                searchPlaceholder: 'Cari...',
                onChange: null,
                id: null
            }, settings);
            this.value = null;
            this.isOpen = false;
            this._buildUI();
            this._bindEvents();
            if (this.settings.id) container.dataset.dropdownId = this.settings.id;
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

            // Search input
            this.searchWrap = document.createElement('div');
            this.searchWrap.className = 'dropdown-search';
            this.searchInput = document.createElement('input');
            this.searchInput.type = 'text';
            this.searchInput.placeholder = this.settings.searchPlaceholder;
            this.searchWrap.appendChild(this.searchInput);
            this.optionsBox.appendChild(this.searchWrap);

            // Options list
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
            // Toggle open
            this.displayEl.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggle();
            });

            // Close when clicking outside
            document.addEventListener('click', (e) => {
                if (!this.container.contains(e.target)) {
                    this.close();
                }
            });

            // Search filter
            this.searchInput.addEventListener('input', () => {
                const term = this.searchInput.value.toLowerCase();
                const filtered = this.options.filter(opt => opt.label.toLowerCase().includes(term));
                this._renderOptions(filtered);
            });

            // Option click
            this.optionList.addEventListener('click', (e) => {
                const optionDiv = e.target.closest('.dropdown-option');
                if (!optionDiv) return;
                const value = optionDiv.dataset.value;
                this.setValue(value);
                this.close();
                if (typeof this.settings.onChange === 'function') {
                    this.settings.onChange(value, this);
                }
            });

            // Prevent search input click from closing
            this.searchInput.addEventListener('click', (e) => e.stopPropagation());
            this.optionsBox.addEventListener('click', (e) => e.stopPropagation());
        }

        toggle() {
            this.isOpen ? this.close() : this.open();
        }

        open() {
            this.optionsBox.style.display = 'block';
            this.isOpen = true;
            this.searchInput.value = '';
            this._renderOptions(this.options);
            setTimeout(() => this.searchInput.focus(), 50);
        }

        close() {
            this.optionsBox.style.display = 'none';
            this.isOpen = false;
        }

        setValue(value) {
            this.value = value;
            const selected = this.options.find(opt => opt.value === value);
            this.displayEl.textContent = selected ? selected.label : this.settings.placeholder;
            // Update hidden original if exists
            if (this._originalSelect) {
                this._originalSelect.value = value;
                this._originalSelect.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }

        getValue() {
            return this.value;
        }

        updateOptions(options) {
            this.options = options;
            if (this.isOpen) {
                this._renderOptions(options);
            }
            if (this.value && !options.find(o => o.value === this.value)) {
                this.setValue(null);
            }
        }

        destroy() {
            // clean up if needed
            this.container.innerHTML = '';
            this.container.classList.remove('searchable-dropdown');
        }

        // Attach to an existing <select> replacement
        attachToSelect(selectElement) {
            this._originalSelect = selectElement;
            // Hide original
            selectElement.style.display = 'none';
            // Set options from select
            const opts = Array.from(selectElement.options).map(opt => ({
                value: opt.value,
                label: opt.text,
                selected: opt.selected
            }));
            this.updateOptions(opts);
            // Sync initial value
            if (selectElement.value) this.setValue(selectElement.value);
            // Listen to external changes
            const observer = new MutationObserver(() => {
                if (selectElement.value !== this.value) {
                    this.setValue(selectElement.value);
                }
            });
            observer.observe(selectElement, { attributes: true, attributeFilter: ['value'] });
            // When value changes externally (e.g., form reset)
            selectElement.addEventListener('change', () => {
                if (selectElement.value !== this.value) {
                    this.setValue(selectElement.value);
                }
            });
        }
    }

    // Helper to upgrade a <select> element to searchable dropdown
    function upgradeSelectToSearchable(selectElement, placeholder = 'Pilih...') {
        if (!selectElement) return null;
        // Check if already upgraded
        if (selectElement.dataset.searchableUpgraded === 'true') return null;
        // Create wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'searchable-dropdown-wrapper';
        selectElement.parentNode.insertBefore(wrapper, selectElement);
        wrapper.appendChild(selectElement);
        selectElement.dataset.searchableUpgraded = 'true';
        // Build component
        const dropdown = new SearchableDropdown(wrapper, [], { placeholder, id: selectElement.id });
        dropdown.attachToSelect(selectElement);
        return dropdown;
    }

    // ==================== LOAD DATA ====================
    async function loadData() {
        products = Storage.getProducts();
        categories = (await localforage.getItem('cfs_product_categories')) || [];
        variants = (await localforage.getItem('cfs_product_variants')) || [];
        if (!categories.length) {
            categories = [
                { id: 'cat_ikan_laut', name: 'Ikan Laut', icon: '🐟' },
                { id: 'cat_ikan_tawar', name: 'Ikan Tawar', icon: '🐠' },
                { id: 'cat_seafood', name: 'Seafood Lainnya', icon: '🦐' }
            ];
            await localforage.setItem('cfs_product_categories', categories);
        }
        if (!products.length) {
            const def = Storage.defaultProducts || [];
            for (let i = 0; i < def.length; i++) {
                await Storage.addProduct({
                    id: generateId('prd'),
                    name: def[i],
                    category: '',
                    sku: '',
                    barcode: '',
                    supplier: '',
                    costPrice: 0,
                    sellingPrice: 0,
                    minStock: 10,
                    unit: 'kg',
                    brand: '',
                    tags: [],
                    description: '',
                    image: '',
                    status: 'active',
                    created: new Date().toISOString(),
                    updated: new Date().toISOString()
                });
            }
            products = Storage.getProducts();
        }
        // Load settings
        const storedSettings = await localforage.getItem('cfs_product_settings');
        if (storedSettings) settings = Object.assign(settings, storedSettings);
    }

    async function saveCategories() { await localforage.setItem('cfs_product_categories', categories); }
    async function saveVariants() { await localforage.setItem('cfs_product_variants', variants); }
    async function saveSettings() { await localforage.setItem('cfs_product_settings', settings); }

    // ==================== SUB TAB SWITCHING ====================
    function setupSubTabs() {
        if (!E.subTabBtns) return;
        E.subTabBtns.forEach(btn => {
            btn.addEventListener('click', function () {
                E.subTabBtns.forEach(b => { b.classList.remove('btn-primary', 'active'); b.classList.add('btn-secondary'); });
                this.classList.add('btn-primary', 'active');
                this.classList.remove('btn-secondary');
                const tab = this.dataset.productsTab;
                E.subTabContents.forEach(c => c.classList.add('hidden'));
                const target = document.getElementById(tab);
                if (target) target.classList.remove('hidden');
                if (tab === 'products-category') renderCategoryTable();
                if (tab === 'products-variants') { renderVariantTable(); initVariantProductDropdown(); }
                if (tab === 'products-list') { applyFilterAndRender(); populateDropdowns(); }
            });
        });
    }

    // ==================== STATISTIK ====================
    function refreshStats() {
        const stockMap = CFS.Inventory ? CFS.Inventory.getStockPerProduct() : {};
        const total = products.length;
        const activeCount = products.filter(p => p.status === 'active').length;
        const lowStockCount = products.filter(p => {
            const stock = stockMap[p.name] || 0;
            return p.status === 'active' && stock > 0 && stock < (p.minStock || 10);
        }).length;
        const totalValue = products.reduce((sum, p) => {
            const stock = stockMap[p.name] || 0;
            return sum + (p.costPrice || 0) * stock;
        }, 0);

        if (E.prodTotalProduct) E.prodTotalProduct.textContent = total;
        if (E.prodActiveProduct) E.prodActiveProduct.textContent = activeCount;
        if (E.prodLowStock) E.prodLowStock.textContent = lowStockCount;
        if (E.prodTotalCategory) E.prodTotalCategory.textContent = categories.length;
        if (E.prodTotalVariants) E.prodTotalVariants.textContent = variants.length;
        if (E.prodTotalValue) E.prodTotalValue.textContent = 'Rp ' + formatNumber(totalValue);
    }

    // ==================== POPULATE DROPDOWNS ====================
    function populateDropdowns() {
        // Category filter
        if (E.prodFilterCategory) {
            const options = '<option value="">Semua Kategori</option>' + categories.map(c => `<option value="${c.name}">${c.icon ? c.icon + ' ' : ''}${c.name}</option>`).join('');
            E.prodFilterCategory.innerHTML = options;
            if (E.prodFilterCategory._searchableDropdown) {
                const opts = Array.from(E.prodFilterCategory.options).map(o => ({ value: o.value, label: o.text }));
                E.prodFilterCategory._searchableDropdown.updateOptions(opts);
            }
        }
        // Form category
        if (E.newProductCategory) {
            E.newProductCategory.innerHTML = '<option value="">Tanpa Kategori</option>' + categories.map(c => `<option value="${c.name}">${c.icon ? c.icon + ' ' : ''}${c.name}</option>`).join('');
            if (E.newProductCategory._searchableDropdown) {
                const opts = Array.from(E.newProductCategory.options).map(o => ({ value: o.value, label: o.text }));
                E.newProductCategory._searchableDropdown.updateOptions(opts);
            }
        }
        // Bulk category select
        if (E.prodBulkCategorySelect) {
            E.prodBulkCategorySelect.innerHTML = '<option value="">--Pilih Kategori--</option>' + categories.map(c => `<option value="${c.name}">${c.icon ? c.icon + ' ' : ''}${c.name}</option>`).join('');
            if (E.prodBulkCategorySelect._searchableDropdown) {
                const opts = Array.from(E.prodBulkCategorySelect.options).map(o => ({ value: o.value, label: o.text }));
                E.prodBulkCategorySelect._searchableDropdown.updateOptions(opts);
            }
        }
        // Variant product dropdown (special)
        initVariantProductDropdown();
        // Quick edit category
        if (E.quickEditCategory) {
            E.quickEditCategory.innerHTML = '<option value="">Tanpa Kategori</option>' + categories.map(c => `<option value="${c.name}">${c.icon ? c.icon + ' ' : ''}${c.name}</option>`).join('');
        }
    }

    // ==================== FILTER & SORT ====================
    function applyFilterAndRender() {
        let data = [...products];
        if (currentFilter.search) {
            const kw = currentFilter.search.toLowerCase();
            data = data.filter(p => p.name.toLowerCase().includes(kw) || (p.sku || '').toLowerCase().includes(kw) || (p.barcode || '').includes(kw) || (p.supplier || '').toLowerCase().includes(kw));
        }
        if (currentFilter.category) {
            data = data.filter(p => (p.category || '') === currentFilter.category);
        }
        if (currentFilter.status !== 'all') {
            data = data.filter(p => p.status === currentFilter.status);
        }
        if (currentFilter.supplier) {
            data = data.filter(p => (p.supplier || '').toLowerCase().includes(currentFilter.supplier.toLowerCase()));
        }
        if (currentFilter.tags && currentFilter.tags.length) {
            data = data.filter(p => currentFilter.tags.some(tag => (p.tags || []).includes(tag)));
        }
        if (currentFilter.minStockLevel > 0) {
            const stockMap = CFS.Inventory ? CFS.Inventory.getStockPerProduct() : {};
            data = data.filter(p => (stockMap[p.name] || 0) < currentFilter.minStockLevel);
        }

        const order = currentFilter.sortOrder === 'desc' ? -1 : 1;
        if (currentFilter.sortBy === 'name') data.sort((a, b) => order * a.name.localeCompare(b.name, 'id'));
        else if (currentFilter.sortBy === 'sku') data.sort((a, b) => order * (a.sku || '').localeCompare(b.sku || '', 'id'));
        else if (currentFilter.sortBy === 'stock') {
            const stockMap = CFS.Inventory ? CFS.Inventory.getStockPerProduct() : {};
            data.sort((a, b) => order * ((stockMap[a.name] || 0) - (stockMap[b.name] || 0)));
        }
        else if (currentFilter.sortBy === 'updated') data.sort((a, b) => order * (new Date(a.updated || 0) - new Date(b.updated || 0)));

        filteredProducts = data;
        currentPage = 1;  // reset to first page after filter change
        renderProductTable();
    }

    // ==================== RENDER TABEL PRODUK ====================
    function renderProductTable() {
        if (!E.productTableBody) return;
        const stockMap = CFS.Inventory ? CFS.Inventory.getStockPerProduct() : {};
        const totalPages = Math.ceil(filteredProducts.length / PER_PAGE);
        const startIdx = (currentPage - 1) * PER_PAGE;
        const pageData = filteredProducts.slice(startIdx, startIdx + PER_PAGE);

        if (pageData.length === 0) {
            E.productTableBody.innerHTML = `<tr><td colspan="11" class="text-center py-10 opacity-50">
                <i class="ph ph-package text-4xl block mb-3"></i>
                <p class="text-sm">Tidak ada produk yang sesuai filter.</p>
            </td></tr>`;
            E.prodShowingInfo.textContent = '';
            E.prodLoadMore.style.display = 'none';
            return;
        }

        E.productTableBody.innerHTML = pageData.map(p => {
            const currentStock = stockMap[p.name] || 0;
            const stockColor = currentStock === 0 ? 'text-red-500' : currentStock < (p.minStock || 10) ? 'text-amber-500' : 'text-green-500';
            const thumbnail = settings.showThumbnail && p.image ? `<img src="${p.image}" class="w-10 h-10 object-cover rounded-full inline-block">` : '';
            return `<tr class="border-t hover:bg-slate-50 dark:hover:bg-slate-700 transition text-sm">
                <td class="p-2"><input type="checkbox" class="prod-checkbox" data-id="${p.id}" ${selectedIds.has(p.id) ? 'checked' : ''}></td>
                <td class="p-2 cursor-pointer underline text-blue-600" onclick="CFS.Products.showProductDetail('${p.id}')">${thumbnail} ${escapeHtml(p.name)}</td>
                <td class="p-2">${escapeHtml(p.category || '-')}</td>
                <td class="p-2">${p.sku || '-'}</td>
                <td class="p-2">${p.barcode || '-'}</td>
                <td class="p-2">${p.supplier || '-'}</td>
                <td class="p-2 text-right">${p.minStock || 10} ${p.unit || 'kg'}</td>
                <td class="p-2 text-center font-semibold ${stockColor}">${currentStock} ${p.unit || 'kg'}</td>
                <td class="p-2">${p.status === 'active' ? '<span class="text-green-600">Aktif</span>' : '<span class="text-red-600">Nonaktif</span>'}</td>
                <td class="p-2 text-xs opacity-70">${p.brand || '-'}</td>
                <td class="p-2 text-center product-actions-cell">
                    <button class="btn btn-xs btn-secondary" onclick="CFS.Products.editProduct('${p.id}')" title="Edit"><i class="ph ph-pencil"></i></button>
                    <button class="btn btn-xs btn-primary" onclick="CFS.Products.quickEdit('${p.id}')" title="Quick Edit"><i class="ph ph-lightning"></i></button>
                    <button class="btn btn-xs btn-info" onclick="CFS.Products.duplicateProduct('${p.id}')" title="Duplikat"><i class="ph ph-copy"></i></button>
                    <button class="btn btn-xs btn-danger" onclick="CFS.Products.deleteProduct('${p.id}')" title="Hapus"><i class="ph ph-trash"></i></button>
                </td>
            </tr>`;
        }).join('');

        E.prodShowingInfo.textContent = `Menampilkan ${startIdx+1}-${Math.min(startIdx+PER_PAGE, filteredProducts.length)} dari ${filteredProducts.length} (Halaman ${currentPage}/${totalPages})`;
        E.prodLoadMore.style.display = currentPage < totalPages ? '' : 'none';
        E.prodPageInput.max = totalPages;
        E.prodPageInput.value = currentPage;

        // Wrap table in responsive container if not already
        if (E.prodTableWrapper && !E.prodTableWrapper.classList.contains('product-table-responsive')) {
            E.prodTableWrapper.classList.add('product-table-responsive');
        }
    }

    // ==================== PRODUCT DETAIL MODAL ====================
    function showProductDetail(id) {
        const p = products.find(x => x.id === id);
        if (!p) return;
        const stockMap = CFS.Inventory ? CFS.Inventory.getStockPerProduct() : {};
        const stock = stockMap[p.name] || 0;
        if (E.detailModal && E.detailContent) {
            E.detailContent.innerHTML = `
                <div class="space-y-2">
                    ${p.image ? `<img src="${p.image}" class="image-preview mb-2">` : ''}
                    <p><strong>Nama:</strong> ${escapeHtml(p.name)}</p>
                    <p><strong>Kategori:</strong> ${escapeHtml(p.category || '-')}</p>
                    <p><strong>SKU:</strong> ${p.sku || '-'}</p>
                    <p><strong>Barcode:</strong> ${p.barcode || '-'}</p>
                    <p><strong>Supplier:</strong> ${p.supplier || '-'}</p>
                    <p><strong>Merek:</strong> ${p.brand || '-'}</p>
                    <p><strong>Stok Minimum:</strong> ${p.minStock} ${p.unit}</p>
                    <p><strong>Stok Saat Ini:</strong> <span class="${stock < p.minStock ? 'text-amber-500' : ''}">${stock} ${p.unit}</span></p>
                    <p><strong>Harga Beli:</strong> Rp ${formatNumber(p.costPrice || 0)}</p>
                    <p><strong>Harga Jual:</strong> Rp ${formatNumber(p.sellingPrice || 0)}</p>
                    <p><strong>Status:</strong> ${p.status === 'active' ? 'Aktif' : 'Nonaktif'}</p>
                    <p><strong>Tags:</strong> ${(p.tags || []).map(t => `<span class="tag-badge">${t}</span>`).join(' ') || '-'}</p>
                    <p><strong>Deskripsi:</strong> ${p.description || '-'}</p>
                    <p class="text-xs opacity-70">Dibuat: ${new Date(p.created).toLocaleString('id-ID')}<br>Diperbarui: ${new Date(p.updated).toLocaleString('id-ID')}</p>
                </div>
            `;
            E.detailModal.classList.remove('hidden');
        }
    }

    // ==================== FORM TAMBAH / EDIT ====================
    function editProduct(id) {
        const p = products.find(x => x.id === id);
        if (!p) return;
        switchToSubTab('products-form');
        E.prodEditId.value = p.id;
        E.newProductName.value = p.name;
        E.newProductCategory.value = p.category || '';
        E.newProductSKU.value = p.sku || '';
        E.newProductBarcode.value = p.barcode || '';
        E.newProductSupplier.value = p.supplier || '';
        E.newProductCostPrice.value = p.costPrice || '';
        E.newProductSellingPrice.value = p.sellingPrice || '';
        E.newProductMinStock.value = p.minStock || 10;
        E.newProductUnit.value = p.unit || 'kg';
        E.newProductBrand.value = p.brand || '';
        E.newProductTags.value = (p.tags || []).join(', ');
        E.newProductDescription.value = p.description || '';
        E.newProductStatus.value = p.status || 'active';
        if (p.image) {
            if (E.newProductImagePreview) E.newProductImagePreview.src = p.image;
            if (E.newProductImagePreview) E.newProductImagePreview.style.display = 'block';
        } else {
            if (E.newProductImagePreview) E.newProductImagePreview.style.display = 'none';
        }
        E.prodFormTitle.textContent = 'Edit Produk';
        E.prodSubmitBtn.textContent = '💾 Simpan Perubahan';
        E.prodCancelEditBtn.style.display = 'inline-flex';
        editingId = p.id;
        renderTagsInputPreviews();
    }

    function cancelEdit() {
        E.productCustomForm.reset();
        E.prodEditId.value = '';
        E.newProductMinStock.value = 10;
        E.newProductUnit.value = 'kg';
        E.newProductStatus.value = 'active';
        E.prodFormTitle.textContent = 'Tambah Produk Baru';
        E.prodSubmitBtn.textContent = '➕ Tambah Produk';
        E.prodCancelEditBtn.style.display = 'none';
        editingId = null;
        if (E.newProductImagePreview) E.newProductImagePreview.style.display = 'none';
        renderTagsInputPreviews();
    }

    function handleImageUpload(inputElement, previewElement) {
        const file = inputElement.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            previewElement.src = e.target.result;
            previewElement.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }

    async function handleProductSubmit(e) {
        e.preventDefault();
        const id = E.prodEditId.value;
        const name = E.newProductName.value.trim();
        const category = E.newProductCategory.value;
        const sku = E.newProductSKU.value.trim();
        const barcode = E.newProductBarcode.value.trim();
        const supplier = E.newProductSupplier.value.trim();
        const costPrice = parseFloat(E.newProductCostPrice.value) || 0;
        const sellingPrice = parseFloat(E.newProductSellingPrice.value) || 0;
        const minStock = parseInt(E.newProductMinStock.value) || 10;
        const unit = E.newProductUnit.value.trim() || 'kg';
        const brand = E.newProductBrand.value.trim();
        const tags = (E.newProductTags.value || '').split(',').map(t => t.trim()).filter(Boolean);
        const description = E.newProductDescription.value.trim();
        const status = E.newProductStatus.value || 'active';
        const image = E.newProductImagePreview && E.newProductImagePreview.src && E.newProductImagePreview.style.display !== 'none' ? E.newProductImagePreview.src : '';

        if (!name) { showToast('Error', 'Nama produk wajib diisi.', 'error'); return; }

        const data = {
            name, category, sku, barcode, supplier,
            costPrice, sellingPrice, minStock, unit,
            brand, tags, description, status, image,
            updated: new Date().toISOString()
        };

        if (id) {
            const product = products.find(p => p.id === id);
            if (product) {
                Object.assign(product, data);
                await Storage.saveAllData();
                showToast('Sukses', 'Produk diperbarui.', 'success');
            }
        } else {
            data.id = generateId('prd');
            data.created = new Date().toISOString();
            await Storage.addProduct(data);
            showToast('Sukses', 'Produk baru ditambahkan.', 'success');
        }

        cancelEdit();
        await reloadProducts();
        refreshStats();
        applyFilterAndRender();
        populateDropdowns();
        if (CFS.Inventory) CFS.Inventory.populateProductDropdowns();
        if (CFS.Dashboard) CFS.Dashboard.refresh();
    }

    async function deleteProduct(id) {
        if (!confirm('Hapus produk? Batch yang terkait tidak akan terhapus.')) return;
        const product = products.find(p => p.id === id);
        if (!product) return;
        undoStack.push(JSON.parse(JSON.stringify(product)));
        if (undoStack.length > 20) undoStack.shift();
        await Storage.deleteProduct(id);
        selectedIds.delete(id);
        await reloadProducts();
        refreshStats();
        applyFilterAndRender();
        populateDropdowns();
        if (CFS.Inventory) CFS.Inventory.populateProductDropdowns();
        showToast('Sukses', `Produk "${product.name}" dihapus. Undo tersedia.`, 'success');
    }

    async function undoDelete() {
        if (undoStack.length === 0) { showToast('Info', 'Tidak ada yang bisa di-undo.', 'info'); return; }
        const product = undoStack.pop();
        product.id = generateId('prd_undo'); // new id to avoid conflict
        await Storage.addProduct(product);
        await reloadProducts();
        refreshStats();
        applyFilterAndRender();
        populateDropdowns();
        if (CFS.Inventory) CFS.Inventory.populateProductDropdowns();
        showToast('Sukses', `Produk "${product.name}" dikembalikan.`, 'success');
    }

    function duplicateProduct(id) {
        const p = products.find(x => x.id === id);
        if (!p) return;
        const newProduct = { ...p, id: generateId('prd'), name: p.name + ' (Copy)', created: new Date().toISOString(), updated: new Date().toISOString() };
        Storage.addProduct(newProduct).then(async () => {
            await reloadProducts();
            refreshStats();
            applyFilterAndRender();
            populateDropdowns();
            showToast('Sukses', `Produk "${newProduct.name}" dibuat.`, 'success');
        });
    }

    // ==================== QUICK EDIT ====================
    function quickEdit(id) {
        const p = products.find(x => x.id === id);
        if (!p) return;
        E.quickEditId.value = p.id;
        E.quickEditName.value = p.name;
        E.quickEditCategory.value = p.category || '';
        E.quickEditMinStock.value = p.minStock || 10;
        E.quickEditUnit.value = p.unit || 'kg';
        E.quickEditSupplier.value = p.supplier || '';
        E.quickEditBarcode.value = p.barcode || '';
        E.quickEditStatus.value = p.status || 'active';
        if (E.quickEditModal) E.quickEditModal.classList.remove('hidden');
    }

    async function handleQuickEditSubmit(e) {
        e.preventDefault();
        const id = E.quickEditId.value;
        const name = E.quickEditName.value.trim();
        const category = E.quickEditCategory.value;
        const minStock = parseInt(E.quickEditMinStock.value) || 10;
        const unit = E.quickEditUnit.value.trim() || 'kg';
        const supplier = E.quickEditSupplier.value.trim();
        const barcode = E.quickEditBarcode.value.trim();
        const status = E.quickEditStatus.value || 'active';

        if (!name) { showToast('Error', 'Nama produk wajib diisi.', 'error'); return; }

        const product = products.find(p => p.id === id);
        if (product) {
            product.name = name;
            product.category = category;
            product.minStock = minStock;
            product.unit = unit;
            product.supplier = supplier;
            product.barcode = barcode;
            product.status = status;
            product.updated = new Date().toISOString();
            await Storage.saveAllData();
            showToast('Sukses', 'Produk diperbarui (quick edit).', 'success');
            if (E.quickEditModal) E.quickEditModal.classList.add('hidden');
            await reloadProducts();
            applyFilterAndRender();
            populateDropdowns();
            if (CFS.Inventory) CFS.Inventory.populateProductDropdowns();
        }
    }

    // ==================== BULK ACTIONS ====================
    async function bulkDeleteProducts() {
        if (selectedIds.size === 0) { showToast('Info', 'Tidak ada produk terpilih.', 'info'); return; }
        if (!confirm(`Hapus ${selectedIds.size} produk terpilih?`)) return;
        for (const id of selectedIds) {
            await Storage.deleteProduct(id);
        }
        selectedIds.clear();
        await reloadProducts();
        refreshStats();
        applyFilterAndRender();
        populateDropdowns();
        if (CFS.Inventory) CFS.Inventory.populateProductDropdowns();
        showToast('Sukses', 'Produk terpilih dihapus.', 'success');
    }

    async function bulkChangeCategory() {
        if (selectedIds.size === 0) { showToast('Info', 'Tidak ada produk terpilih.', 'info'); return; }
        const newCat = E.prodBulkCategorySelect ? E.prodBulkCategorySelect.value : '';
        if (!newCat) { showToast('Info', 'Pilih kategori tujuan.', 'info'); return; }
        for (const id of selectedIds) {
            const p = products.find(x => x.id === id);
            if (p) { p.category = newCat; p.updated = new Date().toISOString(); }
        }
        await Storage.saveAllData();
        selectedIds.clear();
        await reloadProducts();
        applyFilterAndRender();
        populateDropdowns();
        showToast('Sukses', `Kategori diubah menjadi "${newCat}".`, 'success');
    }

    async function bulkChangeStatus(status) {
        if (selectedIds.size === 0) { showToast('Info', 'Tidak ada produk terpilih.', 'info'); return; }
        for (const id of selectedIds) {
            const p = products.find(x => x.id === id);
            if (p) { p.status = status; p.updated = new Date().toISOString(); }
        }
        await Storage.saveAllData();
        await reloadProducts();
        applyFilterAndRender();
        showToast('Sukses', `Status ${selectedIds.size} produk diubah.`, 'success');
    }

    async function bulkChangeSupplier() {
        if (selectedIds.size === 0) { showToast('Info', 'Tidak ada produk terpilih.', 'info'); return; }
        const supplier = E.prodBulkSupplierInput ? E.prodBulkSupplierInput.value.trim() : '';
        if (!supplier) { showToast('Info', 'Masukkan nama supplier.', 'info'); return; }
        for (const id of selectedIds) {
            const p = products.find(x => x.id === id);
            if (p) { p.supplier = supplier; p.updated = new Date().toISOString(); }
        }
        await Storage.saveAllData();
        await reloadProducts();
        applyFilterAndRender();
        showToast('Sukses', `Supplier diubah untuk ${selectedIds.size} produk.`, 'success');
    }

    // ==================== KATEGORI ====================
    function renderCategoryTable() {
        if (!E.categoryTableBody) return;
        E.categoryTableBody.innerHTML = categories.map(c => {
            const count = products.filter(p => (p.category || '') === c.name).length;
            return `<tr class="border-t text-sm">
                <td class="p-2">${c.icon ? c.icon + ' ' : ''}${c.name}</td>
                <td class="p-2 text-right">${count} produk</td>
                <td class="p-2 text-center">
                    <button class="btn btn-xs btn-secondary" onclick="CFS.Products.editCategory('${c.id}')" title="Edit"><i class="ph ph-pencil"></i></button>
                    <button class="btn btn-xs btn-danger" onclick="CFS.Products.deleteCategory('${c.id}')" title="Hapus"><i class="ph ph-trash"></i></button>
                </td>
            </tr>`;
        }).join('') || '<tr><td colspan="3" class="text-center p-4 opacity-50">Belum ada kategori.</td></tr>';
    }

    async function addCategory() {
        const name = E.newCategoryName?.value.trim();
        const icon = E.newCategoryIcon?.value.trim();
        if (!name) return;
        const id = generateId('cat');
        categories.push({ id, name, icon: icon || '' });
        await saveCategories();
        E.newCategoryName.value = '';
        E.newCategoryIcon.value = '';
        renderCategoryTable();
        populateDropdowns();
        showToast('Sukses', 'Kategori ditambahkan.', 'success');
    }

    function editCategory(id) {
        const cat = categories.find(c => c.id === id);
        if (!cat) return;
        const newName = prompt('Nama kategori baru:', cat.name);
        if (!newName) return;
        const newIcon = prompt('Ikon (emoji opsional):', cat.icon || '');
        cat.name = newName.trim();
        cat.icon = newIcon.trim();
        saveCategories().then(() => {
            renderCategoryTable();
            populateDropdowns();
            showToast('Sukses', 'Kategori diperbarui.', 'success');
        });
    }

    async function deleteCategory(id) {
        if (!confirm('Hapus kategori? Produk dalam kategori ini akan kehilangan kategorinya.')) return;
        const target = categories.find(c => c.id === id);
        if (target) {
            categories = categories.filter(c => c.id !== id);
            products.forEach(p => { if (p.category === target.name) p.category = ''; });
            await Storage.saveAllData();
            await saveCategories();
            renderCategoryTable();
            populateDropdowns();
            showToast('Sukses', 'Kategori dihapus.', 'success');
        }
    }

    // ==================== VARIAN ====================
    function initVariantProductDropdown() {
        if (!E.variantProdukContainer) return;
        // Create searchable dropdown for product selection in variant if not already
        if (!E.variantProdukContainer._variantDropdown) {
            const dropdown = new SearchableDropdown(E.variantProdukContainer, [], {
                placeholder: 'Pilih Produk',
                searchPlaceholder: 'Ketik nama produk...',
                id: 'variantProdukDropdown'
            });
            E.variantProdukContainer._variantDropdown = dropdown;
            // Hide the original select if exists
            if (E.variantProduk) E.variantProduk.style.display = 'none';
        }
        // Update options
        const opts = products.map(p => ({ value: p.id, label: p.name }));
        E.variantProdukContainer._variantDropdown.updateOptions(opts);
        // Sync selected value from original if any
        if (E.variantProduk && E.variantProduk.value) {
            E.variantProdukContainer._variantDropdown.setValue(E.variantProduk.value);
        }
    }

    function getSelectedProductForVariant() {
        if (E.variantProdukContainer && E.variantProdukContainer._variantDropdown) {
            return E.variantProdukContainer._variantDropdown.getValue();
        }
        return E.variantProduk ? E.variantProduk.value : null;
    }

    function renderVariantTable() {
        if (!E.variantTableBody) return;
        E.variantTableBody.innerHTML = variants.map(v => {
            const prod = products.find(p => p.id === v.productId);
            return `<tr class="border-t text-sm">
                <td class="p-2">${prod ? escapeHtml(prod.name) : '?'}</td>
                <td class="p-2">${v.name}</td>
                <td class="p-2 text-right">${v.weight} kg</td>
                <td class="p-2 text-right">${v.price ? 'Rp ' + formatNumber(v.price) : '-'}</td>
                <td class="p-2 text-right">${v.cost ? 'Rp ' + formatNumber(v.cost) : '-'}</td>
                <td class="p-2">${v.image ? '<img src="'+v.image+'" style="height:30px">' : ''}</td>
                <td class="p-2 text-center"><button class="btn btn-xs btn-danger" onclick="CFS.Products.deleteVariant('${v.id}')" title="Hapus"><i class="ph ph-trash"></i></button></td>
            </tr>`;
        }).join('') || '<tr><td colspan="7" class="text-center p-4 opacity-50">Belum ada varian.</td></tr>';
    }

    async function addVariant() {
        const productId = getSelectedProductForVariant();
        const name = E.variantName?.value.trim();
        const weight = parseFloat(E.variantWeight?.value);
        const price = parseFloat(E.variantPrice?.value) || 0;
        const cost = parseFloat(E.variantCost?.value) || 0;
        const image = E.variantImagePreview && E.variantImagePreview.src && E.variantImagePreview.style.display !== 'none' ? E.variantImagePreview.src : '';
        if (!productId || !name || isNaN(weight) || weight <= 0) {
            showToast('Error', 'Lengkapi data varian dengan benar.', 'error');
            return;
        }
        variants.push({
            id: generateId('var'),
            productId, name, weight, price, cost, image,
            created: new Date().toISOString()
        });
        await saveVariants();
        E.variantName.value = '';
        E.variantWeight.value = '';
        E.variantPrice.value = '';
        E.variantCost.value = '';
        if (E.variantImagePreview) E.variantImagePreview.style.display = 'none';
        if (E.variantImageInput) E.variantImageInput.value = '';
        renderVariantTable();
        refreshStats();
        showToast('Sukses', 'Varian kemasan ditambahkan.', 'success');
    }

    async function deleteVariant(id) {
        if (!confirm('Hapus varian?')) return;
        variants = variants.filter(v => v.id !== id);
        await saveVariants();
        renderVariantTable();
        refreshStats();
        showToast('Sukses', 'Varian dihapus.', 'success');
    }

    // ==================== IMPORT / EXPORT ====================
    function exportToCSV() {
        const rows = [['Nama', 'Kategori', 'SKU', 'Barcode', 'Supplier', 'Merek', 'Stok Minimum', 'Satuan', 'Tags', 'Deskripsi', 'Status', 'Harga Beli', 'Harga Jual']];
        products.forEach(p => rows.push([p.name, p.category || '', p.sku || '', p.barcode || '', p.supplier || '', p.brand || '', p.minStock || 10, p.unit || 'kg', (p.tags || []).join(';'), p.description || '', p.status, p.costPrice || 0, p.sellingPrice || 0]));
        const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `produk_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        showToast('Sukses', 'Data produk diekspor ke CSV.', 'success');
    }

    function exportToJSON() {
        const data = JSON.stringify({ products, categories, variants }, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `produk_full_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        showToast('Sukses', 'Data lengkap diekspor ke JSON.', 'success');
    }

    function downloadTemplate() {
        const csv = 'Nama,Kategori,SKU,Barcode,Supplier,Merek,Stok Minimum,Satuan,Tags,Deskripsi,Status,Harga Beli,Harga Jual\nContoh Produk,Ikan Laut,SKU001,1234567890,Supplier A,MerekA,10,kg,tag1;tag2,Deskripsi produk,active,50000,75000';
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'template_produk.csv';
        a.click();
    }

    function importFromCSV() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const text = await file.text();
            const lines = text.split('\n').filter(l => l.trim());
            if (lines.length < 2) return;
            let imported = 0;
            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(',').map(c => c.replace(/^"|"$/g, '').trim());
                if (cols.length < 8) continue;
                const [name, category, sku, barcode, supplier, brand, minStock, unit, tagsStr, description, status, costPrice, sellingPrice] = cols;
                if (!name) continue;
                await Storage.addProduct({
                    id: generateId('prd_imp'),
                    name,
                    category: category || '',
                    sku: sku || '',
                    barcode: barcode || '',
                    supplier: supplier || '',
                    brand: brand || '',
                    minStock: parseInt(minStock) || 10,
                    unit: unit || 'kg',
                    tags: tagsStr ? tagsStr.split(';').map(t => t.trim()) : [],
                    description: description || '',
                    status: status || 'active',
                    costPrice: parseFloat(costPrice) || 0,
                    sellingPrice: parseFloat(sellingPrice) || 0,
                    image: '',
                    created: new Date().toISOString(),
                    updated: new Date().toISOString()
                });
                imported++;
            }
            await reloadProducts();
            refreshStats();
            applyFilterAndRender();
            populateDropdowns();
            if (CFS.Inventory) CFS.Inventory.populateProductDropdowns();
            showToast('Sukses', `${imported} produk diimpor dari CSV.`, 'success');
        };
        input.click();
    }

    async function importFromJSON() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const text = await file.text();
            try {
                const data = JSON.parse(text);
                if (data.products) {
                    for (const p of data.products) {
                        await Storage.addProduct(p);
                    }
                }
                if (data.categories) {
                    categories = data.categories;
                    await saveCategories();
                }
                if (data.variants) {
                    variants = data.variants;
                    await saveVariants();
                }
                await reloadProducts();
                refreshStats();
                applyFilterAndRender();
                populateDropdowns();
                if (CFS.Inventory) CFS.Inventory.populateProductDropdowns();
                showToast('Sukses', 'Data berhasil diimpor dari JSON.', 'success');
            } catch (err) {
                showToast('Error', 'File JSON tidak valid.', 'error');
            }
        };
        input.click();
    }

    // ==================== TAGS UI ====================
    function renderTagsInputPreviews() {
        if (!E.newProductTagsContainer) return;
        const tags = (E.newProductTags.value || '').split(',').map(t => t.trim()).filter(Boolean);
        E.newProductTagsContainer.innerHTML = tags.map(tag => 
            `<span class="tag-badge">${tag} <span class="remove-tag" data-tag="${tag}">&times;</span></span>`
        ).join('');
    }

    function handleTagsContainerClick(e) {
        if (e.target.classList.contains('remove-tag')) {
            const tag = e.target.dataset.tag;
            let tags = (E.newProductTags.value || '').split(',').map(t => t.trim()).filter(Boolean);
            tags = tags.filter(t => t !== tag);
            E.newProductTags.value = tags.join(', ');
            renderTagsInputPreviews();
        }
    }

    // ==================== EVENT BINDING ====================
    function bindEvents() {
        // Filter
        if (E.applyProdFilter) E.applyProdFilter.addEventListener('click', () => {
            currentFilter.search = E.prodSearch?.value || '';
            currentFilter.category = E.prodFilterCategory?.value || '';
            currentFilter.status = E.prodFilterStatus?.value || 'all';
            currentFilter.supplier = E.prodFilterSupplier?.value || '';
            currentFilter.tags = (E.prodFilterTags?.value || '').split(',').map(t => t.trim()).filter(Boolean);
            currentFilter.minStockLevel = parseInt(document.getElementById('prodFilterMinStock')?.value) || 0;
            currentFilter.sortBy = E.prodSortBy?.value || 'name';
            currentFilter.sortOrder = E.prodSortOrder?.value || 'asc';
            currentPage = 1;
            applyFilterAndRender();
        });

        if (E.clearProdFilter) E.clearProdFilter.addEventListener('click', () => {
            if (E.prodSearch) E.prodSearch.value = '';
            if (E.prodFilterCategory) E.prodFilterCategory.value = '';
            if (E.prodFilterStatus) E.prodFilterStatus.value = 'all';
            if (E.prodFilterSupplier) E.prodFilterSupplier.value = '';
            if (E.prodFilterTags) E.prodFilterTags.value = '';
            const minStockEl = document.getElementById('prodFilterMinStock');
            if (minStockEl) minStockEl.value = '';
            if (E.prodSortBy) E.prodSortBy.value = 'name';
            if (E.prodSortOrder) E.prodSortOrder.value = 'asc';
            currentFilter = { search: '', category: '', status: 'all', supplier: '', tags: [], minStockLevel: 0, sortBy: 'name', sortOrder: 'asc' };
            currentPage = 1;
            applyFilterAndRender();
        });

        // Real-time search debounce
        if (E.prodSearch) {
            E.prodSearch.addEventListener('input', debounce(() => {
                currentFilter.search = E.prodSearch.value;
                currentPage = 1;
                applyFilterAndRender();
            }, 400));
        }

        // Form submit
        if (E.productCustomForm) E.productCustomForm.addEventListener('submit', handleProductSubmit);
        if (E.prodCancelEditBtn) E.prodCancelEditBtn.addEventListener('click', cancelEdit);

        // Image uploads
        if (E.newProductImageInput) E.newProductImageInput.addEventListener('change', function () {
            handleImageUpload(this, E.newProductImagePreview);
        });
        if (E.variantImageInput) E.variantImageInput.addEventListener('change', function () {
            handleImageUpload(this, E.variantImagePreview);
        });

        // Tags input
        if (E.newProductTags) E.newProductTags.addEventListener('input', renderTagsInputPreviews);
        if (E.newProductTagsContainer) E.newProductTagsContainer.addEventListener('click', handleTagsContainerClick);

        // Bulk actions
        if (E.prodBulkDelete) E.prodBulkDelete.addEventListener('click', bulkDeleteProducts);
        if (E.prodBulkCategory) E.prodBulkCategory.addEventListener('click', bulkChangeCategory);
        if (E.prodBulkStatus) E.prodBulkStatus.addEventListener('click', () => {
            const status = document.getElementById('bulkStatusSelect')?.value;
            if (status) bulkChangeStatus(status);
        });
        if (E.prodBulkSupplier) E.prodBulkSupplier.addEventListener('click', bulkChangeSupplier);

        // Select all
        if (E.prodSelectAll) E.prodSelectAll.addEventListener('change', function () {
            document.querySelectorAll('.prod-checkbox').forEach(c => c.checked = this.checked);
            updateSelectedProducts();
        });
        if (E.productTableBody) {
            E.productTableBody.addEventListener('change', function (e) {
                if (e.target.classList.contains('prod-checkbox')) updateSelectedProducts();
            });
        }

        // Undo
        if (E.prodUndoBtn) E.prodUndoBtn.addEventListener('click', undoDelete);

        // Pagination
        if (E.prodLoadMore) E.prodLoadMore.addEventListener('click', () => {
            currentPage++;
            renderProductTable();
        });
        if (E.prodGoPage && E.prodPageInput) {
            E.prodGoPage.addEventListener('click', () => {
                const page = parseInt(E.prodPageInput.value);
                const totalPages = Math.ceil(filteredProducts.length / PER_PAGE);
                if (page >= 1 && page <= totalPages) {
                    currentPage = page;
                    renderProductTable();
                }
            });
        }

        // Kategori
        if (E.addCategoryBtn) E.addCategoryBtn.addEventListener('click', addCategory);

        // Varian
        if (E.addVariantBtn) E.addVariantBtn.addEventListener('click', addVariant);

        // Export / Import
        if (E.exportProductsCSV) E.exportProductsCSV.addEventListener('click', exportToCSV);
        if (E.exportProductsCSV2) E.exportProductsCSV2.addEventListener('click', exportToCSV);
        if (E.exportProductsJSON) E.exportProductsJSON.addEventListener('click', exportToJSON);
        if (E.importProductsCSV) E.importProductsCSV.addEventListener('click', importFromCSV);
        if (E.importProductsJSON) E.importProductsJSON.addEventListener('click', importFromJSON);
        if (E.downloadTemplateCSV) E.downloadTemplateCSV.addEventListener('click', downloadTemplate);

        // Quick Edit
        if (E.quickEditForm) E.quickEditForm.addEventListener('submit', handleQuickEditSubmit);
        if (E.quickEditCloseBtn) E.quickEditCloseBtn.addEventListener('click', () => {
            if (E.quickEditModal) E.quickEditModal.classList.add('hidden');
        });

        // Detail modal close
        if (E.detailCloseBtn) E.detailCloseBtn.addEventListener('click', () => {
            if (E.detailModal) E.detailModal.classList.add('hidden');
        });

        // Settings toggle (example)
        const toggleThumb = document.getElementById('toggleThumbnails');
        if (toggleThumb) {
            toggleThumb.addEventListener('change', function () {
                settings.showThumbnail = this.checked;
                saveSettings();
                renderProductTable();
            });
        }
    }

    function updateSelectedProducts() {
        const checks = document.querySelectorAll('.prod-checkbox');
        selectedIds.clear();
        checks.forEach(c => { if (c.checked) selectedIds.add(c.dataset.id); });
        if (E.prodSelectAll) E.prodSelectAll.checked = checks.length > 0 && selectedIds.size === checks.length;
    }

    function switchToSubTab(tabId) {
        if (!E.subTabBtns) return;
        E.subTabBtns.forEach(b => { b.classList.remove('btn-primary', 'active'); b.classList.add('btn-secondary'); });
        const btn = document.querySelector(`.products-subtab-btn[data-products-tab="${tabId}"]`);
        if (btn) { btn.classList.add('btn-primary', 'active'); btn.classList.remove('btn-secondary'); }
        E.subTabContents.forEach(c => c.classList.add('hidden'));
        const target = document.getElementById(tabId);
        if (target) target.classList.remove('hidden');
    }

    async function reloadProducts() {
        products = Storage.getProducts();
        filteredProducts = [...products];
        applyFilterAndRender();
    }

    function debounce(fn, delay) {
        let timer;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    // ==================== INIT ====================
    async function init() {
        addCustomStyles();
        await loadData();
        cacheElements();
        setupSubTabs();
        refreshStats();
        // Upgrade dropdowns that need search
        upgradeSelectToSearchable(E.prodFilterCategory, 'Semua Kategori');
        upgradeSelectToSearchable(E.newProductCategory, 'Tanpa Kategori');
        upgradeSelectToSearchable(E.prodBulkCategorySelect, '--Pilih Kategori--');
        upgradeSelectToSearchable(E.quickEditCategory, 'Tanpa Kategori');
        // Variant product dropdown will be initialized separately
        populateDropdowns();
        bindEvents();
        applyFilterAndRender();
        renderTagsInputPreviews();
    }

    // ==================== EXPORT API ====================
    CFS.Products = {
        init,
        editProduct,
        quickEdit,
        deleteProduct,
        duplicateProduct,
        showProductDetail,
        editCategory,
        deleteCategory,
        deleteVariant
    };
})();
