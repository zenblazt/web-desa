"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, Phone, Mail, Facebook, Instagram, Youtube, Sprout } from "lucide-react";

const LINK_GROUPS = [
  {
    title: "Layanan",
    links: [
      { href: "/layanan", label: "Semua Layanan" },
      { href: "/layanan#surat", label: "Surat Menyurat" },
      { href: "/pengumuman", label: "Pengumuman" },
    ],
  },
  {
    title: "Desa",
    links: [
      { href: "/profil-desa", label: "Profil Desa" },
      { href: "/perangkat-desa", label: "Perangkat Desa" },
      { href: "/potensi-desa", label: "Potensi Desa" },
      { href: "/umkm", label: "UMKM" },
    ],
  },
  {
    title: "Informasi",
    links: [
      { href: "/berita", label: "Berita" },
      { href: "/galeri", label: "Galeri" },
      { href: "/kontak", label: "Kontak" },
      { href: "/rss.xml", label: "RSS Feed" },
    ],
  },
];

export function Footer() {
  const pathname = usePathname();
  const year = new Date().getFullYear();
  if (pathname?.startsWith("/admin")) return null;
  return (
    <footer className="border-t border-border/60 bg-secondary/40">
      <div className="container-app grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Sprout className="h-5 w-5" />
            </span>
            <span>Desa Tanjungsari</span>
          </Link>
          <p className="max-w-xs text-sm text-muted-foreground">
            Situs resmi Desa Tanjungsari, Kecamatan Jenangan. Informasi layanan warga, berita, dan potensi desa.
          </p>
          <div className="flex gap-2 pt-1">
            <SocialIcon href="#"><Facebook className="h-4 w-4" /></SocialIcon>
            <SocialIcon href="#"><Instagram className="h-4 w-4" /></SocialIcon>
            <SocialIcon href="#"><Youtube className="h-4 w-4" /></SocialIcon>
          </div>
        </div>

        {LINK_GROUPS.map((group) => (
          <div key={group.title}>
            <h4 className="mb-3 text-sm font-semibold">{group.title}</h4>
            <ul className="space-y-2">
              {group.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-muted-foreground hover:text-primary">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <h4 className="mb-3 text-sm font-semibold">Kontak</h4>
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Kantor Desa Tanjungsari, Kec. Jenangan, Kab. Ponorogo</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0" />
              <span>(0352) 000-000</span>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0" />
              <span>desa.tanjungsari@jenangan.go.id</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border/60 py-5">
        <p className="container-app text-center text-xs text-muted-foreground">
          © {year} Pemerintah Desa Tanjungsari, Kecamatan Jenangan. Seluruh hak cipta dilindungi.
        </p>
      </div>
    </footer>
  );
}

function SocialIcon({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:border-primary hover:text-primary"
    >
      {children}
    </Link>
  );
}
