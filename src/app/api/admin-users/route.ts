import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function requireSuperadmin() {
  const session = await getServerSession(authOptions);
  if (!session) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (session.user.role !== "SUPERADMIN") {
    return { error: NextResponse.json({ error: "Cuma SUPERADMIN yang boleh akses ini" }, { status: 403 }) };
  }
  return { session };
}

export async function GET() {
  const { error } = await requireSuperadmin();
  if (error) return error;

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const { error } = await requireSuperadmin();
  if (error) return error;

  const body = await req.json();
  const { name, email, password, role } = body as { name?: string; email?: string; password?: string; role?: string };

  if (!name?.trim() || !email?.trim() || !password) {
    return NextResponse.json({ error: "Nama, email, dan password wajib diisi" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password minimal 8 karakter" }, { status: 400 });
  }
  if (!["SUPERADMIN", "ADMIN", "EDITOR"].includes(role || "")) {
    return NextResponse.json({ error: "Role tidak valid" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email sudah dipakai" }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, password: hashed, role: role as any },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return NextResponse.json({ user });
}
