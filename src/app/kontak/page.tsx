import type { Metadata } from "next";
import { MapPin, Phone, Mail, Clock, MessageCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Kontak",
  description: "Hubungi Kantor Desa Tanjungsari, Kecamatan Jenangan.",
};

export const revalidate = 3600;

export default async function KontakPage() {
  const kontak = await prisma.kontak.findFirst();

  return (
    <div className="container-app section-y">
      <header className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Kontak Kami</h1>
        <p className="mt-3 text-muted-foreground">
          Hubungi Kantor Desa Tanjungsari untuk pertanyaan atau kebutuhan layanan.
        </p>
      </header>

      <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informasi Kontak</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="flex items-start gap-3 text-muted-foreground">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              {kontak?.address ?? "Kantor Desa Tanjungsari, Kec. Jenangan, Kab. Ponorogo"}
            </p>
            {kontak?.phone && (
              <p className="flex items-center gap-3 text-muted-foreground">
                <Phone className="h-4 w-4 shrink-0 text-primary" /> {kontak.phone}
              </p>
            )}
            {kontak?.email && (
              <p className="flex items-center gap-3 text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0 text-primary" /> {kontak.email}
              </p>
            )}
            {kontak?.operationalHours && (
              <p className="flex items-center gap-3 text-muted-foreground">
                <Clock className="h-4 w-4 shrink-0 text-primary" /> {kontak.operationalHours}
              </p>
            )}
            {kontak?.whatsapp && (
              <Button asChild className="mt-2 w-fit">
                <a href={`https://wa.me/${kontak.whatsapp}`} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4" /> Chat WhatsApp
                </a>
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden p-0">
          {kontak?.mapEmbedUrl ? (
            <iframe
              src={kontak.mapEmbedUrl}
              className="h-full min-h-[300px] w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <div className="flex h-full min-h-[300px] items-center justify-center text-sm text-muted-foreground">
              Peta belum diatur admin.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
