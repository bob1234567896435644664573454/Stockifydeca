import { Info } from "lucide-react"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import type { ScoreBreakdown as IScoreBreakdown } from "./types"
// import { formatCurrency, formatPct } from "@/lib/utils"

interface Props {
    breakdown?: IScoreBreakdown
    score: number
}

export function ScoreBreakdown({ breakdown, score }: Props) {
    if (!breakdown) return <span>{score.toFixed(2)}</span>

    return (
        <div className="flex items-center gap-1">
            <span className="font-mono font-medium">{score.toFixed(2)}</span>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger aria-label="View score breakdown">
                        <Info className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                    </TooltipTrigger>
                    <TooltipContent className="w-64 p-3">
                        <div className="space-y-2 text-xs">
                            <div className="font-semibold border-b pb-1">Score Breakdown</div>
                            <div className="flex justify-between">
                                <span>Raw Return:</span>
                                <span className="font-mono text-green-500">+{breakdown.raw_return.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Volatility Penalty:</span>
                                <span className="font-mono text-red-500">{breakdown.volatility_penalty.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Rule Violations:</span>
                                <span className="font-mono text-red-500">{breakdown.violation_penalty.toFixed(2)}</span>
                            </div>
                            <div className="border-t pt-1 flex justify-between font-bold">
                                <span>Final Score:</span>
                                <span>{score.toFixed(2)}</span>
                            </div>
                        </div>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    )
}
