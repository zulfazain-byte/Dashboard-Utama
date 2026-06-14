/* ============================================================
   Cibitung Frozen ERP Ultimate v5.4 — Products Module (FINAL)
   Self‑contained, ±1200 baris, fitur lengkap & terintegrasi.
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
        sortBy: 'name',
        sortOrder: 'asc'
    };
    let selectedIds = new Set();
    let editingId = null;
    let undoStack = [];               // max 10
    let currentPage = 1;
    const PER_PAGE = 25;

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

            // Sub tab
            subTabBtns: document.querySelectorAll('.products-subtab-btn'),
            subTabContents: document.querySelectorAll('.products-subtab-content'),

            // Daftar Produk
            prodSearch: document.getElementById('prodSearch'),
            prodFilterCategory: document.getElementById('prodFilterCategory'),
            applyProdFilter: document.getElementById('applyProdFilter'),
            productTableBody: document.getElementById('productTableBody'),
            prodSelectAll: document.getElementById('prodSelectAll'),
            prodBulkDelete: document.getElementById('prodBulkDelete'),
            prodBulkCategory: document.getElementById('prodBulkCategory'),
            prodBulkCategorySelect: document.getElementById('prodBulkCategorySelect'),
            exportProductsCSV2: document.getElementById('exportProductsCSV2'),
            prodUndoBtn: document.getElementById('prodUndoBtn'),
            prodShowingInfo: document.getElementById('prodShowingInfo'),
            prodLoadMore: document.getElementById('prodLoadMore'),

            // Form
            productCustomForm: document.getElementById('productCustomForm'),
            prodEditId: document.getElementById('prodEditId'),
            newProductName: document.getElementById('newProductName'),
            newProductCategory: document.getElementById('newProductCategory'),
            newProductSKU: document.getElementById('newProductSKU'),
            newProductMinStock: document.getElementById('newProductMinStock'),
            newProductUnit: document.getElementById('newProductUnit'),
            newProductBrand: document.getElementById('newProductBrand'),
            newProductTags: document.getElementById('newProductTags'),
            prodSubmitBtn: document.getElementById('prodSubmitBtn'),
            prodCancelEditBtn: document.getElementById('prodCancelEditBtn'),
            prodFormTitle: document.getElementById('prodFormTitle'),

            // Kategori
            newCategoryName: document.getElementById('newCategoryName'),
            addCategoryBtn: document.getElementById('addCategoryBtn'),
            categoryTableBody: document.getElementById('categoryTableBody'),

            // Varian
            variantProduk: document.getElementById('variantProduk'),
            variantName: document.getElementById('variantName'),
            variantWeight: document.getElementById('variantWeight'),
            variantPrice: document.getElementById('variantPrice'),
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
            quickEditId: document.getElementById('quickEditId'),
            quickEditCloseBtn: document.getElementById('quickEditCloseBtn'),
        };
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

    // ==================== LOAD DATA ====================
    async function loadData() {
        // AMBIL PRODUK DARI STORAGE (TERMASUK YANG SUDAH ADA)
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
        // Jika produk dari Storage kosong, pakai defaultProducts dari Storage
        if (!products.length) {
            const def = Storage.defaultProducts || [];
            for (let i = 0; i < def.length; i++) {
                await Storage.addProduct({
                    id: 'prd_' + Date.now() + i,
                    name: def[i],
                    category: '',
                    minStock: 10,
                    unit: 'kg',
                    brand: '',
                    sku: ''
                });
            }
            products = Storage.getProducts();
        }
    }

    async function saveCategories() { await localforage.setItem('cfs_product_categories', categories); }
    async function saveVariants() { await localforage.setItem('cfs_product_variants', variants); }

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
                if (tab === 'products-variants') renderVariantTable();
                if (tab === 'products-list') { applyFilterAndRender(); populateDropdowns(); }
            });
        });
    }

    // ==================== STATISTIK ====================
    function refreshStats() {
        const stockMap = CFS.Inventory ? CFS.Inventory.getStockPerProduct() : {};
        const total = products.length;
        const activeCount = products.filter(p => (stockMap[p.name] || 0) > 0).length;
        const lowStockCount = products.filter(p => {
            const stock = stockMap[p.name] || 0;
            return stock > 0 && stock < (p.minStock || 10);
        }).length;

        if (E.prodTotalProduct) E.prodTotalProduct.textContent = total;
        if (E.prodActiveProduct) E.prodActiveProduct.textContent = activeCount;
        if (E.prodLowStock) E.prodLowStock.textContent = lowStockCount;
        if (E.prodTotalCategory) E.prodTotalCategory.textContent = categories.length;
        if (E.prodTotalVariants) E.prodTotalVariants.textContent = variants.length;
    }

    // ==================== POPULATE DROPDOWNS ====================
    function populateDropdowns() {
        const catOptions = '<option value="">Semua Kategori</option>' + categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
        if (E.prodFilterCategory) E.prodFilterCategory.innerHTML = catOptions;
        if (E.newProductCategory) E.newProductCategory.innerHTML = '<option value="">Tanpa Kategori</option>' + categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
        if (E.variantProduk) {
            E.variantProduk.innerHTML = '<option value="">Pilih Produk</option>' + products.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
        }
        if (E.prodBulkCategorySelect) {
            E.prodBulkCategorySelect.innerHTML = '<option value="">--Pilih Kategori--</option>' + categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
        }
    }

    // ==================== FILTER & SORT ====================
    function applyFilterAndRender() {
        let data = [...products];
        if (currentFilter.search) {
            const kw = currentFilter.search.toLowerCase();
            data = data.filter(p => p.name.toLowerCase().includes(kw) || (p.sku || '').toLowerCase().includes(kw));
        }
        if (currentFilter.category) {
            data = data.filter(p => (p.category || '') === currentFilter.category);
        }
        const order = currentFilter.sortOrder === 'desc' ? -1 : 1;
        if (currentFilter.sortBy === 'name') data.sort((a, b) => order * a.name.localeCompare(b.name, 'id'));
        else if (currentFilter.sortBy === 'sku') data.sort((a, b) => order * (a.sku || '').localeCompare(b.sku || '', 'id'));
        filteredProducts = data;
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
            E.productTableBody.innerHTML = `<tr><td colspan="8" class="text-center py-10 opacity-50">
                <i class="ph ph-package text-4xl block mb-3"></i>
                <p class="text-sm">Tidak ada produk.</p>
            </td></tr>`;
            return;
        }

        E.productTableBody.innerHTML = pageData.map(p => {
            const currentStock = stockMap[p.name] || 0;
            const stockColor = currentStock === 0 ? 'text-red-500' : currentStock < (p.minStock || 10) ? 'text-amber-500' : 'text-green-500';
            return `<tr class="border-t hover:bg-slate-50 dark:hover:bg-slate-700 transition text-sm">
                <td class="p-2"><input type="checkbox" class="prod-checkbox" data-id="${p.id}" ${selectedIds.has(p.id) ? 'checked' : ''}></td>
                <td class="p-2 font-medium">${escapeHtml(p.name)}</td>
                <td class="p-2">${escapeHtml(p.category || '-')}</td>
                <td class="p-2">${p.sku || '-'}</td>
                <td class="p-2 text-right">${p.minStock || 10} ${p.unit || 'kg'}</td>
                <td class="p-2 text-center font-semibold ${stockColor}">${currentStock} ${p.unit || 'kg'}</td>
                <td class="p-2 text-xs opacity-70">${p.brand || '-'}</td>
                <td class="p-2 text-center">
                    <button class="btn btn-xs btn-secondary" onclick="CFS.Products.editProduct('${p.id}')" title="Edit"><i class="ph ph-pencil"></i></button>
                    <button class="btn btn-xs btn-primary" onclick="CFS.Products.quickEdit('${p.id}')" title="Quick Edit"><i class="ph ph-lightning"></i></button>
                    <button class="btn btn-xs btn-warning" onclick="CFS.Products.duplicateProduct('${p.id}')" title="Duplikat"><i class="ph ph-copy"></i></button>
                    <button class="btn btn-xs btn-danger" onclick="CFS.Products.deleteProduct('${p.id}')" title="Hapus"><i class="ph ph-trash"></i></button>
                </td>
            </tr>`;
        }).join('');

        if (E.prodShowingInfo) E.prodShowingInfo.textContent = `Halaman ${currentPage} dari ${totalPages} (${filteredProducts.length} produk)`;
        if (E.prodLoadMore) E.prodLoadMore.style.display = currentPage < totalPages ? '' : 'none';
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
        E.newProductMinStock.value = p.minStock || 10;
        E.newProductUnit.value = p.unit || 'kg';
        E.newProductBrand.value = p.brand || '';
        E.newProductTags.value = (p.tags || []).join(', ');
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
        const category = E.newProductCategory.value;
        const sku = E.newProductSKU.value.trim();
        const minStock = parseInt(E.newProductMinStock.value) || 10;
        const unit = E.newProductUnit.value.trim() || 'kg';
        const brand = E.newProductBrand.value.trim();
        const tags = (E.newProductTags.value || '').split(',').map(t => t.trim()).filter(Boolean);

        if (!name) { showToast('Error', 'Nama produk wajib diisi.', 'error'); return; }

        const data = { name, category, sku, minStock, unit, brand, tags };

        if (id) {
            const product = products.find(p => p.id === id);
            if (product) {
                Object.assign(product, data);
                await Storage.saveAllData();
                showToast('Sukses', 'Produk diperbarui.', 'success');
            }
        } else {
            data.id = 'prd_' + Date.now();
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
        undoStack.push({ ...product });
        if (undoStack.length > 10) undoStack.shift();
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
        const newProduct = {
            id: 'prd_' + Date.now(),
            name: p.name + ' (Copy)',
            category: p.category,
            sku: (p.sku || '') + '-COPY',
            minStock: p.minStock,
            unit: p.unit,
            brand: p.brand,
            tags: [...(p.tags || [])]
        };
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
        if (E.quickEditModal) E.quickEditModal.classList.remove('hidden');
    }

    async function handleQuickEditSubmit(e) {
        e.preventDefault();
        const id = E.quickEditId.value;
        const name = E.quickEditName.value.trim();
        const category = E.quickEditCategory.value;
        const minStock = parseInt(E.quickEditMinStock.value) || 10;
        const unit = E.quickEditUnit.value.trim() || 'kg';

        if (!name) { showToast('Error', 'Nama produk wajib diisi.', 'error'); return; }

        const product = products.find(p => p.id === id);
        if (product) {
            product.name = name;
            product.category = category;
            product.minStock = minStock;
            product.unit = unit;
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
            if (p) p.category = newCat;
        }
        await Storage.saveAllData();
        selectedIds.clear();
        await reloadProducts();
        applyFilterAndRender();
        populateDropdowns();
        showToast('Sukses', `Kategori diubah menjadi "${newCat}".`, 'success');
    }

    // ==================== KATEGORI ====================
    function renderCategoryTable() {
        if (!E.categoryTableBody) return;
        E.categoryTableBody.innerHTML = categories.map(c => {
            const count = products.filter(p => (p.category || '') === c.name).length;
            return `<tr class="border-t text-sm">
                <td class="p-2">${c.name}</td>
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
        if (!name) return;
        const id = 'cat_' + Date.now();
        categories.push({ id, name });
        await saveCategories();
        E.newCategoryName.value = '';
        renderCategoryTable();
        populateDropdowns();
        showToast('Sukses', 'Kategori ditambahkan.', 'success');
    }

    function editCategory(id) {
        const cat = categories.find(c => c.id === id);
        if (!cat) return;
        const newName = prompt('Nama kategori baru:', cat.name);
        if (!newName) return;
        cat.name = newName.trim();
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
    function renderVariantTable() {
        if (!E.variantTableBody) return;
        E.variantTableBody.innerHTML = variants.map(v => {
            const prod = products.find(p => p.id === v.productId);
            return `<tr class="border-t text-sm">
                <td class="p-2">${prod ? prod.name : '?'}</td>
                <td class="p-2">${v.name}</td>
                <td class="p-2 text-right">${v.weight} kg</td>
                <td class="p-2 text-right">${v.price ? 'Rp ' + v.price.toLocaleString('id-ID') : '-'}</td>
                <td class="p-2 text-center"><button class="btn btn-xs btn-danger" onclick="CFS.Products.deleteVariant('${v.id}')" title="Hapus"><i class="ph ph-trash"></i></button></td>
            </tr>`;
        }).join('') || '<tr><td colspan="5" class="text-center p-4 opacity-50">Belum ada varian.</td></tr>';
    }

    async function addVariant() {
        const productId = E.variantProduk?.value;
        const name = E.variantName?.value.trim();
        const weight = parseFloat(E.variantWeight?.value);
        const price = parseFloat(E.variantPrice?.value) || undefined;
        if (!productId || !name || isNaN(weight) || weight <= 0) {
            showToast('Error', 'Lengkapi data varian dengan benar.', 'error');
            return;
        }
        variants.push({ id: 'var_' + Date.now(), productId, name, weight, price });
        await saveVariants();
        E.variantName.value = '';
        E.variantWeight.value = '';
        E.variantPrice.value = '';
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
        const rows = [['Nama', 'Kategori', 'SKU', 'Merek', 'Stok Minimum', 'Satuan', 'Tags']];
        products.forEach(p => rows.push([p.name, p.category || '', p.sku || '', p.brand || '', p.minStock || 10, p.unit || 'kg', (p.tags || []).join(';')]));
        const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `produk_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        showToast('Sukses', 'Data produk diekspor.', 'success');
    }

    function downloadTemplate() {
        const csv = 'Nama,Kategori,SKU,Merek,Stok Minimum,Satuan,Tags\nContoh Produk,Ikan Laut,SKU001,MerekA,10,kg,tag1;tag2';
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
                const cols = lines[i].split(',').map(c => c.replace(/"/g, '').trim());
                if (cols.length < 6) continue;
                const [name, category, sku, brand, minStock, unit, tagsStr] = cols;
                if (!name) continue;
                await Storage.addProduct({
                    id: 'prd_' + Date.now() + i,
                    name,
                    category: category || '',
                    sku: sku || '',
                    brand: brand || '',
                    minStock: parseInt(minStock) || 10,
                    unit: unit || 'kg',
                    tags: tagsStr ? tagsStr.split(';').map(t => t.trim()) : []
                });
                imported++;
            }
            await reloadProducts();
            refreshStats();
            applyFilterAndRender();
            populateDropdowns();
            if (CFS.Inventory) CFS.Inventory.populateProductDropdowns();
            showToast('Sukses', `${imported} produk diimpor.`, 'success');
        };
        input.click();
    }

    // ==================== EVENT BINDING ====================
    function bindEvents() {
        // Filter produk
        if (E.applyProdFilter) E.applyProdFilter.addEventListener('click', () => {
            currentFilter.search = E.prodSearch?.value || '';
            currentFilter.category = E.prodFilterCategory?.value || '';
            currentPage = 1;
            applyFilterAndRender();
        });

        // Form submit
        if (E.productCustomForm) {
            E.productCustomForm.addEventListener('submit', handleProductSubmit);
            E.productCustomForm.dataset.listener = 'true';
        }
        if (E.prodCancelEditBtn) E.prodCancelEditBtn.addEventListener('click', cancelEdit);

        // Bulk
        if (E.prodBulkDelete) E.prodBulkDelete.addEventListener('click', bulkDeleteProducts);
        if (E.prodBulkCategory) E.prodBulkCategory.addEventListener('click', bulkChangeCategory);
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

        // Load more
        if (E.prodLoadMore) E.prodLoadMore.addEventListener('click', () => {
            currentPage++;
            renderProductTable();
        });

        // Kategori
        if (E.addCategoryBtn) E.addCategoryBtn.addEventListener('click', addCategory);

        // Varian
        if (E.addVariantBtn) E.addVariantBtn.addEventListener('click', addVariant);

        // Export / Import
        if (E.exportProductsCSV) E.exportProductsCSV.addEventListener('click', exportToCSV);
        if (E.exportProductsCSV2) E.exportProductsCSV2.addEventListener('click', exportToCSV);
        if (E.importProductsCSV) E.importProductsCSV.addEventListener('click', importFromCSV);
        if (E.downloadTemplateCSV) E.downloadTemplateCSV.addEventListener('click', downloadTemplate);

        // Quick Edit
        if (E.quickEditForm) E.quickEditForm.addEventListener('submit', handleQuickEditSubmit);
        if (E.quickEditCloseBtn) E.quickEditCloseBtn.addEventListener('click', () => {
            if (E.quickEditModal) E.quickEditModal.classList.add('hidden');
        });
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

    // ==================== INIT ====================
    async function init() {
        await loadData();
        cacheElements();
        setupSubTabs();
        refreshStats();
        populateDropdowns();
        bindEvents();
        applyFilterAndRender();
    }

    // ==================== EXPORT API ====================
    CFS.Products = {
        init,
        editProduct,
        quickEdit,
        deleteProduct,
        duplicateProduct,
        editCategory,
        deleteCategory,
        deleteVariant
    };
})();
