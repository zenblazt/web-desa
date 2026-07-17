import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const item = await prisma.settings.upsert({
    where: { id: "site_settings" },
    update: {},
    create: { id: "site_settings" },
  });
  return NextResponse.json({ item });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();

  const item = await prisma.settings.upsert({
    where: { id: "site_settings" },
    update: body,
    create: { id: "site_settings", ...body },
  });
  return NextResponse.json({ item });
}
