import { afterEach, describe, expect, it, vi } from "vitest"
import {
    __resetPortfolioRefreshTimersForTests,
    refreshStudentPortfolio,
    scheduleStudentPortfolioRefresh,
} from "@/lib/portfolio-refresh"

function makeQueryClient() {
    return {
        invalidateQueries: vi.fn().mockResolvedValue(undefined),
    } as unknown as { invalidateQueries: ReturnType<typeof vi.fn> }
}

afterEach(() => {
    __resetPortfolioRefreshTimersForTests()
    vi.useRealTimers()
})

describe("refreshStudentPortfolio", () => {
    it("invalidates targeted student keys for the active account", async () => {
        const queryClient = makeQueryClient()

        await refreshStudentPortfolio(queryClient as any, "acc-1")

        expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(3)
        expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
            queryKey: ["student", "orders", "acc-1"],
            exact: false,
            refetchType: "active",
        })
        expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
            queryKey: ["student", "positions", "acc-1"],
            exact: true,
            refetchType: "active",
        })
        expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
            queryKey: ["student", "equity", "acc-1"],
            exact: true,
            refetchType: "active",
        })
    })

    it("optionally refreshes active account in addition to portfolio keys", async () => {
        const queryClient = makeQueryClient()

        await refreshStudentPortfolio(queryClient as any, "acc-1", { includeActiveAccount: true })

        expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(4)
        expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
            queryKey: ["activeAccount"],
            exact: false,
            refetchType: "active",
        })
    })
})

describe("scheduleStudentPortfolioRefresh", () => {
    it("debounces repeated refresh requests for the same account", async () => {
        vi.useFakeTimers()
        const queryClient = makeQueryClient()

        scheduleStudentPortfolioRefresh(queryClient as any, "acc-1", { debounceMs: 100 })
        scheduleStudentPortfolioRefresh(queryClient as any, "acc-1", { debounceMs: 100 })
        scheduleStudentPortfolioRefresh(queryClient as any, "acc-1", { debounceMs: 100 })

        expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(0)

        await vi.advanceTimersByTimeAsync(99)
        expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(0)

        await vi.advanceTimersByTimeAsync(1)
        expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(3)
    })
})
