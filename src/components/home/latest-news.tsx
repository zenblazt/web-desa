import Link from "next/link";
import Image from "next/image";
import { Newspaper } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/home/announcements";
import { formatDate, truncate } from "@/lib/utils";

export async function LatestNews() {
  const news = await prisma.berita.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    take: 4,
  });

  if (news.length === 0) return null;

  return (
    <section className="section-y">
      <div className="container-app">
        <SectionHeading
          icon={<Newspaper className="h-5 w-5" />}
          title="Berita Terbaru"
          subtitle="Kabar dan informasi seputar Desa Tanjungsari"
          href="/berita"
        />

        <div className="grid gap-5 sm:grid-cols-2">
          {news.map((item) => (
            <Link key={item.id} href={`/berita/${item.slug}`}>
              <Card className="h-full overflow-hidden p-0">
                <div className="relative aspect-[16/10] w-full bg-muted">
                  {item.coverImage ? (
                    <Image
                      src={item.coverImage}
                      alt={item.title}
                      fill
                      loading="lazy"
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      <Newspaper className="h-8 w-8" />
                    </div>
                  )}
                </div>
                <div className="space-y-2 p-5">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{item.category}</Badge>
                    {item.isAiGenerated && <Badge variant="outline">AI</Badge>}
                  </div>
                  <h3 className="line-clamp-2 font-semibold leading-snug">{item.title}</h3>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {truncate(item.excerpt, 110)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.publishedAt ? formatDate(item.publishedAt) : ""}
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
