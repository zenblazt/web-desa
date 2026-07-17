import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateSlug } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = await prisma.umkm.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { name, ownerName, category, description, image, phone, whatsapp, address, isFeatured } = body;
  if (!name || !ownerName || !description) return NextResponse.json({ error: "Data wajib diisi" }, { status: 400 });

  const item = await prisma.umkm.create({
    data: { name, slug: generateSlug(name), ownerName, category: category || "Umum", description, image, phone, whatsapp, address, isFeatured: !!isFeatured },
  });
  return NextResponse.json({ item });
}
