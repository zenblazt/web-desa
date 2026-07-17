import { Hero } from "@/components/home/hero";
import { Announcements } from "@/components/home/announcements";
import { PopularServices } from "@/components/home/popular-services";
import { LatestNews } from "@/components/home/latest-news";
import { Stats } from "@/components/home/stats";
import { UmkmHighlight } from "@/components/home/umkm-highlight";
import { GalleryPreview } from "@/components/home/gallery-preview";

// ISR: refresh tiap 60 detik supaya tetap cepat tapi konten cukup up-to-date
export const revalidate = 60;

export default function HomePage() {
  return (
    <>
      <Hero />
      <Announcements />
      <PopularServices />
      <LatestNews />
      <Stats />
      <UmkmHighlight />
      <GalleryPreview />
    </>
  );
}
