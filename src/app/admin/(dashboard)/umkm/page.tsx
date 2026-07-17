"use client";

import * as React from "react";
import useSWR from "swr";
import { Plus, Trash2, Loader2, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImageUploader } from "@/components/admin/image-uploader";
import { AiTabWidget } from "@/components/admin/ai-tab-widget";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AdminUmkmPage() {
  const { data, mutate } = useSWR("/api/umkm", fetcher);
  const items = data?.items ?? [];

  const [form, setForm] = React.useState({
    name: "", ownerName: "", category: "Kuliner", description: "", image: "", phone: "", whatsapp: "", address: "", isFeatured: false,
  });
  const [saving, setSaving] = React.useState(false);

  async function create() {
    if (!form.name.trim() || !form.ownerName.trim()) return;
    setSaving(true);
    await fetch("/api/umkm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ name: "", ownerName: "", category: "Kuliner", description: "", image: "", phone: "", whatsapp: "", address: "", isFeatured: false });
    setSaving(false);
    mutate();
  }

  async function toggleFeatured(item: any) {
    await fetch(`/api/umkm/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFeatured: !item.isFeatured }),
    });
    mutate();
  }

  async function remove(id: string) {
    if (!confirm("Hapus UMKM ini?")) return;
    await fetch(`/api/umkm/${id}`, { method: "DELETE" });
    mutate();
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">UMKM</h1>
        <p className="text-sm text-muted-foreground">Kelola direktori UMKM warga desa.</p>
      </div>

      <AiTabWidget contentType="UMKM" />

      <Card>
        <CardHeader><CardTitle className="text-base">Tambah UMKM</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <ImageUploader value={form.image} onChange={(url) => setForm({ ...form, image: url })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Nama usaha" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Nama pemilik" value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
          </div>
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm">
            <option>Kuliner</option><option>Kerajinan</option><option>Jasa</option><option>Pertanian</option><option>Lainnya</option>
          </select>
          <textarea
            placeholder="Deskripsi usaha"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full rounded-xl border border-input bg-background p-3 text-sm shadow-sm"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="No. telepon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input placeholder="No. WhatsApp (628xxx)" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
          </div>
          <Input placeholder="Alamat" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} /> Tandai sebagai UMKM unggulan
          </label>
          <Button onClick={create} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Tambah UMKM
          </Button>
        </CardContent>
      </Card>

      <Card className="divide-y divide-border p-0">
        {items.length === 0 && <p className="p-5 text-sm text-muted-foreground">Belum ada UMKM.</p>}
        {items.map((item: any) => (
          <div key={item.id} className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{item.name}</p>
              <p className="text-xs text-muted-foreground">{item.category} · {item.ownerName}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant={item.isFeatured ? "default" : "outline"} className="cursor-pointer" onClick={() => toggleFeatured(item)}>
                <Star className="mr-1 h-3 w-3" /> {item.isFeatured ? "Unggulan" : "Jadikan Unggulan"}
              </Badge>
              <Button variant="ghost" size="icon" onClick={() => remove(item.id)} className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
