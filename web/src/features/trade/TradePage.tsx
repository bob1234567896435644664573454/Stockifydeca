import { useParams, useNavigate } from "@tanstack/react-router"
import { TradingViewWidget } from "./components/TradingViewWidget"
import { OrderTicket } from "./components/OrderTicket"
import { MarketProvider } from "./components/MarketContextObject"
import { type MarketRule } from "./components/MarketContextObject"
import { useMarketData, useOrders } from "@/features/student/hooks"
import { Badge } from "@/components/ui/badge"
import { cn, formatCurrency } from "@/lib/utils"
import { type Time, type CandlestickData, type SeriesMarker, type LineWidth } from "lightweight-charts"
import { useState, useMemo } from "react"
import { DataTable } from "@/components/ui/data-table"
import { type ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { ChartControls, type Timeframe } from "../charts/ChartControls"
import { ProCandlestickChart } from "../charts/ProCandlestickChart"
import { useChartData, useRealtimeChart } from "../charts/hooks"
import { calculateSMA, calculateEMA, calculateVWAP, calculateRSI } from "@/lib/indicators"
import { ChartLegend } from "../charts/ChartLegend"
import { AppShell } from "@/components/layout/AppShell"
import { Watchlist } from "./components/Watchlist"
import { useWatchlist } from "./hooks/useWatchlist"
import { Star, Newspaper, BarChart2, Info } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Placeholder Components
function FundamentalsGrid() {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
            {[
                { label: "Market Cap", value: "2.8T" },
                { label: "P/E Ratio", value: "28.5" },
                { label: "Dividend Yield", value: "0.5%" },
                { label: "52W High", value: "198.23" },
                { label: "52W Low", value: "124.17" },
                { label: "Volume", value: "54.2M" },
                { label: "Avg Volume", value: "62.1M" },
                { label: "Beta", value: "1.15" },
            ].map(f => (
                <div key={f.label} className="flex flex-col border rounded-lg p-3 bg-card">
                    <span className="text-xs text-muted-foreground">{f.label}</span>
                    <span className="font-semibold">{f.value}</span>
                </div>
            ))}
        </div>
    )
}

function NewsList() {
    return (
        <div className="space-y-4 p-4">
            {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-4 border-b pb-4 last:border-0 hover:bg-muted/30 p-2 rounded transition-colors cursor-pointer">
                    <div className="h-20 w-32 bg-muted rounded-md shrink-0 flex items-center justify-center">
                        <Newspaper className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-xs text-primary font-medium mb-1">Market Insights • 2h ago</div>
                        <h4 className="font-semibold text-sm line-clamp-2 mb-1">Tech Stocks Rally on Positive Earnings Data and Federal Reserve Comments</h4>
                        <p className="text-xs text-muted-foreground line-clamp-1">Major technology companies exceed expectations in Q3 pushing indices to new highs.</p>
                    </div>
                </div>
            ))}
        </div>
    )
}

// Quick Search Component
function SymbolSearch({ onSelect }: { onSelect: (s: string) => void }) {
    const [q, setQ] = useState("")

    return (
        <div className="p-4 border-b">
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    className="pl-9"
                    placeholder="Search symbol (e.g. AAPL)..."
                    value={q}
                    onChange={(e) => setQ(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && q) {
                            onSelect(q)
                            setQ("")
                        }
                    }}
                />
            </div>
        </div>
    )
}

