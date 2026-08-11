import Link from "next/link";
import { connectDb } from "@/lib/db/connection";
import { Investigation } from "@/models/Investigation";
import { InvestigationLink } from "@/models/InvestigationLink";
import { auth } from "@/lib/auth";
import { Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable, PageHeader, Td } from "@/components/ui/table";
import { format } from "date-fns";

export default async function LinksPage() {
  const session = await auth();
  await connectDb();

  const caseFilter =
    session?.user?.role === "ADMIN"
      ? {}
      : { createdBy: session?.user?.id };

  const cases = await Investigation.find(caseFilter)
    .select("_id caseReference title")
    .lean();
  const caseIds = cases.map((c) => c._id);
  const caseMap = new Map(
    cases.map((c) => [
      c._id.toString(),
      { ref: c.caseReference, title: c.title },
    ]),
  );

  const links = await InvestigationLink.find({ caseId: { $in: caseIds } })
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Links"
        description="All protected links across your investigations. Copy or open a case to manage them."
        actions={
          <Link href="/dashboard/investigations/new">
            <Button>Create link</Button>
          </Link>
        }
      />

      <div className="overflow-hidden rounded-xl border border-oals-border bg-oals-surface shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <DataTable
          columns={[
            "Short code",
            "Case",
            "Status",
            "Views",
            "Location",
            "Expires",
            "Last access",
          ]}
          empty="No links yet. Create an investigation to generate one."
          minWidth="960px"
        >
          {links.map((link) => {
            const caseInfo = caseMap.get(link.caseId.toString());
            return (
              <tr key={link._id.toString()} className="hover:bg-slate-50/80">
                <Td mono>
                  <Link
                    href={`/dashboard/investigations/${link.caseId.toString()}`}
                    className="text-oals-accent hover:underline"
                  >
                    {link.shortCode}
                  </Link>
                </Td>
                <Td>
                  {caseInfo ? (
                    <div>
                      <p className="font-mono text-xs text-oals-dim">
                        {caseInfo.ref}
                      </p>
                      <p className="text-sm">{caseInfo.title}</p>
                    </div>
                  ) : (
                    "—"
                  )}
                </Td>
                <Td>
                  <Badge
                    tone={
                      link.status === "ACTIVE" || link.status === "MAX_VIEWS"
                        ? "success"
                        : link.status === "REVOKED"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {link.status === "MAX_VIEWS" ? "ACTIVE" : link.status}
                  </Badge>
                </Td>
                <Td>{link.currentViews}</Td>
                <Td className="text-oals-muted">
                  {link.locationRequired ? "Required" : "Optional"}
                </Td>
                <Td className="whitespace-nowrap text-oals-muted">
                  {format(new Date(link.expiresAt), "dd MMM yyyy HH:mm")}
                </Td>
                <Td className="whitespace-nowrap text-oals-muted">
                  {link.lastAccessAt
                    ? format(new Date(link.lastAccessAt), "dd MMM yyyy HH:mm")
                    : "—"}
                </Td>
              </tr>
            );
          })}
        </DataTable>
      </div>
    </div>
  );
}
