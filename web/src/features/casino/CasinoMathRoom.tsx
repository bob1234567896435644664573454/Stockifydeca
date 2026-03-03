import { useState, useCallback, useMemo } from "react"
import { AppShell } from "@/components/layout/AppShell"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
    Spade, CircleDot, Grid3X3, Bird, BarChart3,
    ArrowLeft, RotateCcw, Info, FlaskConical, Eye, Brain,
    TrendingUp, Lightbulb, ChevronDown, ChevronUp, Dice1
} from "lucide-react"
import { cn } from "@/lib/utils"

/* ─── Types ─── */
type GameType = "menu" | "blackjack" | "roulette" | "slots" | "mines" | "chicken"
interface GameResult { outcome: "win" | "loss" | "push"; amount: number; message: string }

/* ─── Constants ─── */
const STARTING_BALANCE = 10000
const GAMES = [
    {
        id: "blackjack" as GameType, title: "Blackjack", icon: Spade,
        houseEdge: "~2%", evFormula: "EV = -0.02 × bet",
        description: "Try to beat the dealer by getting closer to 21 without going over.",
        color: "text-red-500", bg: "bg-red-500/10",
        bias: "Illusion of Control",
        biasExplain: "Players feel their decisions (hit/stand) give them control, but the house edge persists regardless of strategy.",
        investingBridge: "In investing, the illusion of control appears when traders believe frequent trading improves returns. Studies show that passive index investors outperform active traders 85% of the time over 15 years.",
    },
    {
        id: "roulette" as GameType, title: "Roulette", icon: CircleDot,
        houseEdge: "5.26%", evFormula: "EV = -2/38 × bet = -5.26%",
        description: "Bet on where the ball lands. American roulette with 0 and 00.",
        color: "text-green-500", bg: "bg-green-500/10",
        bias: "Gambler's Fallacy",
        biasExplain: "After 5 reds in a row, players bet on black — but each spin is independent. Past results don't affect future probabilities.",
        investingBridge: "In investing, the gambler's fallacy appears when investors assume a stock that has fallen must 'bounce back.' Mean reversion exists, but individual stocks can decline to zero. Diversification protects against this bias.",
    },
    {
        id: "slots" as GameType, title: "Slots", icon: Dice1,
        houseEdge: "~8%", evFormula: "EV ≈ -0.08 × bet",
        description: "Spin the reels and hope for matching symbols. Pure luck.",
        color: "text-purple-500", bg: "bg-purple-500/10",
        bias: "Variable Ratio Reinforcement",
        biasExplain: "Unpredictable rewards create the strongest addictive response. Slots are designed to deliver small wins frequently to keep you playing.",
        investingBridge: "In investing, checking your portfolio constantly creates the same dopamine cycle. Research shows investors who check daily trade 3x more and earn 2% less annually than those who check quarterly.",
    },
    {
        id: "mines" as GameType, title: "Mines", icon: Grid3X3,
        houseEdge: "~3%", evFormula: "EV = -0.03 × bet (varies by strategy)",
        description: "Reveal tiles on a grid. Avoid the mines. Cash out anytime.",
        color: "text-yellow-500", bg: "bg-yellow-500/10",
        bias: "Sunk Cost Fallacy",
        biasExplain: "After revealing several safe tiles, players feel compelled to continue rather than cash out — because they've 'invested' effort. This increases risk exposure.",
        investingBridge: "In investing, the sunk cost fallacy appears when investors hold losing positions because they've 'already lost so much.' Smart investors cut losses based on current outlook, not past investment.",
    },
    {
        id: "chicken" as GameType, title: "Chicken Cross", icon: Bird,
        houseEdge: "~4%", evFormula: "EV = -0.04 × bet (varies by lanes crossed)",
        description: "Cross lanes of traffic. Each lane survived multiplies your bet. Stop anytime.",
        color: "text-blue-500", bg: "bg-blue-500/10",
        bias: "Overconfidence Bias",
        biasExplain: "After surviving several lanes, players overestimate their ability to continue safely. Each lane has the same independent crash probability.",
        investingBridge: "In investing, overconfidence leads to concentrated positions and excessive leverage. Overconfident investors trade 45% more and earn significantly lower returns. Diversification is the antidote.",
    },
]

