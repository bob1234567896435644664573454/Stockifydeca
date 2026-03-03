import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { AppShell } from "@/components/layout/AppShell"
import { useOrders } from "@/features/student/hooks"
import { useJournalEntries, useSaveReflection } from "@/features/journal/hooks"
import type { JournalEntry as JournalEntryType } from "@/features/journal/hooks"
import {
    PenLine, ArrowUpRight, ArrowDownRight, BookOpen, Brain,
    CheckCircle2, Star, ChevronDown, ChevronUp, Lightbulb,
    TrendingUp, Calendar, FileText, Target, AlertTriangle,
    Flame, BarChart3, Sparkles, Clock
} from "lucide-react"

/* ─── Types ─── */
interface TradeJournalEntry {
    orderId: string
    symbol: string
    side: "buy" | "sell"
    qty: number
    status: string
    date: string
    reflection: {
        what: string
        why: string
        expect: string
        wrong: string
        exit: string
    } | null
    rating: number | null
}

type TabId = "trades" | "weekly" | "thesis" | "insights"

/* ─── Pattern Insights Panel ─── */
function PatternInsightsPanel({ entries, journalEntries }: { entries: TradeJournalEntry[]; journalEntries: JournalEntryType[] }) {
    const reflected = entries.filter(e => e.reflection !== null)
    const totalReflections = reflected.length + journalEntries.filter(e => e.content_type !== "trade_reflection").length

    // Compute patterns
    const patterns = useMemo(() => {
        const results: { icon: React.ReactNode; title: string; description: string; type: "positive" | "warning" | "neutral" }[] = []

        // Buy/Sell ratio
        const buys = reflected.filter(e => e.side === "buy").length
        const sells = reflected.filter(e => e.side === "sell").length
        if (buys > 0 || sells > 0) {
            const ratio = buys / (buys + sells)
            if (ratio > 0.8) {
                results.push({
                    icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
                    title: "Heavy Buy Bias",
                    description: `${(ratio * 100).toFixed(0)}% of your reflected trades are buys. Consider if you're missing sell signals.`,
                    type: "warning"
                })
            } else {
                results.push({
                    icon: <BarChart3 className="h-4 w-4 text-blue-500" />,
                    title: "Balanced Trading",
                    description: `${buys} buys, ${sells} sells reflected. Good balance of entry and exit decisions.`,
                    type: "positive"
                })
            }
        }

        // Average rating
        const rated = reflected.filter(e => e.rating !== null)
        if (rated.length >= 3) {
            const avgRating = rated.reduce((a, b) => a + (b.rating ?? 0), 0) / rated.length
            if (avgRating >= 4) {
                results.push({
                    icon: <Star className="h-4 w-4 text-yellow-500" />,
                    title: "High Confidence Trader",
                    description: `Average self-assessment: ${avgRating.toFixed(1)}/5. You're confident in your decisions.`,
                    type: "positive"
                })
            } else if (avgRating < 3) {
                results.push({
                    icon: <Lightbulb className="h-4 w-4 text-amber-500" />,
                    title: "Room for Growth",
                    description: `Average self-assessment: ${avgRating.toFixed(1)}/5. Focus on trades where you have higher conviction.`,
                    type: "warning"
                })
            }
        }

        // Symbol concentration
        const symbolCounts: Record<string, number> = {}
        reflected.forEach(e => { symbolCounts[e.symbol] = (symbolCounts[e.symbol] || 0) + 1 })
        const topSymbol = Object.entries(symbolCounts).sort((a, b) => b[1] - a[1])[0]
        if (topSymbol && topSymbol[1] >= 3) {
            results.push({
                icon: <Target className="h-4 w-4 text-primary" />,
                title: `${topSymbol[0]} Focus`,
                description: `You've reflected on ${topSymbol[1]} trades in ${topSymbol[0]}. Deep knowledge in a stock is valuable.`,
                type: "neutral"
            })
        }

        // Reflection streak
        if (totalReflections >= 5) {
            results.push({
                icon: <Flame className="h-4 w-4 text-orange-500" />,
                title: "Reflection Streak",
                description: `${totalReflections} total reflections! Consistent journaling builds real investing instincts.`,
                type: "positive"
            })
        }

        return results
    }, [reflected, journalEntries])

    if (totalReflections < 3) {
        return (
            <Card className="glass border-border/50">
                <CardContent className="p-8 text-center">
                    <Brain className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="font-medium text-muted-foreground">Not enough data yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        Complete at least 3 reflections to unlock AI-powered pattern insights.
                    </p>
                    <div className="mt-4 flex justify-center">
                        <div className="flex gap-1">
                            {[1, 2, 3].map(i => (
                                <div key={i} className={`h-2 w-8 rounded-full ${i <= totalReflections ? 'bg-primary' : 'bg-muted'}`} />
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Your Trading Patterns</span>
                <Badge variant="outline" className="text-[10px]">Based on {totalReflections} reflections</Badge>
            </div>
            {patterns.map((p, i) => (
                <Card key={i} className={`glass border-border/50 ${p.type === 'warning' ? 'border-l-2 border-l-amber-500' : p.type === 'positive' ? 'border-l-2 border-l-green-500' : ''}`}>
                    <CardContent className="p-4 flex items-start gap-3">
                        <div className="mt-0.5">{p.icon}</div>
                        <div>
                            <div className="text-sm font-semibold">{p.title}</div>
                            <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}

/* ─── Trade Entry Card ─── */
function JournalEntryCard({ entry, onReflect }: { entry: TradeJournalEntry; onReflect: () => void }) {
    const [expanded, setExpanded] = useState(false)
    const isBuy = entry.side === "buy"

    return (
        <Card className="animate-slide-up overflow-hidden relative glass border-border/50 group">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl pointer-events-none transition-opacity opacity-0 group-hover:opacity-100" style={{ backgroundColor: isBuy ? 'hsl(var(--chart-up) / 0.1)' : 'hsl(var(--chart-down) / 0.1)' }} />
            <CardContent className="p-4 relative z-10">
                <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isBuy ? 'bg-[hsl(var(--chart-up))]/10' : 'bg-[hsl(var(--chart-down))]/10'}`}>
                        {isBuy ? <ArrowUpRight className="h-4 w-4 text-[hsl(var(--chart-up))]" /> : <ArrowDownRight className="h-4 w-4 text-[hsl(var(--chart-down))]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{entry.side.toUpperCase()} {entry.qty} {entry.symbol}</span>
                            <Badge variant="outline" className="text-[10px] capitalize">{entry.status}</Badge>
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                            {new Date(entry.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {entry.reflection ? (
                            <Badge className="bg-[hsl(var(--chart-up))]/10 text-[hsl(var(--chart-up))] border-0 text-[10px]">
                                <CheckCircle2 className="h-3 w-3 mr-0.5" /> Reflected
                            </Badge>
                        ) : (
                            <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={onReflect}>
                                <PenLine className="h-3 w-3" /> Reflect
                            </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(!expanded)}>
                            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </Button>
                    </div>
                </div>

                {expanded && entry.reflection && (
                    <div className="mt-3 pt-3 border-t space-y-2 text-sm animate-slide-up">
                        <div><strong className="text-xs text-muted-foreground">What I did:</strong><p className="text-sm">{entry.reflection.what}</p></div>
                        <div><strong className="text-xs text-muted-foreground">Why:</strong><p className="text-sm">{entry.reflection.why}</p></div>
                        <div><strong className="text-xs text-muted-foreground">What I expect:</strong><p className="text-sm">{entry.reflection.expect}</p></div>
                        {entry.reflection.wrong && <div><strong className="text-xs text-muted-foreground">What would prove me wrong:</strong><p className="text-sm">{entry.reflection.wrong}</p></div>}
                        {entry.reflection.exit && <div><strong className="text-xs text-muted-foreground">Exit plan:</strong><p className="text-sm">{entry.reflection.exit}</p></div>}
                        {entry.rating && (
                            <div className="flex items-center gap-1 pt-1">
                                {[1, 2, 3, 4, 5].map(s => (
                                    <Star key={s} className={`h-3.5 w-3.5 ${s <= entry.rating! ? 'text-[hsl(var(--warning))] fill-[hsl(var(--warning))]' : 'text-muted-foreground/30'}`} />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

/* ─── Trade Reflection Editor ─── */
function ReflectionEditor({ entry, onSave, onClose }: { entry: TradeJournalEntry; onSave: (reflection: TradeJournalEntry["reflection"], rating: number) => void; onClose: () => void }) {
    const [what, setWhat] = useState("")
    const [why, setWhy] = useState("")
    const [expect, setExpect] = useState("")
    const [wrong, setWrong] = useState("")
    const [exit, setExit] = useState("")
    const [rating, setRating] = useState(0)

    return (
        <Card className="animate-scale-in border-primary/30 relative glass shadow-xl shadow-primary/5">
            <div className="absolute inset-0 bg-primary/5 rounded-xl pointer-events-none -z-0" />
            <CardHeader className="pb-3 relative z-10">
                <CardTitle className="text-base flex items-center gap-2">
                    <PenLine className="h-4 w-4 text-primary" />
                    Reflect on: {entry.side.toUpperCase()} {entry.qty} {entry.symbol}
                </CardTitle>
                <CardDescription>Writing builds investing instincts. +100 XP for reflecting.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 relative z-10">
                <div>
                    <label className="text-xs font-medium text-muted-foreground">What I did</label>
                    <Textarea value={what} onChange={e => setWhat(e.target.value)} placeholder={`I ${entry.side === 'buy' ? 'bought' : 'sold'} ${entry.qty} shares of ${entry.symbol}...`} className="mt-1 h-16 text-sm" />
                </div>
                <div>
                    <label className="text-xs font-medium text-muted-foreground">Why I did it</label>
                    <Textarea value={why} onChange={e => setWhy(e.target.value)} placeholder="My reasoning was..." className="mt-1 h-16 text-sm" />
                </div>
                <div>
                    <label className="text-xs font-medium text-muted-foreground">What I expect to happen</label>
                    <Textarea value={expect} onChange={e => setExpect(e.target.value)} placeholder="I think the price will..." className="mt-1 h-16 text-sm" />
                </div>
                <div>
                    <label className="text-xs font-medium text-muted-foreground">What would prove me wrong</label>
                    <Textarea value={wrong} onChange={e => setWrong(e.target.value)} placeholder="I'd reconsider if..." className="mt-1 h-12 text-sm" />
                </div>
                <div>
                    <label className="text-xs font-medium text-muted-foreground">My exit plan</label>
                    <Textarea value={exit} onChange={e => setExit(e.target.value)} placeholder="I'll sell when..." className="mt-1 h-12 text-sm" />
                </div>
                <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Self-assessment</label>
                    <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(s => (
                            <button key={s} type="button" onClick={() => setRating(s)} className="p-0.5">
                                <Star className={`h-5 w-5 transition-colors ${s <= rating ? 'text-[hsl(var(--warning))] fill-[hsl(var(--warning))]' : 'text-muted-foreground/30 hover:text-[hsl(var(--warning))]/50'}`} />
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex gap-2 pt-2">
                    <Button onClick={() => onSave({ what, why, expect, wrong, exit }, rating)} disabled={!what || !why} className="flex-1">
                        Save Reflection (+100 XP)
                    </Button>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                </div>
            </CardContent>
        </Card>
    )
}

/* ─── Weekly Reflection Editor ─── */
function WeeklyReflectionEditor({ onSave }: { onSave: (content: { summary: string; lessons: string; goals: string }, rating: number) => void }) {
    const [summary, setSummary] = useState("")
    const [lessons, setLessons] = useState("")
    const [goals, setGoals] = useState("")
    const [rating, setRating] = useState(0)

    return (
        <Card className="animate-scale-in border-primary/30 relative glass shadow-xl shadow-primary/5">
            <div className="absolute inset-0 bg-primary/5 rounded-xl pointer-events-none -z-0" />
            <CardHeader className="pb-3 relative z-10">
                <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    Weekly Reflection
                </CardTitle>
                <CardDescription>Step back and review your week. What worked? What didn't? +200 XP.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 relative z-10">
                <div>
                    <label className="text-xs font-medium text-muted-foreground">Week Summary</label>
                    <Textarea value={summary} onChange={e => setSummary(e.target.value)} placeholder="This week I focused on..." className="mt-1 h-20 text-sm" />
                </div>
                <div>
                    <label className="text-xs font-medium text-muted-foreground">Key Lessons Learned</label>
                    <Textarea value={lessons} onChange={e => setLessons(e.target.value)} placeholder="The biggest thing I learned was..." className="mt-1 h-20 text-sm" />
                </div>
                <div>
                    <label className="text-xs font-medium text-muted-foreground">Goals for Next Week</label>
                    <Textarea value={goals} onChange={e => setGoals(e.target.value)} placeholder="Next week I want to..." className="mt-1 h-16 text-sm" />
                </div>
                <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">How was your week?</label>
                    <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(s => (
                            <button key={s} type="button" onClick={() => setRating(s)} className="p-0.5">
                                <Star className={`h-5 w-5 transition-colors ${s <= rating ? 'text-[hsl(var(--warning))] fill-[hsl(var(--warning))]' : 'text-muted-foreground/30 hover:text-[hsl(var(--warning))]/50'}`} />
                            </button>
                        ))}
                    </div>
                </div>
                <Button onClick={() => onSave({ summary, lessons, goals }, rating)} disabled={!summary || !lessons} className="w-full">
                    Save Weekly Reflection (+200 XP)
                </Button>
            </CardContent>
        </Card>
    )
}

/* ─── Investment Thesis Editor ─── */
function ThesisEditor({ onSave }: { onSave: (content: { believe: string; because: string; wrongIf: string; timeHorizon: string; riskPlan: string }, symbol: string) => void }) {
    const [symbol, setSymbol] = useState("")
    const [believe, setBelieve] = useState("")
    const [because, setBecause] = useState("")
    const [wrongIf, setWrongIf] = useState("")
    const [timeHorizon, setTimeHorizon] = useState("")
    const [riskPlan, setRiskPlan] = useState("")

    return (
        <Card className="animate-scale-in border-primary/30 relative glass shadow-xl shadow-primary/5">
            <div className="absolute inset-0 bg-primary/5 rounded-xl pointer-events-none -z-0" />
            <CardHeader className="pb-3 relative z-10">
                <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Investment Thesis
                </CardTitle>
                <CardDescription>Write a structured thesis before investing. This is how professionals think. +150 XP.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 relative z-10">
                <div>
                    <label className="text-xs font-medium text-muted-foreground">Symbol</label>
                    <Input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} placeholder="AAPL" className="mt-1 font-mono uppercase" maxLength={5} />
                </div>
                <div>
                    <label className="text-xs font-medium text-muted-foreground">I believe...</label>
                    <Textarea value={believe} onChange={e => setBelieve(e.target.value)} placeholder="I believe AAPL will..." className="mt-1 h-16 text-sm" />
                </div>
                <div>
                    <label className="text-xs font-medium text-muted-foreground">Because...</label>
                    <Textarea value={because} onChange={e => setBecause(e.target.value)} placeholder="The evidence supporting this is..." className="mt-1 h-16 text-sm" />
                </div>
                <div>
                    <label className="text-xs font-medium text-muted-foreground">I'd be wrong if...</label>
                    <Textarea value={wrongIf} onChange={e => setWrongIf(e.target.value)} placeholder="This thesis breaks if..." className="mt-1 h-12 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs font-medium text-muted-foreground">Time Horizon</label>
                        <Input value={timeHorizon} onChange={e => setTimeHorizon(e.target.value)} placeholder="3 months" className="mt-1 text-sm" />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-muted-foreground">Risk Plan</label>
                        <Input value={riskPlan} onChange={e => setRiskPlan(e.target.value)} placeholder="Stop-loss at -10%" className="mt-1 text-sm" />
                    </div>
                </div>
                <Button onClick={() => onSave({ believe, because, wrongIf, timeHorizon, riskPlan }, symbol)} disabled={!symbol || !believe || !because} className="w-full">
                    Save Thesis (+150 XP)
                </Button>
            </CardContent>
        </Card>
    )
}

/* ─── Saved Thesis Card ─── */
function ThesisCard({ entry }: { entry: JournalEntryType }) {
    const [expanded, setExpanded] = useState(false)
    return (
        <Card className="glass border-border/50 animate-slide-up">
            <CardContent className="p-4">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{entry.symbol} Thesis</span>
                            <Badge variant="outline" className="text-[10px]">Investment Thesis</Badge>
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                            {new Date(entry.created_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(!expanded)}>
                        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </Button>
                </div>
                {expanded && (
                    <div className="mt-3 pt-3 border-t space-y-2 text-sm animate-slide-up">
                        {entry.content.believe && <div><strong className="text-xs text-muted-foreground">I believe:</strong><p>{entry.content.believe}</p></div>}
                        {entry.content.because && <div><strong className="text-xs text-muted-foreground">Because:</strong><p>{entry.content.because}</p></div>}
                        {entry.content.wrongIf && <div><strong className="text-xs text-muted-foreground">Wrong if:</strong><p>{entry.content.wrongIf}</p></div>}
                        {entry.content.timeHorizon && <div><strong className="text-xs text-muted-foreground">Time horizon:</strong><p>{entry.content.timeHorizon}</p></div>}
                        {entry.content.riskPlan && <div><strong className="text-xs text-muted-foreground">Risk plan:</strong><p>{entry.content.riskPlan}</p></div>}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

/* ─── Saved Weekly Reflection Card ─── */
function WeeklyCard({ entry }: { entry: JournalEntryType }) {
    const [expanded, setExpanded] = useState(false)
    return (
        <Card className="glass border-border/50 animate-slide-up">
            <CardContent className="p-4">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                        <Calendar className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">Weekly Reflection</span>
                            <Badge variant="outline" className="text-[10px]">Week of {new Date(entry.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</Badge>
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                            {new Date(entry.created_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                    </div>
                    {entry.rating && (
                        <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map(s => (
                                <Star key={s} className={`h-3 w-3 ${s <= entry.rating! ? 'text-[hsl(var(--warning))] fill-[hsl(var(--warning))]' : 'text-muted-foreground/30'}`} />
                            ))}
                        </div>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(!expanded)}>
                        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </Button>
                </div>
                {expanded && (
                    <div className="mt-3 pt-3 border-t space-y-2 text-sm animate-slide-up">
                        {entry.content.summary && <div><strong className="text-xs text-muted-foreground">Summary:</strong><p>{entry.content.summary}</p></div>}
                        {entry.content.lessons && <div><strong className="text-xs text-muted-foreground">Lessons:</strong><p>{entry.content.lessons}</p></div>}
                        {entry.content.goals && <div><strong className="text-xs text-muted-foreground">Goals:</strong><p>{entry.content.goals}</p></div>}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

/* ─── Main Journal Page ─── */
export function JournalPage() {
    const { data: orders } = useOrders()
    const { data: journalEntries } = useJournalEntries()
    const saveReflection = useSaveReflection()
    const [editingId, setEditingId] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<TabId>("trades")
    const [showWeeklyEditor, setShowWeeklyEditor] = useState(false)
    const [showThesisEditor, setShowThesisEditor] = useState(false)

    // Merge order-derived entries with journal entries from Supabase
    const entries: TradeJournalEntry[] = useMemo(() => {
        const journalMap = new Map<string, JournalEntryType>()
        for (const je of journalEntries ?? []) {
            if (je.order_id) journalMap.set(je.order_id, je)
        }

        return (orders || []).map(o => ({
            orderId: o.id,
            symbol: o.symbol,
            side: o.side,
            qty: o.qty,
            status: o.status,
            date: o.updated_at,
            reflection: journalMap.has(o.id) ? {
                what: journalMap.get(o.id)!.content?.what ?? "",
                why: journalMap.get(o.id)!.content?.why ?? "",
                expect: journalMap.get(o.id)!.content?.expect ?? "",
                wrong: journalMap.get(o.id)!.content?.wrong ?? "",
                exit: journalMap.get(o.id)!.content?.exit ?? "",
            } : null,
            rating: journalMap.get(o.id)?.rating ?? null
        }))
    }, [orders, journalEntries])

    const weeklyEntries = useMemo(() => (journalEntries ?? []).filter(e => e.content_type === "weekly_reflection"), [journalEntries])
    const thesisEntries = useMemo(() => (journalEntries ?? []).filter(e => e.content_type === "thesis"), [journalEntries])

    const reflectedCount = entries.filter(e => e.reflection !== null).length
    const totalXp = reflectedCount * 100 + weeklyEntries.length * 200 + thesisEntries.length * 150

    const tabs: { id: TabId; label: string; icon: React.ReactNode; count?: number }[] = [
        { id: "trades", label: "Trade Reflections", icon: <PenLine className="h-3.5 w-3.5" />, count: entries.length },
        { id: "weekly", label: "Weekly", icon: <Calendar className="h-3.5 w-3.5" />, count: weeklyEntries.length },
        { id: "thesis", label: "Thesis", icon: <FileText className="h-3.5 w-3.5" />, count: thesisEntries.length },
        { id: "insights", label: "Insights", icon: <Brain className="h-3.5 w-3.5" /> },
    ]

    return (
        <AppShell role="student">
            <div className="p-4 md:p-8 space-y-6 animate-fade-in">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Trade Journal</h1>
                        <p className="text-sm text-muted-foreground mt-1">Reflect on every trade to build real investing instincts.</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1.5">
                            <BookOpen className="h-4 w-4 text-primary" />
                            <span className="font-bold">{reflectedCount + weeklyEntries.length + thesisEntries.length}</span>
                            <span className="text-muted-foreground">entries</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Flame className="h-4 w-4 text-orange-500" />
                            <span className="font-bold stat-number">{totalXp}</span>
                            <span className="text-muted-foreground">XP</span>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 p-1 rounded-lg bg-muted/50 border overflow-x-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                                activeTab === tab.id
                                    ? 'bg-background shadow-sm text-foreground'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {tab.icon}
                            {tab.label}
                            {tab.count !== undefined && (
                                <Badge variant="secondary" className="text-[10px] h-4 px-1">{tab.count}</Badge>
                            )}
                        </button>
                    ))}
                </div>

                {/* Trade Reflections Tab */}
                {activeTab === "trades" && (
                    <>
                        {editingId && entries.find(e => e.orderId === editingId) && (
                            <ReflectionEditor
                                entry={entries.find(e => e.orderId === editingId)!}
                                onSave={(reflection, rating) => {
                                    const entry = entries.find(e => e.orderId === editingId)
                                    if (entry) {
                                        saveReflection.mutate({
                                            orderId: editingId,
                                            symbol: entry.symbol,
                                            side: entry.side,
                                            contentType: "trade_reflection",
                                            content: reflection ?? {},
                                            rating,
                                        })
                                    }
                                    setEditingId(null)
                                }}
                                onClose={() => setEditingId(null)}
                            />
                        )}

                        {reflectedCount >= 3 && (
                            <Card className="border-primary/30 bg-primary/5 relative glass shadow-lg shadow-primary/5">
                                <CardContent className="p-4 flex items-start gap-3">
                                    <Brain className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                                    <div>
                                        <div className="text-sm font-semibold">Pattern Detected</div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            You've reflected on {reflectedCount} trades. Check the Insights tab to see your trading patterns.
                                        </p>
                                    </div>
                                    <Button variant="outline" size="sm" className="text-xs shrink-0 ml-auto" onClick={() => setActiveTab("insights")}>
                                        <Sparkles className="h-3 w-3 mr-1" /> View Insights
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        <div className="space-y-3">
                            {entries.length === 0 ? (
                                <Card className="relative glass border-border/50">
                                    <CardContent className="p-10 text-center relative z-10">
                                        <PenLine className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                                        <p className="font-medium text-muted-foreground">No trades to reflect on yet</p>
                                        <p className="text-xs text-muted-foreground mt-1">Place your first trade and come back here to journal.</p>
                                    </CardContent>
                                </Card>
                            ) : (
                                entries.map(entry => (
                                    <JournalEntryCard
                                        key={entry.orderId}
                                        entry={entry}
                                        onReflect={() => setEditingId(entry.orderId)}
                                    />
                                ))
                            )}
                        </div>
                    </>
                )}

                {/* Weekly Reflections Tab */}
                {activeTab === "weekly" && (
                    <>
                        {!showWeeklyEditor && (
                            <Button onClick={() => setShowWeeklyEditor(true)} className="gradient-brand text-white border-0">
                                <Calendar className="h-4 w-4 mr-2" /> Write Weekly Reflection (+200 XP)
                            </Button>
                        )}

                        {showWeeklyEditor && (
                            <WeeklyReflectionEditor
                                onSave={(content, rating) => {
                                    saveReflection.mutate({
                                        symbol: "PORTFOLIO",
                                        contentType: "weekly_reflection",
                                        content,
                                        rating,
                                    })
                                    setShowWeeklyEditor(false)
                                }}
                            />
                        )}

                        <div className="space-y-3">
                            {weeklyEntries.length === 0 && !showWeeklyEditor ? (
                                <Card className="relative glass border-border/50">
                                    <CardContent className="p-10 text-center relative z-10">
                                        <Calendar className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                                        <p className="font-medium text-muted-foreground">No weekly reflections yet</p>
                                        <p className="text-xs text-muted-foreground mt-1">Write your first weekly reflection to track your growth over time.</p>
                                    </CardContent>
                                </Card>
                            ) : (
                                weeklyEntries.map(entry => (
                                    <WeeklyCard key={entry.id} entry={entry} />
                                ))
                            )}
                        </div>
                    </>
                )}

                {/* Investment Thesis Tab */}
                {activeTab === "thesis" && (
                    <>
                        {!showThesisEditor && (
                            <Button onClick={() => setShowThesisEditor(true)} className="gradient-brand text-white border-0">
                                <FileText className="h-4 w-4 mr-2" /> Write Investment Thesis (+150 XP)
                            </Button>
                        )}

                        {showThesisEditor && (
                            <ThesisEditor
                                onSave={(content, symbol) => {
                                    saveReflection.mutate({
                                        symbol,
                                        contentType: "thesis",
                                        content,
                                    })
                                    setShowThesisEditor(false)
                                }}
                            />
                        )}

                        <div className="space-y-3">
                            {thesisEntries.length === 0 && !showThesisEditor ? (
                                <Card className="relative glass border-border/50">
                                    <CardContent className="p-10 text-center relative z-10">
                                        <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                                        <p className="font-medium text-muted-foreground">No investment theses yet</p>
                                        <p className="text-xs text-muted-foreground mt-1">Write a structured thesis before investing — this is how professionals think.</p>
                                    </CardContent>
                                </Card>
                            ) : (
                                thesisEntries.map(entry => (
                                    <ThesisCard key={entry.id} entry={entry} />
                                ))
                            )}
                        </div>
                    </>
                )}

                {/* Insights Tab */}
                {activeTab === "insights" && (
                    <PatternInsightsPanel entries={entries} journalEntries={journalEntries ?? []} />
                )}
            </div>
        </AppShell>
    )
}
