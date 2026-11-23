-- Aktifkan ekstensi UUID jika belum aktif
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Tabel Identitas Kartu Keluarga
CREATE TABLE IF NOT EXISTS "tbl_identitasKK" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    no_kk VARCHAR(16) UNIQUE NOT NULL,
    nama_kepala_keluarga TEXT NOT NULL,
    alamat TEXT,
    rt_rw VARCHAR(15),
    kode_pos VARCHAR(10),
    desa_kelurahan TEXT,
    kecamatan TEXT,
    kabupaten_kota TEXT,
    provinsi TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabel Anggota Keluarga pada KK
CREATE TABLE IF NOT EXISTS "tbl_anggotaKeluargaKK" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kk_id UUID NOT NULL REFERENCES "tbl_identitasKK"(id) ON DELETE CASCADE,
    nik VARCHAR(16) UNIQUE NOT NULL,
    nama_lengkap TEXT NOT NULL,
    jenis_kelamin VARCHAR(20),
    tempat_lahir TEXT,
    tanggal_lahir DATE,
    agama VARCHAR(30),
    pendidikan TEXT,
    jenis_pekerjaan TEXT,
    golongan_darah VARCHAR(10),
    status_perkawinan VARCHAR(30),
    tanggal_perkawinan DATE,
    status_hubungan_keluarga VARCHAR(50),
    kewarganegaraan VARCHAR(10) DEFAULT 'WNI',
    no_paspor VARCHAR(30),
    no_kitap VARCHAR(30),
    nama_ayah TEXT,
    nama_ibu TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index untuk performa pencarian & relasi
CREATE INDEX IF NOT EXISTS idx_identitas_no_kk ON "tbl_identitasKK"(no_kk);
CREATE INDEX IF NOT EXISTS idx_identitas_kepala ON "tbl_identitasKK"(nama_kepala_keluarga);
CREATE INDEX IF NOT EXISTS idx_anggota_kk_id ON "tbl_anggotaKeluargaKK"(kk_id);
CREATE INDEX IF NOT EXISTS idx_anggota_nik ON "tbl_anggotaKeluargaKK"(nik);

-- Trigger otomatis untuk memperbarui kolom updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_identitas_updated_at
    BEFORE UPDATE ON "tbl_identitasKK"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_anggota_updated_at
    BEFORE UPDATE ON "tbl_anggotaKeluargaKK"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
