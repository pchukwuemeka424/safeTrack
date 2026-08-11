import { auth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { redirect } from "next/navigation";

export default async function Page() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="space-y-4">
      <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-semibold">
        Profile
      </h1>
      <Card className="space-y-2">
        <p className="text-sm">
          <span className="text-oals-dim">Name:</span> {session.user.name}
        </p>
        <p className="text-sm">
          <span className="text-oals-dim">Email:</span> {session.user.email}
        </p>
        <p className="text-sm">
          <span className="text-oals-dim">Role:</span> {session.user.role}
        </p>
        <p className="text-sm text-oals-muted">
          MFA architecture is ready (TOTP secret field present). Enable MFA from
          organisational policy when required.
        </p>
      </Card>
    </div>
  );
}
