import { z } from "zod"

/**
 * AI Response Format Contracts — Phase L1
 * 
 * Each surface defines the structure the AI output MUST follow.
 * These contracts ensure consistent insight cards, not random chat blobs.
 */

// ─── Daily Brief (Dashboard) ───

export interface DailyBriefData {
    /** 1–2 sentence summary of today's portfolio movement */
    summary: string
    /** Top 1–2 drivers (symbol + direction + magnitude) */
    drivers: {
        symbol: string
        direction: "up" | "down"
        magnitude: string // e.g. "+2.4%"
        contribution: string // e.g. "largest gainer"
    }[]
    /** One actionable next step */
    action: {
        label: string
        route: string // e.g. "/student/learn" or "/student/portfolio"
    }
    /** Data source transparency (L2) */
    dataSource: "realtime" | "cached" | "generic"
    /** Timestamp when this brief was generated */
    generatedAt: string
}

export const dataSourceSchema = z.enum(["realtime", "cached", "generic"])
export const dailyBriefDataSchema = z.object({
    summary: z.string().min(1),
    drivers: z.array(z.object({
        symbol: z.string().min(1),
        direction: z.enum(["up", "down"]),
        magnitude: z.string().min(1),
        contribution: z.string().min(1),
    })),
    action: z.object({
        label: z.string().min(1),
        route: z.string().startsWith("/"),
    }),
    dataSource: dataSourceSchema,
    generatedAt: z.string().datetime({ offset: true }),
}).strict()

// ─── Trade Mentor (OrderTicket context) ───

export interface TradeMentorResponse {
    /** Restate what the student is about to do */
    intentSummary: string
    /** Risk/exposure flag based on impact preview */
    riskFlag: {
        level: "low" | "medium" | "high"
        message: string
    } | null
    /** One question (Socratic mode) OR one alternative suggestion */
    followUp: {
        type: "question" | "alternative"
        content: string
    }
    /** Data source transparency */
    dataSource: "realtime" | "cached" | "generic"
}

export const tradeMentorResponseSchema = z.object({
    intentSummary: z.string().min(1),
    riskFlag: z.object({
        level: z.enum(["low", "medium", "high"]),
        message: z.string().min(1),
    }).nullable(),
    followUp: z.object({
        type: z.enum(["question", "alternative"]),
        content: z.string().min(1),
    }),
    dataSource: dataSourceSchema,
}).strict()

// ─── Portfolio Analyst (Portfolio page context) ───

export interface PortfolioAnalystResponse {
    /** What the metric means for this student */
    interpretation: string
    /** Comparison to benchmark or norms */
    comparison: string | null
    /** Actionable suggestion */
    suggestion: string
    /** Data source transparency */
    dataSource: "realtime" | "cached" | "generic"
}

export const portfolioAnalystResponseSchema = z.object({
    interpretation: z.string().min(1),
    comparison: z.string().nullable(),
    suggestion: z.string().min(1),
    dataSource: dataSourceSchema,
}).strict()

// ─── Journal Pattern Insight ───

export interface JournalPatternInsight {
    /** Pattern name, e.g. "Overconcentration" */
    patternName: string
    /** Plain-English explanation */
    explanation: string
    /** Evidence from journals/trades */
    evidence: string[]
    /** Improvement suggestion */
    suggestion: string
}

export const journalPatternInsightSchema = z.object({
    patternName: z.string().min(1),
    explanation: z.string().min(1),
    evidence: z.array(z.string().min(1)),
    suggestion: z.string().min(1),
}).strict()

export function parseDailyBriefData(input: unknown): DailyBriefData {
    return dailyBriefDataSchema.parse(input)
}

export function parseTradeMentorResponse(input: unknown): TradeMentorResponse {
    return tradeMentorResponseSchema.parse(input)
}

export function parsePortfolioAnalystResponse(input: unknown): PortfolioAnalystResponse {
    return portfolioAnalystResponseSchema.parse(input)
}

export function parseJournalPatternInsight(input: unknown): JournalPatternInsight {
    return journalPatternInsightSchema.parse(input)
}

export function safeParseDailyBriefData(input: unknown): DailyBriefData | null {
    const result = dailyBriefDataSchema.safeParse(input)
    return result.success ? result.data : null
}

