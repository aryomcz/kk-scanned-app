# Arsip KK — Digitalisasi & Manajemen Kartu Keluarga

Aplikasi web full-stack untuk mengekstrak data dokumen **Kartu Keluarga (KK)** Indonesia secara otomatis menggunakan backend **Python (FastAPI)** dan **Gemini Structured Output**, memverifikasi hasil pembacaan berdampingan dengan dokumen asli, lalu menyimpannya ke database relasional dan object storage **Supabase**.

Proyek ini disusun sebagai **monorepo Next.js + FastAPI** agar dapat dideploy langsung di **Vercel** tanpa server terpisah dan tanpa masalah CORS.

---

## Fitur Utama

1. **Scan & Ekstraksi Otomatis (`/upload`)**: Unggah gambar KK (JPG, PNG, WEBP hingga 5 MB) dengan preview langsung sebelum dikirim ke endpoint ekstraksi `/api/py/extract`.
2. **Konfirmasi & Koreksi Split-Screen (`/confirm`)**: Tinjau gambar dokumen asli (dengan kontrol zoom) berdampingan dengan formulir `react-hook-form` + `zod` untuk identitas KK dan baris dinamis anggota keluarga sebelum disimpan ke database.
3. **Penelusuran Tabel KK (`/kk`)**: Menampilkan daftar `tbl_identitasKK` saja lengkap dengan search bar debounce (`?search=` berdasarkan No. KK atau Nama Kepala Keluarga), tautan **Lihat Anggota**, **Edit Identitas**, dan **Hapus KK** (cascade).
4. **Detail KK & Full CRUD Anggota (`/kk/[id]`)**: Menampilkan kartu informasi lengkap `tbl_identitasKK`, preview gambar dokumen KK dari Supabase Storage, serta tabel `tbl_anggotaKeluargaKK` lengkap dengan fitur **Tambah**, **Edit**, dan **Hapus** anggota keluarga.

---

## Arsitektur Monorepo & Tech Stack

| Lapisan | Teknologi | Peran |
| :--- | :--- | :--- |
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui, `react-hook-form`, `zod`, `sonner` | Antarmuka pengguna, validasi form, dan HTTP client ke `/api/py/*` |
| **Backend API** | Python, FastAPI, Pydantic v2 | Endpoint REST `/api/py/*` (ekstraksi OCR + CRUD KK & Anggota) yang berjalan sebagai Vercel Serverless Function |
| **Ekstraksi Dokumen** | `google-genai` (`gemini-3.5-flash`) | Pembacaan gambar KK menggunakan JSON Structured Output sesuai schema `KKExtractionResponse` |
| **Database & Storage** | Supabase (PostgreSQL + Supabase Storage bucket `kk-images`) | Penyimpanan relasional `"tbl_identitasKK"` & `"tbl_anggotaKeluargaKK"` (`ON DELETE CASCADE`) serta arsip gambar KK |
| **Deployment** | Vercel (`vercel.json` rewrites) | Mengarahkan `/api/py/:path*` ke `api/index.py` dan rute lainnya ke Next.js |

### Alur Data

```text
Browser (Next.js)
  ├── POST /api/py/extract   ──► FastAPI ──► Gemini Vision API (Structured JSON)
  ├── Review di /confirm
  ├── POST /api/py/kk        ──► FastAPI ──► Supabase Storage (kk-images) + PostgreSQL
  └── CRUD /kk & /kk/[id]    ──► FastAPI ──► tbl_identitasKK & tbl_anggotaKeluargaKK
```

---

## Struktur Folder