/* ─── Helpers ─── */
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 })

/* ─── Blackjack Logic ─── */
function dealCard(): number { const c = rand(1, 13); return c > 10 ? 10 : c === 1 ? 11 : c }
function handValue(cards: number[]): number {
    let sum = cards.reduce((a, b) => a + b, 0)
    let aces = cards.filter(c => c === 11).length
    while (sum > 21 && aces > 0) { sum -= 10; aces-- }
    return sum
}
function cardDisplay(c: number): string {
    if (c === 11) return "A"
    if (c === 10) return ["10", "J", "Q", "K"][rand(0, 3)]
    return String(c)
}

/* ─── Slot Symbols ─── */
const SLOT_SYMBOLS = ["🍒", "🍋", "🍊", "🍇", "💎", "7️⃣", "🔔"]
const SLOT_PAYOUTS: Record<string, number> = { "7️⃣": 50, "💎": 25, "🔔": 15, "🍇": 10, "🍊": 5, "🍋": 3, "🍒": 2 }

/* ─── Transparency Panel Component ─── */
function TransparencyPanel({ game }: { game: typeof GAMES[0] }) {
    const [expanded, setExpanded] = useState(false)
    return (
        <Card className="bg-muted/30 border-muted">
            <CardContent className="p-4">
                <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between text-left">
                    <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold">Transparency & Learning</span>
                    </div>
                    {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>
                {expanded && (
                    <div className="mt-4 space-y-4 animate-fade-in">
                        {/* Math */}
                        <div className="flex items-start gap-3">
                            <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                                <BarChart3 className="h-4 w-4 text-destructive" />
                            </div>
                            <div>
                                <div className="text-xs font-semibold text-destructive mb-1">House Edge: {game.houseEdge}</div>
                                <div className="text-xs text-muted-foreground font-mono">{game.evFormula}</div>
                                <div className="text-xs text-muted-foreground mt-1">Over 1,000 bets of $100, you expect to lose {game.houseEdge === "~2%" ? "$2,000" : game.houseEdge === "5.26%" ? "$5,260" : game.houseEdge === "~8%" ? "$8,000" : game.houseEdge === "~3%" ? "$3,000" : "$4,000"}.</div>
                            </div>
                        </div>
                        {/* Cognitive Bias */}
                        <div className="flex items-start gap-3">
                            <div className="h-8 w-8 rounded-lg bg-[hsl(var(--accent-indigo))]/10 flex items-center justify-center shrink-0">
                                <Brain className="h-4 w-4 text-[hsl(var(--accent-indigo))]" />
                            </div>
                            <div>
                                <div className="text-xs font-semibold text-[hsl(var(--accent-indigo))] mb-1">Cognitive Bias: {game.bias}</div>
                                <div className="text-xs text-muted-foreground">{game.biasExplain}</div>
                            </div>
                        </div>
                        {/* Connect to Investing */}
                        <div className="flex items-start gap-3">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                <TrendingUp className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <div className="text-xs font-semibold text-primary mb-1">Connect to Investing</div>
                                <div className="text-xs text-muted-foreground">{game.investingBridge}</div>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

/* ─── Main Component ─── */
export function CasinoMathRoom() {
    const [game, setGame] = useState<GameType>("menu")
    const [balance, setBalance] = useState(STARTING_BALANCE)
    const [bet, setBet] = useState(100)
    const [history, setHistory] = useState<{ game: string; result: string; amount: number }[]>([])
    const [message, setMessage] = useState("")

    // Stats
    const totalWagered = useMemo(() => history.reduce((s, h) => s + Math.abs(h.amount), 0), [history])
    const totalWon = useMemo(() => history.filter(h => h.amount > 0).reduce((s, h) => s + h.amount, 0), [history])
    const totalLost = useMemo(() => history.filter(h => h.amount < 0).reduce((s, h) => s + Math.abs(h.amount), 0), [history])
    const netPnL = balance - STARTING_BALANCE
    const gamesPlayed = history.length
    const winRate = gamesPlayed > 0 ? ((history.filter(h => h.amount > 0).length / gamesPlayed) * 100).toFixed(1) : "0"

    const currentGameData = GAMES.find(g => g.id === game)

    const addResult = useCallback((gameName: string, result: GameResult) => {
        setBalance(b => b + result.amount)
        setHistory(h => [{ game: gameName, result: result.outcome, amount: result.amount }, ...h].slice(0, 50))
        setMessage(result.message)
    }, [])

    const resetAll = () => {
        setBalance(STARTING_BALANCE)
        setHistory([])
        setMessage("")
        setGame("menu")
    }

    return (
        <AppShell role="student">
            <div className="p-6 max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            {game !== "menu" && (
                                <Button variant="ghost" size="icon" onClick={() => { setGame("menu"); setMessage("") }}>
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                            )}
                            <FlaskConical className="h-7 w-7 text-primary" />
                            <h1 className="text-3xl font-bold tracking-tight">Behavioral Finance Lab</h1>
                            <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5">
                                <Lightbulb className="h-3 w-3 mr-1" /> Educational
                            </Badge>
                        </div>
                        <p className="text-muted-foreground">Learn probability, expected value, and cognitive biases through transparent simulations. All virtual — no real money.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <div className="text-xs text-muted-foreground">Virtual Balance</div>
                            <div className={cn("text-2xl font-bold", netPnL >= 0 ? "text-green-500" : "text-red-500")}>{fmt(balance)}</div>
                        </div>
                        <Button variant="outline" size="sm" onClick={resetAll}>
                            <RotateCcw className="h-4 w-4 mr-1" /> Reset
                        </Button>
                    </div>
                </div>

                {/* Stats Bar */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[
                        { label: "Total Wagered", value: fmt(totalWagered) },
                        { label: "Total Won", value: fmt(totalWon), color: "text-green-500" },
                        { label: "Total Lost", value: fmt(totalLost), color: "text-red-500" },
                        { label: "Net P&L", value: fmt(netPnL), color: netPnL >= 0 ? "text-green-500" : "text-red-500" },
                        { label: "Win Rate", value: `${winRate}%`, color: Number(winRate) >= 50 ? "text-green-500" : "text-red-500" },
                    ].map((s, i) => (
                        <Card key={i} className="bg-card/50">
                            <CardContent className="p-4">
                                <div className="text-xs text-muted-foreground">{s.label}</div>
                                <div className={cn("text-lg font-bold", s.color)}>{s.value}</div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Educational Callout */}
                <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-4 flex items-start gap-3">
                        <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <div className="text-sm text-muted-foreground">
                            <strong className="text-foreground">Why this matters:</strong> Every simulation below has a <strong>negative expected value (EV)</strong>. Over many plays, you are mathematically guaranteed to lose money. Compare this to investing in a diversified index fund, which has historically returned ~10% annually (<strong>positive EV</strong>). The house edge is small per bet but devastating over time. Each simulation also teaches a specific <strong>cognitive bias</strong> that affects real investing decisions.
                        </div>
                    </CardContent>
                </Card>

                {message && (
                    <div className="p-3 rounded-lg bg-muted/50 text-center font-medium animate-fade-in">{message}</div>
                )}

                {/* Game Selection or Active Game */}
                {game === "menu" ? (
                    <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {GAMES.map(g => (
                            <Card key={g.id} className="cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1" onClick={() => { setGame(g.id); setMessage("") }}>
                                <CardContent className="p-6 text-center">
                                    <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center mx-auto mb-4", g.bg)}>
                                        <g.icon className={cn("h-7 w-7", g.color)} />
                                    </div>
                                    <h3 className="font-bold mb-1">{g.title}</h3>
                                    <p className="text-xs text-muted-foreground mb-2">{g.description}</p>
                                    <Badge variant="secondary" className="text-xs mb-2">House Edge: {g.houseEdge}</Badge>
                                    <div className="mt-2 pt-2 border-t">
                                        <div className="flex items-center gap-1 justify-center">
                                            <Brain className="h-3 w-3 text-[hsl(var(--accent-indigo))]" />
                                            <span className="text-xs text-[hsl(var(--accent-indigo))] font-medium">{g.bias}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="grid lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-4">
                            {game === "blackjack" && <BlackjackGame balance={balance} bet={bet} setBet={setBet} onResult={(r) => addResult("Blackjack", r)} />}
                            {game === "roulette" && <RouletteGame balance={balance} bet={bet} setBet={setBet} onResult={(r) => addResult("Roulette", r)} />}
                            {game === "slots" && <SlotsGame balance={balance} bet={bet} setBet={setBet} onResult={(r) => addResult("Slots", r)} />}
                            {game === "mines" && <MinesGame balance={balance} bet={bet} setBet={setBet} onResult={(r) => addResult("Mines", r)} />}
                            {game === "chicken" && <ChickenGame balance={balance} bet={bet} setBet={setBet} onResult={(r) => addResult("Chicken Cross", r)} />}

                            {/* Transparency Panel for current game */}
                            {currentGameData && <TransparencyPanel game={currentGameData} />}
                        </div>

                        {/* History Sidebar */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Session History</CardTitle>
                                <CardDescription className="text-xs">
                                    {gamesPlayed} games played · Win rate: {winRate}%
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="max-h-[500px] overflow-y-auto space-y-2">
                                {history.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-8">No games played yet. Play a few rounds and watch the math in action.</p>
                                ) : history.map((h, i) => (
                                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm">
                                        <span className="font-medium">{h.game}</span>
                                        <span className={cn("font-bold", h.amount > 0 ? "text-green-500" : h.amount < 0 ? "text-red-500" : "text-muted-foreground")}>
                                            {h.amount > 0 ? "+" : ""}{fmt(h.amount)}
                                        </span>
                                    </div>
                                ))}
                                {history.length >= 10 && (
                                    <Card className="bg-destructive/5 border-destructive/20 mt-4">
                                        <CardContent className="p-3">
                                            <div className="text-xs text-destructive font-semibold mb-1">Pattern Alert</div>
                                            <div className="text-xs text-muted-foreground">
                                                After {gamesPlayed} games, your net P&L is {fmt(netPnL)}.
                                                {netPnL < 0
                                                    ? " This is the house edge at work. Over time, negative EV guarantees losses."
                                                    : " You're ahead for now — but the math will catch up. The house edge is relentless over time."}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Investing Comparison (always visible) */}
                {game === "menu" && (
                    <Card className="bg-gradient-to-r from-primary/5 to-[hsl(var(--accent-indigo))]/5 border-primary/20">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <TrendingUp className="h-6 w-6 text-primary" />
                                <h3 className="text-lg font-bold">Compare: Gambling vs. Investing</h3>
                            </div>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <div className="text-sm font-semibold text-destructive mb-2">Gambling (Negative EV)</div>
                                    <ul className="space-y-2 text-sm text-muted-foreground">
                                        <li>$100/day × 365 days × -5% house edge = <strong className="text-destructive">-$1,825/year</strong></li>
                                        <li>Over 10 years: <strong className="text-destructive">-$18,250 guaranteed loss</strong></li>
                                        <li>No amount of "skill" or "strategy" overcomes the math</li>
                                    </ul>
                                </div>
                                <div>
                                    <div className="text-sm font-semibold text-primary mb-2">Investing (Positive EV)</div>
                                    <ul className="space-y-2 text-sm text-muted-foreground">
                                        <li>$100/month × 10% annual return × 30 years = <strong className="text-primary">$226,049</strong></li>
                                        <li>Total invested: $36,000 → <strong className="text-primary">6.3x return</strong></li>
                                        <li>Compounding + diversification + time = wealth creation</li>
                                    </ul>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppShell>
    )
}

/* ─── Bet Controls ─── */
function BetControls({ bet, setBet, balance, onPlay, playLabel, disabled }: {
    bet: number; setBet: (b: number) => void; balance: number; onPlay: () => void; playLabel: string; disabled?: boolean
}) {
    return (
        <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Bet:</span>
                <Input type="number" value={bet} onChange={e => setBet(Math.max(1, Math.min(balance, Number(e.target.value))))} className="w-28 h-9" min={1} max={balance} />
            </div>
            <div className="flex gap-1">
                {[10, 50, 100, 500, 1000].map(v => (
                    <Button key={v} variant="outline" size="sm" className="h-8 text-xs" onClick={() => setBet(Math.min(v, balance))}>{fmt(v)}</Button>
                ))}
            </div>
            <Button onClick={onPlay} disabled={disabled || bet > balance || bet <= 0} className="gradient-brand text-white ml-auto">{playLabel}</Button>
        </div>
    )
}

/* ─── BLACKJACK ─── */
function BlackjackGame({ balance, bet, setBet, onResult }: { balance: number; bet: number; setBet: (b: number) => void; onResult: (r: GameResult) => void }) {
    const [playerHand, setPlayerHand] = useState<number[]>([])
    const [dealerHand, setDealerHand] = useState<number[]>([])
    const [phase, setPhase] = useState<"bet" | "play" | "done">("bet")
    const [dealerRevealed, setDealerRevealed] = useState(false)

    const deal = () => {
        const p = [dealCard(), dealCard()]
        const d = [dealCard(), dealCard()]
        setPlayerHand(p)
        setDealerHand(d)
        setDealerRevealed(false)
        setPhase("play")
        if (handValue(p) === 21) {
            setDealerRevealed(true)
            setPhase("done")
            if (handValue(d) === 21) {
                onResult({ outcome: "push", amount: 0, message: "Both blackjack! Push." })
            } else {
                onResult({ outcome: "win", amount: Math.floor(bet * 1.5), message: `Blackjack! You win ${fmt(Math.floor(bet * 1.5))}!` })
            }
        }
    }

    const hit = () => {
        const newHand = [...playerHand, dealCard()]
        setPlayerHand(newHand)
        if (handValue(newHand) > 21) {
            setDealerRevealed(true)
            setPhase("done")
            onResult({ outcome: "loss", amount: -bet, message: `Bust! You lose ${fmt(bet)}.` })
        }
    }

    const stand = () => {
        setDealerRevealed(true)
        const dh = [...dealerHand]
        while (handValue(dh) < 17) dh.push(dealCard())
        setDealerHand(dh)
        setPhase("done")
        const pv = handValue(playerHand)
        const dv = handValue(dh)
        if (dv > 21) onResult({ outcome: "win", amount: bet, message: `Dealer busts! You win ${fmt(bet)}!` })
        else if (pv > dv) onResult({ outcome: "win", amount: bet, message: `You win ${fmt(bet)}! ${pv} vs ${dv}.` })
        else if (pv < dv) onResult({ outcome: "loss", amount: -bet, message: `Dealer wins. You lose ${fmt(bet)}. ${pv} vs ${dv}.` })
        else onResult({ outcome: "push", amount: 0, message: `Push! Both have ${pv}.` })
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Spade className="h-5 w-5 text-red-500" /> Blackjack</CardTitle>
                <CardDescription>House edge: ~2%. Get closer to 21 than the dealer without going over. Teaches: <strong>Illusion of Control</strong></CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {phase === "bet" && <BetControls bet={bet} setBet={setBet} balance={balance} onPlay={deal} playLabel="Deal" />}
                {(phase === "play" || phase === "done") && (
                    <div className="space-y-6">
                        <div>
                            <div className="text-xs text-muted-foreground mb-2">Dealer {dealerRevealed ? `(${handValue(dealerHand)})` : ""}</div>
                            <div className="flex gap-2">
                                {dealerHand.map((c, i) => (
                                    <div key={i} className="h-20 w-14 rounded-lg border-2 flex items-center justify-center text-lg font-bold bg-card shadow-sm">
                                        {i === 1 && !dealerRevealed ? "?" : cardDisplay(c)}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <div className="text-xs text-muted-foreground mb-2">Your Hand ({handValue(playerHand)})</div>
                            <div className="flex gap-2">
                                {playerHand.map((c, i) => (
                                    <div key={i} className="h-20 w-14 rounded-lg border-2 border-primary/50 flex items-center justify-center text-lg font-bold bg-primary/5 shadow-sm">
                                        {cardDisplay(c)}
                                    </div>
                                ))}
                            </div>
                        </div>
                        {phase === "play" && (
                            <div className="flex gap-3">
                                <Button onClick={hit} variant="outline">Hit</Button>
                                <Button onClick={stand} className="gradient-brand text-white">Stand</Button>
                            </div>
                        )}
                        {phase === "done" && <Button onClick={() => setPhase("bet")} variant="outline">New Hand</Button>}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

/* ─── ROULETTE ─── */
function RouletteGame({ balance, bet, setBet, onResult }: { balance: number; bet: number; setBet: (b: number) => void; onResult: (r: GameResult) => void }) {
    const [betType, setBetType] = useState<"red" | "black" | "green" | "odd" | "even">("red")
    const [result, setResult] = useState<number | null>(null)
    const [spinning, setSpinning] = useState(false)

    const REDS = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]

    const spin = () => {
        setSpinning(true)
        setTimeout(() => {
            const num = rand(0, 37)
            setResult(num)
            setSpinning(false)
            const isGreen = num === 0 || num === 37
            const isRed = REDS.includes(num)
            const isOdd = !isGreen && num % 2 === 1

            let won = false
            if (betType === "green" && isGreen) won = true
            else if (betType === "red" && isRed) won = true
            else if (betType === "black" && !isRed && !isGreen) won = true
            else if (betType === "odd" && isOdd) won = true
            else if (betType === "even" && !isOdd && !isGreen) won = true

            const payout = betType === "green" ? bet * 17 : bet
            const display = num === 37 ? "00" : String(num)
            if (won) {
                onResult({ outcome: "win", amount: payout, message: `Ball lands on ${display}! You win ${fmt(payout)}!` })
            } else {
                onResult({ outcome: "loss", amount: -bet, message: `Ball lands on ${display}. You lose ${fmt(bet)}.` })
            }
        }, 1500)
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><CircleDot className="h-5 w-5 text-green-500" /> Roulette</CardTitle>
                <CardDescription>House edge: 5.26% (American). The 0 and 00 give the house its edge. Teaches: <strong>Gambler's Fallacy</strong></CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex gap-2 flex-wrap">
                    {(["red", "black", "green", "odd", "even"] as const).map(t => (
                        <Button key={t} variant={betType === t ? "default" : "outline"} size="sm" onClick={() => setBetType(t)}
                            className={cn(betType === t && t === "red" && "bg-red-600 hover:bg-red-700", betType === t && t === "black" && "bg-gray-800 hover:bg-gray-900", betType === t && t === "green" && "bg-green-600 hover:bg-green-700")}>
                            {t.charAt(0).toUpperCase() + t.slice(1)} {t === "green" ? "(17:1)" : "(1:1)"}
                        </Button>
                    ))}
                </div>
                {result !== null && !spinning && (
                    <div className="text-center py-4">
                        <div className={cn("inline-flex h-20 w-20 rounded-full items-center justify-center text-3xl font-bold text-white shadow-lg",
                            result === 0 || result === 37 ? "bg-green-600" : REDS.includes(result) ? "bg-red-600" : "bg-gray-800"
                        )}>
                            {result === 37 ? "00" : result}
                        </div>
                    </div>
                )}
                {spinning && (
                    <div className="text-center py-4">
                        <div className="inline-flex h-20 w-20 rounded-full items-center justify-center text-2xl font-bold bg-muted animate-spin shadow-lg">🎰</div>
                    </div>
                )}
                <BetControls bet={bet} setBet={setBet} balance={balance} onPlay={spin} playLabel="Spin" disabled={spinning} />
            </CardContent>
        </Card>
    )
}

/* ─── SLOTS ─── */
function SlotsGame({ balance, bet, setBet, onResult }: { balance: number; bet: number; setBet: (b: number) => void; onResult: (r: GameResult) => void }) {
    const [reels, setReels] = useState(["🍒", "🍋", "🍊"])
    const [spinning, setSpinning] = useState(false)

    const spin = () => {
        setSpinning(true)
        setTimeout(() => {
            const r = [SLOT_SYMBOLS[rand(0, 6)], SLOT_SYMBOLS[rand(0, 6)], SLOT_SYMBOLS[rand(0, 6)]]
            setReels(r)
            setSpinning(false)
            if (r[0] === r[1] && r[1] === r[2]) {
                const mult = SLOT_PAYOUTS[r[0]] || 2
                const win = bet * mult
                onResult({ outcome: "win", amount: win, message: `Triple ${r[0]}! You win ${fmt(win)} (${mult}x)!` })
            } else if (r[0] === r[1] || r[1] === r[2] || r[0] === r[2]) {
                const win = Math.floor(bet * 0.5)
                onResult({ outcome: "win", amount: win, message: `Pair! You win ${fmt(win)}.` })
            } else {
                onResult({ outcome: "loss", amount: -bet, message: `No match. You lose ${fmt(bet)}.` })
            }
        }, 1200)
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Dice1 className="h-5 w-5 text-purple-500" /> Slots</CardTitle>
                <CardDescription>House edge: ~8%. Pure luck — no skill involved. Teaches: <strong>Variable Ratio Reinforcement</strong></CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-center gap-4 py-8">
                    {reels.map((s, i) => (
                        <div key={i} className={cn("h-24 w-24 rounded-2xl border-2 flex items-center justify-center text-5xl bg-card shadow-lg", spinning && "animate-pulse")}>
                            {spinning ? "❓" : s}
                        </div>
                    ))}
                </div>
                <BetControls bet={bet} setBet={setBet} balance={balance} onPlay={spin} playLabel="Spin" disabled={spinning} />
            </CardContent>
        </Card>
    )
}

/* ─── MINES ─── */
function MinesGame({ balance, bet, setBet, onResult }: { balance: number; bet: number; setBet: (b: number) => void; onResult: (r: GameResult) => void }) {
    const GRID = 25
    const MINE_COUNT = 5
    const [mines, setMines] = useState<Set<number>>(new Set())
    const [revealed, setRevealed] = useState<Set<number>>(new Set())
    const [phase, setPhase] = useState<"bet" | "play" | "done">("bet")
    const [multiplier, setMultiplier] = useState(1)

    const startGame = () => {
        const m = new Set<number>()
        while (m.size < MINE_COUNT) m.add(rand(0, GRID - 1))
        setMines(m)
        setRevealed(new Set())
        setMultiplier(1)
        setPhase("play")
    }

    const revealTile = (idx: number) => {
        if (phase !== "play" || revealed.has(idx)) return
        if (mines.has(idx)) {
            setRevealed(new Set([...revealed, idx]))
            setPhase("done")
            onResult({ outcome: "loss", amount: -bet, message: `BOOM! Hit a mine. You lose ${fmt(bet)}.` })
        } else {
            const newRevealed = new Set([...revealed, idx])
            setRevealed(newRevealed)
            const safeRevealed = newRevealed.size
            const newMult = +(1 + safeRevealed * 0.25).toFixed(2)
            setMultiplier(newMult)
            if (safeRevealed === GRID - MINE_COUNT) {
                setPhase("done")
                const win = Math.floor(bet * newMult) - bet
                onResult({ outcome: "win", amount: win, message: `All safe tiles revealed! You win ${fmt(win)} (${newMult}x)!` })
            }
        }
    }

    const cashOut = () => {
        setPhase("done")
        const win = Math.floor(bet * multiplier) - bet
        onResult({ outcome: "win", amount: win, message: `Cashed out at ${multiplier}x! You win ${fmt(win)}.` })
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Grid3X3 className="h-5 w-5 text-yellow-500" /> Mines</CardTitle>
                <CardDescription>House edge: ~3%. {MINE_COUNT} mines hidden in a 5x5 grid. Teaches: <strong>Sunk Cost Fallacy</strong></CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {phase === "bet" && <BetControls bet={bet} setBet={setBet} balance={balance} onPlay={startGame} playLabel="Start Game" />}
                {(phase === "play" || phase === "done") && (
                    <>
                        <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-lg py-1 px-3">{multiplier}x</Badge>
                            {phase === "play" && revealed.size > 0 && (
                                <Button onClick={cashOut} className="gradient-brand text-white">Cash Out ({fmt(Math.floor(bet * multiplier))})</Button>
                            )}
                        </div>
                        <div className="grid grid-cols-5 gap-2 max-w-xs mx-auto">
                            {Array.from({ length: GRID }).map((_, i) => {
                                const isRevealed = revealed.has(i)
                                const isMine = mines.has(i)
                                const showMine = phase === "done" && isMine
                                return (
                                    <button
                                        key={i}
                                        onClick={() => revealTile(i)}
                                        disabled={phase === "done" || isRevealed}
                                        className={cn(
                                            "h-12 w-12 rounded-lg border-2 flex items-center justify-center text-lg font-bold transition-all",
                                            isRevealed && !isMine && "bg-green-500/20 border-green-500/50 text-green-600",
                                            isRevealed && isMine && "bg-red-500/20 border-red-500/50",
                                            showMine && !isRevealed && "bg-red-500/10 border-red-500/30",
                                            !isRevealed && !showMine && "bg-muted/50 hover:bg-muted cursor-pointer"
                                        )}
                                    >
                                        {isRevealed && isMine ? "💣" : isRevealed ? "💎" : showMine ? "💣" : ""}
                                    </button>
                                )
                            })}
                        </div>
                        {phase === "done" && <Button onClick={() => setPhase("bet")} variant="outline">New Game</Button>}
                    </>
                )}
            </CardContent>
        </Card>
    )
}

/* ─── CHICKEN CROSS ─── */
function ChickenGame({ balance, bet, setBet, onResult }: { balance: number; bet: number; setBet: (b: number) => void; onResult: (r: GameResult) => void }) {
    const LANES = 8
    const CRASH_PROB = 0.2
    const [lane, setLane] = useState(0)
    const [phase, setPhase] = useState<"bet" | "play" | "done">("bet")
    const [crashed, setCrashed] = useState(false)
    const multiplier = +(1 + lane * 0.4).toFixed(2)

    const startGame = () => {
        setLane(0)
        setCrashed(false)
        setPhase("play")
    }

    const cross = () => {
        if (Math.random() < CRASH_PROB) {
            setCrashed(true)
            setPhase("done")
            onResult({ outcome: "loss", amount: -bet, message: `Splat! The chicken didn't make it. You lose ${fmt(bet)}.` })
        } else {
            setLane(l => l + 1)
            if (lane + 1 >= LANES) {
                setPhase("done")
                const win = Math.floor(bet * (1 + (lane + 1) * 0.4)) - bet
                onResult({ outcome: "win", amount: win, message: `The chicken crossed all ${LANES} lanes! You win ${fmt(win)}!` })
            }
        }
    }

    const cashOut = () => {
        setPhase("done")
        const win = Math.floor(bet * multiplier) - bet
        onResult({ outcome: "win", amount: win, message: `Chicken cashed out at lane ${lane}! You win ${fmt(win)} (${multiplier}x).` })
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Bird className="h-5 w-5 text-blue-500" /> Chicken Cross</CardTitle>
                <CardDescription>House edge: ~4%. Each lane has a 20% crash chance. Teaches: <strong>Overconfidence Bias</strong></CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {phase === "bet" && <BetControls bet={bet} setBet={setBet} balance={balance} onPlay={startGame} playLabel="Start Crossing" />}
                {(phase === "play" || phase === "done") && (
                    <>
                        <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-lg py-1 px-3">{multiplier}x</Badge>
                            <span className="text-sm text-muted-foreground">Lane {lane} / {LANES}</span>
                        </div>
                        <div className="space-y-2">
                            {Array.from({ length: LANES }).map((_, i) => {
                                const laneIdx = LANES - 1 - i
                                const isCurrent = laneIdx === lane && phase === "play"
                                const isPassed = laneIdx < lane
                                const isCrashLane = crashed && laneIdx === lane
                                return (
                                    <div key={i} className={cn(
                                        "h-10 rounded-lg border flex items-center justify-between px-4 text-sm transition-all",
                                        isPassed && "bg-green-500/10 border-green-500/30",
                                        isCurrent && "bg-primary/10 border-primary/50 ring-2 ring-primary/20",
                                        isCrashLane && "bg-red-500/20 border-red-500/50",
                                        !isPassed && !isCurrent && !isCrashLane && "bg-muted/30"
                                    )}>
                                        <span>Lane {laneIdx + 1}</span>
                                        <span className="font-mono text-xs">{(1 + (laneIdx + 1) * 0.4).toFixed(2)}x</span>
                                        {isPassed && <span>🐔</span>}
                                        {isCrashLane && <span>💥</span>}
                                    </div>
                                )
                            })}
                        </div>
                        {phase === "play" && (
                            <div className="flex gap-3">
                                <Button onClick={cross} className="gradient-brand text-white flex-1">Cross Next Lane</Button>
                                {lane > 0 && <Button onClick={cashOut} variant="outline" className="flex-1">Cash Out ({fmt(Math.floor(bet * multiplier))})</Button>}
                            </div>
                        )}
                        {phase === "done" && <Button onClick={() => setPhase("bet")} variant="outline">New Game</Button>}
                    </>
                )}
            </CardContent>
        </Card>
    )
}
