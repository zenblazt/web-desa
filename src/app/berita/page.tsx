import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Newspaper } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, truncate } from "@/lib/utils";
import { getVillageInfo } from "@/lib/village";

export async function generateMetadata(): Promise<Metadata> {
  const village = await getVillageInfo();
  return {
    title: "Berita Desa",
    description: `Kumpulan berita dan kabar terbaru seputar Desa ${village.villageName}, Kecamatan ${village.districtName}.`,
  };
}

export const dynamic = "force-dynamic";

export default async function BeritaPage() {
  const [news, village] = await Promise.all([
    prisma.berita.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
    }),
    getVillageInfo(),
  ]);

  return (
    <div className="container-app section-y">
      <header className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Berita Desa</h1>
        <p className="mt-3 text-muted-foreground">Kabar dan informasi terbaru seputar Desa {village.villageName}.</p>
      </header>

      {news.length === 0 ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">Belum ada berita.</p>
      ) : (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {news.map((item) => (
            <Link key={item.id} href={`/berita/${item.slug}`}>
              <Card className="h-full overflow-hidden p-0">
                <div className="relative aspect-[16/10] w-full bg-muted">
                  {item.coverImage ? (
                    <Image src={item.coverImage} alt={item.title} fill loading="lazy" className="object-cover" sizes="(max-width:768px) 100vw, 33vw" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      <Newspaper className="h-8 w-8" />
                    </div>
                  )}
                </div>
                <div className="space-y-2 p-5">
                  <Badge variant="secondary">{item.category}</Badge>
                  <h3 className="line-clamp-2 font-semibold leading-snug">{item.title}</h3>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{truncate(item.excerpt, 110)}</p>
                  <p className="text-xs text-muted-foreground">{item.publishedAt ? formatDate(item.publishedAt) : ""}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
