import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { AiTabWidget } from "@/components/admin/ai-tab-widget";

export const dynamic = "force-dynamic";

export default async function AdminBeritaPage() {
  const items = await prisma.berita.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Berita</h1>
          <p className="text-sm text-muted-foreground">Kelola semua berita desa.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/ai-assistant"><Sparkles className="h-4 w-4" /> Buat via AI</Link>
          </Button>
          <Button asChild>
            <Link href="/admin/berita/new"><Plus className="h-4 w-4" /> Tulis Baru</Link>
          </Button>
        </div>
      </div>

      <AiTabWidget contentType="BERITA" />

      <Card className="divide-y divide-border p-0">
        {items.length === 0 && <p className="p-5 text-sm text-muted-foreground">Belum ada berita.</p>}
        {items.map((item) => (
          <Link key={item.id} href={`/admin/berita/${item.id}`} className="flex items-center justify-between gap-4 p-4 hover:bg-accent">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{item.title}</p>
              <p className="text-xs text-muted-foreground">{formatDate(item.createdAt)} · {item.category} · {item.viewCount} views</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {item.isAiGenerated && <Badge variant="outline">AI</Badge>}
              <Badge variant={item.status === "PUBLISHED" ? "default" : "secondary"}>{item.status}</Badge>
            </div>
          </Link>
        ))}
      </Card>
    </div>
  );
}
