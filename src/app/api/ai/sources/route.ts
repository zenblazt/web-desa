import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET  /api/ai/sources  -> list sumber (link resmi yang admin daftarkan untuk AI)
 * POST /api/ai/sources  -> tambah sumber baru { name, url, type }
 *
 * Sesuai spec: "editor bisa kasih link untuk AI (wajib 2 opsi)"
 * -> minimal admin harus punya >= 2 sumber aktif sebelum AUTO_SEARCH dijalankan,
 *    validasi jumlah dicek di UI dashboard (src/app/admin/ai-assistant).
 */
export async function GET() {
  const sources = await prisma.aiSource.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ sources });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, url, type } = await req.json();
  if (!name || !url) {
    return NextResponse.json({ error: "name dan url wajib diisi" }, { status: 400 });
  }

  const source = await prisma.aiSource.create({
    data: { name, url, type: type ?? "MANUAL_LINK" },
  });

  return NextResponse.json({ source });
}
