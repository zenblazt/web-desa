"use client";

import * as React from "react";
import useSWR from "swr";
import Image from "next/image";
import { Trash2, Plus, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ImageUploader } from "@/components/admin/image-uploader";
import { AiTabWidget } from "@/components/admin/ai-tab-widget";
import { EditDialog } from "@/components/admin/edit-dialog";
import { useModal } from "@/components/shared/modal-provider";

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const CATEGORIES = ["Kegiatan", "Wisata", "Fasilitas", "Umum"];

export default function AdminGaleriPage() {
  const { data, mutate } = useSWR("/api/galeri", fetcher);
  const items = data?.items ?? [];
  const { confirm } = useModal();

  const [title, setTitle] = React.useState("");
  const [image, setImage] = React.useState("");
  const [category, setCategory] = React.useState("Kegiatan");

  const [editItem, setEditItem] = React.useState<any>(null);
  const [editForm, setEditForm] = React.useState({ title: "", image: "", category: "Kegiatan" });
  const [saving, setSaving] = React.useState(false);

  async function add() {
    if (!title.trim() || !image) return;
    await fetch("/api/galeri", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, image, category }),
    });
    setTitle(""); setImage("");
    mutate();
  }

  async function remove(id: string) {
    const ok = await confirm({
      title: "Hapus Foto",
      description: "Hapus foto ini dari galeri?",
      variant: "danger",
      confirmText: "Hapus",
    });
    if (!ok) return;
    await fetch(`/api/galeri/${id}`, { method: "DELETE" });
    mutate();
  }

  function openEdit(photo: any) {
    setEditItem(photo);
    setEditForm({ title: photo.title ?? "", image: photo.image ?? "", category: photo.category ?? "Kegiatan" });
  }

  async function saveEdit() {
    if (!editItem) return;
    setSaving(true);
    try {
      await fetch(`/api/galeri/${editItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
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
        <h1 className="text-2xl font-bold tracking-tight">Galeri</h1>
        <p className="text-sm text-muted-foreground">Kelola dokumentasi foto kegiatan desa.</p>
      </div>

      <AiTabWidget contentType="GALERI" />

      <Card>
        <CardHeader><CardTitle className="text-base">Tambah Foto</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <ImageUploader value={image} onChange={setImage} />
          <Input placeholder="Judul foto" value={title} onChange={(e) => setTitle(e.target.value)} />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm">
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <Button onClick={add}><Plus className="h-4 w-4" /> Tambah</Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((photo: any) => (
          <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted">
            <Image src={photo.image} alt={photo.title} fill className="object-cover" />
            <div className="absolute right-2 top-2 flex gap-1.5">
              <button
                onClick={() => openEdit(photo)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => remove(photo.id)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
              <p className="truncate text-xs font-medium text-white">{photo.title}</p>
            </div>
          </div>
        ))}
      </div>

      <EditDialog
        open={!!editItem}
        onOpenChange={(open) => !open && setEditItem(null)}
        title="Edit Foto"
        onSave={saveEdit}
        saving={saving}
      >
        <ImageUploader value={editForm.image} onChange={(url) => setEditForm({ ...editForm, image: url })} />
        <Input placeholder="Judul foto" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
        <select
          value={editForm.category}
          onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
          className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
        >
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </EditDialog>
    </div>
  );
}
