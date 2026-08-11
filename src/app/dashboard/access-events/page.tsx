import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { connectDb } from "@/lib/db/connection";
import { AccessEvent } from "@/models/AccessEvent";
import { Investigation } from "@/models/Investigation";
import { Card, Badge } from "@/components/ui/card";
import { format } from "date-fns";

export default async function AccessEventsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  await connectDb();

  const cases =
    session.user.role === "ADMIN"
      ? await Investigation.find().select("_id").lean()
      : await Investigation.find({ createdBy: session.user.id }).select("_id").lean();
  const ids = cases.map((c) => c._id);
  const events = await AccessEvent.find({ caseId: { $in: ids } })
    .sort({ timestamp: -1 })
    .limit(100)
    .lean();

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-semibold">
        Access Events
      </h1>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-oals-dim">
              <tr>
                <th className="pb-2">Event</th>
                <th className="pb-2">Consent</th>
                <th className="pb-2">Device</th>
                <th className="pb-2">Time</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e._id.toString()} className="border-t border-oals-border/60">
                  <td className="py-2">{e.eventType}</td>
                  <td className="py-2">
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
                  <td className="py-2 text-oals-muted">
                    {[e.browser, e.operatingSystem, e.deviceCategory]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </td>
                  <td className="py-2 text-oals-muted">
                    {e.timestamp
                      ? format(new Date(e.timestamp), "dd MMM yyyy HH:mm")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
