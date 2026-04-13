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

type Props = {
  collected: number
  due: number
  depositsCollected: number
  depositsRefunded: number
}

const inr = (v: number) => `₹${v.toLocaleString("en-IN")}`

export function RevenueBarChart({
  collected,
  due,
  depositsCollected,
  depositsRefunded,
}: Props) {
  const data = [
    { name: "Revenue", Collected: collected, Due: due },
    {
      name: "Deposits",
      Collected: depositsCollected,
      Due: depositsRefunded,
    },
  ]

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} className="fill-muted-foreground" />
        <Tooltip
          formatter={(value, name) => [inr(Number(value)), name === "Due" ? "Due / Refunded" : String(name)]}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--color-border)" }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Collected" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Due" fill="var(--color-destructive)" opacity={0.6} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
