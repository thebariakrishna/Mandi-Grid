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
import { formatQtl, formatDate, formatOneDecimal } from "@/utils/format";
import type { DailyWeatherPoint } from "@/data/adapters/weatherAdapter";

export function RainfallArrivalChart({ data }: { data: DailyWeatherPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={chartColors.grid} vertical={false} />
        <XAxis
          dataKey="date"
          tick={axisTickStyle}
          axisLine={{ stroke: chartColors.line }}
          tickLine={false}
          tickFormatter={formatDate}
          minTickGap={40}
        />
        <YAxis
          yAxisId="arrivals"
          tick={axisTickStyle}
          axisLine={false}
          tickLine={false}
          width={52}
          tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
        />
        <YAxis
          yAxisId="rain"
          orientation="right"
          tick={axisTickStyle}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip
          labelFormatter={formatDate}
          formatter={(value: number, name: string) =>
            name === "total_arrival_qtl"
              ? [formatQtl(value), "Total arrivals"]
              : [`${formatOneDecimal(value)} mm`, "Avg rainfall"]
          }
          contentStyle={{ borderRadius: 6, borderColor: chartColors.line, fontSize: 13 }}
        />
        <Legend
          formatter={(value: string) => (value === "total_arrival_qtl" ? "Total arrivals" : "Avg rainfall")}
          wrapperStyle={{ fontSize: 12, color: chartColors.inkSoft }}
        />
        <Bar yAxisId="arrivals" dataKey="total_arrival_qtl" fill={chartColors.green} radius={[2, 2, 0, 0]} />
        <Line yAxisId="rain" type="monotone" dataKey="avg_rainfall_mm" stroke={chartColors.gold} strokeWidth={1.75} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
