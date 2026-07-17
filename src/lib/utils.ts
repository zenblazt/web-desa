import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import slugify from "slugify";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Ambil site URL dari env dengan aman. Kalau admin lupa isi protokol
 * (mis. "desa-tanjungsari.up.railway.app" tanpa "https://"), otomatis
 * ditambahkan supaya `new URL()` tidak crash saat build.
 */
export function getSiteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

export function generateSlug(text: string) {
  return slugify(text, { lower: true, strict: true, locale: "id" });
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function timeAgo(date: Date | string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  const intervals: [number, string][] = [
    [31536000, "tahun"],
    [2592000, "bulan"],
    [86400, "hari"],
    [3600, "jam"],
    [60, "menit"],
  ];
  for (const [secs, label] of intervals) {
    const count = Math.floor(seconds / secs);
    if (count >= 1) return `${count} ${label} lalu`;
  }
  return "baru saja";
}

export function truncate(text: string, length = 150) {
  const clean = text.replace(/<[^>]*>/g, "");
  return clean.length > length ? clean.slice(0, length).trim() + "…" : clean;
}
