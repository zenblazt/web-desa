import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { extractFromUrl, summarizeAndGenerateSeo } from "@/lib/ai-assistant";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai/scrape
 * body opsi 1 (MANUAL_LINK): { type: "MANUAL_LINK", url: string, aiSourceId?: string }
 * body opsi 2 (AUTO_SEARCH): { type: "AUTO_SEARCH", aiSourceId: string }  // pakai url dari AiSource aktif
 *
 * Flow: extract -> summarize + SEO -> simpan sebagai AiJob(status=NEEDS_REVIEW)
 * Admin baru approve/publish manual lewat dashboard.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { type, url, aiSourceId, contentType } = body as {
      type: "MANUAL_LINK" | "AUTO_SEARCH";
      url?: string;
      aiSourceId?: string;
      contentType?: string;
    };

    let targetUrl = url;
    let resolvedContentType = contentType ?? "BERITA";

    if (type === "AUTO_SEARCH") {
      if (!aiSourceId) {
        return NextResponse.json({ error: "aiSourceId wajib untuk AUTO_SEARCH" }, { status: 400 });
      }
      const source = await prisma.aiSource.findUnique({ where: { id: aiSourceId } });
      if (!source || !source.isActive) {
        return NextResponse.json({ error: "Sumber tidak ditemukan / nonaktif" }, { status: 404 });
      }
      targetUrl = source.url;
      resolvedContentType = contentType ?? source.contentType;
      await prisma.aiSource.update({
        where: { id: source.id },
        data: { lastCheckedAt: new Date() },
      });
    }

    if (!targetUrl) {
      return NextResponse.json({ error: "URL wajib diisi" }, { status: 400 });
    }

    const job = await prisma.aiJob.create({
      data: {
        sourceType: type,
        sourceUrl: targetUrl,
        aiSourceId: type === "AUTO_SEARCH" ? aiSourceId : undefined,
        contentType: resolvedContentType as any,
        status: "RUNNING",
      },
    });

    try {
      const extracted = await extractFromUrl(targetUrl);
      const draft = await summarizeAndGenerateSeo(extracted);

      const updated = await prisma.aiJob.update({
        where: { id: job.id },
        data: {
          rawExtract: extracted.text,
          summary: draft.summary,
          suggestedTitle: draft.suggestedTitle,
          suggestedSlug: draft.suggestedSlug,
          suggestedMetaDescription: draft.suggestedMetaDescription,
          suggestedTags: draft.suggestedTags,
          status: "NEEDS_REVIEW",
        },
      });

      return NextResponse.json({ job: updated });
    } catch (err: any) {
      await prisma.aiJob.update({
        where: { id: job.id },
        data: { status: "FAILED", errorMessage: err.message },
      });
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contentType = req.nextUrl.searchParams.get("contentType");

  const jobs = await prisma.aiJob.findMany({
    where: contentType ? { contentType: contentType as any } : undefined,
    orderBy: { createdAt: "desc" },
    include: { aiSource: true, berita: true },
    take: 50,
  });
  return NextResponse.json({ jobs });
}
