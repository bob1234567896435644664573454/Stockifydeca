import { useState } from "react"
import { toast } from "sonner"

const STORAGE_KEY = "stockify_watchlist"

export function useWatchlist() {
    const [watchlist, setWatchlist] = useState<string[]>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            return stored ? JSON.parse(stored) : ["AAPL", "GOOGL", "MSFT", "TSLA", "AMZN"]
        } catch (e) {
            console.error("Failed to parse watchlist", e)
            return ["AAPL", "GOOGL", "MSFT", "TSLA", "AMZN"]
        }
    })

    const toggleSymbol = (symbol: string) => {
        const upper = symbol.toUpperCase()
        const isIncluded = watchlist.includes(upper)

        const next = isIncluded
            ? watchlist.filter(s => s !== upper)
            : [...watchlist, upper]

        setWatchlist(next)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))

        if (isIncluded) {
            toast.success(`Removed ${upper} from watchlist`)
        } else {
            toast.success(`Added ${upper} to watchlist`)
        }
    }

    return {
        watchlist,
        toggleSymbol,
        isInWatchlist: (symbol: string) => watchlist.includes(symbol.toUpperCase())
    }
}
