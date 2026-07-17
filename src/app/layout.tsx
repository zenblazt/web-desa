import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { AuthProvider } from "@/components/shared/auth-provider";
import { VisitTracker } from "@/components/shared/visit-tracker";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://desatanjungsari.id";

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            <VisitTracker />
            <Navbar />
            <main className="min-h-screen">{children}</main>
            <Footer />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
