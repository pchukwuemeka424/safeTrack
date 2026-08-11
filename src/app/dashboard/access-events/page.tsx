import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { connectDb } from "@/lib/db/connection";
import { AccessEvent } from "@/models/AccessEvent";
import { LocationEvent } from "@/models/LocationEvent";
import { Investigation } from "@/models/Investigation";
import { Badge } from "@/components/ui/card";
import { DataTable, PageHeader, Td } from "@/components/ui/table";
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

export default async function AccessEventsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  await connectDb();

  const cases =
    session.user.role === "ADMIN"
      ? await Investigation.find().select("_id caseReference title").lean()
      : await Investigation.find({ createdBy: session.user.id })
          .select("_id caseReference title")
          .lean();
  const ids = cases.map((c) => c._id);
  const caseMap = new Map(
    cases.map((c) => [
      c._id.toString(),
      { ref: c.caseReference, title: c.title },
    ]),
  );

  const events = await AccessEvent.find({ caseId: { $in: ids } })
    .sort({ timestamp: -1 })
    .limit(200)
    .populate("linkId", "shortCode")
    .lean();

  const eventIds = events.map((e) => e._id);
  const locations = await LocationEvent.find({
    accessEventId: { $in: eventIds },
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
        title="Access events"
        description="Full log of link opens, consent grants, denials, and device details."
      />

      <div className="overflow-hidden rounded-xl border border-oals-border bg-oals-surface shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <DataTable
          columns={[
            "Time",
            "Case",
            "Link",
            "Event",
            "Consent",
            "Device",
            "Browser / OS",
            "Address",
            "Accuracy",
          ]}
          empty="No access events yet."
          minWidth="1100px"
        >
          {events.map((e) => {
            const caseInfo = caseMap.get(e.caseId.toString());
            const link = e.linkId as unknown as { shortCode?: string } | null;
            const address =
              safeDecryptAddress(
                (e as { encryptedAddress?: string | null }).encryptedAddress,
              ) ||
              addressByEvent.get(e._id.toString()) ||
              e.approximateIpLocation ||
              [e.city, e.country].filter(Boolean).join(", ") ||
              null;
            return (
              <tr key={e._id.toString()} className="hover:bg-slate-50/80">
                <Td className="whitespace-nowrap text-oals-muted">
                  {e.timestamp
                    ? format(new Date(e.timestamp), "dd MMM yyyy HH:mm")
                    : "—"}
                </Td>
                <Td>
                  {caseInfo ? (
                    <Link
                      href={`/dashboard/investigations/${e.caseId.toString()}`}
                      className="font-mono text-xs text-oals-accent hover:underline"
                    >
                      {caseInfo.ref}
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
                <Td className="text-oals-muted">{e.deviceCategory || "—"}</Td>
                <Td className="text-oals-muted">
                  {[e.browser, e.operatingSystem].filter(Boolean).join(" · ") ||
                    "—"}
                </Td>
                <Td className="max-w-[260px]">{address || "—"}</Td>
                <Td>
                  {e.accuracy != null ? `±${Math.round(e.accuracy)}m` : "—"}
                </Td>
              </tr>
            );
          })}
        </DataTable>
      </div>
    </div>
  );
}
