import { createContext, useContext } from "react"

export interface MarketRule {
    delayed_quotes_seconds: number
    symbol_allowed: boolean
    market_hours_mode: string
    short_selling_enabled: boolean
    slippage_model?: {
        bps?: number
    }
    fee_model?: {
        bps?: number
    }
}

export interface MarketContextType {
    symbol: string
    price: number
    change: number
    changePercent: number
    isLoading: boolean
    rules?: MarketRule
    position?: {
        qty: number
        avg_cost: number
    } | null
    competitionId?: string
    trading_enabled?: boolean
}

export const MarketContext = createContext<MarketContextType | undefined>(undefined)
export const MarketProvider = MarketContext.Provider

export const useMarket = () => {
    const context = useContext(MarketContext)
    if (context === undefined) {
        throw new Error("useMarket must be used within a MarketProvider")
    }
    return context
}
