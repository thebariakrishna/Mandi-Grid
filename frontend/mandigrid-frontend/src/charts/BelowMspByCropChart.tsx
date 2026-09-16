import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell } from "recharts";
import { chartColors, axisTickStyle } from "./theme";
import type { CropPriceAggregate } from "@/data/adapters/priceAdapter";

export function BelowMspByCropChart({ data }: { data: CropPriceAggregate[] }) {
  const sorted = [...data].sort((a, b) => b.below_msp_rate_pct - a.below_msp_rate_pct);
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={sorted} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={chartColors.grid} vertical={false} />
        <XAxis dataKey="crop_name" tick={axisTickStyle} axisLine={{ stroke: chartColors.line }} tickLine={false} />
        <YAxis
          tick={axisTickStyle}
          axisLine={false}
          tickLine={false}
          width={40}
          tickFormatter={(v: number) => `${v}%`}
        />
        <Tooltip
          formatter={(value: number, _name, props) => [
            `${value.toFixed(1)}%`,
            `${props.payload.below_msp_count} of ${props.payload.records_count} observations`,
          ]}
          contentStyle={{ borderRadius: 6, borderColor: chartColors.line, fontSize: 13 }}
        />
        <Bar dataKey="below_msp_rate_pct" radius={[3, 3, 0, 0]}>
          {sorted.map((entry) => (
            <Cell
              key={entry.crop_name}
              fill={entry.below_msp_rate_pct >= 40 ? chartColors.rust : chartColors.gold}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
