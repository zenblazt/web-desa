"use client";

import * as React from "react";
import Link from "next/link";
import useSWR from "swr";
import { Sparkles, Gauge, CheckCheck, Loader2, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useModal } from "@/components/shared/modal-provider";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const LABELS: Record<string, string> = {
  BERITA: "Berita",
  UMKM: "UMKM",
  GALERI: "Galeri",
  PERANGKAT_DESA: "Perangkat Desa",
  PENGUMUMAN: "Pengumuman",
};

/**
 * Widget "AI Assistant" ringkas — dipasang di tab Perangkat Desa/UMKM/Galeri/
 * Pengumuman supaya admin bisa lihat kuota & isi konten pakai AI langsung
 * dari tab masing-masing, gak cuma dari halaman AI Assistant utama.
 */
export function AiTabWidget({ contentType }: { contentType: keyof typeof LABELS }) {
  const { data: jobsData, mutate: mutateJobs } = useSWR(`/api/ai/scrape?contentType=${contentType}`, fetcher, { refreshInterval: 8000 });
  const { data: quotaData } = useSWR("/api/ai/quota", fetcher, { refreshInterval: 15000 });
  const [approving, setApproving] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const { confirm } = useModal();

  const needsReview = (jobsData?.jobs ?? []).filter((j: any) => j.status === "NEEDS_REVIEW");

  async function approveAll() {
    if (needsReview.length === 0) return;
    const ok = await confirm(`Setujui & publish ${needsReview.length} draft ${LABELS[contentType]} sekaligus?`);
    if (!ok) return;
    setApproving(true);
    setMsg(null);
    const res = await fetch("/api/ai/approve-all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentType }),
    });
    const data = await res.json();
    setApproving(false);
    setMsg(data.error ? `Gagal: ${data.error}` : `${data.approved} draft dipublish.`);
    mutateJobs();
  }

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-4 w-4 shrink-0 text-primary" />
          <div className="text-sm">
            <p className="font-medium">AI Assistant bisa bantu isi {LABELS[contentType]} otomatis</p>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {quotaData && (
                <span className="flex items-center gap-1">
                  <Gauge className="h-3 w-3" /> Kuota Gemini: {quotaData.gemini?.usedToday}/{quotaData.gemini?.maxPerDay} hari ini
                </span>
              )}
              <span>
                Perlu review: <Badge variant={needsReview.length > 0 ? "secondary" : "outline"}>{needsReview.length}</Badge>
              </span>
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {needsReview.length > 0 && (
            <Button size="sm" variant="outline" onClick={approveAll} disabled={approving}>
              {approving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
              Setujui Semua
            </Button>
          )}
          <Button size="sm" asChild>
            <Link href={`/admin/ai-assistant?type=${contentType}`}>
              Buka AI Assistant <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
        {msg && <p className="w-full text-xs text-muted-foreground">{msg}</p>}
      </CardContent>
    </Card>
  );
}
