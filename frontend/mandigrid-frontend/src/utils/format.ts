const qtlFormatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const rupeeFormatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const oneDecimalFormatter = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const percentFormatter = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function formatQtl(value: number): string {
  return `${qtlFormatter.format(value)} qtl`;
}

export function formatNumber(value: number): string {
  return qtlFormatter.format(value);
}

export function formatRupee(value: number): string {
  return `\u20B9${rupeeFormatter.format(value)}`;
}

export function formatOneDecimal(value: number): string {
  return oneDecimalFormatter.format(value);
}

export function formatPercent(value: number): string {
  return `${percentFormatter.format(value)}%`;
}

export function formatHours(value: number): string {
  return `${oneDecimalFormatter.format(value)}h`;
}

export function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}
