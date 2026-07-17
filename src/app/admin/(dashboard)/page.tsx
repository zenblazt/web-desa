import { Newspaper, Megaphone, Store, Eye, Sparkles, Users2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [beritaCount, pengumumanCount, umkmCount, pendingAiJobs, totalViews, visitLast7d, recentBerita] =
    await Promise.all([
      prisma.berita.count(),
      prisma.pengumuman.count({ where: { status: "PUBLISHED" } }),
      prisma.umkm.count({ where: { isActive: true } }),
      prisma.aiJob.count({ where: { status: "NEEDS_REVIEW" } }),
      prisma.berita.aggregate({ _sum: { viewCount: true } }),
      prisma.pageVisit.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 86400000) } } }),
      prisma.berita.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    ]);

  const cards = [
    { label: "Total Berita", value: beritaCount, icon: Newspaper, href: "/admin/berita" },
    { label: "Pengumuman Aktif", value: pengumumanCount, icon: Megaphone, href: "/admin/pengumuman" },
    { label: "UMKM Terdaftar", value: umkmCount, icon: Store, href: "/admin/umkm" },
    { label: "AI Perlu Review", value: pendingAiJobs, icon: Sparkles, href: "/admin/ai-assistant" },
    { label: "Total Views Berita", value: totalViews._sum.viewCount ?? 0, icon: Eye, href: "/admin/berita" },
    { label: "Pengunjung 7 Hari", value: visitLast7d, icon: Users2, href: "#" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Ringkasan aktivitas website Desa Tanjungsari.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.label} href={c.href}>
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                  <c.icon className="h-5 w-5" />
                </span>
              </div>
              <p className="mt-4 text-2xl font-bold">{c.value}</p>
              <p className="text-sm text-muted-foreground">{c.label}</p>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Berita Terbaru</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentBerita.length === 0 && (
            <p className="text-sm text-muted-foreground">Belum ada berita.</p>
          )}
          {recentBerita.map((b) => (
            <Link
              key={b.id}
              href={`/admin/berita/${b.id}`}
              className="flex items-center justify-between rounded-xl border border-border p-3 hover:bg-accent"
            >
              <div>
                <p className="text-sm font-medium">{b.title}</p>
                <p className="text-xs text-muted-foreground">{formatDate(b.createdAt)}</p>
              </div>
              <Badge variant={b.status === "PUBLISHED" ? "default" : "secondary"}>{b.status}</Badge>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
