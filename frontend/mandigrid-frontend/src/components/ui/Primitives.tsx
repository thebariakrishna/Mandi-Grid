import type { ReactNode } from "react";

export function SectionHeader({
  title,
  detail,
  action,
}: {
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-[15px] font-semibold text-ink">{title}</h2>
        {detail && <p className="mt-0.5 text-[13px] text-ink-soft">{detail}</p>}
      </div>
      {action}
    </div>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-md border border-line bg-panel p-4 ${className}`}>{children}</div>
  );
}

export interface Column<T> {
  key: string;
  header: string;
  align?: "left" | "right";
  render: (row: T) => ReactNode;
}

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
}: {
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
}) {
  return (
    <div className="scroll-thin overflow-x-auto rounded-md border border-line bg-panel">
      <table className="w-full min-w-[560px] border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-line bg-paper/60 text-left text-ink-soft">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-2.5 font-medium ${col.align === "right" ? "text-right" : "text-left"}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowKey(row)} className="border-b border-line/70 last:border-b-0 hover:bg-paper/50">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-4 py-2.5 text-ink ${col.align === "right" ? "text-right font-mono tabular-nums" : ""}`}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full max-w-xs rounded-sm border border-line bg-panel px-3 py-1.5 text-sm text-ink placeholder:text-ink-faint focus:border-grain-green"
    />
  );
}

export function StatusPill({ tone, children }: { tone: "alert" | "positive" | "neutral"; children: ReactNode }) {
  const toneClasses = {
    alert: "bg-grain-rustSoft text-grain-rust",
    positive: "bg-grain-goldSoft text-grain-greenDark",
    neutral: "bg-line/50 text-ink-soft",
  }[tone];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${toneClasses}`}>
      {children}
    </span>
  );
}
