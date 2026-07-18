"use client";

import * as React from "react";
import useSWR from "swr";
import { Save, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AdminPengaturanPage() {
  const { data: settingsData, mutate: mutateSettings } = useSWR("/api/settings", fetcher);
  const { data: kontakData, mutate: mutateKontak } = useSWR("/api/kontak", fetcher);
  const { data: profilData, mutate: mutateProfil } = useSWR("/api/profil-desa", fetcher);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pengaturan</h1>
        <p className="text-sm text-muted-foreground">Konfigurasi umum website desa.</p>
      </div>

      {settingsData && <SettingsCard initial={settingsData.item} onSaved={mutateSettings} />}
      {kontakData !== undefined && <KontakCard initial={kontakData.item} onSaved={mutateKontak} />}
      {profilData !== undefined && <ProfilCard initial={profilData.item} onSaved={mutateProfil} />}
    </div>
  );
}

function SettingsCard({ initial, onSaved }: { initial: any; onSaved: () => void }) {
  const [siteName, setSiteName] = React.useState(initial?.siteName ?? "Desa Tanjungsari");
  const [tagline, setTagline] = React.useState(initial?.tagline ?? "");
  const [saving, setSaving] = React.useState(false);

  async function save() {
    setSaving(true);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteName, tagline }),
    });
    setSaving(false);
    onSaved();
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Umum</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Input placeholder="Nama situs" value={siteName} onChange={(e) => setSiteName(e.target.value)} />
        <Input placeholder="Tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} />
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Simpan
        </Button>
      </CardContent>
    </Card>
  );
}

function KontakCard({ initial, onSaved }: { initial: any; onSaved: () => void }) {
  const [form, setForm] = React.useState({
    address: initial?.address ?? "",
    phone: initial?.phone ?? "",
    whatsapp: initial?.whatsapp ?? "",
    email: initial?.email ?? "",
    mapEmbedUrl: initial?.mapEmbedUrl ?? "",
    operationalHours: initial?.operationalHours ?? "",
    facebook: initial?.facebook ?? "",
    instagram: initial?.instagram ?? "",
    youtube: initial?.youtube ?? "",
  });
  const [saving, setSaving] = React.useState(false);

  async function save() {
    setSaving(true);
    await fetch("/api/kontak", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    onSaved();
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Kontak</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <textarea
          placeholder="Alamat kantor desa"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          rows={2}
          className="w-full rounded-xl border border-input bg-background p-3 text-sm shadow-sm"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input placeholder="No. telepon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input placeholder="No. WhatsApp" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
        </div>
        <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input placeholder="Jam operasional" value={form.operationalHours} onChange={(e) => setForm({ ...form, operationalHours: e.target.value })} />
        <Input placeholder="URL embed Google Maps" value={form.mapEmbedUrl} onChange={(e) => setForm({ ...form, mapEmbedUrl: e.target.value })} />
        <p className="pt-1 text-xs font-medium text-muted-foreground">Media Sosial</p>
        <Input placeholder="Link Facebook" value={form.facebook} onChange={(e) => setForm({ ...form, facebook: e.target.value })} />
        <Input placeholder="Link Instagram" value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} />
        <Input placeholder="Link YouTube" value={form.youtube} onChange={(e) => setForm({ ...form, youtube: e.target.value })} />
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Simpan
        </Button>
      </CardContent>
    </Card>
  );
}

function ProfilCard({ initial, onSaved }: { initial: any; onSaved: () => void }) {
  const [form, setForm] = React.useState({
    sejarah: initial?.sejarah ?? "",
    visi: initial?.visi ?? "",
    misi: initial?.misi ?? "",
    luasWilayah: initial?.luasWilayah ?? "",
    jumlahPenduduk: initial?.jumlahPenduduk ?? "",
  });
  const [saving, setSaving] = React.useState(false);

  async function save() {
    setSaving(true);
    await fetch("/api/profil-desa", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    onSaved();
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Profil Desa</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <textarea
          placeholder="Sejarah desa — pisahkan tiap paragraf dengan baris kosong (Enter 2x)"
          value={form.sejarah}
          onChange={(e) => setForm({ ...form, sejarah: e.target.value })}
          rows={8}
          className="w-full rounded-xl border border-input bg-background p-3 text-sm shadow-sm"
        />
        <textarea
          placeholder="Visi"
          value={form.visi}
          onChange={(e) => setForm({ ...form, visi: e.target.value })}
          rows={2}
          className="w-full rounded-xl border border-input bg-background p-3 text-sm shadow-sm"
        />
        <textarea
          placeholder="Misi"
          value={form.misi}
          onChange={(e) => setForm({ ...form, misi: e.target.value })}
          rows={3}
          className="w-full rounded-xl border border-input bg-background p-3 text-sm shadow-sm"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input placeholder="Luas wilayah" value={form.luasWilayah} onChange={(e) => setForm({ ...form, luasWilayah: e.target.value })} />
          <Input placeholder="Jumlah penduduk" value={form.jumlahPenduduk} onChange={(e) => setForm({ ...form, jumlahPenduduk: e.target.value })} />
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Simpan
        </Button>
      </CardContent>
    </Card>
  );
}
