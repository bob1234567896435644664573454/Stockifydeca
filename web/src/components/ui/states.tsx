import { type ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, RefreshCw } from "lucide-react"

/**
 * Standardized Empty State.
 * J2: Every empty state has 1 sentence + 1 CTA.
 */
export function EmptyState({
    icon,
    title,
    description,
    action,
    actionLabel,
}: {
    icon: ReactNode
    title: string
    description: string
    action?: () => void
    actionLabel?: string
}) {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center animate-fade-in">
            <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mb-4 text-muted-foreground/50">
                {icon}
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
            <p className="text-xs text-muted-foreground max-w-xs">{description}</p>
            {action && actionLabel && (
                <Button variant="outline" size="sm" className="mt-4" onClick={action}>
                    {actionLabel}
                </Button>
            )}
        </div>
    )
}

/**
 * Standardized Error State.
 * J2: Friendly, actionable error messages.
 */
export function ErrorState({
    title = "Something went wrong",
    description = "We couldn't load this data. Please try again.",
    onRetry,
    variant = "inline",
}: {
    title?: string
    description?: string
    onRetry?: () => void
    variant?: "inline" | "card" | "fullpage"
}) {
    const content = (
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center animate-fade-in">
            <div className="h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
                <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <h3 className="text-sm font-semibold mb-1">{title}</h3>
            <p className="text-xs text-muted-foreground max-w-xs">{description}</p>
            {onRetry && (
                <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={onRetry}>
                    <RefreshCw className="h-3.5 w-3.5" /> Try Again
                </Button>
            )}
        </div>
    )

    if (variant === "card") {
        return <Card><CardContent className="p-0">{content}</CardContent></Card>
    }

    if (variant === "fullpage") {
        return (
            <div className="min-h-[50vh] flex items-center justify-center">{content}</div>
        )
    }

    return content
}

/**
 * Standardized Offline/Network Error State.
 */
export function OfflineState({ onRetry }: { onRetry?: () => void }) {
    return (
        <ErrorState
            title="You're offline"
            description="Check your internet connection and try again."
            onRetry={onRetry}
        />
    )
}

/**
 * Standardized Loading Skeleton Grid.
 * J2: Consistent shimmer-based loading instead of generic spinners.
 */
export function SkeletonGrid({ count = 4, className }: { count?: number; className?: string }) {
    return (
        <div className={`grid gap-4 grid-cols-2 lg:grid-cols-4 ${className ?? ""}`}>
            {Array.from({ length: count }).map((_, i) => (
                <Card key={i}>
                    <CardContent className="p-5 space-y-3">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-8 w-28" />
                        <Skeleton className="h-3 w-16" />
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}

/**
 * Standardized Loading Skeleton for a list.
 */
export function SkeletonList({ count = 5, className }: { count?: number; className?: string }) {
    return (
        <div className={`space-y-3 ${className ?? ""}`}>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                </div>
            ))}
        </div>
    )
}

/**
 * Explainer Drawer / Tooltip for advanced metrics.
 * J2: "What is this?" for HHI, risk, concentration.
 */
export function MetricExplainer({
    label,
    value,
    explanation,
    learnMoreUrl,
}: {
    label: string
    value: string
    explanation: string
    learnMoreUrl?: string
}) {
    return (
        <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5 animate-slide-up">
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
                <span className="text-sm font-bold stat-number">{value}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{explanation}</p>
            {learnMoreUrl && (
                <Button variant="link" size="sm" className="text-xs p-0 h-auto">
                    Learn more →
                </Button>
            )}
        </div>
    )
}
