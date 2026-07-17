import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  // action === "approve" -> buat/publish Berita
  const title = editedFields?.title ?? job.suggestedTitle ?? "Tanpa Judul";
  const slug = editedFields?.slug ?? job.suggestedSlug ?? `berita-${Date.now()}`;
  const summary = editedFields?.summary ?? job.summary ?? "";

  const seoMeta = await prisma.seoMeta.create({
    data: {
      metaTitle: title,
      metaDescription: editedFields?.metaDescription ?? job.suggestedMetaDescription,
      keywords: editedFields?.tags ?? job.suggestedTags,
    },
  });

  const berita = await prisma.berita.create({
    data: {
      title,
      slug,
      excerpt: summary.slice(0, 200),
      content: summary,
      category: editedFields?.category ?? "Umum",
      tags: editedFields?.tags ?? job.suggestedTags,
      status: publish ? "PUBLISHED" : "DRAFT",
      publishedAt: publish ? new Date() : null,
      sourceUrl: job.sourceUrl,
      isAiGenerated: true,
      authorId: (session.user as any).id,
      seoMetaId: seoMeta.id,
    },
  });

  const updatedJob = await prisma.aiJob.update({
    where: { id: jobId },
    data: {
      status: publish ? "PUBLISHED" : "APPROVED",
      reviewedById: (session.user as any).id,
      beritaId: berita.id,
    },
  });

  return NextResponse.json({ job: updatedJob, berita });
}
