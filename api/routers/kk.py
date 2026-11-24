from fastapi import APIRouter, Query
from api.schemas.kk_schema import (
    IdentitasKKResponse,
    IdentitasKKUpdate,
    KKCreateRequest,
)
from api.services import supabase_service

router = APIRouter(prefix="/api/py/kk", tags=["KK"])


@router.get("", response_model=list[IdentitasKKResponse])
def list_kk(search: str | None = Query(default=None)):
    return supabase_service.list_kk(search=search)


@router.post("", response_model=IdentitasKKResponse, status_code=201)
def create_kk(payload: KKCreateRequest):
    return supabase_service.create_kk(payload)


@router.get("/{id}", response_model=IdentitasKKResponse)
def get_kk(id: str):
    return supabase_service.get_kk_by_id(id)


@router.put("/{id}", response_model=IdentitasKKResponse)
def update_kk(id: str, payload: IdentitasKKUpdate):
    return supabase_service.update_kk(id, payload)


@router.delete("/{id}")
def delete_kk(id: str):
    return supabase_service.delete_kk(id)
