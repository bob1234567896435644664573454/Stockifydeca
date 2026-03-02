import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Target, Flame, Star, CheckCircle2 } from "lucide-react"

export function DailyQuestCard() {
    return (
        <Card className="animate-slide-up delay-500 overflow-hidden relative glass border-[hsl(var(--warning))]/30 shadow-lg">
            {/* Ambient glow */}
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[hsl(var(--warning))]/10 rounded-full blur-3xl pointer-events-none animate-glow-pulse" />
            <CardHeader className="pb-3 relative z-10 bg-[hsl(var(--warning))]/5 border-b border-[hsl(var(--warning))]/10">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                        <Target className="h-5 w-5 text-[hsl(var(--warning))]" />
                        Daily Quests
                    </CardTitle>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[hsl(var(--warning))]/20 text-[hsl(var(--warning))] text-xs font-bold shrink-0">
                        <Flame className="h-3.5 w-3.5" />
                        3 Day Streak
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                <div className="space-y-3">
                    {/* Quest 1 */}
                    <div className="flex items-start gap-3">
                        <div className="h-6 w-6 rounded-full bg-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold line-through text-muted-foreground">Diversify Portfolio</p>
                            <p className="text-[10px] text-muted-foreground">Hold 3+ different sectors</p>
                        </div>
                        <div className="text-xs font-bold text-muted-foreground">+50 XP</div>
                    </div>
                    {/* Quest 2 */}
                    <div className="flex items-start gap-3">
                        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5 border">
                            <Star className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold">Learn: Options Greeks</p>
                            <div className="w-full bg-muted rounded-full h-1.5 mt-1.5">
                                <div className="bg-[hsl(var(--warning))] h-1.5 rounded-full" style={{ width: '40%' }} />
                            </div>
                        </div>
                        <div className="text-xs font-bold text-[hsl(var(--warning))] flex items-center gap-1">
                            <Star className="h-3 w-3 fill-[hsl(var(--warning))]" />
                            100 XP
                        </div>
                    </div>
                </div>

                <Button variant="outline" className="w-full h-9 text-xs font-semibold border-[hsl(var(--warning))]/20 hover:bg-[hsl(var(--warning))]/10 hover:text-[hsl(var(--warning))] transition-colors">
                    Go to Learn Hub
                </Button>
            </CardContent>
        </Card>
    )
}
