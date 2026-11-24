"use client";

import { memo, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  type Control,
  type FieldErrors,
  type UseFormRegister,
  useFieldArray,
  useForm,
  useWatch,
} from "react-hook-form";
import {
  ChevronDown,
  ChevronRight,
  FileWarning,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, createKK } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  EMPTY_ANGGOTA_FORM,
  EMPTY_IDENTITAS_FORM,
  type IdentitasFormValues,
  type AnggotaFormValues,
  type KKFormValues,
  kkFormSchema,
  toAnggotaFormValues,
  toAnggotaPayload,
  toIdentitasFormValues,
  toIdentitasPayload,
} from "@/lib/validators";
import { KK_DRAFT_STORAGE_KEY, type KKDraftSession } from "@/types/kk";

interface FieldSpec<K extends string> {
  name: K;
  label: string;
  required?: boolean;
  placeholder?: string;
  mono?: boolean;
  colSpan?: string;
  maxLength?: number;
}

const IDENTITAS_FIELDS: FieldSpec<keyof IdentitasFormValues>[] = [
  {
    name: "no_kk",
    label: "No. KK (16 Digit)",
    required: true,
    mono: true,
    maxLength: 16,
    placeholder: "3276010101010001",
  },
  {
    name: "nama_kepala_keluarga",
    label: "Nama Kepala Keluarga",
    required: true,
    placeholder: "BUDI SANTOSO",
  },
  {
    name: "alamat",
    label: "Alamat",
    colSpan: "sm:col-span-2",
    placeholder: "JL. MARGONDA RAYA NO. 10",
  },
  { name: "rt_rw", label: "RT / RW", mono: true, placeholder: "001/002" },
  { name: "kode_pos", label: "Kode Pos", mono: true, placeholder: "16424" },
  { name: "desa_kelurahan", label: "Desa / Kelurahan" },
  { name: "kecamatan", label: "Kecamatan" },
  { name: "kabupaten_kota", label: "Kabupaten / Kota" },
  { name: "provinsi", label: "Provinsi" },
];

const ANGGOTA_FIELDS: FieldSpec<keyof AnggotaFormValues>[] = [
  {
    name: "nik",
    label: "NIK (16 Digit)",
    required: true,
    mono: true,
    maxLength: 16,
  },
  { name: "nama_lengkap", label: "Nama Lengkap", required: true },
  {
    name: "jenis_kelamin",
    label: "Jenis Kelamin",
    placeholder: "LAKI-LAKI / PEREMPUAN",
  },
  { name: "tempat_lahir", label: "Tempat Lahir" },
  {
    name: "tanggal_lahir",
    label: "Tanggal Lahir",
    mono: true,
    placeholder: "YYYY-MM-DD",
  },
  { name: "agama", label: "Agama" },
  { name: "pendidikan", label: "Pendidikan" },
  { name: "jenis_pekerjaan", label: "Jenis Pekerjaan" },
  { name: "golongan_darah", label: "Golongan Darah" },
  { name: "status_perkawinan", label: "Status Perkawinan" },
  {
    name: "tanggal_perkawinan",
    label: "Tanggal Perkawinan",
    mono: true,
    placeholder: "YYYY-MM-DD",
  },
  { name: "status_hubungan_keluarga", label: "Status Hubungan Keluarga" },
  { name: "kewarganegaraan", label: "Kewarganegaraan", placeholder: "WNI" },
  { name: "no_paspor", label: "No. Paspor", mono: true },
  { name: "no_kitap", label: "No. KITAP", mono: true },
  { name: "nama_ayah", label: "Nama Ayah" },
  { name: "nama_ibu", label: "Nama Ibu" },
];

interface AnggotaCardProps {
  index: number;
  control: Control<KKFormValues>;
  register: UseFormRegister<KKFormValues>;
  errors?: FieldErrors<AnggotaFormValues>;
  canRemove: boolean;
  onRemove: () => void;
}

