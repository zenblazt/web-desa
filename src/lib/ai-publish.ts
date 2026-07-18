/**
 * AI Publish Service
 * -------------------
 * Satu fungsi pusat yang mengubah 1 AiJob (hasil scrape/AI) jadi entitas
 * final di tab yang sesuai — Berita, UMKM, Galeri, Perangkat Desa, atau
 * Pengumuman — lengkap dengan gambar & tanggal publish ASLI dari sumber
 * (bukan tanggal saat admin nge-klik approve).
 *
 * Dipakai di 3 tempat:
 *  1. /api/ai/summarize      -> approve satu-satu manual dari dashboard
 *  2. /api/ai/approve-all    -> "Setujui Semua Sekarang" (bulk, admin gak repot)
 *  3. /api/ai/scrape-wp      -> kalau sumbernya di-set autoApprove, publish
 *                               langsung tanpa nunggu status NEEDS_REVIEW
 */

import { prisma } from "@/lib/prisma";
import { generateSlug } from "@/lib/utils";
import { uploadRemoteUrlToCloudinary } from "@/lib/cloudinary";
import type { AiContentType } from "@prisma/client";

export interface JobEditableFields {
  title?: string;
  slug?: string;
  summary?: string;
  metaDescription?: string;
  tags?: string;
  category?: string;
  image?: string | null;
}

interface PublishArgs {
  job: {
    id: string;
    contentType: AiContentType;
    suggestedTitle: string | null;
    suggestedSlug: string | null;
    summary: string | null;
    suggestedMetaDescription: string | null;
    suggestedTags: string | null;
    featuredImage: string | null;
    contentImages: unknown;
    originalPublishedAt: Date | null;
    sourceUrl: string | null;
    hideSource?: boolean;
  };
  authorId: string;
  publish: boolean; // true = langsung tayang, false = simpan draft (cuma berlaku buat Berita/Pengumuman)
  editedFields?: JobEditableFields;
}

async function uniqueSlug(base: string, checkExists: (slug: string) => Promise<boolean>) {
  let slug = generateSlug(base) || `item-${Date.now()}`;
  let i = 2;
  while (await checkExists(slug)) {
    slug = `${generateSlug(base)}-${i}`;
    i++;
  }
  return slug;
}

/** Upload 1 gambar hasil scrape ke Cloudinary; kalau gagal (mis. sumber block hotlink), fallback ke URL asli daripada gagal total publish. */
async function resolveHostedImage(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    return await uploadRemoteUrlToCloudinary(url);
  } catch {
    return url;
  }
}

async function resolveHostedImages(urls: string[] | undefined): Promise<string[] | undefined> {
  if (!urls || urls.length === 0) return undefined;
  const hosted = await Promise.all(urls.map((u) => resolveHostedImage(u)));
  return hosted.filter((u): u is string => !!u);
}

interface PublishResult {
  entityType: "BERITA" | "UMKM" | "GALERI" | "PERANGKAT_DESA" | "PENGUMUMAN";
  entityId: string;
  beritaId?: string;
}

/**
 * Buat entitas final dari 1 AiJob sesuai contentType-nya.
 * Return { entityType, entityId } buat disimpan balik ke AiJob (resultEntityId / beritaId).
 */
