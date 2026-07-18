"use client";

import * as React from "react";
import useSWR from "swr";
import { Plus, Trash2, Loader2, Star, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImageUploader } from "@/components/admin/image-uploader";
import { AiTabWidget } from "@/components/admin/ai-tab-widget";
import { EditDialog } from "@/components/admin/edit-dialog";
import { useModal } from "@/components/shared/modal-provider";

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const CATEGORIES = ["Kuliner", "Kerajinan", "Jasa", "Pertanian", "Lainnya"];

const emptyForm = { name: "", ownerName: "", category: "Kuliner", description: "", image: "", phone: "", whatsapp: "", address: "", isFeatured: false };

export default function AdminUmkmPage() {
  const { data, mutate } = useSWR("/api/umkm", fetcher);
  const items = data?.items ?? [];
  const { confirm } = useModal();

  const [form, setForm] = React.useState(emptyForm);
  const [saving, setSaving] = React.useState(false);

  const [editItem, setEditItem] = React.useState<any>(null);
  const [editForm, setEditForm] = React.useState(emptyForm);
  const [editSaving, setEditSaving] = React.useState(false);

  async function create() {
    if (!form.name.trim() || !form.ownerName.trim()) return;
    setSaving(true);
    await fetch("/api/umkm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm(emptyForm);
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
    const ok = await confirm({
      title: "Hapus UMKM",
      description: "Hapus UMKM ini? Aksi ini tidak bisa dibatalkan.",
      variant: "danger",
      confirmText: "Hapus",
    });
    if (!ok) return;
    await fetch(`/api/umkm/${id}`, { method: "DELETE" });
    mutate();
  }

  function openEdit(item: any) {
    setEditItem(item);
    setEditForm({
      name: item.name ?? "",
      ownerName: item.ownerName ?? "",
      category: item.category ?? "Kuliner",
      description: item.description ?? "",
      image: item.image ?? "",
      phone: item.phone ?? "",
      whatsapp: item.whatsapp ?? "",
      address: item.address ?? "",
      isFeatured: !!item.isFeatured,
    });
  }

  async function saveEdit() {
    if (!editItem) return;
    setEditSaving(true);
    try {
      await fetch(`/api/umkm/${editItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      setEditItem(null);
      mutate();
    } finally {
      setEditSaving(false);
    }
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
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
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
              <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => remove(item.id)} className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </Card>

      <EditDialog
        open={!!editItem}
        onOpenChange={(open) => !open && setEditItem(null)}
        title="Edit UMKM"
        onSave={saveEdit}
        saving={editSaving}
      >
        <ImageUploader value={editForm.image} onChange={(url) => setEditForm({ ...editForm, image: url })} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input placeholder="Nama usaha" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
          <Input placeholder="Nama pemilik" value={editForm.ownerName} onChange={(e) => setEditForm({ ...editForm, ownerName: e.target.value })} />
        </div>
        <select value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm">
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <textarea
          placeholder="Deskripsi usaha"
          value={editForm.description}
          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
          rows={3}
          className="w-full rounded-xl border border-input bg-background p-3 text-sm shadow-sm"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input placeholder="No. telepon" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
          <Input placeholder="No. WhatsApp" value={editForm.whatsapp} onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })} />
        </div>
        <Input placeholder="Alamat" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={editForm.isFeatured} onChange={(e) => setEditForm({ ...editForm, isFeatured: e.target.checked })} /> Tandai sebagai UMKM unggulan
        </label>
      </EditDialog>
    </div>
  );
}
