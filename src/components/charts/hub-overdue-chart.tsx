"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

type HubData = {
  name: string
  active: number
  overdue: number
}

type Props = {
  hubs: HubData[]
}

export function HubOverdueChart({ hubs }: Props) {
  if (hubs.length === 0) return null

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={hubs} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} className="fill-muted-foreground" />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--color-border)" }}
        />
        <Bar
          dataKey="active"
          name="Active"
          fill="var(--color-primary)"
          radius={[4, 4, 0, 0]}
          stackId="a"
        />
        <Bar
          dataKey="overdue"
          name="Overdue"
          fill="var(--color-destructive)"
          radius={[4, 4, 0, 0]}
          stackId="a"
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
