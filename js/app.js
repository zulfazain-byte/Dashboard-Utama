/* ============================================================
   Cibitung Frozen ERP Ultimate v5.4 — Main Application (FIX)
   ============================================================ */
window.CFS = window.CFS || {};

(function() {
    'use strict';

    const Storage = CFS.Storage;
    const modulesInitialized = {};

    // --------------- TOAST ---------------
    const toast = document.getElementById('toast');
    const toastIcon = document.getElementById('toastIcon');
    const toastTitle = document.getElementById('toastTitle');
    const toastMsg = document.getElementById('toastMsg');

    function showToast(title, msg, type = 'info') {
        if (!toast || !toastIcon || !toastTitle || !toastMsg) return;
        toastIcon.className = 'w-9 h-9 rounded-full flex items-center justify-center text-white';
        if (type === 'success') {
            toastIcon.classList.add('bg-green-500');
            toastIcon.innerHTML = '<i class="ph ph-check"></i>';
        } else if (type === 'error') {
            toastIcon.classList.add('bg-red-500');
            toastIcon.innerHTML = '<i class="ph ph-x"></i>';
        } else if (type === 'warning') {
            toastIcon.classList.add('bg-yellow-500');
            toastIcon.innerHTML = '<i class="ph ph-warning"></i>';
        } else {
            toastIcon.classList.add('bg-blue-500');
            toastIcon.innerHTML = '<i class="ph ph-info"></i>';
        }
        toastTitle.textContent = title;
        toastMsg.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
    window.showToast = showToast;

    // --------------- SWITCH TAB (SATU FUNGSI) ---------------
    function switchTab(tabId) {
        document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active', 'bg-primary-50', 'text-primary-700', 'font-semibold');
            btn.classList.add('opacity-70');
        });

        const target = document.getElementById(tabId);
        if (target) target.classList.add('active');

        const btn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
        if (btn) {
            btn.classList.add('active', 'bg-primary-50', 'text-primary-700', 'font-semibold');
            btn.classList.remove('opacity-70');
        }

        // Inisialisasi modul
        switch (tabId) {
            case 'tab-dashboard':
                if (CFS.Dashboard) {
                    if (!modulesInitialized.dashboard) { CFS.Dashboard.init(); modulesInitialized.dashboard = true; }
                    else CFS.Dashboard.refresh();
                }
                break;
            case 'tab-stock':
                if (CFS.Inventory) {
                    if (!modulesInitialized.stock) { CFS.Inventory.init(); modulesInitialized.stock = true; }
                    else CFS.Inventory.refreshStockTable();
                }
                break;
            case 'tab-sales':
                if (CFS.Sales) {
                    if (!modulesInitialized.sales) { CFS.Sales.init(); modulesInitialized.sales = true; }
                    else { CFS.Sales.refreshTodaySales(); if (CFS.Inventory) CFS.Inventory.populateProductDropdowns(); }
                }
                break;
            case 'tab-purchase':
                if (CFS.Purchase && CFS.Purchase.init) CFS.Purchase.init();
                else initPurchaseTabFull();
                break;
            case 'tab-supplier':
                initSupplierTabFull();
                break;
            case 'tab-products':
                if (CFS.Products && CFS.Products.init) CFS.Products.init();
                else initProductsTabFull();
                break;
            case 'tab-crm':
                if (CFS.CRM && CFS.CRM.init) CFS.CRM.init();
                else initCRMTabFull();
                break;
            case 'tab-crm-detail':
                initCRMDetailTabFull();
                break;
            case 'tab-pricing':
                if (CFS.Pricing && CFS.Pricing.init) CFS.Pricing.init();
                else initPricingTabFull();
                break;
            case 'tab-finance':
                if (CFS.Accounting) {
                    if (!modulesInitialized.finance) { CFS.Accounting.init(); modulesInitialized.finance = true; }
                    else CFS.Accounting.refreshFinanceSummary();
                }
                break;
            case 'tab-delivery':
                initDeliveryTabFull();
                break;
            case 'tab-opname':
                initOpnameTabFull();
                break;
            case 'tab-return':
                initReturnTabFull();
                break;
            case 'tab-history':
                if (CFS.History && CFS.History.init) CFS.History.init();
                else initHistoryTabFull();
                break;
            case 'tab-audit':
                if (CFS.Audit && CFS.Audit.init) CFS.Audit.init();
                else initAuditTabFull();
                break;
            case 'tab-reports':
                if (CFS.Reports && CFS.Reports.init) CFS.Reports.init();
                else initReportsTabFull();
                break;
            case 'tab-notifications':
                initNotificationsTabFull();
                break;
            case 'tab-settings':
                if (CFS.Settings) {
                    if (!modulesInitialized.settings) { CFS.Settings.init(); modulesInitialized.settings = true; }
                    else CFS.Settings.loadSettingsToForm();
                }
                break;
            case 'tab-help':
                break;
        }
    }
    window.switchTab = switchTab;

    // --------------- BACKUP & RESTORE ---------------
    async function backupData() {
        const data = {
            batches: Storage.getBatches(),
            sales: Storage.getSales(),
            expenses: Storage.getExpenses(),
            settings: Storage.getSettings(),
            company: Storage.getCompany(),
            customers: Storage.getCustomers(),
            suppliers: Storage.getSuppliers(),
            deliveries: Storage.getDeliveries(),
            opnameList: Storage.getOpname(),
            returns: Storage.getReturns(),
            auditTrail: Storage.getAuditTrail(),
            pricing: Storage.getPricing(),
            products: Storage.getProducts()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `cibitung_frozen_backup_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        showToast('Backup', 'Data berhasil diunduh.', 'success');
        Storage.addAudit?.('BACKUP', 'Data dibackup manual');
    }

    function restorePrompt() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async function(e) {
            const file = e.target.files[0];
            if (!file) return;
            try {
                const text = await file.text();
                const data = JSON.parse(text);
                if (!data.batches || !data.sales) throw new Error('Format tidak valid');
                await Storage.resetAllData();
                await localforage.setItem('cfs_batches', data.batches || []);
                await localforage.setItem('cfs_sales', data.sales || []);
                await localforage.setItem('cfs_expenses', data.expenses || []);
                await localforage.setItem('cfs_settings', data.settings || Storage.defaultSettings);
                await localforage.setItem('cfs_company', data.company || Storage.defaultCompany);
                await localforage.setItem('cfs_customers', data.customers || {});
                await localforage.setItem('cfs_suppliers', data.suppliers || []);
                await localforage.setItem('cfs_deliveries', data.deliveries || []);
                await localforage.setItem('cfs_opname', data.opnameList || []);
                await localforage.setItem('cfs_returns', data.returns || []);
                await localforage.setItem('cfs_audit_trail', data.auditTrail || []);
                await localforage.setItem('cfs_pricing', data.pricing || {});
                await localforage.setItem('cfs_products', data.products || []);
                location.reload();
                showToast('Restore', 'Data berhasil dipulihkan. Halaman dimuat ulang.', 'success');
            } catch (err) {
                showToast('Error', 'File backup tidak valid.', 'error');
            }
        };
        input.click();
    }

    // --------------- DARK MODE ---------------
    window.toggleDarkMode = function() {
        document.documentElement.classList.toggle('dark');
        localStorage.setItem('cfs_dark', document.documentElement.classList.contains('dark') ? '1' : '0');
        const darkIcon = document.getElementById('darkIcon');
        if (darkIcon) darkIcon.className = document.documentElement.classList.contains('dark') ? 'ph ph-sun text-lg text-yellow-400' : 'ph ph-moon text-lg';
        const sidebarMode = document.getElementById('sidebar-mode');
        if (sidebarMode) sidebarMode.textContent = document.documentElement.classList.contains('dark') ? 'Gelap' : 'Terang';
    };

    // ===================== FALLBACK FUNCTIONS =====================

    function initPurchaseTabFull() {
        const form = document.getElementById('purchaseForm');
        if (!form || form.dataset.listener) return;
        form.dataset.listener = 'true';
        const supplierSelect = document.getElementById('purchaseSupplier');
        const produkSelect = document.getElementById('purchaseProduk');
        const qtyInput = document.getElementById('purchaseQty');
        const hargaInput = document.getElementById('purchaseHarga');
        const tglInput = document.getElementById('purchaseTgl');
        const estimasiInput = document.getElementById('purchaseEstimasi');
        const catatanInput = document.getElementById('purchaseCatatan');
        const tbody = document.getElementById('purchaseTableBody');

        function populateSuppliers() {
            const sups = Storage.getSuppliers();
            if (supplierSelect) supplierSelect.innerHTML = '<option value="">Pilih Supplier</option>' + sups.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        }
        function populateProducts() {
            const prods = Storage.getProducts().length ? Storage.getProducts().map(p => p.name) : Storage.defaultProducts;
            if (produkSelect) produkSelect.innerHTML = '<option value="">Pilih Produk</option>' + prods.map(p => `<option>${p}</option>`).join('');
        }
        function renderPOList() {
            if (!tbody) return;
            const pos = Storage.getBatches().filter(b => b.supplier && b.used === 0);
            tbody.innerHTML = pos.length === 0 ? '<tr><td colspan="8" class="text-center p-4 opacity-50">Belum ada PO</td></tr>' :
            pos.map(b => {
                const sup = Storage.getSuppliers().find(s => s.id === b.supplier);
                return `<tr class="border-t"><td class="p-2">${b.tglProduksi}</td><td class="p-2">${sup?.name||'-'}</td><td class="p-2">${b.produk}</td><td class="p-2 text-right">${b.berat} kg</td><td class="p-2 text-right">Rp ${b.hargaBeli.toLocaleString('id-ID')}</td><td class="p-2 text-right">Rp ${(b.berat*b.hargaBeli).toLocaleString('id-ID')}</td><td class="p-2 text-center"><span class="badge bg-blue-100 text-blue-700">Draft</span></td><td class="p-2 text-center"><button class="btn btn-xs btn-success" onclick="CFS.App.acceptPO('${b.id}')">✅</button></td></tr>`;
            }).join('');
        }
        populateSuppliers();
        populateProducts();
        renderPOList();

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const supplierId = supplierSelect.value;
            const produk = produkSelect.value;
            const qty = parseFloat(qtyInput.value);
            const harga = parseFloat(hargaInput.value);
            const tanggal = tglInput.value;
            const estimasi = estimasiInput?.value || '';
            const catatan = catatanInput?.value || '';
            if (!supplierId || !produk || !qty || !harga || !tanggal) {
                showToast('Error', 'Lengkapi data pembelian.', 'error');
                return;
            }
            const newBatch = {
                id: 'b' + Date.now(),
                produk,
                berat: qty,
                hargaBeli: harga,
                ongkir: 0,
                bensin: 0,
                bongkar: 0,
                pajakType: 'none',
                pajakValue: 0,
                tglProduksi: tanggal,
                tglKadaluarsa: new Date(new Date(tanggal).getTime() + 90*24*60*60*1000).toISOString().split('T')[0],
                used: 0,
                supplier: supplierId,
                warehouse: 'gudang_utama',
                estimasi,
                catatan
            };
            await Storage.addBatch(newBatch);
            showToast('Sukses', 'Purchase Order dibuat dan batch ditambahkan.', 'success');
            form.reset();
            renderPOList();
            if (CFS.Dashboard) CFS.Dashboard.refresh();
        });
        CFS.App.acceptPO = async (batchId) => {
            const batch = Storage.getBatches().find(b => b.id === batchId);
            if (!batch) return;
            showToast('Sukses', 'PO diterima. Batch siap digunakan.', 'success');
            renderPOList();
        };
    }

    function initSupplierTabFull() {
        const form = document.getElementById('supplierForm');
        if (!form || form.dataset.listener) return;
        form.dataset.listener = 'true';
        const nameInput = document.getElementById('supplierName');
        const contactInput = document.getElementById('supplierContact');
        const addressInput = document.getElementById('supplierAddress');
        const emailInput = document.getElementById('supplierEmail');
        const bankInput = document.getElementById('supplierBank');
        const npwpInput = document.getElementById('supplierNPWP');
        const notesInput = document.getElementById('supplierNotes');
        const tbody = document.getElementById('supplierTableBody');

        function renderSuppliers() {
            if (!tbody) return;
            const sups = Storage.getSuppliers();
            tbody.innerHTML = sups.length === 0 ? '<tr><td colspan="6" class="text-center p-4 opacity-50">Belum ada supplier</td></tr>' :
            sups.map(s => `<tr class="border-t"><td class="p-2">${s.name}</td><td class="p-2">${s.contact || '-'}</td><td class="p-2">${s.address || '-'}</td><td class="p-2">${s.email || '-'}</td><td class="p-2">${s.totalPO || 0}</td><td class="p-2"><button onclick="CFS.App.deleteSupplier('${s.id}')" class="text-red-500">🗑️</button></td></tr>`).join('');
        }
        renderSuppliers();

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = nameInput?.value.trim();
            if (!name) return;
            await Storage.addSupplier({
                name,
                contact: contactInput?.value || '',
                address: addressInput?.value || '',
                email: emailInput?.value || '',
                bank: bankInput?.value || '',
                npwp: npwpInput?.value || '',
                notes: notesInput?.value || '',
                totalPO: 0
            });
            showToast('Sukses', 'Supplier ditambahkan.', 'success');
            form.reset();
            renderSuppliers();
            if (CFS.Dashboard) CFS.Dashboard.refresh();
        });
        CFS.App.deleteSupplier = async (id) => { if (confirm('Hapus supplier?')) { await Storage.deleteSupplier(id); renderSuppliers(); } };
    }

    function initProductsTabFull() {
        const form = document.getElementById('productCustomForm');
        if (!form || form.dataset.listener) return;
        form.dataset.listener = 'true';
        const nameInput = document.getElementById('newProductName');
        const categoryInput = document.getElementById('newProductCategory');
        const minStockInput = document.getElementById('newProductMinStock');
        const unitInput = document.getElementById('newProductUnit');
        const brandInput = document.getElementById('newProductBrand');
        const skuInput = document.getElementById('newProductSKU');
        const tbody = document.getElementById('productTableBody');

        function renderProducts() {
            if (!tbody) return;
            const prods = Storage.getProducts();
            tbody.innerHTML = prods.length === 0 ? '<tr><td colspan="8" class="text-center p-4 opacity-50">Belum ada produk kustom</td></tr>' :
            prods.map(p => {
                const stok = CFS.Inventory?.getStockPerProduct()?.[p.name] || 0;
                return `<tr class="border-t"><td class="p-2">${p.name}</td><td class="p-2">${p.category || '-'}</td><td class="p-2">${p.sku || '-'}</td><td class="p-2">${p.brand || '-'}</td><td class="p-2 text-right">${p.minStock || 10}</td><td class="p-2">${p.unit || 'kg'}</td><td class="p-2 text-center"><span class="${stok===0?'text-red-500':stok<(p.minStock||10)?'text-amber-500':'text-green-500'}">${stok} kg</span></td><td class="p-2 text-center"><button onclick="CFS.App.deleteProduct('${p.id}')" class="text-red-500">🗑️</button></td></tr>`;
            }).join('');
        }
        renderProducts();
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = nameInput?.value.trim();
            if (!name) return;
            await Storage.addProduct({
                name,
                category: categoryInput?.value || '',
                minStock: parseInt(minStockInput?.value) || 10,
                unit: unitInput?.value || 'kg',
                brand: brandInput?.value || '',
                sku: skuInput?.value || ''
            });
            showToast('Sukses', 'Produk baru ditambahkan.', 'success');
            form.reset();
            renderProducts();
            if (CFS.Dashboard) CFS.Dashboard.refresh();
            if (CFS.Inventory) CFS.Inventory.populateProductDropdowns();
        });
        CFS.App.deleteProduct = async (id) => { if (confirm('Hapus produk?')) { await Storage.deleteProduct(id); renderProducts(); if (CFS.Inventory) CFS.Inventory.populateProductDropdowns(); } };
    }

    function initCRMTabFull() {
        const tbody = document.getElementById('crmTableBody');
        function renderCRM() {
            if (!tbody) return;
            const custs = Storage.getCustomers(); const names = Object.keys(custs);
            if (names.length === 0) { tbody.innerHTML = '<tr><td colspan="7" class="text-center p-4 opacity-50">Belum ada pelanggan</td></tr>'; return; }
            const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            tbody.innerHTML = names.map(name => {
                const c = custs[name]; const total = c.totalSpent || 0; const trx = c.transactionCount || 0; const last = c.lastPurchase || '-';
                const status = total > 10000000 ? '🏆 Top' : (total >= 2000000 ? '⭐ Regular' : (trx === 1 ? '🆕 New' : (new Date(last) < thirtyDaysAgo ? '⚠️ Churn' : '⭐ Regular')));
                return `<tr class="border-t"><td class="p-2">${name}</td><td class="p-2 text-right">Rp ${total.toLocaleString('id-ID')}</td><td class="p-2 text-right">${trx}</td><td class="p-2 text-right">${last}</td><td class="p-2 text-center">${c.channel === 'online' ? '🌐' : '🏪'}</td><td class="p-2 text-center">${status}</td><td class="p-2 text-center"><button onclick="CFS.App.deleteCustomer('${name}')" class="text-red-500">🗑️</button></td></tr>`;
            }).join('');
        }
        renderCRM();
        document.getElementById('exportCustomersCSV')?.addEventListener('click', () => {
            const custs = Storage.getCustomers(); const csv = 'Nama,Total Pembelian,Transaksi,Terakhir\n' + Object.entries(custs).map(([n,c]) => `${n},${c.totalSpent||0},${c.transactionCount||0},${c.lastPurchase||''}`).join('\n');
            const blob = new Blob([csv],{type:'text/csv'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'pelanggan.csv'; a.click(); showToast('Sukses','CSV diunduh','success');
        });
        CFS.App.deleteCustomer = async (name) => { if (confirm('Hapus pelanggan?')) { await Storage.deleteCustomer(name); renderCRM(); } };
    }

    function initCRMDetailTabFull() {
        const form = document.getElementById('customerDetailForm');
        if (!form || form.dataset.listener) return;
        form.dataset.listener = 'true';
        const fullName = document.getElementById('customerFullName');
        const phone = document.getElementById('customerPhone');
        const email = document.getElementById('customerEmail');
        const address = document.getElementById('customerAddress');
        const ktp = document.getElementById('customerKTP');
        const npwp = document.getElementById('customerNPWP');
        const type = document.getElementById('customerType');
        const channel = document.getElementById('customerPreferredChannel');
        const notes = document.getElementById('customerNotes');
        const tbody = document.getElementById('customerDetailTableBody');

        function renderDetail() {
            if (!tbody) return;
            const custs = Storage.getCustomers(); const names = Object.keys(custs);
            tbody.innerHTML = names.length === 0 ? '<tr><td colspan="7" class="text-center p-4 opacity-50">Belum ada pelanggan</td></tr>' :
            names.map(n => { const c = custs[n]; return `<tr class="border-t"><td class="p-2">${n}</td><td class="p-2">${c.phone || '-'}</td><td class="p-2">${c.email || '-'}</td><td class="p-2">${c.ktp || '-'}</td><td class="p-2">${c.type || '-'}</td><td class="p-2">${c.preferredChannel || '-'}</td><td class="p-2"><button onclick="CFS.App.deleteCustomerDetail('${n}')" class="text-red-500">🗑️</button></td></tr>`; }).join('');
        }
        renderDetail();
        form.addEventListener('submit', async (e) => {
            e.preventDefault(); const name = fullName?.value.trim(); if (!name) return;
            await Storage.saveCustomerDetail(name, { phone: phone?.value, email: email?.value, address: address?.value, ktp: ktp?.value, npwp: npwp?.value, type: type?.value, preferredChannel: channel?.value, notes: notes?.value });
            showToast('Sukses', 'Detail pelanggan disimpan.', 'success'); form.reset(); renderDetail();
        });
        CFS.App.deleteCustomerDetail = async (name) => { if (confirm('Hapus pelanggan?')) { await Storage.deleteCustomer(name); renderDetail(); } };
    }

    function initPricingTabFull() {
        const tbody = document.getElementById('pricingTableBody');
        function renderPricing() {
            if (!tbody) return;
            const prods = Storage.getProducts().length ? Storage.getProducts().map(p=>p.name) : Storage.defaultProducts;
            const pricing = Storage.getPricing();
            tbody.innerHTML = prods.map(p => {
                const price = pricing[p] || {};
                return `<tr class="border-t"><td class="p-2">${p}</td><td class="p-2 text-right">${price.avgBuy ? 'Rp '+price.avgBuy.toLocaleString('id-ID') : '-'}</td><td class="p-2 text-right"><input type="number" id="price_offline_${p}" value="${price.offline || ''}" class="w-20 text-right" placeholder="Rp"></td><td class="p-2 text-right"><input type="number" id="price_online_${p}" value="${price.online || ''}" class="w-20 text-right" placeholder="Rp"></td><td class="p-2 text-right"><input type="number" id="price_fee_${p}" value="${price.onlineFee || ''}" class="w-16 text-right" placeholder="%"></td><td class="p-2 text-center"><button onclick="CFS.App.saveProductPricing('${p}')" class="btn btn-xs btn-primary">Simpan</button></td></tr>`;
            }).join('');
        }
        renderPricing();
        CFS.App.saveProductPricing = async (produk) => {
            const offline = parseFloat(document.getElementById(`price_offline_${produk}`)?.value) || 0;
            const online = parseFloat(document.getElementById(`price_online_${produk}`)?.value) || 0;
            const fee = parseFloat(document.getElementById(`price_fee_${produk}`)?.value) || 0;
            await Storage.savePricing(produk, { offline, online, onlineFee: fee });
            showToast('Sukses', `Harga ${produk} disimpan.`, 'success');
        };
        document.getElementById('applyDefaultPricing')?.addEventListener('click', () => {
            const prods = Storage.getProducts().length ? Storage.getProducts().map(p=>p.name) : Storage.defaultProducts;
            prods.forEach(p => {
                document.getElementById(`price_offline_${p}`)?.value = '';
                document.getElementById(`price_online_${p}`)?.value = '';
            });
            showToast('Info', 'Harga default akan dihitung otomatis.', 'info');
        });
    }

    function initDeliveryTabFull() {
        const form = document.getElementById('deliveryForm');
        if (!form || form.dataset.listener) return;
        form.dataset.listener = 'true';
        const saleSelect = document.getElementById('deliverySale');
        const courier = document.getElementById('deliveryCourier');
        const tracking = document.getElementById('deliveryTracking');
        const status = document.getElementById('deliveryStatus');
        const estimasi = document.getElementById('deliveryEstimate');
        const tglKirim = document.getElementById('deliveryTglKirim');
        const notes = document.getElementById('deliveryNotes');
        const tbody = document.getElementById('deliveryTableBody');

        function renderDeliveries() {
            if (!tbody) return;
            const deliveries = Storage.getDeliveries();
            tbody.innerHTML = deliveries.length === 0 ? '<tr><td colspan="6" class="text-center p-4 opacity-50">Belum ada pengiriman</td></tr>' :
            deliveries.map(d => { const sale = Storage.getSales().find(s=>s.id===d.saleId); return `<tr class="border-t"><td class="p-2">${d.saleId}</td><td class="p-2">${sale?.klien||'-'}</td><td class="p-2">${d.courier}</td><td class="p-2">${d.tracking||'-'}</td><td class="p-2">${d.status}</td><td class="p-2">${d.estimasi||'-'}</td></tr>`; }).join('');
        }
        renderDeliveries();
        if (saleSelect) saleSelect.innerHTML = '<option value="">Pilih Transaksi</option>' + Storage.getSales().map(s => `<option value="${s.id}">${s.tanggal} - ${s.klien} (${s.produk})</option>`).join('');
        form.addEventListener('submit', async (e) => {
            e.preventDefault(); if (!saleSelect?.value || !courier?.value) return;
            await Storage.addDelivery({ saleId: saleSelect.value, courier: courier.value, tracking: tracking?.value, status: status?.value, estimasi: estimasi?.value, tglKirim: tglKirim?.value, notes: notes?.value });
            showToast('Sukses', 'Pengiriman dicatat.', 'success'); form.reset(); renderDeliveries(); if (CFS.Dashboard) CFS.Dashboard.refresh();
        });
    }

    function initOpnameTabFull() {
        const form = document.getElementById('opnameForm');
        if (!form || form.dataset.listener) return;
        form.dataset.listener = 'true';
        const produkSelect = document.getElementById('opnameProduk');
        const fisikInput = document.getElementById('opnameFisik');
        const tglInput = document.getElementById('opnameTgl');
        const notesInput = document.getElementById('opnameNotes');
        const tbody = document.getElementById('opnameTableBody');

        function renderOpname() {
            if (!tbody) return;
            const list = Storage.getOpname();
            tbody.innerHTML = list.length === 0 ? '<tr><td colspan="6" class="text-center p-4 opacity-50">Belum ada opname</td></tr>' :
            list.map(o => { const stockSistem = (CFS.Inventory?.getStockPerProduct()||{})[o.produk]||0; return `<tr class="border-t"><td class="p-2">${o.tanggal}</td><td class="p-2">${o.produk}</td><td class="p-2">${o.sistem||stockSistem} kg</td><td class="p-2">${o.fisik} kg</td><td class="p-2 ${o.selisih<0?'text-red-600':'text-green-600'}">${o.selisih} kg</td><td class="p-2">${o.catatan||''}</td></tr>`; }).join('');
        }
        renderOpname();
        if (produkSelect) produkSelect.innerHTML = '<option value="">Pilih Produk</option>' + (Storage.getProducts().length ? Storage.getProducts().map(p=>`<option>${p.name}</option>`).join('') : Storage.defaultProducts.map(p=>`<option>${p}</option>`).join(''));
        form.addEventListener('submit', async (e) => {
            e.preventDefault(); const produk = produkSelect?.value; const fisik = parseFloat(fisikInput?.value); const tanggal = tglInput?.value;
            if (!produk || isNaN(fisik) || !tanggal) return;
            const sistem = CFS.Inventory?.getStockPerProduct()?.[produk]||0;
            await Storage.addOpname({ produk, sistem, fisik, selisih: fisik-sistem, tanggal, catatan: notesInput?.value || '' });
            showToast('Sukses', 'Stock opname disimpan.', 'success'); form.reset(); renderOpname();
        });
    }

    function initReturnTabFull() {
        const form = document.getElementById('returnForm');
        if (!form || form.dataset.listener) return;
        form.dataset.listener = 'true';
        const saleSelect = document.getElementById('returnSale');
        const qtyInput = document.getElementById('returnQty');
        const alasanInput = document.getElementById('returnAlasan');
        const tbody = document.getElementById('returnTableBody');

        function renderReturns() {
            if (!tbody) return;
            const list = Storage.getReturns();
            tbody.innerHTML = list.length === 0 ? '<tr><td colspan="5" class="text-center p-4 opacity-50">Belum ada retur</td></tr>' :
            list.map(r => { const sale = Storage.getSales().find(s=>s.id===r.saleId); return `<tr class="border-t"><td class="p-2">${r.tanggal||'-'}</td><td class="p-2">${sale?.klien||'-'}</td><td class="p-2">${sale?.produk||'-'}</td><td class="p-2">${r.qty} kg</td><td class="p-2">${r.alasan}</td></tr>`; }).join('');
        }
        renderReturns();
        if (saleSelect) saleSelect.innerHTML = '<option value="">Pilih Transaksi</option>' + Storage.getSales().map(s => `<option value="${s.id}">${s.tanggal} - ${s.klien} (${s.produk} ${s.qty}kg)</option>`).join('');
        form.addEventListener('submit', async (e) => {
            e.preventDefault(); const saleId = saleSelect?.value; const qty = parseFloat(qtyInput?.value); const alasan = alasanInput?.value.trim();
            if (!saleId || !qty || !alasan) return;
            const sale = Storage.getSales().find(s=>s.id===saleId); if (!sale) return;
            await Storage.addReturn({ saleId, qty, alasan, tanggal: new Date().toISOString().split('T')[0], produk: sale.produk, batchUsed: sale.batchUsed });
            showToast('Sukses', 'Retur diproses.', 'success'); form.reset(); renderReturns(); if (CFS.Dashboard) CFS.Dashboard.refresh();
        });
    }

    function initHistoryTabFull() {
        const tbody = document.getElementById('historyTableBody');
        const form = document.getElementById('filterTransaksi');
        function renderHistory(filter = {}) {
            if (!tbody) return;
            let sales = Storage.getSales();
            if (filter.produk) sales = sales.filter(s => s.produk === filter.produk);
            if (filter.klien) sales = sales.filter(s => s.klien.toLowerCase().includes(filter.klien.toLowerCase()));
            if (filter.start) sales = sales.filter(s => s.tanggal >= filter.start);
            if (filter.end) sales = sales.filter(s => s.tanggal <= filter.end);
            if (filter.channel) sales = sales.filter(s => s.channel === filter.channel);
            tbody.innerHTML = sales.length === 0 ? '<tr><td colspan="8" class="text-center p-4 opacity-50">Tidak ada transaksi</td></tr>' :
            sales.map(s => `<tr class="border-t"><td class="p-2">${s.tanggal}</td><td class="p-2">${s.klien}</td><td class="p-2">${s.produk}</td><td class="p-2 text-right">${s.qty} kg</td><td class="p-2 text-right">Rp ${(s.qty*s.hargaJual - (s.diskon||0)).toLocaleString('id-ID')}</td><td class="p-2 text-center">${s.channel==='online'?'🌐':'🏪'}</td><td class="p-2 text-center">${s.tier}</td><td class="p-2 text-center"><button onclick="CFS.App.deleteSale('${s.id}')" class="text-red-500">🗑️</button></td></tr>`).join('');
            const totalTrx = document.getElementById('historyTotalTrx');
            const totalRev = document.getElementById('historyTotalRevenue');
            if (totalTrx) totalTrx.textContent = sales.length;
            if (totalRev) totalRev.textContent = 'Rp ' + sales.reduce((a,s) => a + (s.qty*s.hargaJual - (s.diskon||0)), 0).toLocaleString('id-ID');
        }
        if (form) form.addEventListener('submit', (e) => { e.preventDefault(); renderHistory({ produk: document.getElementById('filterProduk')?.value, klien: document.getElementById('filterKlien')?.value, start: document.getElementById('filterStart')?.value, end: document.getElementById('filterEnd')?.value, channel: document.getElementById('filterChannel')?.value }); });
        renderHistory();
        CFS.App.deleteSale = async (id) => { if (confirm('Hapus transaksi?')) { await Storage.deleteSale(id); renderHistory(); if (CFS.Dashboard) CFS.Dashboard.refresh(); } };
        document.getElementById('clearAllHistoryBtn')?.addEventListener('click', async () => { if (confirm('Hapus SEMUA riwayat?')) { for (const s of Storage.getSales()) await Storage.deleteSale(s.id); renderHistory(); showToast('Sukses', 'Semua riwayat dihapus.', 'success'); } });
    }

    function initAuditTabFull() {
        const tbody = document.getElementById('auditTrailTableBody');
        function renderAudit() {
            if (!tbody) return;
            const trail = Storage.getAuditTrail();
            tbody.innerHTML = trail.length === 0 ? '<tr><td colspan="3" class="text-center p-4 opacity-50">Belum ada log.</td></tr>' :
            trail.map(t => `<tr class="border-t text-sm"><td class="p-2">${new Date(t.waktu).toLocaleString('id-ID')}</td><td class="p-2">${t.aksi}</td><td class="p-2">${t.detail}</td></tr>`).join('');
        }
        renderAudit();
    }

    function initReportsTabFull() {
        if (CFS.Reports && CFS.Reports.init) { CFS.Reports.init(); return; }
        const reportStok = document.getElementById('reportStok');
        if (reportStok) {
            const map = CFS.Inventory?.getStockPerProduct() || {};
            const prods = Storage.getProducts().length ? Storage.getProducts().map(p=>p.name) : Storage.defaultProducts;
            reportStok.innerHTML = prods.map(p => `<p>${p}: <strong>${map[p]||0} kg</strong></p>`).join('');
        }
    }

    function initNotificationsTabFull() {
        const container = document.getElementById('notificationList');
        if (container) {
            const trail = Storage.getAuditTrail().slice(0, 20);
            container.innerHTML = trail.length === 0 ? '<p class="opacity-50">Tidak ada notifikasi.</p>' :
            trail.map(t => `<div class="card p-3 flex items-center gap-3 bg-slate-50"><i class="ph ph-info text-blue-500"></i><div><strong class="text-sm">${t.aksi}</strong><p class="text-xs opacity-70">${t.detail}</p></div></div>`).join('');
        }
    }

    // --------------- GLOBAL ACTIONS (INITIALIZATION) ---------------
CFS.App = {};
CFS.App.backupData = backupData;
CFS.App.restorePrompt = restorePrompt;
CFS.App.showToast = showToast;
CFS.App.switchTab = switchTab;
CFS.App.acceptPO = function(id) {};
CFS.App.deleteSupplier = function(id) {};
CFS.App.deleteProduct = function(id) {};
CFS.App.deleteCustomer = function(name) {};
CFS.App.saveProductPricing = function(produk) {};
CFS.App.deleteSale = function(id) {};
CFS.App.deleteCustomerDetail = function(name) {};

    // --------------- INIT ---------------
    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            if (localStorage.getItem('cfs_dark') === '1') {
                document.documentElement.classList.add('dark');
                const darkIcon = document.getElementById('darkIcon');
                if (darkIcon) darkIcon.className = 'ph ph-sun text-lg text-yellow-400';
                document.getElementById('sidebar-mode').textContent = 'Gelap';
            }
            switchTab('tab-dashboard');
            setInterval(() => {
                const el = document.getElementById('lastUpdate');
                if (el) el.textContent = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                const sysEl = document.getElementById('systemDateTime');
                if (sysEl) sysEl.textContent = new Date().toLocaleString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit' });
            }, 1000);
            document.addEventListener('keydown', function(e) {
                if (e.ctrlKey && e.key === 'd') { e.preventDefault(); switchTab('tab-dashboard'); }
                if (e.ctrlKey && e.key === 's') { e.preventDefault(); switchTab('tab-stock'); }
                if (e.ctrlKey && e.key === 'b') { e.preventDefault(); backupData(); }
            });
        }, 200);
    });

})();
