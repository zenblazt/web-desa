import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ berita: [], pengumuman: [], layanan: [], umkm: [] });

  const [berita, pengumuman, layanan, umkm] = await Promise.all([
    prisma.berita.findMany({
      where: { status: "PUBLISHED", OR: [{ title: { contains: q } }, { excerpt: { contains: q } }] },
      take: 8,
    }),
    prisma.pengumuman.findMany({
      where: { status: "PUBLISHED", title: { contains: q } },
      take: 8,
    }),
    prisma.layanan.findMany({
      where: { isActive: true, title: { contains: q } },
      take: 8,
    }),
    prisma.umkm.findMany({
      where: { isActive: true, name: { contains: q } },
      take: 8,
    }),
  ]);

  return NextResponse.json({ berita, pengumuman, layanan, umkm });
}
