interface KpiCardProps {
  label: string;
  value: string;
  detail?: string;
  tone?: "default" | "alert" | "positive";
}

const toneClasses: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  default: "text-ink",
  alert: "text-grain-rust",
  positive: "text-grain-green",
};

export function KpiCard({ label, value, detail, tone = "default" }: KpiCardProps) {
  return (
    <div className="min-w-[160px] flex-1 border-r border-line px-5 py-4 last:border-r-0">
      <p className="text-[13px] text-ink-soft">{label}</p>
      <p className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${toneClasses[tone]}`}>
        {value}
      </p>
      {detail && <p className="mt-1 text-xs text-ink-faint">{detail}</p>}
    </div>
  );
}

export function KpiStrip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap rounded-md border border-line bg-panel">
      {children}
    </div>
  );
}
