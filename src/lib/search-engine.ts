/**
 * Web Search — "cek berita terbaru yang belum ada di web sendiri"
 * ------------------------------------------------------------------
 * Pakai Tavily Search API:
 *   - Gratis 1.000 kredit/BULAN, isi ulang otomatis tiap bulan (bukan
 *     sekali habis kayak provider lain), tanpa kartu kredit buat daftar.
 *   - Hasil sudah dibersihkan (title, url, content ringkas) — gak perlu
 *     scrape/parsing HTML tambahan.
 *   - Setup: daftar & ambil API key gratis di https://app.tavily.com
 *
 * (Sebelumnya pakai Google Custom Search JSON API, tapi API itu SUDAH
 * DITUTUP untuk pelanggan baru per awal 2026 — jadi diganti ke Tavily.)
 *
 * Biar HEMAT beneran (bukan cuma hemat AI, tapi hemat kredit search juga):
 *   1. Kuota bulanan di-cap sendiri di bawah limit gratis (default 900/1000),
 *      dicatat di tabel SearchQuota — begitu limit habis, request ditolak
 *      dengan pesan jelas, gak nunggu error dari Tavily.
 *   2. Dedupe: URL yang sudah pernah masuk AiJob/Berita di-skip otomatis,
 *      jadi gak query ulang topik yang sama / gak proses AI utk URL lama.
 *   3. 1 pemanggilan `searchFreshNews` = 1 query saja (bukan multi-query),
 *      dirancang untuk dipanggil terjadwal (mis. 1x/hari) bukan tiap klik.
 */

import { prisma } from "@/lib/prisma";
import { getVillageInfo } from "@/lib/village";

export interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
}

const MONTHLY_LIMIT = Number(process.env.SEARCH_ENGINE_MONTHLY_LIMIT ?? 900);

function monthKey() {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

/** Cek & increment kuota bulanan pencarian. Lempar error kalau sudah habis. */
async function consumeSearchQuota(): Promise<void> {
  const key = monthKey();
  const existing = await prisma.searchQuota.findUnique({ where: { date: key } });

  if (existing) {
    if (existing.count >= MONTHLY_LIMIT) {
      throw new Error(
        `Kuota search engine bulan ini sudah habis (${existing.count}/${MONTHLY_LIMIT}). Reset otomatis awal bulan depan.`
      );
    }
    await prisma.searchQuota.update({ where: { date: key }, data: { count: { increment: 1 } } });
  } else {
    await prisma.searchQuota.create({ data: { date: key, count: 1 } });
  }
}

export async function getSearchQuotaStatus() {
  const key = monthKey();
  const existing = await prisma.searchQuota.findUnique({ where: { date: key } });
  return { usedThisMonth: existing?.count ?? 0, monthlyLimit: MONTHLY_LIMIT };
}

/** Query mentah ke Tavily Search API (1x panggil = 1x kredit, basic search) */
export async function searchWeb(query: string, num = 5): Promise<SearchResultItem[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error(
      "TAVILY_API_KEY belum diset. Daftar gratis (1.000 kredit/bulan) di https://app.tavily.com"
    );
  }

  await consumeSearchQuota();

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: "basic", // "basic" = 1 kredit/request, "advanced" = 2 kredit/request
      max_results: Math.min(num, 10),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Tavily search gagal (${res.status}): ${body}`);
  }

  const data = await res.json();
  const items = (data.results ?? []) as any[];
  return items.map((it) => ({
    title: it.title,
    url: it.url,
    snippet: (it.content ?? "").slice(0, 300),
  }));
}

/**
 * Cari berita/info terbaru tentang desa yang KEMUNGKINAN belum ada di web
 * sendiri, lalu buang URL yang sudah pernah diproses (dedupe) — sisanya
 * itu yang benar-benar baru dan layak masuk antrean AI job.
 */
export async function searchFreshNews(topic?: string): Promise<SearchResultItem[]> {
  const resolvedTopic = topic || (await getVillageInfo()).fullLabel;
  const today = new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date());
  const results = await searchWeb(`berita terbaru ${resolvedTopic} ${today}`, 8);

  const [knownBeritaUrls, knownJobUrls] = await Promise.all([
    prisma.berita.findMany({ where: { sourceUrl: { not: null } }, select: { sourceUrl: true } }),
    // Job yang FAILED/REJECTED sengaja TIDAK dianggap "sudah diproses" — kalau
    // dulu gagal (mis. error sementara) atau ditolak admin, URL-nya boleh
    // muncul lagi di hasil pencarian berikutnya.
    prisma.aiJob.findMany({
      where: { sourceUrl: { not: null }, status: { notIn: ["FAILED", "REJECTED"] } },
      select: { sourceUrl: true },
    }),
  ]);

  const known = new Set(
    [...knownBeritaUrls, ...knownJobUrls].map((r) => r.sourceUrl).filter(Boolean) as string[]
  );

  const ownDomain = (() => {
    try {
      return new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost").hostname;
    } catch {
      return null;
    }
  })();

  return results.filter((r) => {
    if (known.has(r.url)) return false;
    if (ownDomain) {
      try {
        if (new URL(r.url).hostname === ownDomain) return false;
      } catch {
        /* ignore */
      }
    }
    return true;
  });
}
