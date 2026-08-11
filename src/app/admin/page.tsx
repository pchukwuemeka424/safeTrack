import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Card } from "@/components/ui/card";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const links = [
    { href: "/admin/users", title: "Users", desc: "Activate, deactivate, assign roles" },
    { href: "/admin/investigations", title: "Investigations", desc: "Cross-tenant case oversight" },
    { href: "/admin/audit-logs", title: "Audit Logs", desc: "Append-only security events" },
    { href: "/admin/retention", title: "Retention", desc: "Configure location data retention" },
    { href: "/admin/security", title: "Security", desc: "Security posture overview" },
    { href: "/admin/settings", title: "Settings", desc: "System configuration" },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-semibold">
          Admin
        </h1>
        <p className="mt-1 text-sm text-oals-muted">
          System administration and governance controls.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((l) => (
          <Link key={l.href} href={l.href}>
            <Card className="h-full transition-colors hover:border-oals-accent/40">
              <h2 className="font-semibold">{l.title}</h2>
              <p className="mt-2 text-sm text-oals-muted">{l.desc}</p>
            </Card>
          </Link>
        ))}
      </div>
      <Link href="/dashboard" className="text-sm text-oals-accent hover:underline">
        ← Back to dashboard
      </Link>
    </div>
  );
}
