import { EquityCurveChart } from "@/features/charts/EquityCurveChart"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { formatCurrency, formatPercent } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Loader2, TrendingUp, TrendingDown, Activity, DollarSign } from "lucide-react"
import { ScoreCard } from "@/features/analytics/ScoreCard"
import { type Ranking } from "@/features/leaderboard/types"
import { useStudentAnalytics } from "@/features/teacher/hooks"
import { EmptyState } from "@/components/ui/states"

interface StudentProfileProps {
    studentId: string
    name?: string
    competitionId?: string
    ranking?: Ranking
}

export function StudentProfile({ studentId, name, competitionId, ranking }: StudentProfileProps) {
    const { data, isLoading } = useStudentAnalytics(studentId, competitionId)
    const equityHistory = data?.equity_curve || []

    const currentEquity = equityHistory[equityHistory.length - 1]?.equity || ranking?.equity || 0
    const startEquity = equityHistory[0]?.equity || 100000
    const totalReturn = currentEquity - startEquity
    const totalReturnPct = startEquity > 0 ? (totalReturn / startEquity) * 100 : 0

    if (isLoading) {
        return (
            <div className="h-[300px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Equity</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(currentEquity)}</div>
                        <p className={`text-xs ${totalReturn >= 0 ? "text-green-500" : "text-red-500"} flex items-center`}>
                            {totalReturn >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                            {formatCurrency(totalReturn)} ({totalReturnPct.toFixed(2)}%)
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatPercent((data?.metrics.win_rate || 0) * 100)}</div>
                        <p className="text-xs text-muted-foreground">From closed sells</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Sharpe Ratio</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{(data?.metrics.sharpe || 0).toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">Risk-adjusted return</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Max Drawdown</CardTitle>
                        <TrendingDown className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-500">{formatPercent(data?.metrics.drawdown_max || 0)}</div>
                        <p className="text-xs text-muted-foreground">Peak to trough decline</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Equity Curve</CardTitle>
                        <CardDescription>Portfolio performance over time</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <EquityCurveChart data={equityHistory} height={300} />
                    </CardContent>
                </Card>
                <div className="col-span-3 space-y-4">
                    {ranking && (
                        <ScoreCard
                            score={ranking.score}
                            breakdown={ranking.breakdown}
                        />
                    )}
                    <Card>
                        <CardHeader>
                            <CardTitle>Violations</CardTitle>
                            <CardDescription>Rules activity for {name || "Student"}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {(data?.violations || []).slice(0, 6).map((v) => (
                                    <div key={v.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                                        <span className="text-sm">{v.rule_key}</span>
                                        <Badge variant={v.severity === "high" ? "destructive" : "secondary"}>
                                            {v.severity}
                                        </Badge>
                                    </div>
                                ))}
                                {(data?.violations || []).length === 0 && (
                                    <EmptyState
                                        icon={<Activity className="h-6 w-6" />}
                                        title="No violations"
                                        description="No rule violations were recorded for this student."
                                    />
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
