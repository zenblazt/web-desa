import * as Icons from "lucide-react";
import { Users } from "lucide-react";
import { prisma } from "@/lib/prisma";

export async function Stats() {
  const stats = await prisma.statistik.findMany({ orderBy: { order: "asc" }, take: 4 });
  if (stats.length === 0) return null;

  return (
    <section className="section-y">
      <div className="container-app">
        <div className="grid grid-cols-2 gap-4 rounded-2xl border border-border bg-card p-6 shadow-soft md:grid-cols-4 md:p-8">
          {stats.map((s) => {
            const Icon = (Icons as any)[s.icon ?? "Users"] ?? Users;
            return (
              <div key={s.id} className="flex flex-col items-center gap-2 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                  <Icon className="h-5 w-5" />
                </span>
                <p className="text-2xl font-bold tracking-tight">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
