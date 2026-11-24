import time
from google import genai
from google.genai import errors, types
from api.core.config import GEMINI_API_KEY
from api.schemas.kk_schema import KKExtractionResponse

SYSTEM_PROMPT = (
    "Ekstrak seluruh data dari dokumen Kartu Keluarga (KK) Indonesia ini secara akurat. "
    "Baca bagian header identitas KK (No. KK 16 digit, Nama Kepala Keluarga, Alamat, RT/RW, "
    "Kode Pos, Desa/Kelurahan, Kecamatan, Kabupaten/Kota, Provinsi). "
    "Untuk anggota keluarga, gabungkan baris nomor urut yang sama dari tabel bagian atas "
    "(Nama Lengkap, NIK 16 digit, Jenis Kelamin, Tempat Lahir, Tanggal Lahir, Agama, Pendidikan, "
    "Jenis Pekerjaan, Golongan Darah) dan tabel bagian bawah (Status Perkawinan, Tanggal Perkawinan, "
    "Status Hubungan Dalam Keluarga, Kewarganegaraan, No. Paspor, No. KITAP, Nama Ayah, Nama Ibu). "
    "Abai baris tabel yang kosong. Format seluruh tanggal menjadi YYYY-MM-DD. "
    "Jika kolom kosong atau berisi tanda strip (-), isi dengan null."
)


def extract_kk_data(image_bytes: bytes, mime_type: str) -> KKExtractionResponse:
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY belum diatur di .env")

    client = genai.Client(api_key=GEMINI_API_KEY)
    response = None
    for attempt in range(3):
        try:
            response = client.models.generate_content(
                model="gemini-3.5-flash",
                contents=[
                    types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                    SYSTEM_PROMPT,
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=KKExtractionResponse,
                    temperature=0.0,
                ),
            )
            break
        except errors.APIError as e:
            if getattr(e, "code", None) in (429, 503) and attempt < 2:
                time.sleep(attempt + 1)
                continue
            raise

    if not response or not response.text:
        raise RuntimeError("Gemini tidak mengembalikan hasil ekstraksi")

    return KKExtractionResponse.model_validate_json(response.text)
