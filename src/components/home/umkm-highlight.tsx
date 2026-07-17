import Link from "next/link";
import Image from "next/image";
import { Store, MessageCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/home/announcements";

export async function UmkmHighlight() {
  const items = await prisma.umkm.findMany({
    where: { isActive: true, isFeatured: true },
    take: 4,
  });

  if (items.length === 0) return null;

  return (
    <section className="section-y bg-secondary/30">
      <div className="container-app">
        <SectionHeading
          icon={<Store className="h-5 w-5" />}
          title="UMKM Unggulan"
          subtitle="Produk & jasa terbaik dari warga Desa Tanjungsari"
          href="/umkm"
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((umkm) => (
            <Card key={umkm.id} className="overflow-hidden p-0">
              <div className="relative aspect-square w-full bg-muted">
                {umkm.image ? (
                  <Image
                    src={umkm.image}
                    alt={umkm.name}
                    fill
                    loading="lazy"
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <Store className="h-8 w-8" />
                  </div>
                )}
              </div>
              <div className="space-y-2 p-4">
                <Badge variant="secondary">{umkm.category}</Badge>
                <h3 className="line-clamp-1 font-semibold">{umkm.name}</h3>
                <p className="line-clamp-1 text-xs text-muted-foreground">{umkm.ownerName}</p>
                {umkm.whatsapp && (
                  <Link
                    href={`https://wa.me/${umkm.whatsapp}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> Hubungi
                  </Link>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
