"use client";

import * as React from "react";
import useSWR from "swr";
import Image from "next/image";
import { Trash2, Plus, User2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ImageUploader } from "@/components/admin/image-uploader";
import { AiTabWidget } from "@/components/admin/ai-tab-widget";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AdminPerangkatPage() {
  const { data, mutate } = useSWR("/api/perangkat", fetcher);
  const items = data?.items ?? [];

  const [form, setForm] = React.useState({ name: "", position: "", photo: "", phone: "", email: "" });

  async function add() {
    if (!form.name.trim() || !form.position.trim()) return;
    await fetch("/api/perangkat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ name: "", position: "", photo: "", phone: "", email: "" });
    mutate();
  }

  async function remove(id: string) {
    if (!confirm("Hapus data perangkat ini?")) return;
    await fetch(`/api/perangkat/${id}`, { method: "DELETE" });
    mutate();
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Perangkat Desa</h1>
        <p className="text-sm text-muted-foreground">Kelola struktur organisasi pemerintah desa.</p>
      </div>

      <AiTabWidget contentType="PERANGKAT_DESA" />

      <Card>
        <CardHeader><CardTitle className="text-base">Tambah Perangkat</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <ImageUploader value={form.photo} onChange={(url) => setForm({ ...form, photo: url })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Nama lengkap" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Jabatan (mis. Kepala Desa)" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="No. telepon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <Button onClick={add}><Plus className="h-4 w-4" /> Tambah</Button>
        </CardContent>
      </Card>

      <Card className="divide-y divide-border p-0">
        {items.length === 0 && <p className="p-5 text-sm text-muted-foreground">Belum ada data perangkat.</p>}
        {items.map((p: any) => (
          <div key={p.id} className="flex items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 overflow-hidden rounded-full bg-muted">
                {p.photo ? <Image src={p.photo} alt={p.name} fill className="object-cover" /> : (
                  <div className="flex h-full items-center justify-center text-muted-foreground"><User2 className="h-4 w-4" /></div>
                )}
              </div>
              <div>
                <p className="text-sm font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.position}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => remove(p.id)} className="text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </Card>
    </div>
  );
}
