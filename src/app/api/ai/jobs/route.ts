import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/ai/jobs?contentType=BERITA&confirm=RESET
 *
 * Hapus histori AiJob (mentah — semua status, termasuk PUBLISHED/REJECTED/FAILED)
 * untuk 1 contentType. Dipakai kalau dedupe "sudah pernah diproses" nyangkut
 * gara-gara AiJob lama masih ada padahal konten aslinya (Berita/UMKM/dll) sudah
 * dihapus manual — bukan lewat tombol "Hapus Semua" yang otomatis ikut bersihin ini.
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const confirm = req.nextUrl.searchParams.get("confirm");
    if (confirm !== "RESET") {
      return NextResponse.json({ error: "Konfirmasi tidak valid" }, { status: 400 });
    }

    const contentType = req.nextUrl.searchParams.get("contentType");

    const deleted = await prisma.aiJob.deleteMany({
      where: contentType ? { contentType: contentType as any } : undefined,
    });

    return NextResponse.json({ deleted: deleted.count });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Gagal reset histori" }, { status: 500 });
  }
}
