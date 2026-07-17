import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchWpPosts, isWordPressSite } from "@/lib/wp-scraper";
import { extractFromUrl, summarizeAndGenerateSeoBatch } from "@/lib/ai-assistant";
import { analyzeListingPage } from "@/lib/link-discovery";
import { publishAiJob } from "@/lib/ai-publish";
import { generateSlug } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai/check-source
 * body: { aiSourceId: string, useAiRewrite?: boolean }
 *
 * Satu pintu buat tombol "Cek & Ambil Post Baru", gantiin Opsi 1-4 lama.
 * Admin cuma tempel 1 URL pas nambah sumber — sisanya otomatis:
 *
 *  1. Deteksi platform SEKALI, disimpan ke AiSource.platform biar cek
 *     berikutnya gak perlu deteksi ulang:
 *       - WordPress (punya /wp-json/ aktif) -> jalur WP-JSON, 0 kuota AI
 *         kecuali useAiRewrite dinyalain (tetap dibatch, hemat kuota).
 *       - Bukan WordPress -> jalur generic.
 *  2. Jalur generic: cek dulu URL sumbernya sendiri itu 1 artikel utuh atau
 *     halaman listing (analyzeListingPage). Kalau listing, temukan
 *     link-link artikelnya. Baru DEDUPE dulu (skip yang udah ada di
 *     Berita/AiJob) SEBELUM extract & AI — supaya kuota gak kebuang buat
 *     post yang udah pernah masuk. Sisanya di-extract lalu WAJIB diringkas
 *     AI (batch, bukan opsional lagi) biar hasilnya rapi & konsisten.
 *  3. Hasil baru selalu masuk sebagai AiJob(NEEDS_REVIEW), kecuali sumber
 *     di-set "Otomatis publish" -> langsung terbit.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { aiSourceId, useAiRewrite } = (await req.json()) as {
      aiSourceId: string;
      useAiRewrite?: boolean;
    };
    if (!aiSourceId) {
      return NextResponse.json({ error: "aiSourceId wajib diisi" }, { status: 400 });
    }

    const source = await prisma.aiSource.findUnique({ where: { id: aiSourceId } });
    if (!source || !source.isActive) {
      return NextResponse.json({ error: "Sumber tidak ditemukan / nonaktif" }, { status: 404 });
    }

    // 1) Deteksi & simpan platform kalau belum pernah dicek sebelumnya
    let platform = source.platform;
    if (!platform) {
      platform = (await isWordPressSite(source.url)) ? "wordpress" : "html";
      await prisma.aiSource.update({ where: { id: source.id }, data: { platform } });
    }

    const [existingBerita, existingJobs] = await Promise.all([
      prisma.berita.findMany({ where: { sourceUrl: { not: null } }, select: { sourceUrl: true } }),
      prisma.aiJob.findMany({
        where: { sourceUrl: { not: null }, status: { notIn: ["FAILED", "REJECTED"] } },
        select: { sourceUrl: true },
      }),
    ]);
    const knownUrls = new Set(
      [...existingBerita, ...existingJobs].map((r) => r.sourceUrl).filter(Boolean) as string[]
    );

    // ---------- Jalur WordPress ----------
    if (platform === "wordpress") {
      const posts = await fetchWpPosts(source.url, { maxPages: 3, perPage: 20 });
      const newPosts = posts.filter((p) => !knownUrls.has(p.url));

      if (newPosts.length === 0) {
        await prisma.aiSource.update({ where: { id: source.id }, data: { lastCheckedAt: new Date() } });
        return NextResponse.json({
          platform,
          mode: "wordpress",
          created: 0,
          published: 0,
          skipped: posts.length,
          message: "Tidak ada post baru.",
        });
      }

      const drafts = useAiRewrite
        ? await summarizeAndGenerateSeoBatch(
            newPosts.map((p) => ({ title: p.title, text: p.content, url: p.url })),
            5
          )
        : newPosts.map((p) => ({
            summary: p.content.slice(0, 2000) || p.excerpt,
            suggestedTitle: p.title,
            suggestedSlug: generateSlug(p.title),
            suggestedMetaDescription: p.excerpt.slice(0, 160),
            suggestedTags: p.categories.join(", "),
          }));

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

      const { publishedCount, publishErrors } = await autoPublishIfNeeded(source, createdJobs, session);

      await prisma.aiSource.update({ where: { id: source.id }, data: { lastCheckedAt: new Date() } });

      return NextResponse.json({
        platform,
        mode: "wordpress",
        created: createdJobs.length,
        published: publishedCount,
        needsReview: createdJobs.length - publishedCount,
        skipped: posts.length - newPosts.length,
        usedAi: !!useAiRewrite,
        autoApprove: !!source.autoApprove,
        publishErrors: publishErrors.length ? publishErrors : undefined,
      });
    }

    // ---------- Jalur non-WordPress (generic HTML) ----------
    const res = await fetch(source.url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; DesaTanjungsariBot/1.0)" },
    });
    if (!res.ok) throw new Error(`Gagal mengambil ${source.url} (${res.status})`);
    const html = await res.text();
    const { isSingleArticle, links } = analyzeListingPage(html, source.url);

    const candidateUrls = isSingleArticle ? [source.url] : links;
    const targetUrls = candidateUrls.filter((u) => !knownUrls.has(u)).slice(0, 20);

    if (targetUrls.length === 0) {
      await prisma.aiSource.update({ where: { id: source.id }, data: { lastCheckedAt: new Date() } });
      return NextResponse.json({
        platform,
        mode: isSingleArticle ? "single" : "listing",
        created: 0,
        published: 0,
        skipped: candidateUrls.length,
        message: "Tidak ada post baru.",
      });
    }

    // Extract tiap URL baru — dedupe sudah dilakukan di atas SEBELUM tahap ini,
    // jadi request extract+AI cuma kejadian buat item yang bener-bener baru.
    const extracted: Awaited<ReturnType<typeof extractFromUrl>>[] = [];
    const extractErrors: string[] = [];
    for (const url of targetUrls) {
      try {
        extracted.push(await extractFromUrl(url));
      } catch (err: any) {
        extractErrors.push(`${url}: ${err.message}`);
      }
    }

    if (extracted.length === 0) {
      return NextResponse.json(
        { error: "Semua link baru gagal di-extract.", details: extractErrors },
        { status: 500 }
      );
    }

    // Non-WordPress WAJIB diringkas AI (bukan opsional lagi) supaya hasilnya
    // rapi & konsisten — tetap dibatch biar hemat kuota.
    const drafts = await summarizeAndGenerateSeoBatch(extracted, 5);

    const createdJobs = await prisma.$transaction(
      extracted.map((item, i) =>
        prisma.aiJob.create({
          data: {
            sourceType: "MANUAL_LINK",
            sourceUrl: item.url,
            aiSourceId: source.id,
            contentType: source.contentType,
            status: "NEEDS_REVIEW",
            rawExtract: item.text,
            summary: drafts[i]?.summary,
            suggestedTitle: drafts[i]?.suggestedTitle,
            suggestedSlug: drafts[i]?.suggestedSlug,
            suggestedMetaDescription: drafts[i]?.suggestedMetaDescription,
            suggestedTags: drafts[i]?.suggestedTags,
            featuredImage: item.featuredImage ?? null,
            contentImages: item.contentImages && item.contentImages.length > 0 ? item.contentImages : undefined,
            originalPublishedAt: item.originalPublishedAt ? new Date(item.originalPublishedAt) : undefined,
          },
        })
      )
    );

    const { publishedCount, publishErrors } = await autoPublishIfNeeded(source, createdJobs, session);

    await prisma.aiSource.update({ where: { id: source.id }, data: { lastCheckedAt: new Date() } });

    return NextResponse.json({
      platform,
      mode: isSingleArticle ? "single" : "listing",
      created: createdJobs.length,
      published: publishedCount,
      needsReview: createdJobs.length - publishedCount,
      skipped: candidateUrls.length - targetUrls.length,
      extractErrors: extractErrors.length ? extractErrors : undefined,
      autoApprove: !!source.autoApprove,
      publishErrors: publishErrors.length ? publishErrors : undefined,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** Kalau sumber di-set "Otomatis publish", langsung terbitkan semua job yang baru dibuat */
async function autoPublishIfNeeded(
  source: { autoApprove: boolean },
  createdJobs: Awaited<ReturnType<typeof prisma.aiJob.create>>[],
  session: any
): Promise<{ publishedCount: number; publishErrors: string[] }> {
  let publishedCount = 0;
  const publishErrors: string[] = [];

  if (!source.autoApprove) return { publishedCount, publishErrors };

  for (const job of createdJobs) {
    try {
      const result = await publishAiJob({ job, authorId: (session.user as any).id, publish: true });
      await prisma.aiJob.update({
        where: { id: job.id },
        data: {
          status: "PUBLISHED",
          reviewedById: (session.user as any).id,
          beritaId: result.beritaId,
          resultEntityId: result.entityId,
        },
      });
      publishedCount++;
    } catch (err: any) {
      publishErrors.push(err.message);
      await prisma.aiJob.update({ where: { id: job.id }, data: { errorMessage: err.message } });
    }
  }

  return { publishedCount, publishErrors };
}
