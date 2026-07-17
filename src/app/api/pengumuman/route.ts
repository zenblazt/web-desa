import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateSlug } from "@/lib/utils";

export async function GET() {
  const items = await prisma.pengumuman.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { title, content, category, isPinned, status, attachment } = body;
  if (!title || !content) return NextResponse.json({ error: "Judul dan isi wajib diisi" }, { status: 400 });

  const item = await prisma.pengumuman.create({
    data: {
      title, slug: generateSlug(title), content, category: category || "Umum",
      isPinned: !!isPinned, status: status || "DRAFT",
      publishedAt: status === "PUBLISHED" ? new Date() : null,
      attachment, authorId: (session.user as any).id,
    },
  });
  return NextResponse.json({ item });
}
