import type { ReactNode } from "react";
import { Sidebar, MobileNav } from "./Sidebar";
import { GlobalFilterBar } from "./GlobalFilterBar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-paper text-ink">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav />
        <main className="mx-auto w-full max-w-[1180px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, showFilters = true }: { title: string; subtitle?: string; showFilters?: boolean }) {
  return (
    <div className="mb-6">
      <h1 className="font-display text-xl font-semibold text-ink">{title}</h1>
      {subtitle && <p className="mt-1 mb-4 text-sm text-ink-soft">{subtitle}</p>}
      {showFilters && <GlobalFilterBar />}
    </div>
  );
}
