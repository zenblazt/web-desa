"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useModal } from "@/components/shared/modal-provider";

export function DeleteAllBeritaButton({ count }: { count: number }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const { confirm, alert } = useModal();

  async function handleDeleteAll() {
    if (count === 0) return;
    const ok = await confirm({
      title: "Hapus Semua Berita",
      description: `Hapus SEMUA ${count} berita? Tindakan ini tidak bisa dibatalkan.`,
      variant: "danger",
      confirmText: "Hapus Semua",
      typeToConfirm: "HAPUS SEMUA",
    });
    if (!ok) return;

    setBusy(true);
    try {
      const res = await fetch("/api/berita?confirm=HAPUS_SEMUA", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus");
      router.refresh();
    } catch (err: any) {
      await alert(`Gagal: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  if (count === 0) return null;

  return (
    <Button variant="destructive" onClick={handleDeleteAll} disabled={busy}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      Hapus Semua
    </Button>
  );
}
