import unittest

from api.services.ocr_service import Word, _parse_identity, _parse_members, _words_from_results


def row(y: int, cells: list[tuple[float, str]], width: int = 1000) -> list[Word]:
    return [
        Word(text=text, left=round(x * width), top=y, width=max(10, len(text) * 6), height=12)
        for x, text in cells
    ]


class OCRParserTest(unittest.TestCase):
    def test_converts_paddle_result_to_positioned_words(self):
        words = _words_from_results(
            [
                {
                    "rec_texts": ["BUDI SANTOSO"],
                    "rec_scores": [0.98],
                    "rec_boxes": [[10, 20, 100, 40]],
                    "text_word": [["BUDI", " ", "SANTOSO"]],
                    "text_word_boxes": [[[10, 20, 50, 40], [51, 20, 55, 40], [56, 20, 100, 40]]],
                }
            ]
        )

        self.assertEqual(
            words,
            [
                Word(text="BUDI", left=10, top=20, width=40, height=20),
                Word(text="SANTOSO", left=56, top=20, width=44, height=20),
            ],
        )

    def test_parses_identity_and_both_member_tables(self):
        rows = [
            row(20, [(0.30, "KARTU KELUARGA"), (0.55, "No. 3276010101010001")]),
            row(45, [(0.05, "Nama Kepala Keluarga : BUDI SANTOSO"), (0.65, "Provinsi : JAWA BARAT")]),
            row(65, [(0.05, "Alamat : JL. MELATI 1"), (0.65, "Kabupaten/Kota : KOTA DEPOK")]),
            row(300, [(0.01, "1"), (0.06, "BUDI SANTOSO"), (0.22, "3276011205800001"), (0.35, "LAKI-LAKI"), (0.43, "JAKARTA"), (0.52, "12-05-1980"), (0.60, "ISLAM"), (0.67, "S1"), (0.79, "KARYAWAN"), (0.95, "O")]),
            row(500, [(0.05, "STATUS PERKAWINAN"), (0.40, "KEWARGANEGARAAN")]),
            row(540, [(0.01, "1"), (0.06, "KAWIN"), (0.18, "17-08-2005"), (0.28, "KEPALA KELUARGA"), (0.45, "WNI"), (0.72, "SUHARTO"), (0.88, "SITI AMINAH")]),
        ]

        identity = _parse_identity(rows, 800)
        members = _parse_members(rows, 1000, 800)

        self.assertEqual(identity.no_kk, "3276010101010001")
        self.assertEqual(identity.nama_kepala_keluarga, "BUDI SANTOSO")
        self.assertEqual(identity.provinsi, "JAWA BARAT")
        self.assertEqual(len(members), 1)
        self.assertEqual(members[0].nik, "3276011205800001")
        self.assertEqual(members[0].tanggal_lahir, "1980-05-12")
        self.assertEqual(members[0].status_hubungan_keluarga, "KEPALA KELUARGA")
        self.assertEqual(members[0].nama_ibu, "SITI AMINAH")


if __name__ == "__main__":
    unittest.main()
