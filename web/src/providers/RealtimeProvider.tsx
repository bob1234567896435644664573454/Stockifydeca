import { useEffect, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/lib/api"
import { useAuth } from "@/features/auth/AuthContextObject"
import { useActiveAccount } from "@/hooks/useActiveAccount"
import { RealtimeContext } from "./RealtimeContext"
import { toast } from "sonner"
import { scheduleStudentPortfolioRefresh } from "@/lib/portfolio-refresh"
import { queryKeys } from "@/lib/queryKeys"

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
    const queryClient = useQueryClient()
    const { user } = useAuth()
    const { data: account } = useActiveAccount()
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

    useEffect(() => {
        if (!user) return

        if (channelRef.current) {
            supabase.removeChannel(channelRef.current)
            channelRef.current = null
        }

        const channel = supabase.channel("public:events")

        channel
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "orders",
                    filter: account ? `account_id=eq.${account.id}` : undefined,
                },
                (payload) => {
                    queryClient.invalidateQueries({
                        queryKey: ["student", "orders", account?.id ?? ""],
                        exact: false,
                        refetchType: "active",
                    })
                    scheduleStudentPortfolioRefresh(queryClient, account?.id, {
                        includeActiveAccount: (payload.new as { status?: string } | null)?.status === "filled",
                        includeOrders: false,
                    })

                    const newOrder = payload.new as { status?: string; symbol?: string }
                    if (payload.eventType === 'UPDATE' && newOrder.status === 'filled') {
                        toast.success(`Order filled for ${newOrder.symbol}`)
                    }
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "trading_controls",
                },
                () => {
                    // Force refresh active account and teacher classes to pick up freeze status
                    queryClient.invalidateQueries({ queryKey: ["activeAccount"] })
                    queryClient.invalidateQueries({ queryKey: ["teacher", "classes"] })
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "announcements",
                },
                (payload) => {
                    queryClient.invalidateQueries({
                        queryKey: ["teacher", "announcements"],
                        exact: false,
                        refetchType: "active",
                    })
                    const newAnnouncement = payload.new as { title?: string }
                    toast.info(`New Announcement: ${newAnnouncement.title || 'Broadcast'}`)
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "fills",
                    filter: account ? `account_id=eq.${account.id}` : undefined,
                },
                () => {
                    queryClient.invalidateQueries({
                        queryKey: ["student", "orders", account?.id ?? ""],
                        exact: false,
                        refetchType: "active",
                    })
                    scheduleStudentPortfolioRefresh(queryClient, account?.id, { includeActiveAccount: true })
                    queryClient.invalidateQueries({
                        queryKey: queryKeys.student.fills(account?.id ?? ""),
                        exact: true,
                        refetchType: "active",
                    })
                }
            )
            .on(
                "broadcast",
                { event: "order.created" },
                () => {
                    scheduleStudentPortfolioRefresh(queryClient, account?.id)
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    // console.log("Realtime connected")
                }
            })

        channelRef.current = channel

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current)
                channelRef.current = null
            }
        }
    }, [user, account, queryClient]) // Added account to deps

    return (
        <RealtimeContext.Provider value={{ isConnected: true }}>
            {children}
        </RealtimeContext.Provider>
    )
}
