import { Card } from "@/components/ui/card";

export default function Page() {
  return (
    <div className="space-y-4 p-6">
      <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-semibold">
        System Audit Logs
      </h1>
      <Card>
        <p className="text-sm text-oals-muted">
          Append-only administrative and security events. Use the audit API for
          paginated retrieval.
        </p>
      </Card>
    </div>
  );
}
