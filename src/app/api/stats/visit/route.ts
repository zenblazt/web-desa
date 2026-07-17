import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Dipanggil dari client (fire-and-forget) tiap kali halaman publik dibuka
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { path } = body;
  if (!path) return NextResponse.json({ error: "path wajib" }, { status: 400 });

  await prisma.pageVisit.create({
    data: {
      path,
      referrer: req.headers.get("referer") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
    },
  });

  return NextResponse.json({ success: true });
}
