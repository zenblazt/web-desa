"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DeleteAllBeritaButton({ count }: { count: number }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function handleDeleteAll() {
    if (count === 0) return;
    const step1 = confirm(`Hapus SEMUA ${count} berita? Tindakan ini tidak bisa dibatalkan.`);
    if (!step1) return;
    const typed = prompt('Ketik "HAPUS SEMUA" (tanpa tanda kutip) untuk konfirmasi final:');
    if (typed?.trim().toUpperCase() !== "HAPUS SEMUA") {
      alert("Konfirmasi tidak cocok, dibatalkan.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/berita?confirm=HAPUS_SEMUA", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus");
      router.refresh();
    } catch (err: any) {
      alert(`Gagal: ${err.message}`);
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
