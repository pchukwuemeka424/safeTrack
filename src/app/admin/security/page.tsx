import { Card } from "@/components/ui/card";

export default function Page() {
  return (
    <div className="space-y-4 p-6">
      <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-semibold">
        Security Controls
      </h1>
      <Card>
        <ul className="list-disc space-y-2 pl-5 text-sm text-oals-muted">
          <li>HTTPS / HSTS in production</li>
          <li>CSP, Permissions-Policy, Referrer-Policy</li>
          <li>RBAC enforced server-side</li>
          <li>Encrypted location at rest</li>
          <li>Rate limiting on auth and public endpoints</li>
          <li>Generic responses for invalid short codes</li>
        </ul>
      </Card>
    </div>
  );
}
