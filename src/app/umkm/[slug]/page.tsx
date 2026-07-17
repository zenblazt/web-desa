import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { MessageCircle, Phone, MapPin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Props { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const umkm = await prisma.umkm.findUnique({ where: { slug: params.slug }, include: { seoMeta: true } });
  if (!umkm) return {};
  return {
    title: umkm.seoMeta?.metaTitle ?? umkm.name,
    description: umkm.seoMeta?.metaDescription ?? umkm.description,
  };
}

export const dynamic = "force-dynamic";

export default async function UmkmDetailPage({ params }: Props) {
  const umkm = await prisma.umkm.findUnique({ where: { slug: params.slug } });
  if (!umkm || !umkm.isActive) notFound();

  return (
    <div className="container-app section-y">
      <div className="mx-auto max-w-2xl">
        {umkm.image && (
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-muted">
            <Image src={umkm.image} alt={umkm.name} fill className="object-cover" />
          </div>
        )}
        <Badge variant="secondary" className="mt-5">{umkm.category}</Badge>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{umkm.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Pemilik: {umkm.ownerName}</p>
        <p className="mt-4 whitespace-pre-line text-muted-foreground">{umkm.description}</p>

        <div className="mt-6 space-y-2 text-sm">
          {umkm.address && (
            <p className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4" /> {umkm.address}</p>
          )}
          {umkm.phone && (
            <p className="flex items-center gap-2 text-muted-foreground"><Phone className="h-4 w-4" /> {umkm.phone}</p>
          )}
        </div>

        {umkm.whatsapp && (
          <Button asChild size="lg" className="mt-6">
            <a href={`https://wa.me/${umkm.whatsapp}`} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-4 w-4" /> Hubungi via WhatsApp
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
