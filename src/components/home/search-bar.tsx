"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/cari?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex max-w-xl items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-soft-lg"
    >
      <Search className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Cari layanan, berita, atau pengumuman…"
        className="h-10 border-none bg-transparent shadow-none focus-visible:ring-0"
      />
      <Button type="submit" className="shrink-0">
        Cari
      </Button>
    </form>
  );
}
