import { Card } from "@/components/ui/card";

export default function Page() {
  return (
    <div className="space-y-4">
      <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-semibold">
        Evidence
      </h1>
      <Card>
        <p className="text-sm text-oals-muted">
          Uploaded images and evidence artefacts for your cases.
        </p>
      </Card>
    </div>
  );
}
