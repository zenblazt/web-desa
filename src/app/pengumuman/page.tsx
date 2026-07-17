import type { Metadata } from "next";
import Link from "next/link";
import { Pin, Megaphone } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pengumuman",
  description: "Pengumuman resmi terbaru dari Pemerintah Desa Tanjungsari.",
};

export const dynamic = "force-dynamic";

export default async function PengumumanPage() {
  const items = await prisma.pengumuman.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
  });

  return (
    <div className="container-app section-y">
      <header className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Pengumuman</h1>
        <p className="mt-3 text-muted-foreground">Informasi resmi dan penting untuk warga Desa Tanjungsari.</p>
      </header>

      {items.length === 0 ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">Belum ada pengumuman.</p>
      ) : (
        <div className="mx-auto mt-10 max-w-2xl space-y-4">
          {items.map((item) => (
            <Link key={item.id} href={`/pengumuman/${item.slug}`}>
              <Card className="p-5">
                <div className="flex items-center gap-2">
                  {item.isPinned && <Pin className="h-3.5 w-3.5 text-primary" />}
                  <Badge variant={item.category === "Darurat" ? "destructive" : "secondary"}>{item.category}</Badge>
                  <span className="text-xs text-muted-foreground">{item.publishedAt ? formatDate(item.publishedAt) : ""}</span>
                </div>
                <h3 className="mt-2 font-semibold">{item.title}</h3>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
