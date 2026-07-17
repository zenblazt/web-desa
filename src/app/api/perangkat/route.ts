import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = await prisma.perangkatDesa.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { name, position, photo, phone, email, bio } = body;
  if (!name || !position) return NextResponse.json({ error: "Nama dan jabatan wajib diisi" }, { status: 400 });

  const item = await prisma.perangkatDesa.create({ data: { name, position, photo, phone, email, bio } });
  return NextResponse.json({ item });
}
