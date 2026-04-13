"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"

type BucketData = {
  name: string
  value: number
  color: string
}

type Props = {
  buckets: BucketData[]
}

const inr = (v: number) => `₹${v.toLocaleString("en-IN")}`

export function OutstandingDonut({ buckets }: Props) {
  const filtered = buckets.filter((b) => b.value > 0)

  if (filtered.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center text-xs text-muted-foreground">
        No outstanding balances
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={filtered}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={2}
          dataKey="value"
          stroke="none"
          label={({ name, percent }: { name?: string; percent?: number }) =>
            `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
          }
          labelLine={false}
        >
          {filtered.map((b, i) => (
            <Cell key={i} fill={b.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => [inr(Number(value)), "Amount"]}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--color-border)" }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}
