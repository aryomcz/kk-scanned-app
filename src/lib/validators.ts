import { z } from "zod";
import type { AnggotaBase, IdentitasKKBase } from "@/types/kk";

const optionalDate = z
  .string()
  .trim()
  .refine(
    (val) => val === "" || /^\d{4}-\d{2}-\d{2}$/.test(val),
    "Format tanggal harus YYYY-MM-DD"
  );

export const identitasFormSchema = z.object({
  no_kk: z.string().trim().regex(/^\d{16}$/, "No. KK harus 16 digit angka"),
  nama_kepala_keluarga: z
    .string()
    .trim()
    .min(1, "Nama kepala keluarga wajib diisi"),
  alamat: z.string().trim(),
  rt_rw: z.string().trim(),
  kode_pos: z.string().trim(),
  desa_kelurahan: z.string().trim(),
  kecamatan: z.string().trim(),
  kabupaten_kota: z.string().trim(),
  provinsi: z.string().trim(),
});

export const anggotaFormSchema = z.object({
  nik: z.string().trim().regex(/^\d{16}$/, "NIK harus 16 digit angka"),
  nama_lengkap: z.string().trim().min(1, "Nama lengkap wajib diisi"),
  jenis_kelamin: z.string().trim(),
  tempat_lahir: z.string().trim(),
  tanggal_lahir: optionalDate,
  agama: z.string().trim(),
  pendidikan: z.string().trim(),
  jenis_pekerjaan: z.string().trim(),
  golongan_darah: z.string().trim(),
  status_perkawinan: z.string().trim(),
  tanggal_perkawinan: optionalDate,
  status_hubungan_keluarga: z.string().trim(),
  kewarganegaraan: z.string().trim(),
  no_paspor: z.string().trim(),
  no_kitap: z.string().trim(),
  nama_ayah: z.string().trim(),
  nama_ibu: z.string().trim(),
});

export const kkFormSchema = z.object({
  identitas: identitasFormSchema,
  anggota: z
    .array(anggotaFormSchema)
    .min(1, "Minimal harus ada 1 anggota keluarga"),
});

export type IdentitasFormValues = z.infer<typeof identitasFormSchema>;
export type AnggotaFormValues = z.infer<typeof anggotaFormSchema>;
export type KKFormValues = z.infer<typeof kkFormSchema>;

export const EMPTY_IDENTITAS_FORM: IdentitasFormValues = {
  no_kk: "",
  nama_kepala_keluarga: "",
  alamat: "",
  rt_rw: "",
  kode_pos: "",
  desa_kelurahan: "",
  kecamatan: "",
  kabupaten_kota: "",
  provinsi: "",
};

export const EMPTY_ANGGOTA_FORM: AnggotaFormValues = {
  nik: "",
  nama_lengkap: "",
  jenis_kelamin: "",
  tempat_lahir: "",
  tanggal_lahir: "",
  agama: "",
  pendidikan: "",
  jenis_pekerjaan: "",
  golongan_darah: "",
  status_perkawinan: "",
  tanggal_perkawinan: "",
  status_hubungan_keluarga: "",
  kewarganegaraan: "WNI",
  no_paspor: "",
  no_kitap: "",
  nama_ayah: "",
  nama_ibu: "",
};

const toStr = (v: string | null | undefined): string => v ?? "";
const toNullable = (v: string): string | null => {
  const trimmed = v.trim();
  return trimmed === "" ? null : trimmed;
};

export function toIdentitasFormValues(
  data: Partial<IdentitasKKBase>
): IdentitasFormValues {
  return {
    no_kk: toStr(data.no_kk),
    nama_kepala_keluarga: toStr(data.nama_kepala_keluarga),
    alamat: toStr(data.alamat),
    rt_rw: toStr(data.rt_rw),
    kode_pos: toStr(data.kode_pos),
    desa_kelurahan: toStr(data.desa_kelurahan),
    kecamatan: toStr(data.kecamatan),
    kabupaten_kota: toStr(data.kabupaten_kota),
    provinsi: toStr(data.provinsi),
  };
}

export function toAnggotaFormValues(
  data: Partial<AnggotaBase>
): AnggotaFormValues {
  return {
    nik: toStr(data.nik),
    nama_lengkap: toStr(data.nama_lengkap),
    jenis_kelamin: toStr(data.jenis_kelamin),
    tempat_lahir: toStr(data.tempat_lahir),
    tanggal_lahir: toStr(data.tanggal_lahir),
    agama: toStr(data.agama),
    pendidikan: toStr(data.pendidikan),
    jenis_pekerjaan: toStr(data.jenis_pekerjaan),
    golongan_darah: toStr(data.golongan_darah),
    status_perkawinan: toStr(data.status_perkawinan),
    tanggal_perkawinan: toStr(data.tanggal_perkawinan),
    status_hubungan_keluarga: toStr(data.status_hubungan_keluarga),
    kewarganegaraan: toStr(data.kewarganegaraan) || "WNI",
    no_paspor: toStr(data.no_paspor),
    no_kitap: toStr(data.no_kitap),
    nama_ayah: toStr(data.nama_ayah),
    nama_ibu: toStr(data.nama_ibu),
  };
}

export function toIdentitasPayload(values: IdentitasFormValues): IdentitasKKBase {
  return {
    no_kk: values.no_kk.trim(),
    nama_kepala_keluarga: values.nama_kepala_keluarga.trim(),
    alamat: toNullable(values.alamat),
    rt_rw: toNullable(values.rt_rw),
    kode_pos: toNullable(values.kode_pos),
    desa_kelurahan: toNullable(values.desa_kelurahan),
    kecamatan: toNullable(values.kecamatan),
    kabupaten_kota: toNullable(values.kabupaten_kota),
    provinsi: toNullable(values.provinsi),
  };
}

export function toAnggotaPayload(values: AnggotaFormValues): AnggotaBase {
  return {
    nik: values.nik.trim(),
    nama_lengkap: values.nama_lengkap.trim(),
    jenis_kelamin: toNullable(values.jenis_kelamin),
    tempat_lahir: toNullable(values.tempat_lahir),
    tanggal_lahir: toNullable(values.tanggal_lahir),
    agama: toNullable(values.agama),
    pendidikan: toNullable(values.pendidikan),
    jenis_pekerjaan: toNullable(values.jenis_pekerjaan),
    golongan_darah: toNullable(values.golongan_darah),
    status_perkawinan: toNullable(values.status_perkawinan),
    tanggal_perkawinan: toNullable(values.tanggal_perkawinan),
    status_hubungan_keluarga: toNullable(values.status_hubungan_keluarga),
    kewarganegaraan: toNullable(values.kewarganegaraan),
    no_paspor: toNullable(values.no_paspor),
    no_kitap: toNullable(values.no_kitap),
    nama_ayah: toNullable(values.nama_ayah),
    nama_ibu: toNullable(values.nama_ibu),
  };
}
