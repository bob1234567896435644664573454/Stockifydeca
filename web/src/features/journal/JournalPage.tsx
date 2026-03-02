import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { AppShell } from "@/components/layout/AppShell"
import { useOrders } from "@/features/student/hooks"
import { useJournalEntries, useSaveReflection } from "@/features/journal/hooks"
import {
    PenLine, ArrowUpRight, ArrowDownRight, BookOpen, Brain,
    CheckCircle2, Star, ChevronDown, ChevronUp
} from "lucide-react"

interface JournalEntry {
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

function JournalEntryCard({ entry, onReflect }: { entry: JournalEntry; onReflect: () => void }) {
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

function ReflectionEditor({ entry, onSave, onClose }: { entry: JournalEntry; onSave: (reflection: JournalEntry["reflection"], rating: number) => void; onClose: () => void }) {
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
            <CardContent className="space-y-3">
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

export function JournalPage() {
    const { data: orders } = useOrders()
    const { data: journalEntries } = useJournalEntries()
    const saveReflection = useSaveReflection()
    const [editingId, setEditingId] = useState<string | null>(null)

    // Merge order-derived entries with journal entries from Supabase/localStorage
    const entries: JournalEntry[] = useMemo(() => {
        const journalMap = new Map<string, any>()
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
                what: journalMap.get(o.id).content?.what ?? "",
                why: journalMap.get(o.id).content?.why ?? "",
                expect: journalMap.get(o.id).content?.expect ?? "",
                wrong: journalMap.get(o.id).content?.wrong ?? "",
                exit: journalMap.get(o.id).content?.exit ?? "",
            } : null,
            rating: journalMap.get(o.id)?.rating ?? null
        }))
    }, [orders, journalEntries])

    const reflectedCount = entries.filter(e => e.reflection !== null).length
    const totalXp = reflectedCount * 100

    return (
        <AppShell role="student">
            <div className="p-4 md:p-8 space-y-6 animate-fade-in">
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Trade Journal</h1>
                        <p className="text-sm text-muted-foreground mt-1">Reflect on every trade to build real investing instincts.</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1.5">
                            <BookOpen className="h-4 w-4 text-primary" />
                            <span className="font-bold">{reflectedCount}</span>
                            <span className="text-muted-foreground">reflections</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Star className="h-4 w-4 text-[hsl(var(--warning))]" />
                            <span className="font-bold stat-number">{totalXp}</span>
                            <span className="text-muted-foreground">XP earned</span>
                        </div>
                    </div>
                </div>

                {/* Editor */}
                {editingId && (
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

                {/* Insight Card */}
                {reflectedCount >= 3 && (
                    <Card className="border-primary/30 bg-primary/5 relative glass shadow-lg shadow-primary/5">
                        <div className="absolute top-0 left-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none -z-0" />
                        <CardContent className="p-4 flex items-start gap-3 relative z-10">
                            <Brain className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                            <div>
                                <div className="text-sm font-semibold">Pattern Detected</div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    You've reflected on {reflectedCount} trades. Keep going — after 5 reflections,
                                    you'll unlock AI-powered insights about your trading patterns.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Journal Entries */}
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
            </div>
        </AppShell>
    )
}
