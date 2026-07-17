/**
 * Rate limiter sederhana untuk request ke Gemini API (free tier AI Studio).
 * -------------------------------------------------------------------------
 * Free tier Gemini dibatasi per MENIT (RPM) dan per HARI (RPD). Kalau
 * scraping/summarize dipanggil beruntun cepat (loop banyak berita sekaligus),
 * RPM kena duluan sebelum RPD — makanya perlu jeda antar-request, bukan cuma
 * hitung total per hari.
 *
 * Catatan: state ini in-memory per proses server. Di Railway (long-running
 * Node process) ini cukup, beda dengan serverless yang reset tiap invocation.
 */

interface RateLimiterOptions {
  /** Maks request per menit (default aman untuk Gemini Flash-Lite free tier: 15 RPM -> pakai 10 biar ada headroom) */
  maxPerMinute?: number;
  /** Maks request per hari */
  maxPerDay?: number;
}

class GeminiRateLimiter {
  private timestamps: number[] = []; // request dalam 60 detik terakhir
  private dayCount = 0;
  private dayKey = "";
  private maxPerMinute: number;
  private maxPerDay: number;
  private queue: Promise<void> = Promise.resolve();

  constructor(opts: RateLimiterOptions = {}) {
    this.maxPerMinute = opts.maxPerMinute ?? Number(process.env.GEMINI_RPM_LIMIT ?? 10);
    this.maxPerDay = opts.maxPerDay ?? Number(process.env.GEMINI_RPD_LIMIT ?? 1400);
  }

  private todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  private resetDayIfNeeded() {
    const key = this.todayKey();
    if (key !== this.dayKey) {
      this.dayKey = key;
      this.dayCount = 0;
    }
  }

  /** Berapa slot RPM yang masih tersisa menit ini */
  private cleanupWindow() {
    const now = Date.now();
    this.timestamps = this.timestamps.filter((t) => now - t < 60_000);
  }

  getStatus() {
    this.resetDayIfNeeded();
    this.cleanupWindow();
    return {
      usedThisMinute: this.timestamps.length,
      maxPerMinute: this.maxPerMinute,
      usedToday: this.dayCount,
      maxPerDay: this.maxPerDay,
    };
  }

  /**
   * Tunggu giliran (antre) sampai aman untuk kirim 1 request ke Gemini.
   * Melempar error kalau limit harian sudah habis (gak ada gunanya nunggu).
   */
  async acquire(): Promise<void> {
    // Antre semua pemanggil biar gak race condition pas cek+push timestamp
    const run = this.queue.then(async () => {
      this.resetDayIfNeeded();

      if (this.dayCount >= this.maxPerDay) {
        throw new Error(
          `Kuota harian Gemini sudah habis (${this.dayCount}/${this.maxPerDay}). Coba lagi besok atau upgrade tier.`
        );
      }

      this.cleanupWindow();
      if (this.timestamps.length >= this.maxPerMinute) {
        const oldest = this.timestamps[0];
        const waitMs = 60_000 - (Date.now() - oldest) + 250; // +buffer kecil
        if (waitMs > 0) await sleep(waitMs);
        this.cleanupWindow();
      }

      this.timestamps.push(Date.now());
      this.dayCount += 1;
    });

    this.queue = run.catch(() => {}); // jangan sampai 1 error nge-stuck antrean
    return run;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Singleton per proses server
export const geminiLimiter = new GeminiRateLimiter();

/**
 * Bungkus 1 pemanggilan Gemini dengan: antre rate limit -> jalankan ->
 * kalau kena 429/503, exponential backoff + retry (maks `maxRetries`).
 */
export async function withGeminiRetry<T>(
  fn: () => Promise<T>,
  opts: { maxRetries?: number; baseDelayMs?: number } = {}
): Promise<T> {
  const maxRetries = opts.maxRetries ?? 4;
  const baseDelayMs = opts.baseDelayMs ?? 2000;

  let lastErr: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    await geminiLimiter.acquire();
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      const status = err?.status ?? extractStatusFromMessage(err?.message);
      const isRetryable = status === 429 || status === 503 || status === 500;
      if (!isRetryable || attempt === maxRetries) throw err;

      // exponential backoff + jitter
      const delay = baseDelayMs * 2 ** attempt + Math.random() * 500;
      await sleep(delay);
    }
  }
  throw lastErr;
}

function extractStatusFromMessage(message?: string): number | undefined {
  if (!message) return undefined;
  const match = message.match(/\b(429|500|503)\b/);
  return match ? Number(match[1]) : undefined;
}
