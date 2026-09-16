import {
  BarChart,
  Bar,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { chartColors, cropColors, axisTickStyle } from "./theme";

export type GenericPoint = { label: string; value: number; sublabel?: string };
export type GenericSeriesPoint = { x: number; y: number; label?: string };

export type GenericChartSpec =
  | { kind: "bar"; data: GenericPoint[]; valueFormatter?: (v: number) => string }
  | { kind: "line"; data: GenericPoint[]; valueFormatter?: (v: number) => string }
  | {
      kind: "scatter";
      data: GenericSeriesPoint[];
      xLabel: string;
      yLabel: string;
      valueFormatter?: (v: number) => string;
    };

export function GenericChartRenderer({ spec }: { spec: GenericChartSpec }) {
  const fmt = spec.kind !== "scatter" ? spec.valueFormatter ?? ((v: number) => `${v}`) : undefined;

  if (spec.kind === "bar") {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={spec.data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={chartColors.grid} vertical={false} />
          <XAxis dataKey="label" tick={axisTickStyle} axisLine={{ stroke: chartColors.line }} tickLine={false} />
          <YAxis tick={axisTickStyle} axisLine={false} tickLine={false} width={56} />
          <Tooltip
            formatter={(value: number) => [fmt!(value), ""]}
            contentStyle={{ borderRadius: 6, borderColor: chartColors.line, fontSize: 13 }}
          />
          <Bar dataKey="value" radius={[3, 3, 0, 0]}>
            {spec.data.map((entry, i) => (
              <Cell key={entry.label} fill={cropColors[i % cropColors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (spec.kind === "line") {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={spec.data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={chartColors.grid} vertical={false} />
          <XAxis dataKey="label" tick={axisTickStyle} axisLine={{ stroke: chartColors.line }} tickLine={false} minTickGap={32} />
          <YAxis tick={axisTickStyle} axisLine={false} tickLine={false} width={56} />
          <Tooltip
            formatter={(value: number) => [fmt!(value), ""]}
            contentStyle={{ borderRadius: 6, borderColor: chartColors.line, fontSize: 13 }}
          />
          <Line type="monotone" dataKey="value" stroke={chartColors.green} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={chartColors.grid} />
        <XAxis
          type="number"
          dataKey="x"
          name={spec.xLabel}
          tick={axisTickStyle}
          axisLine={{ stroke: chartColors.line }}
          tickLine={false}
        />
        <YAxis type="number" dataKey="y" name={spec.yLabel} tick={axisTickStyle} axisLine={false} tickLine={false} width={56} />
        <ZAxis range={[40, 40]} />
        <Tooltip
          cursor={{ strokeDasharray: "3 3" }}
          formatter={(value: number, name: string) => [
            spec.valueFormatter ? spec.valueFormatter(value) : value,
            name,
          ]}
          contentStyle={{ borderRadius: 6, borderColor: chartColors.line, fontSize: 13 }}
        />
        <Scatter data={spec.data} fill={chartColors.green} fillOpacity={0.75} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
