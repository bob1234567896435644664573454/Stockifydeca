import { useState, useEffect, useMemo } from "react"
import { AppShell } from "@/components/layout/AppShell"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
    Search, TrendingUp, TrendingDown, Building2, BarChart3,
    Globe, DollarSign, Users, FileText, Loader2, ExternalLink,
    ArrowUpRight, ArrowDownRight, Activity, Shield,
    Target, Zap, Leaf, Eye, Award, ChevronRight, Newspaper,
    Bookmark, BookmarkCheck, AlertTriangle, StickyNote, Plus, X
} from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/api"
import { cn } from "@/lib/utils"

/* ─── Types ─── */
interface ProcessedStock {
    symbol: string
    name: string
    price: number
    change: number
    changePercent: number
    volume: number
    high52w: number
    low52w: number
    dayHigh: number
    dayLow: number
    previousClose: number
    exchange: string
    sector: string
    industry: string
    description: string
    website: string
    employees: number
    city: string
    state: string
    country: string
    shortTermOutlook: string
    intermediateOutlook: string
    longTermOutlook: string
    support: number
    resistance: number
    stopLoss: number
    valuationDescription: string
    valuationDiscount: string
    relativeValue: string
    targetPrice: number
    rating: string
    ratingProvider: string
    innovativeness: number
    hiring: number
    sustainability: number
    insiderSentiment: number
    earningsReports: number
    dividends: number
    sigDevs: { headline: string; date: string }[]
    reports: { title: string; date: string; provider: string }[]
    insiders: { name: string; relation: string; transaction: string; shares: number; date: string }[]
    filings: { type: string; title: string; date: string; url: string }[]
    priceHistory: { date: string; close: number }[]
    marketCap: number
}

interface Competitor {
    domain: string
    globalRank: number
    monthlyVisits: number
    bounceRate: number
    visitsTrend: { date: string; visits: number }[]
    bounceRateTrend: { date: string; rate: number }[]
    topCountries: { country: string; share: number; visits: number }[]
    trafficSources: Record<string, number>
}

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 })
const fmtVol = (n: number) => {
    if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
    if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
    return String(n)
}

const outlookColor = (d: string) => {
    if (!d) return "text-muted-foreground"
    const l = d.toLowerCase()
    if (l.includes("bull")) return "text-green-500"
    if (l.includes("bear")) return "text-red-500"
    return "text-yellow-500"
}
const outlookBg = (d: string) => {
    if (!d) return "bg-muted"
    const l = d.toLowerCase()
    if (l.includes("bull")) return "bg-green-500/10 border-green-500/20"
    if (l.includes("bear")) return "bg-red-500/10 border-red-500/20"
    return "bg-yellow-500/10 border-yellow-500/20"
}

/* ─── Mini Sparkline ─── */
function Sparkline({ data, color = "text-primary" }: { data: number[]; color?: string }) {
    if (!data || data.length < 2) return null
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1
    const w = 120
    const h = 32
    const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ")
    return (
        <svg width={w} height={h} className={cn("inline-block", color)}>
            <polyline fill="none" stroke="currentColor" strokeWidth="1.5" points={points} />
        </svg>
    )
}

/* ─── Score Bar ─── */
function ScoreBar({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
    const color = value >= 70 ? "bg-green-500" : value >= 40 ? "bg-yellow-500" : "bg-red-500"
    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-muted-foreground"><Icon className="h-3 w-3" />{label}</span>
                <span className="font-bold">{value}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full transition-all duration-700", color)} style={{ width: `${value}%` }} />
            </div>
        </div>
    )
}

