"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Menu, LogOut, Sprout, X } from "lucide-react";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Newspaper, Megaphone, Wrench, Users2, Store, Images, Sparkles, Settings,
  KeyRound, ShieldCheck,
} from "lucide-react";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/ai-assistant", label: "AI Assistant", icon: Sparkles },
  { href: "/admin/berita", label: "Berita", icon: Newspaper },
  { href: "/admin/pengumuman", label: "Pengumuman", icon: Megaphone },
  { href: "/admin/layanan", label: "Layanan", icon: Wrench },
  { href: "/admin/perangkat", label: "Perangkat Desa", icon: Users2 },
  { href: "/admin/umkm", label: "UMKM", icon: Store },
  { href: "/admin/galeri", label: "Galeri", icon: Images },
  { href: "/admin/pengaturan", label: "Pengaturan", icon: Settings },
  { href: "/admin/pengaturan/akun", label: "Akun Saya", icon: KeyRound },
];

const SUPERADMIN_NAV = [
  { href: "/admin/management", label: "Manajemen Admin", icon: ShieldCheck },
];

export function AdminTopbar({ userName, role }: { userName?: string | null; role?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const nav = role === "SUPERADMIN" ? [...NAV, ...SUPERADMIN_NAV] : NAV;

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-card/90 px-4 backdrop-blur lg:px-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen((v) => !v)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <span className="flex items-center gap-2 font-semibold lg:hidden">
          <Sprout className="h-5 w-5 text-primary" /> Admin Desa
        </span>
      </div>

      <div className="flex items-center gap-3">
        {userName && <span className="hidden text-sm text-muted-foreground sm:inline">Halo, {userName}</span>}
        <ThemeToggle />
        <Button variant="ghost" size="icon" onClick={() => signOut({ callbackUrl: "/admin/login" })} aria-label="Keluar">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>

      {open && (
        <nav className="absolute left-0 top-16 flex w-full flex-col gap-1 border-b border-border bg-card p-3 lg:hidden">
          {nav.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground",
                  active && "bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
