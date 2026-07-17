import Link from "next/link";
import * as Icons from "lucide-react";
import { FileText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/home/announcements";

export async function PopularServices() {
  const services = await prisma.layanan.findMany({
    where: { isActive: true, isPopular: true },
    orderBy: { order: "asc" },
    take: 6,
  });

  if (services.length === 0) return null;

  return (
    <section className="section-y bg-secondary/30">
      <div className="container-app">
        <SectionHeading
          icon={<FileText className="h-5 w-5" />}
          title="Layanan Populer"
          subtitle="Layanan yang paling sering diakses warga"
          href="/layanan"
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => {
            const Icon = (Icons as any)[service.icon ?? "FileText"] ?? FileText;
            return (
              <Link key={service.id} href={`/layanan/${service.slug}`}>
                <Card className="group h-full p-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform group-hover:scale-105">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-semibold">{service.title}</h3>
                  <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                    {service.description}
                  </p>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
