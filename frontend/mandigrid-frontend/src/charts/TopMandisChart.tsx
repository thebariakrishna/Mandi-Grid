import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import { chartColors, axisTickStyle } from "./theme";
import { formatQtl } from "@/utils/format";

export interface TopMandiDatum {
  mandi_name: string;
  state: string;
  total_arrival_qtl: number;
}

export function TopMandisChart({ data }: { data: TopMandiDatum[] }) {
  const sorted = [...data].sort((a, b) => a.total_arrival_qtl - b.total_arrival_qtl);
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={sorted} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={chartColors.grid} horizontal={false} />
        <XAxis
          type="number"
          tick={axisTickStyle}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
        />
        <YAxis
          type="category"
          dataKey="mandi_name"
          tick={axisTickStyle}
          axisLine={false}
          tickLine={false}
          width={140}
        />
        <Tooltip
          formatter={(value: number, _name, props) => [formatQtl(value), props.payload.state]}
          contentStyle={{ borderRadius: 6, borderColor: chartColors.line, fontSize: 13 }}
        />
        <Bar dataKey="total_arrival_qtl" fill={chartColors.green} radius={[0, 3, 3, 0]} barSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}
