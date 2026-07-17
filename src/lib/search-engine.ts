/**
 * Web Search — "cek berita terbaru yang belum ada di web sendiri"
 * ------------------------------------------------------------------
 * Pakai Google Programmable Search Engine (Custom Search JSON API):
 *   - Gratis 100 query/hari, no credit card.
 *   - Hasil JSON rapi (title, link, snippet) — gak perlu AI buat parsing.
 *   - Setup: https://programmablesearchengine.google.com (buat search engine,
 *     scope ke "search the entire web"), lalu ambil API key di
 *     https://console.cloud.google.com (aktifkan "Custom Search API").
 *
 * Biar HEMAT beneran (bukan cuma hemat AI, tapi hemat query search juga):
 *   1. Kuota harian di-cap sendiri di bawah limit gratis (default 90/100),
 *      dicatat di tabel SearchQuota — begitu limit habis, request ditolak
 *      dengan pesan jelas, gak nunggu 429 dari Google.
 *   2. Dedupe: URL yang sudah pernah masuk AiJob/Berita di-skip otomatis,
 *      jadi gak query ulang topik yang sama / gak proses AI utk URL lama.
 *   3. 1 pemanggilan `searchFreshNews` = 1 query saja (bukan multi-query),
 *      dirancang untuk dipanggil terjadwal (mis. 1x/hari) bukan tiap klik.
 */

import { prisma } from "@/lib/prisma";

export interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
}

const DAILY_LIMIT = Number(process.env.SEARCH_ENGINE_DAILY_LIMIT ?? 90);

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

/** Cek & increment kuota harian pencarian. Lempar error kalau sudah habis. */
async function consumeSearchQuota(): Promise<void> {
  const key = todayKey();
  const existing = await prisma.searchQuota.findUnique({ where: { date: key } });

  if (existing) {
    if (existing.count >= DAILY_LIMIT) {
      throw new Error(
        `Kuota search engine hari ini sudah habis (${existing.count}/${DAILY_LIMIT}). Coba lagi besok.`
      );
    }
    await prisma.searchQuota.update({ where: { date: key }, data: { count: { increment: 1 } } });
  } else {
    await prisma.searchQuota.create({ data: { date: key, count: 1 } });
  }
}

export async function getSearchQuotaStatus() {
  const key = todayKey();
  const existing = await prisma.searchQuota.findUnique({ where: { date: key } });
  return { usedToday: existing?.count ?? 0, dailyLimit: DAILY_LIMIT };
}

/** Query mentah ke Google Custom Search JSON API (1x panggil = 1x kuota) */
export async function searchWeb(query: string, num = 5): Promise<SearchResultItem[]> {
  const apiKey = process.env.GOOGLE_CSE_API_KEY;
  const cx = process.env.GOOGLE_CSE_CX;
  if (!apiKey || !cx) {
    throw new Error(
      "GOOGLE_CSE_API_KEY / GOOGLE_CSE_CX belum diset. Bikin dulu di https://programmablesearchengine.google.com"
    );
  }

  await consumeSearchQuota();

  const params = new URLSearchParams({
    key: apiKey,
    cx,
    q: query,
    num: String(Math.min(num, 10)),
  });

  const res = await fetch(`https://www.googleapis.com/customsearch/v1?${params.toString()}`);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Search engine gagal (${res.status}): ${body}`);
  }

  const data = await res.json();
  const items = (data.items ?? []) as any[];
  return items.map((it) => ({
    title: it.title,
    url: it.link,
    snippet: it.snippet ?? "",
  }));
}

/**
 * Cari berita/info terbaru tentang desa yang KEMUNGKINAN belum ada di web
 * sendiri, lalu buang URL yang sudah pernah diproses (dedupe) — sisanya
 * itu yang benar-benar baru dan layak masuk antrean AI job.
 */
export async function searchFreshNews(
  topic = "Desa Tanjungsari Kecamatan Jenangan Ponorogo"
): Promise<SearchResultItem[]> {
  const today = new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date());
  const results = await searchWeb(`berita terbaru ${topic} ${today}`, 8);

  const [knownBeritaUrls, knownJobUrls] = await Promise.all([
    prisma.berita.findMany({ where: { sourceUrl: { not: null } }, select: { sourceUrl: true } }),
    prisma.aiJob.findMany({ where: { sourceUrl: { not: null } }, select: { sourceUrl: true } }),
  ]);

  const known = new Set(
    [...knownBeritaUrls, ...knownJobUrls].map((r) => r.sourceUrl).filter(Boolean) as string[]
  );

  // Buang juga domain situs sendiri (gak perlu "temukan" berita sendiri lewat search)
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
