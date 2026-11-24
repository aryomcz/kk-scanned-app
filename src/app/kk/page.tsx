"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  FileText,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError, deleteKK, listKK } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { IdentitasKKResponse } from "@/types/kk";

function formatAlamat(kk: IdentitasKKResponse): string {
  const parts = [
    kk.alamat,
    kk.rt_rw ? `RT/RW ${kk.rt_rw}` : null,
    kk.desa_kelurahan,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "-";
}

function formatWilayah(kk: IdentitasKKResponse): string {
  const parts = [kk.kecamatan, kk.kabupaten_kota].filter(Boolean);
  return parts.length > 0 ? parts.join(" / ") : "-";
}

export default function KKDirectoryPage() {
  const [items, setItems] = useState<IdentitasKKResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [editTarget, setEditTarget] = useState<IdentitasKKResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IdentitasKKResponse | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const refreshList = useCallback(() => {
    setLoading(true);
    setError(null);
    setRefreshTick((t) => t + 1);
  }, []);

  useEffect(() => {
    if (search === debouncedSearch) return;
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, debouncedSearch]);

  useEffect(() => {
    let active = true;
    listKK(debouncedSearch)
      .then((data) => {
        if (!active) return;
        setItems(data);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        const msg =
          err instanceof ApiError || err instanceof Error
            ? err.message
            : "Gagal memuat daftar Kartu Keluarga.";
        setError(msg);
        toast.error(msg);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [debouncedSearch, refreshTick]);

  const handleClearSearch = () => {
    setSearch("");
    if (debouncedSearch !== "") {
      setLoading(true);
      setError(null);
      setDebouncedSearch("");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteKK(deleteTarget.id);
      toast.success(
        "Data KK beserta seluruh anggota keluarga berhasil dihapus."
      );
      setDeleteTarget(null);
      refreshList();
    } catch (err) {
      const msg =
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Gagal menghapus data KK.";
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Daftar Kartu Keluarga
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Penelusuran arsip identitas Kartu Keluarga (
            <code className="font-mono text-xs">tbl_identitasKK</code>). Klik
            &ldquo;Lihat Anggota&rdquo; untuk mengelola anggota keluarga.
          </p>
        </div>

        <Link
          href="/upload"
          className={cn(buttonVariants({ variant: "default" }))}
        >
          <Plus className="size-4" />
          <span>Upload KK Baru</span>
        </Link>
      </div>

      <Card>
        <CardHeader className="border-b border-border">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>Tabel Identitas KK</CardTitle>
                <Badge variant="outline" className="tabular-nums">
                  {items.length} KK
                </Badge>
              </div>
              <CardDescription className="mt-0.5">
                Cari berdasarkan No. KK 16 digit atau nama kepala keluarga.
              </CardDescription>
            </div>

            <div className="flex w-full items-center gap-2 sm:w-auto">
              <div className="relative flex-1 sm:w-72">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari No. KK atau Kepala Keluarga..."
                  aria-label="Cari Kartu Keluarga"
                  className="pr-8 pl-8"
                />
                {search ? (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    aria-label="Bersihkan pencarian"
                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                ) : null}
              </div>

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={refreshList}
                disabled={loading}
                aria-label="Muat ulang daftar KK"
              >
                <RefreshCw
                  className={cn("size-4", loading && "animate-spin")}
                />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {error ? (
            <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={refreshList}
              >
                Coba Lagi
              </Button>
            </div>
          ) : loading && items.length === 0 ? (
            <div className="flex items-center justify-center gap-2.5 py-16 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              <span>Memuat data Kartu Keluarga...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
              <FileText className="mb-2.5 size-8 text-muted-foreground/50" />
              <p className="text-sm font-medium text-foreground">
                {debouncedSearch
                  ? "Tidak ada data KK yang cocok"
                  : "Belum ada data Kartu Keluarga tersimpan"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {debouncedSearch
                  ? `Tidak ditemukan KK dengan kata kunci "${debouncedSearch}".`
                  : "Mulai dengan mengunggah gambar Kartu Keluarga di halaman Scan / Upload KK."}
              </p>
              <div className="mt-4">
                {debouncedSearch ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleClearSearch}
                  >
                    Reset Pencarian
                  </Button>
                ) : (
                  <Link
                    href="/upload"
                    className={cn(buttonVariants({ size: "sm" }))}
                  >
                    <Plus className="size-3.5" />
                    <span>Upload KK Pertama</span>
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-4">No. KK</TableHead>
                  <TableHead>Nama Kepala Keluarga</TableHead>
                  <TableHead>Alamat</TableHead>
                  <TableHead>Kecamatan / Kota</TableHead>
                  <TableHead>Jumlah Anggota</TableHead>
                  <TableHead className="pr-4 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="pl-4 font-mono font-medium tabular-nums">
                      {row.no_kk}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {row.nama_kepala_keluarga}
                    </TableCell>
                    <TableCell className="min-w-[200px] max-w-[280px] whitespace-normal text-muted-foreground">
                      {formatAlamat(row)}
                    </TableCell>
                    <TableCell className="min-w-[160px] max-w-[220px] whitespace-normal text-muted-foreground">
                      {formatWilayah(row)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="tabular-nums">
                        {row.jumlah_anggota ?? 0} Orang
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/kk/${row.id}`}
                          className={cn(
                            buttonVariants({ variant: "outline", size: "sm" })
                          )}
                        >
                          <Users className="size-3.5" />
                          <span>Lihat Anggota</span>
                        </Link>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEditTarget(row)}
                        >
                          <Pencil className="size-3.5" />
                          <span>Edit Identitas</span>
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteTarget(row)}
                        >
                          <Trash2 className="size-3.5" />
                          <span>Hapus KK</span>
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

      <EditIdentitasModal
        open={Boolean(editTarget)}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
        kk={editTarget}
        onSuccess={refreshList}
      />

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mb-1 flex size-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <AlertTriangle className="size-5" />
            </div>
            <DialogTitle>Hapus Kartu Keluarga?</DialogTitle>
            <DialogDescription>
              Anda akan menghapus data KK{" "}
              <span className="font-mono font-semibold text-foreground">
                {deleteTarget?.no_kk}
              </span>{" "}
              atas nama{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.nama_kepala_keluarga}
              </span>
              . Tindakan ini bersifat permanen dan{" "}
              <strong className="font-semibold text-destructive">
                seluruh data anggota keluarga ({deleteTarget?.jumlah_anggota ?? 0}{" "}
                orang) pada KK ini juga akan ikut terhapus
              </strong>{" "}
              (cascade).
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
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
    </div>
  );
}
