import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";
import { Paperclip } from "lucide-react";

interface Props { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const item = await prisma.pengumuman.findUnique({ where: { slug: params.slug }, include: { seoMeta: true } });
  if (!item) return {};
  return {
    title: item.seoMeta?.metaTitle ?? item.title,
    description: item.seoMeta?.metaDescription ?? item.content.slice(0, 150),
  };
}

export default async function PengumumanDetailPage({ params }: Props) {
  const item = await prisma.pengumuman.findUnique({ where: { slug: params.slug } });
  if (!item || item.status !== "PUBLISHED") notFound();

  return (
    <div className="container-app section-y">
      <article className="mx-auto max-w-2xl">
        <Badge variant={item.category === "Darurat" ? "destructive" : "secondary"}>{item.category}</Badge>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">{item.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {item.publishedAt ? formatDateTime(item.publishedAt) : ""}
        </p>
        <div className="prose prose-sm mt-6 max-w-none whitespace-pre-line text-foreground dark:prose-invert">
          {item.content}
        </div>
        {item.attachment && (
          <a
            href={item.attachment}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            <Paperclip className="h-4 w-4" /> Lihat Lampiran
          </a>
        )}
      </article>
    </div>
  );
}
