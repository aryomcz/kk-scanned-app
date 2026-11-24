export interface IdentitasKKBase {
  no_kk: string;
  nama_kepala_keluarga: string;
  alamat: string | null;
  rt_rw: string | null;
  kode_pos: string | null;
  desa_kelurahan: string | null;
  kecamatan: string | null;
  kabupaten_kota: string | null;
  provinsi: string | null;
}

export interface AnggotaBase {
  nik: string;
  nama_lengkap: string;
  jenis_kelamin: string | null;
  tempat_lahir: string | null;
  tanggal_lahir: string | null;
  agama: string | null;
  pendidikan: string | null;
  jenis_pekerjaan: string | null;
  golongan_darah: string | null;
  status_perkawinan: string | null;
  tanggal_perkawinan: string | null;
  status_hubungan_keluarga: string | null;
  kewarganegaraan: string | null;
  no_paspor: string | null;
  no_kitap: string | null;
  nama_ayah: string | null;
  nama_ibu: string | null;
}

export interface AnggotaResponse extends AnggotaBase {
  id: string;
  kk_id: string;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface IdentitasKKResponse extends IdentitasKKBase {
  id: string;
  image_url?: string | null;
  jumlah_anggota?: number | null;
  anggota?: AnggotaResponse[] | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface KKExtractionResponse {
  identitas: IdentitasKKBase;
  anggota: AnggotaBase[];
}

export interface KKCreateRequest {
  identitas: IdentitasKKBase & { image_url?: string | null };
  anggota: AnggotaBase[];
  image_base64?: string | null;
}

export interface KKDraftSession {
  identitas: IdentitasKKBase;
  anggota: AnggotaBase[];
  imageDataUrl: string;
  fileName: string;
}

export const KK_DRAFT_STORAGE_KEY = "kk_extraction_draft";
