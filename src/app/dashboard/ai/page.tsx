import { Card } from "@/components/ui/card";

export default function Page() {
  return (
    <div className="space-y-4">
      <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-semibold">
        AI Assist
      </h1>
      <Card className="space-y-3">
        <p className="text-sm text-oals-muted">
          Optional investigation aids for metadata patterns, duplicate detection,
          and prioritisation signals.
        </p>
        <p className="text-sm text-oals-warning">
          AI-generated analysis is an investigative aid and must not be treated as
          proof of criminal activity. Human review is required.
        </p>
      </Card>
    </div>
  );
}
