"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  FileImage,
  Loader2,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ApiError, extractKK } from "@/lib/api";
import { cn } from "@/lib/utils";
import { KK_DRAFT_STORAGE_KEY, type KKDraftSession } from "@/types/kk";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);
const MAX_FILE_BYTES = 5 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Gagal membaca file gambar."));
    };
    reader.onerror = () => reject(new Error("Gagal membaca file gambar."));
    reader.readAsDataURL(file);
  });
}

function downscaleDataUrl(dataUrl: string, maxDim = 1800): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas tidak tersedia."));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => reject(new Error("Gagal memproses preview gambar."));
    img.src = dataUrl;
  });
}

async function saveDraftToSession(draft: KKDraftSession): Promise<void> {
  try {
    sessionStorage.setItem(KK_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    const compressed = await downscaleDataUrl(draft.imageDataUrl);
    sessionStorage.setItem(
      KK_DRAFT_STORAGE_KEY,
      JSON.stringify({ ...draft, imageDataUrl: compressed })
    );
  }
}

export default function UploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleSelectFile = useCallback(
    (selected: File | null | undefined) => {
      if (!selected) return;
      setErrorMsg(null);

      if (!ALLOWED_TYPES.has(selected.type.toLowerCase())) {
        const msg = "Format file tidak didukung. Gunakan JPG, PNG, atau WEBP.";
        setErrorMsg(msg);
        toast.error(msg);
        return;
      }
      if (selected.size > MAX_FILE_BYTES) {
        const msg = "Ukuran file melebihi batas maksimal 5 MB.";
        setErrorMsg(msg);
        toast.error(msg);
        return;
      }

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
    },
    [previewUrl]
  );

  const clearSelection = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setErrorMsg(null);
    if (inputRef.current) inputRef.current.value = "";
  }, [previewUrl]);

  const handleExtract = async () => {
    if (!file || isExtracting) return;
    setIsExtracting(true);
    setErrorMsg(null);

    try {
      const [extracted, imageDataUrl] = await Promise.all([
        extractKK(file),
        readFileAsDataUrl(file),
      ]);

      await saveDraftToSession({
        identitas: extracted.identitas,
        anggota: extracted.anggota,
        imageDataUrl,
        fileName: file.name,
      });

      toast.success("Ekstraksi selesai. Silakan periksa data sebelum simpan.");
      router.push("/confirm");
    } catch (err) {
      const msg =
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat mengekstrak gambar KK.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Scan &amp; Upload Kartu Keluarga
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Unggah foto atau scan KK untuk diekstrak otomatis ke formulir
            verifikasi.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">JPG / PNG / WEBP</Badge>
          <Badge variant="outline" className="tabular-nums">
            Maks. 5 MB
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        <Card className="lg:col-span-5">
          <CardHeader className="border-b border-border">
            <CardTitle>Berkas Dokumen</CardTitle>
            <CardDescription>
              Pilih gambar KK yang jelas dan terbaca agar hasil OCR akurat.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => handleSelectFile(e.target.files?.[0])}
              disabled={isExtracting}
            />

            <div
              role="button"
              tabIndex={0}
              onClick={() => !isExtracting && inputRef.current?.click()}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && !isExtracting) {
                  e.preventDefault();
                  inputRef.current?.click();
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (!isExtracting) setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (!isExtracting) handleSelectFile(e.dataTransfer.files?.[0]);
              }}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-4 py-10 text-center transition-colors",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-border bg-muted/30 hover:border-foreground/30 hover:bg-muted/50",
                isExtracting && "pointer-events-none opacity-60"
              )}
            >
              <div className="mb-3 flex size-10 items-center justify-center rounded-lg border border-border bg-background">
                <UploadCloud className="size-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">
                Tarik gambar ke sini atau klik untuk memilih
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Mendukung JPG, PNG, WEBP hingga 5 MB
              </p>
            </div>

            {file ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <FileImage className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {file.name}
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {formatBytes(file.size)}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={clearSelection}
                  disabled={isExtracting}
                  aria-label="Hapus file terpilih"
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : null}

            {errorMsg ? (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs text-destructive"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            ) : null}

            <Button
              type="button"
              size="lg"
              className="w-full"
              disabled={!file || isExtracting}
              onClick={handleExtract}
            >
              {isExtracting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Mengekstrak data KK...</span>
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  <span>Proses &amp; Ekstrak Data</span>
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-7">
          <CardHeader className="border-b border-border">
            <CardTitle>Pratinjau Dokumen</CardTitle>
            <CardDescription>
              Pastikan seluruh teks No. KK, NIK, dan tabel anggota terlihat
              jelas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {previewUrl ? (
              <div className="flex max-h-[540px] items-center justify-center overflow-auto rounded-lg border border-border bg-muted/40 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Preview gambar Kartu Keluarga"
                  className="max-h-[510px] w-auto rounded object-contain"
                />
              </div>
            ) : (
              <div className="flex h-72 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 text-center">
                <FileImage className="mb-2 size-8 text-muted-foreground/50" />
                <p className="text-sm font-medium text-muted-foreground">
                  Belum ada gambar dipilih
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground/80">
                  Preview dokumen KK akan tampil di sini.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
