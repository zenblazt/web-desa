import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateSlug } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = await prisma.layanan.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { title, description, icon, requirements, procedure, duration, cost, formUrl, isPopular } = body;
  if (!title || !description) return NextResponse.json({ error: "Judul dan deskripsi wajib diisi" }, { status: 400 });

  const item = await prisma.layanan.create({
    data: { title, slug: generateSlug(title), description, icon, requirements, procedure, duration, cost, formUrl, isPopular: !!isPopular },
  });
  return NextResponse.json({ item });
}
