# Implementation Plan: Aplikasi Digitalisasi & Manajemen KK

> **Cara Menggunakan File Ini dengan Antigravity:**
> Setiap kali memulai sesi baru, berikan instruksi:
> `"Baca docs/PRD.md dan docs/PLAN.md. Kerjakan HANYA Phase [X] sampai seluruh checklist dan kriteria selesai terpenuhi, lalu hentikan eksekusi untuk review."`

---

## Phase 1: Project Scaffolding & Konfigurasi Monorepo

**Target Branch / Commit:**

- `chore: initialize nextjs and fastapi monorepo structure for vercel`
- `docs: add product requirements document, plan, and env template`

### Checklist Tugas

- [x] Pastikan struktur Next.js (TypeScript, Tailwind CSS, App Router, `src/` directory) sudah terpasang di root proyek.
- [x] Inisialisasi `shadcn/ui` dan install komponen: `button`, `input`, `table`, `dialog`, `card`, `label`, `sonner`, `badge`.
- [x] Buat struktur folder backend Python di `api/`:
  - `api/index.py` (FastAPI app dengan `docs_url="/api/py/docs"`, `openapi_url="/api/py/openapi.json"`)
  - `api/core/__init__.py`
  - `api/schemas/__init__.py`
  - `api/services/__init__.py`
  - `api/routers/__init__.py`
- [x] Buat `requirements.txt` berisi: `fastapi`, `uvicorn`, `python-multipart`, `supabase`, `google-genai`, `pydantic`, `python-dotenv`.
- [x] Buat `vercel.json` untuk rewrite `/api/py/:path*` ke `/api/index.py`.
- [x] Update `next.config.ts` dengan `rewrites()` untuk meneruskan `/api/py/:path*` ke `http://127.0.0.1:8000/api/py/:path*` saat `NODE_ENV === "development"`.
- [x] Buat `.env.example` sesuai spesifikasi di `docs/PRD.md`.
- [x] Tambahkan endpoint uji `GET /api/py/health` sementara yang mengembalikan `{"status": "ok"}`.

### Kriteria Selesai (Acceptance Criteria)

1. `npm run build` berjalan sukses tanpa error TypeScript/Next.js.
2. `uvicorn api.index:app --reload --port 8000` berjalan dan `http://localhost:3000/api/py/health` mengembalikan `{"status": "ok"}`.

---

## Phase 2: Database Schema & Koneksi Supabase

**Target Commit:**

- `feat(db): add supabase migration for tbl_identitasKK and tbl_anggotaKeluargaKK`
- `feat(api): configure supabase client and healthcheck endpoint`

### Checklist Tugas

