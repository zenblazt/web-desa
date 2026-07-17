import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://desatanjungsari.id";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [berita, pengumuman, layanan, umkm] = await Promise.all([
    prisma.berita.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } }),
    prisma.pengumuman.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } }),
    prisma.layanan.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
    prisma.umkm.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    "", "profil-desa", "perangkat-desa", "layanan", "potensi-desa", "umkm", "galeri", "kontak", "pengumuman", "berita",
  ].map((path) => ({
    url: `${siteUrl}/${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7,
  }));

  const dynamicPages: MetadataRoute.Sitemap = [
    ...berita.map((b) => ({ url: `${siteUrl}/berita/${b.slug}`, lastModified: b.updatedAt, changeFrequency: "monthly" as const, priority: 0.6 })),
    ...pengumuman.map((p) => ({ url: `${siteUrl}/pengumuman/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "monthly" as const, priority: 0.5 })),
    ...layanan.map((l) => ({ url: `${siteUrl}/layanan/${l.slug}`, lastModified: l.updatedAt, changeFrequency: "yearly" as const, priority: 0.6 })),
    ...umkm.map((u) => ({ url: `${siteUrl}/umkm/${u.slug}`, lastModified: u.updatedAt, changeFrequency: "monthly" as const, priority: 0.5 })),
  ];

  return [...staticPages, ...dynamicPages];
}
