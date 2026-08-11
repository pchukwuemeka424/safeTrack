import Link from "next/link";
import { connectDb } from "@/lib/db/connection";
import { Investigation } from "@/models/Investigation";
import { InvestigationLink } from "@/models/InvestigationLink";
import { AccessEvent } from "@/models/AccessEvent";
import { LocationEvent } from "@/models/LocationEvent";
import { auth } from "@/lib/auth";
import { Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  PageHeader,
  SectionCard,
  StatPill,
  Td,
} from "@/components/ui/table";
import { decrypt } from "@/lib/security/encryption";
import { format } from "date-fns";

function safeDecryptAddress(value?: string | null): string | null {
  if (!value) return null;
  try {
    return decrypt(value);
  } catch {
    return null;
  }
}

export default async function DashboardPage() {
  const session = await auth();
  await connectDb();

  const userId = session?.user?.id;
  const role = session?.user?.role;
  const caseFilter =
    role === "ADMIN" ? {} : { createdBy: userId };

  const cases = await Investigation.find(caseFilter).select("_id").lean();
  const caseIds = cases.map((c) => c._id);

  const [
    totalInvestigations,
    activeLinks,
    linksAccessed,
    locationConsents,
    pendingReviews,
    recentEvents,
  ] = await Promise.all([
    Investigation.countDocuments(caseFilter),
    InvestigationLink.countDocuments({
      status: "ACTIVE",
      ...(role === "ADMIN" ? {} : { createdBy: userId }),
    }),
    AccessEvent.countDocuments({ caseId: { $in: caseIds } }),
    AccessEvent.countDocuments({
      caseId: { $in: caseIds },
      consentStatus: "GRANTED",
    }),
    Investigation.countDocuments({
      ...caseFilter,
      "aiAnalysis.humanReviewStatus": "PENDING_REVIEW",
    }),
    AccessEvent.find({ caseId: { $in: caseIds } })
      .sort({ timestamp: -1 })
      .limit(15)
      .populate("caseId", "caseReference title")
      .populate("linkId", "shortCode")
      .lean(),
  ]);

  const locations = await LocationEvent.find({
    accessEventId: { $in: recentEvents.map((e) => e._id) },
  })
    .select("accessEventId encryptedAddress")
    .lean();
  const addressByEvent = new Map<string, string>();
  for (const loc of locations) {
    if (!loc.accessEventId) continue;
    const addr = safeDecryptAddress(loc.encryptedAddress);
    if (addr) addressByEvent.set(loc.accessEventId.toString(), addr);
  }
  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="Track investigations, consents, and recent access activity in one place."
        actions={
          <Link href="/dashboard/investigations/new">
            <Button>New investigation</Button>
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatPill label="Investigations" value={totalInvestigations} />
        <StatPill label="Active links" value={activeLinks} />
        <StatPill label="Access events" value={linksAccessed} />
        <StatPill label="Location consents" value={locationConsents} />
        <StatPill label="Pending reviews" value={pendingReviews} />
      </div>

      <SectionCard
        title="Recent activity"
        description="Latest opens and consent decisions across your cases."
        actions={
          <Link
            href="/dashboard/access-events"
            className="text-sm text-oals-accent hover:underline"
          >
            View all
          </Link>
        }
      >
        <DataTable
          columns={[
            "Case",
            "Link",
            "Event",
            "Consent",
            "Device",
            "Address",
            "Time",
          ]}
          empty="No access events yet. Create a link and share it to start capturing."
          minWidth="880px"
        >
          {recentEvents.map((e) => {
            const caseRef = e.caseId as unknown as {
              _id?: { toString(): string };
              caseReference?: string;
              title?: string;
            } | null;
            const link = e.linkId as unknown as { shortCode?: string } | null;
            return (
              <tr key={e._id.toString()} className="hover:bg-slate-50/80">
                <Td>
                  {caseRef?.caseReference ? (
                    <Link
                      href={`/dashboard/investigations/${caseRef._id?.toString() || ""}`}
                      className="font-mono text-xs text-oals-accent hover:underline"
                    >
                      {caseRef.caseReference}
                    </Link>
                  ) : (
                    "—"
                  )}
                </Td>
                <Td mono>{link?.shortCode || "—"}</Td>
                <Td>{e.eventType.replaceAll("_", " ")}</Td>
                <Td>
                  <Badge
                    tone={
                      e.consentStatus === "GRANTED"
                        ? "success"
                        : e.consentStatus === "DENIED"
                          ? "danger"
                          : "neutral"
                    }
                  >
                    {e.consentStatus}
                  </Badge>
                </Td>
                <Td className="text-oals-muted">
                  {e.deviceCategory || e.browser || "—"}
                </Td>
                <Td className="max-w-[240px] text-oals-muted">
                  {addressByEvent.get(e._id.toString()) ||
                    safeDecryptAddress(
                      (e as { encryptedAddress?: string | null })
                        .encryptedAddress,
                    ) ||
                    e.approximateIpLocation ||
                    [e.city, e.country].filter(Boolean).join(", ") ||
                    "—"}
                </Td>
                <Td className="whitespace-nowrap text-oals-muted">
                  {e.timestamp
                    ? format(new Date(e.timestamp), "dd MMM yyyy HH:mm")
                    : "—"}
                </Td>
              </tr>
            );
          })}
        </DataTable>
      </SectionCard>
    </div>
  );
}
