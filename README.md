# Sistem Informasi Desa Tanjungsari

Website resmi Desa Tanjungsari, Kecamatan Jenangan — modern, cepat, mobile-first, SEO-friendly.

## Tech Stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** + shadcn/ui-style components
- **Prisma** + **MySQL**
- **Auth.js (NextAuth v4)** — login admin
- **Google Gemini API (AI Studio, free tier)** — AI Assistant untuk ringkasan berita + SEO metadata
- **Cloudinary** — hosting gambar (aman dipakai di Railway karena filesystem-nya ephemeral)

## 1. Instalasi

```bash
npm install
cp .env.example .env
```

Isi `.env` (atau isi lewat tab **Variables** kalau deploy di Railway):
- `DATABASE_URL` → koneksi MySQL kamu (di Railway: klik "Add Reference" ke service MySQL)
- `NEXTAUTH_SECRET` → generate dengan `openssl rand -base64 32`
- `GEMINI_API_KEY` → API key GRATIS dari https://aistudio.google.com/apikey
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` → dari https://console.cloudinary.com (free tier: 25GB storage)

## 2. Setup Database

```bash
npm run db:push      # sinkronkan schema Prisma ke MySQL
npm run db:seed       # buat admin pertama + data contoh
```

Login admin default (**ganti password setelah login pertama**):
```
Email    : admin@desatanjungsari.id
Password : admin123
```

## 3. Jalankan

```bash
npm run dev
```

- Situs publik: `http://localhost:3000`
- Dashboard admin: `http://localhost:3000/admin/login`

## Struktur Folder

```
src/
├── app/
│   ├── (public pages)/       # beranda, profil-desa, layanan, umkm, dst.
│   ├── admin/
│   │   ├── login/            # halaman login (di luar auth guard)
│   │   └── (dashboard)/      # semua halaman admin (dilindungi middleware)
│   │       ├── ai-assistant/ # AI scraping & review
│   │       ├── berita/
│   │       ├── pengumuman/
│   │       ├── layanan/
│   │       ├── umkm/
│   │       ├── galeri/
│   │       ├── perangkat/
│   │       └── pengaturan/
│   ├── api/                  # semua API routes (REST, dipakai admin & AI)
│   ├── sitemap.ts            # sitemap otomatis
│   ├── robots.ts
│   └── rss.xml/route.ts      # RSS feed berita
├── components/
│   ├── ui/                   # button, card, input, badge (shadcn-style)
│   ├── layout/                # navbar, footer
│   ├── home/                  # section-section beranda
│   ├── admin/                 # sidebar, topbar, form editor, uploader
│   └── shared/                 # theme provider, auth provider, visit tracker
├── lib/
│   ├── prisma.ts               # Prisma client singleton
│   ├── auth.ts                 # konfigurasi Auth.js
│   ├── ai-assistant.ts         # logic scraping + panggil Claude API
│   └── utils.ts
└── middleware.ts               # proteksi route /admin

prisma/
├── schema.prisma               # semua model database
└── seed.ts                     # data awal
```

## Cara Kerja AI Assistant

Sesuai workflow yang diminta, ada **2 opsi sumber**, keduanya dikelola dari
`/admin/ai-assistant`:

1. **Opsi 1 — Manual Link**: admin tempel URL berita/pengumuman resmi
   (misalnya website kecamatan). AI (`POST /api/ai/scrape` dengan
   `type: "MANUAL_LINK"`) akan fetch halaman, ekstrak teks utama, lalu
   kirim ke Gemini API (model `gemini-3.1-flash-lite` via env `GEMINI_MODEL`,
   gratis di AI Studio) untuk diringkas + dibuatkan judul SEO, meta
   description, tag, dan slug.

2. **Opsi 2 — Auto Search**: admin mendaftarkan sumber resmi ke tabel
   `AiSource` (nama + URL, tipe `AUTO_SEARCH`). Admin tinggal klik
   **"Cek Sekarang"** pada sumber yang diinginkan, sistem akan fetch
   sumber tersebut dan proses sama seperti opsi 1.

Setiap proses menghasilkan `AiJob` berstatus `NEEDS_REVIEW` — **tidak ada
yang otomatis publish**. Admin wajib review & edit dulu (judul, ringkasan,
meta description, tag) di dashboard, baru pilih **Approve & Publish** atau
**Simpan sebagai Draft**. Ini sesuai step 4–5 di spec awal (Admin review →
Publish).

