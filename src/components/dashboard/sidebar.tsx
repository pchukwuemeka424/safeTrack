"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderSearch,
  Link2,
  Shield,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Logo } from "@/components/layout/logo";
import { signOut } from "next-auth/react";

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/investigations", label: "Investigations", icon: FolderSearch },
  { href: "/dashboard/links", label: "Links", icon: Link2 },
];

export function DashboardSidebar({
  role,
  name,
}: {
  role?: string;
  name?: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col border-r border-oals-border bg-oals-surface">
      <div className="flex h-16 items-center border-b border-oals-border px-4">
        <Logo href="/dashboard" />
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {nav.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-oals-accent/10 text-oals-accent"
                  : "text-oals-muted hover:bg-oals-bg hover:text-oals-text",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
        {role === "ADMIN" && (
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              pathname.startsWith("/admin")
                ? "bg-oals-accent/10 text-oals-accent"
                : "text-oals-muted hover:bg-oals-bg hover:text-oals-text",
            )}
          >
            <Shield className="h-4 w-4" />
            Admin
          </Link>
        )}
      </nav>
      <div className="border-t border-oals-border p-4">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="text-xs text-oals-dim">{role}</p>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="mt-3 flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-oals-muted hover:bg-oals-bg hover:text-oals-text"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
