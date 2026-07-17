/**
 * WordPress REST API Scraper
 * ---------------------------
 * Banyak situs desa/kecamatan (termasuk desatanjungsari.id) jalan di atas
 * WordPress, yang selalu punya REST API bawaan di /wp-json/wp/v2/*.
 *
 * Konsekuensinya: kita SAMA SEKALI TIDAK PERLU Gemini/AI untuk scraping
 * situs seperti ini — tinggal fetch JSON terstruktur (judul, isi, tanggal,
 * kategori, gambar) langsung dari endpoint resminya. Ini yang paling hemat:
 * 0 kuota AI terpakai untuk tahap scraping.
 *
 * AI baru dipakai (opsional) kalau admin mau AI merapikan gaya bahasa /
 * bikin ulang SEO metadata dari hasil scrape ini.
 */

export interface WpPostItem {
  wpId: number;
  title: string;
  excerpt: string;
  content: string; // sudah di-strip dari tag HTML
  url: string;
  publishedAt: string; // ISO date — tanggal publish ASLI dari WP, dipakai buat urutan & tanggal terbit final
  categories: string[];
  featuredImage: string | null; // gambar unggulan post
  images: string[]; // semua gambar yang kepakai di post ini (featured di indeks 0 kalau ada, lalu gambar-gambar di body)
}

function stripHtml(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8217;|&#039;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/** Ambil semua src gambar <img> di dalam HTML mentah sebuah post, urut sesuai kemunculan */
function extractImagesFromHtml(html: string, max = 8): string[] {
  const urls: string[] = [];
  const re = /<img[^>]+src=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && urls.length < max) {
    const src = m[1];
    // skip data-uri kecil (placeholder lazyload) & ikon
    if (src && !src.startsWith("data:") && !urls.includes(src)) urls.push(src);
  }
  return urls;
}

function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/**
 * Ambil daftar post dari sebuah situs WordPress lewat REST API-nya.
 * Otomatis paginasi sampai `maxPages` atau sampai halaman terakhir.
 */
export async function fetchWpPosts(
  siteUrl: string,
  opts: { perPage?: number; maxPages?: number; categoryId?: number } = {}
): Promise<WpPostItem[]> {
  const base = normalizeBaseUrl(siteUrl);
  const perPage = opts.perPage ?? 20;
  const maxPages = opts.maxPages ?? 10; // batas aman, ~200 post per jalan
  const items: WpPostItem[] = [];

  // Ambil dulu peta kategori (id -> nama) sekali saja, biar hemat request.
  const categoryMap = await fetchWpCategoryMap(base).catch(() => new Map<number, string>());

  for (let page = 1; page <= maxPages; page++) {
    const params = new URLSearchParams({
      per_page: String(perPage),
      page: String(page),
      // _embed=1 supaya wp:featuredmedia ikut dalam 1 request yang sama —
      // gambar unggulan ke-scrape tanpa request tambahan per post (tetap 0 kuota AI).
      _embed: "1",
      _fields: "id,title,excerpt,content,link,date,categories,featured_media,_links,_embedded",
    });
    if (opts.categoryId) params.set("categories", String(opts.categoryId));

    const res = await fetch(`${base}/wp-json/wp/v2/posts?${params.toString()}`, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; DesaTanjungsariBot/1.0)" },
    });

    if (res.status === 400 || res.status === 404) break; // sudah lewat halaman terakhir
    if (!res.ok) throw new Error(`WP-JSON gagal diakses (${res.status}) di ${base}`);

    const data = (await res.json()) as any[];
    if (!Array.isArray(data) || data.length === 0) break;

    for (const post of data) {
      const rawContent: string = post.content?.rendered ?? "";
      const featuredImage: string | null =
        post._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? null;
      const inlineImages = extractImagesFromHtml(rawContent);
      const images = featuredImage
        ? [featuredImage, ...inlineImages.filter((u) => u !== featuredImage)]
        : inlineImages;

      items.push({
        wpId: post.id,
        title: stripHtml(post.title?.rendered ?? ""),
        excerpt: stripHtml(post.excerpt?.rendered ?? "").slice(0, 300),
        content: stripHtml(rawContent).slice(0, 12000), // batasi, hemat token kalau nanti diringkas AI
        url: post.link,
        publishedAt: post.date,
        categories: (post.categories ?? []).map((id: number) => categoryMap.get(id) ?? String(id)),
        featuredImage,
        images,
      });
    }

    const totalPages = Number(res.headers.get("X-WP-TotalPages") ?? "1");
    if (page >= totalPages) break;
  }

  // Urutkan berdasarkan tanggal post ASLI (kronologis, paling lama dulu) —
  // supaya urutan hasil scrape & urutan publish-nya ngikutin timeline asli situs sumber,
  // bukan urutan kedatangan halaman pagination.
  items.sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime());

  return items;
}

async function fetchWpCategoryMap(base: string): Promise<Map<number, string>> {
  const res = await fetch(`${base}/wp-json/wp/v2/categories?per_page=100&_fields=id,name`);
  if (!res.ok) return new Map();
  const data = (await res.json()) as { id: number; name: string }[];
  return new Map(data.map((c) => [c.id, c.name]));
}

/** Ambil URL gambar unggulan (featured image) untuk 1 post — panggil hanya kalau perlu */
export async function fetchWpFeaturedImage(siteUrl: string, mediaId: number): Promise<string | null> {
  if (!mediaId) return null;
  const base = normalizeBaseUrl(siteUrl);
  const res = await fetch(`${base}/wp-json/wp/v2/media/${mediaId}?_fields=source_url`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.source_url ?? null;
}

/** Halaman statis (Profil Desa, Sejarah Desa, dll) — juga lewat wp-json, bukan AI */
export async function fetchWpPages(siteUrl: string): Promise<{ title: string; content: string; url: string }[]> {
  const base = normalizeBaseUrl(siteUrl);
  const res = await fetch(`${base}/wp-json/wp/v2/pages?per_page=50&_fields=title,content,link`);
  if (!res.ok) throw new Error(`WP-JSON pages gagal diakses (${res.status})`);
  const data = (await res.json()) as any[];
  return data.map((p) => ({
    title: stripHtml(p.title?.rendered ?? ""),
    content: stripHtml(p.content?.rendered ?? ""),
    url: p.link,
  }));
}

/** Cek cepat apakah sebuah situs adalah WordPress (punya wp-json aktif) */
export async function isWordPressSite(siteUrl: string): Promise<boolean> {
  try {
    const base = normalizeBaseUrl(siteUrl);
    const res = await fetch(`${base}/wp-json/`, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}
