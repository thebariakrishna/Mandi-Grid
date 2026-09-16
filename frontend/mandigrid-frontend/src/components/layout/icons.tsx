import type { SVGProps } from "react";

const base: SVGProps<SVGSVGElement> = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export const IconOverview = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M3 13h4v8H3z" />
    <path d="M10 8h4v13h-4z" />
    <path d="M17 3h4v18h-4z" />
  </svg>
);

export const IconPrice = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M4 12l6-8h6l4 5-8 11-8-8z" />
    <circle cx="14" cy="9" r="1.3" fill="currentColor" stroke="none" />
  </svg>
);

export const IconLogistics = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M2 8h11v9H2z" />
    <path d="M13 11h4l4 3v3h-8z" />
    <circle cx="6" cy="19" r="1.6" />
    <circle cx="17" cy="19" r="1.6" />
  </svg>
);

export const IconWeather = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M7 16a4 4 0 1 1 1.2-7.8A5 5 0 0 1 18 10a3.5 3.5 0 0 1-1 6H7z" />
    <path d="M8 19v1M12 19v2M16 19v1" />
  </svg>
);

export const IconMandi = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M3 9l9-6 9 6" />
    <path d="M5 9v10M19 9v10M9 9v10M15 9v10" />
    <path d="M3 19h18" />
  </svg>
);

export const IconAsk = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M4 4h16v12H8l-4 4z" />
    <path d="M9 9.5c0-1.4 1.2-2.5 2.7-2.5S14 8.1 14 9.5c0 1-.6 1.5-1.4 2-.6.3-1 .7-1 1.4" />
    <circle cx="11.6" cy="15.3" r="0.6" fill="currentColor" stroke="none" />
  </svg>
);
