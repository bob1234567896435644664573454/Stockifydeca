/**
 * Shared portfolio calculation utilities.
 * Used by BOTH the Impact Preview (OrderTicket) and Portfolio Analytics.
 * This ensures K2: "Impact preview must equal reality."
 */

export interface PositionData {
    symbol: string
    qty: number
    avg_cost: number
    current_price: number
}

export interface PortfolioMetrics {
    equity: number
    cash: number
    investedValue: number
    totalReturn: number
    totalReturnPct: number
    hhi: number
    concentrationLabel: "Diversified" | "Moderate" | "Concentrated"
    maxDrawdown: number
    positionCount: number
    cashPct: number
    allocation: { symbol: string; value: number; weight: number }[]
}

/**
 * Compute all portfolio metrics from positions + cash + starting cash.
 * Single source of truth for dashboard, portfolio page, and impact preview.
 */
export function computePortfolioMetrics(
    positions: PositionData[],
    cash: number,
    startingCash: number
): PortfolioMetrics {
    const allocation = positions.map(p => ({
        symbol: p.symbol,
        value: p.qty * p.current_price,
        weight: 0, // computed below
    }))

    const investedValue = allocation.reduce((s, a) => s + a.value, 0)
    const equity = cash + investedValue

    // Compute weights
    if (equity > 0) {
        for (const a of allocation) {
            a.weight = a.value / equity
        }
    }

    const totalReturn = equity - startingCash
    const totalReturnPct = startingCash > 0 ? (totalReturn / startingCash) * 100 : 0

    // HHI (Herfindahl–Hirschman Index)
    // Uses position weights only (excluding cash)
    const totalPositionValue = allocation.reduce((s, a) => s + a.value, 0)
    let hhi = 0
    if (totalPositionValue > 0) {
        hhi = allocation.reduce((s, a) => {
            const w = a.value / totalPositionValue
            return s + w * w
        }, 0) * 10000
    }

    const concentrationLabel: PortfolioMetrics["concentrationLabel"] =
        hhi < 1500 ? "Diversified" : hhi < 2500 ? "Moderate" : "Concentrated"

    const cashPct = equity > 0 ? (cash / equity) * 100 : 0

    return {
        equity,
        cash,
        investedValue,
        totalReturn,
        totalReturnPct,
        hhi,
        concentrationLabel,
        maxDrawdown: 0, // needs equity history, computed separately
        positionCount: positions.length,
        cashPct,
        allocation,
    }
}

/**
 * Compute max drawdown from an equity time series.
 */
export function computeMaxDrawdown(equityHistory: { equity: number }[]): number {
    if (equityHistory.length < 2) return 0
    let peak = equityHistory[0].equity
    let maxDD = 0
    for (const point of equityHistory) {
        if (point.equity > peak) peak = point.equity
        const dd = peak > 0 ? (peak - point.equity) / peak : 0
        if (dd > maxDD) maxDD = dd
    }
    return maxDD * 100
}

/**
 * Preview the impact of a trade on the current portfolio.
 * Used by OrderTicket impact preview — shares the same math as computePortfolioMetrics.
 */
export function previewTradeImpact(
    positions: PositionData[],
    cash: number,
    startingCash: number,
    trade: {
        symbol: string
        side: "buy" | "sell"
        qty: number
        price: number
        fee_bps?: number
        slippage_bps?: number
    }
): {
    before: PortfolioMetrics
    after: PortfolioMetrics
    tradeValue: number
    tradePctOfPortfolio: number
    cashAfter: number
    downside5pct: number
    upside5pct: number
} {
    const before = computePortfolioMetrics(positions, cash, startingCash)

    const isBuy = trade.side === "buy"
    const feeBps = Number(trade.fee_bps ?? 0)
    const slippageBps = Number(trade.slippage_bps ?? 0)
    const slippageMultiplier = 1 + ((isBuy ? slippageBps : -slippageBps) / 10000)
    const effectivePrice = trade.price * slippageMultiplier
    const principal = trade.qty * effectivePrice
    const fee = principal * (feeBps / 10000)
    const tradeValue = principal + fee

    // Simulate post-trade positions
    const afterPositions = [...positions.map(p => ({ ...p }))]
    const existing = afterPositions.find(p => p.symbol === trade.symbol)

    if (isBuy) {
        if (existing) {
            const newQty = existing.qty + trade.qty
            existing.avg_cost = (existing.avg_cost * existing.qty + tradeValue) / newQty
            existing.qty = newQty
            existing.current_price = effectivePrice
        } else {
            afterPositions.push({
                symbol: trade.symbol,
                qty: trade.qty,
                avg_cost: trade.qty > 0 ? tradeValue / trade.qty : effectivePrice,
                current_price: effectivePrice,
            })
        }
    } else {
        if (existing) {
            existing.qty = Math.max(0, existing.qty - trade.qty)
        }
    }

    const cashAfter = isBuy ? cash - tradeValue : cash + (principal - fee)
    const after = computePortfolioMetrics(
        afterPositions.filter(p => p.qty > 0),
        cashAfter,
        startingCash
    )

    return {
        before,
        after,
        tradeValue,
        tradePctOfPortfolio: before.equity > 0 ? (principal / before.equity) * 100 : 0,
        cashAfter,
        downside5pct: principal * 0.05,
        upside5pct: principal * 0.05,
    }
}

/**
 * Validate portfolio invariants. Returns list of violations.
 * Phase K1: These must ALWAYS hold.
 */
export function validateInvariants(
    positions: PositionData[],
    cash: number,
    equity: number
): string[] {
    const violations: string[] = []

    // K1: Cash never goes negative
    if (cash < -0.01) {
        violations.push(`Cash is negative: ${cash.toFixed(2)}`)
    }

    // K1: Positions qty never NaN/undefined
    for (const p of positions) {
        if (!Number.isFinite(p.qty) || p.qty < 0) {
            violations.push(`Invalid qty for ${p.symbol}: ${p.qty}`)
        }
        if (!Number.isFinite(p.avg_cost) || p.avg_cost < 0) {
            violations.push(`Invalid avg_cost for ${p.symbol}: ${p.avg_cost}`)
        }
    }

    // K1: Equity = cash + Σ(qty * markPrice)
    const computedEquity = cash + positions.reduce((s, p) => s + p.qty * (p.current_price ?? 0), 0)
    if (Math.abs(computedEquity - equity) > 0.01) {
        violations.push(`Equity mismatch: reported=${equity.toFixed(2)} computed=${computedEquity.toFixed(2)}`)
    }

    return violations
}