/* ─── Risk Flags ─── */
function RiskFlags({ stock }: { stock: ProcessedStock }) {
    const flags: { label: string; severity: "high" | "medium" | "low"; detail: string }[] = []

    // High volatility
    if (stock.high52w > 0 && stock.low52w > 0) {
        const range52w = (stock.high52w - stock.low52w) / stock.low52w * 100
        if (range52w > 80) flags.push({ label: "High Volatility", severity: "high", detail: `52W range: ${range52w.toFixed(0)}%` })
        else if (range52w > 50) flags.push({ label: "Moderate Volatility", severity: "medium", detail: `52W range: ${range52w.toFixed(0)}%` })
    }

    // Near 52W high
    if (stock.price > 0 && stock.high52w > 0 && stock.price > stock.high52w * 0.95) {
        flags.push({ label: "Near 52W High", severity: "medium", detail: `${((stock.price / stock.high52w) * 100).toFixed(1)}% of high` })
    }

    // Near 52W low
    if (stock.price > 0 && stock.low52w > 0 && stock.price < stock.low52w * 1.1) {
        flags.push({ label: "Near 52W Low", severity: "high", detail: `${((stock.price / stock.low52w) * 100).toFixed(1)}% of low` })
    }

    // Bearish outlook
    const outlooks = [stock.shortTermOutlook, stock.intermediateOutlook, stock.longTermOutlook]
    const bearishCount = outlooks.filter(o => o?.toLowerCase().includes("bear")).length
    if (bearishCount >= 2) flags.push({ label: "Multiple Bearish Signals", severity: "high", detail: `${bearishCount}/3 outlooks bearish` })

    // Low insider sentiment
    if (stock.insiderSentiment > 0 && stock.insiderSentiment < 30) {
        flags.push({ label: "Low Insider Confidence", severity: "medium", detail: `Insider sentiment: ${stock.insiderSentiment}%` })
    }

    if (flags.length === 0) return null

    return (
        <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" /> Risk Flags
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {flags.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                        <div className={cn("h-2 w-2 rounded-full flex-shrink-0",
                            f.severity === "high" ? "bg-red-500" : f.severity === "medium" ? "bg-amber-500" : "bg-blue-500"
                        )} />
                        <span className="font-medium">{f.label}</span>
                        <span className="text-muted-foreground text-xs">— {f.detail}</span>
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}

/* ─── Catalyst Notes ─── */
function CatalystNotes({ symbol }: { symbol: string }) {
    const [notes, setNotes] = useState<{ id: string; text: string; date: string }[]>([])
    const [newNote, setNewNote] = useState("")
    const [showInput, setShowInput] = useState(false)

    // Load from localStorage
    useState(() => {
        try {
            const saved = JSON.parse(localStorage.getItem(`stockify_catalysts_${symbol}`) || '[]')
            setNotes(saved)
        } catch { /* ignore */ }
    })

    const addNote = () => {
        if (!newNote.trim()) return
        const updated = [{ id: crypto.randomUUID(), text: newNote.trim(), date: new Date().toISOString() }, ...notes]
        setNotes(updated)
        localStorage.setItem(`stockify_catalysts_${symbol}`, JSON.stringify(updated))
        setNewNote("")
        setShowInput(false)
    }

    const removeNote = (id: string) => {
        const updated = notes.filter(n => n.id !== id)
        setNotes(updated)
        localStorage.setItem(`stockify_catalysts_${symbol}`, JSON.stringify(updated))
    }

    return (
        <Card className="glass border-border/50">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                        <StickyNote className="h-4 w-4 text-primary" /> Catalyst Notes
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowInput(!showInput)}>
                        <Plus className="h-3 w-3 mr-1" /> Add
                    </Button>
                </div>
                <CardDescription className="text-xs">Track upcoming events, earnings, catalysts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                {showInput && (
                    <div className="flex gap-2">
                        <Textarea value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="e.g. Earnings on March 15, new product launch..." className="h-16 text-sm" />
                        <Button onClick={addNote} size="sm" className="shrink-0 self-end">Save</Button>
                    </div>
                )}
                {notes.length === 0 && !showInput && (
                    <p className="text-xs text-muted-foreground">No catalyst notes yet. Add upcoming events or key dates.</p>
                )}
                {notes.map(n => (
                    <div key={n.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30 border text-sm group">
                        <div className="flex-1">
                            <p>{n.text}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">{new Date(n.date).toLocaleDateString()}</p>
                        </div>
                        <button onClick={() => removeNote(n.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                        </button>
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}

/* ─── Watchlist Button ─── */
function WatchlistButton({ symbol }: { symbol: string }) {
    const [inWatchlist, setInWatchlist] = useState(false)
    const [loading, setLoading] = useState(false)

    // Check if symbol is in any watchlist
    useEffect(() => {
        let alive = true
        ;(async () => {
            try {
                const { data, error } = await supabase
                    .from("watchlist_items")
                    .select("id")
                    .eq("symbol", symbol)
                    .limit(1)

                if (error) throw error
                if (alive && data && data.length > 0) setInWatchlist(true)
            } catch {
                const saved = JSON.parse(localStorage.getItem('stockify_watchlist') || '[]')
                if (alive) setInWatchlist(saved.includes(symbol))
            }
        })()
        return () => { alive = false }
    }, [symbol])

    const toggle = async () => {
        setLoading(true)
        try {
            if (inWatchlist) {
                await supabase.from("watchlist_items").delete().eq("symbol", symbol)
                setInWatchlist(false)
            } else {
                // Get or create default watchlist
                const { data: wl } = await supabase.from("watchlists").select("id").limit(1).single()
                if (wl) {
                    await supabase.from("watchlist_items").insert({ watchlist_id: wl.id, symbol })
                    setInWatchlist(true)
                }
            }
        } catch {
            // Fallback to localStorage
            const saved = JSON.parse(localStorage.getItem('stockify_watchlist') || '[]')
            if (inWatchlist) {
                localStorage.setItem('stockify_watchlist', JSON.stringify(saved.filter((s: string) => s !== symbol)))
                setInWatchlist(false)
            } else {
                saved.push(symbol)
                localStorage.setItem('stockify_watchlist', JSON.stringify(saved))
                setInWatchlist(true)
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <Button variant={inWatchlist ? "default" : "outline"} size="sm" onClick={toggle} disabled={loading} className="gap-1.5">
            {inWatchlist ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
            {inWatchlist ? "Watching" : "Watch"}
        </Button>
    )
}

export function StockResearchPage() {
    const [stocks, setStocks] = useState<ProcessedStock[]>([])
    const [competitors, setCompetitors] = useState<Competitor[]>([])
    const [loading, setLoading] = useState(true)
    const [query, setQuery] = useState("")
    const [selected, setSelected] = useState<ProcessedStock | null>(null)
    const [tab, setTab] = useState<"stocks" | "competitors">("stocks")

    useEffect(() => {
        Promise.all([
            fetch("/data/stocks_processed.json").then(r => r.json()),
            fetch("/data/competitors_processed.json").then(r => r.json()),
        ]).then(([s, c]) => {
            setStocks(s)
            setCompetitors(c)
        }).catch(console.error).finally(() => setLoading(false))
    }, [])

    const filtered = useMemo(() => {
        if (!query) return stocks
        const q = query.toLowerCase()
        return stocks.filter(s =>
            s.symbol.toLowerCase().includes(q) ||
            (s.name || "").toLowerCase().includes(q) ||
            (s.sector || "").toLowerCase().includes(q)
        )
    }, [stocks, query])

    if (loading) {
        return (
            <AppShell role="student">
                <div className="flex items-center justify-center h-96">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-3 text-muted-foreground">Loading real market data...</span>
                </div>
            </AppShell>
        )
    }

    return (
        <AppShell role="student">
            <div className="p-6 max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                            <BarChart3 className="h-8 w-8 text-primary" /> Stock Research
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Real market data powered by Yahoo Finance &amp; SimilarWeb Analytics
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant={tab === "stocks" ? "default" : "outline"} onClick={() => { setTab("stocks"); setSelected(null) }}>
                            <TrendingUp className="h-4 w-4 mr-2" /> Stocks
                        </Button>
                        <Button variant={tab === "competitors" ? "default" : "outline"} onClick={() => { setTab("competitors"); setSelected(null) }}>
                            <Globe className="h-4 w-4 mr-2" /> Market Landscape
                        </Button>
                    </div>
                </div>

                {/* ═══ STOCKS TAB ═══ */}
                {tab === "stocks" && (
                    <>
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input placeholder="Search by symbol, name, or sector..." value={query} onChange={e => setQuery(e.target.value)} className="pl-10 h-12 text-lg" />
                        </div>

                        {/* Selected Stock Detail */}
                        {selected ? (
                            <div className="space-y-6 animate-fade-in">
                                {/* Price Header */}
                                <Card>
                                    <CardContent className="p-6">
                                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h2 className="text-2xl font-bold">{selected.symbol}</h2>
                                                    <Badge variant="outline">{selected.exchange}</Badge>
                                                    {selected.sector && <Badge variant="secondary">{selected.sector}</Badge>}
                                                    {selected.rating && (
                                                        <Badge className={cn(
                                                            selected.rating === "BUY" ? "bg-green-500/10 text-green-600 border-green-500/30" :
                                                            selected.rating === "HOLD" ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/30" :
                                                            "bg-red-500/10 text-red-600 border-red-500/30"
                                                        )} variant="outline">
                                                            {selected.rating} — {selected.ratingProvider}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-muted-foreground">{selected.name}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <WatchlistButton symbol={selected.symbol} />
                                            </div>
                                            <div className="text-right">
                                                <div className="text-3xl font-bold stat-number">{fmt(selected.price)}</div>
                                                <div className={cn("flex items-center gap-1 justify-end text-lg font-medium",
                                                    selected.change >= 0 ? "text-green-500" : "text-red-500"
                                                )}>
                                                    {selected.change >= 0 ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                                                    {selected.change >= 0 ? "+" : ""}{selected.change.toFixed(2)} ({selected.changePercent >= 0 ? "+" : ""}{selected.changePercent.toFixed(2)}%)
                                                </div>
                                                {selected.targetPrice > 0 && (
                                                    <div className="text-sm text-muted-foreground mt-1">
                                                        Target: <span className="font-bold text-primary">{fmt(selected.targetPrice)}</span>
                                                        <span className="ml-1">({((selected.targetPrice - selected.price) / selected.price * 100).toFixed(1)}% upside)</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Key Stats */}
                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                                            {[
                                                { label: "Volume", value: fmtVol(selected.volume), icon: Activity },
                                                { label: "Day Range", value: `${fmt(selected.dayLow)} - ${fmt(selected.dayHigh)}`, icon: BarChart3 },
                                                { label: "52W Range", value: `${fmt(selected.low52w)} - ${fmt(selected.high52w)}`, icon: TrendingUp },
                                                { label: "Support", value: selected.support ? fmt(selected.support) : "N/A", icon: Shield },
                                                { label: "Resistance", value: selected.resistance ? fmt(selected.resistance) : "N/A", icon: Target },
                                            ].map((s, i) => (
                                                <div key={i} className="p-3 rounded-xl bg-muted/30 border">
                                                    <div className="flex items-center gap-1.5 mb-1">
                                                        <s.icon className="h-3.5 w-3.5 text-muted-foreground" />
                                                        <span className="text-xs text-muted-foreground">{s.label}</span>
                                                    </div>
                                                    <div className="font-bold text-sm">{s.value}</div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* 52W Range Bar */}
                                        <div className="mb-6">
                                            <div className="text-xs text-muted-foreground mb-2">52-Week Price Range</div>
                                            <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                                                <div className="absolute h-full bg-primary/30 rounded-full" style={{
                                                    width: `${Math.min(100, Math.max(0, ((selected.price - selected.low52w) / (selected.high52w - selected.low52w)) * 100))}%`
                                                }} />
                                                <div className="absolute h-5 w-1 bg-primary rounded-full -top-1" style={{
                                                    left: `${Math.min(100, Math.max(0, ((selected.price - selected.low52w) / (selected.high52w - selected.low52w)) * 100))}%`
                                                }} />
                                            </div>
                                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                                <span>{fmt(selected.low52w)}</span>
                                                <span>{fmt(selected.high52w)}</span>
                                            </div>
                                        </div>

                                        {/* Price Sparkline */}
                                        {selected.priceHistory?.length > 5 && (
                                            <div className="mb-6">
                                                <div className="text-xs text-muted-foreground mb-2">60-Day Price Trend</div>
                                                <Sparkline
                                                    data={selected.priceHistory.map(p => p.close)}
                                                    color={selected.change >= 0 ? "text-green-500" : "text-red-500"}
                                                />
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Technical Outlook */}
                                <div className="grid md:grid-cols-3 gap-4">
                                    {[
                                        { label: "Short Term", value: selected.shortTermOutlook },
                                        { label: "Intermediate", value: selected.intermediateOutlook },
                                        { label: "Long Term", value: selected.longTermOutlook },
                                    ].map((o, i) => (
                                        <Card key={i} className={cn("border", outlookBg(o.value))}>
                                            <CardContent className="p-4 text-center">
                                                <div className="text-xs text-muted-foreground mb-1">{o.label} Outlook</div>
                                                <div className={cn("text-lg font-bold capitalize", outlookColor(o.value))}>
                                                    {o.value || "Neutral"}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>

                                {/* Company Scores + Valuation */}
                                <div className="grid md:grid-cols-2 gap-6">
                                    <Card>
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base">Company Quality Scores</CardTitle>
                                            <CardDescription>Percentile ranking vs. sector peers</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <ScoreBar label="Innovativeness" value={selected.innovativeness} icon={Zap} />
                                            <ScoreBar label="Hiring" value={selected.hiring} icon={Users} />
                                            <ScoreBar label="Sustainability" value={selected.sustainability} icon={Leaf} />
                                            <ScoreBar label="Insider Sentiment" value={selected.insiderSentiment} icon={Eye} />
                                            <ScoreBar label="Earnings Reports" value={selected.earningsReports} icon={Award} />
                                            <ScoreBar label="Dividends" value={selected.dividends} icon={DollarSign} />
                                        </CardContent>
                                    </Card>

                                    <div className="space-y-4">
                                        {/* Valuation */}
                                        <Card>
                                            <CardHeader className="pb-3">
                                                <CardTitle className="text-base">Valuation</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-sm text-muted-foreground">{selected.valuationDescription || "No valuation data available."}</p>
                                                {selected.valuationDiscount && (
                                                    <div className="mt-2 text-sm">
                                                        <span className="text-muted-foreground">Discount: </span>
                                                        <span className="font-bold">{selected.valuationDiscount}</span>
                                                    </div>
                                                )}
                                                {selected.relativeValue && (
                                                    <div className="text-sm">
                                                        <span className="text-muted-foreground">Relative Value: </span>
                                                        <span className="font-bold">{selected.relativeValue}</span>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>

                                        {/* About */}
                                        <Card>
                                            <CardHeader className="pb-3">
                                                <CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" /> About</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">{selected.description || "No description available."}</p>
                                                <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                                                    {selected.industry && <div><span className="text-muted-foreground text-xs">Industry</span><div className="font-medium">{selected.industry}</div></div>}
                                                    {selected.employees > 0 && <div><span className="text-muted-foreground text-xs">Employees</span><div className="font-medium">{selected.employees.toLocaleString()}</div></div>}
                                                    {selected.city && <div><span className="text-muted-foreground text-xs">HQ</span><div className="font-medium">{selected.city}, {selected.state}</div></div>}
                                                    {selected.website && <div><span className="text-muted-foreground text-xs">Website</span><div className="font-medium text-primary truncate"><a href={selected.website} target="_blank" rel="noreferrer">{selected.website.replace("https://", "")}</a></div></div>}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>

                                {/* Significant Developments */}
                                {selected.sigDevs?.length > 0 && (
                                    <Card>
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base flex items-center gap-2"><Newspaper className="h-4 w-4" /> Recent Developments</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-2">
                                                {selected.sigDevs.map((d, i) => (
                                                    <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                                        <ChevronRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                                                        <div>
                                                            <div className="text-sm font-medium">{d.headline}</div>
                                                            <div className="text-xs text-muted-foreground">{d.date}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Insider Holdings */}
                                {selected.insiders?.length > 0 && (
                                    <Card>
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Insider Holdings</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="border-b">
                                                            <th className="text-left py-2 text-muted-foreground font-medium">Name</th>
                                                            <th className="text-left py-2 text-muted-foreground font-medium">Relation</th>
                                                            <th className="text-left py-2 text-muted-foreground font-medium">Transaction</th>
                                                            <th className="text-right py-2 text-muted-foreground font-medium">Shares</th>
                                                            <th className="text-right py-2 text-muted-foreground font-medium">Date</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {selected.insiders.map((ins, i) => (
                                                            <tr key={i} className="border-b last:border-0">
                                                                <td className="py-2 font-medium">{ins.name}</td>
                                                                <td className="py-2 text-muted-foreground">{ins.relation}</td>
                                                                <td className="py-2">{ins.transaction}</td>
                                                                <td className="py-2 text-right stat-number">{ins.shares?.toLocaleString()}</td>
                                                                <td className="py-2 text-right text-muted-foreground">{ins.date}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* SEC Filings */}
                                {selected.filings?.length > 0 && (
                                    <Card>
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> SEC Filings</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-2">
                                                {selected.filings.slice(0, 8).map((f, i) => (
                                                    <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <Badge variant="outline" className="font-mono text-xs">{f.type}</Badge>
                                                            <span className="text-sm">{f.title}</span>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-xs text-muted-foreground">{f.date}</span>
                                                            {f.url && (
                                                                <a href={f.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Risk Flags */}
                                <RiskFlags stock={selected} />

                                {/* Catalyst Notes */}
                                <CatalystNotes symbol={selected.symbol} />

                                <div className="flex gap-3">
                                    <Button onClick={() => setSelected(null)} variant="outline">Back to List</Button>
                                </div>
                            </div>
                        ) : (
                            /* Stock List */
                            <div className="space-y-4">
                                <h2 className="text-lg font-bold">
                                    {query ? `Search Results (${filtered.length})` : "Live Market Data — 8 Stocks"}
                                </h2>
                                <div className="grid gap-3">
                                    {filtered.map(stock => (
                                        <Card key={stock.symbol} className="cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5" onClick={() => setSelected(stock)}>
                                            <CardContent className="p-4 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">
                                                        {stock.symbol.slice(0, 4)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold flex items-center gap-2">
                                                            {stock.symbol}
                                                            {stock.sector && <Badge variant="secondary" className="text-xs">{stock.sector}</Badge>}
                                                            {stock.rating && (
                                                                <Badge className={cn("text-xs",
                                                                    stock.rating === "BUY" ? "bg-green-500/10 text-green-600" :
                                                                    stock.rating === "HOLD" ? "bg-yellow-500/10 text-yellow-600" :
                                                                    "bg-red-500/10 text-red-600"
                                                                )} variant="outline">{stock.rating}</Badge>
                                                            )}
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">{stock.name}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    {stock.priceHistory?.length > 5 && (
                                                        <Sparkline
                                                            data={stock.priceHistory.slice(-30).map(p => p.close)}
                                                            color={stock.change >= 0 ? "text-green-500" : "text-red-500"}
                                                        />
                                                    )}
                                                    <div className="text-right min-w-[100px]">
                                                        <div className="font-bold stat-number">{fmt(stock.price)}</div>
                                                        <div className={cn("text-sm font-medium flex items-center gap-1 justify-end",
                                                            stock.change >= 0 ? "text-green-500" : "text-red-500"
                                                        )}>
                                                            {stock.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                                            {stock.change >= 0 ? "+" : ""}{stock.changePercent.toFixed(2)}%
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                    {filtered.length === 0 && (
                                        <div className="text-center py-12 text-muted-foreground">
                                            No stocks found matching &quot;{query}&quot;.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* ═══ COMPETITORS / MARKET LANDSCAPE TAB ═══ */}
                {tab === "competitors" && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-lg font-bold mb-1">Financial Platform Landscape</h2>
                            <p className="text-sm text-muted-foreground">Real traffic analytics from SimilarWeb — see how top financial platforms compare.</p>
                        </div>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {competitors.filter(c => c.monthlyVisits > 0).map(c => (
                                <Card key={c.domain} className="card-hover">
                                    <CardContent className="p-4">
                                        <div className="text-xs text-muted-foreground mb-1">{c.domain}</div>
                                        <div className="text-xl font-bold stat-number">#{c.globalRank.toLocaleString()}</div>
                                        <div className="text-xs text-muted-foreground">Global Rank</div>
                                        <div className="mt-2 text-sm font-medium">{fmtVol(c.monthlyVisits)} visits/mo</div>
                                        <div className="text-xs text-muted-foreground">{c.bounceRate}% bounce rate</div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Detailed Table */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Traffic Comparison</CardTitle>
                                <CardDescription>Monthly visits, bounce rates, and top traffic sources</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="text-left py-3 font-medium">Platform</th>
                                                <th className="text-right py-3 font-medium">Global Rank</th>
                                                <th className="text-right py-3 font-medium">Monthly Visits</th>
                                                <th className="text-right py-3 font-medium">Bounce Rate</th>
                                                <th className="text-center py-3 font-medium">Trend</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {competitors.filter(c => c.monthlyVisits > 0).sort((a, b) => a.globalRank - b.globalRank).map(c => (
                                                <tr key={c.domain} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                                    <td className="py-3">
                                                        <div className="font-medium">{c.domain}</div>
                                                    </td>
                                                    <td className="py-3 text-right font-bold stat-number">#{c.globalRank.toLocaleString()}</td>
                                                    <td className="py-3 text-right stat-number">{fmtVol(c.monthlyVisits)}</td>
                                                    <td className="py-3 text-right">
                                                        <span className={cn(c.bounceRate < 40 ? "text-green-500" : c.bounceRate < 55 ? "text-yellow-500" : "text-red-500")}>
                                                            {c.bounceRate}%
                                                        </span>
                                                    </td>
                                                    <td className="py-3 flex justify-center">
                                                        {c.visitsTrend?.length > 2 && (
                                                            <Sparkline data={c.visitsTrend.map(v => v.visits)} color="text-primary" />
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Top Countries per platform */}
                        <div className="grid md:grid-cols-2 gap-4">
                            {competitors.filter(c => c.topCountries?.length > 0).map(c => (
                                <Card key={c.domain}>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base">{c.domain} — Top Countries</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            {c.topCountries.map((tc, i) => (
                                                <div key={i} className="flex items-center justify-between">
                                                    <span className="text-sm">{tc.country}</span>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                                                            <div className="h-full bg-primary rounded-full" style={{ width: `${tc.share}%` }} />
                                                        </div>
                                                        <span className="text-sm font-medium w-12 text-right">{tc.share}%</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        <div className="text-center text-xs text-muted-foreground py-4">
                            Data sourced from SimilarWeb Analytics • Updated monthly
                        </div>
                    </div>
                )}
            </div>
        </AppShell>
    )
}
