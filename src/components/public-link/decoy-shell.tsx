import type { ReactNode } from "react";

const NAV = [
  { label: "Home", href: "#" },
  { label: "Stories", href: "#" },
  { label: "About", href: "#" },
  { label: "Contact", href: "#" },
] as const;

export function DecoyShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f4f5f7] text-slate-900">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 90% 55% at 12% -10%, rgba(15, 23, 42, 0.05), transparent 55%), radial-gradient(ellipse 70% 45% at 100% 0%, rgba(14, 116, 144, 0.06), transparent 50%), linear-gradient(180deg, #f8f9fb 0%, #f1f3f6 100%)",
        }}
      />

      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:h-16 sm:px-6">
          <a
            href="#"
            className="font-[family-name:var(--font-space-grotesk)] text-lg font-semibold tracking-tight text-slate-900"
          >
            Northline
          </a>
          <nav className="hidden items-center gap-6 text-sm text-slate-500 sm:flex">
            {NAV.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="transition-colors hover:text-slate-900"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <a
            href="#contact"
            className="text-sm text-slate-500 transition-colors hover:text-slate-900 sm:hidden"
          >
            Contact
          </a>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-12">
        {children}
      </main>

      <footer className="border-t border-slate-200/80 bg-white/60">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} Northline Media</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-slate-600">
              Terms
            </a>
            <a href="#" className="hover:text-slate-600">
              Privacy
            </a>
            <a href="#" className="hover:text-slate-600">
              Help
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function DecoyError({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="mx-auto max-w-md flex-1 content-center py-16 text-center animate-fade-up">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
        Northline
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-space-grotesk)] text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
        {title}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-500">{text}</p>
    </div>
  );
}
