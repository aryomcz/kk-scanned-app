# Product Requirements Document (PRD): Aplikasi Digitalisasi & Manajemen Kartu Keluarga (KK)

> **Target Pengguna Dokumen:** Developer & AI Coding Agent (Antigravity)
> **Tujuan:** Menjadi *single source of truth* untuk arsitektur, skema database, kontrak API, spesifikasi UI, dan rencana eksekusi bertahap (*phase-by-phase*) agar hasil kode rapi dan histori commit GitHub tetap bersih (*clean commits*).

---

## 1. Ringkasan Proyek

Aplikasi web full-stack untuk mengekstrak data dari gambar dokumen **Kartu Keluarga (KK)** Indonesia secara otomatis menggunakan backend **Python (FastAPI)**, memverifikasi atau mengoreksi hasil pembacaan melalui halaman konfirmasi berbasis form yang dapat diedit (*editable form*), lalu menyimpannya ke database relasional **Supabase (PostgreSQL)**.

Aplikasi disusun sebagai satu repositori (*monorepo*) yang menggabungkan frontend **Next.js** dan backend **Python FastAPI**. OCR dijalankan lokal oleh PaddleOCR tanpa aplikasi sistem atau API AI eksternal.

### Ruang Lingkup Utama
1. **Input Image KK:** Unggah gambar KK untuk diproses dan diekstrak menjadi data terstruktur.
2. **Halaman Konfirmasi (Editable):** Pengguna dapat meninjau gambar KK asli berdampingan dengan form hasil ekstraksi, memperbaiki salah baca, menambah/menghapus baris anggota keluarga, sebelum menyimpannya ke database.
3. **Penelusuran Tabel KK:** Menampilkan daftar `tbl_identitasKK` saja dengan fitur pencarian dan tautan ke halaman detail anggota keluarga.
4. **Full CRUD (Read, Update, Delete):** Mendukung operasi lihat, ubah, dan hapus baik untuk data identitas KK (`tbl_identitasKK`) maupun data anggota keluarga (`tbl_anggotaKeluargaKK`).

---

## 2. Arsitektur & Tech Stack

| Lapisan | Teknologi | Alasan Pemilihan |
| :--- | :--- | :--- |
| **Frontend** | Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui | Native dengan Vercel, mendukung form dinamis (`react-hook-form` + `zod`) dan UI tabel yang modern. |
| **Backend** | Python 3.12, FastAPI, Pydantic v2 | Validasi data ketat, dokumentasi otomatis (Swagger), dan menjalankan OCR lokal. |
| **Ekstraksi Dokumen** | PaddleOCR + PaddlePaddle CPU + Pillow | OCR bahasa Indonesia berjalan lokal; posisi teks dipetakan ke dua tingkat tabel KK. |
| **Database & Storage** | Supabase (PostgreSQL + Supabase Storage) | Gratis (Free Tier), menyediakan PostgreSQL relasional dan bucket penyimpanan gambar KK (`kk-images`). |
| **Deployment** | Vercel + host/container Python | Vercel untuk frontend; backend menjalankan model PaddleOCR lokal. |

### Alur Data Sistem
```text
[User Browser (Next.js)]
   │
   ├─ 1. POST /api/py/extract (Multipart Image) ──► [FastAPI] ──► [PaddleOCR lokal]
   │                                                      │
   │  ◄── 2. JSON Terstruktur (Identitas + Anggota) ──────┘
   │
   ├─ 3. User Review & Edit di Halaman Konfirmasi (/confirm)
   │
   └─ 4. POST /api/py/kk (JSON + Image) ──► [FastAPI] ──► [Supabase Storage & PostgreSQL]
```

---

## 3. Desain Database (Supabase PostgreSQL)

Gunakan **UUID** sebagai Primary Key dan `no_kk` sebagai kolom `UNIQUE` (bukan PK langsung). Hal ini memungkinkan pengguna mengedit `no_kk` yang salah ketik saat operasi **Update** tanpa merusak relasi foreign key.

Simpan skrip berikut pada `supabase/migrations/001_init_kk_tables.sql`:

