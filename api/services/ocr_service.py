from dataclasses import dataclass
from io import BytesIO
import re
from threading import Lock
from typing import Any

import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError

from api.core.config import OCR_LANGUAGE
from api.schemas.kk_schema import AnggotaBase, IdentitasKKBase, KKExtractionResponse


class OCRUnavailableError(RuntimeError):
    pass


@dataclass
class Word:
    text: str
    left: int
    top: int
    width: int
    height: int

    @property
    def center_x(self) -> float:
        return self.left + self.width / 2

    @property
    def center_y(self) -> float:
        return self.top + self.height / 2


IDENTITY_LABELS = {
    "nama_kepala_keluarga": r"NAMA\s+KEPALA\s+KELUARGA",
    "alamat": r"ALAMAT",
    "rt_rw": r"RT\s*/?\s*RW",
    "kode_pos": r"KODE\s+POS",
    "desa_kelurahan": r"DESA\s*/?\s*KELURAHAN",
    "kecamatan": r"KECAMATAN",
    "kabupaten_kota": r"KABUPATEN\s*/?\s*KOTA",
    "provinsi": r"PROVINSI",
}

# Posisi kolom relatif pada format KK Indonesia yang baku.
TOP_COLUMNS = (0, 0.04, 0.205, 0.34, 0.41, 0.505, 0.585, 0.65, 0.75, 0.93, 1)
BOTTOM_COLUMNS = (0, 0.04, 0.16, 0.255, 0.43, 0.50, 0.60, 0.69, 0.85, 1)

_ocr: Any = None
_ocr_init_lock = Lock()
_ocr_predict_lock = Lock()


def _clean(value: str) -> str | None:
    value = re.sub(r"\s+", " ", value).strip(" :|.-")
    return None if not value or value in {"-", "--"} else value


def _digits(value: str) -> str:
    return re.sub(r"\D", "", value.translate(str.maketrans("OIl", "011")))


def _date(value: str) -> str | None:
    value = value.translate(str.maketrans("OoIl", "0011"))
    match = re.search(r"\b(\d{1,2})[./-](\d{1,2})[./-](\d{4})\b", value)
    return "-".join(match.groups()) if match else _clean(value)


def _prepare_image(image_bytes: bytes) -> Image.Image:
    try:
        image = Image.open(BytesIO(image_bytes))
        image.load()
    except (UnidentifiedImageError, OSError) as exc:
        raise ValueError("File tidak dapat dibaca sebagai gambar.") from exc

    image = ImageOps.exif_transpose(image).convert("L")
    if image.width < 2400:
        scale = 2400 / image.width
        image = image.resize((2400, round(image.height * scale)), Image.Resampling.LANCZOS)
    return ImageOps.autocontrast(image)


def _get_ocr():
    global _ocr
    if _ocr is None:
        with _ocr_init_lock:
            if _ocr is None:
                from paddleocr import PaddleOCR

                _ocr = PaddleOCR(
                    lang=OCR_LANGUAGE,
                    use_doc_orientation_classify=False,
                    use_doc_unwarping=False,
                    use_textline_orientation=False,
                    return_word_box=True,
                )
    return _ocr


def _words_from_results(results: list[Any]) -> list[Word]:
    words: list[Word] = []
    for result in results:
        texts = result["rec_texts"]
        scores = result["rec_scores"]
        boxes = result["rec_boxes"]
        word_texts = result.get("text_word")
        word_boxes = result.get("text_word_boxes")
        if word_texts and word_boxes:
            for line_texts, line_boxes, score in zip(word_texts, word_boxes, scores):
                if float(score) < 0.25:
                    continue
                for text, box in zip(line_texts, line_boxes):
                    text = str(text).strip()
                    if not text:
                        continue
                    left, top, right, bottom = (int(value) for value in box)
                    words.append(
                        Word(
                            text=text,
                            left=left,
                            top=top,
                            width=right - left,
                            height=bottom - top,
                        )
                    )
            continue
        for text, score, box in zip(texts, scores, boxes):
            text = re.sub(r"\s+", " ", str(text)).strip()
            if not text or float(score) < 0.25:
                continue
            left, top, right, bottom = (int(value) for value in box)
            words.append(
                Word(
                    text=text,
                    left=left,
                    top=top,
                    width=right - left,
                    height=bottom - top,
                )
            )
    return words


def _group_rows(words: list[Word], image_height: int) -> list[list[Word]]:
    tolerance = max(8, round(image_height * 0.006))
    rows: list[list[Word]] = []
    for word in sorted(words, key=lambda item: (item.center_y, item.left)):
        if rows and abs(word.center_y - sum(item.center_y for item in rows[-1]) / len(rows[-1])) <= tolerance:
            rows[-1].append(word)
        else:
            rows.append([word])
    return [sorted(row, key=lambda item: item.left) for row in rows]


def _row_text(row: list[Word]) -> str:
    return " ".join(word.text for word in row)


