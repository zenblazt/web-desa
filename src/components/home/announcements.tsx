import Link from "next/link";
import { Megaphone, ArrowRight, Pin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export async function Announcements() {
  const items = await prisma.pengumuman.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
    take: 4,
  });

  if (items.length === 0) return null;

  return (
    <section className="section-y">
      <div className="container-app">
        <SectionHeading
          icon={<Megaphone className="h-5 w-5" />}
          title="Pengumuman Penting"
          subtitle="Informasi resmi terbaru dari pemerintah desa"
          href="/pengumuman"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <Link key={item.id} href={`/pengumuman/${item.slug}`}>
              <Card className="h-full p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {item.isPinned && <Pin className="h-3.5 w-3.5 text-primary" />}
                      <Badge variant={item.category === "Darurat" ? "destructive" : "secondary"}>
                        {item.category}
                      </Badge>
                    </div>
                    <h3 className="font-semibold leading-snug">{item.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {item.publishedAt ? formatDate(item.publishedAt) : ""}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SectionHeading({
  icon,
  title,
  subtitle,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  href?: string;
}) {
  return (
    <div className="mb-7 flex items-end justify-between gap-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
          {icon}
        </span>
        <div>
          <h2 className="text-xl font-bold tracking-tight md:text-2xl">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {href && (
        <Link
          href={href}
          className="hidden shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline sm:flex"
        >
          Lihat semua <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}