```sql
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
```

### Supabase Storage
- **Nama Bucket:** `kk-images`
- **Akses:** Public (atau Private dengan Signed URL) untuk menampilkan pratinjau gambar KK di halaman konfirmasi dan halaman detail.

---

## 4. Kontrak API Backend (FastAPI)

Seluruh endpoint Python berada di bawah prefix `/api/py` agar frontend dapat memakai kontrak URL yang sama pada development maupun production.

### 4.1 Ekstraksi Dokumen
- **`POST /api/py/extract`**
  - **Input:** `multipart/form-data` dengan field `file` (JPG, PNG, WEBP, maks 5 MB).
  - **Proses:** Validasi tipe & ukuran file -> preprocessing gambar dan PaddleOCR -> parser posisi teks -> kembalikan JSON hasil pembacaan (**belum** disimpan ke database).
  - **Response (`200 OK`):**
    ```json
    {
      "identitas": {
        "no_kk": "3276010101010001",
        "nama_kepala_keluarga": "BUDI SANTOSO",
        "alamat": "JL. MARGONDA RAYA NO. 10",
        "rt_rw": "001/002",
        "kode_pos": "16424",
        "desa_kelurahan": "KEMIRIMUKA",
        "kecamatan": "BEJI",
        "kabupaten_kota": "KOTA DEPOK",
        "provinsi": "JAWA BARAT"
      },
      "anggota": [
        {
          "nik": "3276011205800001",
          "nama_lengkap": "BUDI SANTOSO",
          "jenis_kelamin": "LAKI-LAKI",
          "tempat_lahir": "JAKARTA",
          "tanggal_lahir": "1980-05-12",
          "agama": "ISLAM",
          "pendidikan": "DIPLOMA IV/STRATA I",
          "jenis_pekerjaan": "KARYAWAN SWASTA",
          "golongan_darah": "O",
          "status_perkawinan": "KAWIN",
          "tanggal_perkawinan": "2005-08-17",
          "status_hubungan_keluarga": "KEPALA KELUARGA",
          "kewarganegaraan": "WNI",
          "no_paspor": "-",
          "no_kitap": "-",
          "nama_ayah": "SUHARTO",
          "nama_ibu": "SITI AMINAH"
        }
      ]
    }
    ```

### 4.2 CRUD Identitas KK (`tbl_identitasKK`)
- **`GET /api/py/kk`**
  - Query params opsional: `?search=<keyword>` (mencari pada `no_kk` atau `nama_kepala_keluarga`).
  - Response (`200 OK`): Array objek `tbl_identitasKK` beserta `jumlah_anggota`.
- **`POST /api/py/kk`**
  - Body: JSON `{ "identitas": {...}, "anggota": [...], "image_base64": "..." (opsional) }`.
  - Proses: Simpan gambar ke Supabase Storage (jika ada), insert ke `tbl_identitasKK`, lalu bulk insert ke `tbl_anggotaKeluargaKK`.
  - Error Handling: Kembalikan `409 Conflict` jika `no_kk` atau `nik` sudah terdaftar.
- **`GET /api/py/kk/{id}`**
  - Response (`200 OK`): Objek detail `tbl_identitasKK` beserta array `anggota` dari `tbl_anggotaKeluargaKK`.
- **`PUT /api/py/kk/{id}`**
  - Body: Field `tbl_identitasKK` yang diperbarui.
  - Response (`200 OK`): Data `tbl_identitasKK` terbaru.
- **`DELETE /api/py/kk/{id}`**
  - Proses: Hapus baris pada `tbl_identitasKK` (otomatis menghapus semua anggota terkait via `ON DELETE CASCADE`) dan hapus file gambar terkait di Supabase Storage jika ada.
  - Response (`200 OK`): `{ "message": "Data KK berhasil dihapus" }`.

### 4.3 CRUD Anggota Keluarga (`tbl_anggotaKeluargaKK`)
- **`POST /api/py/kk/{id}/anggota`**
  - Menambah 1 anggota keluarga baru ke KK dengan `kk_id = id`.
