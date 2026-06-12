/* ============================================================
   Cibitung Frozen ERP Ultimate v5.4 — Products Module (PRO)
   Self‑contained, ±1200 baris, tampilan profesional & modern.
   ============================================================ */
window.CFS = window.CFS || {};

(function () {
    'use strict';

    const Storage = CFS.Storage;

    // ==================== STATE LOKAL ====================
    let categories = [];                 // array of { id, name }
    let variants = [];                  // array of { id, productId, name, weight }
    let selectedProducts = new Set();   // untuk bulk delete
    let currentSubTab = 'products-list';
    let productFilter = { search: '', category: '' };
    let editingId = null;              // null = tambah baru, string = edit

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
            exportProductsCSV2: document.getElementById('exportProductsCSV2'),

            // Form
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

            // Kategori
            newCategoryName: document.getElementById('newCategoryName'),
            addCategoryBtn: document.getElementById('addCategoryBtn'),
            categoryTableBody: document.getElementById('categoryTableBody'),

            // Varian
            variantProduk: document.getElementById('variantProduk'),
            variantName: document.getElementById('variantName'),
            variantWeight: document.getElementById('variantWeight'),
            addVariantBtn: document.getElementById('addVariantBtn'),
            variantTableBody: document.getElementById('variantTableBody'),

            // Import / Export
            exportProductsCSV: document.getElementById('exportProductsCSV'),
            importProductsCSV: document.getElementById('importProductsCSV'),
        };
    }

    // ==================== HELPER ====================
    function formatNumber(n) { return n.toLocaleString('id-ID'); }
    function showToast(title, msg, type) {
        if (window.showToast) window.showToast(title, msg, type);
        else console.log(title, msg);
    }

    // ==================== INISIALISASI ====================
    async function initProductsTab() {
        // Muat kategori & varian dari storage
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

        cacheElements();
        setupSubTabs();
        refreshStats();
        renderProductTable();
        populateDropdowns();
        bindEvents();
    }

    async function saveCategories() {
        await localforage.setItem('cfs_product_categories', categories);
    }
    async function saveVariants() {
        await localforage.setItem('cfs_product_variants', variants);
    }

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
                currentSubTab = tab;
                if (tab === 'products-category') renderCategoryTable();
                if (tab === 'products-variants') renderVariantTable();
                if (tab === 'products-list') renderProductTable();
            });
        });
    }

    // ==================== STATISTIK ====================
    function refreshStats() {
        const products = Storage.getProducts();
        const total = products.length;
        const stockMap = CFS.Inventory ? CFS.Inventory.getStockPerProduct() : {};
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
        const categoryOptions = '<option value="">Semua Kategori</option>' + categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
        if (E.prodFilterCategory) E.prodFilterCategory.innerHTML = categoryOptions;
        if (E.newProductCategory) E.newProductCategory.innerHTML = '<option value="">Tanpa Kategori</option>' + categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
        if (E.variantProduk) {
            const products = Storage.getProducts();
            E.variantProduk.innerHTML = '<option value="">Pilih Produk</option>' + products.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
        }
    }

    // ==================== RENDER TABEL PRODUK ====================
    function renderProductTable(filter = productFilter) {
        if (!E.productTableBody) return;
        let products = Storage.getProducts();
        const stockMap = CFS.Inventory ? CFS.Inventory.getStockPerProduct() : {};

        if (filter.search) {
            const kw = filter.search.toLowerCase();
            products = products.filter(p => p.name.toLowerCase().includes(kw) || (p.sku || '').toLowerCase().includes(kw));
        }
        if (filter.category) {
            products = products.filter(p => (p.category || '') === filter.category);
        }

        if (products.length === 0) {
            E.productTableBody.innerHTML = `<tr><td colspan="7" class="text-center py-8 opacity-50">
                <i class="ph ph-package text-3xl block mb-2"></i>Tidak ada produk. Klik "Tambah / Edit" untuk menambah.
            </td></tr>`;
            return;
        }

        E.productTableBody.innerHTML = products.map(p => {
            const currentStock = stockMap[p.name] || 0;
            const stockColor = currentStock === 0 ? 'text-red-500' : currentStock < (p.minStock || 10) ? 'text-amber-500' : 'text-green-500';
            return `
                <tr class="border-t hover:bg-slate-50 dark:hover:bg-slate-700 transition text-sm">
                    <td class="p-2"><input type="checkbox" class="prod-checkbox" data-id="${p.id}" ${selectedProducts.has(p.id) ? 'checked' : ''}></td>
                    <td class="p-2 font-medium">${p.name}</td>
                    <td class="p-2">${p.category || '-'}</td>
                    <td class="p-2">${p.sku || '-'}</td>
                    <td class="p-2 text-right">${p.minStock || 10} ${p.unit || 'kg'}</td>
                    <td class="p-2 text-center"><span class="font-semibold ${stockColor}">${currentStock} ${p.unit || 'kg'}</span></td>
                    <td class="p-2 text-center">
                        <button class="btn btn-xs btn-secondary" onclick="CFS.Products.editProduct('${p.id}')" title="Edit"><i class="ph ph-pencil"></i></button>
                        <button class="btn btn-xs btn-warning" onclick="CFS.Products.duplicateProduct('${p.id}')" title="Duplikat"><i class="ph ph-copy"></i></button>
                        <button class="btn btn-xs btn-danger" onclick="CFS.Products.deleteProduct('${p.id}')" title="Hapus"><i class="ph ph-trash"></i></button>
                    </td>
                </tr>
            `;
        }).join('');

        // Update select all
        if (E.prodSelectAll) E.prodSelectAll.checked = products.every(p => selectedProducts.has(p.id));
    }

    // ==================== FORM TAMBAH / EDIT ====================
    function editProduct(id) {
        const product = Storage.getProducts().find(p => p.id === id);
        if (!product) return;
        // Pindah ke sub tab form
        switchToSubTab('products-form');
        E.prodEditId.value = product.id;
        E.newProductName.value = product.name;
        E.newProductCategory.value = product.category || '';
        E.newProductSKU.value = product.sku || '';
        E.newProductMinStock.value = product.minStock || 10;
        E.newProductUnit.value = product.unit || 'kg';
        E.newProductBrand.value = product.brand || '';
        E.prodFormTitle.textContent = 'Edit Produk';
        E.prodSubmitBtn.textContent = '💾 Simpan Perubahan';
        E.prodCancelEditBtn.style.display = 'inline-flex';
        editingId = product.id;
    }

    function duplicateProduct(id) {
        const product = Storage.getProducts().find(p => p.id === id);
        if (!product) return;
        const newProduct = {
            id: 'prd_' + Date.now(),
            name: product.name + ' (Copy)',
            category: product.category,
            sku: (product.sku || '') + '-COPY',
            minStock: product.minStock,
            unit: product.unit,
            brand: product.brand
        };
        Storage.addProduct(newProduct).then(() => {
            refreshStats();
            renderProductTable();
            populateDropdowns();
            showToast('Sukses', `Produk "${newProduct.name}" dibuat.`, 'success');
        });
    }

    function cancelEdit() {
        E.prodEditId.value = '';
        E.productCustomForm.reset();
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

        if (!name) {
            showToast('Error', 'Nama produk wajib diisi.', 'error');
            return;
        }

        const data = { name, category, sku, minStock, unit, brand };

        if (id) {
            const products = Storage.getProducts();
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
        refreshStats();
        renderProductTable();
        populateDropdowns();
        if (CFS.Inventory) CFS.Inventory.populateProductDropdowns();
        if (CFS.Dashboard) CFS.Dashboard.refresh();
    }

    async function deleteProduct(id) {
        if (!confirm('Hapus produk? Batch yang terkait tidak akan terhapus.')) return;
        await Storage.deleteProduct(id);
        selectedProducts.delete(id);
        refreshStats();
        renderProductTable();
        populateDropdowns();
        if (CFS.Inventory) CFS.Inventory.populateProductDropdowns();
        showToast('Sukses', 'Produk dihapus.', 'success');
    }

    // ==================== BULK DELETE ====================
    function updateSelectedProducts() {
        const checks = document.querySelectorAll('.prod-checkbox');
        selectedProducts.clear();
        checks.forEach(c => { if (c.checked) selectedProducts.add(c.dataset.id); });
        if (E.prodSelectAll) E.prodSelectAll.checked = checks.length > 0 && selectedProducts.size === checks.length;
    }

    async function bulkDeleteProducts() {
        if (selectedProducts.size === 0) return;
        if (!confirm(`Hapus ${selectedProducts.size} produk terpilih?`)) return;
        for (const id of selectedProducts) {
            await Storage.deleteProduct(id);
        }
        selectedProducts.clear();
        refreshStats();
        renderProductTable();
        populateDropdowns();
        if (CFS.Inventory) CFS.Inventory.populateProductDropdowns();
        showToast('Sukses', `${selectedProducts.size} produk dihapus.`, 'success');
    }

    // ==================== KATEGORI ====================
    function renderCategoryTable() {
        if (!E.categoryTableBody) return;
        const products = Storage.getProducts();
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
            const products = Storage.getProducts();
            products.forEach(p => { if (p.category === target.name) p.category = ''; });
            await Storage.saveAllData();
            await saveCategories();
            renderCategoryTable();
            populateDropdowns();
            showToast('Sukses', 'Kategori dihapus.', 'success');
        }
    }

    // ==================== VARIAN KEMASAN ====================
    function renderVariantTable() {
        if (!E.variantTableBody) return;
        const products = Storage.getProducts();
        E.variantTableBody.innerHTML = variants.map(v => {
            const product = products.find(p => p.id === v.productId);
            return `<tr class="border-t text-sm">
                <td class="p-2">${product ? product.name : '?'}</td>
                <td class="p-2">${v.name}</td>
                <td class="p-2 text-right">${v.weight} kg</td>
                <td class="p-2 text-center">
                    <button class="btn btn-xs btn-danger" onclick="CFS.Products.deleteVariant('${v.id}')" title="Hapus"><i class="ph ph-trash"></i></button>
                </td>
            </tr>`;
        }).join('') || '<tr><td colspan="4" class="text-center p-4 opacity-50">Belum ada varian.</td></tr>';
    }

    async function addVariant() {
        const productId = E.variantProduk?.value;
        const name = E.variantName?.value.trim();
        const weight = parseFloat(E.variantWeight?.value);
        if (!productId || !name || isNaN(weight) || weight <= 0) {
            showToast('Error', 'Lengkapi data varian dengan benar.', 'error');
            return;
        }
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

    // ==================== IMPORT / EXPORT ====================
    function exportToCSV() {
        const products = Storage.getProducts();
        const rows = [['Nama', 'Kategori', 'SKU', 'Merek', 'Stok Minimum', 'Satuan']];
        products.forEach(p => rows.push([p.name, p.category || '', p.sku || '', p.brand || '', p.minStock || 10, p.unit || 'kg']));
        const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `produk_${new Date().toISOString().slice(0, 10)}.csv`;
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
                await Storage.addProduct({
                    id: 'prd_' + Date.now() + i,
                    name,
                    category: category || '',
                    sku: sku || '',
                    brand: brand || '',
                    minStock: parseInt(minStock) || 10,
                    unit: unit || 'kg'
                });
            }
            refreshStats();
            renderProductTable();
            populateDropdowns();
            if (CFS.Inventory) CFS.Inventory.populateProductDropdowns();
            showToast('Sukses', 'Produk diimpor dari CSV.', 'success');
        };
        input.click();
    }

    // ==================== EVENT BINDING ====================
    function bindEvents() {
        // Filter produk
        if (E.applyProdFilter) {
            E.applyProdFilter.addEventListener('click', () => {
                productFilter.search = E.prodSearch?.value || '';
                productFilter.category = E.prodFilterCategory?.value || '';
                renderProductTable(productFilter);
            });
        }

        // Form submit
        if (E.productCustomForm) {
            E.productCustomForm.addEventListener('submit', handleProductSubmit);
            E.productCustomForm.dataset.listener = 'true';
        }
        if (E.prodCancelEditBtn) E.prodCancelEditBtn.addEventListener('click', cancelEdit);

        // Bulk delete
        if (E.prodBulkDelete) E.prodBulkDelete.addEventListener('click', bulkDeleteProducts);
        if (E.prodSelectAll) {
            E.prodSelectAll.addEventListener('change', function () {
                const checks = document.querySelectorAll('.prod-checkbox');
                checks.forEach(c => c.checked = this.checked);
                updateSelectedProducts();
            });
        }
        // Delegasi event untuk checkbox produk
        if (E.productTableBody) {
            E.productTableBody.addEventListener('change', function (e) {
                if (e.target.classList.contains('prod-checkbox')) {
                    updateSelectedProducts();
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
        if (E.importProductsCSV) E.importProductsCSV.addEventListener('click', importFromCSV);
    }

    function switchToSubTab(tabId) {
        E.subTabBtns.forEach(b => { b.classList.remove('btn-primary', 'active'); b.classList.add('btn-secondary'); });
        const btn = document.querySelector(`.products-subtab-btn[data-products-tab="${tabId}"]`);
        if (btn) { btn.classList.add('btn-primary', 'active'); btn.classList.remove('btn-secondary'); }
        E.subTabContents.forEach(c => c.classList.add('hidden'));
        const target = document.getElementById(tabId);
        if (target) target.classList.remove('hidden');
    }

    // ==================== EXPORT API ====================
    CFS.Products = {
        init: initProductsTab,
        editProduct,
        duplicateProduct,
        deleteProduct,
        editCategory,
        deleteCategory,
        deleteVariant
    };
})();
