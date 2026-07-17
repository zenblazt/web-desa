import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchWpPosts } from "@/lib/wp-scraper";
import { summarizeAndGenerateSeoBatch } from "@/lib/ai-assistant";
import { publishAiJob } from "@/lib/ai-publish";
import { generateSlug } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai/scrape-wp
 * body: { aiSourceId: string, maxPages?: number, useAi?: boolean }
 *
 * Scrape situs WordPress (mis. desatanjungsari.id) lewat REST API-nya.
 * Default (useAi=false): 0 request Gemini — judul/isi diambil apa adanya
 * dari WP, langsung jadi AiJob berstatus NEEDS_REVIEW buat admin cek.
 * Kalau useAi=true: hasil scrape dirapikan AI, tapi tetap di-BATCH
 * (beberapa post per 1 request) supaya hemat kuota.
 *
 * Otomatis skip post yang URL-nya sudah pernah masuk Berita/AiJob (dedupe),
 * jadi scrape berulang gak bikin duplikat / gak buang-buang kuota AI.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { aiSourceId, maxPages, useAi } = (await req.json()) as {
      aiSourceId: string;
      maxPages?: number;
      useAi?: boolean;
    };

    if (!aiSourceId) {
      return NextResponse.json({ error: "aiSourceId wajib diisi" }, { status: 400 });
    }

    const source = await prisma.aiSource.findUnique({ where: { id: aiSourceId } });
    if (!source || !source.isActive) {
      return NextResponse.json({ error: "Sumber tidak ditemukan / nonaktif" }, { status: 404 });
    }

    // fetchWpPosts sudah mengurutkan hasilnya kronologis berdasarkan tanggal
    // post ASLI (paling lama dulu) — jadi urutan scrape & urutan publish
    // ngikutin timeline situs sumber, bukan urutan kedatangan halaman.
    const posts = await fetchWpPosts(source.url, { maxPages: maxPages ?? 3, perPage: 20 });

    // Dedupe terhadap yang sudah ada
    const [existingBerita, existingJobs] = await Promise.all([
      prisma.berita.findMany({ where: { sourceUrl: { not: null } }, select: { sourceUrl: true } }),
      prisma.aiJob.findMany({ where: { sourceUrl: { not: null } }, select: { sourceUrl: true } }),
    ]);
    const knownUrls = new Set(
      [...existingBerita, ...existingJobs].map((r) => r.sourceUrl).filter(Boolean) as string[]
    );

    const newPosts = posts.filter((p) => !knownUrls.has(p.url));

    if (newPosts.length === 0) {
      await prisma.aiSource.update({ where: { id: source.id }, data: { lastCheckedAt: new Date() } });
      return NextResponse.json({ created: 0, published: 0, skipped: posts.length, message: "Tidak ada post baru." });
    }

    let drafts: { summary: string; suggestedTitle: string; suggestedSlug: string; suggestedMetaDescription: string; suggestedTags: string }[];

    if (useAi) {
      // Batch: hemat kuota — beberapa post digabung per request Gemini
      drafts = await summarizeAndGenerateSeoBatch(
        newPosts.map((p) => ({ title: p.title, text: p.content, url: p.url })),
        5
      );
    } else {
      // Tanpa AI sama sekali — pakai data mentah dari WP apa adanya
      drafts = newPosts.map((p) => ({
        summary: p.content.slice(0, 2000) || p.excerpt,
        suggestedTitle: p.title,
        suggestedSlug: generateSlug(p.title),
        suggestedMetaDescription: p.excerpt.slice(0, 160),
        suggestedTags: p.categories.join(", "),
      }));
    }

    // Buat AiJob dulu (tetap tersimpan sebagai arsip/audit), urutannya
    // dijaga sesuai `newPosts` (kronologis) lewat $transaction sequential.
    const createdJobs = await prisma.$transaction(
      newPosts.map((post, i) =>
        prisma.aiJob.create({
          data: {
            sourceType: "WP_JSON",
            sourceUrl: post.url,
            aiSourceId: source.id,
            contentType: source.contentType,
            status: "NEEDS_REVIEW",
            rawExtract: post.content,
            summary: drafts[i]?.summary,
            suggestedTitle: drafts[i]?.suggestedTitle,
            suggestedSlug: drafts[i]?.suggestedSlug,
            suggestedMetaDescription: drafts[i]?.suggestedMetaDescription,
            suggestedTags: drafts[i]?.suggestedTags,
            featuredImage: post.featuredImage,
            contentImages: post.images.length > 0 ? post.images : undefined,
            originalPublishedAt: new Date(post.publishedAt),
          },
        })
      )
    );

    let publishedCount = 0;
    const publishErrors: string[] = [];

    // Kalau sumber ini di-set "Otomatis publish", langsung terbitkan semua
    // job yang baru dibuat tadi (urut kronologis) — admin ga perlu review manual.
    if (source.autoApprove) {
      for (const job of createdJobs) {
        try {
          const result = await publishAiJob({ job, authorId: (session.user as any).id, publish: true });
          await prisma.aiJob.update({
            where: { id: job.id },
            data: { status: "PUBLISHED", reviewedById: (session.user as any).id, beritaId: result.beritaId, resultEntityId: result.entityId },
          });
          publishedCount++;
        } catch (err: any) {
          publishErrors.push(err.message);
          await prisma.aiJob.update({ where: { id: job.id }, data: { errorMessage: err.message } });
        }
      }
    }

    await prisma.aiSource.update({ where: { id: source.id }, data: { lastCheckedAt: new Date() } });

    return NextResponse.json({
      created: createdJobs.length,
      published: publishedCount,
      needsReview: createdJobs.length - publishedCount,
      skipped: posts.length - newPosts.length,
      usedAi: !!useAi,
      autoApprove: !!source.autoApprove,
      publishErrors: publishErrors.length ? publishErrors : undefined,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
