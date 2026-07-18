-- Manual migration: tambah opsi "sembunyikan sumber" untuk fitur AI scraping
-- Jalankan ini di database MySQL (Railway) kalau `prisma migrate deploy` tidak dipakai otomatis di build step.

ALTER TABLE `berita` ADD COLUMN `hideSource` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `ai_sources` ADD COLUMN `hideSource` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `ai_jobs` ADD COLUMN `hideSource` BOOLEAN NOT NULL DEFAULT false;
