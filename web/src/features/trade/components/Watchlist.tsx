import { useWatchlist } from "../hooks/useWatchlist"
import { WatchlistItem } from "./WatchlistItem"


export function Watchlist() {
    const { watchlist, toggleSymbol } = useWatchlist()

    return (
        <div className="flex flex-col h-full bg-background border-r">
            <div className="p-3 border-b flex justify-between items-center bg-muted/30">
                <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Watchlist</h3>
                <span className="text-xs text-muted-foreground">{watchlist.length}</span>
            </div>
            <div className="flex-1 overflow-auto">
                <div className="p-2 space-y-0.5">
                    {watchlist.length === 0 ? (
                        <div className="p-4 text-center text-xs text-muted-foreground">
                            No symbols added.
                        </div>
                    ) : (
                        watchlist.map(symbol => (
                            <WatchlistItem
                                key={symbol}
                                symbol={symbol}
                                onRemove={(e) => {
                                    e.stopPropagation()
                                    toggleSymbol(symbol)
                                }}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
