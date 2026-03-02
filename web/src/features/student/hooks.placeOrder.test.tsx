// @vitest-environment jsdom
import React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const postMock = vi.fn()
const refreshMock = vi.fn().mockResolvedValue(undefined)

vi.mock("@/hooks/useActiveAccount", () => ({
    useActiveAccount: () => ({
        data: {
            id: "44444444-4444-4444-4444-444444444441",
            cash_balance: 100000,
            starting_cash: 100000,
        },
    }),
}))

vi.mock("@/lib/api", () => ({
    api: {
        post: (...args: unknown[]) => postMock(...args),
    },
    supabase: {},
}))

vi.mock("@/lib/portfolio-invariants", () => ({
    validateAndReportInvariants: vi.fn(),
}))

vi.mock("@/lib/portfolio-refresh", async () => {
    const actual = await vi.importActual<typeof import("@/lib/portfolio-refresh")>("@/lib/portfolio-refresh")
    return {
        ...actual,
        refreshStudentPortfolio: (...args: unknown[]) => refreshMock(...args),
    }
})

vi.mock("sonner", () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}))

import { usePlaceOrder } from "@/features/student/hooks"

describe("usePlaceOrder idempotency payload", () => {
    beforeEach(() => {
        postMock.mockReset()
        postMock.mockResolvedValue({ result: { order_id: "order-1" } })
        refreshMock.mockClear()
    })

    it("reuses caller-provided client_request_id across retries", async () => {
        const queryClient = new QueryClient()
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        )

        const { result } = renderHook(() => usePlaceOrder(), { wrapper })

        const payload = {
            symbol: "AAPL",
            qty: 1,
            side: "buy",
            type: "market",
            client_request_id: "retry-same-id-001",
        }

        await act(async () => {
            await result.current.mutateAsync(payload)
            await result.current.mutateAsync(payload)
        })

        expect(postMock).toHaveBeenCalledTimes(2)
        expect(postMock).toHaveBeenNthCalledWith(
            1,
            "/trade/place",
            expect.objectContaining({ client_request_id: "retry-same-id-001" })
        )
        expect(postMock).toHaveBeenNthCalledWith(
            2,
            "/trade/place",
            expect.objectContaining({ client_request_id: "retry-same-id-001" })
        )
    })
})
