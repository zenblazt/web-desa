"use client";

import * as React from "react";
import { Suspense } from "react";
import useSWR from "swr";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  Sparkles, Link2, Radar, Plus, Check, X, Loader2, ExternalLink, Globe, Search, Gauge,
  CheckCheck, Trash2, ImageIcon, Newspaper, Store, GalleryHorizontal, Users, Megaphone,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const CONTENT_TYPES = [
  { value: "BERITA", label: "Berita", icon: Newspaper },
  { value: "UMKM", label: "UMKM", icon: Store },
  { value: "GALERI", label: "Galeri", icon: GalleryHorizontal },
  { value: "PERANGKAT_DESA", label: "Perangkat Desa", icon: Users },
  { value: "PENGUMUMAN", label: "Pengumuman", icon: Megaphone },
] as const;

export default function AiAssistantPageWrapper() {
  return (
    <Suspense fallback={null}>
      <AiAssistantPage />
    </Suspense>
  );
}

function AiAssistantPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeType = (searchParams.get("type") ?? "BERITA").toUpperCase();

  function setType(t: string) {
    router.push(`/admin/ai-assistant?type=${t}`);
  }

  const { data: sourcesData, mutate: mutateSources } = useSWR("/api/ai/sources", fetcher);
  const { data: jobsData, mutate: mutateJobs } = useSWR(`/api/ai/scrape?contentType=${activeType}`, fetcher, { refreshInterval: 5000 });
  const { data: quotaData, mutate: mutateQuota } = useSWR("/api/ai/quota", fetcher, { refreshInterval: 10000 });

  const sources = sourcesData?.sources ?? [];
  const jobs = jobsData?.jobs ?? [];
  const activeSources = sources.filter((s: any) => s.isActive && s.contentType === activeType);
  const wpSources = activeSources.filter((s: any) => s.platform === "wordpress");
  const needsReviewJobs = jobs.filter((j: any) => j.status === "NEEDS_REVIEW");

  const [manualUrl, setManualUrl] = React.useState("");
  const [newSourceName, setNewSourceName] = React.useState("");
  const [newSourceUrl, setNewSourceUrl] = React.useState("");
  const [newSourceIsWp, setNewSourceIsWp] = React.useState(false);
  const [newSourceAutoApprove, setNewSourceAutoApprove] = React.useState(false);
  const [runningManual, setRunningManual] = React.useState(false);
  const [runningAutoId, setRunningAutoId] = React.useState<string | null>(null);

  const [runningWpId, setRunningWpId] = React.useState<string | null>(null);
  const [wpUseAi, setWpUseAi] = React.useState(false);
  const [wpResultMsg, setWpResultMsg] = React.useState<string | null>(null);

  const [searchTopic, setSearchTopic] = React.useState("");
  const [searching, setSearching] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<any[]>([]);
  const [queueingUrl, setQueueingUrl] = React.useState<string | null>(null);

  const [approvingAll, setApprovingAll] = React.useState(false);
  const [approveAllMsg, setApproveAllMsg] = React.useState<string | null>(null);

  async function runManualLink() {
    if (!manualUrl.trim()) return;
    setRunningManual(true);
    await fetch("/api/ai/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "MANUAL_LINK", url: manualUrl.trim(), contentType: activeType }),
    });
    setManualUrl("");
    setRunningManual(false);
    mutateJobs();
  }

  async function runAutoSearch(aiSourceId: string) {
    setRunningAutoId(aiSourceId);
    await fetch("/api/ai/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "AUTO_SEARCH", aiSourceId, contentType: activeType }),
    });
    setRunningAutoId(null);
    mutateJobs();
  }

  async function addSource() {
    if (!newSourceName.trim() || !newSourceUrl.trim()) return;
    await fetch("/api/ai/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newSourceName,
        url: newSourceUrl,
        type: newSourceIsWp ? "WP_JSON" : "AUTO_SEARCH",
        platform: newSourceIsWp ? "wordpress" : undefined,
        contentType: activeType,
        autoApprove: newSourceAutoApprove,
      }),
    });
    setNewSourceName("");
    setNewSourceUrl("");
    setNewSourceIsWp(false);
    setNewSourceAutoApprove(false);
    mutateSources();
  }

  async function toggleAutoApprove(source: any) {
    await fetch(`/api/ai/sources/${source.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ autoApprove: !source.autoApprove }),
    });
    mutateSources();
  }

  async function removeSource(id: string) {
    if (!confirm("Hapus sumber ini?")) return;
    await fetch(`/api/ai/sources/${id}`, { method: "DELETE" });
    mutateSources();
  }

  async function runWpScrape(aiSourceId: string) {
    setRunningWpId(aiSourceId);
    setWpResultMsg(null);
    const res = await fetch("/api/ai/scrape-wp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aiSourceId, useAi: wpUseAi }),
    });
    const data = await res.json();
    setRunningWpId(null);
    if (data.error) {
      setWpResultMsg(`Gagal: ${data.error}`);
    } else if (data.autoApprove) {
      setWpResultMsg(
        `${data.published} post langsung dipublish otomatis${data.skipped ? `, ${data.skipped} dilewati (sudah ada)` : ""}.`
      );
    } else {
      setWpResultMsg(
        `${data.created} post baru diimpor, urut sesuai tanggal aslinya${data.skipped ? `, ${data.skipped} dilewati (sudah ada)` : ""}. Cek di "Perlu Review" di bawah.`
      );
    }
    mutateJobs();
    mutateQuota();
    mutateSources();
  }

  async function runSearch() {
    setSearching(true);
    const res = await fetch("/api/ai/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: searchTopic || undefined }),
    });
    const data = await res.json();
    setSearching(false);
    setSearchResults(data.results ?? []);
    mutateQuota();
  }

  async function queueSearchResult(url: string) {
    setQueueingUrl(url);
    await fetch("/api/ai/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "MANUAL_LINK", url, contentType: activeType }),
    });
    setQueueingUrl(null);
    setSearchResults((prev) => prev.filter((r) => r.url !== url));
    mutateJobs();
  }

  async function approveAll() {
    if (needsReviewJobs.length === 0) return;
    if (!confirm(`Setujui & publish ${needsReviewJobs.length} item sekaligus tanpa dicek satu-satu?`)) return;
    setApprovingAll(true);
    setApproveAllMsg(null);
    const res = await fetch("/api/ai/approve-all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentType: activeType }),
    });
    const data = await res.json();
    setApprovingAll(false);
    setApproveAllMsg(
      data.error ? `Gagal: ${data.error}` : `${data.approved} item berhasil dipublish otomatis${data.failed ? `, ${data.failed} gagal` : ""}.`
    );
    mutateJobs();
    mutateQuota();
  }

  const activeTypeMeta = CONTENT_TYPES.find((c) => c.value === activeType) ?? CONTENT_TYPES[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Sparkles className="h-6 w-6 text-primary" /> AI Assistant
        </h1>
        <p className="text-sm text-muted-foreground">
          Bantu isi konten otomatis dari sumber resmi — kasih link manual, biarkan AI cari sendiri, scrape situs WordPress (0 kuota AI, gambar &amp; tanggal asli ikut terbawa), atau cari info terbaru lewat search engine. Bisa disetel otomatis publish supaya admin gak perlu review satu-satu.
        </p>
      </div>

      {/* Tab jenis konten tujuan */}
      <div className="flex flex-wrap gap-2">
        {CONTENT_TYPES.map((c) => {
          const Icon = c.icon;
          const isActive = c.value === activeType;
          return (
            <button
              key={c.value}
              onClick={() => setType(c.value)}
              className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {c.label}
            </button>
          );
        })}
      </div>

      {quotaData && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-2 py-4 text-sm">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-primary" />
              <span className="font-medium">Kuota Gemini:</span>
            </div>
            <span>
              {quotaData.gemini?.usedThisMinute}/{quotaData.gemini?.maxPerMinute} per menit
            </span>
            <span>
              {quotaData.gemini?.usedToday}/{quotaData.gemini?.maxPerDay} per hari
            </span>
            {quotaData.search && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="font-medium">Search engine:</span>
                <span>
                  {quotaData.search.usedThisMonth}/{quotaData.search.monthlyLimit} query bulan ini
                </span>
              </>
            )}
            <span className="text-muted-foreground">•</span>
            <span className="font-medium">Perlu review ({activeTypeMeta.label}):</span>
            <Badge variant={needsReviewJobs.length > 0 ? "secondary" : "outline"}>{needsReviewJobs.length}</Badge>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Opsi 1: Manual Link */}
        <Card>
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <Link2 className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">Opsi 1 — Kasih Link Manual</CardTitle>
              <p className="text-xs text-muted-foreground">Tempel URL sumber resmi, AI akan ringkas + siapkan draft {activeTypeMeta.label}.</p>
            </div>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Input
              placeholder="https://jenangan.ponorogo.go.id/berita/..."
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
            />
            <Button onClick={runManualLink} disabled={runningManual}>
              {runningManual ? <Loader2 className="h-4 w-4 animate-spin" /> : "Proses"}
            </Button>
          </CardContent>
        </Card>

        {/* Opsi 2: Auto Search dari sumber terdaftar */}
        <Card>
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <Radar className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">Opsi 2 — AI Cari Sendiri</CardTitle>
              <p className="text-xs text-muted-foreground">
                Pilih sumber resmi terdaftar untuk tab {activeTypeMeta.label}, AI cek info terbaru berdasarkan tanggal.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeSources.length === 0 && (
              <p className="text-sm text-muted-foreground">Belum ada sumber terdaftar untuk tab {activeTypeMeta.label}. Tambahkan di bawah.</p>
            )}
            {activeSources.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between gap-2 rounded-xl border border-border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{s.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{s.url}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button size="sm" onClick={() => runAutoSearch(s.id)} disabled={runningAutoId === s.id}>
                    {runningAutoId === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Cek Sekarang"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => removeSource(s.id)} className="text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}

            <div className="flex flex-col gap-2 border-t border-border pt-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input placeholder="Nama sumber (mis. Website Kecamatan Jenangan)" value={newSourceName} onChange={(e) => setNewSourceName(e.target.value)} />
                <Input placeholder="URL sumber" value={newSourceUrl} onChange={(e) => setNewSourceUrl(e.target.value)} />
                <Button variant="outline" onClick={addSource} className="shrink-0">
                  <Plus className="h-4 w-4" /> Tambah
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={newSourceIsWp} onChange={(e) => setNewSourceIsWp(e.target.checked)} />
                  Situs WordPress
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={newSourceAutoApprove} onChange={(e) => setNewSourceAutoApprove(e.target.checked)} />
                  Otomatis publish (admin gak perlu review manual)
                </label>
                <span>Sumber ini akan mengisi tab <strong>{activeTypeMeta.label}</strong>.</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Opsi 3: Scraper situs WordPress (wp-json, 0 kuota AI) */}
        <Card>
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <Globe className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">Opsi 3 — Scraper Situs Resmi (WordPress)</CardTitle>
              <p className="text-xs text-muted-foreground">
                Tarik semua post lewat REST API WordPress-nya langsung — data terstruktur (judul, isi, <strong>gambar unggulan &amp; gambar di dalam post</strong>, tanggal asli), <strong>gak butuh AI sama sekali</strong> (0 kuota Gemini). Urutan hasil scrape otomatis mengikuti tanggal post asli. Tandai sumber sebagai &quot;Situs WordPress&quot; dulu di kartu sebelah.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {wpSources.length === 0 && (
              <p className="text-sm text-muted-foreground">Belum ada sumber bertipe WordPress untuk tab {activeTypeMeta.label}. Tambahkan lewat form di kartu sebelah.</p>
            )}
            {wpSources.map((s: any) => (
              <div key={s.id} className="space-y-2 rounded-xl border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{s.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{s.url}</p>
                  </div>
                  <Button size="sm" onClick={() => runWpScrape(s.id)} disabled={runningWpId === s.id}>
                    {runningWpId === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Scrape Sekarang"}
                  </Button>
                </div>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input type="checkbox" checked={s.autoApprove} onChange={() => toggleAutoApprove(s)} />
                  Otomatis publish tiap hasil scrape (admin gak perlu acc satu-satu)
                </label>
              </div>
            ))}
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input type="checkbox" checked={wpUseAi} onChange={(e) => setWpUseAi(e.target.checked)} />
              Rapikan hasil pakai AI (batch, hemat kuota) — kalau tidak dicentang, judul & isi dipakai apa adanya dari WP
            </label>
            {wpResultMsg && <p className="text-sm text-muted-foreground">{wpResultMsg}</p>}
          </CardContent>
        </Card>

        {/* Opsi 4: Cari info terbaru lewat search engine (hemat) */}
        <Card>
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <Search className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">Opsi 4 — Cari di Search Engine (Tavily)</CardTitle>
              <p className="text-xs text-muted-foreground">
                Cek info/berita terbaru tentang desa yang belum ada di web sendiri (pakai Tavily, gratis 1.000 kredit/bulan). Hemat: 1 pencarian = 1 kredit, hasil yang sudah pernah diproses otomatis dibuang, kuota bulanan dibatasi.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Topik (kosongkan = 'Desa Tanjungsari Kecamatan Jenangan')"
                value={searchTopic}
                onChange={(e) => setSearchTopic(e.target.value)}
              />
              <Button onClick={runSearch} disabled={searching} className="shrink-0">
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cari"}
              </Button>
            </div>
            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((r) => (
                  <div key={r.url} className="rounded-xl border border-border p-3">
                    <p className="text-sm font-medium">{r.title}</p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{r.snippet}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                        Buka <ExternalLink className="h-3 w-3" />
                      </a>
                      <Button size="sm" variant="outline" onClick={() => queueSearchResult(r.url)} disabled={queueingUrl === r.url}>
                        {queueingUrl === r.url ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Proses jadi Draft"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Antrian review AI job */}
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">Perlu Review — {activeTypeMeta.label} ({needsReviewJobs.length})</CardTitle>
          {needsReviewJobs.length > 0 && (
            <Button size="sm" onClick={approveAll} disabled={approvingAll}>
              {approvingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
              Setujui Semua Sekarang
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {approveAllMsg && <p className="text-sm text-muted-foreground">{approveAllMsg}</p>}
          {jobs.length === 0 && <p className="text-sm text-muted-foreground">Belum ada job AI untuk tab {activeTypeMeta.label}.</p>}
          {jobs.map((job: any) => (
            <AiJobCard key={job.id} job={job} onDone={() => mutateJobs()} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function AiJobCard({ job, onDone }: { job: any; onDone: () => void }) {
  const [title, setTitle] = React.useState(job.suggestedTitle ?? "");
  const [summary, setSummary] = React.useState(job.summary ?? "");
  const [metaDescription, setMetaDescription] = React.useState(job.suggestedMetaDescription ?? "");
  const [tags, setTags] = React.useState(job.suggestedTags ?? "");
  const [useImage, setUseImage] = React.useState(!!job.featuredImage);
  const [busy, setBusy] = React.useState(false);

  const images: string[] = Array.isArray(job.contentImages) ? job.contentImages : [];

  const statusVariant: Record<string, any> = {
    NEEDS_REVIEW: "secondary",
    PUBLISHED: "default",
    APPROVED: "secondary",
    REJECTED: "destructive",
    FAILED: "destructive",
    RUNNING: "outline",
    PENDING: "outline",
  };

  async function approve(publish: boolean) {
    setBusy(true);
    await fetch("/api/ai/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId: job.id,
        action: "approve",
        publish,
        editedFields: { title, summary, metaDescription, tags, image: useImage ? job.featuredImage : null },
      }),
    });
    setBusy(false);
    onDone();
  }

  async function reject() {
    setBusy(true);
    await fetch("/api/ai/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: job.id, action: "reject" }),
    });
    setBusy(false);
    onDone();
  }

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant={statusVariant[job.status] ?? "outline"}>{job.status}</Badge>
          <Badge variant="outline">
            {
              ({ AUTO_SEARCH: "Auto Search", WP_JSON: "WordPress Scrape", SEARCH_ENGINE: "Search Engine" } as Record<string, string>)[
                job.sourceType
              ] ?? "Manual Link"
            }
          </Badge>
          {job.originalPublishedAt && (
            <span className="text-xs text-muted-foreground">
              Tanggal asli: {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(job.originalPublishedAt))}
            </span>
          )}
        </div>
        {job.sourceUrl && (
          <a href={job.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
            Sumber asli <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {job.status === "FAILED" && (
        <p className="mt-2 text-sm text-destructive">{job.errorMessage}</p>
      )}

      {job.status === "NEEDS_REVIEW" && (
        <div className="mt-3 space-y-2.5">
          {(job.featuredImage || images.length > 0) && (
            <div className="space-y-1.5">
              <div className="flex flex-wrap gap-2">
                {(job.featuredImage ? [job.featuredImage, ...images.filter((i) => i !== job.featuredImage)] : images)
                  .slice(0, 6)
                  .map((src: string) => (
                    <div key={src} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                      <Image src={src} alt="Gambar dari sumber" fill sizes="64px" className="object-cover" unoptimized />
                    </div>
                  ))}
              </div>
              {job.featuredImage && (
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input type="checkbox" checked={useImage} onChange={(e) => setUseImage(e.target.checked)} />
                  <ImageIcon className="h-3.5 w-3.5" /> Pakai gambar ini sebagai cover
                </label>
              )}
            </div>
          )}

          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul" />
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-input bg-background p-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Ringkasan / isi"
          />
          <Input value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} placeholder="Meta description" />
          <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags (pisah koma)" />

          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={() => approve(true)} disabled={busy}>
              <Check className="h-3.5 w-3.5" /> Approve & Publish
            </Button>
            <Button size="sm" variant="outline" onClick={() => approve(false)} disabled={busy}>
              Simpan sebagai Draft
            </Button>
            <Button size="sm" variant="ghost" onClick={reject} disabled={busy} className="text-destructive">
              <X className="h-3.5 w-3.5" /> Tolak
            </Button>
          </div>
        </div>
      )}

      {(job.status === "PENDING" || job.status === "RUNNING") && (
        <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Sedang diproses…
        </p>
      )}
    </div>
  );
}
