import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2, ListOrdered, Clock, Wallet, Download } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const service = await prisma.layanan.findUnique({ where: { slug: params.slug }, include: { seoMeta: true } });
  if (!service) return {};
  return {
    title: service.seoMeta?.metaTitle ?? service.title,
    description: service.seoMeta?.metaDescription ?? service.description,
  };
}

export const dynamic = "force-dynamic";

export default async function LayananDetailPage({ params }: Props) {
  const service = await prisma.layanan.findUnique({ where: { slug: params.slug } });
  if (!service || !service.isActive) notFound();

  return (
    <div className="container-app section-y">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight">{service.title}</h1>
        <p className="mt-3 text-muted-foreground">{service.description}</p>

        <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
          {service.duration && (
            <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" /> {service.duration}</span>
          )}
          {service.cost && (
            <span className="inline-flex items-center gap-1.5"><Wallet className="h-4 w-4" /> {service.cost}</span>
          )}
        </div>

        <div className="mt-8 grid gap-5">
          {service.requirements && (
            <Card>
              <CardHeader className="flex-row items-center gap-3 space-y-0">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <CardTitle>Syarat</CardTitle>
              </CardHeader>
              <CardContent className="whitespace-pre-line text-sm text-muted-foreground">
                {service.requirements}
              </CardContent>
            </Card>
          )}

          {service.procedure && (
            <Card>
              <CardHeader className="flex-row items-center gap-3 space-y-0">
                <ListOrdered className="h-5 w-5 text-primary" />
                <CardTitle>Prosedur</CardTitle>
              </CardHeader>
              <CardContent className="whitespace-pre-line text-sm text-muted-foreground">
                {service.procedure}
              </CardContent>
            </Card>
          )}

          {service.formUrl && (
            <Button asChild size="lg" className="w-fit">
              <a href={service.formUrl} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4" /> Unduh Formulir
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
