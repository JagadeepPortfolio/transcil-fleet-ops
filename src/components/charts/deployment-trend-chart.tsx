"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

export type TrendPoint = {
  label: string
  individual: number
  threePL: number
}

/**
 * Total deployments per period, split into Individual vs 3PL series.
 * Used by the Operations Overview report. Grouped bars read clearly for the
 * 5–12 discrete periods we show and stay on-brand with the other charts.
 */
export function DeploymentTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11 }}
          className="fill-muted-foreground"
        />
        <YAxis
          tick={{ fontSize: 11 }}
          allowDecimals={false}
          className="fill-muted-foreground"
        />
        <Tooltip
          formatter={(value, name) => [
            value,
            name === "individual" ? "Individual" : "3PL",
          ]}
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: "1px solid var(--color-border)",
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: 12 }}
          formatter={(v) => (v === "individual" ? "Individual" : "3PL")}
        />
        <Bar
          dataKey="individual"
          fill="var(--color-chart-1)"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="threePL"
          fill="var(--color-chart-2)"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
