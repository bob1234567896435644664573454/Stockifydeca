import { useState, useMemo } from "react"
import { AppShell } from "@/components/layout/AppShell"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useActiveCompetition } from "@/features/student/hooks"
import { useStudentLeaderboard } from "@/features/leaderboard/hooks"
import { formatCurrency } from "@/lib/utils"
import {
    Trophy, Users, TrendingUp, TrendingDown, Clock, Star,
    Crown, Medal, Award, Target, Zap, ChevronRight,
    Copy, CheckCircle2, ArrowUpRight, ArrowDownRight, Minus,
    BarChart3, Shield, Flame
} from "lucide-react"
import { EmptyState, SkeletonGrid } from "@/components/ui/states"
import type { Ranking } from "@/features/leaderboard/types"

/* ─── Podium Component ─── */
function Podium({ rankings }: { rankings: Ranking[] }) {
    const top3 = rankings.slice(0, 3)
    if (top3.length === 0) return null

    const podiumConfig = [
        { icon: Crown, color: "text-yellow-500", bg: "bg-yellow-500/10 border-yellow-500/30", label: "1st", height: "h-32" },
        { icon: Medal, color: "text-gray-400", bg: "bg-gray-400/10 border-gray-400/30", label: "2nd", height: "h-24" },
        { icon: Award, color: "text-amber-700", bg: "bg-amber-700/10 border-amber-700/30", label: "3rd", height: "h-20" },
    ]

    // Reorder for visual podium: 2nd, 1st, 3rd
    const displayOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3
    const configOrder = top3.length >= 3 ? [podiumConfig[1], podiumConfig[0], podiumConfig[2]] : podiumConfig.slice(0, top3.length)

    return (
        <div className="flex items-end justify-center gap-3 py-6">
            {displayOrder.map((r, i) => {
                const config = configOrder[i]
                const Icon = config.icon
                const isFirst = r.rank === 1
                return (
                    <div key={r.rank} className={`flex flex-col items-center gap-2 ${isFirst ? 'order-2' : i === 0 ? 'order-1' : 'order-3'}`}>
                        <div className={`relative ${isFirst ? 'scale-110' : ''}`}>
                            <div className={`h-14 w-14 rounded-full ${config.bg} border-2 flex items-center justify-center`}>
                                <Icon className={`h-6 w-6 ${config.color}`} />
                            </div>
                            {r.is_me && (
                                <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                                    <Star className="h-3 w-3 text-primary-foreground fill-primary-foreground" />
                                </div>
                            )}
                        </div>
                        <div className="text-center">
                            <div className={`text-sm font-bold ${r.is_me ? 'text-primary' : ''}`}>
                                {r.display_name ?? "Anonymous"}
                            </div>
                            <div className={`text-xs font-semibold ${r.return_pct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {r.return_pct >= 0 ? '+' : ''}{(r.return_pct).toFixed(1)}%
                            </div>
                        </div>
                        <div className={`${config.height} w-20 rounded-t-lg ${config.bg} border border-b-0 flex items-center justify-center`}>
                            <span className={`text-2xl font-black ${config.color}`}>{config.label}</span>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

/* ─── Ranking Row ─── */
function RankingRow({ ranking, onClick }: { ranking: Ranking; onClick?: () => void }) {
    const isUp = ranking.return_pct >= 0
    const rankChange = ranking.prev_rank > 0 ? ranking.prev_rank - ranking.rank : 0

    return (
        <div
            className={`flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer border-b last:border-0 ${ranking.is_me ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
            onClick={onClick}
        >
            <div className="flex items-center gap-2 w-12">
                <span className="font-bold text-sm w-6 text-center">{ranking.rank}</span>
                {rankChange > 0 ? (
                    <ArrowUpRight className="h-3 w-3 text-green-500" />
                ) : rankChange < 0 ? (
                    <ArrowDownRight className="h-3 w-3 text-red-500" />
                ) : (
                    <Minus className="h-3 w-3 text-muted-foreground" />
                )}
            </div>
            <div className="flex-shrink-0">
                <div className="h-9 w-9 rounded-lg gradient-brand flex items-center justify-center">
                    <span className="text-xs font-bold text-white">
                        {(ranking.display_name ?? "A")[0].toUpperCase()}
                    </span>
                </div>
            </div>
            <div className="flex-1 min-w-0">
                <div className={`font-semibold text-sm ${ranking.is_me ? 'text-primary' : ''}`}>
                    {ranking.display_name ?? "Anonymous"}
                    {ranking.is_me && <Badge variant="secondary" className="ml-2 text-[10px]">YOU</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">
                    Score: {ranking.score.toFixed(1)} · {formatCurrency(ranking.equity)}
                </div>
            </div>
            <div className="text-right">
                <div className={`text-sm font-bold ${isUp ? 'text-green-500' : 'text-red-500'}`}>
                    {isUp ? '+' : ''}{ranking.return_pct.toFixed(2)}%
                </div>
                {ranking.penalties > 0 && (
                    <div className="text-[10px] text-red-500">-{ranking.penalties.toFixed(1)} penalty</div>
                )}
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </div>
    )
}

/* ─── Competition Stats ─── */
function CompetitionStats({ rankings, competitionName }: { rankings: Ranking[]; competitionName: string }) {
    const stats = useMemo(() => {
        if (rankings.length === 0) return null
        const returns = rankings.map(r => r.return_pct)
        const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length
        const bestReturn = Math.max(...returns)
        const worstReturn = Math.min(...returns)
        const totalEquity = rankings.reduce((a, b) => a + b.equity, 0)
        const myRanking = rankings.find(r => r.is_me)
        return { avgReturn, bestReturn, worstReturn, totalEquity, participants: rankings.length, myRank: myRanking?.rank, myReturn: myRanking?.return_pct }
    }, [rankings])

    if (!stats) return null

    return (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <Card className="glass border-border/50">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Participants</span>
                        <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div className="text-2xl font-bold">{stats.participants}</div>
                    <div className="text-xs text-muted-foreground">Active traders</div>
                </CardContent>
            </Card>
            <Card className="glass border-border/50">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Avg Return</span>
                        <BarChart3 className="h-4 w-4 text-primary" />
                    </div>
                    <div className={`text-2xl font-bold ${stats.avgReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {stats.avgReturn >= 0 ? '+' : ''}{stats.avgReturn.toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground">Class average</div>
                </CardContent>
            </Card>
            <Card className="glass border-border/50">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Your Rank</span>
                        <Trophy className="h-4 w-4 text-yellow-500" />
                    </div>
                    <div className="text-2xl font-bold">
                        {stats.myRank ? `#${stats.myRank}` : '--'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                        {stats.myReturn !== undefined ? `${stats.myReturn >= 0 ? '+' : ''}${stats.myReturn.toFixed(1)}% return` : 'Not participating'}
                    </div>
                </CardContent>
            </Card>
            <Card className="glass border-border/50">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Best Return</span>
                        <Flame className="h-4 w-4 text-orange-500" />
                    </div>
                    <div className="text-2xl font-bold text-green-500">
                        +{stats.bestReturn.toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground">Top performer</div>
                </CardContent>
            </Card>
        </div>
    )
}

/* ─── Join Competition Card ─── */
function JoinCompetitionCard() {
    const [code, setCode] = useState("")
    const [copied, setCopied] = useState(false)

    return (
        <Card className="glass border-border/50 overflow-hidden relative">
            <div className="absolute -top-20 -right-20 w-60 h-60 bg-primary/10 rounded-full blur-3xl pointer-events-none animate-glow-pulse" />
            <CardHeader className="relative z-10">
                <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Join a Competition</CardTitle>
                </div>
                <CardDescription>Enter the class code provided by your teacher to join a competition.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 relative z-10">
                <div className="flex gap-2">
                    <Input
                        placeholder="Enter class code..."
                        value={code}
                        onChange={e => setCode(e.target.value.toUpperCase())}
                        className="font-mono text-lg tracking-wider uppercase"
                        maxLength={8}
                    />
                    <Button className="gradient-brand text-white border-0 shrink-0" disabled={code.length < 4}>
                        <Zap className="h-4 w-4 mr-1" /> Join
                    </Button>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Shield className="h-3.5 w-3.5" />
                        <span>Competitions are managed by your teacher. Ask them for the join code.</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

/* ─── Competition Rules Card ─── */
function CompetitionRulesCard({ rules }: { rules: Record<string, unknown> }) {
    const ruleItems = [
        { label: "Starting Cash", value: rules.starting_cash ? formatCurrency(Number(rules.starting_cash)) : "$100,000" },
        { label: "Max Position Size", value: rules.max_position_pct ? `${Number(rules.max_position_pct)}%` : "No limit" },
        { label: "Short Selling", value: rules.allow_short ? "Allowed" : "Not allowed" },
        { label: "Options Trading", value: rules.allow_options ? "Allowed" : "Not allowed" },
        { label: "Min Diversification", value: rules.min_positions ? `${rules.min_positions} positions` : "None" },
    ]

    return (
        <Card className="glass border-border/50">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">Competition Rules</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="space-y-2">
                {ruleItems.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 border-b last:border-0">
                        <span className="text-sm text-muted-foreground">{item.label}</span>
                        <span className="text-sm font-medium">{item.value}</span>
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}

/* ─── Main Competition Page ─── */
export function CompetitionPage() {
    const { data: competition, isLoading: compLoading } = useActiveCompetition()
    const { data: leaderboardData, isLoading: lbLoading } = useStudentLeaderboard(competition?.id ?? "")

    const rankings = leaderboardData?.rankings ?? []
    const isLoading = compLoading || lbLoading

    if (isLoading) {
        return (
            <AppShell role="student">
                <div className="p-4 md:p-8 space-y-6 animate-fade-in">
                    <SkeletonGrid count={4} />
                </div>
            </AppShell>
        )
    }

    if (!competition) {
        return (
            <AppShell role="student">
                <div className="p-4 md:p-8 space-y-6 animate-fade-in">
                    <div className="flex flex-col gap-2">
                        <h1 className="text-3xl font-bold tracking-tight">Competitions</h1>
                        <p className="text-muted-foreground">Compete against classmates in risk-adjusted portfolio challenges.</p>
                    </div>
                    <JoinCompetitionCard />
                    <Card className="glass border-border/50">
                        <CardContent className="p-8">
                            <EmptyState
                                icon={<Trophy className="h-8 w-8" />}
                                title="No Active Competition"
                                description="You're not currently enrolled in any competition. Ask your teacher for a class code to get started."
                            />
                        </CardContent>
                    </Card>
                </div>
            </AppShell>
        )
    }

    return (
        <AppShell role="student">
            <div className="p-4 md:p-8 space-y-6 animate-fade-in">
                {/* Header */}
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500 border-green-500/30">
                                <div className="h-1.5 w-1.5 rounded-full bg-green-500 mr-1 animate-pulse" />
                                {competition.status === 'active' ? 'Live' : competition.status}
                            </Badge>
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">{competition.name}</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            {rankings.length} participants · Risk-adjusted scoring
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="text-xs">
                            <Clock className="h-3.5 w-3.5 mr-1" /> History
                        </Button>
                    </div>
                </div>

                {/* Stats */}
                <CompetitionStats rankings={rankings} competitionName={competition.name} />

                {/* Podium */}
                {rankings.length >= 3 && (
                    <Card className="glass border-border/50 overflow-hidden">
                        <CardContent className="p-0">
                            <Podium rankings={rankings} />
                        </CardContent>
                    </Card>
                )}

                {/* Full Leaderboard + Rules */}
                <div className="grid gap-4 lg:grid-cols-3">
                    <Card className="lg:col-span-2 glass border-border/50 overflow-hidden">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Trophy className="h-5 w-5 text-yellow-500" />
                                    <CardTitle className="text-base">Full Rankings</CardTitle>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                    Updated {leaderboardData?.generated_at ? new Date(leaderboardData.generated_at).toLocaleTimeString() : 'recently'}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="max-h-[500px] overflow-y-auto scrollbar-thin">
                                {rankings.length === 0 ? (
                                    <EmptyState
                                        icon={<Users className="h-6 w-6" />}
                                        title="No rankings yet"
                                        description="Rankings will appear once trading begins."
                                    />
                                ) : (
                                    rankings.map(r => (
                                        <RankingRow key={r.rank} ranking={r} />
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-4">
                        <CompetitionRulesCard rules={competition.rules_json ?? {}} />
                        <JoinCompetitionCard />
                    </div>
                </div>
            </div>
        </AppShell>
    )
}
