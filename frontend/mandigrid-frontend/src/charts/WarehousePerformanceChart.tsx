import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { chartColors, axisTickStyle } from "./theme";
import { formatHours, formatPercent } from "@/utils/format";
import type { TransportSummaryRow } from "@/types/analytics";

export function WarehousePerformanceChart({ data }: { data: TransportSummaryRow[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={chartColors.grid} vertical={false} />
        <XAxis
          dataKey="destination_warehouse"
          tick={axisTickStyle}
          axisLine={{ stroke: chartColors.line }}
          tickLine={false}
        />
        <YAxis
          yAxisId="hours"
          tick={axisTickStyle}
          axisLine={false}
          tickLine={false}
          width={44}
          label={{ value: "hrs", position: "insideTopLeft", fill: chartColors.inkSoft, fontSize: 11 }}
        />
        <YAxis
          yAxisId="pct"
          orientation="right"
          tick={axisTickStyle}
          axisLine={false}
          tickLine={false}
          width={40}
          label={{ value: "%", position: "insideTopRight", fill: chartColors.inkSoft, fontSize: 11 }}
        />
        <Tooltip
          formatter={(value: number, name: string) =>
            name === "avg_transit_hours" ? [formatHours(value), "Avg transit time"] : [formatPercent(value), "Delay rate"]
          }
          contentStyle={{ borderRadius: 6, borderColor: chartColors.line, fontSize: 13 }}
        />
        <Legend
          formatter={(value: string) => (value === "avg_transit_hours" ? "Avg transit time" : "Delay rate")}
          wrapperStyle={{ fontSize: 12, color: chartColors.inkSoft }}
        />
        <Bar yAxisId="hours" dataKey="avg_transit_hours" fill={chartColors.green} radius={[3, 3, 0, 0]} barSize={28} />
        <Line
          yAxisId="pct"
          type="monotone"
          dataKey="transit_delay_rate_percent"
          stroke={chartColors.rust}
          strokeWidth={2}
          dot={{ r: 3, fill: chartColors.rust }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
