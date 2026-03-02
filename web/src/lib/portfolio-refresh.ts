import type { QueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/queryKeys"

/**
 * Centralized portfolio refresh behavior so trade/realtime paths invalidate
 * the same keys consistently.
 */
const refreshTimers = new Map<string, number>()

interface RefreshOptions {
    includeActiveAccount?: boolean
    includeOrders?: boolean
}

export async function refreshStudentPortfolio(
    queryClient: QueryClient,
    accountId?: string | null,
    options: RefreshOptions = {}
): Promise<void> {
    const resolvedAccountId = accountId ?? ""
    const includeActiveAccount = options.includeActiveAccount ?? false
    const includeOrders = options.includeOrders ?? true
    const invalidations = [
        queryClient.invalidateQueries({
            queryKey: queryKeys.student.positions(resolvedAccountId),
            exact: true,
            refetchType: "active",
        }),
        queryClient.invalidateQueries({
            queryKey: queryKeys.student.equity(resolvedAccountId),
            exact: true,
            refetchType: "active",
        }),
    ]

    if (includeOrders) {
        invalidations.push(
            queryClient.invalidateQueries({
                queryKey: ["student", "orders", resolvedAccountId],
                exact: false,
                refetchType: "active",
            })
        )
    }

    if (includeActiveAccount) {
        invalidations.push(
            queryClient.invalidateQueries({
                queryKey: ["activeAccount"],
                exact: false,
                refetchType: "active",
            })
        )
    }

    await Promise.all(invalidations)
}

export function scheduleStudentPortfolioRefresh(
    queryClient: QueryClient,
    accountId?: string | null,
    options: RefreshOptions & { debounceMs?: number } = {}
): void {
    const resolvedAccountId = accountId ?? ""
    const includeActiveAccount = options.includeActiveAccount ?? false
    const debounceMs = Math.max(0, options.debounceMs ?? 150)
    const timerKey = `${resolvedAccountId}:${includeActiveAccount ? "1" : "0"}`

    const existingTimer = refreshTimers.get(timerKey)
    if (existingTimer !== undefined) {
        clearTimeout(existingTimer)
    }

    const timer = window.setTimeout(() => {
        refreshTimers.delete(timerKey)
        void refreshStudentPortfolio(queryClient, resolvedAccountId, { includeActiveAccount })
    }, debounceMs)

    refreshTimers.set(timerKey, timer)
}

export function __resetPortfolioRefreshTimersForTests(): void {
    for (const timer of refreshTimers.values()) {
        clearTimeout(timer)
    }
    refreshTimers.clear()
}
