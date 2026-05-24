/* ============================================================
   Cibitung Frozen ERP Ultimate v5.4 — Products Module (FIX)
   ============================================================ */
window.CFS = window.CFS || {};

(function() {
    'use strict';
    const Storage = CFS.Storage;

    let categories = [];
    let variants = [];

    let elements = {};

    function cacheElements() {
        elements = {
            prodTotalProduct: document.getElementById('prodTotalProduct'),
            prodActiveProduct: document.getElementById('prodActiveProduct'),
            prodLowStock: document.getElementById('prodLowStock'),
            prodTotalCategory: document.getElementById('prodTotalCategory'),
            prodTotalVariants: document.getElementById('prodTotalVariants'),
            prodSearch: document.getElementById('prodSearch'),
            prodFilterCategory: document.getElementById('prodFilterCategory'),
            applyProdFilter: document.getElementById('applyProdFilter'),
            productTableBody: document.getElementById('productTableBody'),
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

    // ---------- INIT ----------
    async function initProductsTab() {
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
        setupSubTabs();          // <-- pasang event listener
        refreshStats();
        renderProductTable();
        populateCategoryFilters();
        bindEvents();
    }

    async function saveCategories() { await localforage.setItem('cfs_product_categories', categories); }
    async function saveVariants() { await localforage.setItem('cfs_product_variants', variants); }

    // ---------- SUB TAB SWITCHING (PENTING!) ----------
    function setupSubTabs() {
        const btns = document.querySelectorAll('.products-subtab-btn');
        btns.forEach(btn => {
            // hindari bind ganda
            if (btn.dataset.listener === 'true') return;
            btn.dataset.listener = 'true';
            btn.addEventListener('click', function() {
                btns.forEach(b => {
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

    // ---------- STATS ----------
    function refreshStats() {
        const products = Storage.getProducts();
        const total = products.length;
        const stockMap = CFS.Inventory?.getStockPerProduct() || {};
        const active = products.filter(p => (stockMap[p.name]||0) > 0).length;
        const low = products.filter(p => { const s = stockMap[p.name]||0; return s > 0 && s < (p.minStock||10); }).length;
        if (elements.prodTotalProduct) elements.prodTotalProduct.textContent = total;
        if (elements.prodActiveProduct) elements.prodActiveProduct.textContent = active;
        if (elements.prodLowStock) elements.prodLowStock.textContent = low;
        if (elements.prodTotalCategory) elements.prodTotalCategory.textContent = categories.length;
        if (elements.prodTotalVariants) elements.prodTotalVariants.textContent = variants.length;
    }

    // ---------- PRODUCT TABLE ----------
    function renderProductTable(filter = {}) {
        if (!elements.productTableBody) return;
        let prods = Storage.getProducts();
        if (filter.search) {
            const kw = filter.search.toLowerCase();
            prods = prods.filter(p => p.name.toLowerCase().includes(kw) || (p.sku||'').toLowerCase().includes(kw));
        }
        if (filter.category) prods = prods.filter(p => (p.category||'') === filter.category);
        const stockMap = CFS.Inventory?.getStockPerProduct() || {};
        if (!prods.length) {
            elements.productTableBody.innerHTML = '<tr><td colspan="8" class="text-center p-4 opacity-50">Tidak ada produk.</td></tr>';
            return;
        }
        elements.productTableBody.innerHTML = prods.map(p => {
            const stok = stockMap[p.name] || 0;
            return `<tr class="border-t hover:bg-slate-50 dark:hover:bg-slate-700">
                <td class="p-2 font-medium">${p.name}</td>
                <td class="p-2">${p.category || '-'}</td>
                <td class="p-2">${p.sku || '-'}</td>
                <td class="p-2">${p.brand || '-'}</td>
                <td class="p-2 text-right">${p.minStock || 10}</td>
                <td class="p-2">${p.unit || 'kg'}</td>
                <td class="p-2 text-center"><span class="font-semibold ${stok===0?'text-red-500':stok<(p.minStock||10)?'text-amber-500':'text-green-500'}">${stok} kg</span></td>
                <td class="p-2 text-center">
                    <button class="btn btn-xs btn-secondary" onclick="CFS.Products.editProduct('${p.id}')">✏️</button>
                    <button class="btn btn-xs btn-danger" onclick="CFS.Products.deleteProduct('${p.id}')">🗑️</button>
                </td>
            </tr>`;
        }).join('');
    }

    function populateCategoryFilters() {
        const opts = '<option value="">Semua / Tanpa</option>' + categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
        if (elements.prodFilterCategory) elements.prodFilterCategory.innerHTML = opts;
        if (elements.newProductCategory) elements.newProductCategory.innerHTML = '<option value="">Tanpa Kategori</option>' + categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
        if (elements.variantProduk) {
            const prods = Storage.getProducts();
            elements.variantProduk.innerHTML = '<option value="">Pilih Produk</option>' + prods.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
        }
    }

    // ---------- FORM EDIT ----------
    function editProduct(id) {
        const p = Storage.getProducts().find(x => x.id === id);
        if (!p) return;
        // switch sub-tab
        document.querySelectorAll('.products-subtab-btn').forEach(b => { b.classList.remove('btn-primary','active'); b.classList.add('btn-secondary'); });
        const btn = document.querySelector('[data-products-tab="products-form"]');
        if (btn) { btn.classList.add('btn-primary','active'); btn.classList.remove('btn-secondary'); }
        document.querySelectorAll('.products-subtab-content').forEach(c => c.classList.add('hidden'));
        document.getElementById('products-form')?.classList.remove('hidden');
        // isi form
        elements.prodEditId.value = p.id;
        elements.newProductName.value = p.name;
        elements.newProductCategory.value = p.category || '';
        elements.newProductSKU.value = p.sku || '';
        elements.newProductMinStock.value = p.minStock || 10;
        elements.newProductUnit.value = p.unit || 'kg';
        elements.newProductBrand.value = p.brand || '';
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
        if (!name) { window.showToast?.('Error','Nama produk wajib diisi.','error'); return; }
        const data = {
            name,
            category: elements.newProductCategory.value,
            sku: elements.newProductSKU.value.trim(),
            minStock: parseInt(elements.newProductMinStock.value) || 10,
            unit: elements.newProductUnit.value.trim() || 'kg',
            brand: elements.newProductBrand.value.trim()
        };
        if (id) {
            const prods = Storage.getProducts();
            const prod = prods.find(p => p.id === id);
            if (prod) { Object.assign(prod, data); await Storage.saveAllData(); window.showToast?.('Sukses','Produk diperbarui.','success'); }
        } else {
            await Storage.addProduct({ id: 'prd_'+Date.now(), ...data });
            window.showToast?.('Sukses','Produk baru ditambahkan.','success');
        }
        cancelEdit();
        refreshStats();
        renderProductTable();
        populateCategoryFilters();
        if (CFS.Inventory) CFS.Inventory.populateProductDropdowns();
        if (CFS.Dashboard) CFS.Dashboard.refresh();
    }

    async function deleteProduct(id) {
        if (!confirm('Hapus produk? Batch terkait tidak terhapus.')) return;
        await Storage.deleteProduct(id);
        refreshStats();
        renderProductTable();
        populateCategoryFilters();
        if (CFS.Inventory) CFS.Inventory.populateProductDropdowns();
        window.showToast?.('Sukses','Produk dihapus.','success');
    }

    // ---------- KATEGORI ----------
    function renderCategoryTable() {
        if (!elements.categoryTableBody) return;
        const prods = Storage.getProducts();
        elements.categoryTableBody.innerHTML = categories.map(c => {
            const cnt = prods.filter(p => (p.category||'') === c.name).length;
            return `<tr class="border-t"><td class="p-2">${c.name}</td><td class="p-2 text-right">${cnt}</td><td class="p-2 text-center"><button class="btn btn-xs btn-danger" onclick="CFS.Products.deleteCategory('${c.id}')">🗑️</button></td></tr>`;
        }).join('') || '<tr><td colspan="3" class="text-center p-4 opacity-50">Belum ada kategori.</td></tr>';
    }

    async function addCategory() {
        const name = elements.newCategoryName?.value.trim();
        if (!name) return;
        categories.push({ id: 'cat_'+Date.now(), name });
        await saveCategories();
        elements.newCategoryName.value = '';
        renderCategoryTable();
        populateCategoryFilters();
        window.showToast?.('Sukses','Kategori ditambahkan.','success');
    }

    async function deleteCategory(id) {
        if (!confirm('Hapus kategori?')) return;
        const target = categories.find(c => c.id === id);
        if (target) {
            categories = categories.filter(c => c.id !== id);
            const prods = Storage.getProducts();
            prods.forEach(p => { if (p.category === target.name) p.category = ''; });
            await Storage.saveAllData();
            await saveCategories();
            renderCategoryTable();
            populateCategoryFilters();
            window.showToast?.('Sukses','Kategori dihapus.','success');
        }
    }

    // ---------- VARIAN ----------
    function renderVariantTable() {
        if (!elements.variantTableBody) return;
        const prods = Storage.getProducts();
        elements.variantTableBody.innerHTML = variants.map(v => {
            const prod = prods.find(p => p.id === v.productId);
            return `<tr class="border-t"><td class="p-2">${prod?prod.name:'?'}</td><td class="p-2">${v.name}</td><td class="p-2 text-right">${v.weight} kg</td><td class="p-2 text-center"><button class="btn btn-xs btn-danger" onclick="CFS.Products.deleteVariant('${v.id}')">🗑️</button></td></tr>`;
        }).join('') || '<tr><td colspan="4" class="text-center p-4 opacity-50">Belum ada varian.</td></tr>';
    }

    async function addVariant() {
        const pid = elements.variantProduk?.value;
        const name = elements.variantName?.value.trim();
        const w = parseFloat(elements.variantWeight?.value);
        if (!pid || !name || isNaN(w) || w<=0) { window.showToast?.('Error','Data varian tidak lengkap.','error'); return; }
        variants.push({ id: 'var_'+Date.now(), productId: pid, name, weight: w });
        await saveVariants();
        elements.variantName.value = '';
        elements.variantWeight.value = '';
        renderVariantTable();
        refreshStats();
        window.showToast?.('Sukses','Varian ditambahkan.','success');
    }

    async function deleteVariant(id) {
        if (!confirm('Hapus varian?')) return;
        variants = variants.filter(v => v.id !== id);
        await saveVariants();
        renderVariantTable();
        refreshStats();
        window.showToast?.('Sukses','Varian dihapus.','success');
    }

    // ---------- IMPORT/EXPORT ----------
    async function exportCSV() {
        const prods = Storage.getProducts();
        const rows = [['Nama','Kategori','SKU','Merek','Stok Minimum','Satuan']];
        prods.forEach(p => rows.push([p.name, p.category||'', p.sku||'', p.brand||'', p.minStock||10, p.unit||'kg']));
        const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = `produk_${new Date().toISOString().slice(0,10)}.csv`; a.click();
        window.showToast?.('Sukses','CSV diekspor.','success');
    }

    function importCSV() {
        const input = document.createElement('input'); input.type = 'file'; input.accept = '.csv';
        input.onchange = async (e) => {
            const file = e.target.files[0]; if (!file) return;
            const text = await file.text();
            const lines = text.split('\n').filter(l => l.trim());
            if (lines.length < 2) return;
            for (let i=1; i<lines.length; i++) {
                const cols = lines[i].split(',').map(c => c.replace(/"/g,'').trim());
                if (cols.length < 6) continue;
                const [name, cat, sku, brand, minStok, unit] = cols;
                if (!name) continue;
                await Storage.addProduct({ id:'prd_'+Date.now()+i, name, category:cat||'', sku:sku||'', brand:brand||'', minStock:parseInt(minStok)||10, unit:unit||'kg' });
            }
            refreshStats(); renderProductTable(); populateCategoryFilters();
            if (CFS.Inventory) CFS.Inventory.populateProductDropdowns();
            window.showToast?.('Sukses','Produk diimpor.','success');
        };
        input.click();
    }

    // ---------- BIND EVENTS ----------
    function bindEvents() {
        if (elements.applyProdFilter) {
            elements.applyProdFilter.addEventListener('click', () => {
                renderProductTable({
                    search: elements.prodSearch?.value || '',
                    category: elements.prodFilterCategory?.value || ''
                });
            });
        }
        if (elements.productCustomForm) {
            elements.productCustomForm.addEventListener('submit', handleProductSubmit);
            elements.productCustomForm.dataset.listener = 'true';
        }
        if (elements.prodCancelEditBtn) elements.prodCancelEditBtn.addEventListener('click', cancelEdit);
        if (elements.addCategoryBtn) elements.addCategoryBtn.addEventListener('click', addCategory);
        if (elements.addVariantBtn) elements.addVariantBtn.addEventListener('click', addVariant);
        if (elements.exportProductsCSV) elements.exportProductsCSV.addEventListener('click', exportCSV);
        if (elements.exportProductsCSV2) elements.exportProductsCSV2.addEventListener('click', exportCSV);
        if (elements.importProductsCSV) elements.importProductsCSV.addEventListener('click', importCSV);
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
