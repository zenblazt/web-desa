import RSS from "rss";
import { prisma } from "@/lib/prisma";
import { getVillageInfo } from "@/lib/village";

export const dynamic = "force-dynamic";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://desatanjungsari.id";

export async function GET() {
  const village = await getVillageInfo();

  const feed = new RSS({
    title: `Berita Desa ${village.villageName}`,
    description: `Berita dan kabar terbaru Desa ${village.villageName}, Kecamatan ${village.districtName}`,
    site_url: siteUrl,
    feed_url: `${siteUrl}/rss.xml`,
    language: "id",
  });

  const news = await prisma.berita.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    take: 30,
  });

  news.forEach((item) => {
    feed.item({
      title: item.title,
      description: item.excerpt,
      url: `${siteUrl}/berita/${item.slug}`,
      date: item.publishedAt ?? item.createdAt,
      categories: [item.category],
    });
  });

  return new Response(feed.xml({ indent: true }), {
    headers: { "Content-Type": "application/xml" },
  });
}
