import type { Metadata } from "next";
import Link from "next/link";
import * as Icons from "lucide-react";
import { FileText, Clock, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Layanan Desa",
  description: "Daftar layanan administrasi dan publik Desa Tanjungsari beserta syarat dan prosedurnya.",
};

export const dynamic = "force-dynamic";

export default async function LayananPage() {
  const services = await prisma.layanan.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
  });

  return (
    <div className="container-app section-y">
      <header className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Layanan Desa</h1>
        <p className="mt-3 text-muted-foreground">
          Semua layanan administrasi yang bisa diakses warga Desa Tanjungsari.
        </p>
      </header>

      {services.length === 0 ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">Belum ada layanan terdaftar.</p>
      ) : (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => {
            const Icon = (Icons as any)[s.icon ?? "FileText"] ?? FileText;
            return (
              <Link key={s.id} href={`/layanan/${s.slug}`}>
                <Card className="h-full p-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-semibold">{s.title}</h3>
                  <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{s.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {s.duration && (
                      <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{s.duration}</span>
                    )}
                    {s.cost && (
                      <span className="inline-flex items-center gap-1"><Wallet className="h-3 w-3" />{s.cost}</span>
                    )}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
