"use client";

import * as React from "react";
import useSWR from "swr";
import { Plus, Trash2, Loader2, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EditDialog } from "@/components/admin/edit-dialog";
import { useModal } from "@/components/shared/modal-provider";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const emptyForm = { title: "", description: "", requirements: "", procedure: "", duration: "", cost: "", isPopular: false };

export default function AdminLayananPage() {
  const { data, mutate } = useSWR("/api/layanan", fetcher);
  const items = data?.items ?? [];
  const { confirm } = useModal();

  const [form, setForm] = React.useState(emptyForm);
  const [saving, setSaving] = React.useState(false);

  const [editItem, setEditItem] = React.useState<any>(null);
  const [editForm, setEditForm] = React.useState(emptyForm);
  const [editSaving, setEditSaving] = React.useState(false);

  async function create() {
    if (!form.title.trim() || !form.description.trim()) return;
    setSaving(true);
    await fetch("/api/layanan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm(emptyForm);
    setSaving(false);
    mutate();
  }

  async function togglePopular(item: any) {
    await fetch(`/api/layanan/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPopular: !item.isPopular }),
    });
    mutate();
  }

  async function toggleActive(item: any) {
    await fetch(`/api/layanan/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !item.isActive }),
    });
    mutate();
  }

  async function remove(id: string) {
    const ok = await confirm({
      title: "Hapus Layanan",
      description: "Hapus layanan ini? Aksi ini tidak bisa dibatalkan.",
      variant: "danger",
      confirmText: "Hapus",
    });
    if (!ok) return;
    await fetch(`/api/layanan/${id}`, { method: "DELETE" });
    mutate();
  }

  function openEdit(item: any) {
    setEditItem(item);
    setEditForm({
      title: item.title ?? "",
      description: item.description ?? "",
      requirements: item.requirements ?? "",
      procedure: item.procedure ?? "",
      duration: item.duration ?? "",
      cost: item.cost ?? "",
      isPopular: !!item.isPopular,
    });
  }

  async function saveEdit() {
    if (!editItem) return;
    setEditSaving(true);
    try {
      await fetch(`/api/layanan/${editItem.id}`, {
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
        <h1 className="text-2xl font-bold tracking-tight">Layanan</h1>
        <p className="text-sm text-muted-foreground">Kelola daftar layanan administrasi desa.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Tambah Layanan</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Nama layanan" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea
            placeholder="Deskripsi singkat"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            className="w-full rounded-xl border border-input bg-background p-3 text-sm shadow-sm"
          />
          <textarea
            placeholder="Syarat-syarat"
            value={form.requirements}
            onChange={(e) => setForm({ ...form, requirements: e.target.value })}
            rows={3}
            className="w-full rounded-xl border border-input bg-background p-3 text-sm shadow-sm"
          />
          <textarea
            placeholder="Alur/prosedur"
            value={form.procedure}
            onChange={(e) => setForm({ ...form, procedure: e.target.value })}
            rows={3}
            className="w-full rounded-xl border border-input bg-background p-3 text-sm shadow-sm"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Estimasi waktu (mis. 3 hari kerja)" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
            <Input placeholder="Biaya (mis. Gratis)" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isPopular} onChange={(e) => setForm({ ...form, isPopular: e.target.checked })} /> Tandai sebagai layanan populer
          </label>
          <Button onClick={create} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Tambah Layanan
          </Button>
        </CardContent>
      </Card>

      <Card className="divide-y divide-border p-0">
        {items.length === 0 && <p className="p-5 text-sm text-muted-foreground">Belum ada layanan.</p>}
        {items.map((item: any) => (
          <div key={item.id} className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{item.title}</p>
              <p className="truncate text-xs text-muted-foreground">{item.description}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant={item.isPopular ? "default" : "outline"} className="cursor-pointer" onClick={() => togglePopular(item)}>
                {item.isPopular ? "Populer" : "Jadikan Populer"}
              </Badge>
              <Badge variant={item.isActive ? "secondary" : "destructive"} className="cursor-pointer" onClick={() => toggleActive(item)}>
                {item.isActive ? "Aktif" : "Nonaktif"}
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
        title="Edit Layanan"
        onSave={saveEdit}
        saving={editSaving}
      >
        <Input placeholder="Nama layanan" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
        <textarea
          placeholder="Deskripsi singkat"
          value={editForm.description}
          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
          rows={2}
          className="w-full rounded-xl border border-input bg-background p-3 text-sm shadow-sm"
        />
        <textarea
          placeholder="Syarat-syarat"
          value={editForm.requirements}
          onChange={(e) => setEditForm({ ...editForm, requirements: e.target.value })}
          rows={3}
          className="w-full rounded-xl border border-input bg-background p-3 text-sm shadow-sm"
        />
        <textarea
          placeholder="Alur/prosedur"
          value={editForm.procedure}
          onChange={(e) => setEditForm({ ...editForm, procedure: e.target.value })}
          rows={3}
          className="w-full rounded-xl border border-input bg-background p-3 text-sm shadow-sm"
        />
        <div className="grid grid-cols-2 gap-3">
          <Input placeholder="Estimasi waktu" value={editForm.duration} onChange={(e) => setEditForm({ ...editForm, duration: e.target.value })} />
          <Input placeholder="Biaya" value={editForm.cost} onChange={(e) => setEditForm({ ...editForm, cost: e.target.value })} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={editForm.isPopular} onChange={(e) => setEditForm({ ...editForm, isPopular: e.target.checked })} /> Tandai sebagai layanan populer
        </label>
      </EditDialog>
    </div>
  );
}