> Ganti model lewat env `GEMINI_MODEL` bila perlu — cek daftar model aktif
> terbaru di https://ai.google.dev/gemini-api/docs/models (model versi 2.0
> dan 2.5 sudah mulai di-deprecate untuk API key baru, per pertengahan 2026).
> Ekstraksi konten pakai heuristik sederhana (`cheerio`, ambil semua `<p>`
> yang cukup panjang) — untuk sumber yang strukturnya rumit, sesuaikan
> selector di `extractFromUrl()`.

## Fitur yang Sudah Tersedia

- ✅ 10 halaman publik sesuai spec (Beranda, Profil Desa, Perangkat Desa,
  Layanan, Potensi Desa, UMKM, Galeri, Kontak, Pengumuman, Berita)
- ✅ Beranda dengan hero, search, pengumuman, layanan populer, berita
  terbaru, statistik, UMKM unggulan, galeri, footer lengkap
- ✅ Dashboard admin: CRUD semua konten, upload gambar, draft/publish,
  SEO metadata per-konten, ringkasan statistik pengunjung, pengaturan
- ✅ AI Assistant 2 opsi sumber + review flow
- ✅ Global search (`/cari?q=`)
- ✅ Sitemap otomatis (`/sitemap.xml`), robots.txt, RSS feed (`/rss.xml`)
- ✅ Open Graph metadata di tiap halaman
- ✅ Lazy loading gambar (Next/Image)
- ✅ Dark mode (class-based, toggle di navbar)
- ✅ Mobile-first, rounded card, shadow halus, animasi ringan

## Yang Perlu Kamu Lengkapi Sendiri

Karena kamu bilang **data diandalkan dari scraping saja** (bukan
perangkat desa yang isi manual), berikut yang masih perlu kamu putuskan/atur:

1. **Sumber resmi untuk AI Assistant** — daftarkan minimal 2 URL resmi
   (kecamatan/kabupaten/desa) lewat dashboard AI Assistant.
2. **Konten awal** — profil desa, kontak, statistik, perangkat desa perlu
   diisi minimal sekali lewat `/admin/pengaturan` dan halaman terkait
   (kalau datanya mau discrape juga, bisa dibuatkan job AI khusus serupa
   pola di `src/lib/ai-assistant.ts`, tinggal extend).
3. **Logo, favicon, warna brand** — saat ini pakai skema hijau default
   di `tailwind.config.ts` (`primary-*`) dan `globals.css` (`--primary`).
4. **Domain & hosting** — set `NEXT_PUBLIC_SITE_URL` sesuai domain final
   untuk sitemap/OG/canonical URL yang benar.
5. Untuk **AUTO_SEARCH murni tanpa URL tetap** (AI cari bebas dari
   internet berdasarkan tanggal, bukan dari daftar sumber tetap), tambahkan
   tool web-search di endpoint `/api/ai/scrape` — saat ini opsi 2
   diimplementasikan sebagai "cek ulang sumber terdaftar", yang lebih
   aman dan terkontrol untuk situs resmi pemerintah desa.
6. **Scraper situs WordPress (Opsi 3, 0 kuota AI)** dan **cari berita
   baru via search engine (Opsi 4, hemat query)** ada di halaman
   AI Assistant admin. Schema Prisma berubah untuk fitur ini (`SourceType`
   tambah `WP_JSON`/`SEARCH_ENGINE`, tabel baru `search_quota`) — **jalankan
   ulang `npx prisma db push` setelah deploy update ini**. Opsi 4 butuh
   `TAVILY_API_KEY` (gratis 1.000 kredit/bulan, daftar di
   https://app.tavily.com — lihat `.env.example`); tanpa itu, Opsi 3
   (WordPress) tetap jalan normal karena tidak butuh API key tambahan.
   *(Catatan: bukan pakai Google Custom Search — API itu sudah ditutup
   untuk pelanggan baru per 2026.)*

## Deploy ke Railway

1. Buat service baru dari repo GitHub kamu.
2. Tambah `+ New` → `Database` → `MySQL` di project yang sama.
3. Di service Next.js, tab **Variables**, isi semua env var dari
   `.env.example` (untuk `DATABASE_URL`, klik "Add Reference" ke service
   MySQL biar otomatis konek).
4. Setelah deploy pertama sukses, buka tab **Shell** di service, jalankan:
   ```bash
   npx prisma db push
   npm run db:seed
   ```
5. Gambar di-upload otomatis ke Cloudinary (bukan disk lokal), jadi aman
   dari redeploy Railway yang ephemeral filesystem-nya.
