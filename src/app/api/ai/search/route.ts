import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { searchFreshNews, getSearchQuotaStatus } from "@/lib/search-engine";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai/search
 * body: { topic?: string }
 *
 * Cari di search engine (Google Programmable Search, free tier) info/berita
 * terbaru tentang desa yang belum ada di situs sendiri. HEMAT karena:
 *  - 1 topik = 1 query saja (bukan multi-query per kata kunci)
 *  - hasil yang sudah pernah masuk Berita/AiJob otomatis dibuang (dedupe)
 *  - kuota harian di-cap sendiri, ditolak duluan sebelum kena limit Google
 *
 * Hasil di sini CUMA PREVIEW (title, url, snippet) — belum masuk AiJob,
 * belum makan kuota Gemini. Admin pilih salah satu link lewat UI, lalu itu
 * baru diproses via /api/ai/scrape (MANUAL_LINK) yang extract + summarize.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { topic } = (await req.json().catch(() => ({}))) as { topic?: string };
    const results = await searchFreshNews(topic);
    return NextResponse.json({ results, quota: await getSearchQuotaStatus() });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({ quota: await getSearchQuotaStatus() });
}
