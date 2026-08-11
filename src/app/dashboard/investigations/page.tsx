import Link from "next/link";
import { connectDb } from "@/lib/db/connection";
import { Investigation } from "@/models/Investigation";
import { auth } from "@/lib/auth";
import { Card, Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export default async function InvestigationsPage() {
  const session = await auth();
  await connectDb();
  const filter =
    session?.user?.role === "ADMIN"
      ? {}
      : { createdBy: session?.user?.id };

  const investigations = await Investigation.find(filter)
    .sort({ createdAt: -1 })
    .lean();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-semibold">
            Investigations
          </h1>
          <p className="mt-1 text-sm text-oals-muted">
            Manage cases and protected evidence links.
          </p>
        </div>
        <Link href="/dashboard/investigations/new">
          <Button>New Investigation</Button>
        </Link>
      </div>

      <div className="space-y-3">
        {investigations.length === 0 && (
          <Card>
            <p className="text-oals-dim">No investigations yet.</p>
          </Card>
        )}
        {investigations.map((inv) => (
          <Link
            key={inv._id.toString()}
            href={`/dashboard/investigations/${inv._id.toString()}`}
            className="block"
          >
            <Card className="transition-colors hover:border-oals-accent/40">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs text-oals-accent">
                    {inv.caseReference}
                  </p>
                  <h2 className="mt-1 font-semibold">{inv.title}</h2>
                  <p className="mt-1 text-sm text-oals-muted">
                    {inv.investigationType.replaceAll("_", " ")} · Created{" "}
                    {format(new Date(inv.createdAt), "dd MMM yyyy")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge
                    tone={
                      inv.priority === "CRITICAL" || inv.priority === "HIGH"
                        ? "warning"
                        : "neutral"
                    }
                  >
                    {inv.priority}
                  </Badge>
                  <Badge tone="info">{inv.status}</Badge>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
