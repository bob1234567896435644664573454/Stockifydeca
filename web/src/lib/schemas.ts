import { z } from "zod"

export const UserSchema = z.object({
    id: z.string().uuid(),
    email: z.string().email().optional(),
    role: z.enum(["student", "teacher", "org_admin", "platform_admin"]).optional(),
})

export const OrderSchema = z.object({
    id: z.string().uuid(),
    symbol: z.string(),
    side: z.enum(["buy", "sell"]),
    type: z.enum(["market", "limit", "stop", "stop_limit"]),
    qty: z.number(),
    price: z.number().nullable().optional(),
    status: z.string(),
    created_at: z.string(),
})

export const PositionSchema = z.object({
    symbol: z.string(),
    qty: z.number(),
    avg_cost: z.number(),
    current_price: z.number(),
    market_value: z.number(),
    unrealized_pnl: z.number(),
    return_pct: z.number(),
})

export const LeaderboardRankingSchema = z.object({
    student_id: z.string().optional(),
    display_name: z.string().optional(),
    rank: z.number(),
    prev_rank: z.number(),
    score: z.number(),
    equity: z.number(),
    return_pct: z.number(),
    penalties: z.number(),
    is_me: z.boolean().optional(),
})

export const LeaderboardResponseSchema = z.object({
    competition_id: z.string().optional(),
    generated_at: z.string(),
    rankings: z.array(LeaderboardRankingSchema),
    page_size: z.number().optional(),
    offset: z.number().optional(),
})
