import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publishAiJob } from "@/lib/ai-publish";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai/approve-all
 * body: { contentType?: "BERITA"|"UMKM"|"GALERI"|"PERANGKAT_DESA"|"PENGUMUMAN", aiSourceId?: string }
 *
 * "Setujui Semua Sekarang" — approve + publish SEMUA AiJob berstatus
 * NEEDS_REVIEW sekaligus (opsional difilter per tab/per sumber), tanpa admin
 * perlu buka satu-satu. Dipakai bareng tombol di dashboard AI Assistant &
 * widget kuota di tab Perangkat Desa/UMKM/Galeri/dll.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { contentType, aiSourceId } = body as { contentType?: string; aiSourceId?: string };

  const jobs = await prisma.aiJob.findMany({
    where: {
      status: "NEEDS_REVIEW",
      ...(contentType ? { contentType: contentType as any } : {}),
      ...(aiSourceId ? { aiSourceId } : {}),
    },
    // approve sesuai urutan tanggal post ASLI (paling lama dulu) supaya publishedAt-nya konsisten kronologis
    orderBy: [{ originalPublishedAt: "asc" }, { createdAt: "asc" }],
  });

  let approved = 0;
  let failed = 0;
  const errors: { jobId: string; message: string }[] = [];

  for (const job of jobs) {
    try {
      const result = await publishAiJob({
        job,
        authorId: (session.user as any).id,
        publish: true,
      });
      await prisma.aiJob.update({
        where: { id: job.id },
        data: {
          status: "PUBLISHED",
          reviewedById: (session.user as any).id,
          beritaId: result.beritaId,
          resultEntityId: result.entityId,
        },
      });
      approved++;
    } catch (err: any) {
      failed++;
      errors.push({ jobId: job.id, message: err.message });
      await prisma.aiJob.update({
        where: { id: job.id },
        data: { errorMessage: err.message },
      });
    }
  }

  return NextResponse.json({ approved, failed, total: jobs.length, errors });
}
