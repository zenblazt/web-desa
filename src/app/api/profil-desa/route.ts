import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const item = await prisma.profilDesa.findFirst();
  return NextResponse.json({ item });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();

  const existing = await prisma.profilDesa.findFirst();
  const item = existing
    ? await prisma.profilDesa.update({ where: { id: existing.id }, data: body })
    : await prisma.profilDesa.create({ data: body });

  return NextResponse.json({ item });
}
