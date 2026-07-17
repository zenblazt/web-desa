import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateSlug } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = await prisma.berita.findMany({ orderBy: { createdAt: "desc" }, include: { seoMeta: true } });
  return NextResponse.json({ items });
}

/**
 * DELETE /api/berita?confirm=HAPUS_SEMUA
 * Hapus SEMUA berita sekaligus. Sengaja butuh query "confirm" yang spesifik
 * (bukan cuma DELETE tanpa syarat) supaya gak ke-trigger gak sengaja.
 */
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const confirm = req.nextUrl.searchParams.get("confirm");
  if (confirm !== "HAPUS_SEMUA") {
    return NextResponse.json({ error: "Konfirmasi tidak valid" }, { status: 400 });
  }

  const beritaList = await prisma.berita.findMany({ select: { id: true, seoMetaId: true } });
  const seoMetaIds = beritaList.map((b) => b.seoMetaId).filter(Boolean) as string[];

  const result = await prisma.$transaction(async (tx) => {
    // Lepas dulu referensi dari AiJob supaya gak kena constraint pas berita dihapus.
    await tx.aiJob.updateMany({ where: { beritaId: { not: null } }, data: { beritaId: null } });
    const deleted = await tx.berita.deleteMany({});
    if (seoMetaIds.length > 0) {
      await tx.seoMeta.deleteMany({ where: { id: { in: seoMetaIds } } });
    }
    return deleted;
  });

  return NextResponse.json({ deleted: result.count });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    title, excerpt, content, coverImage, category, tags, status,
    metaTitle, metaDescription, keywords,
  } = body;

  if (!title || !content) {
    return NextResponse.json({ error: "Judul dan konten wajib diisi" }, { status: 400 });
  }

  const slug = generateSlug(title);

  const seoMeta = await prisma.seoMeta.create({
    data: { metaTitle: metaTitle || title, metaDescription, keywords, ogImage: coverImage },
  });

  const berita = await prisma.berita.create({
    data: {
      title,
      slug,
      excerpt: excerpt || content.slice(0, 200),
      content,
      coverImage,
      category: category || "Umum",
      tags,
      status: status || "DRAFT",
      publishedAt: status === "PUBLISHED" ? new Date() : null,
      authorId: (session.user as any).id,
      seoMetaId: seoMeta.id,
    },
  });

  return NextResponse.json({ berita });
}
