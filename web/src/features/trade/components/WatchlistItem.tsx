import { useMarketData } from "@/features/student/hooks"
import { cn, formatCurrency } from "@/lib/utils"
import { Loader2, X } from "lucide-react"
import { Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"

export function WatchlistItem({ symbol, onRemove }: { symbol: string, onRemove: (e: React.MouseEvent) => void }) {
    const { data, isLoading } = useMarketData(symbol)

    return (
        <Link
            to="/app/trade/$symbol"
            params={{ symbol }}
            className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md group transition-colors"
            activeProps={{ className: "bg-muted" }}
        >
            <div className="flex flex-col">
                <span className="font-medium text-sm">{symbol}</span>
                <span className="text-xs text-muted-foreground">US</span>
            </div>

            <div className="flex items-center gap-3">
                <div className="flex flex-col items-end">
                    {isLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                    ) : (
                        <>
                            <span className="text-sm font-medium">{formatCurrency(data?.price || 0)}</span>
                            <span className={cn("text-xs", (data?.change || 0) >= 0 ? "text-green-600" : "text-red-600")}>
                                {(data?.change ?? 0) > 0 ? "+" : ""}{data?.change?.toFixed(2) ?? "0.00"} ({data?.change_percent?.toFixed(2) ?? "0.00"}%)
                            </span>
                        </>
                    )}
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                        e.preventDefault()
                        onRemove(e)
                    }}
                >
                    <X className="h-3 w-3" />
                </Button>
            </div>
        </Link>
    )
}