export function TradePage() {
    const { symbol: paramSymbol } = useParams({ strict: false })
    const navigate = useNavigate()
    const activeSymbol = (paramSymbol || "AAPL").toUpperCase()

    const { data: context, isLoading } = useMarketData(activeSymbol)

    // Chart State
    const [mode, setMode] = useState<'simple' | 'pro'>('simple')
    const [timeframe, setTimeframe] = useState<Timeframe>('1m')
    const [showVolume, setShowVolume] = useState(true)
    const [showSMA, setShowSMA] = useState(false)
    const [showEMA, setShowEMA] = useState(false)
    const [showVWAP, setShowVWAP] = useState(false)
    const [showRSI, setShowRSI] = useState(false)

    const { toggleSymbol, isInWatchlist } = useWatchlist()
    const isWatched = isInWatchlist(activeSymbol)

    const proMode = mode === "pro"
    const { data: chartData } = useChartData(activeSymbol, timeframe, proMode)
    const realtimeBar = useRealtimeChart(activeSymbol, proMode)

    // Merge realtime bar into chart data
    const displayedData = useMemo(() => {
        if (!chartData?.bars) return [];
        const bars = [...chartData.bars];
        if (realtimeBar && bars.length > 0) {
            const lastBar = bars[bars.length - 1];
            if (realtimeBar.time >= lastBar.time) {
                // Update last bar or append? 
                // If time matches, update. If newer, append.
                if (realtimeBar.time === lastBar.time) {
                    bars[bars.length - 1] = realtimeBar;
                } else {
                    bars.push(realtimeBar);
                }
            }
        }
        return bars;
    }, [chartData?.bars, realtimeBar]);

    // Calculate Indicators
    const indicators = useMemo(() => {
        if (mode !== 'pro' || displayedData.length === 0) return [];
        const closes = displayedData.map(b => b.close);
        const inds = [];

        if (showSMA) {
            const sma20 = calculateSMA(closes, 20);
            inds.push({
                data: sma20.map((v, i) => ({ time: displayedData[i].time as Time, value: v })).filter(d => !isNaN(d.value)),
                color: '#2962FF',
                title: 'SMA 20'
            });
        }

        if (showEMA) {
            const ema20 = calculateEMA(closes, 20);
            inds.push({
                data: ema20.map((v, i) => ({ time: displayedData[i].time as Time, value: v })).filter(d => !isNaN(d.value)),
                color: '#FF6D00',
                title: 'EMA 20'
            });
        }

        if (showVWAP) {
            const vwapData = calculateVWAP(displayedData.map(d => ({
                high: d.high,
                low: d.low,
                close: d.close,
                volume: d.volume || 0
            })));
            inds.push({
                data: vwapData.map((v, i) => ({ time: displayedData[i].time as Time, value: v })).filter(d => !isNaN(d.value)),
                color: '#E91E63',
                title: 'VWAP',
                lineWidth: 2 as LineWidth
            });
        }

        if (showRSI) {
            const rsiData = calculateRSI(closes, 14);
            inds.push({
                data: rsiData.map((v, i) => ({ time: displayedData[i].time as Time, value: v })).filter(d => !isNaN(d.value)),
                color: '#9C27B0',
                title: 'RSI 14',
                priceScaleId: 'rsi',
                scaleMargins: { top: 0.8, bottom: 0 }
            });
        }

        return inds;
    }, [mode, displayedData, showSMA, showEMA, showVWAP, showRSI]);

    // Construct context value
    const marketContextValue = {
        symbol: activeSymbol,
        price: context?.price || 0,
        change: context?.change || 0,
        changePercent: context?.change_percent || 0,
        isLoading,
        position: context?.position ?? null,
        rules: context?.rules as unknown as MarketRule,
        competitionId: context?.competition_id,
        trading_enabled: context?.trading_enabled
    }

    // Orders for Markers
    const { data: allOrders } = useOrders(undefined, proMode)
    const markers = useMemo(() => {
        if (mode !== 'pro' || !allOrders) return []
        return allOrders
            .filter(o => o.symbol === activeSymbol && o.status === 'filled')
            .map(o => ({
                time: (new Date(o.updated_at).getTime() / 1000) as Time,
                position: o.side === 'buy' ? 'belowBar' : 'aboveBar',
                color: o.side === 'buy' ? '#2196F3' : '#E91E63',
                shape: o.side === 'buy' ? 'arrowUp' : 'arrowDown',
                text: `${o.side.toUpperCase()} ${o.qty} @ ${formatCurrency(o.filled_avg_price ?? 0)}` // We assume filled_avg_price exists or use existing price field
            } as SeriesMarker<Time>))
            .sort((a, b) => (a.time as number) - (b.time as number))
    }, [mode, allOrders, activeSymbol])

    // Legend State
    const [crosshairData, setCrosshairData] = useState<CandlestickData | undefined>(undefined);

    // Derived Legend Data (Crosshair OR Last Candle)
    // Note: Items in displayedData are { time, open, high, low, close, volume? }
    // We cast to CandlestickData for safety in setCrosshairData, 
    // but displayedData comes from useMemo merging realtime.
    const legendData = useMemo(() => {
        if (crosshairData) return crosshairData;
        if (displayedData.length > 0) return displayedData[displayedData.length - 1] as CandlestickData;
        return undefined;
    }, [crosshairData, displayedData]);

    // Memoize historical data to prevent unnecessary chart resets
    const historicalData = useMemo(() => {
        if (mode !== 'pro') return []
        return chartData?.bars?.map(b => ({ ...b, time: b.time as Time })) || []
    }, [mode, chartData?.bars])

    // Order Table Columns
    const orderColumns: ColumnDef<any, any>[] = useMemo(() => [
        {
            header: "Time",
            accessorKey: "updated_at",
            cell: ({ row }) => <span className="text-muted-foreground text-xs">{format(new Date(row.original.updated_at), "MMM d, HH:mm:ss")}</span>
        },
        {
            header: "Side",
            accessorKey: "side",
            cell: ({ row }) => (
                <Badge variant={row.original.side === 'buy' ? "default" : "destructive"} className="text-[10px] uppercase">
                    {row.original.side}
                </Badge>
            )
        },
        {
            header: "Type",
            accessorKey: "order_type",
            cell: ({ row }) => <span className="text-xs uppercase">{row.original.order_type}</span>
        },
        {
            header: "Qty",
            accessorKey: "qty",
            cell: ({ row }) => <span className="font-mono text-xs">{row.original.qty}</span>
        },
        {
            header: "Price",
            accessorKey: "price",
            cell: ({ row }) => (
                <div className="text-right font-mono text-xs">
                    {row.original.status === 'filled' ? formatCurrency(row.original.filled_avg_price || 0) : row.original.price ? formatCurrency(row.original.price) : 'MKT'}
                </div>
            )
        },
        {
            header: "Status",
            accessorKey: "status",
            cell: ({ row }) => {
                const colors: Record<string, string> = {
                    filled: "bg-green-100 text-green-800",
                    rejected: "bg-red-100 text-red-800",
                    open: "bg-blue-100 text-blue-800",
                    canceled: "bg-gray-100 text-gray-800"
                }
                return (
                    <div className="text-right">
                        <Badge variant="secondary" className={`text-[10px] capitalize ${colors[row.original.status] || ""}`}>
                            {row.original.status}
                        </Badge>
                    </div>
                )
            }
        }
    ], [])

    const recentOrders = useMemo(() => {
        return (allOrders || []).filter(o => o.symbol === activeSymbol).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    }, [allOrders, activeSymbol])

    return (
        <MarketProvider value={marketContextValue}>
            <AppShell role="student">
                <div className="flex flex-col h-[calc(100vh-4rem)] md:h-[calc(100vh-theme(spacing.0))] md:flex-row overflow-hidden">
                    {/* Sidebar: Search & Watchlists */}
                    <div className="hidden md:flex w-64 border-r bg-background flex-col shrink-0">
                        <SymbolSearch onSelect={(s) => navigate({ to: `/app/trade/$symbol`, params: { symbol: s } })} />
                        <Watchlist />
                    </div>

                    {/* Mobile Symbol Search */}
                    <div className="md:hidden border-b">
                        <SymbolSearch onSelect={(s) => navigate({ to: `/app/trade/$symbol`, params: { symbol: s } })} />
                    </div>

                    {/* Main Content: Chart & Tabs */}
                    <div className="flex-1 flex flex-col min-w-0 relative h-[50vh] md:h-auto overflow-y-auto">
                        {/* Quote Header */}
                        <div className="border-b p-4 md:p-6 bg-card flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{activeSymbol}</h2>
                                    <Badge variant="outline" className="text-xs">{context?.exchange || "US"}</Badge>
                                    <button onClick={() => toggleSymbol(activeSymbol)} className="text-muted-foreground hover:text-yellow-400 transition-colors">
                                        <Star className={cn("w-5 h-5", isWatched && "fill-yellow-400 text-yellow-400")} />
                                    </button>
                                </div>
                                <h3 className="text-sm text-muted-foreground">{activeSymbol} Inc.</h3>
                            </div>

                            <div className="flex items-baseline gap-3">
                                <div className="text-3xl font-bold stat-number tracking-tight">
                                    {formatCurrency(context?.price || 0)}
                                </div>
                                <div className={cn(
                                    "flex items-center text-sm font-semibold stat-number",
                                    (context?.change || 0) >= 0 ? "text-[hsl(var(--chart-up))]" : "text-[hsl(var(--chart-down))]"
                                )}>
                                    {(context?.change || 0) >= 0 ? "+" : ""}{(context?.change || 0).toFixed(2)}
                                    <span className="ml-1 opacity-80 backdrop-blur-sm rounded px-1.5 py-0.5" style={{ backgroundColor: (context?.change || 0) >= 0 ? 'hsla(var(--chart-up), 0.1)' : 'hsla(var(--chart-down), 0.1)' }}>
                                        ({(context?.change || 0) >= 0 ? "+" : ""}{(context?.change_percent || 0).toFixed(2)}%)
                                    </span>
                                </div>
                            </div>

                            {/* Position Mini-Stats */}
                            {(context?.position?.qty || 0) !== 0 && (
                                <div className="hidden lg:flex gap-6 pl-6 border-l text-sm">
                                    <div className="flex flex-col">
                                        <span className="text-muted-foreground text-xs uppercase tracking-wider">Position</span>
                                        <span className="font-semibold text-blue-600 dark:text-blue-400">{context?.position?.qty} shares</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-muted-foreground text-xs uppercase tracking-wider">Avg Cost</span>
                                        <span className="font-semibold">{formatCurrency(context?.position?.avg_cost || 0)}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Market Tabs */}
                        <Tabs defaultValue="chart" className="flex-1 flex flex-col">
                            <div className="px-4 border-b bg-card w-full">
                                <TabsList className="bg-transparent space-x-2 w-full justify-start h-12 overflow-x-auto scrollbar-none rounded-none p-0 border-b-0 space-x-6">
                                    <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12">
                                        <Info className="h-4 w-4 mr-2" /> Overview
                                    </TabsTrigger>
                                    <TabsTrigger value="chart" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12">
                                        <BarChart2 className="h-4 w-4 mr-2" /> Chart
                                    </TabsTrigger>
                                    <TabsTrigger value="fundamentals" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12">
                                        <BarChart2 className="h-4 w-4 mr-2" /> Fundamentals
                                    </TabsTrigger>
                                    <TabsTrigger value="news" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12">
                                        <Newspaper className="h-4 w-4 mr-2" /> News
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <TabsContent value="overview" className="flex-1 p-0 m-0 overflow-y-auto">
                                <div className="p-4 space-y-6">
                                    <div>
                                        <h3 className="font-semibold mb-3 tracking-tight">About {activeSymbol}</h3>
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            {activeSymbol} is a leading technology company specializing in consumer electronics, software, and online services.
                                            This is a simulated overview description meant for the learning environment.
                                            Notice the market data below for fundamental insights.
                                        </p>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold mb-3 tracking-tight">Key Statistics</h3>
                                        <FundamentalsGrid />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold mb-3 tracking-tight">Recent Headlines</h3>
                                        <NewsList />
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="chart" className="flex-1 flex flex-col m-0 p-0 overflow-hidden relative">
                                {/* Chart Controls */}
                                <ChartControls
                                    timeframe={timeframe}
                                    onTimeframeChange={setTimeframe}
                                    showVolume={showVolume}
                                    onToggleVolume={setShowVolume}
                                    showSMA={showSMA}
                                    onToggleSMA={setShowSMA}
                                    showEMA={showEMA}
                                    onToggleEMA={setShowEMA}
                                    showVWAP={showVWAP}
                                    onToggleVWAP={setShowVWAP}
                                    showRSI={showRSI}
                                    onToggleRSI={setShowRSI}
                                    mode={mode}
                                    onToggleMode={() => setMode(m => m === 'simple' ? 'pro' : 'simple')}
                                />

                                <div className="flex-[2] relative bg-black overflow-hidden flex flex-col min-h-[300px]">
                                    {mode === 'simple' ? (
                                        <TradingViewWidget symbol={activeSymbol} theme="dark" />
                                    ) : (
                                        <div className="flex-1 w-full h-full relative group">
                                            <ChartLegend
                                                symbol={activeSymbol}
                                                price={legendData?.close ?? context?.price ?? null}
                                                open={legendData?.open}
                                                high={legendData?.high}
                                                low={legendData?.low}
                                                close={legendData?.close}
                                                change={(legendData && legendData.close !== undefined && legendData.open !== undefined) ? (legendData.close - legendData.open) : null}
                                                changePercent={(legendData && legendData.close !== undefined && legendData.open !== undefined && legendData.open !== 0) ? ((legendData.close - legendData.open) / legendData.open) : null}
                                                volume={(legendData as { value?: number, volume?: number })?.value ?? (legendData as { value?: number, volume?: number })?.volume}
                                            />
                                            {historicalData.length > 0 ? (
                                                <ProCandlestickChart
                                                    data={historicalData}
                                                    lastCandle={realtimeBar ? { ...realtimeBar, time: realtimeBar.time as Time } : undefined}
                                                    volume={showVolume ? displayedData.map(b => ({ time: b.time as Time, value: b.volume || 0, color: (b.close >= b.open) ? '#26a69a80' : '#ef535080' })) : undefined}
                                                    indicators={indicators}
                                                    markers={markers}
                                                    autoSize={true}
                                                    height={450}
                                                    onCrosshairMove={setCrosshairData}
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-muted-foreground">Loading chart...</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-h-[150px] border-t bg-background overflow-hidden flex flex-col">
                                    <h3 className="font-semibold text-xs text-muted-foreground p-2 border-b uppercase tracking-wider bg-muted/20">Activity</h3>
                                    <div className="flex-1 overflow-auto">
                                        <DataTable
                                            columns={orderColumns}
                                            data={recentOrders}
                                            compact
                                            emptyMessage={`No orders for ${activeSymbol}.`}
                                            className="border-0"
                                            containerClassName="border-0 rounded-none max-h-full"
                                        />
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="fundamentals" className="flex-1 p-0 m-0 overflow-y-auto">
                                <FundamentalsGrid />
                            </TabsContent>

                            <TabsContent value="news" className="flex-1 p-0 m-0 overflow-y-auto">
                                <NewsList />
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* Right Sidebar: Order Ticket */}
                    <div className="w-full md:w-80 border-t md:border-l md:border-t-0 bg-background shrink-0 h-[40vh] md:h-auto overflow-y-auto">
                        <OrderTicket />
                    </div>
                </div>
            </AppShell>
        </MarketProvider>
    )
}
