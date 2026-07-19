import Link from "next/link";
import { MapPinOff, Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container-app flex min-h-[70vh] flex-col items-center justify-center py-16 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary-50 text-primary dark:bg-primary-950/50">
        <MapPinOff className="h-10 w-10" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Halaman Tidak Ditemukan</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        Halaman yang kamu cari mungkin sudah dipindahkan, dihapus, atau alamatnya salah ketik.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            Kembali ke Beranda
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/cari">
            <Search className="mr-2 h-4 w-4" />
            Cari Informasi
          </Link>
        </Button>
      </div>
    </div>
  );
}
