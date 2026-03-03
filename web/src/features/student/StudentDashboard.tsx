import { useNavigate } from "@tanstack/react-router"
import { useActiveAccount } from "@/hooks/useActiveAccount"
import { usePositions, useOrders, useEquityHistory, useActiveCompetition } from "./hooks"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/utils"
import {
    TrendingUp, TrendingDown, DollarSign, Briefcase, Activity,
    ArrowUpRight, ArrowDownRight, ChevronRight, AlertCircle,
    Zap, Target, BarChart3, PieChart, Shield, AlertTriangle
} from "lucide-react"
import { AppShell } from "@/components/layout/AppShell"
import { PortfolioChartPanel } from "./components/PortfolioChartPanel"
import { DailyQuestCard } from "./components/DailyQuestCard"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useMemo, useState } from "react"
import { DailyBrief } from "@/features/mentor/MentorPanel"
import { computePortfolioMetrics, computeMaxDrawdown, type PositionData } from "@/lib/portfolio-calc"
import { EmptyState, SkeletonGrid } from "@/components/ui/states"
import { useXPLevel } from "@/hooks/useXPLevel"
import { LevelUpModal } from "@/components/ui/level-up-modal"

/* ─── Stat Card ─── */
function StatCard({ title, value, subtitle, icon: Icon, change, loading, className }: {
    title: string; value: string; subtitle?: string
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
    change?: number; loading?: boolean; className?: string
}) {
    return (
        <Card className={`card-hover animate-slide-up overflow-hidden relative glass border-border/50 ${className || ''}`}>
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/20 rounded-full blur-3xl pointer-events-none animate-glow-pulse" />
            <CardContent className="p-5 relative z-10">
                {loading ? (
                    <div className="space-y-3"><Skeleton className="h-4 w-24" /><Skeleton className="h-8 w-32" /><Skeleton className="h-3 w-20" /></div>
                ) : (
                    <>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</span>
                            <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                                <Icon className="h-4 w-4 text-primary animate-float" style={{ animationDelay: `${Math.random() * 2}s` }} />
                            </div>
                        </div>
                        <div className="stat-number text-2xl font-bold tracking-tight text-foreground/90">{value}</div>
                        <div className="flex items-center gap-1.5 mt-1.5">
                            {change !== undefined && change !== 0 && (
                                <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 rounded-sm ${change >= 0 ? 'bg-[hsl(var(--chart-up))]/10 text-[hsl(var(--chart-up))]' : 'bg-[hsl(var(--chart-down))]/10 text-[hsl(var(--chart-down))]'}`}>
                                    {change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                    {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                                </span>
                            )}
                            {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    )
}

/* ─── Position Row ─── */
function PositionRow({ symbol, qty, avgCost, currentPrice, onClick }: {
    symbol: string; qty: number; avgCost: number; currentPrice: number; onClick: () => void
}) {
    const marketValue = qty * currentPrice
    const unrealizedPnl = (currentPrice - avgCost) * qty
    const pnlPct = avgCost > 0 ? ((currentPrice - avgCost) / avgCost) * 100 : 0
    const isUp = unrealizedPnl >= 0
    return (
        <div className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer border-b last:border-0" onClick={onClick}>
            <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-lg gradient-brand flex items-center justify-center">
                    <span className="text-xs font-bold text-white">{symbol.slice(0, 2)}</span>
                </div>
            </div>
            <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{symbol}</div>
                <div className="text-xs text-muted-foreground">{qty} shares · Avg {formatCurrency(avgCost)}</div>
            </div>
            <div className="text-right">
                <div className="font-semibold text-sm stat-number">{formatCurrency(marketValue)}</div>
                <div className={`text-xs font-medium stat-number ${isUp ? 'text-[hsl(var(--chart-up))]' : 'text-[hsl(var(--chart-down))]'}`}>
                    {isUp ? '+' : ''}{formatCurrency(unrealizedPnl)} ({isUp ? '+' : ''}{pnlPct.toFixed(1)}%)
                </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </div>
    )
}

/* ─── Allocation Donut (SVG) ─── */
function AllocationDonut({ allocation, cash, equity }: {
    allocation: { symbol: string; value: number; weight: number }[]; cash: number; equity: number
}) {
    const COLORS = ["#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e", "#f97316", "#eab308", "#22c55e", "#06b6d4"]
    const items = [
        ...allocation.map((a, i) => ({ label: a.symbol, value: a.value, color: COLORS[i % COLORS.length] })),
        { label: "Cash", value: cash, color: "#64748b" },
    ].filter(i => i.value > 0)

    if (items.length === 0 || equity <= 0) {
        return (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                No positions yet
            </div>
        )
    }

    const total = items.reduce((s, i) => s + i.value, 0)
    let cumAngle = -90
    const paths = items.map(item => {
        const pct = item.value / total
        const angle = pct * 360
        const startAngle = cumAngle
        cumAngle += angle
        const endAngle = cumAngle
        const largeArc = angle > 180 ? 1 : 0
        const r = 40
        const cx = 50, cy = 50
        const x1 = cx + r * Math.cos((startAngle * Math.PI) / 180)
        const y1 = cy + r * Math.sin((startAngle * Math.PI) / 180)
        const x2 = cx + r * Math.cos((endAngle * Math.PI) / 180)
        const y2 = cy + r * Math.sin((endAngle * Math.PI) / 180)
        return { ...item, pct, d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z` }
    })

    return (
        <div className="flex items-center gap-4">
            <svg viewBox="0 0 100 100" className="w-28 h-28 shrink-0">
                {paths.map((p, i) => (
                    <path key={i} d={p.d} fill={p.color} opacity={0.85} className="transition-all hover:opacity-100" />
                ))}
                <circle cx="50" cy="50" r="22" fill="hsl(var(--card))" />
                <text x="50" y="48" textAnchor="middle" className="fill-foreground text-[7px] font-bold">{items.length - 1}</text>
                <text x="50" y="57" textAnchor="middle" className="fill-muted-foreground text-[5px]">positions</text>
            </svg>
            <div className="space-y-1 flex-1 min-w-0 max-h-[120px] overflow-y-auto scrollbar-thin">
                {items.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                        <div className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="font-medium truncate">{item.label}</span>
                        <span className="text-muted-foreground ml-auto">{(item.pct * 100).toFixed(1)}%</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

/* ─── Risk Snapshot ─── */
function RiskSnapshot({ hhi, concentrationLabel, maxDrawdown, positionCount }: {
    hhi: number; concentrationLabel: string; maxDrawdown: number; positionCount: number
}) {
    const riskLevel = hhi > 2500 ? "high" : hhi > 1500 ? "medium" : "low"
    const riskColor = riskLevel === "high" ? "text-red-500" : riskLevel === "medium" ? "text-yellow-500" : "text-green-500"
    const riskBg = riskLevel === "high" ? "bg-red-500/10" : riskLevel === "medium" ? "bg-yellow-500/10" : "bg-green-500/10"

    const metrics = [
        { label: "Concentration (HHI)", value: hhi.toFixed(0), sublabel: concentrationLabel },
        { label: "Max Drawdown", value: `${maxDrawdown.toFixed(1)}%`, sublabel: maxDrawdown > 10 ? "Elevated" : "Normal" },
        { label: "Positions", value: String(positionCount), sublabel: positionCount < 3 ? "Under-diversified" : positionCount >= 8 ? "Well diversified" : "Moderate" },
    ]

    return (
        <Card className="animate-slide-up overflow-hidden relative glass border-border/50">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none animate-glow-pulse" />
            <CardHeader className="pb-2 relative z-10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        <CardTitle className="text-base font-semibold">Risk Snapshot</CardTitle>
                    </div>
                    <Badge variant="outline" className={`text-xs ${riskBg} ${riskColor} border-0`}>
                        {riskLevel === "high" && <AlertTriangle className="h-3 w-3 mr-1" />}
                        {riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)} Risk
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {metrics.map((m, i) => (
                    <div key={i} className="flex items-center justify-between">
                        <div>
                            <div className="text-xs text-muted-foreground">{m.label}</div>
                            <div className="text-xs text-muted-foreground/70">{m.sublabel}</div>
                        </div>
                        <div className="text-sm font-bold">{m.value}</div>
                    </div>
                ))}
                {riskLevel === "high" && (
                    <div className="p-2 rounded-lg bg-red-500/5 border border-red-500/20 text-xs text-red-500">
                        Your portfolio is highly concentrated. Consider diversifying across more positions and sectors to reduce risk.
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

/* ─── Main Dashboard ─── */
export function StudentDashboard() {
    const { data: account, isLoading: accountLoading } = useActiveAccount()
    const { data: positions, isLoading: positionsLoading } = usePositions()
    const { data: orders } = useOrders()
    const { data: equityHistory } = useEquityHistory(account?.id)
    const { data: competition } = useActiveCompetition()
    const navigate = useNavigate()
    const [timeframe, setTimeframe] = useState<"1D" | "1W" | "1M" | "ALL">("1M")
    const { level, showLevelUp, dismissLevelUp } = useXPLevel()

    const positionData = useMemo<PositionData[]>(
        () => (positions ?? []).map((position) => ({
            symbol: position.symbol,
            qty: position.qty,
            avg_cost: position.avg_cost,
            current_price: position.current_price ?? position.avg_cost,
        })),
        [positions]
    )
    const startingCash = account?.starting_cash ?? 100000
    const portfolioMetrics = useMemo(
        () => computePortfolioMetrics(positionData, account?.cash_balance ?? 0, startingCash),
        [positionData, account?.cash_balance, startingCash]
    )
    const maxDrawdown = useMemo(
        () => equityHistory ? computeMaxDrawdown(equityHistory) : 0,
        [equityHistory]
    )
    const equity = portfolioMetrics.equity
    const totalReturn = portfolioMetrics.totalReturnPct
    const cash = portfolioMetrics.cash
    const investedValue = portfolioMetrics.investedValue

    const topMovers = useMemo(() => {
        if (!positions || positions.length === 0) return []
        return [...positions]
            .filter(p => p.current_price && p.current_price > 0)
            .sort((a, b) => {
                const aPnl = Math.abs((a.current_price! - a.avg_cost) * a.qty)
                const bPnl = Math.abs((b.current_price! - b.avg_cost) * b.qty)
                return bPnl - aPnl
            })
            .slice(0, 3)
    }, [positions])

    const sectorCount = portfolioMetrics.positionCount

    if (accountLoading) {
        return (
            <AppShell role="student">
                <div className="p-4 md:p-8 space-y-6 animate-fade-in">
                    <SkeletonGrid count={4} />
                    <Skeleton className="h-48 w-full rounded-xl" />
                </div>
            </AppShell>
        )
    }

    if (!account) {
        return (
            <AppShell role="student">
                <div className="flex-1 flex items-center justify-center p-8">
                    <div className="max-w-md w-full rounded-lg border bg-card p-4 animate-scale-in">
                        <EmptyState
                            icon={<Briefcase className="h-6 w-6" />}
                            title="No Trading Account Found"
                            description="Join a class to get started with your trading journey."
                            action={() => navigate({ to: "/auth" })}
                            actionLabel="Join a Class"
                        />
                    </div>
                </div>
            </AppShell>
        )
    }

    return (
        <AppShell role="student">
            <LevelUpModal level={level} open={showLevelUp} onClose={dismissLevelUp} />
            <div className="space-y-6 p-4 md:p-8 animate-fade-in">
                {/* Trading Frozen Alert */}
                {account.trading_enabled === false && (
                    <Alert variant="destructive" className="animate-slide-up">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Trading Frozen</AlertTitle>
                        <AlertDescription>Your teacher has paused trading. You can still view your portfolio and performance.</AlertDescription>
                    </Alert>
                )}

                {/* Page Header */}
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">
                            {competition?.name ?? "Trading Dashboard"}
                        </p>
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight stat-number animate-number-up">
                            {formatCurrency(equity)}
                        </h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`inline-flex items-center gap-1 text-sm font-semibold ${totalReturn >= 0 ? 'text-[hsl(var(--chart-up))]' : 'text-[hsl(var(--chart-down))]'}`}>
                                {totalReturn >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
                            </span>
                            <span className="text-xs text-muted-foreground">
                                ({totalReturn >= 0 ? '+' : ''}{formatCurrency(portfolioMetrics.totalReturn)}) all time
                            </span>
                        </div>
                    </div>
                    <Button
                        size="lg"
                        className="gradient-brand text-white border-0 shadow-lg glow-primary hover:opacity-90 transition-opacity gap-2"
                        onClick={() => navigate({ to: "/app/trade" })}
                    >
                        <Activity className="h-4 w-4" /> Trade Now
                    </Button>
                </div>

                {/* Equity Curve */}
                <Card className="overflow-hidden animate-slide-up delay-100 glass border-border/50">
                    <CardContent className="p-0">
                        <PortfolioChartPanel data={equityHistory} timeframe={timeframe} onTimeframeChange={setTimeframe} />
                    </CardContent>
                </Card>

                {/* AI Daily Brief */}
                <DailyBrief />

                {/* Stat Cards */}
                <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                    <StatCard title="Total Equity" value={formatCurrency(equity)} icon={DollarSign} change={totalReturn} loading={positionsLoading} className="delay-75" />
                    <StatCard title="Cash Available" value={formatCurrency(cash)} subtitle={`${portfolioMetrics.cashPct.toFixed(0)}% of portfolio`} icon={Briefcase} loading={positionsLoading} className="delay-150" />
                    <StatCard title="Invested" value={formatCurrency(investedValue)} subtitle={`${sectorCount} position${sectorCount !== 1 ? 's' : ''}`} icon={PieChart} loading={positionsLoading} className="delay-[225ms]" />
                    <StatCard title="Day P&L" value="--" subtitle="Updates during market hours" icon={BarChart3} loading={false} className="delay-300" />
                </div>

                {/* Risk + Allocation Row */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <RiskSnapshot
                        hhi={portfolioMetrics.hhi}
                        concentrationLabel={portfolioMetrics.concentrationLabel}
                        maxDrawdown={maxDrawdown}
                        positionCount={portfolioMetrics.positionCount}
                    />
                    <Card className="lg:col-span-2 animate-slide-up overflow-hidden relative glass border-border/50">
                        <div className="absolute -top-10 -left-10 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none animate-glow-pulse" />
                        <CardHeader className="pb-2 relative z-10">
                            <div className="flex items-center gap-2">
                                <PieChart className="h-5 w-5 text-primary" />
                                <CardTitle className="text-base font-semibold">Portfolio Allocation</CardTitle>
                            </div>
                            <CardDescription>Current holdings breakdown by position weight.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <AllocationDonut allocation={portfolioMetrics.allocation} cash={cash} equity={equity} />
                        </CardContent>
                    </Card>
                </div>

                {/* Middle row: Top Movers + Daily Quest */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Card className="lg:col-span-2 animate-slide-up delay-400 overflow-hidden relative glass border-border/50">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none animate-glow-pulse" />
                        <CardHeader className="pb-2 relative z-10">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-base font-semibold">Biggest Drivers Today</CardTitle>
                                    <CardDescription>Your positions with the largest impact.</CardDescription>
                                </div>
                                <div className="h-8 w-8 rounded-full bg-[hsl(var(--warning))]/10 flex items-center justify-center">
                                    <Zap className="h-4 w-4 text-[hsl(var(--warning))] animate-float-slow" />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {topMovers.length === 0 ? (
                                <EmptyState icon={<Target className="h-6 w-6" />} title="No positions yet" description="Place your first trade to see drivers here." action={() => navigate({ to: "/app/trade" })} actionLabel="Start Trading" />
                            ) : (
                                topMovers.map(p => (
                                    <PositionRow key={p.symbol} symbol={p.symbol} qty={p.qty} avgCost={p.avg_cost} currentPrice={p.current_price ?? p.avg_cost} onClick={() => navigate({ to: "/app/trade/$symbol", params: { symbol: p.symbol } })} />
                                ))
                            )}
                        </CardContent>
                    </Card>
                    <DailyQuestCard />
                </div>

                {/* Holdings + Recent Activity */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 relative z-10">
                    <Card className="lg:col-span-4 overflow-hidden animate-slide-up delay-[600ms] relative glass border-border/50">
                        <div className="absolute -top-10 -left-10 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none animate-glow-pulse" />
                        <CardHeader className="relative z-10">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-base font-semibold">Holdings</CardTitle>
                                    <CardDescription>{positions?.length ?? 0} active position{(positions?.length ?? 0) !== 1 ? 's' : ''}</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {positions?.length === 0 || !positions ? (
                                <EmptyState icon={<PieChart className="h-6 w-6" />} title="Your portfolio is empty" description="Head to the Trade page to buy your first stock and start building your portfolio." action={() => navigate({ to: "/app/trade" })} actionLabel="Start Trading" />
                            ) : (
                                <div className="scrollbar-thin max-h-80 overflow-y-auto">
                                    {positions.map(p => (
                                        <PositionRow key={p.symbol} symbol={p.symbol} qty={p.qty} avgCost={p.avg_cost} currentPrice={p.current_price ?? p.avg_cost} onClick={() => navigate({ to: "/app/trade/$symbol", params: { symbol: p.symbol } })} />
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="lg:col-span-3 animate-slide-up delay-[700ms] overflow-hidden relative glass border-border/50">
                        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none animate-glow-pulse" />
                        <CardHeader className="relative z-10">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
                                    <CardDescription>Latest orders and fills.</CardDescription>
                                </div>
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Activity className="h-4 w-4 text-primary" />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3 scrollbar-thin max-h-72 overflow-y-auto pr-1">
                                {orders?.slice(0, 8).map(order => (
                                    <div key={order.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${order.side === 'buy' ? 'bg-[hsl(var(--chart-up))]/10' : 'bg-[hsl(var(--chart-down))]/10'}`}>
                                            {order.side === 'buy' ? <ArrowUpRight className="h-4 w-4 text-[hsl(var(--chart-up))]" /> : <ArrowDownRight className="h-4 w-4 text-[hsl(var(--chart-down))]" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium">{order.side.toUpperCase()} {order.qty} {order.symbol}</div>
                                            <div className="text-[10px] text-muted-foreground">{new Date(order.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                                        </div>
                                        <Badge variant={order.status === 'filled' ? 'default' : order.status === 'rejected' ? 'destructive' : 'outline'} className="text-[10px] capitalize">{order.status}</Badge>
                                    </div>
                                ))}
                                {(!orders || orders.length === 0) && (
                                    <EmptyState icon={<Activity className="h-6 w-6" />} title="No recent activity" description="Your latest orders and fills will appear here." />
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppShell>
    )
}
