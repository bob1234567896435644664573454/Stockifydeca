import { useState, useEffect, useCallback, useMemo } from "react"
import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useMarket } from "./MarketContextObject"
import { usePlaceOrder, usePositions } from "@/features/student/hooks"
import { useActiveAccount } from "@/hooks/useActiveAccount"
import { formatCurrency } from "@/lib/utils"
import { Loader2, AlertCircle, PenLine } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { previewTradeImpact, type PositionData } from "@/lib/portfolio-calc"

const orderSchema = z.object({
    side: z.enum(["buy", "sell"]),
    qty: z.coerce.number().positive("Quantity must be positive"),
    type: z.enum(["market", "limit", "stop"]),
    limit_price: z.coerce.number().optional(),
    stop_price: z.coerce.number().optional(),
    time_in_force: z.enum(["day", "gtc"]).default("day"),
}).superRefine((data, ctx) => {
    if (data.type === "limit" && (!data.limit_price || data.limit_price <= 0)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Price is required for limit orders",
            path: ["limit_price"]
        })
    }
    if (data.type === "stop" && (!data.stop_price || data.stop_price <= 0)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Price is required for stop orders",
            path: ["stop_price"]
        })
    }
})

type OrderForm = z.infer<typeof orderSchema>
type PendingOrder = OrderForm & { client_request_id: string }

function useDebouncedValue<T>(value: T, delayMs = 120): T {
    const [debounced, setDebounced] = useState(value)

    useEffect(() => {
        const timeoutId = window.setTimeout(() => setDebounced(value), delayMs)
        return () => window.clearTimeout(timeoutId)
    }, [value, delayMs])

    return debounced
}

