import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/lib/api"
import { useActiveAccount } from "@/hooks/useActiveAccount"
import { queryKeys } from "@/lib/queryKeys"
import { toast } from "sonner"

export interface JournalEntry {
    id: string
    account_id: string
    order_id: string | null
    symbol: string
    side: "buy" | "sell" | null
    content_type: "trade_reflection" | "weekly_reflection" | "thesis"
    content: {
        what?: string
        why?: string
        expect?: string
        wrong?: string
        exit?: string
        // Thesis fields
        believe?: string
        because?: string
        wrongIf?: string
        timeHorizon?: string
        riskPlan?: string
        // Weekly reflection fields
        summary?: string
        lessons?: string
        goals?: string
    }
    rating: number | null
    created_at: string
    updated_at: string
}

/**
 * Fetch journal entries from Supabase `journal_entries` table.
 * Falls back to deriving entries from orders if journal_entries table
 * is not yet populated (graceful degradation).
 */
export function useJournalEntries() {
    const { data: account } = useActiveAccount()

    return useQuery({
        queryKey: [...queryKeys.student.orders(account?.id ?? ""), "journal"],
        enabled: !!account?.id,
        queryFn: async () => {
            // Try to fetch from journal_entries table
            const { data, error } = await supabase
                .from("journal_entries")
                .select("*")
                .eq("account_id", account!.id)
                .order("created_at", { ascending: false })
                .limit(50)

            if (error) {
                // Table may not exist yet — fall back to localStorage drafts
                console.warn("journal_entries query failed, using localStorage fallback:", error.message)
                return getLocalStorageJournalEntries()
            }

            return (data ?? []) as JournalEntry[]
        },
    })
}

/**
 * Save a journal reflection to Supabase.
 * Falls back to localStorage if the table isn't available.
 */
export function useSaveReflection() {
    const { data: account } = useActiveAccount()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (entry: {
            orderId?: string
            symbol: string
            side?: "buy" | "sell"
            contentType: "trade_reflection" | "weekly_reflection" | "thesis"
            content: JournalEntry["content"]
            rating?: number
        }) => {
            if (!account?.id) throw new Error("No active account")

            const { data, error } = await supabase
                .from("journal_entries")
                .upsert({
                    account_id: account.id,
                    order_id: entry.orderId ?? null,
                    symbol: entry.symbol,
                    side: entry.side ?? null,
                    content_type: entry.contentType,
                    content: entry.content,
                    rating: entry.rating ?? null,
                })
                .select()
                .single()

            if (error) {
                // Fallback: save to localStorage
                console.warn("Failed to save to journal_entries, using localStorage:", error.message)
                saveToLocalStorage(account.id, entry)
                return null
            }

            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [...queryKeys.student.orders(account?.id ?? ""), "journal"] })
            toast.success("Reflection saved!")
        },
        onError: (err: Error) => {
            toast.error(err.message || "Failed to save reflection")
        },
    })
}

// ─── localStorage fallback helpers ───

function getLocalStorageJournalEntries(): JournalEntry[] {
    try {
        const drafts = JSON.parse(localStorage.getItem('stockify_journal_drafts') || '[]')
        return drafts.map((d: any, i: number) => ({
            id: `local_${i}`,
            account_id: "",
            order_id: null,
            symbol: d.symbol || "—",
            side: d.side || null,
            content_type: "trade_reflection" as const,
            content: {
                what: d.note || d.what || "",
                why: d.why || "",
                expect: d.expect || "",
                wrong: d.wrong || "",
                exit: d.exit || "",
            },
            rating: d.rating ?? null,
            created_at: d.timestamp || new Date().toISOString(),
            updated_at: d.timestamp || new Date().toISOString(),
        }))
    } catch {
        return []
    }
}

function saveToLocalStorage(_accountId: string, entry: any) {
    try {
        const drafts = JSON.parse(localStorage.getItem('stockify_journal_drafts') || '[]')
        drafts.unshift({
            symbol: entry.symbol,
            side: entry.side,
            note: entry.content?.what || "",
            why: entry.content?.why || "",
            expect: entry.content?.expect || "",
            wrong: entry.content?.wrong || "",
            exit: entry.content?.exit || "",
            rating: entry.rating,
            timestamp: new Date().toISOString(),
        })
        localStorage.setItem('stockify_journal_drafts', JSON.stringify(drafts))
    } catch {
        // Silently fail — localStorage might be full
    }
}
