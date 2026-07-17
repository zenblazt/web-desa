# Handoff — Perbaikan ZenStock/Desa Tanjungsari (AI Assistant & Homepage)

## ✅ Tahap 1 — SELESAI (di kode ini)

1. **Gambar ikut ke-scrape** (`src/lib/ai-assistant.ts` → `extractFromUrl`)
   - Ambil `og:image`/`twitter:image` sebagai `featuredImage`, dan semua `<img>` di dalam artikel sebagai `contentImages`.
   - Juga ambil `article:published_time` untuk `originalPublishedAt` kalau tersedia.
   - Field ini sekarang benar-benar disimpan ke `AiJob` di `src/app/api/ai/scrape/route.ts` (sebelumnya cuma disiapkan di schema tapi gak pernah diisi untuk jalur Manual Link/Auto Search/Tavily).
   - **Efek langsung: Galeri sekarang otomatis kebawa gambarnya** (sebelumnya selalu error "Tidak ada gambar" untuk sumber selain WordPress).

2. **Homepage 2x2 (4 berita)** — `src/components/home/latest-news.tsx`: `take: 4`, grid jadi `sm:grid-cols-2`.

3. **Nama desa mulai bisa diganti** (langkah awal generalisasi):
   - Tambah field `villageName`, `districtName`, `regencyName`, `provinceName` di model `Settings` (`prisma/schema.prisma`).
   - **WAJIB jalankan migration dulu**: `npx prisma migrate dev --name add_village_fields` (SQL manual juga disiapkan di `prisma/migrations/manual_add_village_fields/migration.sql` kalau mau apply manual).
   - Helper baru `src/lib/village.ts` → `getVillageInfo()`, baca dari Settings (fallback ke Tanjungsari kalau migration belum jalan, supaya gak crash).
   - Sudah dipakai di: default topik pencarian Tavily (`search-engine.ts`), dan `buildAutoSearchQuery` (`ai-assistant.ts`).

## ⏳ Tahap 2 — BELUM (rencana selanjutnya)

1. **Perangkat Desa via AI** — butuh extractor terpisah: parse halaman "Struktur Perangkat Desa" jadi *banyak record* (nama+jabatan+foto per orang), bukan reuse pipeline 1-artikel-1-job. Cek juga apakah UMKM butuh hal serupa (kalau sumbernya berupa daftar UMKM, bukan 1 UMKM per artikel).
2. **Re-test poin "semua scrape ke Berita"** setelah fix gambar — kemungkinan sudah beres, tapi perlu dicoba langsung di tiap tab (UMKM/Galeri/Perangkat Desa/Pengumuman).
3. **AI Assistant UX**: pesan error lebih jelas, preview hasil ekstraksi sebelum submit.
4. **Sapu bersih hardcode nama desa** — masih ada di ~21 file lain (footer, navbar, metadata tiap halaman, RSS, halaman admin). List lengkap:
   `footer.tsx, navbar.tsx, gallery-preview.tsx, umkm-highlight.tsx, hero.tsx, admin/pengaturan, admin/ai-assistant, admin/page, admin/login, layanan, umkm, kontak, perangkat-desa, rss.xml, galeri, pengumuman, profil-desa, layout.tsx, berita, potensi-desa`
   → semua ini perlu diarahkan baca dari `getVillageInfo()` / `Settings.siteName`, plus idealnya ada form isi nama desa di halaman admin Pengaturan.

## Catatan penting
- Migration belum dijalankan di sini (tidak ada akses DB dari environment ini) — **jalankan migration di lingkunganmu sebelum deploy**, kalau tidak field baru di Settings gak akan ada di database (kode tetap jalan karena ada fallback, tapi settings-nya belum efektif dipakai).
