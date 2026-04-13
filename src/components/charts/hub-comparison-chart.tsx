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

type HubData = {
  name: string
  collectionPct: number
  utilizationPct: number
  overdueCount: number
}

type Props = {
  hubs: HubData[]
}

export function HubComparisonChart({ hubs }: Props) {
  if (hubs.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-xs text-muted-foreground">
        No hub data
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={hubs} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
        <YAxis tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} className="fill-muted-foreground" />
        <Tooltip
          formatter={(value, name) => [
            name === "Overdue" ? String(value) : `${value}%`,
            String(name),
          ]}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--color-border)" }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar
          dataKey="collectionPct"
          name="Collection %"
          fill="var(--color-primary)"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="utilizationPct"
          name="Utilization %"
          fill="var(--color-primary)"
          opacity={0.4}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