- [x] Buat file `supabase/migrations/001_init_kk_tables.sql` persis sesuai skema SQL di `docs/PRD.md` (`tbl_identitasKK`, `tbl_anggotaKeluargaKK`, index, dan trigger `updated_at`).
- [x] Buat `api/core/config.py` untuk membaca `.env` (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`, `GEMINI_API_KEY`) dan menginisialisasi singleton Supabase Client.
- [x] Perbarui `GET /api/py/health` agar memverifikasi koneksi ke Supabase (misalnya query ringan ke `tbl_identitasKK`).

### Kriteria Selesai (Acceptance Criteria)

1. Migrasi SQL berhasil dieksekusi di Supabase SQL Editor tanpa error, dan bucket `kk-images` sudah tersedia.
2. `GET /api/py/health` mengembalikan status `200 OK` beserta konfirmasi koneksi Supabase aktif.

---

## Phase 3: Backend Python — Layanan Ekstraksi Gambar KK (Gemini)

**Target Commit:**

- `feat(api): define pydantic schemas for kk identity and family members`
- `feat(api): implement kk image extraction endpoint via structured vision output`

### Checklist Tugas

- [x] Buat `api/schemas/kk_schema.py`:
  - `AnggotaBase`, `AnggotaCreate`, `AnggotaUpdate`, `AnggotaResponse`
  - `IdentitasKKBase`, `IdentitasKKCreate`, `IdentitasKKUpdate`, `IdentitasKKResponse`
  - `KKExtractionResponse` (berisi `identitas` dan `anggota: list[...]`)
  - Normalisasi field tanggal (`YYYY-MM-DD` atau `None` jika kosong/`-`).
- [x] Buat `api/services/ocr_service.py`:
  - Gunakan `google-genai` (`gemini-3.8-flash`) dengan `response_mime_type="application/json"` dan `response_schema=KKExtractionResponse`.
  - Pastikan prompt sistem menginstruksikan pembacaan akurat untuk seluruh kolom KK Indonesia (termasuk menangani nilai `-` atau kosong).
- [x] Buat `api/routers/extract.py` dengan endpoint `POST /api/py/extract`:
  - Validasi tipe file (JPG, PNG, WEBP) dan ukuran maksimal 5 MB.
  - Daftarkan router ke `api/index.py`.

### Kriteria Selesai (Acceptance Criteria)

1. Uji via Swagger UI (`/api/py/docs`) dengan gambar contoh KK dummy menghasilkan JSON terstruktur sesuai kontrak `docs/PRD.md`.
2. File selain gambar atau > 5 MB ditolak dengan HTTP `400` / `413`.

---

## Phase 4: Backend Python — Full CRUD Endpoints

**Target Commit:**

- `feat(api): implement supabase service for kk tables and storage`
- `feat(api): add full crud endpoints for tbl_identitasKK and tbl_anggotaKeluargaKK`

### Checklist Tugas

- [x] Buat `api/services/supabase_service.py`:
  - Upload gambar base64/bytes ke bucket `kk-images` dan kembalikan `public_url`.
  - Hapus gambar dari bucket saat KK dihapus.
  - Fungsi CRUD untuk `tbl_identitasKK` (termasuk hitung `jumlah_anggota` dan filter `?search=`).
  - Fungsi CRUD untuk `tbl_anggotaKeluargaKK`.
  - Tangkap error constraint unik PostgreSQL (`23505`) dan ubah menjadi HTTP `409 Conflict` dengan pesan jelas (misal: `"No. KK atau NIK sudah terdaftar"`).
- [x] Buat `api/routers/kk.py`: `GET /api/py/kk`, `POST /api/py/kk`, `GET /api/py/kk/{id}`, `PUT /api/py/kk/{id}`, `DELETE /api/py/kk/{id}`.
- [x] Buat `api/routers/anggota.py`: `POST /api/py/kk/{id}/anggota`, `PUT /api/py/anggota/{anggota_id}`, `DELETE /api/py/anggota/{anggota_id}`.
- [x] Daftarkan kedua router di `api/index.py`.

### Kriteria Selesai (Acceptance Criteria)

1. Seluruh endpoint CRUD dapat diuji melalui `/api/py/docs` dan data benar-benar tersimpan, berubah, dan terhapus di tabel Supabase.
2. Menghapus 1 KK otomatis menghapus seluruh anggotanya (`ON DELETE CASCADE`).

---

## Phase 5: Frontend — Halaman Input & Konfirmasi Editable

**Target Commit:**

- `feat(ui): add typescript types, api client, and zod validators`
- `feat(ui): build kk image upload page and editable confirmation form`

### Checklist Tugas

- [x] Buat `src/types/kk.ts` (sinkron 1:1 dengan Pydantic schemas).
- [x] Buat `src/lib/validators.ts` (skema Zod untuk form identitas & anggota).
- [x] Buat `src/lib/api.ts` (fetch wrapper ke `/api/py/*` dengan error handling pesan backend).
- [x] Buat `src/components/Navbar.tsx` dan pasang di `src/app/layout.tsx` bersama `Toaster` (`sonner`).
- [x] Buat `src/app/page.tsx` yang me-redirect ke `/kk`.
- [x] Buat `src/app/upload/page.tsx`:
  - Dropzone upload gambar KK + preview + tombol `"Proses & Ekstrak Data"` + loading state.
  - Simpan hasil ekstraksi & preview gambar (base64/DataURL) ke `sessionStorage`, lalu redirect ke `/confirm`.
- [x] Buat `src/app/confirm/page.tsx`:
  - Layout split-screen: kiri preview gambar KK asli (dengan tombol zoom), kanan form editable (`react-hook-form` + `useFieldArray`).
  - Fitur tambah baris anggota, hapus baris anggota, dan tombol `"Simpan ke Database"` (`POST /api/py/kk`) yang redirect ke `/kk/[id]`.

### Kriteria Selesai (Acceptance Criteria)

1. Upload gambar KK dummy berhasil mengekstrak data dan membawanya ke `/confirm`.
2. Pengguna bisa mengedit seluruh field sebelum menyimpan, dan data tersimpan ke Supabase.

---

## Phase 6: Frontend — Penelusuran Tabel KK & Detail CRUD

**Target Commit:**

- `feat(ui): implement kk directory table with search and quick actions`
- `feat(ui): build kk detail page with full crud for family members`

### Checklist Tugas

- [x] Buat komponen modal reusable:
  - `src/components/EditIdentitasModal.tsx` (edit data `tbl_identitasKK`)
  - `src/components/AnggotaFormModal.tsx` (tambah & edit data `tbl_anggotaKeluargaKK`)
- [x] Buat `src/app/kk/page.tsx`:
  - Tabel khusus menampilkan `tbl_identitasKK` saja (No. KK, Nama Kepala Keluarga, Alamat, Kecamatan/Kota, Jumlah Anggota, Aksi).
  - Search bar (`?search=`) dengan debounce.
  - Aksi: Link `"Lihat Anggota"` (`/kk/[id]`), `"Edit Identitas"`, dan `"Hapus KK"` (dialog konfirmasi).
- [x] Buat `src/app/kk/[id]/page.tsx`:
  - Kartu informasi lengkap `tbl_identitasKK`, tombol preview gambar KK, tombol Edit Identitas, dan tombol Hapus KK.
  - Tabel daftar `tbl_anggotaKeluargaKK` milik KK tersebut.
  - Tombol `"+ Tambah Anggota"`, aksi `"Edit"` dan `"Hapus"` pada setiap baris anggota.

### Kriteria Selesai (Acceptance Criteria)

1. Halaman `/kk` hanya menampilkan tabel identitas KK, dan link detail membuka halaman anggota keluarga KK tersebut.
2. Seluruh operasi Read, Update, Delete pada identitas KK maupun anggota keluarga berjalan mulus dengan notifikasi toast.

---

## Phase 7: Polish, Validasi & Deployment ke Vercel

**Target Commit:**

- `chore(deploy): finalize vercel config and environment setup`
- `docs: complete readme with setup instructions and architecture overview`

### Checklist Tugas

- [ ] Pastikan tidak ada URL `localhost` yang di-hardcode di frontend maupun backend.
- [ ] Cek responsivitas tampilan di layar desktop dan mobile.
- [ ] Lengkapi `README.md` (fitur, arsitektur, cara setup lokal Next.js + FastAPI, dan cara deploy).
- [ ] Deploy ke Vercel, isi seluruh Environment Variables di Vercel Dashboard, dan lakukan uji _end-to-end_ pada URL production.

### Kriteria Selesai (Acceptance Criteria)

1. Aplikasi live di Vercel tanpa biaya tambahan dan seluruh alur (Upload -> Konfirmasi -> Simpan -> Cari -> Detail -> Update -> Delete) berjalan normal di production.
