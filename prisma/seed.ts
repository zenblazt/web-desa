import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("admin123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@desatanjungsari.id" },
    update: {},
    create: {
      name: "Admin Desa Tanjungsari",
      email: "admin@desatanjungsari.id",
      password: hashedPassword,
      role: "SUPERADMIN",
    },
  });

  await prisma.settings.upsert({
    where: { id: "site_settings" },
    update: {},
    create: { id: "site_settings", siteName: "Desa Tanjungsari", tagline: "Situs Resmi Desa Tanjungsari, Kecamatan Jenangan" },
  });

  await prisma.profilDesa.upsert({
    where: { id: (await prisma.profilDesa.findFirst())?.id ?? "profil_default" },
    update: {},
    create: {
      id: "profil_default",
      sejarah: "Sejarah Desa Tanjungsari akan segera dilengkapi oleh admin.",
      visi: "Mewujudkan Desa Tanjungsari yang maju, mandiri, dan sejahtera.",
      misi: "1. Meningkatkan pelayanan publik.\n2. Mengembangkan potensi ekonomi desa.\n3. Menjaga kelestarian lingkungan.",
      luasWilayah: "± 3.5 km²",
      jumlahPenduduk: "± 2.500 jiwa",
    },
  });

  await prisma.kontak.upsert({
    where: { id: (await prisma.kontak.findFirst())?.id ?? "kontak_default" },
    update: {},
    create: {
      id: "kontak_default",
      address: "Kantor Desa Tanjungsari, Kecamatan Jenangan, Kabupaten Ponorogo, Jawa Timur",
      phone: "(0352) 000-000",
      email: "desa.tanjungsari@jenangan.go.id",
      operationalHours: "Senin–Jumat, 08.00–15.00 WIB",
    },
  });

  const statistikData = [
    { label: "Jumlah Penduduk", value: "2.500", icon: "Users", order: 1 },
    { label: "Jumlah KK", value: "780", icon: "Home", order: 2 },
    { label: "Luas Wilayah", value: "3.5 km²", icon: "Ruler", order: 3 },
    { label: "Jumlah RT/RW", value: "12 / 4", icon: "MapPin", order: 4 },
  ];
  for (const s of statistikData) {
    await prisma.statistik.upsert({
      where: { id: `stat_${s.order}` },
      update: {},
      create: { id: `stat_${s.order}`, ...s },
    });
  }

  const layananData = [
    { title: "Surat Keterangan Domisili", slug: "surat-keterangan-domisili", description: "Pengajuan surat keterangan domisili untuk keperluan administrasi.", icon: "FileText", duration: "1 hari kerja", cost: "Gratis", isPopular: true, order: 1 },
    { title: "Surat Keterangan Tidak Mampu", slug: "surat-keterangan-tidak-mampu", description: "Pengajuan SKTM untuk keperluan bantuan sosial atau pendidikan.", icon: "HeartHandshake", duration: "1 hari kerja", cost: "Gratis", isPopular: true, order: 2 },
    { title: "Surat Pengantar KTP/KK", slug: "surat-pengantar-ktp-kk", description: "Pengantar untuk pembuatan atau perubahan data KTP dan Kartu Keluarga.", icon: "IdCard", duration: "1 hari kerja", cost: "Gratis", isPopular: true, order: 3 },
  ];
  for (const l of layananData) {
    await prisma.layanan.upsert({ where: { slug: l.slug }, update: {}, create: l });
  }

  console.log("Seed selesai. Login admin:");
  console.log("  Email   : admin@desatanjungsari.id");
  console.log("  Password: admin123");
  console.log("  (Segera ganti password setelah login pertama)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
