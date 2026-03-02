import { useState, useMemo } from "react"
import { useNavigate, useParams } from "@tanstack/react-router"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { AppShell } from "@/components/layout/AppShell"
import { useMarketData, usePositions } from "@/features/student/hooks"
import { useActiveAccount } from "@/hooks/useActiveAccount"
import { computePortfolioMetrics, type PositionData } from "@/lib/portfolio-calc"
import { formatCurrency, formatNumber } from "@/lib/utils"
import {
    TrendingUp, TrendingDown, Search, FileText, Target,
    AlertTriangle, Clock, ArrowRight, CheckCircle2, Save
} from "lucide-react"
import { toast } from "sonner"

interface ThesisData {
    believe: string
    because: string
    wrongIf: string
    timeHorizon: string
    riskPlan: string
}

const EMPTY_THESIS: ThesisData = {
    believe: "",
    because: "",
    wrongIf: "",
    timeHorizon: "",
    riskPlan: "",
}

function CompanySnapshot({ symbol }: { symbol: string }) {
    const { data: market, isLoading } = useMarketData(symbol)

    if (isLoading || !market) {
        return (
            <Card className="border-muted">
                <CardContent className="p-6">
                    <div className="animate-pulse space-y-3">
                        <div className="h-8 bg-muted rounded w-1/3" />
                        <div className="h-4 bg-muted rounded w-2/3" />
                        <div className="grid grid-cols-3 gap-4 mt-4">
                            <div className="h-16 bg-muted rounded" />
                            <div className="h-16 bg-muted rounded" />
                            <div className="h-16 bg-muted rounded" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        )
    }

    const change = market.change ?? 0
    const changePct = market.change_percent ?? 0
    const isUp = change >= 0

    return (
        <Card className="border-muted relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl pointer-events-none -z-0 ${isUp ? 'bg-green-500/5' : 'bg-red-500/5'}`} />
            <CardContent className="p-6 relative z-10">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">{symbol}</h2>
                        <p className="text-sm text-muted-foreground">{market.market_status === 'open' ? 'Market Open' : 'Market Closed'}</p>
                    </div>
                    <Badge variant="outline" className={isUp ? 'text-green-600 border-green-200 dark:border-green-800' : 'text-red-600 border-red-200 dark:border-red-800'}>
                        {isUp ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                        {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%
                    </Badge>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <div className="text-xs text-muted-foreground mb-1">Price</div>
                        <div className="text-xl font-bold">{formatCurrency(market.price)}</div>
                    </div>
                    <div>
                        <div className="text-xs text-muted-foreground mb-1">Change</div>
                        <div className={`text-xl font-bold ${isUp ? 'text-green-600' : 'text-red-600'}`}>
                            {change >= 0 ? '+' : ''}{formatCurrency(change)}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-muted-foreground mb-1">Prev Close</div>
                        <div className="text-xl font-bold">{formatCurrency(market.previous_close)}</div>
                    </div>
                </div>

                {/* Current Position Info */}
                {market.position && market.position.qty !== 0 && (
                    <div className="mt-4 pt-4 border-t">
                        <div className="text-xs text-muted-foreground mb-1">Your Position</div>
                        <div className="flex gap-4 text-sm">
                            <span>{market.position.qty} shares</span>
                            <span className="text-muted-foreground">@ {formatCurrency(market.position.avg_cost)} avg</span>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

function ThesisBuilder({
    symbol,
    thesis,
    onChange,
    onSave,
}: {
    symbol: string
    thesis: ThesisData
    onChange: (t: ThesisData) => void
    onSave: () => void
}) {
    const fields = [
        {
            key: "believe" as const,
            label: `I believe ${symbol} will...`,
            placeholder: "go up / go down / stay flat because of...",
            icon: Target,
        },
        {
            key: "because" as const,
            label: "Because...",
            placeholder: "The company's earnings are growing, the sector is strong, their product is...",
            icon: FileText,
        },
        {
            key: "wrongIf" as const,
            label: "I'm wrong if...",
            placeholder: "Earnings miss expectations, a competitor launches a better product, interest rates...",
            icon: AlertTriangle,
        },
        {
            key: "timeHorizon" as const,
            label: "Time horizon",
            placeholder: "1 week, 1 month, 3 months...",
            icon: Clock,
        },
        {
            key: "riskPlan" as const,
            label: "Risk plan",
            placeholder: "I'll sell if it drops more than 10%, I'll take profit at...",
            icon: AlertTriangle,
        },
    ]

    const completedFields = Object.values(thesis).filter(v => v.trim().length > 0).length
    const isComplete = completedFields === 5

    return (
        <Card className="border-muted">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg">Thesis Builder</CardTitle>
                        <CardDescription>Build a structured investment thesis before you trade</CardDescription>
                    </div>
                    <Badge variant={isComplete ? "default" : "outline"} className={isComplete ? "bg-green-600" : ""}>
                        {completedFields}/5
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {fields.map((f) => (
                    <div key={f.key} className="space-y-1.5">
                        <Label className="flex items-center gap-1.5 text-sm">
                            <f.icon className="h-3.5 w-3.5 text-muted-foreground" />
                            {f.label}
                        </Label>
                        <Textarea
                            placeholder={f.placeholder}
                            value={thesis[f.key]}
                            onChange={(e) => onChange({ ...thesis, [f.key]: e.target.value })}
                            className="min-h-[60px] resize-none text-sm"
                        />
                    </div>
                ))}
                <div className="flex gap-2 pt-2">
                    <Button onClick={onSave} disabled={completedFields === 0} className="flex-1">
                        <Save className="h-4 w-4 mr-2" />
                        Save Thesis
                    </Button>
                </div>
                {isComplete && (
                    <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Great work! A complete thesis improves your process score.</span>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

function PortfolioContext({ symbol }: { symbol: string }) {
    const { data: positions } = usePositions()
    const { data: account } = useActiveAccount()

    const metrics = useMemo(() => {
        if (!positions || !account) return null
        const posData: PositionData[] = positions.map(p => ({
            symbol: p.symbol,
            qty: p.qty,
            avg_cost: p.avg_cost,
            current_price: p.current_price ?? p.avg_cost,
        }))
        return computePortfolioMetrics(posData, account.cash_balance, account.starting_cash ?? account.cash_balance)
    }, [positions, account])

    if (!metrics) return null

    const currentHolding = metrics.allocation.find(a => a.symbol === symbol)

    return (
        <Card className="border-muted">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground">Portfolio Context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Equity</span>
                    <span className="font-medium">{formatCurrency(metrics.equity)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Cash</span>
                    <span className="font-medium">{formatCurrency(metrics.cash)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Diversification</span>
                    <span className="font-medium">{metrics.concentrationLabel}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">HHI</span>
                    <span className="font-medium">{formatNumber(metrics.hhi)}</span>
                </div>
                {currentHolding && (
                    <div className="flex justify-between pt-2 border-t">
                        <span className="text-muted-foreground">{symbol} weight</span>
                        <span className="font-medium">{(currentHolding.weight * 100).toFixed(1)}%</span>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

export function ResearchPage() {
    const navigate = useNavigate()
    const params = useParams({ strict: false }) as { symbol?: string }
    const [searchInput, setSearchInput] = useState("")
    const symbol = params.symbol?.toUpperCase() || "AAPL"
    const [thesis, setThesis] = useState<ThesisData>(EMPTY_THESIS)

    const handleSearch = () => {
        const s = searchInput.trim().toUpperCase()
        if (s) {
            navigate({
                to: "/app/research/$symbol" as string,
                params: { symbol: s }
            } as any)
            setSearchInput("")
            setThesis(EMPTY_THESIS) // Reset thesis for new symbol
        }
    }

    const handleSaveThesis = () => {
        // Persist to localStorage for now; B6 will wire to Supabase journal_entries
        const theses = JSON.parse(localStorage.getItem('stockify_theses') || '{}')
        theses[symbol] = { ...thesis, savedAt: new Date().toISOString() }
        localStorage.setItem('stockify_theses', JSON.stringify(theses))
        toast.success("Thesis saved! It will appear in your trade journal.")
    }

    // Load saved thesis from localStorage on symbol change
    useState(() => {
        const theses = JSON.parse(localStorage.getItem('stockify_theses') || '{}')
        if (theses[symbol]) {
            setThesis({
                believe: theses[symbol].believe || "",
                because: theses[symbol].because || "",
                wrongIf: theses[symbol].wrongIf || "",
                timeHorizon: theses[symbol].timeHorizon || "",
                riskPlan: theses[symbol].riskPlan || "",
            })
        }
    })

    return (
        <AppShell role="student">
            <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
                {/* Header + Search */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Research</h1>
                        <p className="text-sm text-muted-foreground">Build a thesis before you trade</p>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search symbol..."
                                value={searchInput}
                                onChange={e => setSearchInput(e.target.value.toUpperCase())}
                                onKeyDown={e => e.key === "Enter" && handleSearch()}
                                className="pl-9"
                            />
                        </div>
                        <Button onClick={handleSearch} disabled={!searchInput.trim()}>Go</Button>
                    </div>
                </div>

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Company + Thesis */}
                    <div className="lg:col-span-2 space-y-6">
                        <CompanySnapshot symbol={symbol} />
                        <ThesisBuilder
                            symbol={symbol}
                            thesis={thesis}
                            onChange={setThesis}
                            onSave={handleSaveThesis}
                        />
                    </div>

                    {/* Right: Portfolio Context + Actions */}
                    <div className="space-y-4">
                        <PortfolioContext symbol={symbol} />

                        <Card className="border-muted">
                            <CardContent className="p-4 space-y-3">
                                <Button
                                    className="w-full"
                                    onClick={() => navigate({
                                        to: "/app/trade/$symbol",
                                        params: { symbol }
                                    } as any)}
                                >
                                    Trade {symbol}
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                                <p className="text-xs text-muted-foreground text-center">
                                    Your thesis will be linked to any trades you place for {symbol}
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppShell>
    )
}
