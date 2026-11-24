import base64
import binascii
import re
from typing import Any, NoReturn
import uuid
from fastapi import HTTPException
from api.core.config import SUPABASE_STORAGE_BUCKET, get_supabase
from api.schemas.kk_schema import (
    AnggotaCreate,
    AnggotaUpdate,
    IdentitasKKUpdate,
    KKCreateRequest,
)

TBL_IDENTITAS = "tbl_identitasKK"
TBL_ANGGOTA = "tbl_anggotaKeluargaKK"

_DATA_URL_RE = re.compile(r"^data:(image/[a-zA-Z0-9.+-]+);base64,(.*)$", re.DOTALL)
_MIME_TO_EXT = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}


def _raise_db_error(e: Exception) -> NoReturn:
    if isinstance(e, HTTPException):
        raise e
    msg = str(e)
    code = getattr(e, "code", None)
    if code == "23505" or "23505" in msg or "duplicate key" in msg.lower():
        raise HTTPException(status_code=409, detail="No. KK atau NIK sudah terdaftar")
    raise HTTPException(status_code=500, detail=f"Database error: {msg}")


def _get_or_404(table: str, row_id: str, not_found_msg: str) -> dict[str, Any]:
    try:
        res = get_supabase().table(table).select("*").eq("id", row_id).execute()
    except Exception as e:
        _raise_db_error(e)
    if not res.data:
        raise HTTPException(status_code=404, detail=not_found_msg)
    return res.data[0]


def _update_by_id(
    table: str, row_id: str, data: dict[str, Any], not_found_msg: str
) -> dict[str, Any]:
    if not data:
        return _get_or_404(table, row_id, not_found_msg)
    try:
        res = get_supabase().table(table).update(data).eq("id", row_id).execute()
    except Exception as e:
        _raise_db_error(e)
    if not res.data:
        raise HTTPException(status_code=404, detail=not_found_msg)
    return res.data[0]