- **`PUT /api/py/anggota/{anggota_id}`**
  - Memperbarui data 1 anggota keluarga tertentu.
- **`DELETE /api/py/anggota/{anggota_id}`**
  - Menghapus 1 anggota keluarga tertentu.

---

## 5. Spesifikasi Halaman Frontend (Next.js)

### 5.1 Navigasi Global
Navbar sederhana dengan menu:
- **Daftar KK** (`/kk`)
- **Scan / Upload KK** (`/upload`)

### 5.2 Halaman Input (`/upload`)
- Area *drag-and-drop* / file picker menerima JPG, PNG, WEBP (maks 5 MB).
- Menampilkan preview gambar KK yang dipilih sebelum diproses.
- Tombol **"Proses & Ekstrak Data"** dengan *loading state* (spinner + teks status).
- Setelah respons `/api/py/extract` diterima, simpan hasil sementara di `sessionStorage` (termasuk preview gambar) dan redirect ke `/confirm`.

### 5.3 Halaman Konfirmasi Editable (`/confirm`)
- **Layout Split-Screen (Desktop):**
  - **Kiri (Sticky):** Preview gambar KK asli dengan fitur zoom in/out agar pengguna mudah mencocokkan teks.
  - **Kanan:** Form interaktif (`react-hook-form` + `zod`):
    - **Bagian 1 — Identitas KK:** Input untuk seluruh field `tbl_identitasKK` (validasi `no_kk` 16 digit angka).
    - **Bagian 2 — Anggota Keluarga (`useFieldArray`):** Kartu/accordion yang dapat diedit untuk setiap anggota, dilengkapi tombol **"+ Tambah Anggota"** dan **"Hapus Baris"**.
- Tombol **"Simpan ke Database"** memanggil `POST /api/py/kk`, menampilkan toast sukses, lalu redirect ke `/kk/[id]`.

### 5.4 Halaman Penelusuran Tabel KK (`/kk`)
- Menampilkan **hanya tabel `tbl_identitasKK`** (tidak menampilkan daftar anggota secara langsung di tabel ini).
- Kolom tabel: `No. KK`, `Nama Kepala Keluarga`, `Alamat`, `Kecamatan / Kota`, `Jumlah Anggota`, dan `Aksi`.
- Dilengkapi **Search Bar** (pencarian berdasarkan No. KK atau Nama Kepala Keluarga) dan tombol **"+ Upload KK Baru"**.
- Kolom Aksi pada setiap baris:
  - **Lihat Anggota / Detail** (link menuju `/kk/[id]`)
  - **Edit Identitas** (membuka modal edit `tbl_identitasKK`)
  - **Hapus** (dialog konfirmasi dengan peringatan bahwa seluruh anggota keluarga pada KK ini juga akan terhapus)

### 5.5 Halaman Detail KK & Anggota Keluarga (`/kk/[id]`)
- **Header / Kartu Identitas KK:** Menampilkan seluruh field `tbl_identitasKK`, tombol **"Lihat Gambar KK"** (modal), tombol **"Edit Identitas KK"**, dan tombol **"Hapus KK"**.
- **Tabel Anggota Keluarga (`tbl_anggotaKeluargaKK`):**
  - Menampilkan seluruh anggota milik KK tersebut (NIK, Nama Lengkap, L/P, TTL, Agama, Pendidikan, Pekerjaan, Status Hubungan, Orang Tua).
  - Tombol **"+ Tambah Anggota"** (membuka modal form tambah anggota).
  - Aksi per baris anggota: **Edit** (modal edit anggota) dan **Hapus** (dialog konfirmasi hapus anggota).

---

## 6. Struktur Folder Monorepo & Konfigurasi

