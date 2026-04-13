"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"

type Props = {
  active: number
  newThisMonth: number
  returns: number
  overdue: number
}

export function DeploymentFlowChart({ active, newThisMonth, returns, overdue }: Props) {
  const data = [
    { name: "Active", value: active, color: "var(--color-primary)" },
    { name: "New", value: newThisMonth, color: "var(--color-primary)" },
    { name: "Returns", value: returns, color: "var(--color-muted-foreground)" },
    { name: "Overdue", value: overdue, color: "var(--color-destructive)" },
  ]

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} barSize={36}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} className="fill-muted-foreground" />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--color-border)" }}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
