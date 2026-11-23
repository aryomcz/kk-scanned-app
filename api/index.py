from fastapi import FastAPI, HTTPException
from api.core.config import get_supabase

app = FastAPI(
    docs_url="/api/py/docs",
    openapi_url="/api/py/openapi.json",
)


@app.get("/api/py/health")
def health():
    try:
        client = get_supabase()
        client.table("tbl_identitasKK").select("id").limit(1).execute()
        return {"status": "ok", "supabase": "connected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Supabase connection failed: {e}")
