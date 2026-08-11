import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { SessionProvider } from "@/components/auth/session-provider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <SessionProvider>
      <div className="flex min-h-screen bg-oals-bg">
        <div className="hidden md:block">
          <DashboardSidebar
            role={session.user.role}
            name={session.user.name || undefined}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 items-center border-b border-oals-border px-4 md:hidden">
            <span className="font-[family-name:var(--font-space-grotesk)] font-semibold">
              OALS
            </span>
          </header>
          <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </SessionProvider>
  );
}
