import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-oals-border bg-oals-surface/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-6 text-sm text-oals-muted md:flex">
          <Link href="/security" className="hover:text-oals-text">
            Security
          </Link>
          <Link href="/privacy" className="hover:text-oals-text">
            Privacy
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
          </Link>
          <Link href="/register">
            <Button size="sm">Create Investigation</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-oals-border mt-auto">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="font-[family-name:var(--font-space-grotesk)] font-semibold">
            OALS
          </p>
          <p className="mt-1 text-sm text-oals-dim">
            Online Authorised Location & Safeguarding
          </p>
        </div>
        <div className="flex gap-6 text-sm text-oals-muted">
          <Link href="/privacy" className="hover:text-oals-text">
            Privacy
          </Link>
          <Link href="/security" className="hover:text-oals-text">
            Security
          </Link>
          <Link href="/login" className="hover:text-oals-text">
            Sign In
          </Link>
        </div>
      </div>
      <div className="border-t border-oals-border/60 py-4 text-center text-xs text-oals-dim">
        Consent-based investigation platform. No covert tracking.
      </div>
    </footer>
  );
}