```text
kk-scanner-app/
├── api/
│   ├── index.py                  # Entrypoint FastAPI + endpoint /api/py/health
│   ├── core/config.py            # Loader env & singleton Supabase client
│   ├── schemas/kk_schema.py      # Pydantic schemas & normalisasi tanggal
│   ├── services/
│   │   ├── ocr_service.py        # Integrasi google-genai Structured Output
│   │   └── supabase_service.py   # Query Supabase PostgreSQL & Storage
│   └── routers/
│       ├── extract.py            # POST /api/py/extract
│       ├── kk.py                 # CRUD /api/py/kk
│       └── anggota.py            # CRUD /api/py/anggota
├── src/
│   ├── app/
│   │   ├── layout.tsx            # Root layout, font, Navbar, Toaster
│   │   ├── page.tsx              # Redirect ke /kk
│   │   ├── upload/page.tsx       # Unggah gambar KK
│   │   ├── confirm/page.tsx      # Split-screen konfirmasi editable
│   │   └── kk/
│   │       ├── page.tsx          # Penelusuran tabel tbl_identitasKK
│   │       └── [id]/page.tsx     # Detail KK + CRUD tbl_anggotaKeluargaKK
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── EditIdentitasModal.tsx
│   │   ├── AnggotaFormModal.tsx
│   │   └── ui/                   # Komponen shadcn/ui
│   ├── lib/
│   │   ├── api.ts                # Fetch client ke /api/py/*
│   │   └── validators.ts         # Schema Zod & mapping payload
│   └── types/kk.ts               # TypeScript interfaces
├── supabase/migrations/
│   └── 001_init_kk_tables.sql    # DDL tabel, index, dan trigger updated_at
├── next.config.ts                # Rewrite dev /api/py/* -> 127.0.0.1:8000
├── vercel.json                   # Rewrite production /api/py/* -> /api/index.py
├── requirements.txt              # Dependensi Python ringan (< batas Vercel)
└── .env.example
```

---

## Setup Lokal

### 1. Siapkan Supabase
1. Buat project baru di [Supabase](https://supabase.com).
2. Jalankan isi file [`supabase/migrations/001_init_kk_tables.sql`](supabase/migrations/001_init_kk_tables.sql) pada **SQL Editor** Supabase untuk membuat tabel `"tbl_identitasKK"`, `"tbl_anggotaKeluargaKK"`, index, dan trigger `updated_at`.
3. Buka menu **Storage** dan buat bucket publik bernama `kk-images` (atau sesuaikan nama bucket pada `SUPABASE_STORAGE_BUCKET`).

### 2. Konfigurasi Environment Variables
Salin `.env.example` menjadi `.env` di root proyek lalu isi kredensial Anda:

```bash
cp .env.example .env
```

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_STORAGE_BUCKET=kk-images
GEMINI_API_KEY=your-gemini-api-key
NEXT_PUBLIC_API_BASE_URL=
```

### 3. Jalankan Backend Python (FastAPI)
```bash
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt
uvicorn api.index:app --reload --port 8000
```
- Swagger UI tersedia di `http://127.0.0.1:8000/api/py/docs`.
- Healthcheck tersedia di `http://127.0.0.1:8000/api/py/health`.

### 4. Jalankan Frontend Next.js
Pada terminal terpisah:

```bash
npm install
npm run dev
```
Buka `http://localhost:3000` di browser. Saat `NODE_ENV === "development"`, `next.config.ts` otomatis meneruskan seluruh permintaan `/api/py/*` ke server FastAPI lokal di `127.0.0.1:8000`.

---

## Deployment ke Vercel

1. Push repositori ke GitHub (pastikan file `.env` tidak ikut ter-commit).
2. Import repositori di **Vercel Dashboard** dengan preset **Next.js**.
3. Tambahkan **Environment Variables** berikut pada Vercel Project Settings:

| Variable | Wajib | Keterangan |
| :--- | :--- | :--- |
| `SUPABASE_URL` | Ya | URL project Supabase Anda |
| `SUPABASE_SERVICE_ROLE_KEY` | Ya | Service Role Key Supabase untuk akses tabel & bucket Storage |
| `SUPABASE_STORAGE_BUCKET` | Opsional | Default: `kk-images` |
| `GEMINI_API_KEY` | Ya | API Key dari Google AI Studio |
| `NEXT_PUBLIC_API_BASE_URL` | Kosongkan | Biarkan kosong di production agar frontend memanggil relative path `/api/py/*` |

4. Deploy. `vercel.json` akan otomatis mengarahkan seluruh rute `/api/py/*` ke Python Serverless Function `api/index.py`.
