import { formatCurrency, formatNumber } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface ChartLegendProps {
    symbol: string
    price: number | null
    open?: number | null
    high?: number | null
    low?: number | null
    close?: number | null
    change?: number | null
    changePercent?: number | null
    volume?: number | null
    className?: string
}

export function ChartLegend({
    symbol,
    price,
    open,
    high,
    low,
    close,
    change,
    // changePercent,
    volume,
    className
}: ChartLegendProps) {
    const isUp = (change ?? 0) >= 0

    return (
        <div className={cn("absolute top-3 left-3 z-10 bg-background/80 backdrop-blur-sm p-2 rounded border shadow-sm text-xs font-mono tabular-nums pointer-events-none select-none", className)}>
            <div className="flex items-baseline gap-2 mb-1">
                <span className="font-bold text-sm text-foreground">{symbol}</span>
                {price !== null && (
                    <span className={cn("text-sm font-semibold", isUp ? "text-green-500" : "text-red-500")}>
                        {formatCurrency(price)}
                    </span>
                )}
            </div>

            {(open !== undefined && open !== null) && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-muted-foreground">
                    <div className="flex justify-between gap-2"><span>O</span> <span className="text-foreground">{formatNumber(open)}</span></div>
                    <div className="flex justify-between gap-2"><span>H</span> <span className="text-foreground">{formatNumber(high)}</span></div>
                    <div className="flex justify-between gap-2"><span>L</span> <span className="text-foreground">{formatNumber(low)}</span></div>
                    <div className="flex justify-between gap-2"><span>C</span> <span className="text-foreground">{formatNumber(close)}</span></div>
                    {volume !== undefined && (
                        <div className="col-span-2 flex justify-between gap-2 mt-1 pt-1 border-t">
                            <span>Vol</span> <span className="text-foreground">{formatNumber(volume)}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
