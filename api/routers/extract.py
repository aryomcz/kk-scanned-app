import asyncio
from fastapi import APIRouter, File, HTTPException, UploadFile
from google.genai import errors as genai_errors
from api.schemas.kk_schema import KKExtractionResponse
from api.services.ocr_service import extract_kk_data

router = APIRouter(prefix="/api/py", tags=["Extract"])

ALLOWED_MIME_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


@router.post("/extract", response_model=KKExtractionResponse)
async def extract_kk(file: UploadFile = File(...)):
    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Tipe file tidak didukung. Gunakan JPG, PNG, atau WEBP.",
        )

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="File gambar kosong.")
    if len(image_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Ukuran file melebihi batas maksimal 5 MB.",
        )

    mime_type = "image/jpeg" if content_type == "image/jpg" else content_type
    try:
        return await asyncio.to_thread(extract_kk_data, image_bytes, mime_type)
    except genai_errors.APIError as e:
        code = getattr(e, "code", None)
        status = code if code in (429, 503) else 502
        raise HTTPException(status_code=status, detail=f"Gagal mengekstrak gambar KK: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal mengekstrak gambar KK: {e}")
