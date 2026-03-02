import { useState, useMemo } from "react"
import { useActiveAccount } from "@/hooks/useActiveAccount"
import { usePositions, useOrders, useEquityHistory } from "@/features/student/hooks"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { AppShell } from "@/components/layout/AppShell"
import { formatCurrency } from "@/lib/utils"
import {
    ArrowUpRight, ArrowDownRight, PieChart, BarChart3, Info, ChevronRight, Activity
} from "lucide-react"
import { useNavigate } from "@tanstack/react-router"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { computeMaxDrawdown, computePortfolioMetrics, type PositionData } from "@/lib/portfolio-calc"
import { EmptyState, SkeletonGrid } from "@/components/ui/states"

/** Metric with explanation tooltip */
function MetricRow({ label, value, description, valueColor }: {
    label: string; value: string; description: string; valueColor?: string
}) {
    return (
        <div className="flex items-center justify-between py-2.5 border-b last:border-0">
            <div className="flex items-center gap-1.5">
                <span className="text-sm text-muted-foreground">{label}</span>
                <TooltipProvider delayDuration={200}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground/50 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                            <p className="text-xs">{description}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
            <span className={`text-sm font-semibold stat-number ${valueColor || ""}`}>{value}</span>
        </div>
    )
}

/** SVG donut chart for allocation */
function AllocationDonut({ segments }: { segments: { label: string; value: number; color: string }[] }) {
    const total = segments.reduce((s, seg) => s + seg.value, 0)
    if (total === 0) return <div className="text-center py-8 text-sm text-muted-foreground">No positions</div>

    let accumulated = 0
    const size = 120
    const radius = 48
    const cx = size / 2
    const cy = size / 2

    return (
        <div className="flex items-center gap-6">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                {segments.map((seg, i) => {
                    const pct = seg.value / total
                    const startAngle = accumulated * 2 * Math.PI - Math.PI / 2
                    accumulated += pct
                    const endAngle = accumulated * 2 * Math.PI - Math.PI / 2
                    const largeArc = pct > 0.5 ? 1 : 0
                    const x1 = cx + radius * Math.cos(startAngle)
                    const y1 = cy + radius * Math.sin(startAngle)
                    const x2 = cx + radius * Math.cos(endAngle)
                    const y2 = cy + radius * Math.sin(endAngle)
                    return (
                        <path
                            key={i}
                            d={`M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                            fill={seg.color}
                            stroke="hsl(var(--card))"
                            strokeWidth="2"
                        />
                    )
                })}
                <circle cx={cx} cy={cy} r={radius * 0.55} fill="hsl(var(--card))" />
            </svg>
            <div className="space-y-1.5 flex-1">
                {segments.map((seg, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                        <div className="h-2.5 w-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: seg.color }} />
                        <span className="flex-1 text-muted-foreground truncate">{seg.label}</span>
                        <span className="font-medium stat-number">{((seg.value / total) * 100).toFixed(1)}%</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

const COLORS = ["#3b82f6", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#6366f1"]

export function PortfolioPage() {
    const { data: account, isLoading: accountLoading } = useActiveAccount()
    const { data: positions } = usePositions()
    const { data: orders } = useOrders()
    const { data: equityHistory } = useEquityHistory(account?.id)
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState("overview")

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
    const metrics = useMemo(
        () => computePortfolioMetrics(positionData, account?.cash_balance ?? 0, startingCash),
        [positionData, account?.cash_balance, startingCash]
    )
    const equity = metrics.equity
    const totalReturn = metrics.totalReturnPct
    const cash = metrics.cash

    // Allocation breakdown
    const allocation = useMemo(() => {
        if (metrics.allocation.length === 0) return []
        return metrics.allocation.map((position, i) => ({
            label: position.symbol,
            value: position.value,
            color: COLORS[i % COLORS.length]
        }))
    }, [metrics.allocation])
    const hhi = metrics.hhi

    // Max drawdown from equity history
    const maxDrawdown = useMemo(() => {
        return computeMaxDrawdown(equityHistory ?? [])
    }, [equityHistory])

    if (accountLoading) {
        return (
            <AppShell role="student">
                <div className="p-4 md:p-8 space-y-6">
                    <SkeletonGrid count={2} className="grid-cols-1 md:grid-cols-2 lg:grid-cols-2" />
                    <Skeleton className="h-96 w-full rounded-xl" />
                </div>
            </AppShell>
        )
    }

    return (
        <AppShell role="student">
            <div className="p-4 md:p-8 space-y-6 animate-fade-in">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Portfolio Analytics</h1>
                    <p className="text-sm text-muted-foreground mt-1">Deep dive into your performance, risk, and allocation.</p>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="holdings">Holdings</TabsTrigger>
                        <TabsTrigger value="performance">Performance</TabsTrigger>
                        <TabsTrigger value="risk">Risk</TabsTrigger>
                        <TabsTrigger value="history">History</TabsTrigger>
                    </TabsList>

                    {/* OVERVIEW TAB */}
                    <TabsContent value="overview" className="space-y-4 mt-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            {/* Key Metrics */}
                            <Card className="animate-slide-up delay-100 relative glass border-border/50 overflow-hidden">
                                <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none -z-0 animate-glow-pulse" />
                                <CardHeader className="pb-2 relative z-10">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <BarChart3 className="h-4 w-4 text-primary animate-float" /> Key Metrics
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <MetricRow label="Total Equity" value={formatCurrency(equity)} description="Total value of all positions plus cash." />
                                    <MetricRow label="Total Return" value={`${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}%`} description="Percentage change from your starting cash." valueColor={totalReturn >= 0 ? 'text-[hsl(var(--chart-up))]' : 'text-[hsl(var(--chart-down))]'} />
                                    <MetricRow label="Cash" value={formatCurrency(cash)} description="Uninvested cash available for trading." />
                                    <MetricRow label="Positions" value={String(metrics.positionCount)} description="Number of distinct stocks you currently hold." />
                                    <MetricRow label="Max Drawdown" value={`-${maxDrawdown.toFixed(2)}%`} description="The largest peak-to-trough decline in your portfolio value. Lower is better." valueColor="text-[hsl(var(--chart-down))]" />
                                </CardContent>
                            </Card>

                            {/* Allocation */}
                            <Card className="animate-slide-up delay-200 relative glass border-border/50 overflow-hidden mt-4 md:mt-0">
                                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-[hsl(var(--accent-indigo))]/10 rounded-full blur-3xl pointer-events-none -z-0 animate-glow-pulse" />
                                <CardHeader className="pb-2 relative z-10">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <PieChart className="h-4 w-4 text-primary animate-float" style={{ animationDelay: '0.5s' }} /> Allocation
                                    </CardTitle>
                                    <CardDescription>How your capital is distributed across positions.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {allocation.length > 0 ? (
                                        <>
                                            <AllocationDonut segments={[...allocation, { label: "Cash", value: cash, color: "#6b7280" }]} />
                                            <div className="mt-3 pt-3 border-t">
                                                <MetricRow
                                                    label="Concentration (HHI)"
                                                    value={hhi.toFixed(0)}
                                                    description={`Herfindahl-Hirschman Index. Under 1500 = diversified, 1500-2500 = moderate, 2500+ = concentrated. Yours: ${hhi < 1500 ? 'Diversified' : hhi < 2500 ? 'Moderate' : 'Concentrated'}.`}
                                                    valueColor={hhi < 1500 ? 'text-[hsl(var(--chart-up))]' : hhi < 2500 ? 'text-[hsl(var(--warning))]' : 'text-[hsl(var(--chart-down))]'}
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        <EmptyState
                                            icon={<PieChart className="h-6 w-6" />}
                                            title="No positions to analyze"
                                            description="Place your first trade to unlock allocation insights."
                                            action={() => navigate({ to: "/app/trade" })}
                                            actionLabel="Trade Now"
                                        />
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* HOLDINGS TAB */}
                    <TabsContent value="holdings" className="mt-4">
                        <Card className="animate-slide-up delay-100 relative glass border-border/50 overflow-hidden">
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none -z-0 animate-glow-pulse" />
                            <CardHeader className="relative z-10">
                                <CardTitle className="text-base">Current Holdings</CardTitle>
                                <CardDescription>All open positions with unrealized P&L.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                {!positions || positions.length === 0 ? (
                                    <EmptyState
                                        icon={<PieChart className="h-6 w-6" />}
                                        title="No positions"
                                        description="Place your first trade to populate this table."
                                        action={() => navigate({ to: "/app/trade" })}
                                        actionLabel="Trade Now"
                                    />
                                ) : (
                                    <div className="divide-y">
                                        {positions.map(p => {
                                            const mv = p.qty * (p.current_price ?? p.avg_cost)
                                            const pnl = ((p.current_price ?? p.avg_cost) - p.avg_cost) * p.qty
                                            const pnlPct = p.avg_cost > 0 ? ((p.current_price ?? p.avg_cost) - p.avg_cost) / p.avg_cost * 100 : 0
                                            const isUp = pnl >= 0
                                            return (
                                                <div key={p.symbol} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/50 cursor-pointer transition-colors"
                                                    onClick={() => navigate({ to: "/app/trade/$symbol", params: { symbol: p.symbol } })}>
                                                    <div className="h-10 w-10 rounded-lg gradient-brand flex items-center justify-center flex-shrink-0">
                                                        <span className="text-xs font-bold text-white">{p.symbol.slice(0, 2)}</span>
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="font-semibold text-sm">{p.symbol}</div>
                                                        <div className="text-xs text-muted-foreground">{p.qty} shares · Avg {formatCurrency(p.avg_cost)}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-semibold text-sm stat-number">{formatCurrency(mv)}</div>
                                                        <div className={`text-xs font-medium stat-number ${isUp ? 'text-[hsl(var(--chart-up))]' : 'text-[hsl(var(--chart-down))]'}`}>
                                                            {isUp ? '+' : ''}{formatCurrency(pnl)} ({isUp ? '+' : ''}{pnlPct.toFixed(1)}%)
                                                        </div>
                                                    </div>
                                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* PERFORMANCE TAB */}
                    <TabsContent value="performance" className="space-y-4 mt-4">
                        <Card className="animate-slide-up delay-100 relative glass border-border/50 overflow-hidden">
                            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none -z-0 animate-glow-pulse" />
                            <CardHeader className="relative z-10">
                                <CardTitle className="text-base">Performance Summary</CardTitle>
                                <CardDescription>Your returns over time.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <MetricRow label="Total Return" value={`${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}%`} description="Overall percentage return since inception." valueColor={totalReturn >= 0 ? 'text-[hsl(var(--chart-up))]' : 'text-[hsl(var(--chart-down))]'} />
                                <MetricRow label="Absolute P&L" value={`${totalReturn >= 0 ? '+' : ''}${formatCurrency(metrics.totalReturn)}`} description="Dollar amount gained or lost." valueColor={totalReturn >= 0 ? 'text-[hsl(var(--chart-up))]' : 'text-[hsl(var(--chart-down))]'} />
                                <MetricRow label="Starting Capital" value={formatCurrency(startingCash)} description="Initial cash deposited into your simulation account." />
                                <MetricRow label="Data Points" value={String(equityHistory?.length ?? 0)} description="Number of daily snapshots recorded for your equity curve." />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">How to Improve</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground space-y-2">
                                <p>📊 <strong>Diversify</strong> — Spread risk across sectors to reduce concentration.</p>
                                <p>📝 <strong>Journal</strong> — Document your rationale to learn from wins and losses.</p>
                                <p>🎯 <strong>Set targets</strong> — Define exit prices to avoid emotional decisions.</p>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* RISK TAB */}
                    <TabsContent value="risk" className="space-y-4 mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Risk Metrics</CardTitle>
                                <CardDescription>Understand your portfolio's risk exposure.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <MetricRow label="Max Drawdown" value={`-${maxDrawdown.toFixed(2)}%`} description="Largest peak-to-trough decline. A 20%+ drawdown is aggressive." valueColor="text-[hsl(var(--chart-down))]" />
                                <MetricRow label="Concentration (HHI)" value={hhi.toFixed(0)} description="Lower = more diversified. Under 1500 is well-diversified." valueColor={hhi < 1500 ? 'text-[hsl(var(--chart-up))]' : 'text-[hsl(var(--chart-down))]'} />
                                <MetricRow label="Cash %" value={`${metrics.cashPct.toFixed(1)}%`} description="Percentage of portfolio held as cash. Too high = underinvested, too low = no cushion." />
                                <MetricRow label="Position Count" value={String(metrics.positionCount)} description="More positions generally = more diversified, but only if across different sectors." />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Risk Interpretation</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground space-y-2">
                                {hhi > 2500 && <p>⚠️ Your portfolio is <strong>highly concentrated</strong>. Consider adding positions in different sectors.</p>}
                                {hhi <= 2500 && hhi > 1500 && <p>🟡 Your concentration is <strong>moderate</strong>. You could benefit from a bit more diversification.</p>}
                                {hhi <= 1500 && <p>✅ Your portfolio is <strong>well-diversified</strong>. Keep monitoring sector exposure.</p>}
                                {maxDrawdown > 15 && <p>⚠️ Your max drawdown of {maxDrawdown.toFixed(1)}% is significant. Consider smaller position sizes.</p>}
                                {maxDrawdown <= 15 && maxDrawdown > 0 && <p>✅ Your drawdown is manageable at {maxDrawdown.toFixed(1)}%.</p>}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* HISTORY TAB */}
                    <TabsContent value="history" className="mt-4">
                        <Card className="animate-slide-up delay-100 relative glass border-border/50 overflow-hidden">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none -z-0 animate-glow-pulse" />
                            <CardHeader className="relative z-10">
                                <CardTitle className="text-base">Order History</CardTitle>
                                <CardDescription>All orders placed in this competition.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                {!orders || orders.length === 0 ? (
                                    <EmptyState
                                        icon={<Activity className="h-6 w-6" />}
                                        title="No orders yet"
                                        description="Your order history will appear here after you place trades."
                                        action={() => navigate({ to: "/app/trade" })}
                                        actionLabel="Place a Trade"
                                    />
                                ) : (
                                    <div className="divide-y max-h-[500px] overflow-y-auto scrollbar-thin">
                                        {orders.map(o => (
                                            <div key={o.id} className="flex items-center gap-3 px-5 py-3">
                                                <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${o.side === 'buy' ? 'bg-[hsl(var(--chart-up))]/10' : 'bg-[hsl(var(--chart-down))]/10'}`}>
                                                    {o.side === 'buy' ? <ArrowUpRight className="h-4 w-4 text-[hsl(var(--chart-up))]" /> : <ArrowDownRight className="h-4 w-4 text-[hsl(var(--chart-down))]" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium">{o.side.toUpperCase()} {o.qty} {o.symbol}</div>
                                                    <div className="text-[10px] text-muted-foreground">{o.order_type} · {new Date(o.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                                                </div>
                                                <Badge variant={o.status === 'filled' ? 'default' : o.status === 'rejected' ? 'destructive' : 'outline'} className="text-[10px] capitalize">{o.status}</Badge>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AppShell>
    )
}
