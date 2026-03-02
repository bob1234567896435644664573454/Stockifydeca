import { useState, type CSSProperties } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AppShell } from "@/components/layout/AppShell"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { QuizEngine, type Quiz } from "@/features/learn/QuizEngine"
import {
    BookOpen, CheckCircle2, Lock, Star, ChevronRight, Zap,
    TrendingUp, Shield, Brain, BarChart3, Globe
} from "lucide-react"

interface LearningPath {
    id: string
    title: string
    description: string
    icon: React.ComponentType<{ className?: string; style?: CSSProperties }>
    color: string
    lessons: Lesson[]
    level: "beginner" | "intermediate" | "advanced"
}

interface Lesson {
    id: string
    title: string
    duration: string
    xp: number
    completed: boolean
    locked: boolean
}

const LEARNING_PATHS: LearningPath[] = [
    {
        id: "foundations",
        title: "Investing Foundations",
        description: "Learn what stocks are, how markets work, and why people invest.",
        icon: BookOpen,
        color: "#3b82f6",
        level: "beginner",
        lessons: [
            { id: "1", title: "What is a Stock?", duration: "3 min", xp: 50, completed: true, locked: false },
            { id: "2", title: "How Markets Work", duration: "5 min", xp: 75, completed: true, locked: false },
            { id: "3", title: "Reading Price Charts", duration: "4 min", xp: 75, completed: false, locked: false },
            { id: "4", title: "Your First Order", duration: "3 min", xp: 50, completed: false, locked: false },
            { id: "5", title: "Understanding P&L", duration: "4 min", xp: 100, completed: false, locked: true },
        ]
    },
    {
        id: "mechanics",
        title: "Market Mechanics",
        description: "Order types, bid-ask spreads, and how fills actually work.",
        icon: TrendingUp,
        color: "#10b981",
        level: "beginner",
        lessons: [
            { id: "6", title: "Market vs Limit Orders", duration: "4 min", xp: 75, completed: false, locked: false },
            { id: "7", title: "Bid-Ask Spread", duration: "3 min", xp: 50, completed: false, locked: false },
            { id: "8", title: "Stop Orders & Risk", duration: "5 min", xp: 100, completed: false, locked: true },
            { id: "9", title: "Time in Force", duration: "3 min", xp: 50, completed: false, locked: true },
        ]
    },
    {
        id: "portfolio",
        title: "Portfolio Building",
        description: "Diversification, allocation, and building a balanced portfolio.",
        icon: BarChart3,
        color: "#8b5cf6",
        level: "intermediate",
        lessons: [
            { id: "10", title: "What is Diversification?", duration: "4 min", xp: 75, completed: false, locked: false },
            { id: "11", title: "Sector Allocation", duration: "5 min", xp: 100, completed: false, locked: true },
            { id: "12", title: "Concentration Risk", duration: "4 min", xp: 75, completed: false, locked: true },
            { id: "13", title: "Rebalancing", duration: "5 min", xp: 100, completed: false, locked: true },
        ]
    },
    {
        id: "risk",
        title: "Risk & Psychology",
        description: "Managing drawdowns, avoiding biases, and thinking long-term.",
        icon: Shield,
        color: "#f59e0b",
        level: "intermediate",
        lessons: [
            { id: "14", title: "What is Risk?", duration: "3 min", xp: 50, completed: false, locked: false },
            { id: "15", title: "Drawdowns Explained", duration: "4 min", xp: 75, completed: false, locked: true },
            { id: "16", title: "Behavioral Biases", duration: "5 min", xp: 100, completed: false, locked: true },
            { id: "17", title: "Position Sizing", duration: "5 min", xp: 100, completed: false, locked: true },
        ]
    },
    {
        id: "macro",
        title: "Macro & News",
        description: "How economic data, earnings, and world events move markets.",
        icon: Globe,
        color: "#06b6d4",
        level: "advanced",
        lessons: [
            { id: "18", title: "Market Movers", duration: "4 min", xp: 75, completed: false, locked: false },
            { id: "19", title: "Earnings Season", duration: "5 min", xp: 100, completed: false, locked: true },
            { id: "20", title: "Fed & Interest Rates", duration: "5 min", xp: 100, completed: false, locked: true },
        ]
    },
    {
        id: "strategy",
        title: "Strategy Sandbox",
        description: "Momentum, value investing, and building your own approach.",
        icon: Brain,
        color: "#ec4899",
        level: "advanced",
        lessons: [
            { id: "21", title: "What is a Strategy?", duration: "3 min", xp: 50, completed: false, locked: false },
            { id: "22", title: "Momentum Trading", duration: "5 min", xp: 100, completed: false, locked: true },
            { id: "23", title: "Value Investing Basics", duration: "5 min", xp: 100, completed: false, locked: true },
        ]
    }
]

