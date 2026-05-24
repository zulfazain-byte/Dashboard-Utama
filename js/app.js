/* ============================================================
   Cibitung Frozen ERP Ultimate v5.4 — Main Application (FINAL)
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

    function showToast(title, msg, type) {
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
        setTimeout(function() { toast.classList.remove('show'); }, 3000);
    }
    window.showToast = showToast;

    // --------------- SWITCH TAB (GLOBAL) ---------------
    function switchTab(tabId) {
        document.querySelectorAll('.tab-content').forEach(function(tc) { tc.classList.remove('active'); });
        document.querySelectorAll('.tab-btn').forEach(function(btn) {
            btn.classList.remove('active', 'bg-primary-50', 'text-primary-700', 'font-semibold');
            btn.classList.add('opacity-70');
        });

        const target = document.getElementById(tabId);
        if (target) target.classList.add('active');

        const activeBtn = document.querySelector('.tab-btn[data-tab="' + tabId + '"]');
        if (activeBtn) {
            activeBtn.classList.add('active', 'bg-primary-50', 'text-primary-700', 'font-semibold');
            activeBtn.classList.remove('opacity-70');
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
                else initPurchaseFallback();
                break;
            case 'tab-supplier':
                if (CFS.Supplier && CFS.Supplier.init) CFS.Supplier.init();
                else initSupplierFallback();
                break;
            case 'tab-products':
                if (CFS.Products && CFS.Products.init) CFS.Products.init();
                else initProductsFallback();
                break;
            case 'tab-crm':
                if (CFS.CRM && CFS.CRM.init) CFS.CRM.init();
                else initCRMFallback();
                break;
            case 'tab-crm-detail':
                if (CFS.CRMDetail && CFS.CRMDetail.init) CFS.CRMDetail.init();
                else initCRMDetailFallback();
                break;
            case 'tab-pricing':
                if (CFS.Pricing && CFS.Pricing.init) CFS.Pricing.init();
                else initPricingFallback();
                break;
            case 'tab-finance':
                if (CFS.Accounting) {
                    if (!modulesInitialized.finance) { CFS.Accounting.init(); modulesInitialized.finance = true; }
                    else CFS.Accounting.refreshFinanceSummary();
                }
                break;
            case 'tab-delivery':
                if (CFS.Delivery && CFS.Delivery.init) CFS.Delivery.init();
                else initDeliveryFallback();
                break;
            case 'tab-opname':
                if (CFS.Opname && CFS.Opname.init) CFS.Opname.init();
                else initOpnameFallback();
                break;
            case 'tab-return':
                if (CFS.Return && CFS.Return.init) CFS.Return.init();
                else initReturnFallback();
                break;
            case 'tab-history':
                if (CFS.History && CFS.History.init) CFS.History.init();
                else initHistoryFallback();
                break;
            case 'tab-audit':
                if (CFS.Audit && CFS.Audit.init) CFS.Audit.init();
                else initAuditFallback();
                break;
            case 'tab-reports':
                if (CFS.Reports && CFS.Reports.init) CFS.Reports.init();
                else initReportsFallback();
                break;
            case 'tab-notifications':
                if (CFS.Notifications && CFS.Notifications.init) CFS.Notifications.init();
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
        a.download = 'cibitung_frozen_backup_' + new Date().toISOString().slice(0,10) + '.json';
        a.click();
        showToast('Backup', 'Data berhasil diunduh.', 'success');
        Storage.addAudit('BACKUP', 'Data dibackup manual');
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
                showToast('Restore', 'Data berhasil dipulihkan.', 'success');
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

    // ==================== FALLBACK FUNCTIONS ====================
    function initPurchaseFallback() {
        const form = document.getElementById('purchaseForm');
        if (!form || form.dataset.listener) return;
        form.dataset.listener = 'true';
        const supplierSelect = document.getElementById('purchaseSupplier');
        const produkSelect = document.getElementById('purchaseProduk');
        const qtyInput = document.getElementById('purchaseQty');
        const hargaInput = document.getElementById('purchaseHarga');
        const tglInput = document.getElementById('purchaseTgl');
        const tbody = document.getElementById('purchaseTableBody');

        function populateSuppliers() {
            const sups = Storage.getSuppliers();
            if (supplierSelect) supplierSelect.innerHTML = '<option value="">Pilih Supplier</option>' + sups.map(function(s) { return '<option value="' + s.id + '">' + s.name + '</option>'; }).join('');
        }
        function populateProducts() {
            const prods = Storage.getProducts().length ? Storage.getProducts().map(function(p) { return p.name; }) : Storage.defaultProducts;
            if (produkSelect) produkSelect.innerHTML = '<option value="">Pilih Produk</option>' + prods.map(function(p) { return '<option>' + p + '</option>'; }).join('');
        }
        function renderPOList() {
            if (!tbody) return;
            const pos = Storage.getBatches().filter(function(b) { return b.supplier && b.used === 0; });
            tbody.innerHTML = pos.length === 0 ? '<tr><td colspan="7" class="text-center p-4 opacity-50">Belum ada PO</td></tr>' :
            pos.map(function(b) {
                const sup = Storage.getSuppliers().find(function(s) { return s.id === b.supplier; });
                return '<tr class="border-t"><td class="p-2">' + b.tglProduksi + '</td><td class="p-2">' + (sup ? sup.name : '-') + '</td><td class="p-2">' + b.produk + '</td><td class="p-2 text-right">' + b.berat + ' kg</td><td class="p-2 text-right">Rp ' + (b.berat * b.hargaBeli).toLocaleString('id-ID') + '</td><td class="p-2 text-center"><span class="badge bg-blue-100 text-blue-700">Draft</span></td><td class="p-2 text-center"><button class="btn btn-xs btn-success" onclick="CFS.App.acceptPO(\'' + b.id + '\')">✅</button></td></tr>';
            }).join('');
        }
        populateSuppliers();
        populateProducts();
        renderPOList();

        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            const supplierId = supplierSelect.value;
            const produk = produkSelect.value;
            const qty = parseFloat(qtyInput.value);
            const harga = parseFloat(hargaInput.value);
            const tanggal = tglInput.value;
            if (!supplierId || !produk || !qty || !harga || !tanggal) { showToast('Error', 'Lengkapi data pembelian.', 'error'); return; }
            const newBatch = {
                id: 'b' + Date.now(), produk: produk, berat: qty, hargaBeli: harga,
                ongkir: 0, bensin: 0, bongkar: 0, pajakType: 'none', pajakValue: 0,
                tglProduksi: tanggal,
                tglKadaluarsa: new Date(new Date(tanggal).getTime() + 90*24*60*60*1000).toISOString().split('T')[0],
                used: 0, supplier: supplierId, warehouse: 'gudang_utama'
            };
            await Storage.addBatch(newBatch);
            showToast('Sukses', 'Purchase Order dibuat dan batch ditambahkan.', 'success');
            form.reset();
            renderPOList();
            if (CFS.Dashboard) CFS.Dashboard.refresh();
        });
        CFS.App.acceptPO = async function(batchId) {
            const batch = Storage.getBatches().find(function(b) { return b.id === batchId; });
            if (!batch) return;
            showToast('Sukses', 'PO diterima.', 'success');
            renderPOList();
        };
    }

    function initSupplierFallback() {
        const form = document.getElementById('supplierForm');
        if (!form || form.dataset.listener) return;
        form.dataset.listener = 'true';
        const nameInput = document.getElementById('supplierName');
        const contactInput = document.getElementById('supplierContact');
        const addressInput = document.getElementById('supplierAddress');
        const emailInput = document.getElementById('supplierEmail');
        const bankInput = document.getElementById('supplierBank');
        const tbody = document.getElementById('supplierTableBody');

        function renderSuppliers() {
            if (!tbody) return;
            const sups = Storage.getSuppliers();
            tbody.innerHTML = sups.length === 0 ? '<tr><td colspan="6" class="text-center p-4 opacity-50">Belum ada supplier</td></tr>' :
            sups.map(function(s) {
                return '<tr class="border-t"><td class="p-2">' + s.name + '</td><td class="p-2">' + (s.contact || '-') + '</td><td class="p-2">' + (s.address || '-') + '</td><td class="p-2">' + (s.email || '-') + '</td><td class="p-2">' + (s.totalPO || 0) + '</td><td class="p-2"><button onclick="CFS.App.deleteSupplier(\'' + s.id + '\')" class="text-red-500">🗑️</button></td></tr>';
            }).join('');
        }
        renderSuppliers();

        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            const name = nameInput ? nameInput.value.trim() : '';
            if (!name) return;
            await Storage.addSupplier({
                name: name,
                contact: contactInput ? contactInput.value : '',
                address: addressInput ? addressInput.value : '',
                email: emailInput ? emailInput.value : '',
                bank: bankInput ? bankInput.value : '',
                totalPO: 0
            });
            showToast('Sukses', 'Supplier ditambahkan.', 'success');
            form.reset();
            renderSuppliers();
            if (CFS.Dashboard) CFS.Dashboard.refresh();
        });
        CFS.App.deleteSupplier = async function(id) {
            if (confirm('Hapus supplier?')) {
                await Storage.deleteSupplier(id);
                renderSuppliers();
            }
        };
    }

    function initProductsFallback() {
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
            tbody.innerHTML = prods.length === 0 ? '<tr><td colspan="6" class="text-center p-4 opacity-50">Belum ada produk kustom</td></tr>' :
            prods.map(function(p) {
                return '<tr class="border-t"><td class="p-2">' + p.name + '</td><td class="p-2">' + (p.category || '-') + '</td><td class="p-2">' + (p.sku || '-') + '</td><td class="p-2">' + (p.minStock || 10) + ' kg</td><td class="p-2">' + (p.unit || 'kg') + '</td><td class="p-2"><button onclick="CFS.App.deleteProduct(\'' + p.id + '\')" class="text-red-500">🗑️</button></td></tr>';
            }).join('');
        }
        renderProducts();
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            const name = nameInput ? nameInput.value.trim() : '';
            if (!name) return;
            await Storage.addProduct({
                name: name,
                category: categoryInput ? categoryInput.value : '',
                minStock: parseInt(minStockInput ? minStockInput.value : 10) || 10,
                unit: unitInput ? unitInput.value : 'kg',
                brand: brandInput ? brandInput.value : '',
                sku: skuInput ? skuInput.value : ''
            });
            showToast('Sukses', 'Produk baru ditambahkan.', 'success');
            form.reset();
            renderProducts();
            if (CFS.Dashboard) CFS.Dashboard.refresh();
            if (CFS.Inventory) CFS.Inventory.populateProductDropdowns();
        });
        CFS.App.deleteProduct = async function(id) {
            if (confirm('Hapus produk?')) {
                await Storage.deleteProduct(id);
                renderProducts();
                if (CFS.Inventory) CFS.Inventory.populateProductDropdowns();
            }
        };
    }

    function initCRMFallback() {
        const tbody = document.getElementById('crmTableBody');
        function renderCRM() {
            if (!tbody) return;
            const custs = Storage.getCustomers();
            const names = Object.keys(custs);
            if (names.length === 0) { tbody.innerHTML = '<tr><td colspan="7" class="text-center p-4 opacity-50">Belum ada pelanggan</td></tr>'; return; }
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            tbody.innerHTML = names.map(function(name) {
                const c = custs[name];
                const total = c.totalSpent || 0;
                const trx = c.transactionCount || 0;
                const last = c.lastPurchase || '-';
                const status = total > 10000000 ? '🏆 Top' : (total >= 2000000 ? '⭐ Regular' : (trx === 1 ? '🆕 New' : (new Date(last) < thirtyDaysAgo ? '⚠️ Churn' : '⭐ Regular')));
                return '<tr class="border-t"><td class="p-2">' + name + '</td><td class="p-2 text-right">Rp ' + total.toLocaleString('id-ID') + '</td><td class="p-2 text-right">' + trx + '</td><td class="p-2 text-right">' + last + '</td><td class="p-2 text-center">' + (c.channel === 'online' ? '🌐' : '🏪') + '</td><td class="p-2 text-center">' + status + '</td><td class="p-2 text-center"><button onclick="CFS.App.deleteCustomer(\'' + name + '\')" class="text-red-500">🗑️</button></td></tr>';
            }).join('');
        }
        renderCRM();
        document.getElementById('exportCustomersCSV')?.addEventListener('click', function() {
            const custs = Storage.getCustomers();
            const csv = 'Nama,Total Pembelian,Transaksi,Terakhir\n' + Object.entries(custs).map(function(entry) { const n = entry[0]; const c = entry[1]; return n + ',' + (c.totalSpent||0) + ',' + (c.transactionCount||0) + ',' + (c.lastPurchase||''); }).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'pelanggan.csv';
            a.click();
            showToast('Sukses', 'CSV diunduh', 'success');
        });
        CFS.App.deleteCustomer = async function(name) {
            if (confirm('Hapus pelanggan?')) { await Storage.deleteCustomer(name); renderCRM(); }
        };
    }

    function initCRMDetailFallback() {
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
            const custs = Storage.getCustomers();
            const names = Object.keys(custs);
            tbody.innerHTML = names.length === 0 ? '<tr><td colspan="7" class="text-center p-4 opacity-50">Belum ada pelanggan</td></tr>' :
            names.map(function(n) {
                const c = custs[n];
                return '<tr class="border-t"><td class="p-2">' + n + '</td><td class="p-2">' + (c.phone || '-') + '</td><td class="p-2">' + (c.email || '-') + '</td><td class="p-2">' + (c.ktp || '-') + '</td><td class="p-2">' + (c.type || '-') + '</td><td class="p-2">' + (c.preferredChannel || '-') + '</td><td class="p-2"><button onclick="CFS.App.deleteCustomerDetail(\'' + n + '\')" class="text-red-500">🗑️</button></td></tr>';
            }).join('');
        }
        renderDetail();
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            const name = fullName ? fullName.value.trim() : '';
            if (!name) return;
            await Storage.saveCustomerDetail(name, {
                phone: phone ? phone.value : '',
                email: email ? email.value : '',
                address: address ? address.value : '',
                ktp: ktp ? ktp.value : '',
                npwp: npwp ? npwp.value : '',
                type: type ? type.value : '',
                preferredChannel: channel ? channel.value : '',
                notes: notes ? notes.value : ''
            });
            showToast('Sukses', 'Detail pelanggan disimpan.', 'success');
            form.reset();
            renderDetail();
        });
        CFS.App.deleteCustomerDetail = async function(name) {
            if (confirm('Hapus pelanggan?')) { await Storage.deleteCustomer(name); renderDetail(); }
        };
    }

    function initPricingFallback() {
        const tbody = document.getElementById('pricingTableBody');
        function renderPricing() {
            if (!tbody) return;
            const prods = Storage.getProducts().length ? Storage.getProducts().map(function(p) { return p.name; }) : Storage.defaultProducts;
            const pricing = Storage.getPricing();
            tbody.innerHTML = prods.map(function(p) {
                const price = pricing[p] || {};
                return '<tr class="border-t"><td class="p-2">' + p + '</td><td class="p-2 text-right">' + (price.avgBuy ? 'Rp ' + price.avgBuy.toLocaleString('id-ID') : '-') + '</td><td class="p-2 text-right"><input type="number" id="price_offline_' + p + '" value="' + (price.offline || '') + '" class="w-20 text-right" placeholder="Rp"></td><td class="p-2 text-right"><input type="number" id="price_online_' + p + '" value="' + (price.online || '') + '" class="w-20 text-right" placeholder="Rp"></td><td class="p-2 text-right"><input type="number" id="price_fee_' + p + '" value="' + (price.onlineFee || '') + '" class="w-16 text-right" placeholder="%"></td><td class="p-2 text-center"><button onclick="CFS.App.saveProductPricing(\'' + p + '\')" class="btn btn-xs btn-primary">Simpan</button></td></tr>';
            }).join('');
        }
        renderPricing();
        CFS.App.saveProductPricing = async function(produk) {
            const offline = parseFloat(document.getElementById('price_offline_' + produk)?.value) || 0;
            const online = parseFloat(document.getElementById('price_online_' + produk)?.value) || 0;
            const fee = parseFloat(document.getElementById('price_fee_' + produk)?.value) || 0;
            await Storage.savePricing(produk, { offline: offline, online: online, onlineFee: fee });
            showToast('Sukses', 'Harga ' + produk + ' disimpan.', 'success');
        };
        document.getElementById('applyDefaultPricing')?.addEventListener('click', function() {
            const prods = Storage.getProducts().length ? Storage.getProducts().map(function(p) { return p.name; }) : Storage.defaultProducts;
            prods.forEach(function(p) {
                const el = document.getElementById('price_offline_' + p);
                if (el) el.value = '';
                const el2 = document.getElementById('price_online_' + p);
                if (el2) el2.value = '';
            });
            showToast('Info', 'Harga default akan dihitung otomatis.', 'info');
        });
    }

    function initDeliveryFallback() {
        const form = document.getElementById('deliveryForm');
        if (!form || form.dataset.listener) return;
        form.dataset.listener = 'true';
        const saleSelect = document.getElementById('deliverySale');
        const courier = document.getElementById('deliveryCourier');
        const tracking = document.getElementById('deliveryTracking');
        const status = document.getElementById('deliveryStatus');
        const estimasi = document.getElementById('deliveryEstimate');
        const tbody = document.getElementById('deliveryTableBody');

        function renderDeliveries() {
            if (!tbody) return;
            const deliveries = Storage.getDeliveries();
            tbody.innerHTML = deliveries.length === 0 ? '<tr><td colspan="6" class="text-center p-4 opacity-50">Belum ada pengiriman</td></tr>' :
            deliveries.map(function(d) {
                const sale = Storage.getSales().find(function(s) { return s.id === d.saleId; });
                return '<tr class="border-t"><td class="p-2">' + d.saleId + '</td><td class="p-2">' + (sale ? sale.klien : '-') + '</td><td class="p-2">' + d.courier + '</td><td class="p-2">' + (d.tracking || '-') + '</td><td class="p-2">' + d.status + '</td><td class="p-2">' + (d.estimasi || '-') + '</td></tr>';
            }).join('');
        }
        renderDeliveries();
        if (saleSelect) saleSelect.innerHTML = '<option value="">Pilih Transaksi</option>' + Storage.getSales().map(function(s) { return '<option value="' + s.id + '">' + s.tanggal + ' - ' + s.klien + ' (' + s.produk + ')</option>'; }).join('');
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            if (!saleSelect?.value || !courier?.value) return;
            await Storage.addDelivery({ saleId: saleSelect.value, courier: courier.value, tracking: tracking?.value, status: status?.value, estimasi: estimasi?.value });
            showToast('Sukses', 'Pengiriman dicatat.', 'success');
            form.reset();
            renderDeliveries();
            if (CFS.Dashboard) CFS.Dashboard.refresh();
        });
    }

    function initOpnameFallback() {
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
            list.map(function(o) {
                const stockSistem = (CFS.Inventory?.getStockPerProduct() || {})[o.produk] || 0;
                return '<tr class="border-t"><td class="p-2">' + o.tanggal + '</td><td class="p-2">' + o.produk + '</td><td class="p-2">' + (o.sistem || stockSistem) + ' kg</td><td class="p-2">' + o.fisik + ' kg</td><td class="p-2 ' + (o.selisih < 0 ? 'text-red-600' : 'text-green-600') + '">' + o.selisih + ' kg</td><td class="p-2">' + (o.catatan || '') + '</td></tr>';
            }).join('');
        }
        renderOpname();
        if (produkSelect) produkSelect.innerHTML = '<option value="">Pilih Produk</option>' + (Storage.getProducts().length ? Storage.getProducts().map(function(p) { return '<option>' + p.name + '</option>'; }).join('') : Storage.defaultProducts.map(function(p) { return '<option>' + p + '</option>'; }).join(''));
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            const produk = produkSelect?.value;
            const fisik = parseFloat(fisikInput?.value);
            const tanggal = tglInput?.value;
            if (!produk || isNaN(fisik) || !tanggal) return;
            const sistem = CFS.Inventory?.getStockPerProduct()?.[produk] || 0;
            await Storage.addOpname({ produk: produk, sistem: sistem, fisik: fisik, selisih: fisik - sistem, tanggal: tanggal, catatan: notesInput?.value || '' });
            showToast('Sukses', 'Stock opname disimpan.', 'success');
            form.reset();
            renderOpname();
        });
    }

    function initReturnFallback() {
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
            list.map(function(r) {
                const sale = Storage.getSales().find(function(s) { return s.id === r.saleId; });
                return '<tr class="border-t"><td class="p-2">' + (r.tanggal || '-') + '</td><td class="p-2">' + (sale ? sale.klien : '-') + '</td><td class="p-2">' + (sale ? sale.produk : '-') + '</td><td class="p-2">' + r.qty + ' kg</td><td class="p-2">' + r.alasan + '</td></tr>';
            }).join('');
        }
        renderReturns();
        if (saleSelect) saleSelect.innerHTML = '<option value="">Pilih Transaksi</option>' + Storage.getSales().map(function(s) { return '<option value="' + s.id + '">' + s.tanggal + ' - ' + s.klien + ' (' + s.produk + ' ' + s.qty + 'kg)</option>'; }).join('');
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            const saleId = saleSelect?.value;
            const qty = parseFloat(qtyInput?.value);
            const alasan = alasanInput?.value.trim();
            if (!saleId || !qty || !alasan) return;
            const sale = Storage.getSales().find(function(s) { return s.id === saleId; });
            if (!sale) return;
            await Storage.addReturn({ saleId: saleId, qty: qty, alasan: alasan, tanggal: new Date().toISOString().split('T')[0], produk: sale.produk, batchUsed: sale.batchUsed });
            showToast('Sukses', 'Retur diproses.', 'success');
            form.reset();
            renderReturns();
            if (CFS.Dashboard) CFS.Dashboard.refresh();
        });
    }

    function initHistoryFallback() {
        const tbody = document.getElementById('historyTableBody');
        const form = document.getElementById('filterTransaksi');
        function renderHistory(filter) {
            if (!tbody) return;
            let sales = Storage.getSales();
            if (filter) {
                if (filter.produk) sales = sales.filter(function(s) { return s.produk === filter.produk; });
                if (filter.klien) sales = sales.filter(function(s) { return s.klien.toLowerCase().indexOf(filter.klien.toLowerCase()) !== -1; });
                if (filter.start) sales = sales.filter(function(s) { return s.tanggal >= filter.start; });
                if (filter.end) sales = sales.filter(function(s) { return s.tanggal <= filter.end; });
                if (filter.channel) sales = sales.filter(function(s) { return s.channel === filter.channel; });
            }
            tbody.innerHTML = sales.length === 0 ? '<tr><td colspan="8" class="text-center p-4 opacity-50">Tidak ada transaksi</td></tr>' :
            sales.map(function(s) {
                const total = (s.qty * s.hargaJual) - (s.diskon || 0);
                return '<tr class="border-t"><td class="p-2">' + s.tanggal + '</td><td class="p-2">' + s.klien + '</td><td class="p-2">' + s.produk + '</td><td class="p-2 text-right">' + s.qty + ' kg</td><td class="p-2 text-right">Rp ' + total.toLocaleString('id-ID') + '</td><td class="p-2 text-center">' + (s.channel === 'online' ? '🌐' : '🏪') + '</td><td class="p-2 text-center">' + s.tier + '</td><td class="p-2 text-center"><button onclick="CFS.App.deleteSale(\'' + s.id + '\')" class="text-red-500">🗑️</button></td></tr>';
            }).join('');
            const totalTrx = document.getElementById('historyTotalTrx');
            const totalRev = document.getElementById('historyTotalRevenue');
            if (totalTrx) totalTrx.textContent = sales.length;
            if (totalRev) totalRev.textContent = 'Rp ' + sales.reduce(function(a, s) { return a + ((s.qty * s.hargaJual) - (s.diskon || 0)); }, 0).toLocaleString('id-ID');
        }
        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                renderHistory({
                    produk: document.getElementById('filterProduk')?.value,
                    klien: document.getElementById('filterKlien')?.value,
                    start: document.getElementById('filterStart')?.value,
                    end: document.getElementById('filterEnd')?.value,
                    channel: document.getElementById('filterChannel')?.value
                });
            });
        }
        renderHistory();
        CFS.App.deleteSale = async function(id) {
            if (confirm('Hapus transaksi?')) {
                await Storage.deleteSale(id);
                renderHistory();
                if (CFS.Dashboard) CFS.Dashboard.refresh();
            }
        };
        document.getElementById('clearAllHistoryBtn')?.addEventListener('click', async function() {
            if (confirm('Hapus SEMUA riwayat?')) {
                const allSales = Storage.getSales();
                for (let i = 0; i < allSales.length; i++) {
                    await Storage.deleteSale(allSales[i].id);
                }
                renderHistory();
                showToast('Sukses', 'Semua riwayat dihapus.', 'success');
            }
        });
    }

    function initAuditFallback() {
        const tbody = document.getElementById('auditTrailTableBody');
        function renderAudit() {
            if (!tbody) return;
            const trail = Storage.getAuditTrail();
            tbody.innerHTML = trail.length === 0 ? '<tr><td colspan="3" class="text-center p-4 opacity-50">Belum ada log.</td></tr>' :
            trail.map(function(t) { return '<tr class="border-t text-sm"><td class="p-2">' + new Date(t.waktu).toLocaleString('id-ID') + '</td><td class="p-2">' + t.aksi + '</td><td class="p-2">' + t.detail + '</td></tr>'; }).join('');
        }
        renderAudit();
    }

    function initReportsFallback() {
        if (CFS.Reports && CFS.Reports.init) { CFS.Reports.init(); return; }
        const reportStok = document.getElementById('reportStok');
        if (reportStok) {
            const map = CFS.Inventory?.getStockPerProduct() || {};
            const prods = Storage.getProducts().length ? Storage.getProducts().map(function(p) { return p.name; }) : Storage.defaultProducts;
            reportStok.innerHTML = prods.map(function(p) { return '<p>' + p + ': <strong>' + (map[p] || 0) + ' kg</strong></p>'; }).join('');
        }
    }

    // --------------- CFS.App GLOBAL ---------------
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
    window.addEventListener('DOMContentLoaded', function() {
        setTimeout(function() {
            if (localStorage.getItem('cfs_dark') === '1') {
                document.documentElement.classList.add('dark');
                var darkIcon = document.getElementById('darkIcon');
                if (darkIcon) darkIcon.className = 'ph ph-sun text-lg text-yellow-400';
                var sidebarMode = document.getElementById('sidebar-mode');
                if (sidebarMode) sidebarMode.textContent = 'Gelap';
            }
            switchTab('tab-dashboard');
            setInterval(function() {
                var el = document.getElementById('lastUpdate');
                if (el) el.textContent = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                var sysEl = document.getElementById('systemDateTime');
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
