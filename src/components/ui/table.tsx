import { cn } from "@/lib/utils/cn";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-semibold tracking-tight text-oals-text">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-oals-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-oals-border bg-oals-surface shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-oals-border px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h2 className="font-[family-name:var(--font-space-grotesk)] text-base font-semibold text-oals-text">
            {title}
          </h2>
          {description ? (
            <p className="mt-0.5 text-xs text-oals-dim">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      <div className="p-0">{children}</div>
    </section>
  );
}

export function DataTable({
  columns,
  empty = "No records yet.",
  children,
  minWidth = "720px",
}: {
  columns: string[];
  empty?: string;
  children: React.ReactNode;
  minWidth?: string;
}) {
  const childList = Array.isArray(children)
    ? children
    : children == null || children === false
      ? []
      : [children];
  const hasRows = childList.some((child) => child != null && child !== false);

  return (
    <div className="overflow-x-auto">
      <table
        className="w-full text-left text-sm"
        style={{ minWidth }}
      >
        <thead>
          <tr className="border-b border-oals-border bg-slate-50/80">
            {columns.map((col) => (
              <th
                key={col}
                className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-oals-dim sm:px-5"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-oals-border/70">
          {hasRows ? (
            children
          ) : (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-10 text-center text-sm text-oals-dim sm:px-5"
              >
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Td({
  children,
  className,
  mono,
}: {
  children: React.ReactNode;
  className?: string;
  mono?: boolean;
}) {
  return (
    <td
      className={cn(
        "px-4 py-3 align-top text-oals-text sm:px-5",
        mono && "font-mono text-xs text-oals-muted",
        className,
      )}
    >
      {children}
    </td>
  );
}

export function StatPill({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-oals-border bg-oals-surface px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-oals-dim">
        {label}
      </p>
      <p className="mt-1 font-[family-name:var(--font-space-grotesk)] text-2xl font-semibold tabular-nums">
        {value}
      </p>
    </div>
  );
}
