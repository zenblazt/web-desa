import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateTagsForBerita } from "@/lib/ai-assistant";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai/generate-tags
 * body: { title: string, excerpt?: string, content: string }
 * Dipakai tombol "Generate Tag Otomatis" di form berita manual — pakai kuota AI yang sudah ada.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, excerpt, content } = body as { title?: string; excerpt?: string; content?: string };

  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: "Judul dan isi berita wajib diisi dulu sebelum generate tag" }, { status: 400 });
  }

  try {
    const tags = await generateTagsForBerita({ title, excerpt, content });
    return NextResponse.json({ tags });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Gagal generate tag" }, { status: 500 });
  }
}
