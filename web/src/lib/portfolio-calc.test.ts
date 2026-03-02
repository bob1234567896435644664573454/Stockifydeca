import { describe, it, expect } from "vitest"
import {
    computePortfolioMetrics,
    computeMaxDrawdown,
    previewTradeImpact,
    validateInvariants,
    type PositionData,
} from "@/lib/portfolio-calc"

describe("computePortfolioMetrics", () => {
    const positions: PositionData[] = [
        { symbol: "AAPL", qty: 10, avg_cost: 150, current_price: 160 },
        { symbol: "MSFT", qty: 5, avg_cost: 300, current_price: 310 },
    ]
    const cash = 10000
    const startingCash = 100000

    it("computes equity = cash + invested value", () => {
        const m = computePortfolioMetrics(positions, cash, startingCash)
        expect(m.equity).toBe(10000 + 10 * 160 + 5 * 310)
        expect(m.investedValue).toBe(10 * 160 + 5 * 310)
        expect(m.cash).toBe(10000)
    })

    it("computes total return correctly", () => {
        const m = computePortfolioMetrics(positions, cash, startingCash)
        const expected = ((m.equity - startingCash) / startingCash) * 100
        expect(m.totalReturnPct).toBeCloseTo(expected)
    })

    it("computes HHI for two positions", () => {
        const m = computePortfolioMetrics(positions, cash, startingCash)
        // AAPL: 1600, MSFT: 1550, total: 3150
        const w1 = 1600 / 3150
        const w2 = 1550 / 3150
        const expectedHHI = (w1 * w1 + w2 * w2) * 10000
        expect(m.hhi).toBeCloseTo(expectedHHI, 0)
    })

    it("HHI = 10000 for single position", () => {
        const single = [{ symbol: "AAPL", qty: 10, avg_cost: 100, current_price: 100 }]
        const m = computePortfolioMetrics(single, 0, 1000)
        expect(m.hhi).toBe(10000)
    })

    it("HHI near 2500 for 4 equal positions", () => {
        const equal = Array.from({ length: 4 }, (_, i) => ({
            symbol: `S${i}`, qty: 10, avg_cost: 100, current_price: 100,
        }))
        const m = computePortfolioMetrics(equal, 0, 4000)
        expect(m.hhi).toBeCloseTo(2500, 0)
    })

    it("labels concentration correctly", () => {
        // 1 stock = concentrated
        const single = [{ symbol: "A", qty: 10, avg_cost: 100, current_price: 100 }]
        expect(computePortfolioMetrics(single, 0, 1000).concentrationLabel).toBe("Concentrated")

        // 10 equal stocks = diversified
        const many = Array.from({ length: 10 }, (_, i) => ({
            symbol: `S${i}`, qty: 10, avg_cost: 100, current_price: 100,
        }))
        expect(computePortfolioMetrics(many, 0, 10000).concentrationLabel).toBe("Diversified")
    })

    it("handles empty positions", () => {
        const m = computePortfolioMetrics([], 100000, 100000)
        expect(m.equity).toBe(100000)
        expect(m.hhi).toBe(0)
        expect(m.positionCount).toBe(0)
        expect(m.cashPct).toBe(100)
    })
})

describe("computeMaxDrawdown", () => {
    it("returns 0 for monotonically increasing equity", () => {
        const history = [{ equity: 100 }, { equity: 110 }, { equity: 120 }]
        expect(computeMaxDrawdown(history)).toBe(0)
    })

    it("computes drawdown correctly", () => {
        const history = [
            { equity: 100 },
            { equity: 120 },
            { equity: 90 }, // 25% drawdown from 120
            { equity: 110 },
        ]
        expect(computeMaxDrawdown(history)).toBeCloseTo(25, 0)
    })

    it("returns 0 for less than 2 data points", () => {
        expect(computeMaxDrawdown([])).toBe(0)
        expect(computeMaxDrawdown([{ equity: 100 }])).toBe(0)
    })
})

describe("previewTradeImpact", () => {
    const positions: PositionData[] = [
        { symbol: "AAPL", qty: 10, avg_cost: 150, current_price: 160 },
    ]
    const cash = 50000
    const startingCash = 100000

    it("buy trade reduces cash and increases exposure", () => {
        const impact = previewTradeImpact(positions, cash, startingCash, {
            symbol: "MSFT", side: "buy", qty: 5, price: 300,
        })
        expect(impact.cashAfter).toBe(50000 - 5 * 300)
        expect(impact.after.positionCount).toBe(2) // AAPL + MSFT
        expect(impact.tradePctOfPortfolio).toBeGreaterThan(0)
    })

    it("sell trade increases cash and reduces exposure", () => {
        const impact = previewTradeImpact(positions, cash, startingCash, {
            symbol: "AAPL", side: "sell", qty: 5, price: 160,
        })
        expect(impact.cashAfter).toBe(50000 + 5 * 160)
        expect(impact.after.allocation.find(a => a.symbol === "AAPL")?.value).toBe(5 * 160)
    })

    it("closing entire position removes it", () => {
        const impact = previewTradeImpact(positions, cash, startingCash, {
            symbol: "AAPL", side: "sell", qty: 10, price: 160,
        })
        expect(impact.after.positionCount).toBe(0)
    })

    it("K2: before.equity total is consistent", () => {
        const impact = previewTradeImpact(positions, cash, startingCash, {
            symbol: "AAPL", side: "buy", qty: 1, price: 160,
        })
        expect(impact.before.equity).toBe(cash + 10 * 160)
    })

    it("downside/upside match 5% of trade value", () => {
        const impact = previewTradeImpact(positions, cash, startingCash, {
            symbol: "AAPL", side: "buy", qty: 10, price: 100,
        })
        expect(impact.downside5pct).toBeCloseTo(10 * 100 * 0.05)
        expect(impact.upside5pct).toBeCloseTo(10 * 100 * 0.05)
    })

    it("applies slippage and fee bps to preview cash impact", () => {
        const impact = previewTradeImpact(positions, cash, startingCash, {
            symbol: "AAPL",
            side: "buy",
            qty: 10,
            price: 100,
            slippage_bps: 50, // +0.5%
            fee_bps: 10, // +0.1% on principal
        })
        const principal = 10 * 100 * 1.005
        const total = principal * 1.001
        expect(impact.cashAfter).toBeCloseTo(cash - total)
        expect(impact.after.allocation.find((a) => a.symbol === "AAPL")?.value).toBeCloseTo((10 + 10) * (100 * 1.005))
    })
})

describe("validateInvariants", () => {
    it("returns empty array for valid state", () => {
        const positions = [{ symbol: "AAPL", qty: 10, avg_cost: 150, current_price: 160 }]
        const violations = validateInvariants(positions, 50000, 50000 + 10 * 160)
        expect(violations).toEqual([])
    })

    it("catches negative cash", () => {
        const violations = validateInvariants([], -100, 0)
        expect(violations.length).toBeGreaterThan(0)
        expect(violations[0]).toContain("negative")
    })

    it("catches NaN qty", () => {
        const positions = [{ symbol: "X", qty: NaN, avg_cost: 100, current_price: 100 }]
        const violations = validateInvariants(positions, 50000, 50000)
        expect(violations.length).toBeGreaterThan(0)
        expect(violations[0]).toContain("Invalid qty")
    })

    it("catches equity mismatch", () => {
        const positions = [{ symbol: "AAPL", qty: 10, avg_cost: 150, current_price: 160 }]
        const violations = validateInvariants(positions, 50000, 99999) // wrong equity
        expect(violations.length).toBeGreaterThan(0)
        expect(violations[0]).toContain("mismatch")
    })
})
