"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderSearch,
  Link2,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const items = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/dashboard/investigations", label: "Cases", icon: FolderSearch },
  { href: "/dashboard/links", label: "Links", icon: Link2 },
  { href: "/dashboard/access-events", label: "Events", icon: Activity },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-oals-border bg-oals-surface/95 backdrop-blur md:hidden">
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)]">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-2 py-2.5 text-[10px] font-medium",
                  active ? "text-oals-accent" : "text-oals-dim",
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
