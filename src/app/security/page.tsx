import {
  MarketingFooter,
  MarketingHeader,
} from "@/components/layout/marketing";

export const metadata = { title: "Security" };

export default function SecurityPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />
      <main className="mx-auto max-w-3xl flex-1 px-4 py-16 sm:px-6">
        <h1 className="font-[family-name:var(--font-space-grotesk)] text-3xl font-semibold">
          Security
        </h1>
        <p className="mt-4 text-oals-muted leading-relaxed">
          OALS is designed with privacy-by-design and enterprise safeguarding
          controls.
        </p>

        <div className="mt-10 space-y-8 text-oals-muted leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-oals-text">Encryption</h2>
            <p className="mt-2">
              Transport uses HTTPS. Sensitive location coordinates are encrypted
              at rest. Signed, short-lived tokens control image access.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-oals-text">Access control</h2>
            <p className="mt-2">
              Role-based access control (ADMIN, INVESTIGATOR, REVIEWER) is
              enforced server-side. Dashboard APIs require authentication and
              authorisation.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-oals-text">Audit logs</h2>
            <p className="mt-2">
              Critical actions — login, case creation, uploads, link creation,
              consent events, and role changes — are recorded in append-only
              audit logs.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-oals-text">Secure storage</h2>
            <p className="mt-2">
              Original images are stored privately. Public link pages receive
              only blurred previews until consent and authorisation succeed.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-oals-text">
              Data minimisation & retention
            </h2>
            <p className="mt-2">
              We collect the minimum metadata required for security and case
              integrity. Location retention defaults to the shortest practical
              period and is configurable by administrators.
            </p>
          </section>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
