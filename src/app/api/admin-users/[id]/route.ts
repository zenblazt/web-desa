import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface Params { params: { id: string } }

async function requireSuperadmin() {
  const session = await getServerSession(authOptions);
  if (!session) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (session.user.role !== "SUPERADMIN") {
    return { error: NextResponse.json({ error: "Cuma SUPERADMIN yang boleh akses ini" }, { status: 403 }) };
  }
  return { session };
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { error } = await requireSuperadmin();
  if (error) return error;

  const body = await req.json();
  const { role } = body as { role?: string };
  if (!["SUPERADMIN", "ADMIN", "EDITOR"].includes(role || "")) {
    return NextResponse.json({ error: "Role tidak valid" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data: { role: role as any },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  return NextResponse.json({ user });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { error, session } = await requireSuperadmin();
  if (error) return error;

  if (session!.user.id === params.id) {
    return NextResponse.json({ error: "Tidak bisa menghapus akun sendiri" }, { status: 400 });
  }

  const superadminCount = await prisma.user.count({ where: { role: "SUPERADMIN" } });
  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (target?.role === "SUPERADMIN" && superadminCount <= 1) {
    return NextResponse.json({ error: "Tidak bisa menghapus SUPERADMIN terakhir" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
