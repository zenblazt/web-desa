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

const GEMINI_MODEL = "gemini-2.0-flash"; // cepat & masuk free tier AI Studio
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

interface ExtractedContent {
  title: string;
  text: string;
  url: string;
}

/** Ambil & bersihkan konten utama dari sebuah URL berita/pengumuman resmi */
export async function extractFromUrl(url: string): Promise<ExtractedContent> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; DesaTanjungsariBot/1.0)" },
  });
  if (!res.ok) throw new Error(`Gagal mengambil konten dari ${url} (${res.status})`);

  const html = await res.text();
  const $ = cheerio.load(html);

  $("script, style, nav, footer, header, iframe, .ads, .advertisement").remove();

  const title =
    $("meta[property='og:title']").attr("content") ||
    $("h1").first().text().trim() ||
    $("title").text().trim();

  // Ambil paragraf-paragraf utama (heuristik sederhana, boleh diganti readability lib)
  const paragraphs: string[] = [];
  $("article p, main p, .content p, .post-content p, p").each((_, el) => {
    const t = $(el).text().trim();
    if (t.length > 40) paragraphs.push(t);
  });

  const text = paragraphs.join("\n\n").slice(0, 12000); // batasi supaya hemat token

  return { title, text, url };
}

/** Cari sumber berita terbaru tentang desa lewat web search (dipanggil dari route AUTO_SEARCH) */
export async function buildAutoSearchQuery(villageName = "Desa Tanjungsari Kecamatan Jenangan") {
  const today = new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date());
  return `berita terbaru ${villageName} ${today}`;
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
    throw new Error(`Gemini request gagal: ${res.status} ${errBody}`);
  }

  const data = await res.json();
  const textBlock: string =
    data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
  const cleaned = textBlock.replace(/```json|```/g, "").trim();

  const parsed = JSON.parse(cleaned);
  return {
    summary: parsed.summary,
    suggestedTitle: parsed.suggestedTitle,
    suggestedSlug: generateSlug(parsed.suggestedSlug || parsed.suggestedTitle),
    suggestedMetaDescription: parsed.suggestedMetaDescription,
    suggestedTags: parsed.suggestedTags,
  };
}
