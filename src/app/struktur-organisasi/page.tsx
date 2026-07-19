import type { Metadata } from "next";
import Image from "next/image";
import { User2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { getVillageInfo } from "@/lib/village";

export async function generateMetadata(): Promise<Metadata> {
  const village = await getVillageInfo();
  return {
    title: "Struktur Organisasi",
    description: `Bagan struktur organisasi Pemerintah Desa ${village.villageName}, Kecamatan ${village.districtName}.`,
  };
}

export const dynamic = "force-dynamic";

export default async function StrukturOrganisasiPage() {
  const [perangkat, village] = await Promise.all([
    prisma.perangkatDesa.findMany({
      where: { isActive: true },
      orderBy: [{ level: "asc" }, { order: "asc" }],
    }),
    getVillageInfo(),
  ]);

  // Kelompokkan per jenjang (level) — level 1 = paling atas (mis. Kepala Desa).
  const levels = new Map<number, typeof perangkat>();
  for (const p of perangkat) {
    const key = p.level ?? 1;
    if (!levels.has(key)) levels.set(key, []);
    levels.get(key)!.push(p);
  }
  const sortedLevels = Array.from(levels.entries()).sort((a, b) => a[0] - b[0]);

  return (
    <div className="container-app section-y">
      <header className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Struktur Organisasi</h1>
        <p className="mt-3 text-muted-foreground">
          Bagan susunan organisasi Pemerintah Desa {village.villageName}, Kecamatan {village.districtName}, dari jenjang tertinggi hingga
          perangkat di tingkat dusun.
        </p>
      </header>

      {sortedLevels.length === 0 ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">Data belum tersedia.</p>
      ) : (
        <div className="mx-auto mt-12 flex max-w-5xl flex-col items-center gap-8">
          {sortedLevels.map(([level, people], idx) => (
            <div key={level} className="flex w-full flex-col items-center">
              {idx > 0 && <div className="h-8 w-px bg-border" aria-hidden />}
              <div className="flex flex-wrap justify-center gap-5">
                {people.map((p) => (
                  <Card key={p.id} className="w-44 p-4 text-center">
                    <div className="relative mx-auto h-16 w-16 overflow-hidden rounded-full bg-muted">
                      {p.photo ? (
                        <Image src={p.photo} alt={p.name} fill className="object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                          <User2 className="h-6 w-6" />
                        </div>
                      )}
                    </div>
                    <h3 className="mt-3 text-sm font-semibold">{p.name}</h3>
                    <p className="text-xs text-primary">{p.position}</p>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
