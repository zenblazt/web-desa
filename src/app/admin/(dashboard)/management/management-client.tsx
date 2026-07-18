"use client";

import * as React from "react";
import useSWR from "swr";
import { ShieldCheck, Plus, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useModal } from "@/components/shared/modal-provider";
import { formatDate } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const ROLES = ["SUPERADMIN", "ADMIN", "EDITOR"];

const emptyForm = { name: "", email: "", password: "", role: "EDITOR" };

export function ManagementClient({ currentUserId }: { currentUserId: string }) {
  const { data, mutate } = useSWR("/api/admin-users", fetcher);
  const users = data?.users ?? [];
  const { confirm, alert } = useModal();

  const [form, setForm] = React.useState(emptyForm);
  const [saving, setSaving] = React.useState(false);

  async function create() {
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      await alert("Nama, email, dan password wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const resData = await res.json();
      if (!res.ok) {
        await alert(resData.error || "Gagal menambah admin.");
        return;
      }
      setForm(emptyForm);
      mutate();
    } finally {
      setSaving(false);
    }
  }

  async function changeRole(id: string, role: string) {
    await fetch(`/api/admin-users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    mutate();
  }

  async function remove(id: string, name: string) {
    const ok = await confirm({
      title: "Hapus Admin",
      description: `Hapus akun admin "${name}"? Aksi ini tidak bisa dibatalkan.`,
      variant: "danger",
      confirmText: "Hapus",
    });
    if (!ok) return;
    const res = await fetch(`/api/admin-users/${id}`, { method: "DELETE" });
    const resData = await res.json();
    if (!res.ok) {
      await alert(resData.error || "Gagal menghapus admin.");
      return;
    }
    mutate();
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <ShieldCheck className="h-6 w-6 text-primary" /> Manajemen Admin
        </h1>
        <p className="text-sm text-muted-foreground">Kelola akun admin website. Hanya SUPERADMIN yang bisa mengakses halaman ini.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Tambah Admin</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Nama" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Password (min. 8 karakter)" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm">
              {ROLES.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <Button onClick={create} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Tambah Admin
          </Button>
        </CardContent>
      </Card>

      <Card className="divide-y divide-border p-0">
        {users.length === 0 && <p className="p-5 text-sm text-muted-foreground">Belum ada admin.</p>}
        {users.map((u: any) => (
          <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {u.name} {u.id === currentUserId && <Badge variant="outline" className="ml-1 text-[10px]">Anda</Badge>}
              </p>
              <p className="truncate text-xs text-muted-foreground">{u.email} · Bergabung {formatDate(u.createdAt)}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <select
                value={u.role}
                onChange={(e) => changeRole(u.id, e.target.value)}
                disabled={u.id === currentUserId}
                className="h-9 rounded-lg border border-input bg-background px-2 text-xs"
              >
                {ROLES.map((r) => <option key={r}>{r}</option>)}
              </select>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => remove(u.id, u.name)}
                disabled={u.id === currentUserId}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
