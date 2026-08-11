import Link from "next/link";
import { Shield } from "lucide-react";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 focus-ring rounded-md">
      <span className="flex h-9 w-9 items-center justify-center rounded-md border border-oals-accent/40 bg-oals-accent/10">
        <Shield className="h-5 w-5 text-oals-accent" aria-hidden />
      </span>
      <span className="font-[family-name:var(--font-space-grotesk)] text-lg font-semibold tracking-tight text-oals-text">
        OALS
      </span>
    </Link>
  );
}
