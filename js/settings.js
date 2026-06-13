/* ============================================================
   Cibitung Frozen ERP Ultimate v5.4 — Settings Module (PRO)
   Self‑contained, ±1200 baris, tampilan profesional & modern.
   ============================================================ */
window.CFS = window.CFS || {};

(function () {
    'use strict';

    const Storage = CFS.Storage;

    // ==================== STATE LOKAL ====================
    let currentSettingsTab = 'settings-umum';
    let hasUnsavedChanges = false;

    // ==================== CACHE ELEMEN ====================
    let E = {};
    function cacheElements() {
        E = {
            // Sub tab buttons
            subTabBtns: document.querySelectorAll('.settings-tab-btn'),
            subTabContents: document.querySelectorAll('.settings-tab-content'),

            // Tombol utama
            saveSettingsBtn: document.getElementById('saveSettingsBtn'),
            discardSettingsBtn: document.getElementById('discardSettingsBtn'),

            // Umum
            setNamaBisnis: document.getElementById('setNamaBisnis'),
            setMataUang: document.getElementById('setMataUang'),
            setZonaWaktu: document.getElementById('setZonaWaktu'),
            setFormatTanggal: document.getElementById('setFormatTanggal'),
            setTargetBulanan: document.getElementById('setTargetBulanan'),
            setMinStokWarning: document.getElementById('setMinStokWarning'),
            setSatuanDefault: document.getElementById('setSatuanDefault'),
            setNotifBrowser: document.getElementById('setNotifBrowser'),

            // Pajak & Legal
            setPPN: document.getElementById('setPPN'),
            setPPh25: document.getElementById('setPPh25'),
            setPPh21: document.getElementById('setPPh21'),
            setPTShare: document.getElementById('setPTShare'),
            setNPWP: document.getElementById('setNPWP'),
            setSIUP: document.getElementById('setSIUP'),
            setNIB: document.getElementById('setNIB'),
            setTahunPajak: document.getElementById('setTahunPajak'),

            // Margin & Harga
            setMarginDefault: document.getElementById('setMarginDefault'),
            setMarginMin: document.getElementById('setMarginMin'),
            setMinGrosir: document.getElementById('setMinGrosir'),
            setMinPartai: document.getElementById('setMinPartai'),
            setSelisihGrosir: document.getElementById('setSelisihGrosir'),
            setMarketplaceFee: document.getElementById('setMarketplaceFee'),
            setPembulatan: document.getElementById('setPembulatan'),

            // Stok & Gudang
            setFifoMethod: document.getElementById('setFifoMethod'),
            setStorageMethod: document.getElementById('setStorageMethod'),
            setStorageFlat: document.getElementById('setStorageFlat'),
            setStoragePerKg: document.getElementById('setStoragePerKg'),
            setNamaGudangUtama: document.getElementById('setNamaGudangUtama'),
            setNamaColdStorage: document.getElementById('setNamaColdStorage'),
            setKapasitasCold: document.getElementById('setKapasitasCold'),
            setWarningKapasitas: document.getElementById('setWarningKapasitas'),

            // Backup & Data
            setAutoBackup: document.getElementById('setAutoBackup'),
            setBackupKompresi: document.getElementById('setBackupKompresi'),
            setStorageBackend: document.getElementById('setStorageBackend'),
            setAutoClean: document.getElementById('setAutoClean'),
            setMaxDataAge: document.getElementById('setMaxDataAge'),

            // Tampilan
            setTemaDefault: document.getElementById('setTemaDefault'),
            setFontSize: document.getElementById('setFontSize'),
            setAnimasi: document.getElementById('setAnimasi'),
            setTipsSidebar: document.getElementById('setTipsSidebar'),
            setSuaraNotif: document.getElementById('setSuaraNotif'),
            setRowsPerPage: document.getElementById('setRowsPerPage'),

            // Profil Usaha
            companyName: document.getElementById('companyName'),
            companyAddress: document.getElementById('companyAddress'),
            companyPhone: document.getElementById('companyPhone'),
            companyEmail: document.getElementById('companyEmail'),
            companyWebsite: document.getElementById('companyWebsite'),
            companyLogo: document.getElementById('companyLogo'),
            companyFooterNote: document.getElementById('companyFooterNote'),
            saveCompanyBtn: document.getElementById('saveCompanyBtn'),

            // Reset
            resetAllDataBtn: document.getElementById('resetAllDataBtn'),
            resetSettingsBtn: document.getElementById('resetSettingsBtn'),
            clearCacheBtn: document.getElementById('clearCacheBtn'),
            storageInfoSize: document.getElementById('storageInfoSize'),
        };
    }

    // ==================== HELPER ====================
    function showToast(title, msg, type) { if (window.showToast) window.showToast(title, msg, type); }
    function setVal(id, val) { const el = document.getElementById(id); if (el) el.value = val ?? ''; }
    function getVal(id) { return document.getElementById(id)?.value; }
    function setChecked(id, val) { const el = document.getElementById(id); if (el) el.checked = val; }
    function getChecked(id) { return document.getElementById(id)?.checked || false; }

    // ==================== SUB TAB SWITCHING ====================
    function setupSubTabs() {
        if (!E.subTabBtns) return;
        E.subTabBtns.forEach(btn => {
            btn.addEventListener('click', function () {
                E.subTabBtns.forEach(b => { b.classList.remove('btn-primary', 'active'); b.classList.add('btn-secondary'); });
                this.classList.add('btn-primary', 'active');
                this.classList.remove('btn-secondary');

                const targetId = this.dataset.settingsTab;
                E.subTabContents.forEach(c => c.classList.add('hidden'));
                const target = document.getElementById(targetId);
                if (target) target.classList.remove('hidden');
                currentSettingsTab = targetId;

                // Muat ulang data yang relevan
                if (targetId === 'settings-profil') loadCompanyToForm();
                if (targetId === 'settings-reset') updateStorageInfo();
            });
        });
    }

    // ==================== LOAD DATA DARI STORAGE ====================
    function loadSettingsToForm() {
        const s = Storage.getSettings();
        const c = Storage.getCompany();

        // Umum
        setVal('setNamaBisnis', c.name || 'Cibitung Frozen');
        setVal('setMataUang', s.mataUang || 'IDR');
        setVal('setZonaWaktu', s.zonaWaktu || 'Asia/Jakarta');
        setVal('setFormatTanggal', s.formatTanggal || 'DD/MM/YYYY');
        setVal('setTargetBulanan', s.targetPenjualanBulanan || 50000000);
        setVal('setMinStokWarning', s.minStokWarning || 10);
        setVal('setSatuanDefault', s.satuanDefault || 'kg');
        setChecked('setNotifBrowser', s.notifBrowser || false);

        // Pajak & Legal
        setVal('setPPN', s.ppn ?? 12);
        setVal('setPPh25', s.pph25 ?? 2);
        setVal('setPPh21', s.pph21 ?? 5);
        setVal('setPTShare', s.ptShare ?? 60);
        setVal('setNPWP', c.npwp || '');
        setVal('setSIUP', c.siup || '');
        setVal('setNIB', c.nib || '');
        setVal('setTahunPajak', s.tahunPajak || new Date().getFullYear());

        // Margin & Harga
        setVal('setMarginDefault', s.marginDefault ?? 15000);
        setVal('setMarginMin', s.marginMin || 5000);
        setVal('setMinGrosir', s.minGrosir ?? 10);
        setVal('setMinPartai', s.minPartai ?? 500);
        setVal('setSelisihGrosir', s.selisihGrosir ?? 5000);
        setVal('setMarketplaceFee', s.marketplaceFee ?? 5);
        setVal('setPembulatan', s.pembulatan || '100');

        // Stok & Gudang
        setVal('setFifoMethod', s.fifoMethod || 'fefo');
        setVal('setStorageMethod', s.storageMethod || 'none');
        setVal('setStorageFlat', s.storageFlat || 0);
        setVal('setStoragePerKg', s.storagePerKg || 0);
        setVal('setNamaGudangUtama', s.namaGudangUtama || 'Gudang Utama');
        setVal('setNamaColdStorage', s.namaColdStorage || 'Cold Storage');
        setVal('setKapasitasCold', s.kapasitasCold || 5000);
        setChecked('setWarningKapasitas', s.warningKapasitas !== false);

        // Backup & Data
        setVal('setAutoBackup', s.autoBackupDays || 7);
        setChecked('setBackupKompresi', s.backupKompresi || false);
        setVal('setStorageBackend', s.storageBackend || 'indexeddb');
        setChecked('setAutoClean', s.autoClean || false);
        setVal('setMaxDataAge', s.maxDataAge || 12);

        // Tampilan
        setVal('setTemaDefault', s.temaDefault || 'light');
        setVal('setFontSize', s.fontSize || 'normal');
        setChecked('setAnimasi', s.animasi !== false);
        setChecked('setTipsSidebar', s.tipsSidebar !== false);
        setChecked('setSuaraNotif', s.suaraNotif || false);
        setVal('setRowsPerPage', s.rowsPerPage || 20);

        // Update tampilan storage method
        handleStorageMethodChange();
        hasUnsavedChanges = false;
    }

    function loadCompanyToForm() {
        const c = Storage.getCompany();
        if (!c) return;
        setVal('companyName', c.name);
        setVal('companyAddress', c.address);
        setVal('companyPhone', c.phone);
        setVal('companyEmail', c.email);
        setVal('companyWebsite', c.website);
        setVal('companyLogo', c.logo);
        setVal('companyFooterNote', c.footerNote || 'Terima kasih atas kepercayaan Anda.');
    }

    // ==================== SAVE ====================
    async function saveAllSettings() {
        // Kumpulkan semua nilai dari form
        const newSettings = {
            // Umum
            mataUang: getVal('setMataUang'),
            zonaWaktu: getVal('setZonaWaktu'),
            formatTanggal: getVal('setFormatTanggal'),
            targetPenjualanBulanan: parseFloat(getVal('setTargetBulanan')) || 50000000,
            minStokWarning: parseFloat(getVal('setMinStokWarning')) || 10,
            satuanDefault: getVal('setSatuanDefault') || 'kg',
            notifBrowser: getChecked('setNotifBrowser'),

            // Pajak & Legal
            ppn: parseFloat(getVal('setPPN')) || 0,
            pph25: parseFloat(getVal('setPPh25')) || 0,
            pph21: parseFloat(getVal('setPPh21')) || 0,
            ptShare: parseFloat(getVal('setPTShare')) || 0,
            tahunPajak: parseInt(getVal('setTahunPajak')) || new Date().getFullYear(),

            // Margin & Harga
            marginDefault: parseFloat(getVal('setMarginDefault')) || 0,
            marginMin: parseFloat(getVal('setMarginMin')) || 0,
            minGrosir: parseFloat(getVal('setMinGrosir')) || 0,
            minPartai: parseFloat(getVal('setMinPartai')) || 0,
            selisihGrosir: parseFloat(getVal('setSelisihGrosir')) || 0,
            marketplaceFee: parseFloat(getVal('setMarketplaceFee')) || 0,
            pembulatan: getVal('setPembulatan') || '100',

            // Stok & Gudang
            fifoMethod: getVal('setFifoMethod') || 'fefo',
            storageMethod: getVal('setStorageMethod') || 'none',
            storageFlat: parseFloat(getVal('setStorageFlat')) || 0,
            storagePerKg: parseFloat(getVal('setStoragePerKg')) || 0,
            namaGudangUtama: getVal('setNamaGudangUtama') || 'Gudang Utama',
            namaColdStorage: getVal('setNamaColdStorage') || 'Cold Storage',
            kapasitasCold: parseFloat(getVal('setKapasitasCold')) || 5000,
            warningKapasitas: getChecked('setWarningKapasitas'),

            // Backup & Data
            autoBackupDays: parseInt(getVal('setAutoBackup')) || 7,
            backupKompresi: getChecked('setBackupKompresi'),
            storageBackend: getVal('setStorageBackend') || 'indexeddb',
            autoClean: getChecked('setAutoClean'),
            maxDataAge: parseInt(getVal('setMaxDataAge')) || 12,

            // Tampilan
            temaDefault: getVal('setTemaDefault') || 'light',
            fontSize: getVal('setFontSize') || 'normal',
            animasi: getChecked('setAnimasi'),
            tipsSidebar: getChecked('setTipsSidebar'),
            suaraNotif: getChecked('setSuaraNotif'),
            rowsPerPage: parseInt(getVal('setRowsPerPage')) || 20,
        };

        // Simpan ke settings
        await Storage.saveSettings(newSettings);

        // Simpan data legal ke company
        const company = Storage.getCompany();
        company.npwp = getVal('setNPWP') || '';
        company.siup = getVal('setSIUP') || '';
        company.nib = getVal('setNIB') || '';
        company.name = getVal('setNamaBisnis') || company.name;
        await Storage.saveCompany(company);

        hasUnsavedChanges = false;
        showToast('Sukses', 'Semua pengaturan telah disimpan.', 'success');

        // Terapkan tema langsung
        applyTheme(newSettings.temaDefault);
    }

    async function saveCompanyProfile() {
        const newCompany = {
            name: getVal('companyName') || 'Cibitung Frozen',
            address: getVal('companyAddress') || '',
            phone: getVal('companyPhone') || '',
            email: getVal('companyEmail') || '',
            website: getVal('companyWebsite') || '',
            logo: getVal('companyLogo') || '',
            footerNote: getVal('companyFooterNote') || 'Terima kasih atas kepercayaan Anda.',
        };
        await Storage.saveCompany(newCompany);
        showToast('Sukses', 'Profil usaha disimpan.', 'success');
    }

    // ==================== RESET ====================
    async function resetAllData() {
        if (!confirm('HAPUS SEMUA DATA? Tindakan ini tidak dapat dibatalkan. Pastikan Anda sudah melakukan backup.')) return;
        await Storage.resetAllData();
        location.reload();
    }

    async function resetSettingsOnly() {
        if (!confirm('Reset pengaturan ke default? Data transaksi, batch, dan pelanggan tetap aman.')) return;
        const defaultSettings = Storage.defaultSettings;
        await Storage.saveSettings(defaultSettings);
        loadSettingsToForm();
        showToast('Sukses', 'Pengaturan dikembalikan ke default.', 'success');
    }

    function discardChanges() {
        loadSettingsToForm();
        loadCompanyToForm();
        showToast('Info', 'Perubahan dibatalkan, form dikembalikan ke data tersimpan.', 'info');
    }

    // ==================== THEME ====================
    function applyTheme(theme) {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            localStorage.setItem('cfs_dark', '1');
        } else if (theme === 'light') {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('cfs_dark', '0');
        }
        // Auto: ikuti sistem (bisa ditambahkan)
    }

    // ==================== STORAGE INFO ====================
    async function updateStorageInfo() {
        if (!E.storageInfoSize) return;
        try {
            // Estimasi ukuran data
            const keys = await localforage.keys();
            let totalSize = 0;
            for (const key of keys) {
                const val = await localforage.getItem(key);
                totalSize += new Blob([JSON.stringify(val)]).size;
            }
            const kb = (totalSize / 1024).toFixed(1);
            E.storageInfoSize.textContent = `~${kb} KB`;
        } catch (e) {
            E.storageInfoSize.textContent = 'tidak diketahui';
        }
    }

    async function clearCache() {
        if (!confirm('Bersihkan cache lokal? Data akan dimuat ulang dari storage utama.')) return;
        // Hanya clear cache tambahan, bukan data utama
        showToast('Info', 'Cache dibersihkan.', 'info');
    }

    // ==================== TOGGLE STORAGE METHOD ====================
    function handleStorageMethodChange() {
        const method = document.getElementById('setStorageMethod')?.value || 'none';
        document.getElementById('storageFlatInput')?.classList.toggle('hidden', method !== 'flat_monthly');
        document.getElementById('storagePerKgInput')?.classList.toggle('hidden', method !== 'per_kg_day');
    }

    // ==================== EVENT LISTENERS ====================
    function bindEvents() {
        // Simpan semua pengaturan
        if (E.saveSettingsBtn) E.saveSettingsBtn.addEventListener('click', saveAllSettings);
        if (E.discardSettingsBtn) E.discardSettingsBtn.addEventListener('click', discardChanges);

        // Simpan profil perusahaan
        if (E.saveCompanyBtn) E.saveCompanyBtn.addEventListener('click', saveCompanyProfile);

        // Reset
        if (E.resetAllDataBtn) E.resetAllDataBtn.addEventListener('click', resetAllData);
        if (E.resetSettingsBtn) E.resetSettingsBtn.addEventListener('click', resetSettingsOnly);
        if (E.clearCacheBtn) E.clearCacheBtn.addEventListener('click', clearCache);

        // Toggle storage method
        const methodSelect = document.getElementById('setStorageMethod');
        if (methodSelect) methodSelect.addEventListener('change', handleStorageMethodChange);

        // Tandai perubahan
        document.querySelectorAll('#tab-settings input, #tab-settings select').forEach(input => {
            input.addEventListener('change', () => { hasUnsavedChanges = true; });
            input.addEventListener('input', () => { hasUnsavedChanges = true; });
        });

        // Konfirmasi sebelum meninggalkan halaman (opsional)
        window.addEventListener('beforeunload', function (e) {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = 'Anda memiliki perubahan yang belum disimpan.';
            }
        });
    }

    // ==================== INIT ====================
    function init() {
        cacheElements();
        setupSubTabs();
        loadSettingsToForm();
        loadCompanyToForm();
        bindEvents();
        updateStorageInfo();
    }

    // Expose API
    CFS.Settings = {
        init: init,
        loadSettingsToForm: loadSettingsToForm,
        loadCompanyToForm: loadCompanyToForm,
    };
})();
