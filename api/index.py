from fastapi import FastAPI, HTTPException
from api.core.config import get_supabase
from api.routers.anggota import router as anggota_router
from api.routers.extract import router as extract_router
from api.routers.kk import router as kk_router

app = FastAPI(
    docs_url="/api/py/docs",
    openapi_url="/api/py/openapi.json",
)

app.include_router(extract_router)
app.include_router(kk_router)
app.include_router(anggota_router)


@app.get("/api/py/health")
def health():
    try:
        client = get_supabase()
        client.table("tbl_identitasKK").select("id").limit(1).execute()
        return {"status": "ok", "supabase": "connected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Supabase connection failed: {e}")
