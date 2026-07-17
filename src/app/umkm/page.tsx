import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Store, MessageCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "UMKM Desa",
  description: "Direktori UMKM (Usaha Mikro Kecil Menengah) warga Desa Tanjungsari.",
};

export const revalidate = 3600;

export default async function UmkmPage() {
  const items = await prisma.umkm.findMany({ where: { isActive: true }, orderBy: { isFeatured: "desc" } });

  return (
    <div className="container-app section-y">
      <header className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">UMKM Desa Tanjungsari</h1>
        <p className="mt-3 text-muted-foreground">Dukung produk dan jasa lokal dari warga desa.</p>
      </header>

      {items.length === 0 ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">Belum ada UMKM terdaftar.</p>
      ) : (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((umkm) => (
            <Link key={umkm.id} href={`/umkm/${umkm.slug}`}>
              <Card className="h-full overflow-hidden p-0">
                <div className="relative aspect-square w-full bg-muted">
                  {umkm.image ? (
                    <Image src={umkm.image} alt={umkm.name} fill loading="lazy" className="object-cover" sizes="(max-width:768px) 50vw, 25vw" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      <Store className="h-8 w-8" />
                    </div>
                  )}
                </div>
                <div className="space-y-1.5 p-4">
                  <Badge variant="secondary">{umkm.category}</Badge>
                  <h3 className="line-clamp-1 font-semibold">{umkm.name}</h3>
                  <p className="line-clamp-1 text-xs text-muted-foreground">{umkm.ownerName}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
