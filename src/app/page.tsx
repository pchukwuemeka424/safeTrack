import Link from "next/link";
import {
  MarketingFooter,
  MarketingHeader,
} from "@/components/layout/marketing";
import { Button } from "@/components/ui/button";
import { Lock, MapPin, ShieldCheck, Link2 } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col oals-grid-bg oals-radial">
      <MarketingHeader />
      <main className="flex-1">
        <section className="mx-auto flex max-w-6xl flex-col items-start px-4 pb-24 pt-20 sm:px-6 lg:pt-28">
          <p className="animate-fade-up font-[family-name:var(--font-space-grotesk)] text-sm font-medium tracking-[0.2em] text-oals-accent">
            OALS
          </p>
          <h1 className="animate-fade-up mt-4 max-w-3xl font-[family-name:var(--font-space-grotesk)] text-4xl font-semibold leading-tight tracking-tight text-oals-text sm:text-5xl lg:text-6xl">
            Secure Investigation.
            <br />
            Consent-Based Intelligence.
          </h1>
          <p className="animate-fade-up mt-6 max-w-2xl text-lg text-oals-muted leading-relaxed">
            Create controlled evidence links, collect consent-based location
            information, and manage investigation events from one secure
            platform.
          </p>
          <div className="animate-fade-up mt-10 flex flex-wrap gap-3">
            <Link href="/register">
              <Button size="lg">Create Investigation</Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="secondary">
                Sign In
              </Button>
            </Link>
          </div>
          <p className="mt-8 max-w-xl text-sm text-oals-dim">
            Location is collected only after the recipient explicitly grants
            the browser&apos;s native permission. OALS does not secretly track
            people.
          </p>
        </section>

        <section className="border-t border-oals-border bg-oals-surface">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-20 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Link2,
                title: "Protected Links",
                text: "Generate unique subdomain links that reveal images only after authorised consent.",
              },
              {
                icon: MapPin,
                title: "Consent-Based Location",
                text: "One-time Geolocation API capture — never continuous tracking or permission bypass.",
              },
              {
                icon: Lock,
                title: "Encrypted Evidence",
                text: "Coordinates encrypted at rest, private storage, signed image access, audit trails.",
              },
              {
                icon: ShieldCheck,
                title: "Human Review",
                text: "AI provides indicators only. Operational decisions require authorised human review.",
              },
            ].map((item) => (
              <div key={item.title} className="space-y-3">
                <item.icon className="h-6 w-6 text-oals-accent" />
                <h2 className="font-[family-name:var(--font-space-grotesk)] text-lg font-semibold">
                  {item.title}
                </h2>
                <p className="text-sm text-oals-muted leading-relaxed">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