/** Impact Preview panel using the shared portfolio-calc (K2 — preview = reality) */
function ImpactPreviewPanel({
    symbol,
    side,
    qty,
    price,
    feeBps,
    slippageBps,
}: {
    symbol: string
    side: "buy" | "sell"
    qty: number
    price: number
    feeBps?: number
    slippageBps?: number
}) {
    const { data: positions } = usePositions()
    const { data: account } = useActiveAccount()

    const impact = useMemo(() => {
        const posData: PositionData[] = (positions ?? []).map(p => ({
            symbol: p.symbol,
            qty: p.qty,
            avg_cost: p.avg_cost,
            current_price: p.current_price ?? p.avg_cost,
        }))
        return previewTradeImpact(
            posData,
            account?.cash_balance ?? 0,
            account?.starting_cash ?? account?.cash_balance ?? 0,
            { symbol, side, qty, price, fee_bps: feeBps, slippage_bps: slippageBps }
        )
    }, [positions, account, symbol, side, qty, price, feeBps, slippageBps])

    const hhiDelta = impact.after.hhi - impact.before.hhi

    // Compute warnings
    const warnings: string[] = []
    const symbolAllocation = impact.after.allocation.find(a => a.symbol === symbol)
    if (symbolAllocation && symbolAllocation.weight * 100 > 35) {
        warnings.push(`This trade puts ${symbol} at ${(symbolAllocation.weight * 100).toFixed(1)}% of your portfolio (over 35% threshold)`)
    }
    if (impact.after.hhi > 2500 && impact.before.hhi <= 2500) {
        warnings.push(`Portfolio becomes overconcentrated (HHI ${impact.after.hhi.toFixed(0)} > 2,500)`)
    }
    if (impact.cashAfter < 0) {
        warnings.push("Insufficient cash for this trade")
    }
    const cashPctUsed = account?.cash_balance ? ((account.cash_balance - impact.cashAfter) / account.cash_balance) * 100 : 0
    if (side === 'buy' && cashPctUsed > 80) {
        warnings.push(`This trade uses ${cashPctUsed.toFixed(0)}% of your available cash`)
    }

    return (
        <div className="rounded-lg border border-border/50 glass p-3 space-y-2 animate-slide-up relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[hsl(var(--accent-indigo))]/10 rounded-full blur-2xl pointer-events-none -z-0" />
            <div className="relative z-10">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Estimated Portfolio Impact</div>
                <div className="text-xs space-y-1.5">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Estimated trade as % of portfolio</span>
                        <span className="font-medium">{impact.tradePctOfPortfolio.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Estimated cash after trade</span>
                        <span className={`font-medium ${impact.cashAfter < 0 ? 'text-[hsl(var(--destructive))]' : ''}`}>
                            {formatCurrency(impact.cashAfter)}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Estimated impact if price drops 5%</span>
                        <span className="font-medium text-[hsl(var(--chart-down))]">
                            -{formatCurrency(impact.downside5pct)}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Estimated impact if price rises 5%</span>
                        <span className="font-medium text-[hsl(var(--chart-up))]">
                            +{formatCurrency(impact.upside5pct)}
                        </span>
                    </div>
                    {Math.abs(hhiDelta) > 10 && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Concentration change</span>
                            <span className={`font-medium ${hhiDelta > 0 ? 'text-[hsl(var(--warning))]' : 'text-[hsl(var(--chart-up))]'}`}>
                                HHI {hhiDelta > 0 ? '+' : ''}{hhiDelta.toFixed(0)} → {impact.after.concentrationLabel}
                            </span>
                        </div>
                    )}
                    {impact.cashAfter < 0 && (
                        <div className="text-[hsl(var(--destructive))] font-semibold pt-1 border-t mt-1">
                            ⚠ Insufficient cash for this trade
                        </div>
                    )}
                    {warnings.length > 0 && impact.cashAfter >= 0 && (
                        <div className="pt-2 mt-1 border-t space-y-1">
                            {warnings.filter(w => !w.includes('Insufficient')).map((w, i) => (
                                <div key={i} className="text-xs text-[hsl(var(--warning))] flex items-start gap-1.5">
                                    <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                    <span>{w}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export function OrderTicket() {
    const { symbol, price, position, rules, trading_enabled, isLoading: isMarketLoading } = useMarket()
    const { mutate: placeOrder, isPending } = usePlaceOrder()
    const { data: account } = useActiveAccount()
    const [activeTab, setActiveTab] = useState("market")
    const [showConfirm, setShowConfirm] = useState(false)
    const [showJournalPrompt, setShowJournalPrompt] = useState(false)
    const [journalNote, setJournalNote] = useState("")
    const [lastOrderSymbol, setLastOrderSymbol] = useState("")
    const [lastOrderSide, setLastOrderSide] = useState<"buy" | "sell">("buy")
    const [pendingOrder, setPendingOrder] = useState<PendingOrder | null>(null)

    const { register, handleSubmit, watch, setValue, formState: { errors }, reset } = useForm<OrderForm>({
        resolver: zodResolver(orderSchema) as unknown as Resolver<OrderForm>,
        defaultValues: {
            side: "buy",
            type: "market",
            time_in_force: "day",
            qty: 1
        }
    })

    const side = watch("side")
    const qty = watch("qty") || 0
    const limitPrice = watch("limit_price")

    const estPrice = activeTab === "limit" ? (limitPrice || price) : price
    const debouncedQty = useDebouncedValue(qty)
    const debouncedEstPrice = useDebouncedValue(estPrice)
    const estTotal = estPrice * qty
    const estFee = Math.max(1, estTotal * 0.001) // Mock fee
    const feeBps = Number(rules?.fee_model?.bps ?? 0)
    const slippageBps = Number(rules?.slippage_model?.bps ?? 0)

    const onReview = useCallback((data: OrderForm) => {
        setPendingOrder({
            ...data,
            client_request_id: crypto.randomUUID(),
        })
        setShowConfirm(true)
    }, [])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ctrl+Enter or Cmd+Enter to open review
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault()
                handleSubmit((data) => onReview(data))()
            }
            // Esc to close modal or reset
            if (e.key === 'Escape') {
                if (showConfirm) setShowConfirm(false)
                else reset({ side: 'buy', type: 'market', time_in_force: 'day', qty: 1 })
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [handleSubmit, onReview, reset, showConfirm])

    const onConfirm = () => {
        if (!pendingOrder) return
        placeOrder({
            symbol,
            side: pendingOrder.side,
            type: pendingOrder.type,
            qty: pendingOrder.qty,
            limit_price: pendingOrder.limit_price,
            stop_price: pendingOrder.stop_price,
            time_in_force: pendingOrder.time_in_force,
            client_request_id: pendingOrder.client_request_id,
        }, {
            onSuccess: () => {
                setShowConfirm(false)
                setLastOrderSymbol(symbol)
                setLastOrderSide(pendingOrder.side)
                setJournalNote("")
                setShowJournalPrompt(true)
                reset()
            }
        })
    }

    return (
        <>
            <Card className="h-full border-l border-border/50 rounded-none border-y-0 glass bg-background/80 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[hsl(var(--accent-blue))]/5 rounded-full blur-3xl pointer-events-none -z-0" />
                <CardHeader className="pb-3 relative z-10">
                    <CardTitle className="text-lg flex justify-between items-center">
                        <span>Order Ticket</span>
                        <span className="text-sm font-normal text-muted-foreground">
                            {symbol} @ {formatCurrency(price)}
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="relative z-10">
                    {!isMarketLoading && trading_enabled === false && (
                        <Alert variant="destructive" className="mb-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Trading Frozen</AlertTitle>
                            <AlertDescription>
                                Order placement is currently disabled for this class or account.
                            </AlertDescription>
                        </Alert>
                    )}
                    <form onSubmit={handleSubmit((data) => onReview(data))} className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                type="button"
                                variant={side === "buy" ? "default" : "outline"}
                                className={side === "buy" ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                                onClick={() => setValue("side", "buy")}
                            >
                                Buy
                            </Button>
                            <Button
                                type="button"
                                variant={side === "sell" ? "default" : "outline"}
                                className={side === "sell" ? "bg-red-600 hover:bg-red-700 text-white" : ""}
                                onClick={() => setValue("side", "sell")}
                            >
                                Sell
                            </Button>
                        </div>

                        <Tabs value={activeTab} onValueChange={(v) => {
                            setActiveTab(v)
                            setValue("type", v as "market" | "limit" | "stop")
                        }}>
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="market">Market</TabsTrigger>
                                <TabsTrigger value="limit">Limit</TabsTrigger>
                                <TabsTrigger value="stop">Stop</TabsTrigger>
                            </TabsList>

                            <div className="pt-4 space-y-4">
                                <div className="space-y-2">
                                    <Label>Quantity</Label>
                                    <Input type="number" {...register("qty")} />
                                    {errors.qty && <p className="text-xs text-red-500">{errors.qty.message}</p>}
                                </div>

                                {activeTab === "limit" && (
                                    <div className="space-y-2">
                                        <Label>Limit Price</Label>
                                        <Input type="number" step="0.01" {...register("limit_price")} />
                                        {errors.limit_price && <p className="text-xs text-red-500">{errors.limit_price.message}</p>}
                                    </div>
                                )}

                                {activeTab === "stop" && (
                                    <div className="space-y-2">
                                        <Label>Stop Price</Label>
                                        <Input type="number" step="0.01" {...register("stop_price")} />
                                        {errors.stop_price && <p className="text-xs text-red-500">{errors.stop_price.message}</p>}
                                    </div>
                                )}
                            </div>
                        </Tabs>

                        <div className="py-2 space-y-1 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Est. Price</span>
                                <span>{formatCurrency(estPrice)}</span>
                            </div>
                            <div className="flex justify-between font-medium">
                                <span>Est. Total</span>
                                <span>{formatCurrency(estTotal)}</span>
                            </div>
                            {position && (
                                <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t mt-2 items-center">
                                    <span>Pos: {position.qty}</span>
                                    {position.qty !== 0 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-auto p-0 text-blue-500 hover:text-blue-700 hover:bg-transparent font-normal"
                                            onClick={() => {
                                                setValue("side", position.qty > 0 ? "sell" : "buy")
                                                setValue("qty", Math.abs(position.qty))
                                                setValue("type", "market")
                                                setActiveTab("market")
                                            }}
                                        >
                                            Close Position
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Quick Amount Buttons */}
                        <div className="grid grid-cols-4 gap-1.5">
                            {[0.25, 0.5, 0.75, 1].map(pct => (
                                <Button
                                    key={pct}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="text-xs h-7"
                                    onClick={() => {
                                        if (price > 0) {
                                            const buyCapacity = Math.floor((account?.cash_balance ?? 0) * pct / estPrice)
                                            const sellCapacity = Math.floor(Math.max(0, position?.qty ?? 0) * pct)
                                            const maxQty = side === "buy" ? buyCapacity : sellCapacity
                                            if (maxQty > 0) setValue("qty", maxQty)
                                        }
                                    }}
                                >
                                    {pct * 100}%
                                </Button>
                            ))}
                        </div>

                        {/* Impact Preview — uses shared portfolio-calc (K2) */}
                        {debouncedQty > 0 && debouncedEstPrice > 0 && (
                            <ImpactPreviewPanel
                                symbol={symbol}
                                side={side}
                                qty={debouncedQty}
                                price={debouncedEstPrice}
                                feeBps={feeBps}
                                slippageBps={slippageBps}
                            />
                        )}

                        <Button type="submit" className="w-full" disabled={isPending || isMarketLoading || trading_enabled === false}>
                            Review Order
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Order</DialogTitle>
                        <DialogDescription>
                            Please review your order details before placing.
                        </DialogDescription>
                    </DialogHeader>
                    {pendingOrder && (
                        <div className="py-4 space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Action</span>
                                <Badge variant={pendingOrder.side === 'buy' ? 'default' : 'destructive'} className="uppercase">
                                    {pendingOrder.side}
                                </Badge>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Symbol</span>
                                <span className="font-bold">{symbol}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Quantity</span>
                                <span>{pendingOrder.qty}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Type</span>
                                <span className="uppercase">{pendingOrder.type}</span>
                            </div>
                            <div className="pt-2 border-t flex justify-between items-center font-medium">
                                <span>Est. Total</span>
                                <span>{formatCurrency(estTotal)}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs text-muted-foreground">
                                <span>Est. Commission</span>
                                <span>{formatCurrency(estFee)}</span>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancel</Button>
                        <Button onClick={onConfirm} disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm Order
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Post-Trade Journal Prompt */}
            <Dialog open={showJournalPrompt} onOpenChange={setShowJournalPrompt}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <PenLine className="h-5 w-5 text-primary" />
                            Quick Reflection
                        </DialogTitle>
                        <DialogDescription>
                            Your {lastOrderSide} order for {lastOrderSymbol} has been placed.
                            Take a moment to record why you made this trade.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-2 space-y-3">
                        <Textarea
                            placeholder="Why did you make this trade? What's your thesis? What would make you wrong?"
                            value={journalNote}
                            onChange={(e) => setJournalNote(e.target.value)}
                            className="min-h-[100px] resize-none"
                        />
                        <p className="text-xs text-muted-foreground">
                            This note will be saved to your trade journal. Consistent journaling improves your process score.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowJournalPrompt(false)}>Skip</Button>
                        <Button
                            onClick={() => {
                                if (journalNote.trim()) {
                                    // Store in localStorage for now; B6 will wire to Supabase journal_entries
                                    const entries = JSON.parse(localStorage.getItem('stockify_journal_drafts') || '[]')
                                    entries.push({
                                        symbol: lastOrderSymbol,
                                        side: lastOrderSide,
                                        note: journalNote.trim(),
                                        timestamp: new Date().toISOString(),
                                    })
                                    localStorage.setItem('stockify_journal_drafts', JSON.stringify(entries))
                                }
                                setShowJournalPrompt(false)
                            }}
                            disabled={!journalNote.trim()}
                        >
                            Save Reflection
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