```text
kk-scanner-app/
├── api/
│   ├── index.py                  # Entrypoint FastAPI (app = FastAPI(...))
│   ├── core/
│   │   └── config.py             # Environment variables & Supabase client
│   ├── schemas/
│   │   └── kk_schema.py          # Pydantic models (Extract, Identitas, Anggota)
│   ├── services/
│   │   ├── ocr_service.py        # Preprocessing, PaddleOCR, dan parser tabel KK
│   │   └── supabase_service.py   # Operasi query & storage Supabase
│   └── routers/
│       ├── extract.py            # POST /api/py/extract
│       ├── kk.py                 # CRUD /api/py/kk
│       └── anggota.py            # CRUD /api/py/anggota
├── src/
│   ├── app/
│   │   ├── layout.tsx            # Root layout + Navbar + Toaster
│   │   ├── page.tsx              # Redirect ke /kk
│   │   ├── upload/page.tsx       # Halaman Input Image KK
│   │   ├── confirm/page.tsx      # Halaman Konfirmasi Editable
│   │   └── kk/
│   │       ├── page.tsx          # Halaman Penelusuran Tabel KK
│   │       └── [id]/page.tsx     # Halaman Detail KK + CRUD Anggota
│   ├── components/
│   │   ├── ui/                   # Komponen shadcn/ui
│   │   ├── Navbar.tsx
│   │   ├── KKForm.tsx            # Reusable form identitas + anggota
│   │   ├── EditIdentitasModal.tsx
│   │   └── AnggotaFormModal.tsx
│   ├── lib/
│   │   ├── api.ts                # HTTP client ke /api/py/*
│   │   └── validators.ts         # Schema Zod untuk validasi form
│   └── types/
│       └── kk.ts                 # TypeScript interfaces
├── supabase/
│   └── migrations/
│       └── 001_init_kk_tables.sql
├── docs/
│   └── PRD.md
├── requirements.txt
├── vercel.json
├── next.config.ts
└── .env.example
```

### Referensi `vercel.json`
```json
{
  "rewrites": [
    {
      "source": "/api/py/:path*",
      "destination": "/api/index.py"
    }
  ]
}
```

### Referensi `.env.example`
```env
# Supabase
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_STORAGE_BUCKET=kk-images

# OCR lokal PaddleOCR
OCR_LANGUAGE=id

# Next.js (kosongkan di production agar menggunakan relative path /api/py)
NEXT_PUBLIC_API_BASE_URL=
```

---

## 7. Roadmap Implementasi & Strategi Clean GitHub Commits

Kerjakan **satu fase per sesi** bersama Antigravity. Pastikan setiap fase berjalan dan lolos uji coba lokal sebelum melakukan commit menggunakan standar **Conventional Commits**.

### Phase 1: Project Scaffolding & Dokumentasi
- **Tugas:**
  - Inisialisasi Next.js (TypeScript, Tailwind CSS, App Router) dan pasang `shadcn/ui` (`button`, `input`, `table`, `dialog`, `card`, `label`, `sonner`, `badge`).
  - Buat struktur folder `api/`, `requirements.txt` (FastAPI, Supabase, PaddleOCR/PaddlePaddle, Pillow, Pydantic, dan dotenv), `vercel.json`, `.env.example`, dan konfigurasi rewrite dev di `next.config.ts` (forward `/api/py/*` ke `http://127.0.0.1:8000/api/py/*` saat lokal).
  - Simpan dokumen ini di `docs/PRD.md`.
- **Target Commits:**
  - `chore: initialize nextjs and fastapi monorepo structure for vercel`
  - `docs: add product requirements document and env template`

### Phase 2: Database Schema & Koneksi Supabase
- **Tugas:**
  - Buat file `supabase/migrations/001_init_kk_tables.sql` dan jalankan di SQL Editor Supabase.
  - Buat bucket `kk-images` di Supabase Storage.
  - Implementasikan `api/core/config.py` dan endpoint healthcheck `GET /api/py/health` untuk memastikan koneksi Supabase berhasil.
- **Target Commits:**
  - `feat(db): add supabase migration for tbl_identitasKK and tbl_anggotaKeluargaKK`
  - `feat(api): configure supabase client and healthcheck endpoint`

