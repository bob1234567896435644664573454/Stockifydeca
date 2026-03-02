import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"
import { formatCurrency, formatDate } from "@/lib/utils"
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface DataPoint {
    date: string
    equity: number
}

interface Props {
    data: DataPoint[]
    height?: number
}

export function EquityCurveChart({ data, height = 300 }: Props) {
    if (!data || data.length === 0) {
        return (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground bg-muted/10 rounded-lg border border-dashed">
                No equity history available
            </div>
        )
    }

    return (
        <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={data}>
                <defs>
                    <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis
                    dataKey="date"
                    tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    stroke="#9ca3af"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                />
                <YAxis
                    domain={['auto', 'auto']}
                    tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                    stroke="#9ca3af"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                />
                <Tooltip
                    formatter={(val: number | undefined) => {
                        if (val === undefined) return ["", "Equity"]
                        return [formatCurrency(val), "Equity"]
                    }}
                    labelFormatter={(label) => formatDate(label)}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area
                    type="monotone"
                    dataKey="equity"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorEquity)"
                />
            </AreaChart>
        </ResponsiveContainer>
    )
}
