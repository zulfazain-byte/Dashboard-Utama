/* ============================================================
   Cibitung Frozen ERP Ultimate v5.4 — Products Module (SAFE)
   ============================================================ */
window.CFS = window.CFS || {};

(function () {
    'use strict';

    const Storage = CFS.Storage;

    let products = [];
    let categories = [];
    let variants = [];
    let filteredProducts = [];
    let currentFilter = { search: '', category: '', sortBy: 'name', sortOrder: 'asc' };
    let selectedIds = new Set();
    let editingId = null;
    let undoStack = [];
    let currentPage = 1;
    const PER_PAGE = 25;

    let E = {};
    function cacheElements() {
        E = {
            prodTotalProduct: document.getElementById('prodTotalProduct'),
            prodActiveProduct: document.getElementById('prodActiveProduct'),
            prodLowStock: document.getElementById('prodLowStock'),
            prodTotalCategory: document.getElementById('prodTotalCategory'),
            prodTotalVariants: document.getElementById('prodTotalVariants'),
            subTabBtns: document.querySelectorAll('.products-subtab-btn'),
            subTabContents: document.querySelectorAll('.products-subtab-content'),
            prodSearch: document.getElementById('prodSearch'),
            prodFilterCategory: document.getElementById('prodFilterCategory'),
            applyProdFilter: document.getElementById('applyProdFilter'),
            productTableBody: document.getElementById('productTableBody'),
            prodSelectAll: document.getElementById('prodSelectAll'),
            prodBulkDelete: document.getElementById('prodBulkDelete'),
            exportProductsCSV2: document.getElementById('exportProductsCSV2'),
            productCustomForm: document.getElementById('productCustomForm'),
            prodEditId: document.getElementById('prodEditId'),
            newProductName: document.getElementById('newProductName'),
            newProductCategory: document.getElementById('newProductCategory'),
            newProductSKU: document.getElementById('newProductSKU'),
            newProductMinStock: document.getElementById('newProductMinStock'),
            newProductUnit: document.getElementById('newProductUnit'),
            newProductBrand: document.getElementById('newProductBrand'),
            prodSubmitBtn: document.getElementById('prodSubmitBtn'),
            prodCancelEditBtn: document.getElementById('prodCancelEditBtn'),
            prodFormTitle: document.getElementById('prodFormTitle'),
            newCategoryName: document.getElementById('newCategoryName'),
            addCategoryBtn: document.getElementById('addCategoryBtn'),
            categoryTableBody: document.getElementById('categoryTableBody'),
            variantProduk: document.getElementById('variantProduk'),
            variantName: document.getElementById('variantName'),
            variantWeight: document.getElementById('variantWeight'),
            addVariantBtn: document.getElementById('addVariantBtn'),
            variantTableBody: document.getElementById('variantTableBody'),
            exportProductsCSV: document.getElementById('exportProductsCSV'),
            importProductsCSV: document.getElementById('importProductsCSV'),
        };
    }

    function showToast(title, msg, type) {
        if (window.showToast) window.showToast(title, msg, type);
    }

    async function loadData() {
        products = Storage.getProducts();
        categories = (await localforage.getItem('cfs_product_categories')) || [];
        variants = (await localforage.getItem('cfs_product_variants')) || [];
        if (!categories.length) {
            categories = [
                { id: 'cat_ikan_laut', name: 'Ikan Laut' },
                { id: 'cat_ikan_tawar', name: 'Ikan Tawar' },
                { id: 'cat_seafood', name: 'Seafood Lainnya' }
            ];
            await localforage.setItem('cfs_product_categories', categories);
        }
    }

    async function saveCategories() { await localforage.setItem('cfs_product_categories', categories); }
    async function saveVariants() { await localforage.setItem('cfs_product_variants', variants); }

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
                if (tab === 'products-variants') renderVariantTable();
                if (tab === 'products-list') { applyFilterAndRender(); populateDropdowns(); }
            });
        });
    }

    function refreshStats() {
        const stockMap = CFS.Inventory ? CFS.Inventory.getStockPerProduct() : {};
        const total = products.length;
        const activeCount = products.filter(p => (stockMap[p.name] || 0) > 0).length;
        const lowStockCount = products.filter(p => { const s = stockMap[p.name] || 0; return s > 0 && s < (p.minStock || 10); }).length;
        if (E.prodTotalProduct) E.prodTotalProduct.textContent = total;
        if (E.prodActiveProduct) E.prodActiveProduct.textContent = activeCount;
        if (E.prodLowStock) E.prodLowStock.textContent = lowStockCount;
        if (E.prodTotalCategory) E.prodTotalCategory.textContent = categories.length;
        if (E.prodTotalVariants) E.prodTotalVariants.textContent = variants.length;
    }

    function populateDropdowns() {
        const catOptions = '<option value="">Semua Kategori</option>' + categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
        if (E.prodFilterCategory) E.prodFilterCategory.innerHTML = catOptions;
        if (E.newProductCategory) E.newProductCategory.innerHTML = '<option value="">Tanpa Kategori</option>' + categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
        if (E.variantProduk) E.variantProduk.innerHTML = '<option value="">Pilih Produk</option>' + products.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    }

    function applyFilterAndRender() {
        let data = [...products];
        if (currentFilter.search) { const kw = currentFilter.search.toLowerCase(); data = data.filter(p => p.name.toLowerCase().includes(kw) || (p.sku || '').toLowerCase().includes(kw)); }
        if (currentFilter.category) { data = data.filter(p => (p.category || '') === currentFilter.category); }
        const order = currentFilter.sortOrder === 'desc' ? -1 : 1;
        if (currentFilter.sortBy === 'name') data.sort((a, b) => order * a.name.localeCompare(b.name, 'id'));
        else if (currentFilter.sortBy === 'sku') data.sort((a, b) => order * (a.sku || '').localeCompare(b.sku || '', 'id'));
        filteredProducts = data;
        renderProductTable();
    }

    function renderProductTable() {
        if (!E.productTableBody) return;
        const stockMap = CFS.Inventory ? CFS.Inventory.getStockPerProduct() : {};
        const totalPages = Math.ceil(filteredProducts.length / PER_PAGE);
        const startIdx = (currentPage - 1) * PER_PAGE;
        const pageData = filteredProducts.slice(startIdx, startIdx + PER_PAGE);
        if (pageData.length === 0) {
            E.productTableBody.innerHTML = '<tr><td colspan="7" class="text-center py-8 opacity-50">Tidak ada produk.</td></tr>';
            return;
        }
        E.productTableBody.innerHTML = pageData.map(p => {
            const stok = stockMap[p.name] || 0;
            const stockColor = stok === 0 ? 'text-red-500' : stok < (p.minStock || 10) ? 'text-amber-500' : 'text-green-500';
            return `<tr class="border-t hover:bg-slate-50 dark:hover:bg-slate-700 transition text-sm">
                <td class="p-2"><input type="checkbox" class="prod-checkbox" data-id="${p.id}" ${selectedIds.has(p.id) ? 'checked' : ''}></td>
                <td class="p-2 font-medium">${p.name}</td>
                <td class="p-2">${p.category || '-'}</td>
                <td class="p-2">${p.sku || '-'}</td>
                <td class="p-2 text-right">${p.minStock || 10} ${p.unit || 'kg'}</td>
                <td class="p-2 text-center font-semibold ${stockColor}">${stok} ${p.unit || 'kg'}</td>
                <td class="p-2 text-center">
                    <button class="btn btn-xs btn-secondary" onclick="CFS.Products.editProduct('${p.id}')" title="Edit"><i class="ph ph-pencil"></i></button>
                    <button class="btn btn-xs btn-warning" onclick="CFS.Products.duplicateProduct('${p.id}')" title="Duplikat"><i class="ph ph-copy"></i></button>
                    <button class="btn btn-xs btn-danger" onclick="CFS.Products.deleteProduct('${p.id}')" title="Hapus"><i class="ph ph-trash"></i></button>
                </td>
            </tr>`;
        }).join('');
    }

    function editProduct(id) {
        const p = products.find(x => x.id === id);
        if (!p) return;
        switchToSubTab('products-form');
        E.prodEditId.value = p.id;
        E.newProductName.value = p.name;
        E.newProductCategory.value = p.category || '';
        E.newProductSKU.value = p.sku || '';
        E.newProductMinStock.value = p.minStock || 10;
        E.newProductUnit.value = p.unit || 'kg';
        E.newProductBrand.value = p.brand || '';
        E.prodFormTitle.textContent = 'Edit Produk';
        E.prodSubmitBtn.textContent = '💾 Simpan Perubahan';
        E.prodCancelEditBtn.style.display = 'inline-flex';
        editingId = p.id;
    }

    function cancelEdit() {
        E.productCustomForm.reset();
        E.prodEditId.value = '';
        E.newProductMinStock.value = 10;
        E.newProductUnit.value = 'kg';
        E.prodFormTitle.textContent = 'Tambah Produk Baru';
        E.prodSubmitBtn.textContent = '➕ Tambah Produk';
        E.prodCancelEditBtn.style.display = 'none';
        editingId = null;
    }

    async function handleProductSubmit(e) {
        e.preventDefault();
        const id = E.prodEditId.value;
        const name = E.newProductName.value.trim();
        if (!name) { showToast('Error', 'Nama produk wajib diisi.', 'error'); return; }
        const data = {
            name,
            category: E.newProductCategory.value,
            sku: E.newProductSKU.value.trim(),
            minStock: parseInt(E.newProductMinStock.value) || 10,
            unit: E.newProductUnit.value.trim() || 'kg',
            brand: E.newProductBrand.value.trim()
        };
        if (id) {
            const product = products.find(p => p.id === id);
            if (product) { Object.assign(product, data); await Storage.saveAllData(); showToast('Sukses', 'Produk diperbarui.', 'success'); }
        } else {
            data.id = 'prd_' + Date.now();
            await Storage.addProduct(data);
            showToast('Sukses', 'Produk baru ditambahkan.', 'success');
        }
        cancelEdit();
        products = Storage.getProducts();
        filteredProducts = [...products];
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
        undoStack.push({ ...product });
        if (undoStack.length > 10) undoStack.shift();
        await Storage.deleteProduct(id);
        selectedIds.delete(id);
        products = Storage.getProducts();
        filteredProducts = [...products];
        refreshStats();
        applyFilterAndRender();
        populateDropdowns();
        if (CFS.Inventory) CFS.Inventory.populateProductDropdowns();
        showToast('Sukses', `Produk "${product.name}" dihapus.`, 'success');
    }

    function duplicateProduct(id) {
        const p = products.find(x => x.id === id);
        if (!p) return;
        const newProduct = { id: 'prd_' + Date.now(), name: p.name + ' (Copy)', category: p.category, sku: (p.sku || '') + '-COPY', minStock: p.minStock, unit: p.unit, brand: p.brand };
        Storage.addProduct(newProduct).then(() => {
            products = Storage.getProducts();
            filteredProducts = [...products];
            refreshStats();
            applyFilterAndRender();
            populateDropdowns();
            showToast('Sukses', `Produk "${newProduct.name}" dibuat.`, 'success');
        });
    }

    async function bulkDeleteProducts() {
        if (selectedIds.size === 0) return;
        if (!confirm(`Hapus ${selectedIds.size} produk terpilih?`)) return;
        for (const id of selectedIds) await Storage.deleteProduct(id);
        selectedIds.clear();
        products = Storage.getProducts();
        filteredProducts = [...products];
        refreshStats();
        applyFilterAndRender();
        populateDropdowns();
        if (CFS.Inventory) CFS.Inventory.populateProductDropdowns();
        showToast('Sukses', 'Produk terpilih dihapus.', 'success');
    }

    function renderCategoryTable() {
        if (!E.categoryTableBody) return;
        E.categoryTableBody.innerHTML = categories.map(c => {
            const count = products.filter(p => (p.category || '') === c.name).length;
            return `<tr class="border-t text-sm"><td class="p-2">${c.name}</td><td class="p-2 text-right">${count}</td><td class="p-2 text-center"><button class="btn btn-xs btn-danger" onclick="CFS.Products.deleteCategory('${c.id}')" title="Hapus"><i class="ph ph-trash"></i></button></td></tr>`;
        }).join('') || '<tr><td colspan="3" class="text-center p-4 opacity-50">Belum ada kategori.</td></tr>';
    }

    async function addCategory() {
        const name = E.newCategoryName?.value.trim();
        if (!name) return;
        categories.push({ id: 'cat_' + Date.now(), name });
        await saveCategories();
        E.newCategoryName.value = '';
        renderCategoryTable();
        populateDropdowns();
        showToast('Sukses', 'Kategori ditambahkan.', 'success');
    }

    async function deleteCategory(id) {
        if (!confirm('Hapus kategori?')) return;
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

    function renderVariantTable() {
        if (!E.variantTableBody) return;
        E.variantTableBody.innerHTML = variants.map(v => {
            const prod = products.find(p => p.id === v.productId);
            return `<tr class="border-t text-sm"><td class="p-2">${prod ? prod.name : '?'}</td><td class="p-2">${v.name}</td><td class="p-2 text-right">${v.weight} kg</td><td class="p-2 text-center"><button class="btn btn-xs btn-danger" onclick="CFS.Products.deleteVariant('${v.id}')" title="Hapus"><i class="ph ph-trash"></i></button></td></tr>`;
        }).join('') || '<tr><td colspan="4" class="text-center p-4 opacity-50">Belum ada varian.</td></tr>';
    }

    async function addVariant() {
        const productId = E.variantProduk?.value;
        const name = E.variantName?.value.trim();
        const weight = parseFloat(E.variantWeight?.value);
        if (!productId || !name || isNaN(weight) || weight <= 0) { showToast('Error', 'Lengkapi data varian.', 'error'); return; }
        variants.push({ id: 'var_' + Date.now(), productId, name, weight });
        await saveVariants();
        E.variantName.value = '';
        E.variantWeight.value = '';
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

    function exportToCSV() {
        const rows = [['Nama','Kategori','SKU','Merek','Stok Minimum','Satuan']];
        products.forEach(p => rows.push([p.name, p.category || '', p.sku || '', p.brand || '', p.minStock || 10, p.unit || 'kg']));
        const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `produk_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        showToast('Sukses', 'Data produk diekspor.', 'success');
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
            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(',').map(c => c.replace(/"/g, '').trim());
                if (cols.length < 6) continue;
                const [name, category, sku, brand, minStock, unit] = cols;
                if (!name) continue;
                await Storage.addProduct({ id: 'prd_' + Date.now() + i, name, category: category || '', sku: sku || '', brand: brand || '', minStock: parseInt(minStock) || 10, unit: unit || 'kg' });
            }
            products = Storage.getProducts();
            filteredProducts = [...products];
            refreshStats();
            applyFilterAndRender();
            populateDropdowns();
            if (CFS.Inventory) CFS.Inventory.populateProductDropdowns();
            showToast('Sukses', 'Produk diimpor dari CSV.', 'success');
        };
        input.click();
    }

    function bindEvents() {
        if (E.applyProdFilter) E.applyProdFilter.addEventListener('click', () => { currentFilter.search = E.prodSearch?.value || ''; currentFilter.category = E.prodFilterCategory?.value || ''; currentPage = 1; applyFilterAndRender(); });
        if (E.productCustomForm) { E.productCustomForm.addEventListener('submit', handleProductSubmit); E.productCustomForm.dataset.listener = 'true'; }
        if (E.prodCancelEditBtn) E.prodCancelEditBtn.addEventListener('click', cancelEdit);
        if (E.prodBulkDelete) E.prodBulkDelete.addEventListener('click', bulkDeleteProducts);
        if (E.prodSelectAll) E.prodSelectAll.addEventListener('change', function () { document.querySelectorAll('.prod-checkbox').forEach(c => c.checked = this.checked); updateSelectedProducts(); });
        if (E.productTableBody) E.productTableBody.addEventListener('change', function (e) { if (e.target.classList.contains('prod-checkbox')) updateSelectedProducts(); });
        if (E.addCategoryBtn) E.addCategoryBtn.addEventListener('click', addCategory);
        if (E.addVariantBtn) E.addVariantBtn.addEventListener('click', addVariant);
        if (E.exportProductsCSV) E.exportProductsCSV.addEventListener('click', exportToCSV);
        if (E.exportProductsCSV2) E.exportProductsCSV2.addEventListener('click', exportToCSV);
        if (E.importProductsCSV) E.importProductsCSV.addEventListener('click', importFromCSV);
    }

    function updateSelectedProducts() {
        const checks = document.querySelectorAll('.prod-checkbox');
        selectedIds.clear();
        checks.forEach(c => { if (c.checked) selectedIds.add(c.dataset.id); });
        if (E.prodSelectAll) E.prodSelectAll.checked = checks.length > 0 && selectedIds.size === checks.length;
    }

    function switchToSubTab(tabId) {
        E.subTabBtns.forEach(b => { b.classList.remove('btn-primary', 'active'); b.classList.add('btn-secondary'); });
        const btn = document.querySelector(`.products-subtab-btn[data-products-tab="${tabId}"]`);
        if (btn) { btn.classList.add('btn-primary', 'active'); btn.classList.remove('btn-secondary'); }
        E.subTabContents.forEach(c => c.classList.add('hidden'));
        const target = document.getElementById(tabId);
        if (target) target.classList.remove('hidden');
    }

    async function init() {
        await loadData();
        cacheElements();
        setupSubTabs();
        refreshStats();
        populateDropdowns();
        bindEvents();
        applyFilterAndRender();
    }

    CFS.Products = {
        init,
        editProduct,
        deleteProduct,
        duplicateProduct,
        deleteCategory,
        deleteVariant
    };
})();
