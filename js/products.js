/* ============================================================
   Cibitung Frozen ERP Ultimate v5.4 — Products Module (FULL)
   ============================================================ */
window.CFS = window.CFS || {};

(function() {
    'use strict';
    const Storage = CFS.Storage;

    // State lokal untuk kategori dan varian
    let categories = [];
    let variants = [];

    // Cache elemen
    let elements = {};

    function cacheElements() {
        elements = {
            // Statistik
            prodTotalProduct: document.getElementById('prodTotalProduct'),
            prodActiveProduct: document.getElementById('prodActiveProduct'),
            prodLowStock: document.getElementById('prodLowStock'),
            prodTotalCategory: document.getElementById('prodTotalCategory'),
            prodTotalVariants: document.getElementById('prodTotalVariants'),
            // Daftar produk
            prodSearch: document.getElementById('prodSearch'),
            prodFilterCategory: document.getElementById('prodFilterCategory'),
            applyProdFilter: document.getElementById('applyProdFilter'),
            productTableBody: document.getElementById('productTableBody'),
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
            // Import/export
            exportProductsCSV: document.getElementById('exportProductsCSV'),
            importProductsCSV: document.getElementById('importProductsCSV'),
        };
    }

    // ===================== INISIALISASI =====================
    async function initProductsTab() {
        // Muat kategori dan varian dari localforage
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
        populateCategoryFilters();
        bindEvents();
    }

    async function saveCategories() {
        await localforage.setItem('cfs_product_categories', categories);
    }

    async function saveVariants() {
        await localforage.setItem('cfs_product_variants', variants);
    }

    // --------------- SUB‑TAB SWITCHING ---------------
    function setupSubTabs() {
        document.querySelectorAll('.products-subtab-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.products-subtab-btn').forEach(b => {
                    b.classList.remove('btn-primary', 'active');
                    b.classList.add('btn-secondary');
                });
                this.classList.add('btn-primary', 'active');
                this.classList.remove('btn-secondary');
                const tab = this.dataset.productsTab;
                document.querySelectorAll('.products-subtab-content').forEach(c => c.classList.add('hidden'));
                const target = document.getElementById(tab);
                if (target) target.classList.remove('hidden');
                if (tab === 'products-category') renderCategoryTable();
                if (tab === 'products-variants') renderVariantTable();
                if (tab === 'products-list') renderProductTable();
            });
        });
    }

    // --------------- STATISTIK ---------------
    function refreshStats() {
        const products = Storage.getProducts();
        const total = products.length;
        const stockMap = CFS.Inventory ? CFS.Inventory.getStockPerProduct() : {};
        const activeCount = products.filter(p => (stockMap[p.name] || 0) > 0).length;
        const lowStockCount = products.filter(p => {
            const stock = stockMap[p.name] || 0;
            return stock > 0 && stock < (p.minStock || 10);
        }).length;

        if (elements.prodTotalProduct) elements.prodTotalProduct.textContent = total;
        if (elements.prodActiveProduct) elements.prodActiveProduct.textContent = activeCount;
        if (elements.prodLowStock) elements.prodLowStock.textContent = lowStockCount;
        if (elements.prodTotalCategory) elements.prodTotalCategory.textContent = categories.length;
        if (elements.prodTotalVariants) elements.prodTotalVariants.textContent = variants.length;
    }

    // --------------- DAFTAR PRODUK ---------------
    function renderProductTable(filter = {}) {
        if (!elements.productTableBody) return;
        let products = Storage.getProducts();
        if (filter.search) {
            const keyword = filter.search.toLowerCase();
            products = products.filter(p => p.name.toLowerCase().includes(keyword) || (p.sku || '').toLowerCase().includes(keyword));
        }
        if (filter.category) {
            products = products.filter(p => (p.category || '') === filter.category);
        }

        const stockMap = CFS.Inventory ? CFS.Inventory.getStockPerProduct() : {};
        if (products.length === 0) {
            elements.productTableBody.innerHTML = '<tr><td colspan="8" class="text-center p-4 opacity-50">Tidak ada produk.</td></tr>';
            return;
        }

        elements.productTableBody.innerHTML = products.map(p => {
            const currentStock = stockMap[p.name] || 0;
            const categoryName = p.category || '-';
            return `
                <tr class="border-t hover:bg-slate-50 dark:hover:bg-slate-700">
                    <td class="p-2 font-medium">${p.name}</td>
                    <td class="p-2">${categoryName}</td>
                    <td class="p-2">${p.sku || '-'}</td>
                    <td class="p-2">${p.brand || '-'}</td>
                    <td class="p-2 text-right">${p.minStock || 10}</td>
                    <td class="p-2">${p.unit || 'kg'}</td>
                    <td class="p-2 text-center">
                        <span class="font-semibold ${currentStock === 0 ? 'text-red-500' : currentStock < (p.minStock||10) ? 'text-amber-500' : 'text-green-500'}">${currentStock} kg</span>
                    </td>
                    <td class="p-2 text-center">
                        <button class="btn btn-xs btn-secondary" onclick="CFS.Products.editProduct('${p.id}')">✏️</button>
                        <button class="btn btn-xs btn-danger" onclick="CFS.Products.deleteProduct('${p.id}')">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function populateCategoryFilters() {
        const filterSelect = elements.prodFilterCategory;
        const formSelect = elements.newProductCategory;
        const variantSelect = elements.variantProduk;
        const optionsHTML = '<option value="">Semua / Tanpa</option>' + categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
        if (filterSelect) filterSelect.innerHTML = optionsHTML;
        if (formSelect) formSelect.innerHTML = '<option value="">Tanpa Kategori</option>' + categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
        if (variantSelect) {
            const products = Storage.getProducts();
            variantSelect.innerHTML = '<option value="">Pilih Produk</option>' + products.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
        }
    }

    // --------------- FORM TAMBAH / EDIT ---------------
    function editProduct(id) {
        const product = Storage.getProducts().find(p => p.id === id);
        if (!product) return;
        // Pindah ke sub‑tab form
        document.querySelectorAll('.products-subtab-btn').forEach(b => { b.classList.remove('btn-primary','active'); b.classList.add('btn-secondary'); });
        const formBtn = document.querySelector('[data-products-tab="products-form"]');
        if (formBtn) { formBtn.classList.add('btn-primary','active'); formBtn.classList.remove('btn-secondary'); }
        document.querySelectorAll('.products-subtab-content').forEach(c => c.classList.add('hidden'));
        const formDiv = document.getElementById('products-form');
        if (formDiv) formDiv.classList.remove('hidden');

        // Isi form
        elements.prodEditId.value = product.id;
        elements.newProductName.value = product.name;
        elements.newProductCategory.value = product.category || '';
        elements.newProductSKU.value = product.sku || '';
        elements.newProductMinStock.value = product.minStock || 10;
        elements.newProductUnit.value = product.unit || 'kg';
        elements.newProductBrand.value = product.brand || '';
        elements.prodFormTitle.textContent = 'Edit Produk';
        elements.prodSubmitBtn.textContent = '💾 Simpan Perubahan';
        elements.prodCancelEditBtn.style.display = 'inline-flex';
    }

    function cancelEdit() {
        elements.prodEditId.value = '';
        elements.productCustomForm.reset();
        elements.newProductMinStock.value = 10;
        elements.newProductUnit.value = 'kg';
        elements.prodFormTitle.textContent = 'Tambah Produk Baru';
        elements.prodSubmitBtn.textContent = '➕ Tambah Produk';
        elements.prodCancelEditBtn.style.display = 'none';
    }

    async function handleProductSubmit(e) {
        e.preventDefault();
        const id = elements.prodEditId.value;
        const name = elements.newProductName.value.trim();
        const category = elements.newProductCategory.value;
        const sku = elements.newProductSKU.value.trim();
        const minStock = parseInt(elements.newProductMinStock.value) || 10;
        const unit = elements.newProductUnit.value.trim() || 'kg';
        const brand = elements.newProductBrand.value.trim();

        if (!name) {
            window.showToast?.('Error', 'Nama produk wajib diisi.', 'error');
            return;
        }

        if (id) {
            // Update produk
            const products = Storage.getProducts();
            const product = products.find(p => p.id === id);
            if (product) {
                product.name = name;
                product.category = category;
                product.sku = sku;
                product.minStock = minStock;
                product.unit = unit;
                product.brand = brand;
                await Storage.saveAllData();
                window.showToast?.('Sukses', 'Produk diperbarui.', 'success');
            }
        } else {
            // Tambah baru
            const newProduct = { id: 'prd_' + Date.now(), name, category, sku, minStock, unit, brand };
            await Storage.addProduct(newProduct);
            window.showToast?.('Sukses', 'Produk baru ditambahkan.', 'success');
        }

        cancelEdit();
        refreshStats();
        renderProductTable();
        populateCategoryFilters();
        if (CFS.Inventory) CFS.Inventory.populateProductDropdowns();
        if (CFS.Dashboard) CFS.Dashboard.refresh();
    }

    async function deleteProduct(id) {
        if (!confirm('Hapus produk? Batch yang terkait tidak akan terhapus.')) return;
        await Storage.deleteProduct(id);
        refreshStats();
        renderProductTable();
        populateCategoryFilters();
        if (CFS.Inventory) CFS.Inventory.populateProductDropdowns();
        window.showToast?.('Sukses', 'Produk dihapus.', 'success');
    }

    // --------------- KATEGORI ---------------
    function renderCategoryTable() {
        if (!elements.categoryTableBody) return;
        const products = Storage.getProducts();
        elements.categoryTableBody.innerHTML = categories.map(c => {
            const count = products.filter(p => (p.category || '') === c.name).length;
            return `<tr class="border-t"><td class="p-2">${c.name}</td><td class="p-2 text-right">${count}</td><td class="p-2 text-center"><button class="btn btn-xs btn-danger" onclick="CFS.Products.deleteCategory('${c.id}')">🗑️</button></td></tr>`;
        }).join('') || '<tr><td colspan="3" class="text-center p-4 opacity-50">Belum ada kategori.</td></tr>';
    }

    async function addCategory() {
        const name = elements.newCategoryName?.value.trim();
        if (!name) return;
        const id = 'cat_' + Date.now();
        categories.push({ id, name });
        await saveCategories();
        elements.newCategoryName.value = '';
        renderCategoryTable();
        populateCategoryFilters();
        window.showToast?.('Sukses', 'Kategori ditambahkan.', 'success');
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
            populateCategoryFilters();
            window.showToast?.('Sukses', 'Kategori dihapus.', 'success');
        }
    }

    // --------------- VARIAN KEMASAN ---------------
    function renderVariantTable() {
        if (!elements.variantTableBody) return;
        const products = Storage.getProducts();
        elements.variantTableBody.innerHTML = variants.map(v => {
            const product = products.find(p => p.id === v.productId);
            return `<tr class="border-t"><td class="p-2">${product ? product.name : '?'}</td><td class="p-2">${v.name}</td><td class="p-2 text-right">${v.weight} kg</td><td class="p-2 text-center"><button class="btn btn-xs btn-danger" onclick="CFS.Products.deleteVariant('${v.id}')">🗑️</button></td></tr>`;
        }).join('') || '<tr><td colspan="4" class="text-center p-4 opacity-50">Belum ada varian.</td></tr>';
    }

    async function addVariant() {
        const productId = elements.variantProduk?.value;
        const name = elements.variantName?.value.trim();
        const weight = parseFloat(elements.variantWeight?.value);
        if (!productId || !name || isNaN(weight) || weight <= 0) {
            window.showToast?.('Error', 'Lengkapi data varian dengan benar.', 'error');
            return;
        }
        variants.push({ id: 'var_' + Date.now(), productId, name, weight });
        await saveVariants();
        elements.variantName.value = '';
        elements.variantWeight.value = '';
        renderVariantTable();
        refreshStats();
        window.showToast?.('Sukses', 'Varian kemasan ditambahkan.', 'success');
    }

    async function deleteVariant(id) {
        if (!confirm('Hapus varian?')) return;
        variants = variants.filter(v => v.id !== id);
        await saveVariants();
        renderVariantTable();
        refreshStats();
        window.showToast?.('Sukses', 'Varian dihapus.', 'success');
    }

    // --------------- IMPORT / EXPORT ---------------
    async function exportProductsToCSV() {
        const products = Storage.getProducts();
        const rows = [['Nama','Kategori','SKU','Merek','Stok Minimum','Satuan']];
        products.forEach(p => rows.push([p.name, p.category || '', p.sku || '', p.brand || '', p.minStock || 10, p.unit || 'kg']));
        const csvContent = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `produk_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        window.showToast?.('Sukses', 'Produk diekspor ke CSV.', 'success');
    }

    function importProductsFromCSV() {
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
            populateCategoryFilters();
            if (CFS.Inventory) CFS.Inventory.populateProductDropdowns();
            window.showToast?.('Sukses', 'Produk diimpor dari CSV.', 'success');
        };
        input.click();
    }

    // --------------- EVENT BINDING ---------------
    function bindEvents() {
        // Filter daftar produk
        if (elements.applyProdFilter) {
            elements.applyProdFilter.addEventListener('click', () => {
                renderProductTable({
                    search: elements.prodSearch?.value || '',
                    category: elements.prodFilterCategory?.value || ''
                });
            });
        }

        // Form submit
        if (elements.productCustomForm) {
            elements.productCustomForm.addEventListener('submit', handleProductSubmit);
            elements.productCustomForm.dataset.listener = 'true';
        }
        if (elements.prodCancelEditBtn) {
            elements.prodCancelEditBtn.addEventListener('click', cancelEdit);
        }

        // Kategori
        if (elements.addCategoryBtn) {
            elements.addCategoryBtn.addEventListener('click', addCategory);
        }

        // Varian
        if (elements.addVariantBtn) {
            elements.addVariantBtn.addEventListener('click', addVariant);
        }

        // Export
        if (elements.exportProductsCSV) {
            elements.exportProductsCSV.addEventListener('click', exportProductsToCSV);
        }
        if (elements.exportProductsCSV2) {
            elements.exportProductsCSV2.addEventListener('click', exportProductsToCSV);
        }

        // Import
        if (elements.importProductsCSV) {
            elements.importProductsCSV.addEventListener('click', importProductsFromCSV);
        }
    }

    // Expose API
    CFS.Products = {
        init: initProductsTab,
        editProduct: editProduct,
        deleteProduct: deleteProduct,
        deleteCategory: deleteCategory,
        deleteVariant: deleteVariant
    };
})();
