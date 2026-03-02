import { cn } from "@/lib/utils"

interface CompetitionBannerProps {
    status?: "active" | "frozen" | "ended" | "maintenance"
    message?: string
}

export function CompetitionBanner({ status = "active", message }: CompetitionBannerProps) {
    // In a real app, this would pull from a global store or context
    // For now, we'll default to active or pull from hypothetical props

    // We can also hide it on non-competition pages if needed, 
    // but usually it's good to show global status everywhere.

    if (!status) return null

    const config = {
        active: { color: "bg-emerald-600", text: "Competition Active" },
        frozen: { color: "bg-blue-600", text: "Market Frozen" },
        ended: { color: "bg-red-600", text: "Competition Ended" },
        maintenance: { color: "bg-amber-500 text-black", text: "System Maintenance" },
    }[status]

    return (
        <div className={cn("text-white text-xs font-bold text-center py-1 uppercase tracking-widest shadow-sm z-50", config.color)}>
            {message || config.text}
        </div>
    )
}
