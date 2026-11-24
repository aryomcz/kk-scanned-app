"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save, UserPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, createAnggota, updateAnggota } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  ANGGOTA_FIELDS,
  type AnggotaFormValues,
  EMPTY_ANGGOTA_FORM,
  anggotaFormSchema,
  toAnggotaFormValues,
  toAnggotaPayload,
} from "@/lib/validators";
import type { AnggotaResponse } from "@/types/kk";

interface AnggotaFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kkId: string;
  anggota?: AnggotaResponse | null;
  onSuccess: () => void | Promise<void>;
}

export function AnggotaFormModal({
  open,
  onOpenChange,
  kkId,
  anggota,
  onSuccess,
}: AnggotaFormModalProps) {
  const isEdit = Boolean(anggota);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AnggotaFormValues>({
    resolver: zodResolver(anggotaFormSchema),
    defaultValues: EMPTY_ANGGOTA_FORM,
  });

  useEffect(() => {
    if (open) {
      reset(anggota ? toAnggotaFormValues(anggota) : EMPTY_ANGGOTA_FORM);
    }
  }, [open, anggota, reset]);

  const onSubmit = async (values: AnggotaFormValues) => {
    const payload = toAnggotaPayload(values);
    try {
      if (anggota) {
        await updateAnggota(anggota.id, payload);
        toast.success("Data anggota keluarga berhasil diperbarui.");
      } else {
        await createAnggota(kkId, payload);
        toast.success("Anggota keluarga berhasil ditambahkan.");
      }
      await onSuccess();
      onOpenChange(false);
    } catch (err) {
      const msg =
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Gagal menyimpan data anggota keluarga.";
      toast.error(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Anggota Keluarga" : "Tambah Anggota Keluarga"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Perbarui rincian anggota keluarga pada tbl_anggotaKeluargaKK."
              : "Tambahkan anggota keluarga baru ke dalam Kartu Keluarga ini."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {ANGGOTA_FIELDS.map((field) => {
              const err = errors[field.name];
              const id = `modal-anggota-${field.name}`;
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
                    disabled={isSubmitting}
                    className={cn(
                      "h-8 text-sm",
                      field.mono && "font-mono tabular-nums"
                    )}
                    {...register(field.name)}
                  />
                  {err?.message ? (
                    <p className="text-[11px] text-destructive">{err.message}</p>
                  ) : null}
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : isEdit ? (
                <>
                  <Save className="size-4" />
                  <span>Simpan Perubahan</span>
                </>
              ) : (
                <>
                  <UserPlus className="size-4" />
                  <span>Tambah Anggota</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
