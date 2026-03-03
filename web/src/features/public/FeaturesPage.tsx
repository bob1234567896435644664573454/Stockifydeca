import { useNavigate } from "@tanstack/react-router"
import { BookOpen, BarChart3, Trophy, Brain, Dice1, Target, Shield, Users, PieChart, LineChart, Zap, GraduationCap, ChevronRight, Settings, Lock, Award } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PublicNav } from "./PublicNav"
import { PublicFooter } from "./PublicFooter"

const FEATURES = [
    {
        category: "Learning",
        items: [
            { icon: BookOpen, title: "Interactive Micro-Lessons", description: "Bite-sized lessons on risk, diversification, compounding, valuation basics, and market mechanics. Complete with quizzes and progress tracking." },
            { icon: Brain, title: "AI Mentor", description: "Socratic AI that reviews your portfolio and trade journal, asking probing questions to improve critical thinking rather than giving direct advice." },
            { icon: Target, title: "Daily Challenges & XP", description: "Earn XP through daily quests, maintain streaks, and unlock achievements. Rewards are tied to good process, not lucky outcomes." },
        ]
    },
    {
        category: "Trading Simulation",
        items: [
            { icon: BarChart3, title: "Paper Trading Engine", description: "Realistic order execution with market/limit/stop orders, fees, slippage, and FIFO lot tracking. Supports stocks, ETFs, bonds, and mutual funds." },
            { icon: PieChart, title: "Portfolio Analytics", description: "Equity curves, allocation charts, risk meters, and performance attribution. See exactly how your decisions impact your portfolio." },
            { icon: LineChart, title: "Real Market Data", description: "Live and delayed market data from major exchanges. Trade with real prices in a simulated environment." },
        ]
    },
    {
        category: "Competition & Classroom",
        items: [
            { icon: Trophy, title: "Competition Portfolios", description: "Join classroom or club competitions with configurable rules: starting cash, allowed assets, position limits, scoring systems, and more." },
            { icon: GraduationCap, title: "Teacher Dashboard", description: "Full classroom control: roster management, trading freezes, announcement system, analytics, and exportable reports." },
            { icon: Settings, title: "Configurable Rule Sets", description: "Competition leaders can set leverage, shorting, max trades, transaction fees, data delay, trading hours, and scoring weights." },
        ]
    },
    {
        category: "Casino Math Room",
        items: [
            { icon: Dice1, title: "Educational Casino Games", description: "Blackjack, roulette, slots, mines, and chicken cross — all with transparent house edges and EV calculations." },
            { icon: Zap, title: "Expected Value Visualization", description: "Watch your balance over time and see the math behind why the house always wins. Compare to investing returns." },
            { icon: Shield, title: "Responsible Design", description: "All games clearly labeled as educational. House edges disclosed. Designed to teach, not to entertain or encourage gambling." },
        ]
    },
    {
        category: "Safety & Compliance",
        items: [
            { icon: Lock, title: "COPPA/FERPA Compliant", description: "Built for schools with age-appropriate content, teacher oversight, and privacy-first data handling." },
            { icon: Users, title: "Role-Based Access", description: "Students, teachers, and competition leaders each see exactly what they need. Full permission controls." },
            { icon: Award, title: "Process-Based Scoring", description: "Risk-adjusted returns, journaling bonuses, and AI process scores ensure students are rewarded for good decisions, not lucky bets." },
        ]
    },
]

export function FeaturesPage() {
    const navigate = useNavigate()
    return (
        <div className="min-h-screen bg-background text-foreground font-sans">
            <PublicNav />
            <section className="pt-24 pb-16 px-4 relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 rounded-full blur-[120px] -z-10" />
                <div className="container mx-auto max-w-4xl text-center">
                    <Badge variant="outline" className="mb-6 border-primary/20 bg-primary/5 text-primary">Platform Features</Badge>
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">Everything you need to teach financial literacy</h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">From interactive lessons to realistic trading simulation to AI coaching — all in one school-safe platform.</p>
                </div>
            </section>

            {FEATURES.map((section, si) => (
                <section key={si} className={`py-16 px-4 border-t ${si % 2 === 0 ? 'bg-muted/30' : ''}`}>
                    <div className="container mx-auto max-w-6xl">
                        <h2 className="text-2xl font-bold tracking-tight mb-8">{section.category}</h2>
                        <div className="grid md:grid-cols-3 gap-6">
                            {section.items.map((f, fi) => (
                                <Card key={fi} className="bg-background/50 hover:shadow-lg transition-all hover:-translate-y-1">
                                    <CardContent className="p-6">
                                        <f.icon className="h-8 w-8 text-primary mb-4" />
                                        <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                                        <p className="text-sm text-muted-foreground">{f.description}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>
            ))}

            <section className="py-20 px-4 border-t">
                <div className="container mx-auto max-w-4xl text-center">
                    <h2 className="text-3xl font-bold tracking-tight mb-6">Ready to get started?</h2>
                    <Button size="lg" onClick={() => navigate({ to: "/auth" })} className="rounded-full gradient-brand text-white shadow-lg px-8">
                        Start Free <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                </div>
            </section>
            <PublicFooter />
        </div>
    )
}
