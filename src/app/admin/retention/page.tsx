import { Card } from "@/components/ui/card";
import Link from "next/link";

export default function Page() {
  return (
    <div className="space-y-4 p-6">
      <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-semibold">
        Retention
      </h1>
      <Card className="space-y-3">
        <p className="text-sm text-oals-muted">
          Configure default retention for consented location data. Default is the
          shortest practical period (7 days). Options: 7, 30, 90 days.
        </p>
        <Link href="/admin/settings" className="text-sm text-oals-accent hover:underline">
          Open retention settings →
        </Link>
      </Card>
    </div>
  );
}
