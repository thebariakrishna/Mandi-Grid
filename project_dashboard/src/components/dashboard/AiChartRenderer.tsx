import React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  LineChart
} from "recharts";

export type ChartConfig = {
  chartType: "bar" | "line" | "pie" | "area";
  data: any[];
  xAxis?: string;
  yAxis?: string;
  unit?: string;
  title?: string;
};

const COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--color-chart-6)",
];

export function AiChartRenderer({ config }: { config: ChartConfig }) {
  const { chartType, data, xAxis = "name", yAxis = "value", unit = "", title } = config;

  if (!data || data.length === 0) {
    return <div className="text-sm text-muted-foreground p-4">No data available for chart.</div>;
  }

  const formatValue = (v: any) => {
    if (typeof v === "number") {
      const formatted = v.toLocaleString("en-IN");
      return unit ? `${formatted} ${unit}` : formatted;
    }
    return `${v} ${unit}`.trim();
  };

  const getLabel = (name: any, item: any) => {
    return item?.payload?.[xAxis] || name || "Value";
  };

  const renderChart = () => {
    switch (chartType) {
      case "bar":
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey={xAxis} tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => typeof v === "number" ? v.toLocaleString("en-IN") : v} />
            <Tooltip formatter={(value: any, name: any, item: any) => [formatValue(value), getLabel(name, item)]} />
            <Bar dataKey={yAxis} fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
          </BarChart>
        );
      case "line":
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey={xAxis} tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => typeof v === "number" ? v.toLocaleString("en-IN") : v} />
            <Tooltip formatter={(value: any, name: any, item: any) => [formatValue(value), getLabel(name, item)]} />
            <Line type="monotone" dataKey={yAxis} stroke="var(--color-chart-2)" strokeWidth={2} />
          </LineChart>
        );
      case "area":
        return (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey={xAxis} tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => typeof v === "number" ? v.toLocaleString("en-IN") : v} />
            <Tooltip formatter={(value: any, name: any, item: any) => [formatValue(value), getLabel(name, item)]} />
            <Area type="monotone" dataKey={yAxis} stroke="var(--color-chart-3)" fill="var(--color-chart-3)" fillOpacity={0.2} />
          </AreaChart>
        );
      case "pie":
        return (
          <PieChart>
            <Pie data={data} dataKey={yAxis} nameKey={xAxis} cx="50%" cy="50%" outerRadius={80}>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: any, name: any, item: any) => [formatValue(value), getLabel(name, item)]} />
          </PieChart>
        );
      default:
        return <div className="text-sm text-red-500">Unsupported chart type: {chartType}</div>;
    }
  };

  return (
    <div className="w-full mt-2 mb-2 p-3 rounded-xl bg-surface border border-border flex flex-col gap-2">
      {title && <div className="text-xs font-bold text-foreground font-display">{title}</div>}
      <div style={{ height: 220, width: "100%" }}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>

      {chartType === "pie" && (
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs border-t border-border/50 pt-2">
          {data.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <span
                className="size-2.5 rounded-sm shrink-0"
                style={{ background: COLORS[i % COLORS.length] }}
              />
              <span className="truncate font-medium text-foreground">{item[xAxis] ?? item.name}</span>
              <span className="font-mono text-muted-foreground ml-auto">
                {formatValue(item[yAxis] ?? item.value)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
