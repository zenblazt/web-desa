import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BeritaForm } from "@/components/admin/berita-form";

export const dynamic = "force-dynamic";

interface Props { params: { id: string } }

export default async function EditBeritaPage({ params }: Props) {
  const item = await prisma.berita.findUnique({ where: { id: params.id }, include: { seoMeta: true } });
  if (!item) notFound();

  return (
    <BeritaForm
      initial={{
        id: item.id,
        title: item.title,
        excerpt: item.excerpt,
        content: item.content,
        coverImage: item.coverImage ?? "",
        category: item.category,
        tags: item.tags ?? "",
        status: item.status as "DRAFT" | "PUBLISHED",
        metaTitle: item.seoMeta?.metaTitle ?? "",
        metaDescription: item.seoMeta?.metaDescription ?? "",
        keywords: item.seoMeta?.keywords ?? "",
      }}
    />
  );
}
