/**
 * Link Discovery
 * ---------------
 * Dipakai buat sumber NON-WordPress: 1 URL yang admin tempel bisa jadi
 * halaman listing ("Berita Terbaru") ATAU langsung 1 artikel — gak perlu
 * dibedain manual dari awal.
 *
 * analyzeListingPage() memutuskan mana dari keduanya:
 *  - Kalau terdeteksi ARTIKEL TUNGGAL (ada scope konten panjang + <h1> +
 *    tanda tanggal publish), diproses langsung sebagai 1 item lewat
 *    extractFromUrl() seperti biasa.
 *  - Kalau bukan, dikumpulkan kandidat link artikel dari halaman itu
 *    (same-domain, difilter dari link navigasi/kategori/aset), buat
 *    di-scrape satu-satu di lapisan pemanggil.
 */

import * as cheerio from "cheerio";

export interface ListingAnalysis {
  isSingleArticle: boolean;
  links: string[];
}

const EXCLUDE_PATH_PATTERNS = [
  /\/(kategori|category|tag|tags|author|penulis|page|halaman|feed|comment-page|search|cari)\//i,
  /\/(wp-content|wp-admin|wp-login|wp-json)\b/i,
  /\.(jpg|jpeg|png|gif|webp|svg|pdf|zip|css|js|xml)(\?|$)/i,
];

function isExcludedUrl(url: string): boolean {
  return EXCLUDE_PATH_PATTERNS.some((re) => re.test(url));
}

/** Analisis 1 halaman: artikel tunggal, atau listing berisi banyak link artikel */
export function analyzeListingPage(html: string, baseUrl: string): ListingAnalysis {
  const $ = cheerio.load(html);

  let origin: string;
  try {
    origin = new URL(baseUrl).origin;
  } catch {
    return { isSingleArticle: false, links: [] };
  }

  // --- 1) Cek apakah ini artikel tunggal ---
  const scopeSelectors = ["article", ".post-content", ".entry-content", ".content", "main"];
  let longestScopeText = "";
  for (const sel of scopeSelectors) {
    const candidate = $(sel).first();
    if (candidate.length) {
      const t = candidate.text().trim();
      if (t.length > longestScopeText.length) longestScopeText = t;
    }
  }
  const hasH1 = $("h1").first().text().trim().length > 0;
  // Sinyal kuat: meta khusus halaman artikel tunggal (og:type=article / article:published_time).
  // Sengaja TIDAK pakai keberadaan <time> sembarangan di halaman — di halaman listing,
  // tiap kartu berita biasanya juga punya <time> sendiri-sendiri, jadi itu bukan sinyal yang bisa dipercaya.
  const hasArticleMeta =
    $("meta[property='article:published_time']").length > 0 ||
    $("meta[property='og:type']").attr("content") === "article";

  const isSingleArticle = hasH1 && longestScopeText.length > 600 && (hasArticleMeta || longestScopeText.length > 2000);

  if (isSingleArticle) {
    return { isSingleArticle: true, links: [] };
  }

  // --- 2) Mode listing: kumpulkan kandidat link artikel ---
  const candidates = new Map<string, string>(); // url -> teks anchor terpanjang yang ditemukan

  $("a[href]").each((_: number, el: any) => {
    const href = $(el).attr("href");
    if (!href) return;

    let abs: string;
    try {
      abs = new URL(href, baseUrl).toString();
    } catch {
      return;
    }

    if (!abs.startsWith(origin)) return; // cuma domain sendiri
    if (isExcludedUrl(abs)) return;

    let path: string;
    try {
      path = new URL(abs).pathname.replace(/\/+$/, "");
    } catch {
      return;
    }
    if (!path || path === "") return; // link ke root domain, bukan artikel

    const text = $(el).text().trim();
    if (text.length < 15) return; // teks anchor terlalu pendek biasanya label menu, bukan judul

    const existing = candidates.get(abs);
    if (!existing || text.length > existing.length) candidates.set(abs, text);
  });

  // Judul artikel asli biasanya lebih panjang teksnya dari label navigasi/menu
  const links = Array.from(candidates.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .map(([url]) => url)
    .slice(0, 25);

  return { isSingleArticle: false, links };
}
