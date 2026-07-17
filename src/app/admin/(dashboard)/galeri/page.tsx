"use client";

import * as React from "react";
import useSWR from "swr";
import Image from "next/image";
import { Trash2, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ImageUploader } from "@/components/admin/image-uploader";
import { AiTabWidget } from "@/components/admin/ai-tab-widget";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AdminGaleriPage() {
  const { data, mutate } = useSWR("/api/galeri", fetcher);
  const items = data?.items ?? [];

  const [title, setTitle] = React.useState("");
  const [image, setImage] = React.useState("");
  const [category, setCategory] = React.useState("Kegiatan");

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
    if (!confirm("Hapus foto ini?")) return;
    await fetch(`/api/galeri/${id}`, { method: "DELETE" });
    mutate();
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
            <option>Kegiatan</option><option>Wisata</option><option>Fasilitas</option><option>Umum</option>
          </select>
          <Button onClick={add}><Plus className="h-4 w-4" /> Tambah</Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((photo: any) => (
          <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted">
            <Image src={photo.image} alt={photo.title} fill className="object-cover" />
            <button
              onClick={() => remove(photo.id)}
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
              <p className="truncate text-xs font-medium text-white">{photo.title}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
