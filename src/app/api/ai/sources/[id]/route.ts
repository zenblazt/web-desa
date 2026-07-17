import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/ai/sources/[id]
 * body: { autoApprove?: boolean, isActive?: boolean, contentType?: string, name?: string, url?: string }
 *
 * Dipakai buat toggle "Otomatis publish" per sumber langsung dari dashboard,
 * tanpa harus hapus & bikin ulang sumbernya.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { autoApprove, isActive, contentType, name, url, searchKeywords } = body as {
    autoApprove?: boolean;
    isActive?: boolean;
    contentType?: string;
    name?: string;
    url?: string;
    searchKeywords?: string;
  };

  const source = await prisma.aiSource.update({
    where: { id: params.id },
    data: {
      ...(autoApprove !== undefined ? { autoApprove } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      ...(contentType !== undefined ? { contentType: contentType as any } : {}),
      ...(name !== undefined ? { name } : {}),
      ...(url !== undefined ? { url } : {}),
      ...(searchKeywords !== undefined ? { searchKeywords } : {}),
    },
  });

  return NextResponse.json({ source });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.aiSource.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
