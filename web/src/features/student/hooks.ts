import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { useActiveAccount } from "@/hooks/useActiveAccount"
import { queryKeys } from "@/lib/queryKeys"
import { toast } from "sonner"
import { supabase } from "@/lib/api"
import { validateAndReportInvariants } from "@/lib/portfolio-invariants"
import { refreshStudentPortfolio } from "@/lib/portfolio-refresh"

const PORTFOLIO_POLL_MS = 30_000

export function useEquity() {
    const { data: account } = useActiveAccount()
    const accountId = account?.id

    return useQuery({
        queryKey: queryKeys.student.equity(accountId || ""),
        queryFn: () => api.get<{ equity: number }>(`/trade/equity`, { account_id: accountId }),
        enabled: !!accountId,
        refetchInterval: PORTFOLIO_POLL_MS,
    })
}

export interface Position {
    symbol: string
    qty: number
    avg_cost: number
    realized_pnl: number
    market_price?: number
    current_price?: number
}

export function usePositions() {
    const { data: account } = useActiveAccount()
    const accountId = account?.id

    return useQuery({
        queryKey: queryKeys.student.positions(accountId || ""),
        queryFn: async () => {
            const res = await api.get<{ items: Position[] }>(`/trade/positions`, {
                account_id: accountId,
                page: 1,
                page_size: 100
            })
            return (res.items ?? []).map((position) => ({
                ...position,
                current_price: position.current_price ?? position.market_price ?? position.avg_cost,
            }))
        },
        enabled: !!accountId,
        refetchInterval: PORTFOLIO_POLL_MS,
    })
}

export interface Order {
    id: string
    symbol: string
    side: "buy" | "sell"
    qty: number
    filled_qty: number
    order_type: string
    status: string
    updated_at: string
    filled_avg_price?: number
}

export function useOrders(status?: string, enabled = true) {
    const { data: account } = useActiveAccount()
    const accountId = account?.id

    return useQuery({
        queryKey: queryKeys.student.orders(accountId || "", status),
        queryFn: async () => {
            const params: Record<string, string | number> = {
                account_id: accountId || "",
                page: 1,
                page_size: 50
            }
            if (status) params.status = status

            const res = await api.get<{ items: Order[] }>(`/trade/orders`, params)
            return res.items
        },
        enabled: !!accountId && enabled,
        refetchInterval: PORTFOLIO_POLL_MS,
    })
}

export function usePlaceOrder() {
    const { data: account } = useActiveAccount()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (payload: {
            symbol: string
            qty: number
            side: string
            type: string
            limit_price?: number
            stop_price?: number
            time_in_force?: string
            client_request_id?: string
        }) => {
            if (!account) throw new Error("No active account")

            const cachedPositions = queryClient.getQueryData<Position[]>(
                queryKeys.student.positions(account.id)
            ) ?? []
            const invariantPositions = cachedPositions.map((position) => ({
                symbol: position.symbol,
                qty: position.qty,
                avg_cost: position.avg_cost,
                current_price: position.current_price ?? position.market_price ?? position.avg_cost,
            }))
            const cash = Number(account.cash_balance ?? 0)
            const equity = cash + invariantPositions.reduce(
                (sum, position) => sum + position.qty * position.current_price,
                0
            )
            validateAndReportInvariants({
                positions: invariantPositions,
                cash,
                equity,
                scope: "trade.place.pre_submit",
                metadata: {
                    accountId: account.id,
                    symbol: payload.symbol,
                    side: payload.side,
                    qty: payload.qty,
                    type: payload.type,
                },
            })

            return api.post("/trade/place", {
                account_id: account.id,
                client_request_id: payload.client_request_id ?? crypto.randomUUID(),
                payload: {
                    symbol: payload.symbol,
                    side: payload.side,
                    qty: payload.qty,
                    order_type: payload.type,
                    limit_price: payload.limit_price,
                    stop_price: payload.stop_price,
                    tif: payload.time_in_force || "day"
                }
            })
        },
        onSuccess: async () => {
            toast.success("Order Placed")
            await refreshStudentPortfolio(queryClient, account?.id)
        },
        onError: (err: Error) => {
            toast.error(err.message || "Failed to place order")
        }
    })
}

export interface MarketContext {
    symbol: string
    previous_close: number
    market_status: 'open' | 'closed' | 'pre-market' | 'after-hours'
    last_price: number
    price: number
    change: number
    change_percent: number
    rules?: Record<string, unknown>
    competition_id?: string
    exchange?: string
    trading_enabled?: boolean
    position?: {
        qty: number
        avg_cost: number
    }
    candles: { time: string | number; open: number; high: number; low: number; close: number; volume?: number }[]
}

export function useMarketData(symbol: string) {
    const { data: account } = useActiveAccount()
    const { data: activeCompetition } = useActiveCompetition()

    return useQuery({
        queryKey: [...queryKeys.market.chartContext(symbol), account?.id, activeCompetition?.id],
        queryFn: async () => {
            return api.get<MarketContext>(`/charts/context`, {
                symbol,
                account_id: account?.id,
                competition_id: activeCompetition?.id
            })
        },
        enabled: !!symbol,
    })
}

export function useEquityHistory(accountId?: string) {
    const { data: activeCompetition } = useActiveCompetition()
    return useQuery({
        queryKey: [...queryKeys.student.equity(accountId || "history"), "history", activeCompetition?.id],
        queryFn: async () => {
            if (!accountId || !activeCompetition?.id) return []
            const { data, error } = await supabase
                .from("performance_snapshots_daily")
                .select("date,equity")
                .eq("competition_id", activeCompetition.id)
                .eq("account_id", accountId)
                .order("date", { ascending: true })
            if (error) throw error
            return (data || []).map((row) => ({
                date: row.date,
                equity: Number(row.equity)
            }))
        },
        enabled: !!accountId && !!activeCompetition?.id
    })
}

export function useActiveCompetition() {
    const { data: account } = useActiveAccount()

    return useQuery({
        queryKey: ["activeCompetition", account?.id],
        queryFn: async () => {
            if (!account?.id) return null
            const { data, error } = await supabase
                .from("competition_accounts")
                .select("competition_id, competitions!inner(id,class_id,status,name,rules_json,created_at,updated_at)")
                .eq("account_id", account.id)
            if (error) throw error
            type CompetitionRow = {
                competition_id: string
                competitions: {
                    id: string
                    class_id: string
                    status: string
                    name: string
                    rules_json: Record<string, unknown>
                    created_at: string
                    updated_at: string
                } | {
                    id: string
                    class_id: string
                    status: string
                    name: string
                    rules_json: Record<string, unknown>
                    created_at: string
                    updated_at: string
                }[]
            }
            const comps = ((data || []) as CompetitionRow[]).map((row) => {
                const comp = Array.isArray(row.competitions) ? row.competitions[0] : row.competitions
                return comp || null
            }).filter(Boolean)
            return comps.find((c) => c?.status === "active") || comps[0] || null
        },
        enabled: !!account?.id
    })
}