### Phase 3: Backend Python — Layanan Ekstraksi Gambar KK
- **Tugas:**
  - Buat Pydantic schemas di `api/schemas/kk_schema.py` (validasi format tanggal `YYYY-MM-DD`, normalisasi karakter spasi/strip).
  - Buat `api/services/ocr_service.py` menggunakan PaddleOCR, preprocessing gambar, dan parser posisi tabel.
  - Buat `api/routers/extract.py` (`POST /api/py/extract`) dan uji via Swagger UI (`/api/py/docs`) menggunakan gambar KK dummy.
- **Target Commits:**
  - `feat(api): define pydantic schemas for kk identity and family members`
  - `feat(api): implement kk image extraction endpoint via structured vision output`

### Phase 4: Backend Python — Full CRUD Endpoints
- **Tugas:**
  - Implementasikan `api/services/supabase_service.py` (termasuk upload & hapus gambar di Storage).
  - Implementasikan `api/routers/kk.py` (`GET`, `POST`, `PUT`, `DELETE`) dan `api/routers/anggota.py` (`POST`, `PUT`, `DELETE`).
  - Tangani error duplikasi `no_kk` / `nik` dengan status HTTP `409 Conflict`.
- **Target Commits:**
  - `feat(api): implement supabase service for kk tables and storage`
  - `feat(api): add full crud endpoints for tbl_identitasKK and tbl_anggotaKeluargaKK`

### Phase 5: Frontend — Halaman Upload & Konfirmasi Editable
- **Tugas:**
  - Buat `src/types/kk.ts`, `src/lib/api.ts`, dan `src/lib/validators.ts`.
  - Bangun halaman `/upload` (drag-and-drop + preview + proses ekstraksi).
  - Bangun halaman `/confirm` (split-screen gambar asli + form editable identitas & `useFieldArray` anggota keluarga + tombol simpan ke DB).
- **Target Commits:**
  - `feat(ui): add typescript types, api client, and zod validators`
  - `feat(ui): build kk image upload page and editable confirmation form`

### Phase 6: Frontend — Penelusuran Tabel KK & Detail CRUD
- **Tugas:**
  - Bangun halaman `/kk` (tabel khusus `tbl_identitasKK`, search bar, tombol lihat detail, modal edit identitas, dan dialog hapus KK).
  - Bangun halaman `/kk/[id]` (kartu identitas KK, pratinjau gambar KK, tabel `tbl_anggotaKeluargaKK`, serta modal Tambah/Edit/Hapus anggota).
- **Target Commits:**
  - `feat(ui): implement kk directory table with search and quick actions`
  - `feat(ui): build kk detail page with full crud for family members`

### Phase 7: Polish, Validasi & Deployment
- **Tugas:**
  - Pastikan tidak ada hardcoded URL `localhost`, cek responsivitas mobile/desktop, dan lengkapi `README.md` (panduan setup lokal & arsitektur).
  - Deploy frontend ke Vercel dan backend PaddleOCR ke host/container Python, atur environment variables, lalu lakukan uji *end-to-end*.
- **Target Commits:**
  - `chore(deploy): finalize vercel config and environment setup`
  - `docs: complete readme with setup instructions and architecture overview`

---

## 8. Aturan Eksekusi untuk Antigravity (Agent Guidelines)

1. **Kerjakan per fase:** Jangan pernah mengimplementasikan lebih dari satu fase dalam satu iterasi kecuali diminta secara eksplisit.
2. **Patuhi nama tabel persis:** Selalu gunakan `"tbl_identitasKK"` dan `"tbl_anggotaKeluargaKK"` (perhatikan *case-sensitivity* pada PostgreSQL).
3. **Runtime OCR:** Model PaddleOCR diunduh otomatis pada pemakaian pertama dan disimpan di cache lokal. Untuk production gunakan host/container dengan storage persisten karena ukuran dependensi/model tidak cocok untuk Vercel Python Function standar.
4. **Keamanan & Privasi:** Jangan pernah meng-commit file `.env`, API key, atau foto Kartu Keluarga asli ke repositori Git. Gunakan data/gambar dummy untuk pengujian.
5. **Sinkronisasi tipe data:** Pastikan setiap perubahan field pada `api/schemas/kk_schema.py` selalu disinkronkan dengan `src/types/kk.ts` dan `src/lib/validators.ts`.
