import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, ChevronRight, RotateCcw, Zap, Brain } from "lucide-react"
import { cn } from "@/lib/utils"

export interface QuizQuestion {
    id: string
    question: string
    options: string[]
    correctIndex: number
    explanation: string
}

export interface Quiz {
    id: string
    title: string
    questions: QuizQuestion[]
}

interface QuizEngineProps {
    quiz: Quiz
    onComplete?: (score: number, total: number) => void
}

export function QuizEngine({ quiz, onComplete }: QuizEngineProps) {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [selectedOption, setSelectedOption] = useState<number | null>(null)
    const [showExplanation, setShowExplanation] = useState(false)
    const [score, setScore] = useState(0)
    const [finished, setFinished] = useState(false)

    const question = quiz.questions[currentIndex]
    const isCorrect = selectedOption === question?.correctIndex
    const total = quiz.questions.length

    const handleSelect = (index: number) => {
        if (showExplanation) return
        setSelectedOption(index)
        setShowExplanation(true)
        if (index === question.correctIndex) {
            setScore(s => s + 1)
        }
    }

    const handleNext = () => {
        if (currentIndex < total - 1) {
            setCurrentIndex(i => i + 1)
            setSelectedOption(null)
            setShowExplanation(false)
        } else {
            setFinished(true)
            onComplete?.(score + (isCorrect ? 0 : 0), total) // score already updated in handleSelect
        }
    }

    const handleRetry = () => {
        setCurrentIndex(0)
        setSelectedOption(null)
        setShowExplanation(false)
        setScore(0)
        setFinished(false)
    }

    if (finished) {
        const pct = Math.round((score / total) * 100)
        const passed = pct >= 70
        return (
            <Card className="border-2 border-dashed">
                <CardContent className="py-10 text-center space-y-4">
                    <div className={cn(
                        "h-20 w-20 rounded-full mx-auto flex items-center justify-center",
                        passed ? "bg-green-100 dark:bg-green-900/20" : "bg-red-100 dark:bg-red-900/20"
                    )}>
                        {passed ? (
                            <CheckCircle2 className="h-10 w-10 text-green-600" />
                        ) : (
                            <XCircle className="h-10 w-10 text-red-500" />
                        )}
                    </div>
                    <div>
                        <h3 className="text-xl font-bold">
                            {passed ? "Great job!" : "Keep learning!"}
                        </h3>
                        <p className="text-muted-foreground text-sm mt-1">
                            You scored {score}/{total} ({pct}%)
                        </p>
                    </div>
                    {passed && (
                        <div className="flex items-center justify-center gap-1.5 text-sm text-yellow-600">
                            <Zap className="h-4 w-4" /> +25 XP earned
                        </div>
                    )}
                    <Button variant="outline" onClick={handleRetry} className="gap-2">
                        <RotateCcw className="h-4 w-4" /> Retry Quiz
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Brain className="h-4 w-4 text-primary" /> {quiz.title}
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">
                        {currentIndex + 1} / {total}
                    </Badge>
                </div>
                {/* Progress bar */}
                <div className="h-1.5 rounded-full bg-muted mt-3 overflow-hidden">
                    <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${((currentIndex + (showExplanation ? 1 : 0)) / total) * 100}%` }}
                    />
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <h3 className="font-semibold text-sm leading-relaxed">{question.question}</h3>

                <div className="space-y-2">
                    {question.options.map((opt, i) => {
                        let bg = "hover:bg-muted/50 border-border"
                        if (showExplanation) {
                            if (i === question.correctIndex) bg = "border-green-500 bg-green-50 dark:bg-green-900/10"
                            else if (i === selectedOption && i !== question.correctIndex) bg = "border-red-500 bg-red-50 dark:bg-red-900/10"
                            else bg = "opacity-50 border-border"
                        }

                        return (
                            <button
                                key={i}
                                onClick={() => handleSelect(i)}
                                disabled={showExplanation}
                                className={cn(
                                    "w-full text-left px-4 py-3 rounded-lg border text-sm transition-all flex items-center gap-3",
                                    bg,
                                    !showExplanation && "cursor-pointer"
                                )}
                            >
                                <span className="h-6 w-6 rounded-full border flex items-center justify-center text-xs font-semibold shrink-0">
                                    {String.fromCharCode(65 + i)}
                                </span>
                                <span className="flex-1">{opt}</span>
                                {showExplanation && i === question.correctIndex && (
                                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                                )}
                                {showExplanation && i === selectedOption && i !== question.correctIndex && (
                                    <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                                )}
                            </button>
                        )
                    })}
                </div>

                {showExplanation && (
                    <div className={cn(
                        "rounded-lg p-3 text-sm border",
                        isCorrect ? "bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800" : "bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800"
                    )}>
                        <p className="font-medium mb-1">{isCorrect ? "✅ Correct!" : "❌ Not quite"}</p>
                        <p className="text-muted-foreground text-xs">{question.explanation}</p>
                    </div>
                )}

                {showExplanation && (
                    <div className="flex justify-end">
                        <Button onClick={handleNext} className="gap-1.5">
                            {currentIndex < total - 1 ? "Next Question" : "See Results"}
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
