import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { AuthProvider } from "@/components/shared/auth-provider";
import { ModalProvider } from "@/components/shared/modal-provider";
import { VisitTracker } from "@/components/shared/visit-tracker";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { getSiteUrl } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { getVillageInfo } from "@/lib/village";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

const siteUrl = getSiteUrl();

export async function generateMetadata(): Promise<Metadata> {
  const village = await getVillageInfo();
  const siteName = `Desa ${village.villageName}`;
  const titleSuffix = `${siteName}, Kecamatan ${village.districtName} — Situs Resmi`;

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: titleSuffix,
      template: `%s | ${siteName}`,
    },
    description: `Situs resmi ${siteName}, Kecamatan ${village.districtName}. Informasi layanan warga, berita desa, UMKM, potensi desa, dan pengumuman terbaru.`,
    keywords: [siteName, village.districtName, village.regencyName, "layanan desa", "berita desa"],
    openGraph: {
      type: "website",
      locale: "id_ID",
      siteName,
      title: titleSuffix,
      description: `Informasi layanan warga, berita, dan potensi ${siteName}.`,
    },
    twitter: { card: "summary_large_image" },
    alternates: {
      canonical: "/",
      types: { "application/rss+xml": "/rss.xml" },
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Footer & social media links pakai data asli dari DB (Kontak + Settings),
  // bukan hardcode lagi. Di-fetch di sini (server component) supaya Footer
  // sendiri tetap bisa "use client" (butuh usePathname) tapi datanya dari DB.
  const [kontak, settings] = await Promise.all([
    prisma.kontak.findFirst().catch(() => null),
    prisma.settings.findUnique({ where: { id: "site_settings" } }).catch(() => null),
  ]);

  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            <ModalProvider>
              <VisitTracker />
              <Navbar siteName={settings?.siteName ?? undefined} />
              <main className="min-h-screen">{children}</main>
              <Footer kontak={kontak} settings={settings} />
            </ModalProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
