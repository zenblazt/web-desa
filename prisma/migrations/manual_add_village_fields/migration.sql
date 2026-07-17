-- Jalankan dengan: npx prisma migrate dev --name add_village_fields
-- (atau kalau mau manual: npx prisma db execute --file prisma/migrations/manual_add_village_fields/migration.sql)
ALTER TABLE `settings`
  ADD COLUMN `villageName` VARCHAR(191) NOT NULL DEFAULT 'Tanjungsari',
  ADD COLUMN `districtName` VARCHAR(191) NOT NULL DEFAULT 'Jenangan',
  ADD COLUMN `regencyName` VARCHAR(191) NOT NULL DEFAULT 'Ponorogo',
  ADD COLUMN `provinceName` VARCHAR(191) NOT NULL DEFAULT 'Jawa Timur';
