import Link from "next/link";
import { connectDb } from "@/lib/db/connection";
import { Investigation } from "@/models/Investigation";
import { InvestigationLink } from "@/models/InvestigationLink";
import { LocationEvent } from "@/models/LocationEvent";
import { auth } from "@/lib/auth";
import { Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable, PageHeader, Td } from "@/components/ui/table";
import { format } from "date-fns";
import { Plus } from "lucide-react";

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

  const ids = investigations.map((i) => i._id);
  const [links, locations] = await Promise.all([
    InvestigationLink.find({ caseId: { $in: ids } })
      .select("caseId status currentViews")
      .lean(),
    LocationEvent.find({
      caseId: { $in: ids },
      retentionExpiresAt: { $gt: new Date() },
    })
      .select("caseId")
      .lean(),
  ]);

  const linkCount = new Map<string, number>();
  const activeLinkCount = new Map<string, number>();
  for (const l of links) {
    const key = l.caseId.toString();
    linkCount.set(key, (linkCount.get(key) || 0) + 1);
    if (l.status === "ACTIVE") {
      activeLinkCount.set(key, (activeLinkCount.get(key) || 0) + 1);
    }
  }
  const locCount = new Map<string, number>();
  for (const loc of locations) {
    const key = loc.caseId.toString();
    locCount.set(key, (locCount.get(key) || 0) + 1);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Investigations"
        description="Open a case to upload evidence, generate links, and review captured location details in tables."
        actions={
          <Link href="/dashboard/investigations/new">
            <Button>
              <Plus className="h-4 w-4" />
              New investigation
            </Button>
          </Link>
        }
      />

      <div className="overflow-hidden rounded-xl border border-oals-border bg-oals-surface shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <DataTable
          columns={[
            "Case ref",
            "Title",
            "Type",
            "Priority",
            "Status",
            "Links",
            "Locations",
            "Created",
          ]}
          empty="No investigations yet. Create one to start capturing."
          minWidth="960px"
        >
          {investigations.map((inv) => {
            const id = inv._id.toString();
            return (
              <tr key={id} className="hover:bg-slate-50/80">
                <Td mono>
                  <Link
                    href={`/dashboard/investigations/${id}`}
                    className="text-oals-accent hover:underline"
                  >
                    {inv.caseReference}
                  </Link>
                </Td>
                <Td>
                  <Link
                    href={`/dashboard/investigations/${id}`}
                    className="font-medium hover:text-oals-accent"
                  >
                    {inv.title}
                  </Link>
                </Td>
                <Td className="text-oals-muted">
                  {inv.investigationType.replaceAll("_", " ")}
                </Td>
                <Td>
                  <Badge
                    tone={
                      inv.priority === "CRITICAL" || inv.priority === "HIGH"
                        ? "warning"
                        : "neutral"
                    }
                  >
                    {inv.priority}
                  </Badge>
                </Td>
                <Td>
                  <Badge tone="info">{inv.status}</Badge>
                </Td>
                <Td>
                  {activeLinkCount.get(id) || 0}
                  <span className="text-oals-dim">
                    /{linkCount.get(id) || 0}
                  </span>
                </Td>
                <Td>{locCount.get(id) || 0}</Td>
                <Td className="whitespace-nowrap text-oals-muted">
                  {format(new Date(inv.createdAt), "dd MMM yyyy")}
                </Td>
              </tr>
            );
          })}
        </DataTable>
      </div>
    </div>
  );
}
