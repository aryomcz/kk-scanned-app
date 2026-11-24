"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
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
import { ApiError, updateKK } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  EMPTY_IDENTITAS_FORM,
  IDENTITAS_FIELDS,
  type IdentitasFormValues,
  identitasFormSchema,
  toIdentitasFormValues,
  toIdentitasPayload,
} from "@/lib/validators";
import type { IdentitasKKResponse } from "@/types/kk";

interface EditIdentitasModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kk: IdentitasKKResponse | null;
  onSuccess: () => void | Promise<void>;
}

export function EditIdentitasModal({
  open,
  onOpenChange,
  kk,
  onSuccess,
}: EditIdentitasModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<IdentitasFormValues>({
    resolver: zodResolver(identitasFormSchema),
    defaultValues: EMPTY_IDENTITAS_FORM,
  });

  useEffect(() => {
    if (open && kk) {
      reset(toIdentitasFormValues(kk));
    }
  }, [open, kk, reset]);

  const onSubmit = async (values: IdentitasFormValues) => {
    if (!kk) return;
    try {
      await updateKK(kk.id, toIdentitasPayload(values));
      toast.success("Identitas Kartu Keluarga berhasil diperbarui.");
      await onSuccess();
      onOpenChange(false);
    } catch (err) {
      const msg =
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Gagal memperbarui identitas KK.";
      toast.error(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit Identitas Kartu Keluarga</DialogTitle>
          <DialogDescription>
            Perbarui data header pada{" "}
            <code className="font-mono text-xs">tbl_identitasKK</code>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            {IDENTITAS_FIELDS.map((field) => {
              const err = errors[field.name];
              const id = `edit-identitas-${field.name}`;
              return (
                <div key={field.name} className={cn("space-y-1", field.colSpan)}>
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
              ) : (
                <>
                  <Save className="size-4" />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
