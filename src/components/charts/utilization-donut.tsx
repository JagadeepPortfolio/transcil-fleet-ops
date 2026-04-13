"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"

type Props = {
  deployed: number
  available: number
}

const COLORS = ["var(--color-primary)", "var(--color-muted)"]

export function UtilizationDonut({ deployed, available }: Props) {
  const data = [
    { name: "Deployed", value: deployed },
    { name: "Available", value: available },
  ]

  if (deployed === 0 && available === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-xs text-muted-foreground">
        No vehicle data
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={75}
          paddingAngle={3}
          dataKey="value"
          stroke="none"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => [`${value} vehicles`, String(name)]}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--color-border)" }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}
