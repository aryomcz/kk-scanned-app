"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Home,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  Users,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { toast } from "sonner";
import { AnggotaFormModal } from "@/components/AnggotaFormModal";
import { EditIdentitasModal } from "@/components/EditIdentitasModal";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError, deleteAnggota, deleteKK, getKK } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { AnggotaResponse, IdentitasKKResponse } from "@/types/kk";

function val(v: string | null | undefined): string {
  return v && v.trim() !== "" ? v : "-";
}

function formatTtl(anggota: AnggotaResponse): string {
  const tempat = anggota.tempat_lahir?.trim();
  const tanggal = anggota.tanggal_lahir?.trim();
  if (tempat && tanggal) return `${tempat}, ${tanggal}`;
  return tempat || tanggal || "-";
}

export default function KKDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex max-w-7xl items-center justify-center px-4 py-24 sm:px-6">
          <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            <span>Memuat detail Kartu Keluarga...</span>
          </div>
        </div>
      }
    >
      <KKDetailWorkspace />
    </Suspense>
  );
}

function KKDetailWorkspace() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const kkId = typeof params?.id === "string" ? params.id : "";

  const [kk, setKk] = useState<IdentitasKKResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [editIdentitasOpen, setEditIdentitasOpen] = useState(false);
  const [deleteKKOpen, setDeleteKKOpen] = useState(false);
  const [isDeletingKK, setIsDeletingKK] = useState(false);

  const [anggotaModalOpen, setAnggotaModalOpen] = useState(false);
  const [editingAnggota, setEditingAnggota] = useState<AnggotaResponse | null>(
    null
  );
  const [deleteAnggotaTarget, setDeleteAnggotaTarget] =
    useState<AnggotaResponse | null>(null);
  const [isDeletingAnggota, setIsDeletingAnggota] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const refreshDetail = useCallback(() => {
    setLoading(true);
    setError(null);
    setRefreshTick((t) => t + 1);
  }, []);

  useEffect(() => {
    if (!kkId) return;
    let active = true;
    getKK(kkId)
      .then((data) => {
        if (!active) return;
        setKk(data);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        const msg =
          err instanceof ApiError || err instanceof Error
            ? err.message
            : "Gagal memuat detail Kartu Keluarga.";
        setError(msg);
        toast.error(msg);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [kkId, refreshTick]);

  const handleConfirmDeleteKK = async () => {
    if (!kk || isDeletingKK) return;
    setIsDeletingKK(true);
    try {
      await deleteKK(kk.id);
      toast.success(
        "Data KK beserta seluruh anggota keluarga berhasil dihapus."
      );
      setDeleteKKOpen(false);
      router.push("/kk");
    } catch (err) {
      const msg =
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Gagal menghapus data KK.";
      toast.error(msg);
    } finally {
      setIsDeletingKK(false);
    }
  };

  const handleConfirmDeleteAnggota = async () => {
    if (!deleteAnggotaTarget || isDeletingAnggota) return;
    setIsDeletingAnggota(true);
    try {
      await deleteAnggota(deleteAnggotaTarget.id);
      toast.success("Anggota keluarga berhasil dihapus.");
      setDeleteAnggotaTarget(null);
      refreshDetail();
    } catch (err) {
      const msg =
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Gagal menghapus anggota keluarga.";
      toast.error(msg);
    } finally {
      setIsDeletingAnggota(false);
    }
  };

  const openAddAnggota = () => {
    setEditingAnggota(null);
    setAnggotaModalOpen(true);
  };

  const openEditAnggota = (anggota: AnggotaResponse) => {
    setEditingAnggota(anggota);
    setAnggotaModalOpen(true);
  };

  const openPreview = () => {
    setZoom(100);
    setPreviewOpen(true);
  };

  if (loading && !kk && Boolean(kkId)) {
    return (
      <div className="mx-auto flex max-w-7xl items-center justify-center px-4 py-24 sm:px-6">
        <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          <span>Memuat detail Kartu Keluarga...</span>
        </div>
      </div>
    );
  }

  if (error || !kk) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Data KK Tidak Dapat Dimuat</CardTitle>
            <CardDescription>
              {error || "Data Kartu Keluarga tidak ditemukan."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Link
              href="/kk"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              <ArrowLeft className="size-4" />
              <span>Kembali ke Daftar KK</span>
            </Link>
            <Button type="button" onClick={refreshDetail}>
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const anggotaList = kk.anggota ?? [];

  const addressItems = [
    { label: "Alamat", value: val(kk.alamat), span: "sm:col-span-2" },
    { label: "RT / RW", value: val(kk.rt_rw), mono: true },
    { label: "Kode Pos", value: val(kk.kode_pos), mono: true },
  ];

  const regionItems = [
    { label: "Desa / Kelurahan", value: val(kk.desa_kelurahan) },
    { label: "Kecamatan", value: val(kk.kecamatan) },
    { label: "Kabupaten / Kota", value: val(kk.kabupaten_kota) },
    { label: "Provinsi", value: val(kk.provinsi) },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="justify-between border-t-2 border-t-primary lg:col-span-8">
          <CardHeader>
            <div>
              <Link
                href="/kk"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="size-3.5" />
                <span>Kembali ke Daftar KK</span>
              </Link>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="font-mono tabular-nums">
                No. KK {kk.no_kk}
              </Badge>
              <Badge variant="outline" className="tabular-nums">
                {anggotaList.length} Anggota
              </Badge>
            </div>
            <CardTitle className="mt-1 text-2xl font-semibold tracking-tight">
              {kk.nama_kepala_keluarga}
            </CardTitle>
            <CardDescription>
              Detail arsip Kartu Keluarga (<code className="font-mono text-xs">tbl_identitasKK</code>) beserta manajemen anggota keluarga.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2 pt-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditIdentitasOpen(true)}
            >
              <Pencil className="size-3.5" />
              <span>Edit Identitas KK</span>
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setDeleteKKOpen(true)}
            >
              <Trash2 className="size-3.5" />
              <span>Hapus KK</span>
            </Button>
          </CardContent>
        </Card>

        <Card className="justify-between lg:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ImageIcon className="size-4 text-primary" />
              <span>Arsip Scan Dokumen KK</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Buka pratinjau ukuran penuh dengan kontrol zoom.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {kk.image_url ? (
              <div className="overflow-hidden rounded-lg border border-border bg-muted/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={kk.image_url}
                  alt={`Thumbnail Kartu Keluarga ${kk.no_kk}`}
                  className="h-24 w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-xs text-muted-foreground">
                Gambar dokumen tidak tersedia
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={openPreview}
              disabled={!kk.image_url}
            >
              <ImageIcon className="size-3.5" />
              <span>Lihat Gambar KK</span>
            </Button>
          </CardContent>
        </Card>

        <Card className="sm:col-span-6 lg:col-span-4">
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Home className="size-4 text-primary" />
              <span>Alamat Domisili</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {addressItems.map((item) => (
                <div key={item.label} className={cn("space-y-0.5", item.span)}>
                  <dt className="text-xs font-medium text-muted-foreground">
                    {item.label}
                  </dt>
                  <dd
                    className={cn(
                      "text-sm font-medium text-foreground",
                      item.mono && "font-mono tabular-nums"
                    )}
                  >
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card className="sm:col-span-6 lg:col-span-5">
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <MapPin className="size-4 text-primary" />
              <span>Wilayah Administratif</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {regionItems.map((item) => (
                <div key={item.label} className="space-y-0.5">
                  <dt className="text-xs font-medium text-muted-foreground">
                    {item.label}
                  </dt>
                  <dd className="text-sm font-medium text-foreground">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card className="justify-between lg:col-span-3">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 font-medium text-foreground">
              <Users className="size-4 text-primary" />
              <span>Anggota Keluarga</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-3xl font-semibold tracking-tight text-foreground tabular-nums">
                {anggotaList.length}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Anggota terdaftar pada KK ini
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              className="w-full"
              onClick={openAddAnggota}
            >
              <Plus className="size-3.5" />
              <span>Tambah Anggota</span>
            </Button>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="border-b border-border">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>Daftar Anggota Keluarga</CardTitle>
                <Badge variant="outline" className="tabular-nums">
                  {anggotaList.length} Orang
                </Badge>
              </div>
              <CardDescription className="mt-0.5">
                Seluruh baris anggota milik KK ini pada{" "}
                <code className="font-mono text-xs">
                  tbl_anggotaKeluargaKK
                </code>
                .
              </CardDescription>
            </div>

            <Button type="button" size="sm" onClick={openAddAnggota}>
              <Plus className="size-3.5" />
              <span>Tambah Anggota</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {anggotaList.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
              <Users className="mb-2.5 size-8 text-muted-foreground/50" />
              <p className="text-sm font-medium text-foreground">
                Belum ada anggota keluarga tercatat
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Tambahkan anggota keluarga baru ke Kartu Keluarga ini.
              </p>
              <Button
                type="button"
                size="sm"
                className="mt-4"
                onClick={openAddAnggota}
              >
                <Plus className="size-3.5" />
                <span>Tambah Anggota</span>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-4">No.</TableHead>
                  <TableHead>NIK</TableHead>
                  <TableHead>Nama Lengkap</TableHead>
                  <TableHead>L/P</TableHead>
                  <TableHead>Tempat, Tgl Lahir</TableHead>
                  <TableHead>Agama</TableHead>
                  <TableHead>Pendidikan</TableHead>
                  <TableHead>Pekerjaan</TableHead>
                  <TableHead>Status Kawin / Gol. Darah</TableHead>
                  <TableHead>Status Hubungan</TableHead>
                  <TableHead>Kewarganegaraan / Dokumen</TableHead>
                  <TableHead>Orang Tua (Ayah / Ibu)</TableHead>
                  <TableHead className="pr-4 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {anggotaList.map((row, idx) => (
                  <TableRow key={row.id}>
                    <TableCell className="pl-4 font-mono text-xs text-muted-foreground tabular-nums">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="font-mono text-xs font-medium tabular-nums">
                      {row.nik}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {row.nama_lengkap}
                    </TableCell>
                    <TableCell>{val(row.jenis_kelamin)}</TableCell>
                    <TableCell className="min-w-[150px] whitespace-normal">
                      {formatTtl(row)}
                    </TableCell>
                    <TableCell>{val(row.agama)}</TableCell>
                    <TableCell className="min-w-[130px] whitespace-normal">
                      {val(row.pendidikan)}
                    </TableCell>
                    <TableCell className="min-w-[130px] whitespace-normal">
                      {val(row.jenis_pekerjaan)}
                    </TableCell>
                    <TableCell className="min-w-[140px] whitespace-normal">
                      <div>{val(row.status_perkawinan)}</div>
                      {row.tanggal_perkawinan || row.golongan_darah ? (
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {row.tanggal_perkawinan ? (
                            <span className="font-mono tabular-nums">
                              {row.tanggal_perkawinan}
                            </span>
                          ) : null}
                          {row.tanggal_perkawinan && row.golongan_darah
                            ? " · "
                            : null}
                          {row.golongan_darah
                            ? `Gol. ${row.golongan_darah}`
                            : null}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {row.status_hubungan_keluarga ? (
                        <Badge variant="outline">
                          {row.status_hubungan_keluarga}
                        </Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="min-w-[140px] whitespace-normal">
                      <div>{val(row.kewarganegaraan)}</div>
                      {row.no_paspor || row.no_kitap ? (
                        <div className="mt-0.5 font-mono text-xs text-muted-foreground tabular-nums">
                          {row.no_paspor ? `Paspor: ${row.no_paspor}` : ""}
                          {row.no_paspor && row.no_kitap ? " · " : ""}
                          {row.no_kitap ? `KITAP: ${row.no_kitap}` : ""}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="min-w-[150px] whitespace-normal text-xs">
                      <div>
                        <span className="text-muted-foreground">Ayah: </span>
                        {val(row.nama_ayah)}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Ibu: </span>
                        {val(row.nama_ibu)}
                      </div>
                    </TableCell>
                    <TableCell className="pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openEditAnggota(row)}
                        >
                          <Pencil className="size-3.5" />
                          <span>Edit</span>
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteAnggotaTarget(row)}
                        >
                          <Trash2 className="size-3.5" />
                          <span>Hapus</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[92vh] sm:max-w-4xl">
          <DialogHeader>
            <div className="flex flex-wrap items-center justify-between gap-2 pr-8">
              <div>
                <DialogTitle>Pratinjau Dokumen KK</DialogTitle>
                <DialogDescription className="font-mono text-xs tabular-nums">
                  No. KK {kk.no_kk} — {kk.nama_kepala_keluarga}
                </DialogDescription>
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
          </DialogHeader>

          {kk.image_url ? (
            <div className="max-h-[70vh] overflow-auto rounded-lg border border-border bg-muted/40 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={kk.image_url}
                alt={`Gambar Kartu Keluarga ${kk.no_kk}`}
                style={{ width: `${zoom}%` }}
                className="mx-auto h-auto max-w-none rounded select-none"
              />
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Gambar dokumen KK tidak tersedia.
            </p>
          )}
        </DialogContent>
      </Dialog>

      <EditIdentitasModal
        open={editIdentitasOpen}
        onOpenChange={setEditIdentitasOpen}
        kk={kk}
        onSuccess={refreshDetail}
      />

      <AnggotaFormModal
        open={anggotaModalOpen}
        onOpenChange={(open) => {
          setAnggotaModalOpen(open);
          if (!open) setEditingAnggota(null);
        }}
        kkId={kk.id}
        anggota={editingAnggota}
        onSuccess={refreshDetail}
      />

      <Dialog
        open={deleteKKOpen}
        onOpenChange={(open) => {
          if (!isDeletingKK) setDeleteKKOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mb-1 flex size-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <AlertTriangle className="size-5" />
            </div>
            <DialogTitle>Hapus Kartu Keluarga?</DialogTitle>
            <DialogDescription>
              Anda akan menghapus KK{" "}
              <span className="font-mono font-semibold text-foreground">
                {kk.no_kk}
              </span>{" "}
              atas nama{" "}
              <span className="font-medium text-foreground">
                {kk.nama_kepala_keluarga}
              </span>
              . Seluruh data anggota keluarga ({anggotaList.length} orang) serta
              gambar dokumen terkait akan ikut terhapus secara permanen.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteKKOpen(false)}
              disabled={isDeletingKK}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDeleteKK}
              disabled={isDeletingKK}
            >
              {isDeletingKK ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Menghapus...</span>
                </>
              ) : (
                <>
                  <Trash2 className="size-4" />
                  <span>Ya, Hapus KK</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteAnggotaTarget)}
        onOpenChange={(open) => {
          if (!open && !isDeletingAnggota) setDeleteAnggotaTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mb-1 flex size-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <AlertTriangle className="size-5" />
            </div>
            <DialogTitle>Hapus Anggota Keluarga?</DialogTitle>
            <DialogDescription>
              Anda akan menghapus anggota keluarga{" "}
              <span className="font-medium text-foreground">
                {deleteAnggotaTarget?.nama_lengkap}
              </span>{" "}
              (NIK{" "}
              <span className="font-mono font-semibold text-foreground">
                {deleteAnggotaTarget?.nik}
              </span>
              ) dari Kartu Keluarga ini.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteAnggotaTarget(null)}
              disabled={isDeletingAnggota}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDeleteAnggota}
              disabled={isDeletingAnggota}
            >
              {isDeletingAnggota ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Menghapus...</span>
                </>
              ) : (
                <>
                  <Trash2 className="size-4" />
                  <span>Ya, Hapus Anggota</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
