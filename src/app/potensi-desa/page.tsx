import type { Metadata } from "next";
import Image from "next/image";
import { Leaf, MapPin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Potensi Desa",
  description: "Potensi pertanian, wisata, dan kerajinan Desa Tanjungsari, Kecamatan Jenangan.",
};

export const revalidate = 3600;

export default async function PotensiDesaPage() {
  const items = await prisma.potensiDesa.findMany({ where: { isActive: true }, orderBy: { order: "asc" } });

  return (
    <div className="container-app section-y">
      <header className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Potensi Desa</h1>
        <p className="mt-3 text-muted-foreground">
          Kekayaan alam, wisata, dan produk unggulan Desa Tanjungsari.
        </p>
      </header>

      {items.length === 0 ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">Belum ada data potensi desa.</p>
      ) : (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Card key={item.id} className="overflow-hidden p-0">
              <div className="relative aspect-[4/3] w-full bg-muted">
                {item.image ? (
                  <Image src={item.image} alt={item.title} fill loading="lazy" className="object-cover" sizes="(max-width:768px) 100vw, 33vw" />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <Leaf className="h-8 w-8" />
                  </div>
                )}
              </div>
              <div className="space-y-2 p-5">
                <Badge variant="secondary">{item.category}</Badge>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
                {item.location && (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {item.location}
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
