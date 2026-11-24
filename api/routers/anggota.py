from fastapi import APIRouter
from api.schemas.kk_schema import AnggotaCreate, AnggotaResponse, AnggotaUpdate
from api.services import supabase_service

router = APIRouter(prefix="/api/py", tags=["Anggota"])


@router.post("/kk/{id}/anggota", response_model=AnggotaResponse, status_code=201)
def create_anggota(id: str, payload: AnggotaCreate):
    return supabase_service.create_anggota(id, payload)


@router.put("/anggota/{anggota_id}", response_model=AnggotaResponse)
def update_anggota(anggota_id: str, payload: AnggotaUpdate):
    return supabase_service.update_anggota(anggota_id, payload)


@router.delete("/anggota/{anggota_id}")
def delete_anggota(anggota_id: str):
    return supabase_service.delete_anggota(anggota_id)
