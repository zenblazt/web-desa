import type { Metadata } from "next";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Compass, Target, Ruler, Users2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Profil Desa",
  description: "Sejarah, visi misi, dan data wilayah Desa Tanjungsari, Kecamatan Jenangan.",
};

export const dynamic = "force-dynamic";

export default async function ProfilDesaPage() {
  const profil = await prisma.profilDesa.findFirst();

  return (
    <div className="container-app section-y">
      <header className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Profil Desa Tanjungsari</h1>
        <p className="mt-3 text-muted-foreground">
          Mengenal lebih dekat sejarah, visi, dan data wilayah Desa Tanjungsari, Kecamatan Jenangan.
        </p>
      </header>

      {profil?.lambangImage && (
        <div className="relative mx-auto mt-8 h-32 w-32">
          <Image src={profil.lambangImage} alt="Lambang Desa Tanjungsari" fill className="object-contain" />
        </div>
      )}

      <div className="mx-auto mt-10 grid max-w-3xl gap-6">
        <Card>
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <Compass className="h-5 w-5 text-primary" />
            <CardTitle>Sejarah Desa</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none text-muted-foreground dark:prose-invert">
            {profil?.sejarah ?? "Konten sejarah desa akan segera ditambahkan oleh admin."}
          </CardContent>
        </Card>

        <div className="grid gap-6 sm:grid-cols-2">
          <Card>
            <CardHeader className="flex-row items-center gap-3 space-y-0">
              <Target className="h-5 w-5 text-primary" />
              <CardTitle>Visi</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {profil?.visi ?? "Belum diisi."}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center gap-3 space-y-0">
              <Target className="h-5 w-5 text-primary" />
              <CardTitle>Misi</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {profil?.misi ?? "Belum diisi."}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <Ruler className="h-5 w-5 text-primary" />
            <CardTitle>Data Wilayah</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-muted-foreground">Luas Wilayah</dt>
                <dd className="font-semibold">{profil?.luasWilayah ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Jumlah Penduduk</dt>
                <dd className="font-semibold">{profil?.jumlahPenduduk ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Batas Utara</dt>
                <dd className="font-semibold">{profil?.batasUtara ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Batas Selatan</dt>
                <dd className="font-semibold">{profil?.batasSelatan ?? "-"}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {profil?.petaImage && (
          <Card className="overflow-hidden p-0">
            <div className="relative aspect-video w-full">
              <Image src={profil.petaImage} alt="Peta Desa Tanjungsari" fill className="object-cover" />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
