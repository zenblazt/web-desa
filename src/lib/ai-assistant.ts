/**
 * AI Assistant Service
 * ---------------------
 * Dua mode kerja (sesuai spec):
 *  1. MANUAL_LINK  -> admin kasih URL, AI fetch + ringkas isinya.
 *  2. AUTO_SEARCH  -> AI cari sendiri berita terbaru tentang desa
 *                     berdasarkan tanggal, dari daftar AiSource aktif.
 *
 * Setelah dapat teks mentah, AI membuat:
 *   - ringkasan (summary)
 *   - judul SEO
 *   - meta description
 *   - tags
 *   - slug
 * Semua hasil masuk status NEEDS_REVIEW, admin yang approve sebelum publish.
 *
 * Model: Google Gemini (AI Studio, free tier) via REST API.
 * Dapatkan API key gratis di https://aistudio.google.com/apikey
 */

import * as cheerio from "cheerio";
import { generateSlug } from "@/lib/utils";
import { withGeminiRetry, geminiLimiter } from "@/lib/rate-limiter";
import { getVillageInfo } from "@/lib/village";

// gemini-3.1-flash-lite = model ringan/cepat generasi terbaru (GA).
// gemini-2.5-flash-lite sudah TIDAK BISA dipakai API key baru per pertengahan 2026.
// Bisa dioverride lewat env GEMINI_MODEL kalau mau pakai model lain.
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/** Status limiter saat ini, buat ditampilkan di admin panel */
export function getGeminiQuotaStatus() {
  return geminiLimiter.getStatus();
}

interface ExtractedContent {
  title: string;
  text: string;
  url: string;
  featuredImage?: string | null;
  contentImages?: string[];
  originalPublishedAt?: string | null;
}

function resolveUrl(src: string, base: string): string | null {
  try {
    return new URL(src, base).toString();
  } catch {
    return null;
  }
}

/** Ambil & bersihkan konten utama dari sebuah URL berita/pengumuman resmi (termasuk gambar) */
export async function extractFromUrl(url: string): Promise<ExtractedContent> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; DesaTanjungsariBot/1.0)" },
  });
  if (!res.ok) throw new Error(`Gagal mengambil konten dari ${url} (${res.status})`);

  const html = await res.text();
  const $ = cheerio.load(html);

  // Gambar unggulan: og:image dulu, baru twitter:image sebagai fallback.
  const rawFeatured =
    $("meta[property='og:image']").attr("content") ||
    $("meta[name='twitter:image']").attr("content") ||
    null;
  const featuredImage = rawFeatured ? resolveUrl(rawFeatured, url) : null;

  // Tanggal publish asli (kalau situs sumber menyediakan meta-nya).
  const rawPublished =
    $("meta[property='article:published_time']").attr("content") ||
    $("time[datetime]").first().attr("datetime") ||
    null;
  const originalPublishedAt = rawPublished && !isNaN(new Date(rawPublished).getTime()) ? rawPublished : null;

  const title =
    $("meta[property='og:title']").attr("content") ||
    $("h1").first().text().trim() ||
    $("title").text().trim();

  $("script, style, nav, footer, header, iframe, .ads, .advertisement, .related, .sidebar, .widget").remove();

  // Cari wrapper artikel yang paling spesifik dulu (article > .post-content > .content > main),
  // biar gambar & paragraf yang diambil BENAR-BENAR dari isi berita, bukan ikut kebawa
  // thumbnail "artikel terkait"/sidebar yang kadang nempel di dalam <main>.
  const scopeSelectors = ["article", ".post-content", ".entry-content", ".content", "main"];
  let $scope = $("body");
  for (const sel of scopeSelectors) {
    const candidate = $(sel).first();
    if (candidate.length && candidate.text().trim().length > 150) {
      $scope = candidate;
      break;
    }
  }

  // Gambar-gambar di dalam konten artikel (dari scope yang sudah dipersempit di atas).
  const contentImages: string[] = [];
  $scope.find("img").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src");
    if (!src || src.startsWith("data:")) return;
    const resolved = resolveUrl(src, url);
    if (resolved && !contentImages.includes(resolved) && resolved !== featuredImage) {
      contentImages.push(resolved);
    }
  });

  // Ambil paragraf-paragraf utama dari scope yang sama (heuristik sederhana, boleh diganti readability lib)
  const paragraphs: string[] = [];
  $scope.find("p").each((_, el) => {
    const t = $(el).text().trim();
    if (t.length > 40) paragraphs.push(t);
  });

  const text = paragraphs.join("\n\n").slice(0, 12000); // batasi supaya hemat token

  return { title, text, url, featuredImage, contentImages: contentImages.slice(0, 8), originalPublishedAt };
}

