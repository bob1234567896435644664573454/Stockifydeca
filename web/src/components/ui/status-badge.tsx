import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type StatusType =
    | "open" | "filled" | "cancelled" | "rejected" | "expired" // Orders
    | "active" | "frozen" | "dropped" // Students
    | "normal" | "incident" // Competition modes

const statusConfig: Record<string, { label: string, className: string }> = {
    open: { label: "Open", className: "bg-blue-100 text-blue-700 hover:bg-blue-100/80 border-blue-200" },
    filled: { label: "Filled", className: "bg-green-100 text-green-700 hover:bg-green-100/80 border-green-200" },
    cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-700 hover:bg-gray-100/80 border-gray-200" },
    rejected: { label: "Rejected", className: "bg-red-100 text-red-700 hover:bg-red-100/80 border-red-200" },
    expired: { label: "Expired", className: "bg-orange-100 text-orange-700 hover:bg-orange-100/80 border-orange-200" },

    active: { label: "Active", className: "bg-green-100 text-green-700 hover:bg-green-100/80 border-green-200" },
    frozen: { label: "Frozen", className: "bg-red-100 text-red-700 hover:bg-red-100/80 border-red-200" },
    dropped: { label: "Dropped", className: "bg-gray-100 text-gray-700 hover:bg-gray-100/80 border-gray-200" },

    normal: { label: "Normal", className: "bg-blue-100 text-blue-700 border-blue-200" },
    incident: { label: "Incident", className: "bg-amber-100 text-amber-700 border-amber-200" }
}

interface StatusBadgeProps {
    status: string
    className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
    const normalizedStatus = status.toLowerCase()
    const config = statusConfig[normalizedStatus] || { label: status, className: "bg-gray-100 text-gray-700 border-gray-200" }

    return (
        <Badge variant="outline" className={cn("capitalize font-medium shadow-none", config.className, className)}>
            {config.label}
        </Badge>
    )
}
