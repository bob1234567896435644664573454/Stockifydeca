import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/lib/api"
import { useActiveAccount } from "@/hooks/useActiveAccount"
import { usePositions, useOrders } from "@/features/student/hooks"
import { computePortfolioMetrics, type PositionData } from "@/lib/portfolio-calc"

export interface Challenge {
    id: string
    title: string
    description: string
    category: "portfolio" | "learning" | "trading" | "social"
    xp_reward: number
    icon: string
    target: number
    // Derived from portfolio/order state:
    progress: number
    completed: boolean
}

export interface Achievement {
    id: string
    title: string
    description: string
    icon: string
    earned_at: string | null
}

/**
 * Fetches challenges from Supabase. Falls back to dynamic challenges
 * computed from portfolio/order state if the table isn't populated yet.
 */
export function useChallenges() {
    const { data: account } = useActiveAccount()
    const { data: positions } = usePositions()
    const { data: orders } = useOrders()

    return useQuery({
        queryKey: ["challenges", account?.id],
        enabled: !!account?.id,
        queryFn: async () => {
            // Try Supabase first
            const { data, error } = await supabase
                .from("challenge_progress")
                .select("*, challenge:challenges(*)")
                .eq("account_id", account!.id)

            if (!error && data && data.length > 0) {
                return data.map((cp: any) => ({
                    id: cp.challenge.id,
                    title: cp.challenge.title,
                    description: cp.challenge.description,
                    category: cp.challenge.category,
                    xp_reward: cp.challenge.xp_reward,
                    icon: cp.challenge.icon,
                    target: cp.challenge.target,
                    progress: cp.progress,
                    completed: cp.completed,
                })) as Challenge[]
            }

            // Fallback: compute dynamic challenges from portfolio state
            return computeDynamicChallenges(positions ?? [], orders ?? [], account?.cash_balance ?? 0, account?.starting_cash ?? account?.cash_balance ?? 0)
        },
    })
}

export function useAchievements() {
    const { data: account } = useActiveAccount()

    return useQuery({
        queryKey: ["achievements", account?.id],
        enabled: !!account?.id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from("user_achievements")
                .select("*, achievement:achievements(*)")
                .eq("user_id", account!.id)

            if (!error && data && data.length > 0) {
                return data.map((ua: any) => ({
                    id: ua.achievement.id,
                    title: ua.achievement.title,
                    description: ua.achievement.description,
                    icon: ua.achievement.icon,
                    earned_at: ua.earned_at,
                })) as Achievement[]
            }

            // Fallback: static achievement list (all locked)
            return getDefaultAchievements()
        },
    })
}

export function useUpdateProgress() {
    const { data: account } = useActiveAccount()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ challengeId, progress }: { challengeId: string; progress: number }) => {
            if (!account?.id) throw new Error("No active account")
            const { error } = await supabase
                .from("challenge_progress")
                .upsert({
                    account_id: account.id,
                    challenge_id: challengeId,
                    progress,
                    completed: progress >= 100,
                })
            if (error) {
                console.warn("Failed to update challenge:", error.message)
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["challenges", account?.id] })
        },
    })
}

// ─── Dynamic challenge computation ───

