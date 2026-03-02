import { validateInvariants, type PositionData } from "@/lib/portfolio-calc"

interface InvariantCheckParams {
    positions: PositionData[]
    cash: number
    equity: number
    scope: string
    metadata?: Record<string, unknown>
}

/**
 * Runs invariant checks and reports violations in a non-blocking way.
 * Never throws; callers can continue UX flow safely.
 */
export function validateAndReportInvariants({
    positions,
    cash,
    equity,
    scope,
    metadata,
}: InvariantCheckParams): string[] {
    const violations = validateInvariants(positions, cash, equity)
    if (violations.length > 0) {
        console.warn("[portfolio-invariants]", {
            scope,
            violations,
            metadata: metadata ?? {},
        })
    }
    return violations
}
