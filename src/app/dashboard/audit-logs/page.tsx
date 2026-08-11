import { Card } from "@/components/ui/card";

export default function Page() {
  return (
    <div className="space-y-4">
      <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-semibold">
        Audit Logs
      </h1>
      <Card>
        <p className="text-sm text-oals-muted">
          Security-relevant actions. Full organisational audit access is available
          to administrators.
        </p>
      </Card>
    </div>
  );
}
