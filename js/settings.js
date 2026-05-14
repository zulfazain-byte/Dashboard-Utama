/* ============================================================
   Cibitung Frozen ERP Ultimate v5.4 — Settings Module
   Mengelola pengaturan bisnis dan profil perusahaan.
   ============================================================ */

// Pastikan CFS global sudah tersedia (dari storage.js)
window.CFS = window.CFS || {};

(function() {
    'use strict';

    // Referensi cepat ke Storage API
    const Storage = CFS.Storage;

    // Elemen form (akan diinisialisasi saat pertama kali digunakan)
    let elements = {};

    /**
     * Inisialisasi cache elemen-elemen penting pada tab settings.
     */
    function cacheElements() {
        elements.setPPN = document.getElementById('setPPN');
        elements.setPPh25 = document.getElementById('setPPh25');
        elements.setPPh21 = document.getElementById('setPPh21');
        elements.setPTShare = document.getElementById('setPTShare');
        elements.setMinGrosir = document.getElementById('setMinGrosir');
        elements.setMinPartai = document.getElementById('setMinPartai');
        elements.setSelisihGrosir = document.getElementById('setSelisihGrosir');
        elements.setMarginDefault = document.getElementById('setMarginDefault');
        elements.setFifoMethod = document.getElementById('setFifoMethod');
        elements.setMarketplaceFee = document.getElementById('setMarketplaceFee');
        elements.setAutoBackup = document.getElementById('setAutoBackup');
        elements.setStorageMethod = document.getElementById('setStorageMethod');
        elements.setStorageFlat = document.getElementById('setStorageFlat');
        elements.setStoragePerKg = document.getElementById('setStoragePerKg');

        elements.companyName = document.getElementById('companyName');
        elements.companyAddress = document.getElementById('companyAddress');
        elements.companyPhone = document.getElementById('companyPhone');
        elements.companyEmail = document.getElementById('companyEmail');
        elements.companyWebsite = document.getElementById('companyWebsite');

        elements.saveSettingsBtn = document.getElementById('saveSettingsBtn');
        elements.saveCompanyBtn = document.getElementById('saveCompanyBtn');
        elements.resetAllDataBtn = document.getElementById('resetAllDataBtn');
    }

    /**
     * Memuat pengaturan dari state global ke form input.
     */
    function loadSettingsToForm() {
        cacheElements(); // pastikan sudah di-cache

        const s = Storage.getSettings();
        if (!s) return;

        if (elements.setPPN) elements.setPPN.value = s.ppn ?? 12;
        if (elements.setPPh25) elements.setPPh25.value = s.pph25 ?? 2;
        if (elements.setPPh21) elements.setPPh21.value = s.pph21 ?? 5;
        if (elements.setPTShare) elements.setPTShare.value = s.ptShare ?? 60;
        if (elements.setMinGrosir) elements.setMinGrosir.value = s.minGrosir ?? 10;
        if (elements.setMinPartai) elements.setMinPartai.value = s.minPartai ?? 500;
        if (elements.setSelisihGrosir) elements.setSelisihGrosir.value = s.selisihGrosir ?? 5000;
        if (elements.setMarginDefault) elements.setMarginDefault.value = s.marginDefault ?? 15000;
        if (elements.setFifoMethod) elements.setFifoMethod.value = s.fifoMethod ?? 'fefo';
        if (elements.setMarketplaceFee) elements.setMarketplaceFee.value = s.marketplaceFee ?? 5;
        if (elements.setAutoBackup) elements.setAutoBackup.value = s.autoBackupDays ?? 7;
        if (elements.setStorageMethod) elements.setStorageMethod.value = s.storageMethod ?? 'none';
        if (elements.setStorageFlat) elements.setStorageFlat.value = s.storageFlat ?? 0;
        if (elements.setStoragePerKg) elements.setStoragePerKg.value = s.storagePerKg ?? 0;

        // Tampilkan / sembunyikan input storage tambahan
        handleStorageMethodChange();
    }

    /**
     * Memuat profil perusahaan ke form input.
     */
    function loadCompanyToForm() {
        cacheElements();
        const c = Storage.getCompany();
        if (!c) return;

        if (elements.companyName) elements.companyName.value = c.name ?? 'Cibitung Frozen';
        if (elements.companyAddress) elements.companyAddress.value = c.address ?? '';
        if (elements.companyPhone) elements.companyPhone.value = c.phone ?? '';
        if (elements.companyEmail) elements.companyEmail.value = c.email ?? '';
        if (elements.companyWebsite) elements.companyWebsite.value = c.website ?? '';
    }

    /**
     * Menangani perubahan metode penyimpanan.
     */
    function handleStorageMethodChange() {
        const method = elements.setStorageMethod ? elements.setStorageMethod.value : 'none';
        const flatDiv = document.getElementById('storageFlatInput');
        const perKgDiv = document.getElementById('storagePerKgInput');

        if (flatDiv) flatDiv.classList.toggle('hidden', method !== 'flat_monthly');
        if (perKgDiv) perKgDiv.classList.toggle('hidden', method !== 'per_kg_day');
    }

    /**
     * Mengambil nilai form pengaturan dan mengembalikannya sebagai objek.
     */
    function getSettingsFromForm() {
        cacheElements();
        return {
            ppn: parseFloat(elements.setPPN?.value) || 0,
            pph25: parseFloat(elements.setPPh25?.value) || 0,
            pph21: parseFloat(elements.setPPh21?.value) || 0,
            ptShare: parseFloat(elements.setPTShare?.value) || 0,
            minGrosir: parseFloat(elements.setMinGrosir?.value) || 0,
            minPartai: parseFloat(elements.setMinPartai?.value) || 0,
            selisihGrosir: parseFloat(elements.setSelisihGrosir?.value) || 0,
            marginDefault: parseFloat(elements.setMarginDefault?.value) || 0,
            fifoMethod: elements.setFifoMethod?.value || 'fefo',
            marketplaceFee: parseFloat(elements.setMarketplaceFee?.value) || 0,
            autoBackupDays: parseInt(elements.setAutoBackup?.value, 10) || 7,
            storageMethod: elements.setStorageMethod?.value || 'none',
            storageFlat: parseFloat(elements.setStorageFlat?.value) || 0,
            storagePerKg: parseFloat(elements.setStoragePerKg?.value) || 0,
            targetPenjualanBulanan: parseFloat(document.getElementById('setTargetBulanan')?.value) || 50000000
        };
    }

    /**
     * Menyimpan pengaturan bisnis.
     */
    async function saveSettings() {
        const newSettings = getSettingsFromForm();
        await Storage.saveSettings(newSettings);
        showToast?.('Sukses', 'Pengaturan bisnis disimpan!', 'success');
    }

    /**
     * Mengambil nilai form profil perusahaan.
     */
    function getCompanyFromForm() {
        cacheElements();
        return {
            name: elements.companyName?.value || 'Cibitung Frozen',
            address: elements.companyAddress?.value || '',
            phone: elements.companyPhone?.value || '',
            email: elements.companyEmail?.value || '',
            website: elements.companyWebsite?.value || ''
        };
    }

    /**
     * Menyimpan profil perusahaan.
     */
    async function saveCompany() {
        const newCompany = getCompanyFromForm();
        await Storage.saveCompany(newCompany);
        showToast?.('Sukses', 'Profil usaha disimpan!', 'success');
    }

    /**
     * Mereset semua data setelah konfirmasi.
     */
    async function resetAllData() {
        if (!confirm('HAPUS SEMUA DATA? Tindakan ini tidak dapat dibatalkan. Pastikan Anda sudah melakukan backup.')) return;
        await Storage.resetAllData();
        // Reload halaman agar state bersih sepenuhnya
        location.reload();
    }

    /**
     * Menambahkan event listener pada tombol-tombol.
     */
    function bindEvents() {
        if (elements.saveSettingsBtn) {
            elements.saveSettingsBtn.addEventListener('click', saveSettings);
        }
        if (elements.saveCompanyBtn) {
            elements.saveCompanyBtn.addEventListener('click', saveCompany);
        }
        if (elements.resetAllDataBtn) {
            elements.resetAllDataBtn.addEventListener('click', resetAllData);
        }
        if (elements.setStorageMethod) {
            elements.setStorageMethod.addEventListener('change', handleStorageMethodChange);
        }
    }

    /**
     * Inisialisasi modul Settings.
     * Dipanggil saat aplikasi sudah siap (biasanya dari app.js atau saat tab settings dibuka).
     */
    function initSettings() {
        cacheElements();
        loadSettingsToForm();
        loadCompanyToForm();
        bindEvents();
    }

    // Expose ke global CFS
    CFS.Settings = {
        init: initSettings,
        loadSettingsToForm,
        loadCompanyToForm,
        saveSettings,
        saveCompany,
        resetAllData
    };

})();
