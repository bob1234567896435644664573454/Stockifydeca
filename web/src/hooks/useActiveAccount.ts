import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/api"
import { useAuth } from "@/features/auth/AuthContextObject"

export function useActiveAccount() {
    const { user } = useAuth()

    return useQuery({
        queryKey: ["activeAccount", user?.id],
        queryFn: async () => {
            if (!user) return null
            // Fetch the most recent account
            const { data, error } = await supabase
                .from("trading_accounts")
                .select("id,user_id,class_id,cash_balance,starting_cash,created_at,updated_at")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle()

            if (error) throw error
            if (!data) return null

            const { data: tradingData } = await supabase.rpc("is_account_trading_enabled", {
                p_account_id: data.id
            })

            return {
                ...data,
                trading_enabled: tradingData ?? true
            }
        },
        enabled: !!user,
        staleTime: Infinity, // Accounts don't change often
    })
}
