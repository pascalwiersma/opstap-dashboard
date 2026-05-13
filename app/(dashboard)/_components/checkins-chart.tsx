'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface ChartDataPoint {
  date: string
  count: number
}

interface CheckinsChartProps {
  data: ChartDataPoint[]
}

export function CheckinsChart({ data }: CheckinsChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis
          dataKey="date"
          tick={{ fill: '#6b7280', fontSize: 12 }}
          axisLine={{ stroke: '#374151' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#6b7280', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={35}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#111827',
            border: '1px solid #374151',
            borderRadius: '8px',
            color: '#f9fafb',
          }}
          labelStyle={{ color: '#9ca3af' }}
          formatter={(value) => [value ?? 0, 'Incheckins']}
        />
        <Line
          type="monotone"
          dataKey="count"
          stroke="#7c3aed"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 5, fill: '#7c3aed', strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
