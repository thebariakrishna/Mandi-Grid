import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from "recharts";
import { chartColors, axisTickStyle } from "./theme";
import { formatRupee, formatDate } from "@/utils/format";
import type { PriceTrendPoint } from "@/data/adapters/priceAdapter";

export function PriceMspTrendChart({ data }: { data: PriceTrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={chartColors.grid} vertical={false} />
        <XAxis
          dataKey="date"
          tick={axisTickStyle}
          axisLine={{ stroke: chartColors.line }}
          tickLine={false}
          tickFormatter={formatDate}
          minTickGap={32}
        />
        <YAxis tick={axisTickStyle} axisLine={false} tickLine={false} width={56} tickFormatter={(v: number) => `${Math.round(v)}`} />
        <Tooltip
          labelFormatter={formatDate}
          formatter={(value: number, name: string) => [
            formatRupee(value),
            name === "weighted_avg_modal_price" ? "Modal price" : "MSP",
          ]}
          contentStyle={{ borderRadius: 6, borderColor: chartColors.line, fontSize: 13 }}
        />
        <Legend
          formatter={(value: string) => (value === "weighted_avg_modal_price" ? "Modal price" : "MSP")}
          wrapperStyle={{ fontSize: 12, color: chartColors.inkSoft }}
        />
        <Line type="monotone" dataKey="weighted_avg_modal_price" stroke={chartColors.green} strokeWidth={2} dot={false} />
        <Line
          type="monotone"
          dataKey="weighted_avg_msp"
          stroke={chartColors.gold}
          strokeWidth={2}
          strokeDasharray="5 3"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
