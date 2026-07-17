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
