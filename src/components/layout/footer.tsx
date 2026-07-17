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
      { href: "/struktur-organisasi", label: "Struktur Organisasi" },
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

interface FooterKontak {
  address: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  facebook: string | null;
  instagram: string | null;
  youtube: string | null;
}

interface FooterSettings {
  villageName: string;
  districtName: string;
  regencyName: string;
  siteName: string;
}

export function Footer({
  kontak,
  settings,
}: {
  kontak?: FooterKontak | null;
  settings?: FooterSettings | null;
}) {
  const pathname = usePathname();
  const year = new Date().getFullYear();
  if (pathname?.startsWith("/admin")) return null;

  const siteName = settings?.siteName || "Desa Tanjungsari";
  const villageLabel = settings
    ? `Desa ${settings.villageName}, Kecamatan ${settings.districtName}`
    : "Desa Tanjungsari, Kecamatan Jenangan";
  const fullVillageLabel = settings
    ? `Pemerintah Desa ${settings.villageName}, Kecamatan ${settings.districtName}`
    : "Pemerintah Desa Tanjungsari, Kecamatan Jenangan";

  // Social link cuma ditampilkan kalau memang diisi di admin > Kontak.
  const socials = [
    kontak?.facebook ? { href: kontak.facebook, icon: Facebook } : null,
    kontak?.instagram ? { href: kontak.instagram, icon: Instagram } : null,
    kontak?.youtube ? { href: kontak.youtube, icon: Youtube } : null,
  ].filter(Boolean) as { href: string; icon: typeof Facebook }[];

  return (
    <footer className="border-t border-border/60 bg-secondary/40">
      <div className="container-app grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Sprout className="h-5 w-5" />
            </span>
            <span>{siteName}</span>
          </Link>
          <p className="max-w-xs text-sm text-muted-foreground">
            Situs resmi {villageLabel}. Informasi layanan warga, berita, dan potensi desa.
          </p>
          {socials.length > 0 && (
            <div className="flex gap-2 pt-1">
              {socials.map((s) => (
                <SocialIcon key={s.href} href={s.href}>
                  <s.icon className="h-4 w-4" />
                </SocialIcon>
              ))}
            </div>
          )}
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
              <span>{kontak?.address || `Kantor ${villageLabel}`}</span>
            </li>
            {(kontak?.phone || kontak?.whatsapp) && (
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0" />
                <span>{kontak?.phone || kontak?.whatsapp}</span>
              </li>
            )}
            {kontak?.email && (
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0" />
                <span>{kontak.email}</span>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-border/60 py-5">
        <p className="container-app text-center text-xs text-muted-foreground">
          © {year} {fullVillageLabel}. Seluruh hak cipta dilindungi.
        </p>
      </div>
    </footer>
  );
}

function SocialIcon({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:border-primary hover:text-primary"
    >
      {children}
    </Link>
  );
}
