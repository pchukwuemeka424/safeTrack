import {
  MarketingFooter,
  MarketingHeader,
} from "@/components/layout/marketing";

export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />
      <main className="mx-auto max-w-3xl flex-1 px-4 py-16 sm:px-6">
        <h1 className="font-[family-name:var(--font-space-grotesk)] text-3xl font-semibold">
          Privacy
        </h1>
        <p className="mt-4 text-oals-muted leading-relaxed">
          OALS is a consent-based investigation and safeguarding platform. We
          collect only the information necessary to operate authorised cases.
        </p>

        <section className="mt-10 space-y-3">
          <h2 className="text-xl font-semibold">What information is collected</h2>
          <ul className="list-disc space-y-2 pl-5 text-oals-muted">
            <li>Account details for authorised users (name, email, role).</li>
            <li>Investigation metadata created by investigators.</li>
            <li>Uploaded images stored in private object storage.</li>
            <li>
              Location coordinates and accuracy — only after you explicitly allow
              the browser Geolocation permission on a protected link.
            </li>
            <li>
              Limited request metadata for security and audit (hashed IP where
              configured, user agent category).
            </li>
          </ul>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-xl font-semibold">When location is collected</h2>
          <p className="text-oals-muted leading-relaxed">
            Location is never collected automatically on page load. It is
            requested only after you click &quot;Allow Location &amp; View&quot;
            and grant the browser&apos;s native permission prompt. If you deny
            permission, we do not attempt to bypass it or repeatedly prompt.
          </p>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-xl font-semibold">How long it is retained</h2>
          <p className="text-oals-muted leading-relaxed">
            Location events are retained according to configurable retention
            periods (default 7 days; options include 30 or 90 days). Expired
            location records are securely deleted.
          </p>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-xl font-semibold">Who can access it</h2>
          <p className="text-oals-muted leading-relaxed">
            Only authenticated users with appropriate roles (investigator who
            owns the case, assigned reviewers, or administrators) can view
            consented location events inside the secure dashboard. Location data
            is not public and is not sent to advertising or analytics platforms.
          </p>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-xl font-semibold">Deletion and contact</h2>
          <p className="text-oals-muted leading-relaxed">
            Authorised administrators can configure retention and delete case
            data according to organisational policy. Contact your organisation
            administrator or email privacy@mylos.cyou for privacy requests.
          </p>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-xl font-semibold">What we do not do</h2>
          <ul className="list-disc space-y-2 pl-5 text-oals-muted">
            <li>Secret GPS collection</li>
            <li>Camera or microphone activation without permission</li>
            <li>Covert device fingerprinting for tracking</li>
            <li>Continuous background location tracking</li>
            <li>Public searchable person databases</li>
          </ul>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
