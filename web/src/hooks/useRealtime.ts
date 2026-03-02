import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/lib/api"
import { useAuth } from "@/features/auth/AuthContextObject"
import { useActiveAccount } from "@/hooks/useActiveAccount"

export function useRealtime() {
    const queryClient = useQueryClient()
    const { user } = useAuth()
    const { data: account } = useActiveAccount()

    useEffect(() => {
        if (!user) return

        // Subscribe to public events (broadcast by backend)
        // The backend emits to 'public:events' channel with event name 'new_event' usually?
        // Contract says: `public:events` (order, fill, announcement, etc.)

        const channel = supabase.channel("public:events")

        channel
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "orders",
                    filter: account ? `account_id=eq.${account.id}` : undefined, // Filter if RLS allows or we filter on client
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ["orders"] })
                    queryClient.invalidateQueries({ queryKey: ["positions"] }) // Fills update positions
                    queryClient.invalidateQueries({ queryKey: ["equity"] })
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "fills",
                    filter: account ? `account_id=eq.${account.id}` : undefined,
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ["orders"] })
                    queryClient.invalidateQueries({ queryKey: ["positions"] })
                    queryClient.invalidateQueries({ queryKey: ["equity"] })
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [user, account, queryClient])
}