// ─── Quiz data per path ───
const PATH_QUIZZES: Record<string, Quiz> = {
    foundations: {
        id: "quiz-foundations",
        title: "Investing Foundations Quiz",
        questions: [
            {
                id: "q1", question: "What does owning a stock represent?",
                options: ["A loan to a company", "A share of ownership in a company", "A government bond", "A savings deposit"],
                correctIndex: 1, explanation: "A stock represents partial ownership (equity) in a company. When you buy a share, you become a part-owner."
            },
            {
                id: "q2", question: "What is the bid-ask spread?",
                options: ["The company's profit margin", "The difference between the highest buy price and lowest sell price", "The daily price range", "The commission charged by brokers"],
                correctIndex: 1, explanation: "The bid-ask spread is the gap between the highest price a buyer will pay (bid) and the lowest price a seller will accept (ask)."
            },
            {
                id: "q3", question: "If you buy 10 shares at $50 and the price rises to $60, what is your unrealized P&L?",
                options: ["$50", "$100", "$600", "$10"],
                correctIndex: 1, explanation: "Unrealized P&L = (Current Price − Purchase Price) × Quantity = ($60 − $50) × 10 = $100."
            },
        ]
    },
    mechanics: {
        id: "quiz-mechanics",
        title: "Market Mechanics Quiz",
        questions: [
            {
                id: "q4", question: "A market order will:",
                options: ["Execute at the best available price immediately", "Only execute at your specified price", "Wait until the market closes", "Execute the next trading day"],
                correctIndex: 0, explanation: "Market orders execute immediately at the best available price, guaranteeing execution but not price."
            },
            {
                id: "q5", question: "What does a stop-loss order do?",
                options: ["Guarantees a profit", "Automatically sells when the price falls to a certain level", "Prevents you from buying more stock", "Locks in dividends"],
                correctIndex: 1, explanation: "A stop-loss order becomes a market order when the stock hits your stop price, limiting potential losses."
            },
        ]
    },
    portfolio: {
        id: "quiz-portfolio",
        title: "Portfolio Building Quiz",
        questions: [
            {
                id: "q6", question: "Diversification helps to:",
                options: ["Guarantee profits", "Reduce overall portfolio risk", "Increase transaction costs", "Eliminate all losses"],
                correctIndex: 1, explanation: "Diversification spreads risk across assets so that poor performance from one holding is offset by others."
            },
            {
                id: "q7", question: "An HHI (Herfindahl-Hirschman Index) below 1,500 indicates:",
                options: ["Highly concentrated portfolio", "Well-diversified portfolio", "Negative returns", "Too much cash"],
                correctIndex: 1, explanation: "HHI below 1,500 means no single position dominates, indicating good diversification."
            },
        ]
    },
    risk: {
        id: "quiz-risk",
        title: "Risk & Psychology Quiz",
        questions: [
            {
                id: "q8", question: "Max drawdown measures:",
                options: ["The highest price ever reached", "The largest peak-to-trough decline", "The average daily return", "The total number of trades"],
                correctIndex: 1, explanation: "Max drawdown is the largest percentage decline from a peak to a trough, measuring worst-case downside risk."
            },
            {
                id: "q9", question: "Which cognitive bias causes holding losers too long?",
                options: ["Confirmation bias", "Loss aversion", "Anchoring", "Recency bias"],
                correctIndex: 1, explanation: "Loss aversion makes the pain of losses feel roughly twice as strong as equivalent gains, causing investors to hold losers hoping for recovery."
            },
        ]
    },
}
function PathCard({ path, onSelect, className }: { path: LearningPath; onSelect: () => void; className?: string }) {
    const completed = path.lessons.filter(l => l.completed).length
    const total = path.lessons.length
    const progress = total > 0 ? (completed / total) * 100 : 0
    const totalXp = path.lessons.reduce((s, l) => s + l.xp, 0)
    const earnedXp = path.lessons.filter(l => l.completed).reduce((s, l) => s + l.xp, 0)
    const Icon = path.icon

    return (
        <Card className={`card-hover animate-slide-up cursor-pointer overflow-hidden relative glass border-border/50 group ${className || ''}`} onClick={onSelect}>
            <div className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full blur-3xl pointer-events-none transition-opacity duration-300 opacity-0 group-hover:opacity-100" style={{ backgroundColor: `${path.color}20` }} />
            <CardContent className="p-5 relative z-10">
                <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 border shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] transition-transform duration-300 group-hover:scale-105" style={{ backgroundColor: `${path.color}15`, borderColor: `${path.color}30` }}>
                        <Icon className="h-6 w-6 animate-float" style={{ color: path.color, animationDelay: '0.2s' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-sm group-hover:text-foreground transition-colors">{path.title}</h3>
                            <Badge variant="outline" className="text-[10px] capitalize">{path.level}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{path.description}</p>

                        {/* Progress bar */}
                        <div className="mt-3">
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                                <span>{completed}/{total} lessons</span>
                                <span className="flex items-center gap-0.5"><Zap className="h-3 w-3 text-[hsl(var(--warning))]" />{earnedXp}/{totalXp} XP</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{ width: `${progress}%`, backgroundColor: path.color }}
                                />
                            </div>
                        </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                </div>
            </CardContent>
        </Card >
    )
}

