"use client";

import * as React from "react";
import { Suspense } from "react";
import useSWR from "swr";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  Sparkles, Plus, Check, X, Loader2, ExternalLink, Globe, Search, Gauge,
  CheckCheck, Trash2, ImageIcon, Newspaper, Store, GalleryHorizontal, Users, Megaphone,
  ChevronDown, ChevronRight, RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useModal } from "@/components/shared/modal-provider";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const CONTENT_TYPES = [
  { value: "BERITA", label: "Berita", icon: Newspaper },
  { value: "UMKM", label: "UMKM", icon: Store },
  { value: "GALERI", label: "Galeri", icon: GalleryHorizontal },
  { value: "PERANGKAT_DESA", label: "Perangkat Desa", icon: Users },
  { value: "PENGUMUMAN", label: "Pengumuman", icon: Megaphone },
] as const;

const PLATFORM_LABEL: Record<string, string> = {
  wordpress: "WordPress (0 kuota AI)",
  html: "Situs umum (AI wajib ringkas)",
};

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

  const { confirm, alert } = useModal();

  const { data: sourcesData, mutate: mutateSources } = useSWR("/api/ai/sources", fetcher);
  const { data: jobsData, mutate: mutateJobs } = useSWR(`/api/ai/scrape?contentType=${activeType}`, fetcher, { refreshInterval: 5000 });
  const { data: quotaData, mutate: mutateQuota } = useSWR("/api/ai/quota", fetcher, { refreshInterval: 10000 });

  const sources = sourcesData?.sources ?? [];
  const jobs = jobsData?.jobs ?? [];
  const activeSources = sources.filter((s: any) => s.isActive && s.contentType === activeType);
  const needsReviewJobs = jobs.filter((j: any) => j.status === "NEEDS_REVIEW");

  const [newSourceName, setNewSourceName] = React.useState("");
  const [newSourceUrl, setNewSourceUrl] = React.useState("");

  const [runningSourceId, setRunningSourceId] = React.useState<string | null>(null);
  const [checkResultMsg, setCheckResultMsg] = React.useState<Record<string, string>>({});
  const [useAiRewriteMap, setUseAiRewriteMap] = React.useState<Record<string, boolean>>({});

  const [tavilyOpen, setTavilyOpen] = React.useState(false);
  const [searchTopic, setSearchTopic] = React.useState("");
  const [searching, setSearching] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<any[]>([]);
  const [queueingUrl, setQueueingUrl] = React.useState<string | null>(null);

  // Kalau tab aktif (mis. UMKM) punya sumber dengan kata kunci fokus
  // tersimpan, pakai itu sebagai default topik pencarian — admin gak perlu
  // ketik ulang tiap buka panel, tapi tetap bisa diedit manual.
  function openTavilyPanel() {
    if (!tavilyOpen) {
      const focused = activeSources.find((s: any) => s.searchKeywords?.trim());
      if (focused && !searchTopic) setSearchTopic(focused.searchKeywords);
    }
    setTavilyOpen((v) => !v);
  }

  const [approvingAll, setApprovingAll] = React.useState(false);
  const [approveAllMsg, setApproveAllMsg] = React.useState<string | null>(null);

  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const [resettingHistory, setResettingHistory] = React.useState(false);

  React.useEffect(() => {
    setSearchTopic("");
    setSearchResults([]);
  }, [activeType]);

  async function resetHistory() {
    const ok = await confirm({
      title: "Reset Histori Scrape",
      description: `Reset SEMUA histori scrape (AiJob) untuk tab ${activeTypeMeta.label}? Ini dipakai kalau dedupe "sudah pernah diproses" nyangkut padahal kontennya udah dihapus manual. Tindakan ini tidak bisa dibatalkan.`,
      variant: "danger",
      confirmText: "Reset",
      typeToConfirm: "RESET",
    });
    if (!ok) return;
    setResettingHistory(true);
    try {
      const res = await fetch(`/api/ai/jobs?contentType=${activeType}&confirm=RESET`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal reset");
      await alert(`${data.deleted} histori job untuk tab ${activeTypeMeta.label} sudah dihapus. Sekarang bisa di-scrape ulang.`);
      mutateJobs();
    } catch (err: any) {
      await alert(`Gagal: ${err.message}`);
    } finally {
      setResettingHistory(false);
    }
  }

  async function addSource() {
    if (!newSourceName.trim() || !newSourceUrl.trim()) return;
    await fetch("/api/ai/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newSourceName,
        url: newSourceUrl,
        type: "AUTO_SEARCH",
        contentType: activeType,
        autoApprove: false,
      }),
    });
    setNewSourceName("");
    setNewSourceUrl("");
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

  const [keywordDrafts, setKeywordDrafts] = React.useState<Record<string, string>>({});
  async function saveSearchKeywords(sourceId: string) {
    const searchKeywords = (keywordDrafts[sourceId] ?? "").trim();
    await fetch(`/api/ai/sources/${sourceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ searchKeywords }),
    });
    mutateSources();
  }

  async function removeSource(id: string) {
    const ok = await confirm({ title: "Hapus Sumber", description: "Hapus sumber ini?", variant: "danger", confirmText: "Hapus" });
    if (!ok) return;
    await fetch(`/api/ai/sources/${id}`, { method: "DELETE" });
    mutateSources();
  }

  async function toggleHideSource(source: any) {
    await fetch(`/api/ai/sources/${source.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hideSource: !source.hideSource }),
    });
    mutateSources();
  }

  async function checkSource(source: any) {
    setRunningSourceId(source.id);
    setCheckResultMsg((prev) => ({ ...prev, [source.id]: "" }));
    const res = await fetch("/api/ai/check-source", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aiSourceId: source.id, useAiRewrite: !!useAiRewriteMap[source.id] }),
    });
    const data = await res.json();
    setRunningSourceId(null);

    let msg: string;
    if (data.error) {
      msg = `Gagal: ${data.error}`;
    } else if (data.autoApprove) {
      msg = `${data.published} post langsung dipublish otomatis${data.skipped ? `, ${data.skipped} dilewati (sudah ada)` : ""}.`;
    } else if (data.created === 0) {
      msg = data.message ?? "Tidak ada post baru.";
    } else {
      msg = `${data.created} post baru diimpor${data.skipped ? `, ${data.skipped} dilewati (sudah ada)` : ""}. Cek di "Perlu Review" di bawah.`;
    }
    setCheckResultMsg((prev) => ({ ...prev, [source.id]: msg }));

    mutateJobs();
    mutateQuota();
    mutateSources();
  }

  async function runSearch() {
    setSearching(true);
    const res = await fetch("/api/ai/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: searchTopic || undefined, contentType: activeType }),
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
    const ok = await confirm(`Setujui & publish ${needsReviewJobs.length} item sekaligus tanpa dicek satu-satu?`);
    if (!ok) return;
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
          Tempel 1 URL sumber (halaman &quot;Berita Terbaru&quot; atau link 1 artikel, sama saja) — sistem otomatis
          deteksi WordPress atau bukan, lalu ambil post barunya. Bisa disetel otomatis publish supaya admin gak perlu review satu-satu.
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

      {/* Kartu Sumber — gabungan Opsi 1-3 lama */}
      <Card>
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <Globe className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-base">Sumber</CardTitle>
            <p className="text-xs text-muted-foreground">
              Tempel URL sumber resmi untuk tab {activeTypeMeta.label}. Klik &quot;Cek &amp; Ambil Post Baru&quot; — sistem
              otomatis deteksi WordPress (0 kuota AI) atau situs umum (di-scrape lalu wajib diringkas AI), dan otomatis
              bedain halaman listing vs 1 artikel tunggal.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeSources.length === 0 && (
            <p className="text-sm text-muted-foreground">Belum ada sumber terdaftar untuk tab {activeTypeMeta.label}. Tambahkan di bawah.</p>
          )}
          {activeSources.map((s: any) => (
            <div key={s.id} className="space-y-2 rounded-xl border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate text-sm font-medium">{s.name}</p>
                    {s.platform ? (
                      <Badge variant="outline" className="text-[10px]">{PLATFORM_LABEL[s.platform] ?? s.platform}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">Belum dicek</Badge>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{s.url}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button size="sm" onClick={() => checkSource(s)} disabled={runningSourceId === s.id}>
                    {runningSourceId === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    Cek &amp; Ambil Post Baru
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => removeSource(s.id)} className="text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={!!s.autoApprove} onChange={() => toggleAutoApprove(s)} />
                  Otomatis publish (admin gak perlu review manual)
                </label>
                {(!s.platform || s.platform === "wordpress") && (
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={!!useAiRewriteMap[s.id]}
                      onChange={(e) => setUseAiRewriteMap((prev) => ({ ...prev, [s.id]: e.target.checked }))}
                    />
                    Rapikan pakai AI (cuma berlaku kalau sumbernya WordPress)
                  </label>
                )}
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={!!s.hideSource} onChange={() => toggleHideSource(s)} />
                  Jangan tampilkan &quot;Sumber: ...&quot; di halaman publik
                </label>
              </div>

              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
                <Input
                  placeholder={`Kata kunci fokus pencarian (mis. "UMKM produk lokal") — biar AI fokus ke topik ${activeTypeMeta.label}`}
                  value={keywordDrafts[s.id] ?? s.searchKeywords ?? ""}
                  onChange={(e) => setKeywordDrafts((prev) => ({ ...prev, [s.id]: e.target.value }))}
                  className="text-xs"
                />
                <Button size="sm" variant="outline" onClick={() => saveSearchKeywords(s.id)} className="shrink-0">
                  Simpan
                </Button>
              </div>

              {checkResultMsg[s.id] && <p className="text-xs text-muted-foreground">{checkResultMsg[s.id]}</p>}
            </div>
          ))}

          <div className="flex flex-col gap-2 border-t border-border pt-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input placeholder="Nama sumber (mis. Website Kecamatan Jenangan)" value={newSourceName} onChange={(e) => setNewSourceName(e.target.value)} />
              <Input placeholder="URL — halaman listing atau link 1 artikel" value={newSourceUrl} onChange={(e) => setNewSourceUrl(e.target.value)} />
              <Button variant="outline" onClick={addSource} className="shrink-0">
                <Plus className="h-4 w-4" /> Tambah
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Sumber ini akan mengisi tab <strong>{activeTypeMeta.label}</strong>. Toggle &quot;Otomatis publish&quot; bisa diatur belakangan lewat kartu sumber di atas.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Cari Topik Lain (Tavily) — collapsed/opsional */}
      <Card>
        <button
          type="button"
          onClick={openTavilyPanel}
          className="flex w-full items-center gap-3 p-4 text-left"
        >
          {tavilyOpen ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
          <Search className="h-5 w-5 shrink-0 text-primary" />
          <div className="min-w-0">
            <CardTitle className="text-base">Cari Topik Lain (Tavily)</CardTitle>
            <p className="text-xs text-muted-foreground">Cari info/berita terbaru yang belum ada sumbernya sendiri — opsional.</p>
          </div>
        </button>
        {tavilyOpen && (
          <CardContent className="space-y-3 pt-0">
            <div className="flex gap-2">
              <Input
                placeholder="Topik (kosongkan = pakai nama desa & kecamatan otomatis)"
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
        )}
      </Card>

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
          {(() => {
            const visibleJobs = jobs.filter((j: any) => j.status !== "PUBLISHED");
            if (visibleJobs.length === 0) {
              return <p className="text-sm text-muted-foreground">Belum ada job AI untuk tab {activeTypeMeta.label}.</p>;
            }
            return visibleJobs.map((job: any) => <AiJobCard key={job.id} job={job} onDone={() => mutateJobs()} />);
          })()}
        </CardContent>
      </Card>

      {/* Lanjutan — collapsed */}
      <Card>
        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          className="flex w-full items-center gap-3 p-4 text-left"
        >
          {advancedOpen ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
          <div>
            <CardTitle className="text-base">Lanjutan</CardTitle>
            <p className="text-xs text-muted-foreground">Aksi yang jarang dipakai & tidak bisa dibatalkan.</p>
          </div>
        </button>
        {advancedOpen && (
          <CardContent className="pt-0">
            <Button size="sm" variant="outline" onClick={resetHistory} disabled={resettingHistory} className="text-destructive">
              {resettingHistory ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Reset Histori Scrape ({activeTypeMeta.label})
            </Button>
          </CardContent>
        )}
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
          {job.contentType !== "GALERI" && (
            <>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-input bg-background p-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Ringkasan / isi"
              />
              <Input value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} placeholder="Meta description" />
              <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags (pisah koma)" />
            </>
          )}

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
