import Link from "next/link";
import { connectDb } from "@/lib/db/connection";
import { Investigation } from "@/models/Investigation";
import { InvestigationLink } from "@/models/InvestigationLink";
import { AccessEvent } from "@/models/AccessEvent";
import { auth } from "@/lib/auth";
import { Card, Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

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
      .limit(10)
      .populate("caseId", "caseReference title")
      .populate("linkId", "shortCode")
      .lean(),
  ]);

  const cards = [
    { label: "Total Investigations", value: totalInvestigations },
    { label: "Active Links", value: activeLinks },
    { label: "Links Accessed", value: linksAccessed },
    { label: "Location Consents", value: locationConsents },
    { label: "Pending Reviews", value: pendingReviews },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-semibold">
            Overview
          </h1>
          <p className="mt-1 text-sm text-oals-muted">
            Consent-based investigation activity at a glance.
          </p>
        </div>
        <Link href="/dashboard/investigations/new">
          <Button>New Investigation</Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((c) => (
          <Card key={c.label}>
            <p className="text-xs uppercase tracking-wider text-oals-dim">
              {c.label}
            </p>
            <p className="mt-2 font-[family-name:var(--font-space-grotesk)] text-3xl font-semibold">
              {c.value}
            </p>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="font-[family-name:var(--font-space-grotesk)] text-lg font-semibold">
          Recent Activity
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-oals-border text-oals-dim">
              <tr>
                <th className="pb-3 font-medium">Case</th>
                <th className="pb-3 font-medium">Link</th>
                <th className="pb-3 font-medium">Event</th>
                <th className="pb-3 font-medium">Location</th>
                <th className="pb-3 font-medium">Timestamp</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentEvents.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-oals-dim">
                    No access events yet.
                  </td>
                </tr>
              )}
              {recentEvents.map((e) => {
                const caseRef = e.caseId as unknown as {
                  caseReference?: string;
                } | null;
                const link = e.linkId as unknown as { shortCode?: string } | null;
                return (
                  <tr key={e._id.toString()} className="border-b border-oals-border/60">
                    <td className="py-3">{caseRef?.caseReference || "—"}</td>
                    <td className="py-3 font-mono text-xs">
                      {link?.shortCode || "—"}
                    </td>
                    <td className="py-3">{e.eventType}</td>
                    <td className="py-3">
                      {e.consentStatus === "GRANTED"
                        ? e.accuracy != null
                          ? `±${Math.round(e.accuracy)}m`
                          : "Granted"
                        : "—"}
                    </td>
                    <td className="py-3 text-oals-muted">
                      {e.timestamp
                        ? format(new Date(e.timestamp), "dd MMM yyyy HH:mm")
                        : "—"}
                    </td>
                    <td className="py-3">
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
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
