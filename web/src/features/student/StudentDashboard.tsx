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
    Zap, Target, BarChart3, PieChart
} from "lucide-react"
import { AppShell } from "@/components/layout/AppShell"
import { PortfolioChartPanel } from "./components/PortfolioChartPanel"
import { DailyQuestCard } from "./components/DailyQuestCard"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useMemo, useState } from "react"
import { DailyBrief } from "@/features/mentor/MentorPanel"
import { computePortfolioMetrics, type PositionData } from "@/lib/portfolio-calc"
import { EmptyState, SkeletonGrid } from "@/components/ui/states"
import { useXPLevel } from "@/hooks/useXPLevel"
import { LevelUpModal } from "@/components/ui/level-up-modal"

/** Stat card with icon, value, subtitle, and optional change indicator */
function StatCard({ title, value, subtitle, icon: Icon, change, loading, className }: {
    title: string
    value: string
    subtitle?: string
    icon: React.ComponentType<{ className?: string, style?: React.CSSProperties }>
    change?: number
    loading?: boolean
    className?: string
}) {
    return (
        <Card className={`card-hover animate-slide-up overflow-hidden relative glass border-border/50 ${className || ''}`}>
            {/* Ambient glow in corner */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/20 rounded-full blur-3xl pointer-events-none animate-glow-pulse" />

            <CardContent className="p-5 relative z-10">
                {loading ? (
                    <div className="space-y-3">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-8 w-32" />
                        <Skeleton className="h-3 w-20" />
                    </div>
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

/** Position row for holdings table */
function PositionRow({ symbol, qty, avgCost, currentPrice, onClick }: {
    symbol: string; qty: number; avgCost: number; currentPrice: number; onClick: () => void
}) {
    const marketValue = qty * currentPrice
    const unrealizedPnl = (currentPrice - avgCost) * qty
    const pnlPct = avgCost > 0 ? ((currentPrice - avgCost) / avgCost) * 100 : 0
    const isUp = unrealizedPnl >= 0

    return (
        <div
            className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer border-b last:border-0"
            onClick={onClick}
        >
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
    const equity = portfolioMetrics.equity
    const totalReturn = portfolioMetrics.totalReturnPct
    const cash = portfolioMetrics.cash
    const investedValue = portfolioMetrics.investedValue

    // Compute top movers from positions
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

    // Sector allocation stub (from positions)
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
                        <AlertDescription>
                            Your teacher has paused trading. You can still view your portfolio and performance.
                        </AlertDescription>
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
                        <Activity className="h-4 w-4" />
                        Trade Now
                    </Button>
                </div>

                {/* Equity Curve */}
                <Card className="overflow-hidden animate-slide-up bg-card">
                    <CardContent className="p-0">
                        <PortfolioChartPanel
                            data={equityHistory}
                            timeframe={timeframe}
                            onTimeframeChange={setTimeframe}
                        />
                    </CardContent>
                </Card>

                {/* AI Daily Brief */}
                <DailyBrief />

                {/* Stat Cards */}
                <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        title="Total Equity"
                        value={formatCurrency(equity)}
                        icon={DollarSign}
                        change={totalReturn}
                        loading={positionsLoading}
                        className="delay-75"
                    />
                    <StatCard
                        title="Cash Available"
                        value={formatCurrency(cash)}
                        subtitle={`${portfolioMetrics.cashPct.toFixed(0)}% of portfolio`}
                        icon={Briefcase}
                        loading={positionsLoading}
                        className="delay-150"
                    />
                    <StatCard
                        title="Invested"
                        value={formatCurrency(investedValue)}
                        subtitle={`${sectorCount} position${sectorCount !== 1 ? 's' : ''}`}
                        icon={PieChart}
                        loading={positionsLoading}
                        className="delay-[225ms]"
                    />
                    <StatCard
                        title="Day P&L"
                        value="--"
                        subtitle="Updates during market hours"
                        icon={BarChart3}
                        loading={false}
                        className="delay-300"
                    />
                </div>

                {/* Middle row: Top Movers + Next Action */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {/* Top Movers */}
                    <Card className="lg:col-span-2 animate-slide-up delay-400 overflow-hidden relative glass border-border/50">
                        {/* Ambient glow */}
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
                                <EmptyState
                                    icon={<Target className="h-6 w-6" />}
                                    title="No positions yet"
                                    description="Place your first trade to see drivers here."
                                    action={() => navigate({ to: "/app/trade" })}
                                    actionLabel="Start Trading"
                                />
                            ) : (
                                topMovers.map(p => (
                                    <PositionRow
                                        key={p.symbol}
                                        symbol={p.symbol}
                                        qty={p.qty}
                                        avgCost={p.avg_cost}
                                        currentPrice={p.current_price ?? p.avg_cost}
                                        onClick={() => navigate({ to: "/app/trade/$symbol", params: { symbol: p.symbol } })}
                                    />
                                ))
                            )}
                        </CardContent>
                    </Card>

                    {/* Daily Quest / Next Mission */}
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
                                <EmptyState
                                    icon={<PieChart className="h-6 w-6" />}
                                    title="Your portfolio is empty"
                                    description="Head to the Trade page to buy your first stock and start building your portfolio."
                                    action={() => navigate({ to: "/app/trade" })}
                                    actionLabel="Start Trading"
                                />
                            ) : (
                                <div className="scrollbar-thin max-h-80 overflow-y-auto">
                                    {positions.map(p => (
                                        <PositionRow
                                            key={p.symbol}
                                            symbol={p.symbol}
                                            qty={p.qty}
                                            avgCost={p.avg_cost}
                                            currentPrice={p.current_price ?? p.avg_cost}
                                            onClick={() => navigate({ to: "/app/trade/$symbol", params: { symbol: p.symbol } })}
                                        />
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
                                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${order.side === 'buy'
                                            ? 'bg-[hsl(var(--chart-up))]/10'
                                            : 'bg-[hsl(var(--chart-down))]/10'
                                            }`}>
                                            {order.side === 'buy'
                                                ? <ArrowUpRight className="h-4 w-4 text-[hsl(var(--chart-up))]" />
                                                : <ArrowDownRight className="h-4 w-4 text-[hsl(var(--chart-down))]" />
                                            }
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium">
                                                {order.side.toUpperCase()} {order.qty} {order.symbol}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground">
                                                {new Date(order.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                        <Badge
                                            variant={order.status === 'filled' ? 'default' : order.status === 'rejected' ? 'destructive' : 'outline'}
                                            className="text-[10px] capitalize"
                                        >
                                            {order.status}
                                        </Badge>
                                    </div>
                                ))}
                                {(!orders || orders.length === 0) && (
                                    <EmptyState
                                        icon={<Activity className="h-6 w-6" />}
                                        title="No recent activity"
                                        description="Your latest orders and fills will appear here."
                                    />
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppShell>
    )
}
