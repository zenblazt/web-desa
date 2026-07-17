import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = await prisma.galeri.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { title, image, category } = body;
  if (!title || !image) return NextResponse.json({ error: "Judul dan gambar wajib diisi" }, { status: 400 });

  const item = await prisma.galeri.create({ data: { title, image, category: category || "Umum" } });
  return NextResponse.json({ item });
}
