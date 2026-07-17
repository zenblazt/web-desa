import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publishAiJob } from "@/lib/ai-publish";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai/summarize  (dipakai untuk "Approve & Publish" dari dashboard)
 * body: { jobId: string, action: "approve" | "reject", editedFields?: {...}, publish?: boolean }
 *
 * Ini adalah langkah 4-5 dari workflow spec: "Admin review" -> "Publish".
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { jobId, action, editedFields, publish } = body as {
    jobId: string;
    action: "approve" | "reject";
    editedFields?: {
      title?: string;
      slug?: string;
      summary?: string;
      metaDescription?: string;
      tags?: string;
      category?: string;
      image?: string | null;
    };
    publish?: boolean;
  };

  const job = await prisma.aiJob.findUnique({ where: { id: jobId } });
  if (!job) return NextResponse.json({ error: "Job tidak ditemukan" }, { status: 404 });

  if (action === "reject") {
    const updated = await prisma.aiJob.update({
      where: { id: jobId },
      data: { status: "REJECTED", reviewedById: (session.user as any).id },
    });
    return NextResponse.json({ job: updated });
  }

  // action === "approve" -> buat/publish entitas sesuai contentType job ini
  try {
    const result = await publishAiJob({
      job,
      authorId: (session.user as any).id,
      publish: !!publish,
      editedFields,
    });

    // UMKM/Galeri/Perangkat Desa langsung "hidup" begitu dibuat (gak punya status draft),
    // jadi selalu dianggap PUBLISHED. Berita/Pengumuman ngikutin flag `publish`.
    const hasDraftState = job.contentType === "BERITA" || job.contentType === "PENGUMUMAN";
    const finalStatus = !hasDraftState || publish ? "PUBLISHED" : "APPROVED";

    const updatedJob = await prisma.aiJob.update({
      where: { id: jobId },
      data: {
        status: finalStatus,
        reviewedById: (session.user as any).id,
        beritaId: result.beritaId,
        resultEntityId: result.entityId,
      },
    });

    return NextResponse.json({ job: updatedJob, entityType: result.entityType, entityId: result.entityId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
