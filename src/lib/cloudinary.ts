import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/** Upload buffer gambar ke Cloudinary, return secure_url-nya */
export function uploadToCloudinary(buffer: Buffer, folder = "desa-tanjungsari"): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error("Upload gagal"));
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

/** Upload gambar dari URL remote (hasil scraping) ke Cloudinary, return secure_url-nya.
 *  Dipakai supaya gambar hasil AI scrape gak hotlink ke situs sumber (bisa hilang/berubah
 *  sewaktu-waktu), tapi ikut ke-host di Cloudinary kita sendiri seperti upload manual. */
export async function uploadRemoteUrlToCloudinary(remoteUrl: string, folder = "desa-tanjungsari/ai-scrape"): Promise<string> {
  const result = await cloudinary.uploader.upload(remoteUrl, { folder, resource_type: "image" });
  return result.secure_url;
}

export { cloudinary };