function computeDynamicChallenges(
    positions: any[],
    orders: any[],
    cash: number,
    startingCash: number,
): Challenge[] {
    const posData: PositionData[] = positions.map(p => ({
        symbol: p.symbol,
        qty: p.qty,
        avg_cost: p.avg_cost,
        current_price: p.current_price ?? p.avg_cost,
    }))

    const metrics = posData.length > 0
        ? computePortfolioMetrics(posData, cash, startingCash)
        : null

    const numPositions = positions.length
    const numOrders = orders.length
    const journalDrafts = JSON.parse(localStorage.getItem('stockify_journal_drafts') || '[]')

    return [
        {
            id: "first_trade",
            title: "First Trade",
            description: "Place your very first order",
            category: "trading",
            xp_reward: 50,
            icon: "🎯",
            target: 1,
            progress: Math.min(numOrders, 1),
            completed: numOrders >= 1,
        },
        {
            id: "diversify_3",
            title: "Diversified Investor",
            description: "Hold 3 or more different stocks",
            category: "portfolio",
            xp_reward: 100,
            icon: "📊",
            target: 3,
            progress: numPositions,
            completed: numPositions >= 3,
        },
        {
            id: "diversify_5",
            title: "Portfolio Pro",
            description: "Hold 5 or more different stocks",
            category: "portfolio",
            xp_reward: 200,
            icon: "🏆",
            target: 5,
            progress: numPositions,
            completed: numPositions >= 5,
        },
        {
            id: "reflect_3",
            title: "Thoughtful Trader",
            description: "Write 3 trade journal reflections",
            category: "learning",
            xp_reward: 150,
            icon: "📝",
            target: 3,
            progress: journalDrafts.length,
            completed: journalDrafts.length >= 3,
        },
        {
            id: "low_hhi",
            title: "Risk Manager",
            description: "Keep your HHI below 2,500 (well-diversified)",
            category: "portfolio",
            xp_reward: 200,
            icon: "🛡️",
            target: 1,
            progress: metrics && metrics.hhi < 2500 && numPositions >= 3 ? 1 : 0,
            completed: metrics !== null && metrics.hhi < 2500 && numPositions >= 3,
        },
        {
            id: "trade_10",
            title: "Active Trader",
            description: "Place 10 total orders",
            category: "trading",
            xp_reward: 150,
            icon: "⚡",
            target: 10,
            progress: numOrders,
            completed: numOrders >= 10,
        },
    ]
}

function getDefaultAchievements(): Achievement[] {
    return [
        { id: "first_trade", title: "First Steps", description: "Placed your first trade", icon: "🎯", earned_at: null },
        { id: "first_journal", title: "Deep Thinker", description: "Wrote your first reflection", icon: "📝", earned_at: null },
        { id: "diversified", title: "Diversified", description: "Hold 5+ stocks simultaneously", icon: "📊", earned_at: null },
        { id: "risk_aware", title: "Risk Aware", description: "Reviewed impact preview before trading", icon: "🛡️", earned_at: null },
        { id: "thesis_builder", title: "Thesis Builder", description: "Completed a full investment thesis", icon: "💡", earned_at: null },
        { id: "streak_5", title: "5-Day Streak", description: "Active for 5 consecutive days", icon: "🔥", earned_at: null },
    ]
}

// ─── Activity Data (for calendar heatmap) ───

export interface DayActivity {
    date: string
    count: number
}

export function useActivityData() {
    const { data: orders = [] } = useOrders()
    const { data: challenges = [] } = useChallenges()

    const totalXp = challenges.filter(c => c.completed).reduce((s, c) => s + c.xp_reward, 0)

    // Build daily activity map from orders
    const dailyMap = new Map<string, number>()
    for (const order of orders) {
        const date = new Date(order.updated_at).toISOString().split("T")[0]
        dailyMap.set(date, (dailyMap.get(date) || 0) + 25) // 25 XP per trade activity
    }

    // Also count journal entries
    try {
        const drafts = JSON.parse(localStorage.getItem("stockify_journal_drafts") || "[]")
        for (const d of drafts) {
            if (d.date) {
                const date = new Date(d.date).toISOString().split("T")[0]
                dailyMap.set(date, (dailyMap.get(date) || 0) + 15)
            }
        }
    } catch { /* ignore */ }

    const activityData: DayActivity[] = Array.from(dailyMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))

    // Calculate streaks
    const today = new Date().toISOString().split("T")[0]
    const activeDays = new Set(activityData.map(d => d.date))

    let streak = 0
    const checkDate = new Date()
    while (true) {
        const key = checkDate.toISOString().split("T")[0]
        if (activeDays.has(key)) {
            streak++
            checkDate.setDate(checkDate.getDate() - 1)
        } else if (key === today) {
            // Today hasn't had activity yet, give benefit of doubt
            checkDate.setDate(checkDate.getDate() - 1)
        } else {
            break
        }
    }

    // Longest streak
    let longestStreak = 0
    let currentStreak = 0
    const sortedDates = Array.from(activeDays).sort()
    for (let i = 0; i < sortedDates.length; i++) {
        if (i === 0) {
            currentStreak = 1
        } else {
            const prev = new Date(sortedDates[i - 1])
            const curr = new Date(sortedDates[i])
            const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
            currentStreak = diff === 1 ? currentStreak + 1 : 1
        }
        longestStreak = Math.max(longestStreak, currentStreak)
    }

    return { activityData, streak, longestStreak, totalXp }
}
