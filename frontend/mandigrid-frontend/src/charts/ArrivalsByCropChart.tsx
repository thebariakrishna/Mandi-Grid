import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell } from "recharts";
import { chartColors, cropColors, axisTickStyle } from "./theme";
import { formatQtl } from "@/utils/format";

export interface ArrivalsByCropDatum {
  crop_name: string;
  total_arrival_qtl: number;
  arrival_share_percent: number;
}

export function ArrivalsByCropChart({ data }: { data: ArrivalsByCropDatum[] }) {
  const sorted = [...data].sort((a, b) => b.total_arrival_qtl - a.total_arrival_qtl);
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={sorted} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={chartColors.grid} vertical={false} />
        <XAxis dataKey="crop_name" tick={axisTickStyle} axisLine={{ stroke: chartColors.line }} tickLine={false} />
        <YAxis
          tick={axisTickStyle}
          axisLine={false}
          tickLine={false}
          width={64}
          tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
        />
        <Tooltip
          formatter={(value: number, _name, props) => [
            formatQtl(value),
            `${props.payload.arrival_share_percent.toFixed(1)}% of total`,
          ]}
          contentStyle={{ borderRadius: 6, borderColor: chartColors.line, fontSize: 13 }}
        />
        <Bar dataKey="total_arrival_qtl" radius={[3, 3, 0, 0]}>
          {sorted.map((entry, i) => (
            <Cell key={entry.crop_name} fill={cropColors[i % cropColors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
