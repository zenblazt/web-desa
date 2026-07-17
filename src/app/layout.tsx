import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { AuthProvider } from "@/components/shared/auth-provider";
import { VisitTracker } from "@/components/shared/visit-tracker";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { getSiteUrl } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Desa Tanjungsari, Kecamatan Jenangan — Situs Resmi",
    template: "%s | Desa Tanjungsari",
  },
  description:
    "Situs resmi Desa Tanjungsari, Kecamatan Jenangan. Informasi layanan warga, berita desa, UMKM, potensi desa, dan pengumuman terbaru.",
  keywords: ["Desa Tanjungsari", "Jenangan", "Ponorogo", "layanan desa", "berita desa"],
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "Desa Tanjungsari",
    title: "Desa Tanjungsari, Kecamatan Jenangan — Situs Resmi",
    description: "Informasi layanan warga, berita, dan potensi Desa Tanjungsari.",
  },
  twitter: { card: "summary_large_image" },
  alternates: {
    canonical: "/",
    types: { "application/rss+xml": "/rss.xml" },
  },
};

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
            <VisitTracker />
            <Navbar />
            <main className="min-h-screen">{children}</main>
            <Footer kontak={kontak} settings={settings} />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
