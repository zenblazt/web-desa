import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface Props { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const item = await prisma.berita.findUnique({ where: { slug: params.slug }, include: { seoMeta: true } });
  if (!item) return {};
  return {
    title: item.seoMeta?.metaTitle ?? item.title,
    description: item.seoMeta?.metaDescription ?? item.excerpt,
    openGraph: { images: item.coverImage ? [item.coverImage] : [] },
  };
}

export default async function BeritaDetailPage({ params }: Props) {
  const item = await prisma.berita.findUnique({ where: { slug: params.slug } });
  if (!item || item.status !== "PUBLISHED") notFound();

  // increment view count (fire and forget)
  prisma.berita.update({ where: { id: item.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});

  return (
    <div className="container-app section-y">
      <article className="mx-auto max-w-2xl">
        <Badge variant="secondary">{item.category}</Badge>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">{item.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {item.publishedAt ? formatDateTime(item.publishedAt) : ""} · {item.viewCount} views
          {item.isAiGenerated && " · Diringkas oleh AI"}
        </p>

        {item.coverImage && (
          <div className="relative mt-6 aspect-video w-full overflow-hidden rounded-2xl bg-muted">
            <Image src={item.coverImage} alt={item.title} fill className="object-cover" priority />
          </div>
        )}

        <div className="prose prose-sm mt-6 max-w-none whitespace-pre-line text-foreground dark:prose-invert">
          {item.content}
        </div>

        {Array.isArray(item.images) && (item.images as string[]).filter((src) => src !== item.coverImage).length > 0 && (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(item.images as string[])
              .filter((src) => src !== item.coverImage)
              .map((src) => (
                <div key={src} className="relative aspect-square overflow-hidden rounded-xl bg-muted">
                  <Image src={src} alt={item.title} fill className="object-cover" />
                </div>
              ))}
          </div>
        )}

        {item.tags && item.tags.trim().length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {item.tags.split(",").map((tag) => tag.trim()).filter(Boolean).map((tag) => (
              <Badge key={tag} variant="outline">#{tag}</Badge>
            ))}
          </div>
        )}

        {item.sourceUrl && !item.hideSource && (
          <p className="mt-6 text-xs text-muted-foreground">
            Sumber: <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">{item.sourceUrl}</a>
          </p>
        )}
      </article>
    </div>
  );
}
