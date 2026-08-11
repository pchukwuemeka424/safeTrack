import { connectDb } from "@/lib/db/connection";
import { User } from "@/models/User";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/layout/logo";
import Link from "next/link";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  let ok = false;

  if (token) {
    try {
      await connectDb();
      const user = await User.findOne({
        emailVerificationToken: token,
        emailVerificationExpires: { $gt: new Date() },
      });
      if (user) {
        user.emailVerified = true;
        user.emailVerificationToken = null;
        user.emailVerificationExpires = null;
        await user.save();
        ok = true;
      }
    } catch {
      ok = false;
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center oals-grid-bg px-4">
      <div className="mb-8">
        <Logo />
      </div>
      <Card className="w-full max-w-md text-center">
        <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-semibold">
          {ok ? "Email verified" : "Verification unavailable"}
        </h1>
        <p className="mt-3 text-sm text-oals-muted">
          {ok
            ? "Your account email has been verified. You can sign in."
            : "This verification link is invalid or has expired."}
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm text-oals-accent hover:underline"
        >
          Sign in
        </Link>
      </Card>
    </div>
  );
}
