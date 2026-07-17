import Link from "next/link";
import Image from "next/image";
import { Images } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { SectionHeading } from "@/components/home/announcements";

export async function GalleryPreview() {
  const photos = await prisma.galeri.findMany({ orderBy: { order: "asc" }, take: 6 });
  if (photos.length === 0) return null;

  return (
    <section className="section-y">
      <div className="container-app">
        <SectionHeading
          icon={<Images className="h-5 w-5" />}
          title="Galeri Desa"
          subtitle="Dokumentasi kegiatan dan keindahan Desa Tanjungsari"
          href="/galeri"
        />

        <div className="grid grid-cols-3 gap-2 md:grid-cols-6 md:gap-3">
          {photos.map((photo) => (
            <Link
              key={photo.id}
              href="/galeri"
              className="group relative aspect-square overflow-hidden rounded-xl bg-muted"
            >
              <Image
                src={photo.image}
                alt={photo.title}
                fill
                loading="lazy"
                className="object-cover transition-transform duration-300 group-hover:scale-110"
                sizes="(max-width: 768px) 33vw, 16vw"
              />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
