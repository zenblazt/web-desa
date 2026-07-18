"use client";

import * as React from "react";
import { KeyRound, Save, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useModal } from "@/components/shared/modal-provider";

export default function AkunSayaPage() {
  const { alert } = useModal();
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function save() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      await alert("Semua field wajib diisi.");
      return;
    }
    if (newPassword.length < 8) {
      await alert("Password baru minimal 8 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      await alert("Konfirmasi password baru tidak cocok.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        await alert(data.error || "Gagal mengubah password.");
        return;
      }
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      await alert("Password berhasil diubah.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-md space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <KeyRound className="h-6 w-6 text-primary" /> Akun Saya
        </h1>
        <p className="text-sm text-muted-foreground">Ubah password akun admin Anda.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Ubah Password</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input
            type="password"
            placeholder="Password saat ini"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <Input
            type="password"
            placeholder="Password baru (min. 8 karakter)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Input
            type="password"
            placeholder="Konfirmasi password baru"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Simpan Password
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
