import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchBar } from "@/components/home/search-bar";

interface Props { searchParams: { q?: string } }

export const metadata = { title: "Hasil Pencarian" };

export default async function CariPage({ searchParams }: Props) {
  const q = searchParams.q?.trim() ?? "";

  const [berita, pengumuman, layanan, umkm] = q
    ? await Promise.all([
        prisma.berita.findMany({ where: { status: "PUBLISHED", OR: [{ title: { contains: q } }, { excerpt: { contains: q } }] }, take: 10 }),
        prisma.pengumuman.findMany({ where: { status: "PUBLISHED", title: { contains: q } }, take: 10 }),
        prisma.layanan.findMany({ where: { isActive: true, title: { contains: q } }, take: 10 }),
        prisma.umkm.findMany({ where: { isActive: true, name: { contains: q } }, take: 10 }),
      ])
    : [[], [], [], []];

  const total = berita.length + pengumuman.length + layanan.length + umkm.length;

  return (
    <div className="container-app section-y">
      <h1 className="text-2xl font-bold">Hasil pencarian untuk &ldquo;{q}&rdquo;</h1>
      <div className="mt-6 max-w-xl"><SearchBar /></div>
      <p className="mt-4 text-sm text-muted-foreground">{total} hasil ditemukan</p>

      <div className="mt-8 space-y-8">
        {layanan.length > 0 && (
          <ResultGroup title="Layanan">
            {layanan.map((l) => (
              <Link key={l.id} href={`/layanan/${l.slug}`}><Card className="p-4"><Badge variant="secondary">Layanan</Badge><p className="mt-1.5 font-medium">{l.title}</p></Card></Link>
            ))}
          </ResultGroup>
        )}
        {pengumuman.length > 0 && (
          <ResultGroup title="Pengumuman">
            {pengumuman.map((p) => (
              <Link key={p.id} href={`/pengumuman/${p.slug}`}><Card className="p-4"><Badge variant="secondary">Pengumuman</Badge><p className="mt-1.5 font-medium">{p.title}</p></Card></Link>
            ))}
          </ResultGroup>
        )}
        {berita.length > 0 && (
          <ResultGroup title="Berita">
            {berita.map((b) => (
              <Link key={b.id} href={`/berita/${b.slug}`}><Card className="p-4"><Badge variant="secondary">Berita</Badge><p className="mt-1.5 font-medium">{b.title}</p></Card></Link>
            ))}
          </ResultGroup>
        )}
        {umkm.length > 0 && (
          <ResultGroup title="UMKM">
            {umkm.map((u) => (
              <Link key={u.id} href={`/umkm/${u.slug}`}><Card className="p-4"><Badge variant="secondary">UMKM</Badge><p className="mt-1.5 font-medium">{u.name}</p></Card></Link>
            ))}
          </ResultGroup>
        )}
        {total === 0 && q && <p className="text-sm text-muted-foreground">Tidak ada hasil. Coba kata kunci lain.</p>}
      </div>
    </div>
  );
}

function ResultGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}
