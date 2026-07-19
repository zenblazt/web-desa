import type { Metadata } from "next";
import Image from "next/image";
import { User2, Phone } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { getVillageInfo } from "@/lib/village";

export async function generateMetadata(): Promise<Metadata> {
  const village = await getVillageInfo();
  return {
    title: "Perangkat Desa",
    description: `Daftar struktur dan perangkat Desa ${village.villageName}, Kecamatan ${village.districtName}.`,
  };
}

export const dynamic = "force-dynamic";

export default async function PerangkatDesaPage() {
  const [perangkat, village] = await Promise.all([
    prisma.perangkatDesa.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    }),
    getVillageInfo(),
  ]);

  return (
    <div className="container-app section-y">
      <header className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Perangkat Desa</h1>
        <p className="mt-3 text-muted-foreground">
          Struktur organisasi dan aparatur Pemerintah Desa {village.villageName}.
        </p>
      </header>

      {perangkat.length === 0 ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">Data belum tersedia.</p>
      ) : (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {perangkat.map((p) => (
            <Card key={p.id} className="p-5 text-center">
              <div className="relative mx-auto h-24 w-24 overflow-hidden rounded-full bg-muted">
                {p.photo ? (
                  <Image src={p.photo} alt={p.name} fill className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <User2 className="h-8 w-8" />
                  </div>
                )}
              </div>
              <h3 className="mt-4 font-semibold">{p.name}</h3>
              <p className="text-sm text-primary">{p.position}</p>
              {p.bio && (
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{p.bio}</p>
              )}
              {p.phone && (
                <p className="mt-2 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" /> {p.phone}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
