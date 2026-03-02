import { useEffect } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Zap, Star } from "lucide-react"
import { ConfettiCanvas, useConfetti } from "./confetti"

interface LevelUpModalProps {
    level: number
    open: boolean
    onClose: () => void
}

export function LevelUpModal({ level, open, onClose }: LevelUpModalProps) {
    const confetti = useConfetti()

    useEffect(() => {
        if (open) {
            confetti.fire()
            const timer = setTimeout(onClose, 4000)
            return () => clearTimeout(timer)
        }
    }, [open])

    return (
        <>
            <ConfettiCanvas active={confetti.active} onDone={confetti.done} />
            <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
                <DialogContent className="sm:max-w-md border-primary/30 bg-gradient-to-b from-background to-primary/5">
                    <div className="flex flex-col items-center py-6 text-center space-y-4">
                        <div className="relative">
                            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center animate-bounce shadow-xl shadow-orange-500/30">
                                <Star className="h-12 w-12 text-white fill-white" />
                            </div>
                            <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full h-8 w-8 flex items-center justify-center text-sm font-bold shadow-lg">
                                {level}
                            </div>
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                                Level Up!
                            </h2>
                            <p className="text-muted-foreground text-sm mt-1">
                                You've reached <span className="font-semibold text-foreground">Level {level}</span>
                            </p>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-4 py-2">
                            <Zap className="h-4 w-4 text-yellow-500" />
                            <span>Keep trading and learning to level up!</span>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
