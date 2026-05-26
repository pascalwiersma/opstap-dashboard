'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export function DagGrafiek({
  data,
  label,
  kleur = '#7c3aed',
}: {
  data: { date: string; count: number }[]
  label: string
  kleur?: string
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis
          dataKey="date"
          tick={{ fill: '#6b7280', fontSize: 11 }}
          axisLine={{ stroke: '#374151' }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: '#6b7280', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={30}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px', color: '#f9fafb' }}
          labelStyle={{ color: '#9ca3af' }}
          formatter={(v) => [v, label]}
        />
        <Line type="monotone" dataKey="count" stroke={kleur} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: kleur, strokeWidth: 0 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
