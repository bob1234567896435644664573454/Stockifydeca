import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Flame, Zap, Calendar } from "lucide-react"

interface DayActivity {
    date: string   // "YYYY-MM-DD"
    count: number  // XP earned
}

interface ActivityCalendarProps {
    data: DayActivity[]
    streak: number
    longestStreak: number
    totalXp: number
}

const CELL_SIZE = 13
const GAP = 3
const WEEKS = 26 // ~6 months
const DAYS = 7

function getIntensity(count: number): string {
    if (count === 0) return "var(--muted)"
    if (count < 50) return "hsl(142 60% 75%)"
    if (count < 100) return "hsl(142 60% 55%)"
    if (count < 200) return "hsl(142 60% 40%)"
    return "hsl(142 60% 28%)"
}

function getDateKey(d: Date): string {
    return d.toISOString().split("T")[0]
}

export function ActivityCalendar({ data, streak, longestStreak, totalXp }: ActivityCalendarProps) {
    const { cells, months } = useMemo(() => {
        const map = new Map(data.map(d => [d.date, d.count]))
        const today = new Date()
        const cells: { date: string; count: number; col: number; row: number }[] = []
        const totalDays = WEEKS * DAYS
        const startDate = new Date(today)
        startDate.setDate(startDate.getDate() - totalDays + 1)

        // Align to Sunday
        const dayOfWeek = startDate.getDay()
        startDate.setDate(startDate.getDate() - dayOfWeek)

        const monthLabels: { label: string; col: number }[] = []
        let lastMonth = -1

        for (let w = 0; w < WEEKS; w++) {
            for (let d = 0; d < DAYS; d++) {
                const cellDate = new Date(startDate)
                cellDate.setDate(cellDate.getDate() + w * 7 + d)
                const key = getDateKey(cellDate)

                if (cellDate.getMonth() !== lastMonth) {
                    lastMonth = cellDate.getMonth()
                    monthLabels.push({
                        label: cellDate.toLocaleDateString(undefined, { month: "short" }),
                        col: w,
                    })
                }

                cells.push({
                    date: key,
                    count: map.get(key) || 0,
                    col: w,
                    row: d,
                })
            }
        }

        return { cells, months: monthLabels }
    }, [data])

    const svgWidth = WEEKS * (CELL_SIZE + GAP) + 30
    const svgHeight = DAYS * (CELL_SIZE + GAP) + 24

    const dayLabels = ["", "Mon", "", "Wed", "", "Fri", ""]

    return (
        <div className="space-y-4">
            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3">
                <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/20">
                    <CardContent className="p-4 text-center">
                        <Flame className="h-5 w-5 mx-auto mb-1 text-orange-500" />
                        <div className="text-2xl font-bold stat-number">{streak}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Current Streak</div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/20">
                    <CardContent className="p-4 text-center">
                        <Calendar className="h-5 w-5 mx-auto mb-1 text-purple-500" />
                        <div className="text-2xl font-bold stat-number">{longestStreak}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Best Streak</div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border-yellow-500/20">
                    <CardContent className="p-4 text-center">
                        <Zap className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
                        <div className="text-2xl font-bold stat-number">{totalXp.toLocaleString()}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Total XP</div>
                    </CardContent>
                </Card>
            </div>

            {/* Calendar Grid */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" /> Activity
                    </CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    <svg width={svgWidth} height={svgHeight} className="mx-auto">
                        {/* Day labels */}
                        {dayLabels.map((label, i) => (
                            <text
                                key={i}
                                x={0}
                                y={24 + i * (CELL_SIZE + GAP) + CELL_SIZE / 2}
                                fontSize={9}
                                fill="currentColor"
                                className="text-muted-foreground"
                                dominantBaseline="middle"
                            >
                                {label}
                            </text>
                        ))}

                        {/* Month labels */}
                        {months.map((m, i) => (
                            <text
                                key={i}
                                x={30 + m.col * (CELL_SIZE + GAP)}
                                y={10}
                                fontSize={9}
                                fill="currentColor"
                                className="text-muted-foreground"
                            >
                                {m.label}
                            </text>
                        ))}

                        {/* Cells */}
                        {cells.map((cell, i) => (
                            <rect
                                key={i}
                                x={30 + cell.col * (CELL_SIZE + GAP)}
                                y={20 + cell.row * (CELL_SIZE + GAP)}
                                width={CELL_SIZE}
                                height={CELL_SIZE}
                                rx={2}
                                fill={getIntensity(cell.count)}
                                className="transition-colors hover:opacity-80"
                            >
                                <title>{cell.date}: {cell.count} XP</title>
                            </rect>
                        ))}
                    </svg>

                    {/* Legend */}
                    <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-muted-foreground">
                        <span>Less</span>
                        {[0, 30, 80, 150, 250].map(v => (
                            <div
                                key={v}
                                className="h-3 w-3 rounded-sm"
                                style={{ backgroundColor: getIntensity(v) }}
                            />
                        ))}
                        <span>More</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