/** Cari sumber berita terbaru tentang desa lewat web search (dipanggil dari route AUTO_SEARCH) */
export async function buildAutoSearchQuery(villageLabel?: string) {
  const label = villageLabel || (await getVillageInfo()).fullLabel;
  const today = new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date());
  return `berita terbaru ${label} ${today}`;
}

interface AiDraft {
  summary: string;
  suggestedTitle: string;
  suggestedSlug: string;
  suggestedMetaDescription: string;
  suggestedTags: string;
}

/** Panggil Gemini API (AI Studio, free tier) untuk meringkas + generate SEO metadata */
export async function summarizeAndGenerateSeo(content: ExtractedContent): Promise<AiDraft> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY belum diset di environment variables");

  const prompt = `Kamu adalah asisten redaksi website resmi desa. Berikut konten mentah hasil scraping dari sumber resmi (URL: ${content.url}).

JUDUL ASLI: ${content.title}

ISI:
${content.text}

Tugas kamu, kembalikan HANYA JSON valid (tanpa markdown, tanpa penjelasan tambahan) dengan struktur persis seperti ini:
{
  "summary": "ringkasan berita 150-250 kata, bahasa Indonesia baku, netral, informatif, fokus ke info penting untuk warga desa",
  "suggestedTitle": "judul SEO menarik max 65 karakter",
  "suggestedSlug": "slug-url-ramah-seo",
  "suggestedMetaDescription": "meta description 140-160 karakter",
  "suggestedTags": "tag1, tag2, tag3"
}`;

  const parsed = await withGeminiRetry(async () => {
    const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1500,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      const err: any = new Error(`Gemini request gagal: ${res.status} ${errBody}`);
      err.status = res.status;
      throw err;
    }

    const data = await res.json();
    const textBlock: string =
      data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    const cleaned = textBlock.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  });

  return {
    summary: parsed.summary,
    suggestedTitle: parsed.suggestedTitle,
    suggestedSlug: generateSlug(parsed.suggestedSlug || parsed.suggestedTitle),
    suggestedMetaDescription: parsed.suggestedMetaDescription,
    suggestedTags: parsed.suggestedTags,
  };
}

/**
 * Versi BATCH: ringkas beberapa konten sekaligus dalam 1 request Gemini.
 * Ini yang paling efektif menghemat kuota — 10 berita jadi ~2 request
 * (chunk 5/request) bukan 10 request. Dipakai saat scraping banyak item
 * (mis. hasil WP-JSON atau hasil search engine) sekaligus.
 */
export async function summarizeAndGenerateSeoBatch(
  contents: ExtractedContent[],
  chunkSize = 5
): Promise<AiDraft[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY belum diset di environment variables");
  if (contents.length === 0) return [];

  const results: AiDraft[] = [];

  for (let i = 0; i < contents.length; i += chunkSize) {
    const chunk = contents.slice(i, i + chunkSize);

    const itemsPrompt = chunk
      .map(
        (c, idx) =>
          `--- ITEM ${idx} ---\nURL: ${c.url}\nJUDUL ASLI: ${c.title}\nISI:\n${c.text.slice(0, 4000)}`
      )
      .join("\n\n");

    const prompt = `Kamu asisten redaksi website resmi desa. Berikut ${chunk.length} konten mentah hasil scraping (dipisah "--- ITEM n ---").

${itemsPrompt}

Tugas kamu, kembalikan HANYA JSON array valid (tanpa markdown, tanpa penjelasan), urut sesuai nomor ITEM, tiap elemen strukturnya persis:
{
  "summary": "ringkasan 150-250 kata, bahasa Indonesia baku, netral, informatif",
  "suggestedTitle": "judul SEO menarik max 65 karakter",
  "suggestedSlug": "slug-url-ramah-seo",
  "suggestedMetaDescription": "meta description 140-160 karakter",
  "suggestedTags": "tag1, tag2, tag3"
}`;

    const parsedArray = await withGeminiRetry(async () => {
      const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 500 * chunk.length + 500,
            responseMimeType: "application/json",
          },
        }),
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        const err: any = new Error(`Gemini request gagal: ${res.status} ${errBody}`);
        err.status = res.status;
        throw err;
      }

      const data = await res.json();
      const textBlock: string =
        data.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
      const cleaned = textBlock.replace(/```json|```/g, "").trim();
      return JSON.parse(cleaned) as any[];
    });

    for (const parsed of parsedArray) {
      results.push({
        summary: parsed.summary,
        suggestedTitle: parsed.suggestedTitle,
        suggestedSlug: generateSlug(parsed.suggestedSlug || parsed.suggestedTitle),
        suggestedMetaDescription: parsed.suggestedMetaDescription,
        suggestedTags: parsed.suggestedTags,
      });
    }
  }

  return results;
}
