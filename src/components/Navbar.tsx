"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileScan, Table2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/kk", label: "Daftar KK", icon: Table2 },
  { href: "/upload", label: "Scan / Upload KK", icon: Upload },
] as const;

function NavLinks({ pathname }: { pathname?: string }) {
  return (
    <nav aria-label="Navigasi Utama" className="flex items-center gap-1">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active =
          pathname !== undefined &&
          (pathname === href ||
            (href === "/kk" && pathname.startsWith("/kk/")));

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors sm:text-sm",
              active
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
            )}
          >
            <Icon className="size-3.5" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function ActiveNavLinks() {
  const pathname = usePathname();
  return <NavLinks pathname={pathname} />;
}

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-card/90 backdrop-blur-md">
      <div className="mx-auto flex h-15 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/kk"
          className="flex items-center gap-2.5 text-sm font-semibold tracking-tight text-foreground"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
            <FileScan className="size-4" />
          </span>
          <span>Arsip KK</span>
          <span className="hidden border-l border-border pl-2.5 text-xs font-normal text-muted-foreground sm:inline">
            Digitalisasi Kartu Keluarga
          </span>
        </Link>

        <Suspense fallback={<NavLinks />}>
          <ActiveNavLinks />
        </Suspense>
      </div>
    </header>
  );
}
