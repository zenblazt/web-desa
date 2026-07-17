import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateSlug } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface Params { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const item = await prisma.berita.findUnique({ where: { id: params.id }, include: { seoMeta: true } });
  if (!item) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ item });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    title, excerpt, content, coverImage, category, tags, status,
    metaTitle, metaDescription, keywords,
  } = body;

  const existing = await prisma.berita.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

  if (existing.seoMetaId) {
    await prisma.seoMeta.update({
      where: { id: existing.seoMetaId },
      data: { metaTitle: metaTitle || title, metaDescription, keywords, ogImage: coverImage },
    });
  }

  const wasPublished = existing.status === "PUBLISHED";
  const nowPublished = status === "PUBLISHED";

  const berita = await prisma.berita.update({
    where: { id: params.id },
    data: {
      title,
      slug: title ? generateSlug(title) : undefined,
      excerpt,
      content,
      coverImage,
      category,
      tags,
      status,
      publishedAt: !wasPublished && nowPublished ? new Date() : existing.publishedAt,
    },
  });

  return NextResponse.json({ berita });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.berita.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
