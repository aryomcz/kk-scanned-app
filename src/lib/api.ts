import type {
  AnggotaBase,
  AnggotaResponse,
  IdentitasKKBase,
  IdentitasKKResponse,
  KKCreateRequest,
  KKExtractionResponse,
} from "@/types/kk";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(
  /\/$/,
  ""
);

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);

  let data: unknown = null;
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    data = await res.json().catch(() => null);
  } else {
    const text = await res.text().catch(() => "");
    if (text) data = { detail: text };
  }

  if (!res.ok) {
    const body = data as { detail?: unknown; message?: string } | null;
    const message =
      typeof body?.detail === "string"
        ? body.detail
        : body?.message || `Permintaan gagal (HTTP ${res.status})`;
    throw new ApiError(message, res.status);
  }

  return data as T;
}

export function extractKK(file: File): Promise<KKExtractionResponse> {
  const formData = new FormData();
  formData.append("file", file);
  return request<KKExtractionResponse>("/api/py/extract", {
    method: "POST",
    body: formData,
  });
}

export function createKK(
  payload: KKCreateRequest
): Promise<IdentitasKKResponse> {
  return request<IdentitasKKResponse>("/api/py/kk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function listKK(search?: string): Promise<IdentitasKKResponse[]> {
  const q = search?.trim();
  const suffix = q ? `?search=${encodeURIComponent(q)}` : "";
  return request<IdentitasKKResponse[]>(`/api/py/kk${suffix}`);
}

export function getKK(id: string): Promise<IdentitasKKResponse> {
  return request<IdentitasKKResponse>(`/api/py/kk/${encodeURIComponent(id)}`);
}

export function updateKK(
  id: string,
  payload: IdentitasKKBase
): Promise<IdentitasKKResponse> {
  return request<IdentitasKKResponse>(`/api/py/kk/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function deleteKK(id: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/api/py/kk/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function createAnggota(
  kkId: string,
  payload: AnggotaBase
): Promise<AnggotaResponse> {
  return request<AnggotaResponse>(
    `/api/py/kk/${encodeURIComponent(kkId)}/anggota`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
}

export function updateAnggota(
  anggotaId: string,
  payload: AnggotaBase
): Promise<AnggotaResponse> {
  return request<AnggotaResponse>(
    `/api/py/anggota/${encodeURIComponent(anggotaId)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
}

export function deleteAnggota(
  anggotaId: string
): Promise<{ message: string }> {
  return request<{ message: string }>(
    `/api/py/anggota/${encodeURIComponent(anggotaId)}`,
    {
      method: "DELETE",
    }
  );
}
