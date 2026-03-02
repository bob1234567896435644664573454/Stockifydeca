import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type ScoreBreakdown } from "@/features/leaderboard/types"
import { Badge } from "@/components/ui/badge"
import { Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { formatPct } from "@/lib/utils"


interface ScoreCardProps {
    score: number
    breakdown?: ScoreBreakdown
    className?: string
}

export function ScoreCard({ score, breakdown, className }: ScoreCardProps) {
    if (!breakdown) return null

    return (
        <Card className={className}>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                    Risk-Adjusted Score
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="max-w-[200px] text-xs">
                                    Score = Return × (1 - Volatility) × (1 - Penalties)
                                </p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold mb-4">{score.toFixed(2)}</div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Raw Return</span>
                        <span className="font-mono font-medium">{formatPct(breakdown.raw_return)}</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                            Volatility
                            <Badge variant="outline" className="text-[10px] h-4 px-1">Penalty</Badge>
                        </span>
                        <span className="font-mono font-medium text-red-500">
                            -{((breakdown.volatility_penalty) * 100).toFixed(1)}%
                        </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                            Violations
                            <Badge variant="outline" className="text-[10px] h-4 px-1">Penalty</Badge>
                        </span>
                        <span className="font-mono font-medium text-red-500">
                            -{((breakdown.violation_penalty) * 100).toFixed(1)}%
                        </span>
                    </div>

                    <div className="pt-2 border-t mt-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Formula</span>
                            <span className="font-mono">
                                R × {((1 - breakdown.volatility_penalty)).toFixed(2)} × {((1 - breakdown.violation_penalty)).toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