def _parse_identity(rows: list[list[Word]], image_height: int) -> IdentitasKKBase:
    header_lines = [_row_text(row).upper() for row in rows if row[0].top < image_height * 0.38]
    header = "\n".join(header_lines)
    labels = "|".join(f"(?:{pattern})" for pattern in IDENTITY_LABELS.values())
    values: dict[str, str | None] = {}

    for field, pattern in IDENTITY_LABELS.items():
        match = re.search(
            rf"(?:{pattern})\s*[:=]?\s*(.*?)(?=\s+(?:{labels})\s*[:=]?|$)",
            header,
            re.MULTILINE,
        )
        values[field] = _clean(match.group(1)) if match else None

    no_kk = ""
    for line in header_lines:
        if "KELUARGA" in line or re.search(r"\bNO\.?\b", line):
            candidates = re.findall(r"(?:\d[\s.-]*){16}", line)
            if candidates:
                no_kk = _digits(candidates[-1])[:16]
                break

    return IdentitasKKBase(no_kk=no_kk, **values)


def _columns(row: list[Word], image_width: int, boundaries: tuple[float, ...]) -> list[str]:
    columns = [[] for _ in range(len(boundaries) - 1)]
    for word in row:
        position = word.center_x / image_width
        for index, (start, end) in enumerate(zip(boundaries, boundaries[1:])):
            if start <= position < end or index == len(columns) - 1 and position <= end:
                columns[index].append(word.text)
                break
    return [" ".join(column).strip() for column in columns]


def _parse_members(rows: list[list[Word]], image_width: int, image_height: int) -> list[AnggotaBase]:
    primary: list[tuple[int, AnggotaBase]] = []
    primary_bottom = 0.0

    for row in rows:
        if row[0].top < image_height * 0.25:
            continue
        columns = _columns(row, image_width, TOP_COLUMNS)
        nik = _digits(columns[2])[:16]
        if len(nik) != 16:
            continue
        number_digits = _digits(columns[0])
        number = int(number_digits) if number_digits else len(primary) + 1
        primary.append(
            (
                number,
                AnggotaBase(
                    nama_lengkap=_clean(columns[1]) or "",
                    nik=nik,
                    jenis_kelamin=_clean(columns[3]),
                    tempat_lahir=_clean(columns[4]),
                    tanggal_lahir=_date(columns[5]),
                    agama=_clean(columns[6]),
                    pendidikan=_clean(columns[7]),
                    jenis_pekerjaan=_clean(columns[8]),
                    golongan_darah=_clean(columns[9]),
                ),
            )
        )
        primary_bottom = max(primary_bottom, max(word.center_y for word in row))

    bottom_header_y = next(
        (
            min(word.top for word in row)
            for row in rows
            if min(word.top for word in row) > primary_bottom
            and ("STATUS PERKAWINAN" in _row_text(row).upper() or "KEWARGANEGARAAN" in _row_text(row).upper())
        ),
        primary_bottom,
    )
    secondary: dict[int, list[str]] = {}
    for row in rows:
        if min(word.top for word in row) <= bottom_header_y:
            continue
        columns = _columns(row, image_width, BOTTOM_COLUMNS)
        number_digits = _digits(columns[0])
        if not number_digits or not 1 <= int(number_digits) <= 20:
            continue
        if sum(bool(_clean(column)) for column in columns[1:]) < 3:
            continue
        secondary[int(number_digits)] = columns

    members: list[AnggotaBase] = []
    for number, member in primary:
        columns = secondary.get(number)
        if columns:
            member = member.model_copy(
                update={
                    "status_perkawinan": _clean(columns[1]),
                    "tanggal_perkawinan": _date(columns[2]),
                    "status_hubungan_keluarga": _clean(columns[3]),
                    "kewarganegaraan": _clean(columns[4]) or "WNI",
                    "no_paspor": _clean(columns[5]),
                    "no_kitap": _clean(columns[6]),
                    "nama_ayah": _clean(columns[7]),
                    "nama_ibu": _clean(columns[8]),
                }
            )
        members.append(member)
    return members


def extract_kk_data(image_bytes: bytes, _mime_type: str) -> KKExtractionResponse:
    image = _prepare_image(image_bytes)
    try:
        engine = _get_ocr()
        with _ocr_predict_lock:
            results = list(engine.predict(np.asarray(image.convert("RGB"))))
    except Exception as exc:
        raise OCRUnavailableError(f"PaddleOCR gagal dijalankan: {exc}") from exc

    rows = _group_rows(_words_from_results(results), image.height)
    identity = _parse_identity(rows, image.height)
    members = _parse_members(rows, image.width, image.height)
    if not identity.no_kk and not members:
        raise ValueError("Teks KK tidak terbaca. Gunakan scan yang lurus, tajam, dan beresolusi tinggi.")
    return KKExtractionResponse(identitas=identity, anggota=members)
