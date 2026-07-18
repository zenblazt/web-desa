"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Save, Send, Trash2, Loader2, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUploader } from "@/components/admin/image-uploader";
import { useModal } from "@/components/shared/modal-provider";

interface BeritaFormValues {
  id?: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string;
  category: string;
  tags: string;
  status: "DRAFT" | "PUBLISHED";
  metaTitle: string;
  metaDescription: string;
  keywords: string;
}

const EMPTY: BeritaFormValues = {
  title: "", excerpt: "", content: "", coverImage: "", category: "Umum", tags: "",
  status: "DRAFT", metaTitle: "", metaDescription: "", keywords: "",
};

export function BeritaForm({ initial }: { initial?: Partial<BeritaFormValues> }) {
  const router = useRouter();
  const [values, setValues] = React.useState<BeritaFormValues>({ ...EMPTY, ...initial });
  const [saving, setSaving] = React.useState(false);
  const [generatingTags, setGeneratingTags] = React.useState(false);
  const { confirm, alert } = useModal();

  function set<K extends keyof BeritaFormValues>(key: K, val: BeritaFormValues[K]) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  async function save(status: "DRAFT" | "PUBLISHED") {
    setSaving(true);
    const payload = { ...values, status };

    const res = values.id
      ? await fetch(`/api/berita/${values.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/berita", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

    setSaving(false);
    if (res.ok) router.push("/admin/berita");
  }

  async function remove() {
    if (!values.id) return;
    const ok = await confirm({
      title: "Hapus Berita",
      description: "Yakin hapus berita ini? Aksi ini tidak bisa dibatalkan.",
      variant: "danger",
      confirmText: "Hapus",
    });
    if (!ok) return;
    await fetch(`/api/berita/${values.id}`, { method: "DELETE" });
    router.push("/admin/berita");
  }

  async function generateTags() {
    if (!values.title.trim() || !values.content.trim()) {
      await alert("Isi judul dan konten berita dulu sebelum generate tag otomatis.");
      return;
    }
    setGeneratingTags(true);
    try {
      const res = await fetch("/api/ai/generate-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: values.title, excerpt: values.excerpt, content: values.content }),
      });
      const data = await res.json();
      if (!res.ok) {
        await alert(data.error || "Gagal generate tag otomatis.");
        return;
      }
      set("tags", data.tags || "");
    } finally {
      setGeneratingTags(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{values.id ? "Edit Berita" : "Tulis Berita Baru"}</h1>
        <div className="flex gap-2">
          {values.id && (
            <Button variant="ghost" onClick={remove} className="text-destructive">
              <Trash2 className="h-4 w-4" /> Hapus
            </Button>
          )}
          <Button variant="outline" onClick={() => save("DRAFT")} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Simpan Draft
          </Button>
          <Button onClick={() => save("PUBLISHED")} disabled={saving}>
            <Send className="h-4 w-4" /> Publish
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardContent className="space-y-4 pt-5">
              <Input placeholder="Judul berita" value={values.title} onChange={(e) => set("title", e.target.value)} />
              <textarea
                placeholder="Ringkasan singkat (excerpt)"
                value={values.excerpt}
                onChange={(e) => set("excerpt", e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-input bg-background p-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <textarea
                placeholder="Isi berita lengkap"
                value={values.content}
                onChange={(e) => set("content", e.target.value)}
                rows={14}
                className="w-full rounded-xl border border-input bg-background p-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">SEO Metadata</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Meta title" value={values.metaTitle} onChange={(e) => set("metaTitle", e.target.value)} />
              <textarea
                placeholder="Meta description"
                value={values.metaDescription}
                onChange={(e) => set("metaDescription", e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-input bg-background p-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Input placeholder="Keywords (pisah koma)" value={values.keywords} onChange={(e) => set("keywords", e.target.value)} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle className="text-base">Gambar Sampul</CardTitle></CardHeader>
            <CardContent>
              <ImageUploader value={values.coverImage} onChange={(url) => set("coverImage", url)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Kategori & Tag</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Kategori (mis. Pembangunan)" value={values.category} onChange={(e) => set("category", e.target.value)} />
              <Input placeholder="Tags (pisah koma)" value={values.tags} onChange={(e) => set("tags", e.target.value)} />
              <Button type="button" variant="outline" size="sm" onClick={generateTags} disabled={generatingTags} className="w-full">
                {generatingTags ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Generate Tag Otomatis (AI)
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