const AnggotaCard = memo(function AnggotaCard({
  index,
  control,
  register,
  errors,
  canRemove,
  onRemove,
}: AnggotaCardProps) {
  const [expanded, setExpanded] = useState(true);
  const nama = useWatch({ control, name: `anggota.${index}.nama_lengkap` });
  const nik = useWatch({ control, name: `anggota.${index}.nik` });
  const hasErrors = Boolean(errors && Object.keys(errors).length > 0);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border bg-card",
        hasErrors ? "border-destructive/60" : "border-border"
      )}
    >
      <div className="flex items-center justify-between gap-2 bg-muted/40 px-3 py-2">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          {expanded ? (
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          )}
          <Badge variant="outline" className="tabular-nums">
            #{index + 1}
          </Badge>
          <span className="truncate text-sm font-medium text-foreground">
            {nama || "Anggota Baru"}
          </span>
          {nik ? (
            <span className="hidden font-mono text-xs text-muted-foreground tabular-nums sm:inline">
              {nik}
            </span>
          ) : null}
          {hasErrors ? (
            <Badge variant="destructive" className="ml-auto sm:ml-1">
              Perlu koreksi
            </Badge>
          ) : null}
        </button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={onRemove}
          disabled={!canRemove}
        >
          <Trash2 className="size-3.5" />
          <span className="hidden sm:inline">Hapus Baris</span>
        </Button>
      </div>

      {expanded ? (
        <div className="grid grid-cols-1 gap-3 border-t border-border p-3.5 sm:grid-cols-2 xl:grid-cols-3">
          {ANGGOTA_FIELDS.map((field) => {
            const err = errors?.[field.name];
            const id = `anggota-${index}-${field.name}`;
            return (
              <div key={field.name} className="space-y-1">
                <Label htmlFor={id} className="text-xs text-muted-foreground">
                  {field.label}
                  {field.required ? (
                    <span className="text-destructive">*</span>
                  ) : null}
                </Label>
                <Input
                  id={id}
                  placeholder={field.placeholder}
                  maxLength={field.maxLength}
                  aria-invalid={Boolean(err)}
                  className={cn(
                    "h-8 text-sm",
                    field.mono && "font-mono tabular-nums"
                  )}
                  {...register(`anggota.${index}.${field.name}`)}
                />
                {err?.message ? (
                  <p className="text-[11px] text-destructive">{err.message}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
});

const emptySubscribe = () => () => {};

export default function ConfirmPage() {
  const rawDraft = useSyncExternalStore(
    emptySubscribe,
    () => sessionStorage.getItem(KK_DRAFT_STORAGE_KEY),
    () => undefined
  );

  const draft = useMemo<KKDraftSession | null>(() => {
    if (!rawDraft) return null;
    try {
      return JSON.parse(rawDraft) as KKDraftSession;
    } catch {
      return null;
    }
  }, [rawDraft]);

  if (rawDraft === undefined) {
    return (
      <div className="mx-auto flex max-w-7xl items-center justify-center px-4 py-24 sm:px-6">
        <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          <span>Memuat hasil ekstraksi...</span>
        </div>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
        <Card>
          <CardHeader>
            <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <FileWarning className="size-5" />
            </div>
            <CardTitle>Belum ada hasil ekstraksi</CardTitle>
            <CardDescription>
              Unggah gambar Kartu Keluarga terlebih dahulu di halaman Upload KK.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/upload"
              className={cn(buttonVariants({ variant: "default" }))}
            >
              Ke Halaman Upload KK
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <ConfirmWorkspace draft={draft} />;
}

function ConfirmWorkspace({ draft }: { draft: KKDraftSession }) {
  const router = useRouter();
  const [zoom, setZoom] = useState<number>(100);
  const imageDataUrl = draft.imageDataUrl || "";
  const fileName = draft.fileName || "dokumen-kk";

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<KKFormValues>({
    resolver: zodResolver(kkFormSchema),
    defaultValues: {
      identitas: toIdentitasFormValues(draft.identitas || EMPTY_IDENTITAS_FORM),
      anggota:
        draft.anggota?.length > 0
          ? draft.anggota.map(toAnggotaFormValues)
          : [EMPTY_ANGGOTA_FORM],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "anggota",
  });

  const onSubmit = async (values: KKFormValues) => {
    try {
      const saved = await createKK({
        identitas: toIdentitasPayload(values.identitas),
        anggota: values.anggota.map(toAnggotaPayload),
        image_base64: imageDataUrl || null,
      });

      sessionStorage.removeItem(KK_DRAFT_STORAGE_KEY);
      toast.success("Data Kartu Keluarga berhasil disimpan.");
      router.push(`/kk/${saved.id}`);
    } catch (err) {
      const msg =
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Gagal menyimpan data KK.";
      toast.error(msg);
    }
  };

  const anggotaArrayError =
    errors.anggota?.message || errors.anggota?.root?.message;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Konfirmasi &amp; Koreksi Data KK
            </h1>
            <Badge variant="secondary">Draft Belum Tersimpan</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Cocokkan hasil pembacaan dengan dokumen asli di sebelah kiri sebelum
            disimpan ke database.
          </p>
        </div>

        <Link
          href="/upload"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Upload Ulang
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        <Card className="lg:sticky lg:top-20 lg:col-span-5">
          <CardHeader className="border-b border-border">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <CardTitle className="truncate text-sm">{fileName}</CardTitle>
                <CardDescription className="text-xs">
                  Dokumen asli pembanding
                </CardDescription>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setZoom((z) => Math.max(50, z - 25))}
                  disabled={zoom <= 50}
                  aria-label="Perkecil gambar"
                >
                  <ZoomOut className="size-3.5" />
                </Button>
                <Badge
                  variant="outline"
                  className="min-w-12 justify-center font-mono tabular-nums"
                >
                  {zoom}%
                </Badge>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setZoom((z) => Math.min(250, z + 25))}
                  disabled={zoom >= 250}
                  aria-label="Perbesar gambar"
                >
                  <ZoomIn className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setZoom(100)}
                  disabled={zoom === 100}
                  aria-label="Reset zoom"
                >
                  <RotateCcw className="size-3.5" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {imageDataUrl ? (
              <div className="max-h-[calc(100vh-13rem)] overflow-auto rounded-lg border border-border bg-muted/40 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageDataUrl}
                  alt="Preview dokumen KK"
                  style={{ width: `${zoom}%` }}
                  className="h-auto max-w-none rounded select-none"
                />
              </div>
            ) : (
              <p className="py-12 text-center text-xs text-muted-foreground">
                Preview gambar tidak tersedia.
              </p>
            )}
          </CardContent>
        </Card>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5 lg:col-span-7"
          noValidate
        >
          <Card>
            <CardHeader className="border-b border-border">
              <CardTitle>Bagian 1 — Identitas Kartu Keluarga</CardTitle>
              <CardDescription>
                Data header KK yang akan disimpan ke{" "}
                <code className="font-mono text-xs">tbl_identitasKK</code>.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {IDENTITAS_FIELDS.map((field) => {
                const err = errors.identitas?.[field.name];
                const id = `identitas-${field.name}`;
                return (
                  <div
                    key={field.name}
                    className={cn("space-y-1", field.colSpan)}
                  >
                    <Label
                      htmlFor={id}
                      className="text-xs text-muted-foreground"
                    >
                      {field.label}
                      {field.required ? (
                        <span className="text-destructive">*</span>
                      ) : null}
                    </Label>
                    <Input
                      id={id}
                      placeholder={field.placeholder}
                      maxLength={field.maxLength}
                      aria-invalid={Boolean(err)}
                      className={cn(
                        "h-8 text-sm",
                        field.mono && "font-mono tabular-nums"
                      )}
                      {...register(`identitas.${field.name}`)}
                    />
                    {err?.message ? (
                      <p className="text-[11px] text-destructive">
                        {err.message}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-border">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle>Bagian 2 — Anggota Keluarga</CardTitle>
                    <Badge variant="outline" className="tabular-nums">
                      {fields.length} Orang
                    </Badge>
                  </div>
                  <CardDescription className="mt-0.5">
                    Periksa NIK, nama lengkap, tanggal lahir, dan relasi
                    keluarga.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append(EMPTY_ANGGOTA_FORM)}
                >
                  <Plus className="size-3.5" />
                  <span>Tambah Anggota</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {anggotaArrayError ? (
                <p className="text-xs text-destructive">{anggotaArrayError}</p>
              ) : null}

              {fields.map((field, index) => (
                <AnggotaCard
                  key={field.id}
                  index={index}
                  control={control}
                  register={register}
                  errors={errors.anggota?.[index]}
                  canRemove={fields.length > 1}
                  onRemove={() => remove(index)}
                />
              ))}
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-3 rounded-xl border border-border bg-background p-4">
            <Link
              href="/upload"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Batal
            </Link>
            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  <span>Simpan ke Database</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
