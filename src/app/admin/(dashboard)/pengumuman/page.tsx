"use client";

import * as React from "react";
import useSWR from "swr";
import { Plus, Trash2, Pin, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { AiTabWidget } from "@/components/admin/ai-tab-widget";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AdminPengumumanPage() {
  const { data, mutate } = useSWR("/api/pengumuman", fetcher);
  const items = data?.items ?? [];

  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");
  const [category, setCategory] = React.useState("Umum");
  const [isPinned, setIsPinned] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  async function create(status: "DRAFT" | "PUBLISHED") {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    await fetch("/api/pengumuman", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content, category, isPinned, status }),
    });
    setTitle(""); setContent(""); setIsPinned(false);
    setSaving(false);
    mutate();
  }

  async function togglePublish(item: any) {
    await fetch(`/api/pengumuman/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: item.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED" }),
    });
    mutate();
  }

  async function remove(id: string) {
    if (!confirm("Hapus pengumuman ini?")) return;
    await fetch(`/api/pengumuman/${id}`, { method: "DELETE" });
    mutate();
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pengumuman</h1>
        <p className="text-sm text-muted-foreground">Kelola pengumuman resmi untuk warga.</p>
      </div>

      <AiTabWidget contentType="PENGUMUMAN" />

      <Card>
        <CardHeader><CardTitle className="text-base">Tambah Pengumuman</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Judul" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea
            placeholder="Isi pengumuman"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-input bg-background p-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="flex flex-wrap items-center gap-3">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-10 rounded-xl border border-input bg-background px-3 text-sm">
              <option>Umum</option>
              <option>Penting</option>
              <option>Darurat</option>
              <option>Kegiatan</option>
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)} /> Sematkan (pin)
            </label>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => create("DRAFT")} disabled={saving}>Simpan Draft</Button>
            <Button onClick={() => create("PUBLISHED")} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Publish
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="divide-y divide-border p-0">
        {items.length === 0 && <p className="p-5 text-sm text-muted-foreground">Belum ada pengumuman.</p>}
        {items.map((item: any) => (
          <div key={item.id} className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {item.isPinned && <Pin className="h-3.5 w-3.5 text-primary" />}
                <p className="truncate text-sm font-medium">{item.title}</p>
              </div>
              <p className="text-xs text-muted-foreground">{item.category} · {formatDate(item.createdAt)}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge
                variant={item.status === "PUBLISHED" ? "default" : "secondary"}
                className="cursor-pointer"
                onClick={() => togglePublish(item)}
              >
                {item.status}
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
