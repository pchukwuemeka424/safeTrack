import { Card } from "@/components/ui/card";

function Stub({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-4">
      <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-semibold">
        {title}
      </h1>
      <Card>
        <p className="text-sm text-oals-muted">{description}</p>
      </Card>
    </div>
  );
}

export default function Page() {
  return (
    <Stub
      title="Links"
      description="All protected links across your investigations. Open a case to create, copy, revoke, or expire links."
    />
  );
}
