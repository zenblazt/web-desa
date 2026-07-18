"use client";

import * as React from "react";
import useSWR from "swr";
import Image from "next/image";
import { Trash2, Plus, User2, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ImageUploader } from "@/components/admin/image-uploader";
import { AiTabWidget } from "@/components/admin/ai-tab-widget";
import { EditDialog } from "@/components/admin/edit-dialog";
import { useModal } from "@/components/shared/modal-provider";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const emptyForm = { name: "", position: "", photo: "", phone: "", email: "", bio: "", level: "1" };

export default function AdminPerangkatPage() {
  const { data, mutate } = useSWR("/api/perangkat", fetcher);
  const items = data?.items ?? [];
  const { confirm, alert } = useModal();

  const [form, setForm] = React.useState(emptyForm);

  const [editItem, setEditItem] = React.useState<any>(null);
  const [editForm, setEditForm] = React.useState(emptyForm);
  const [saving, setSaving] = React.useState(false);

  async function add() {
    if (!form.name.trim() || !form.position.trim()) return;
    await fetch("/api/perangkat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm(emptyForm);
    mutate();
  }

  async function updateLevel(id: string, level: number) {
    await fetch(`/api/perangkat/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level }),
    });
    mutate();
  }

  async function remove(id: string) {
    const ok = await confirm({
      title: "Hapus Perangkat",
      description: "Hapus data perangkat ini? Aksi ini tidak bisa dibatalkan.",
      variant: "danger",
      confirmText: "Hapus",
    });
    if (!ok) return;
    await fetch(`/api/perangkat/${id}`, { method: "DELETE" });
    mutate();
  }

  function openEdit(p: any) {
    setEditItem(p);
    setEditForm({
      name: p.name ?? "",
      position: p.position ?? "",
      photo: p.photo ?? "",
      phone: p.phone ?? "",
      email: p.email ?? "",
      bio: p.bio ?? "",
      level: String(p.level ?? 1),
    });
  }

  async function saveEdit() {
    if (!editItem) return;
    if (!editForm.name.trim() || !editForm.position.trim()) {
      await alert("Nama dan jabatan wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      await fetch(`/api/perangkat/${editItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editForm, level: Number(editForm.level) || 1 }),
      });
      setEditItem(null);
      mutate();
    } finally {
      setSaving(false);
    }
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
          <textarea
            placeholder="Deskripsi singkat tugas jabatan (tampil di kartu publik)"
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            rows={3}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Jenjang di Struktur Organisasi (1 = paling atas/Kepala Desa, makin besar makin bawah)
            </label>
            <Input
              type="number"
              min={1}
              placeholder="Jenjang (mis. 1)"
              value={form.level}
              onChange={(e) => setForm({ ...form, level: e.target.value })}
              className="max-w-[140px]"
            />
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
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                Jenjang
                <Input
                  type="number"
                  min={1}
                  value={p.level ?? 1}
                  onChange={(e) => updateLevel(p.id, Number(e.target.value) || 1)}
                  className="h-8 w-16"
                />
              </label>
              <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => remove(p.id)} className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </Card>

      <EditDialog
        open={!!editItem}
        onOpenChange={(open) => !open && setEditItem(null)}
        title="Edit Perangkat"
        onSave={saveEdit}
        saving={saving}
      >
        <ImageUploader value={editForm.photo} onChange={(url) => setEditForm({ ...editForm, photo: url })} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input placeholder="Nama lengkap" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
          <Input placeholder="Jabatan" value={editForm.position} onChange={(e) => setEditForm({ ...editForm, position: e.target.value })} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input placeholder="No. telepon" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
          <Input placeholder="Email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
        </div>
        <textarea
          placeholder="Deskripsi singkat tugas jabatan"
          value={editForm.bio}
          onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
          rows={3}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Jenjang</label>
          <Input
            type="number"
            min={1}
            value={editForm.level}
            onChange={(e) => setEditForm({ ...editForm, level: e.target.value })}
            className="max-w-[140px]"
          />
        </div>
      </EditDialog>
    </div>
  );
}