def upload_kk_image(image_base64: str, no_kk: str) -> str:
    raw = image_base64.strip()
    mime_type = "image/jpeg"
    match = _DATA_URL_RE.match(raw)
    if match:
        detected = match.group(1).lower()
        mime_type = "image/jpeg" if detected == "image/jpg" else detected
        raw = match.group(2).strip()

    try:
        image_bytes = base64.b64decode(raw, validate=True)
    except (binascii.Error, ValueError) as e:
        raise HTTPException(status_code=400, detail=f"Format image_base64 tidak valid: {e}")

    ext = _MIME_TO_EXT.get(mime_type, "jpg")
    prefix = re.sub(r"[^a-zA-Z0-9_-]", "", no_kk or "") or "kk"
    path = f"{prefix}_{uuid.uuid4().hex[:8]}.{ext}"

    try:
        bucket = get_supabase().storage.from_(SUPABASE_STORAGE_BUCKET)
        bucket.upload(path, image_bytes, {"content-type": mime_type, "upsert": "true"})
        return bucket.get_public_url(path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal mengunggah gambar ke Storage: {e}")


def delete_kk_image(image_url: str | None) -> None:
    if not image_url:
        return
    marker = f"/{SUPABASE_STORAGE_BUCKET}/"
    if marker not in image_url:
        return
    object_key = image_url.split(marker, 1)[1].split("?", 1)[0]
    if not object_key:
        return
    try:
        get_supabase().storage.from_(SUPABASE_STORAGE_BUCKET).remove([object_key])
    except Exception:
        pass


def list_kk(search: str | None = None) -> list[dict[str, Any]]:
    try:
        query = (
            get_supabase()
            .table(TBL_IDENTITAS)
            .select(f"*, {TBL_ANGGOTA}(count)")
            .order("created_at", desc=True)
        )
        if search and search.strip():
            q = search.strip()
            query = query.or_(f"no_kk.ilike.%{q}%,nama_kepala_keluarga.ilike.%{q}%")
        res = query.execute()
    except Exception as e:
        _raise_db_error(e)

    rows = res.data or []
    for row in rows:
        count_data = row.pop(TBL_ANGGOTA, None)
        row["jumlah_anggota"] = count_data[0]["count"] if count_data else 0
    return rows


def get_kk_by_id(kk_id: str) -> dict[str, Any]:
    kk = _get_or_404(TBL_IDENTITAS, kk_id, "Data KK tidak ditemukan")
    try:
        anggota_res = (
            get_supabase()
            .table(TBL_ANGGOTA)
            .select("*")
            .eq("kk_id", kk_id)
            .order("created_at")
            .execute()
        )
    except Exception as e:
        _raise_db_error(e)

    anggota_rows = anggota_res.data or []
    kk["anggota"] = anggota_rows
    kk["jumlah_anggota"] = len(anggota_rows)
    return kk


def create_kk(payload: KKCreateRequest) -> dict[str, Any]:
    identitas_data = payload.identitas.model_dump()
    uploaded_url: str | None = None

    if payload.image_base64:
        uploaded_url = upload_kk_image(
            payload.image_base64, identitas_data.get("no_kk", "")
        )
        identitas_data["image_url"] = uploaded_url

    client = get_supabase()
    try:
        kk_res = client.table(TBL_IDENTITAS).insert(identitas_data).execute()
    except Exception as e:
        delete_kk_image(uploaded_url)
        _raise_db_error(e)

    if not kk_res.data:
        delete_kk_image(uploaded_url)
        raise HTTPException(status_code=500, detail="Gagal menyimpan data KK")

    kk_id = kk_res.data[0]["id"]
    if payload.anggota:
        anggota_rows = [{**a.model_dump(), "kk_id": kk_id} for a in payload.anggota]
        try:
            client.table(TBL_ANGGOTA).insert(anggota_rows).execute()
        except Exception as e:
            try:
                client.table(TBL_IDENTITAS).delete().eq("id", kk_id).execute()
            except Exception:
                pass
            delete_kk_image(uploaded_url)
            _raise_db_error(e)

    return get_kk_by_id(kk_id)


def update_kk(kk_id: str, payload: IdentitasKKUpdate) -> dict[str, Any]:
    data = payload.model_dump(exclude_unset=True)
    if not data:
        return get_kk_by_id(kk_id)
    return _update_by_id(TBL_IDENTITAS, kk_id, data, "Data KK tidak ditemukan")


def delete_kk(kk_id: str) -> dict[str, str]:
    kk = _get_or_404(TBL_IDENTITAS, kk_id, "Data KK tidak ditemukan")
    try:
        get_supabase().table(TBL_IDENTITAS).delete().eq("id", kk_id).execute()
    except Exception as e:
        _raise_db_error(e)
    delete_kk_image(kk.get("image_url"))
    return {"message": "Data KK berhasil dihapus"}


def create_anggota(kk_id: str, payload: AnggotaCreate) -> dict[str, Any]:
    _get_or_404(TBL_IDENTITAS, kk_id, "Data KK tidak ditemukan")
    row = {**payload.model_dump(), "kk_id": kk_id}
    try:
        res = get_supabase().table(TBL_ANGGOTA).insert(row).execute()
    except Exception as e:
        _raise_db_error(e)
    if not res.data:
        raise HTTPException(status_code=500, detail="Gagal menambahkan anggota keluarga")
    return res.data[0]


def update_anggota(anggota_id: str, payload: AnggotaUpdate) -> dict[str, Any]:
    return _update_by_id(
        TBL_ANGGOTA,
        anggota_id,
        payload.model_dump(exclude_unset=True),
        "Data anggota keluarga tidak ditemukan",
    )


def delete_anggota(anggota_id: str) -> dict[str, str]:
    try:
        res = get_supabase().table(TBL_ANGGOTA).delete().eq("id", anggota_id).execute()
    except Exception as e:
        _raise_db_error(e)
    if not res.data:
        raise HTTPException(
            status_code=404, detail="Data anggota keluarga tidak ditemukan"
        )
    return {"message": "Data anggota keluarga berhasil dihapus"}