function LessonRow({ lesson }: { lesson: Lesson }) {
    return (
        <div className={`flex items-center gap-3 px-5 py-3 border-b last:border-0 transition-colors ${lesson.locked ? 'opacity-50' : 'hover:bg-muted/50 cursor-pointer'}`}>
            <div className="flex-shrink-0">
                {lesson.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-[hsl(var(--chart-up))]" />
                ) : lesson.locked ? (
                    <Lock className="h-5 w-5 text-muted-foreground/50" />
                ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-primary/40" />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{lesson.title}</div>
                <div className="text-[10px] text-muted-foreground">{lesson.duration}</div>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="h-3 w-3 text-[hsl(var(--warning))]" />
                {lesson.xp} XP
            </div>
        </div>
    )
}

export function LearnHub() {
    const [selectedPath, setSelectedPath] = useState<LearningPath | null>(null)
    const [quizOpen, setQuizOpen] = useState(false)

    const totalXp = LEARNING_PATHS.flatMap(p => p.lessons).filter(l => l.completed).reduce((s, l) => s + l.xp, 0)
    const totalCompleted = LEARNING_PATHS.flatMap(p => p.lessons).filter(l => l.completed).length
    const totalLessons = LEARNING_PATHS.flatMap(p => p.lessons).length

    return (
        <AppShell role="student">
            <div className="p-4 md:p-8 space-y-6 animate-fade-in">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Learn Hub</h1>
                        <p className="text-sm text-muted-foreground mt-1">Build investing instincts through interactive lessons.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-sm">
                            <Zap className="h-4 w-4 text-[hsl(var(--warning))]" />
                            <span className="font-bold stat-number">{totalXp}</span>
                            <span className="text-muted-foreground">XP</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            {totalCompleted}/{totalLessons} completed
                        </div>
                    </div>
                </div>

                {selectedPath ? (
                    /* Lesson Detail View */
                    <div className="space-y-4 animate-slide-up">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedPath(null)} className="gap-1">
                            ← Back to paths
                        </Button>
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${selectedPath.color}15` }}>
                                        <selectedPath.icon className="h-5 w-5" style={{ color: selectedPath.color }} />
                                    </div>
                                    <div className="flex-1">
                                        <CardTitle className="text-lg">{selectedPath.title}</CardTitle>
                                        <CardDescription>{selectedPath.description}</CardDescription>
                                    </div>
                                    {PATH_QUIZZES[selectedPath.id] && (
                                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setQuizOpen(true)}>
                                            <Brain className="h-3.5 w-3.5" /> Take Quiz
                                        </Button>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                {selectedPath.lessons.map(lesson => (
                                    <LessonRow key={lesson.id} lesson={lesson} />
                                ))}
                            </CardContent>
                        </Card>

                        {/* Quiz Dialog */}
                        {PATH_QUIZZES[selectedPath.id] && (
                            <Dialog open={quizOpen} onOpenChange={setQuizOpen}>
                                <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
                                    <DialogHeader>
                                        <DialogTitle>📝 {PATH_QUIZZES[selectedPath.id].title}</DialogTitle>
                                    </DialogHeader>
                                    <QuizEngine
                                        quiz={PATH_QUIZZES[selectedPath.id]}
                                        onComplete={(score, total) => {
                                            console.log(`Quiz complete: ${score}/${total}`)
                                        }}
                                    />
                                </DialogContent>
                            </Dialog>
                        )}
                    </div>
                ) : (
                    /* Path Grid */
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {LEARNING_PATHS.map((path, idx) => (
                            <PathCard key={path.id} path={path} onSelect={() => setSelectedPath(path)} className={`delay-${(idx % 5 + 1) * 100}`} />
                        ))}
                    </div>
                )}
            </div>
        </AppShell>
    )
}
