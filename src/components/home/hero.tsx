import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/home/search-bar";
import { getVillageInfo } from "@/lib/village";

export async function Hero() {
  const village = await getVillageInfo();

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary-50 to-background dark:from-primary-950/40 dark:to-background">
      <div className="absolute -top-24 right-0 h-72 w-72 rounded-full bg-primary-200/40 blur-3xl dark:bg-primary-800/20" />
      <div className="container-app relative py-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-5 inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-white/70 px-3.5 py-1.5 text-xs font-medium text-primary-700 shadow-sm backdrop-blur dark:border-primary-800 dark:bg-primary-950/50 dark:text-primary-300">
            <MapPin className="h-3.5 w-3.5" />
            Kecamatan {village.districtName}, Kabupaten {village.regencyName}
          </div>

          <h1 className="animate-fade-up text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Selamat Datang di{" "}
            <span className="text-primary">Desa {village.villageName}</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl animate-fade-up text-balance text-base text-muted-foreground [animation-delay:100ms] md:text-lg">
            Pusat informasi dan layanan warga Desa {village.villageName} — cepat, transparan, dan mudah diakses kapan saja.
          </p>

          <div className="mt-8 animate-fade-up [animation-delay:200ms]">
            <SearchBar />
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3 animate-fade-up [animation-delay:300ms]">
            <Button asChild size="lg">
              <Link href="/layanan">
                Lihat Layanan <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/profil-desa">Profil Desa</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
