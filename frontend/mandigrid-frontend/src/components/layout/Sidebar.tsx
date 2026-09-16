import { NavLink } from "react-router-dom";
import { IconOverview, IconPrice, IconLogistics, IconWeather, IconMandi, IconAsk } from "./icons";

const NAV_ITEMS = [
  { to: "/", label: "Overview", icon: IconOverview, end: true },
  { to: "/prices", label: "Prices & MSP", icon: IconPrice, end: false },
  { to: "/logistics", label: "Logistics", icon: IconLogistics, end: false },
  { to: "/weather", label: "Weather", icon: IconWeather, end: false },
  { to: "/mandis", label: "Mandis", icon: IconMandi, end: false },
  { to: "/ask", label: "Ask MandiGrid", icon: IconAsk, end: false },
];

function Brand() {
  return (
    <div className="flex items-center gap-2 px-5 py-5">
      <span className="flex h-6 w-6 items-center justify-center rounded-sm bg-grain-green text-[11px] font-semibold text-white">
        M
      </span>
      <span className="font-display text-[15px] font-semibold tracking-tight text-ink">
        MandiGrid
      </span>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-56 shrink-0 border-r border-line bg-panel md:flex md:flex-col">
      <Brand />
      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-sm px-3 py-2 text-[13.5px] transition-colors ${
                isActive
                  ? "bg-grain-green/10 font-medium text-grain-greenDark"
                  : "text-ink-soft hover:bg-paper hover:text-ink"
              }`
            }
          >
            <Icon className="shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-line px-5 py-4 text-[11px] leading-relaxed text-ink-faint">
        57 mandis · 8 crops
        <br />
        Jan – Dec 2026
      </div>
    </aside>
  );
}

export function MobileNav() {
  return (
    <nav className="scroll-thin flex gap-1 overflow-x-auto border-b border-line bg-panel px-3 py-2 md:hidden">
      {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex shrink-0 items-center gap-1.5 rounded-sm px-3 py-1.5 text-[13px] ${
              isActive ? "bg-grain-green/10 font-medium text-grain-greenDark" : "text-ink-soft"
            }`
          }
        >
          <Icon className="shrink-0" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