export function safeParseTradeMentorResponse(input: unknown): TradeMentorResponse | null {
    const result = tradeMentorResponseSchema.safeParse(input)
    return result.success ? result.data : null
}

// ─── Response Cache Keys (L3: Cost + Speed) ───

/**
 * Cache key generators.
 * Daily briefs: cache per user per calendar day.
 * Definitions: cache globally forever.
 * Insights: cache per portfolio snapshot hash.
 */
export function dailyBriefCacheKey(userId: string): string {
    const today = new Date().toISOString().split("T")[0]
    return `ai:v1:daily_brief:${encodeURIComponent(userId.trim())}:${today}`
}

export function definitionCacheKey(term: string): string {
    return `ai:v1:definition:${encodeURIComponent(term.trim().toLowerCase())}`
}

export function insightCacheKey(userId: string, snapshotHash: string): string {
    return `ai:v1:insight:${encodeURIComponent(userId.trim())}:${encodeURIComponent(snapshotHash.trim())}`
}

// ─── Common Definitions Cache (L3) ───

export const CACHED_DEFINITIONS: Record<string, string> = {
    hhi: "The Herfindahl-Hirschman Index measures portfolio concentration. Under 1,500 = diversified, 1,500–2,500 = moderate, over 2,500 = concentrated. A lower HHI means your risk is spread across more holdings.",
    "max drawdown": "The largest peak-to-trough percentage decline in your portfolio value. It measures the worst possible loss you would have experienced if you bought at the peak and sold at the bottom.",
    volatility: "How much your portfolio value fluctuates over time. Higher volatility means bigger swings, both up and down. It's a measure of risk.",
    diversification: "Spreading your investments across different stocks, sectors, or asset types to reduce risk. If one investment drops, others may hold steady or rise.",
    "risk-adjusted return": "A measure of how much return you earned per unit of risk taken. The Sharpe ratio is the most common version: (return - risk-free rate) / volatility.",
    "bid-ask spread": "The difference between the highest price a buyer is willing to pay (bid) and the lowest price a seller will accept (ask). Tighter spreads mean more liquid markets.",
    "time in force": "How long your order stays active. DAY orders expire at market close. GTC (Good 'Til Cancelled) orders stay open until filled or you cancel them.",
    "stop order": "An order that becomes a market order when the stock reaches a specific price. Used to limit losses (stop-loss) or catch breakouts.",
    "market order": "An order to buy or sell immediately at the best available price. Fast execution, but you don't control the exact price.",
    "limit order": "An order to buy or sell at a specific price or better. You control the price, but the order might not fill if the market doesn't reach your limit.",
}

// ─── Rate Limiting (L3) ───

export interface RateLimitConfig {
    /** Max requests per window */
    maxRequests: number
    /** Window duration in ms */
    windowMs: number
    /** Cooldown message shown to user */
    cooldownMessage: string
}

export const RATE_LIMITS: Record<string, RateLimitConfig> = {
    mentor_chat: {
        maxRequests: 20,
        windowMs: 5 * 60 * 1000, // 5 minutes
        cooldownMessage: "You're asking great questions! Take a moment to think about what you've learned, then come back.",
    },
    daily_brief: {
        maxRequests: 3,
        windowMs: 24 * 60 * 60 * 1000, // 24 hours
        cooldownMessage: "Your daily brief refreshes once per day. Check back tomorrow!",
    },
}

/**
 * Simple client-side rate limiter.
 */
export class ClientRateLimiter {
    private timestamps: Record<string, number[]> = {}

    canProceed(key: string): boolean {
        const config = RATE_LIMITS[key]
        if (!config) return true

        const now = Date.now()
        const window = this.timestamps[key] ?? []
        const recent = window.filter(t => now - t < config.windowMs)
        this.timestamps[key] = recent

        return recent.length < config.maxRequests
    }

    record(key: string): void {
        if (!this.timestamps[key]) this.timestamps[key] = []
        this.timestamps[key].push(Date.now())
    }

    getCooldownMessage(key: string): string {
        return RATE_LIMITS[key]?.cooldownMessage ?? "Please try again later."
    }
}

export const rateLimiter = new ClientRateLimiter()
