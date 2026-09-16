export function LoadingState({ label = "Loading analytics" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-line bg-panel px-4 py-6 text-sm text-ink-soft" role="status">
      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-grain-green border-t-transparent" />
      {label}…
    </div>
  );
}

export function EmptyState({
  title = "Nothing to show yet",
  detail,
}: {
  title?: string;
  detail?: string;
}) {
  return (
    <div className="rounded-md border border-dashed border-line bg-panel/60 px-4 py-6 text-sm">
      <p className="font-medium text-ink">{title}</p>
      {detail && <p className="mt-1 text-ink-soft">{detail}</p>}
    </div>
  );
}

export function ErrorState({ message = "Data unavailable" }: { message?: string }) {
  return (
    <div className="rounded-md border border-grain-rust/40 bg-grain-rustSoft/40 px-4 py-6 text-sm text-grain-rust" role="alert">
      <p className="font-medium">Data unavailable</p>
      <p className="mt-1 text-ink-soft">{message}</p>
    </div>
  );
}
