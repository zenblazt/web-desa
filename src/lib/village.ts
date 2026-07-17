/**
 * Konfigurasi identitas desa — dibaca dari tabel Settings (bukan hardcode),
 * supaya template ini bisa dipakai untuk desa lain tinggal ganti Settings.
 * Dipakai di: default topik pencarian AI (Tavily), prompt Gemini, dan
 * tempat lain yang butuh nama desa/kecamatan/kabupaten secara dinamis.
 */
import { prisma } from "@/lib/prisma";

export interface VillageInfo {
  villageName: string;
  districtName: string;
  regencyName: string;
  provinceName: string;
  fullLabel: string; // "Desa X Kecamatan Y Kabupaten Z"
}

const FALLBACK: VillageInfo = {
  villageName: "Tanjungsari",
  districtName: "Jenangan",
  regencyName: "Ponorogo",
  provinceName: "Jawa Timur",
  fullLabel: "Desa Tanjungsari Kecamatan Jenangan Kabupaten Ponorogo",
};

let cached: VillageInfo | null = null;
let cachedAt = 0;
const TTL_MS = 5 * 60 * 1000; // 5 menit, biar gak query tiap request

export async function getVillageInfo(): Promise<VillageInfo> {
  if (cached && Date.now() - cachedAt < TTL_MS) return cached;

  try {
    const settings = await prisma.settings.findUnique({ where: { id: "site_settings" } });
    if (!settings) {
      cached = FALLBACK;
    } else {
      cached = {
        villageName: settings.villageName || FALLBACK.villageName,
        districtName: settings.districtName || FALLBACK.districtName,
        regencyName: settings.regencyName || FALLBACK.regencyName,
        provinceName: settings.provinceName || FALLBACK.provinceName,
        fullLabel: `Desa ${settings.villageName} Kecamatan ${settings.districtName} Kabupaten ${settings.regencyName}`,
      };
    }
  } catch {
    // Migration belum jalan / kolom belum ada — pakai fallback biar gak crash.
    cached = FALLBACK;
  }

  cachedAt = Date.now();
  return cached;
}
