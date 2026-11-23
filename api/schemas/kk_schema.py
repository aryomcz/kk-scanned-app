from datetime import date, datetime
import re
from typing import Any
from pydantic import BaseModel, field_validator


def _clean_str(v: Any) -> str | None:
    if v is None:
        return None
    s = re.sub(r"\s+", " ", str(v)).strip()
    if not s or s in {"-", "--", "null", "None"}:
        return None
    return s


def _clean_digits(v: Any) -> str:
    if v is None:
        return ""
    s = re.sub(r"[\s\-]", "", str(v))
    return s


def _normalize_date(v: Any) -> str | None:
    if v is None:
        return None
    if isinstance(v, (date, datetime)):
        return v.strftime("%Y-%m-%d")
    s = str(v).strip()
    if not s or s in {"-", "--", "null", "None"}:
        return None
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d", "%d.%m.%Y"):
        try:
            return datetime.strptime(s, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


class AnggotaBase(BaseModel):
    nik: str = ""
    nama_lengkap: str = ""
    jenis_kelamin: str | None = None
    tempat_lahir: str | None = None
    tanggal_lahir: str | None = None
    agama: str | None = None
    pendidikan: str | None = None
    jenis_pekerjaan: str | None = None
    golongan_darah: str | None = None
    status_perkawinan: str | None = None
    tanggal_perkawinan: str | None = None
    status_hubungan_keluarga: str | None = None
    kewarganegaraan: str | None = "WNI"
    no_paspor: str | None = None
    no_kitap: str | None = None
    nama_ayah: str | None = None
    nama_ibu: str | None = None

    @field_validator("nik", mode="before")
    @classmethod
    def validate_nik(cls, v: Any) -> str:
        return _clean_digits(v)

    @field_validator("nama_lengkap", mode="before")
    @classmethod
    def validate_nama(cls, v: Any) -> str:
        return _clean_str(v) or ""

    @field_validator("tanggal_lahir", "tanggal_perkawinan", mode="before")
    @classmethod
    def validate_dates(cls, v: Any) -> str | None:
        return _normalize_date(v)

    @field_validator(
        "jenis_kelamin",
        "tempat_lahir",
        "agama",
        "pendidikan",
        "jenis_pekerjaan",
        "golongan_darah",
        "status_perkawinan",
        "status_hubungan_keluarga",
        "kewarganegaraan",
        "no_paspor",
        "no_kitap",
        "nama_ayah",
        "nama_ibu",
        mode="before",
    )
    @classmethod
    def validate_optional_text(cls, v: Any) -> str | None:
        return _clean_str(v)


class AnggotaCreate(AnggotaBase):
    pass


class AnggotaUpdate(BaseModel):
    nik: str | None = None
    nama_lengkap: str | None = None
    jenis_kelamin: str | None = None
    tempat_lahir: str | None = None
    tanggal_lahir: str | None = None
    agama: str | None = None
    pendidikan: str | None = None
    jenis_pekerjaan: str | None = None
    golongan_darah: str | None = None
    status_perkawinan: str | None = None
    tanggal_perkawinan: str | None = None
    status_hubungan_keluarga: str | None = None
    kewarganegaraan: str | None = None
    no_paspor: str | None = None
    no_kitap: str | None = None
    nama_ayah: str | None = None
    nama_ibu: str | None = None

    @field_validator("tanggal_lahir", "tanggal_perkawinan", mode="before")
    @classmethod
    def validate_dates(cls, v: Any) -> str | None:
        return _normalize_date(v)


class AnggotaResponse(AnggotaBase):
    id: str
    kk_id: str
    created_at: str | None = None
    updated_at: str | None = None


class IdentitasKKBase(BaseModel):
    no_kk: str = ""
    nama_kepala_keluarga: str = ""
    alamat: str | None = None
    rt_rw: str | None = None
    kode_pos: str | None = None
    desa_kelurahan: str | None = None
    kecamatan: str | None = None
    kabupaten_kota: str | None = None
    provinsi: str | None = None

    @field_validator("no_kk", mode="before")
    @classmethod
    def validate_no_kk(cls, v: Any) -> str:
        return _clean_digits(v)

    @field_validator("nama_kepala_keluarga", mode="before")
    @classmethod
    def validate_kepala(cls, v: Any) -> str:
        return _clean_str(v) or ""

    @field_validator(
        "alamat",
        "rt_rw",
        "kode_pos",
        "desa_kelurahan",
        "kecamatan",
        "kabupaten_kota",
        "provinsi",
        mode="before",
    )
    @classmethod
    def validate_optional_text(cls, v: Any) -> str | None:
        return _clean_str(v)


class IdentitasKKCreate(IdentitasKKBase):
    image_url: str | None = None


class IdentitasKKUpdate(BaseModel):
    no_kk: str | None = None
    nama_kepala_keluarga: str | None = None
    alamat: str | None = None
    rt_rw: str | None = None
    kode_pos: str | None = None
    desa_kelurahan: str | None = None
    kecamatan: str | None = None
    kabupaten_kota: str | None = None
    provinsi: str | None = None
    image_url: str | None = None


class IdentitasKKResponse(IdentitasKKBase):
    id: str
    image_url: str | None = None
    jumlah_anggota: int | None = None
    anggota: list[AnggotaResponse] | None = None
    created_at: str | None = None
    updated_at: str | None = None


class KKExtractionResponse(BaseModel):
    identitas: IdentitasKKBase
    anggota: list[AnggotaBase]