export async function publishAiJob({ job, authorId, publish, editedFields }: PublishArgs): Promise<PublishResult> {
  const title = editedFields?.title ?? job.suggestedTitle ?? "Tanpa Judul";
  const summary = editedFields?.summary ?? job.summary ?? "";
  const tags = editedFields?.tags ?? job.suggestedTags ?? undefined;
  const image = editedFields?.image !== undefined ? editedFields.image : job.featuredImage;
  const contentImages = Array.isArray(job.contentImages) ? (job.contentImages as string[]) : undefined;
  // Upload ke Cloudinary sendiri (bukan hotlink ke situs sumber) — supaya gambar gak
  // hilang/berubah kalau situs sumber di-update atau di-takedown.
  const hostedImage = await resolveHostedImage(image);
  const hostedContentImages = await resolveHostedImages(contentImages);
  // Kalau situs sumber gak punya og:image (featuredImage kosong) tapi ada gambar di dalam
  // artikel, pakai gambar pertama itu sebagai cover — daripada cover-nya kosong padahal
  // sebenarnya ada gambar (yang sebelumnya cuma nongol di galeri bawah artikel).
  const effectiveCoverImage = hostedImage ?? hostedContentImages?.[0] ?? null;
  // Tanggal terbit final = tanggal publish ASLI dari sumber kalau ada (hasil scrape WP),
  // supaya urutan & tanggal di daftar publik ngikutin data asli, bukan waktu admin approve.
  const publishedAt = job.originalPublishedAt ?? new Date();

  switch (job.contentType) {
    case "UMKM": {
      const slug = editedFields?.slug ?? (await uniqueSlug(title, async (s) => !!(await prisma.umkm.findUnique({ where: { slug: s } }))));
      const umkm = await prisma.umkm.create({
        data: {
          name: title,
          slug,
          ownerName: "Belum diisi",
          category: editedFields?.category ?? "Umum",
          description: summary || "-",
          image: effectiveCoverImage ?? undefined,
          isActive: true,
        },
      });
      return { entityType: "UMKM" as const, entityId: umkm.id };
    }

    case "GALERI": {
      const finalImage = effectiveCoverImage;
      if (!finalImage) {
        throw new Error("Tidak ada gambar yang ke-scrape dari post ini — Galeri wajib punya gambar.");
      }
      const galeri = await prisma.galeri.create({
        data: {
          title,
          image: finalImage,
          category: editedFields?.category ?? "Umum",
        },
      });
      return { entityType: "GALERI" as const, entityId: galeri.id };
    }

    case "PERANGKAT_DESA": {
      const perangkat = await prisma.perangkatDesa.create({
        data: {
          name: title,
          position: editedFields?.category ?? "Perangkat Desa",
          photo: effectiveCoverImage ?? undefined,
          bio: summary || undefined,
          isActive: true,
        },
      });
      return { entityType: "PERANGKAT_DESA" as const, entityId: perangkat.id };
    }

    case "PENGUMUMAN": {
      const slug = editedFields?.slug ?? (await uniqueSlug(title, async (s) => !!(await prisma.pengumuman.findUnique({ where: { slug: s } }))));
      const pengumuman = await prisma.pengumuman.create({
        data: {
          title,
          slug,
          content: summary || "-",
          category: editedFields?.category ?? "Umum",
          status: publish ? "PUBLISHED" : "DRAFT",
          publishedAt: publish ? publishedAt : null,
          authorId,
        },
      });
      return { entityType: "PENGUMUMAN" as const, entityId: pengumuman.id };
    }

    case "BERITA":
    default: {
      const slug = editedFields?.slug ?? job.suggestedSlug ?? (await uniqueSlug(title, async (s) => !!(await prisma.berita.findUnique({ where: { slug: s } }))));
      const seoMeta = await prisma.seoMeta.create({
        data: {
          metaTitle: title,
          metaDescription: editedFields?.metaDescription ?? job.suggestedMetaDescription,
          keywords: tags,
        },
      });
      const berita = await prisma.berita.create({
        data: {
          title,
          slug,
          excerpt: summary.slice(0, 200),
          content: summary,
          coverImage: effectiveCoverImage ?? undefined,
          images: (() => {
            const gallery = (hostedContentImages ?? []).filter((u) => u !== effectiveCoverImage);
            return gallery.length > 0 ? gallery : undefined;
          })(),
          category: editedFields?.category ?? "Umum",
          tags,
          status: publish ? "PUBLISHED" : "DRAFT",
          publishedAt: publish ? publishedAt : null,
          sourceUrl: job.sourceUrl,
          hideSource: !!job.hideSource,
          isAiGenerated: true,
          authorId,
          seoMetaId: seoMeta.id,
        },
      });
      return { entityType: "BERITA" as const, entityId: berita.id, beritaId: berita.id };
    }
  }
}
