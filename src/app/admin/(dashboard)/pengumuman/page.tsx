"use client";

import * as React from "react";
import useSWR from "swr";
import { Plus, Trash2, Pin, Loader2, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { AiTabWidget } from "@/components/admin/ai-tab-widget";
import { EditDialog } from "@/components/admin/edit-dialog";
import { useModal } from "@/components/shared/modal-provider";

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const CATEGORIES = ["Umum", "Penting", "Darurat", "Kegiatan"];

export default function AdminPengumumanPage() {
  const { data, mutate } = useSWR("/api/pengumuman", fetcher);
  const items = data?.items ?? [];
  const { confirm } = useModal();

  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");
  const [category, setCategory] = React.useState("Umum");
  const [isPinned, setIsPinned] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const [editItem, setEditItem] = React.useState<any>(null);
  const [editForm, setEditForm] = React.useState({ title: "", content: "", category: "Umum", isPinned: false });
  const [editSaving, setEditSaving] = React.useState(false);

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
    const ok = await confirm({
      title: "Hapus Pengumuman",
      description: "Hapus pengumuman ini? Aksi ini tidak bisa dibatalkan.",
      variant: "danger",
      confirmText: "Hapus",
    });
    if (!ok) return;
    await fetch(`/api/pengumuman/${id}`, { method: "DELETE" });
    mutate();
  }

  function openEdit(item: any) {
    setEditItem(item);
    setEditForm({
      title: item.title ?? "",
      content: item.content ?? "",
      category: item.category ?? "Umum",
      isPinned: !!item.isPinned,
    });
  }

  async function saveEdit() {
    if (!editItem) return;
    setEditSaving(true);
    try {
      await fetch(`/api/pengumuman/${editItem.id}`, {
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
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
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
        title="Edit Pengumuman"
        onSave={saveEdit}
        saving={editSaving}
      >
        <Input placeholder="Judul" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
        <textarea
          placeholder="Isi pengumuman"
          value={editForm.content}
          onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
          rows={4}
          className="w-full rounded-xl border border-input bg-background p-3 text-sm shadow-sm"
        />
        <div className="flex flex-wrap items-center gap-3">
          <select value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} className="h-10 rounded-xl border border-input bg-background px-3 text-sm">
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={editForm.isPinned} onChange={(e) => setEditForm({ ...editForm, isPinned: e.target.checked })} /> Sematkan (pin)
          </label>
        </div>
      </EditDialog>
    </div>
  );
}
