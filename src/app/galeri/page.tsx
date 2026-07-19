import type { Metadata } from "next";
import Image from "next/image";
import { Images } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getVillageInfo } from "@/lib/village";

export async function generateMetadata(): Promise<Metadata> {
  const village = await getVillageInfo();
  return {
    title: "Galeri Desa",
    description: `Dokumentasi foto kegiatan dan keindahan Desa ${village.villageName}.`,
  };
}

export const dynamic = "force-dynamic";

export default async function GaleriPage() {
  const [photos, village] = await Promise.all([
    prisma.galeri.findMany({ orderBy: { order: "asc" } }),
    getVillageInfo(),
  ]);

  return (
    <div className="container-app section-y">
      <header className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Galeri Desa</h1>
        <p className="mt-3 text-muted-foreground">Momen dan kegiatan warga Desa {village.villageName}.</p>
      </header>

      {photos.length === 0 ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">Belum ada foto.</p>
      ) : (
        <div className="mt-10 columns-2 gap-3 sm:columns-3 lg:columns-4 [&>*]:mb-3">
          {photos.map((photo) => (
            <div key={photo.id} className="group relative overflow-hidden rounded-xl bg-muted">
              <Image
                src={photo.image}
                alt={photo.title}
                width={400}
                height={400}
                loading="lazy"
                className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                <p className="text-xs font-medium text-white">{photo.title}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
