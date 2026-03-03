import { useNavigate } from "@tanstack/react-router"
import {
    BookOpen, BarChart3, Trophy, Brain, Target, Shield, Users,
    PieChart, LineChart, Zap, GraduationCap, ChevronRight,
    Settings, Lock, Award, FlaskConical, Eye, Pencil,
    BarChart2, TrendingUp, Lightbulb, Search
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PublicNav } from "./PublicNav"
import { PublicFooter } from "./PublicFooter"

const FEATURES = [
    {
        category: "Learning & Skill Building",
        description: "Master investing fundamentals through structured, interactive content.",
        items: [
            { icon: BookOpen, title: "Interactive Micro-Lessons", description: "Bite-sized lessons on risk, diversification, compounding, valuation basics, and market mechanics. Complete with quizzes, progress tracking, and XP rewards." },
            { icon: Brain, title: "AI Mentor (4 Modes)", description: "Coach, Analyst, Socratic, and Challenge modes. Reviews your portfolio and journal, asks probing questions, and adapts to your level. Rules-based fallback when no AI key is configured." },
            { icon: Target, title: "Daily Challenges & XP", description: "Earn XP through daily quests, maintain streaks, and unlock achievements. Rewards are tied to good process — research, diversification, risk management — not lucky outcomes." },
            { icon: Pencil, title: "Trade Journal", description: "Structured journaling with pre-trade thesis, post-trade reflection, and emotion tagging. AI-powered pattern insights help you identify recurring decision biases." },
        ]
    },
    {
        category: "Trading Simulation",
        description: "Realistic paper trading with live market data and institutional-grade analytics.",
        items: [
            { icon: BarChart3, title: "Paper Trading Engine", description: "Realistic order execution with market/limit/stop orders, fees, slippage, and FIFO lot tracking. Supports stocks, ETFs, bonds, and mutual funds." },
            { icon: PieChart, title: "Portfolio Analytics", description: "Equity curves, allocation donut charts, sector heatmaps, and performance attribution. See exactly how your decisions impact your portfolio." },
            { icon: LineChart, title: "Real Market Data", description: "Live and delayed market data from major exchanges. Trade with real prices in a simulated environment. No toy data." },
            { icon: BarChart2, title: "Risk Dashboard", description: "Concentration (HHI), max drawdown, portfolio volatility, beta, and Sharpe ratio. Real risk metrics that teach institutional-grade analysis." },
        ]
    },
    {
        category: "Competition & Classroom",
        description: "Full-featured competition engine built for teachers, clubs, and DECA chapters.",
        items: [
            { icon: Trophy, title: "Competition Engine", description: "Create or join competitions with configurable rules: starting cash, allowed assets, position limits, scoring systems, join codes, and time windows." },
            { icon: GraduationCap, title: "Teacher Dashboard", description: "Full classroom control: roster management, trading freezes, announcement system, analytics, process scores, and exportable reports." },
            { icon: Settings, title: "Configurable Rule Sets", description: "Set leverage, shorting, max trades, transaction fees, data delay, trading hours, scoring weights, and required journaling." },
            { icon: Award, title: "Process-Based Scoring", description: "Risk-adjusted returns, journaling bonuses, and AI process scores ensure students are rewarded for good decisions, not lucky bets." },
        ]
    },
    {
        category: "Behavioral Finance Lab",
        description: "Transparent probability simulations that connect to investing concepts.",
        items: [
            { icon: FlaskConical, title: "5 Probability Simulations", description: "Blackjack, roulette, slots, mines, and chicken cross — each with transparent house edges, EV calculations, and the cognitive bias it teaches." },
            { icon: Eye, title: "Full Transparency", description: "Every simulation discloses its house edge, expected value formula, and the mathematical proof of why negative-EV games lose over time." },
            { icon: Lightbulb, title: "Connect to Investing", description: "After each simulation, a bridge module shows how the same probability concept applies to investing: diversification, time horizon, compounding." },
            { icon: Shield, title: "Ethical Framing", description: "All simulations are clearly labeled as educational. Designed to teach probability and behavioral biases, not to entertain or encourage gambling." },
        ]
    },
    {
        category: "Stock Research & Analysis",
        description: "Real financial data and competitive intelligence for informed decisions.",
        items: [
            { icon: Search, title: "Company Profiles", description: "Detailed profiles for major stocks including sector, market cap, P/E ratio, 52-week range, and business description from Yahoo Finance." },
            { icon: TrendingUp, title: "Technical Insights", description: "Short-term and long-term outlook indicators, analyst recommendations, and key technical signals for each stock." },
            { icon: Users, title: "Insider Holdings", description: "Track insider ownership percentages, institutional holdings, and recent insider transactions for transparency." },
            { icon: BarChart3, title: "Competitor Analytics", description: "SimilarWeb-powered traffic data, engagement metrics, and competitive positioning for financial platforms." },
        ]
    },
    {
        category: "Safety & Compliance",
        description: "School-safe by design. Built for institutions, not just individuals.",
        items: [
            { icon: Lock, title: "COPPA/FERPA Compliant", description: "Built for schools with age-appropriate content, teacher oversight, and privacy-first data handling. No real money ever involved." },
            { icon: Users, title: "Role-Based Access", description: "Students, teachers, and competition leaders each see exactly what they need. Full permission controls and audit trails." },
            { icon: Shield, title: "Content Guardrails", description: "AI mentor has strict content policies. Behavioral Finance Lab has educational framing. All content is school-appropriate." },
            { icon: Zap, title: "Environment Validation", description: "Runtime checks for required configuration. Graceful fallbacks when services are unavailable. Error boundaries prevent cascading failures." },
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
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">From interactive lessons to realistic trading simulation to AI coaching — 24 features across 6 categories, all in one school-safe platform.</p>
                </div>
            </section>

            {FEATURES.map((section, si) => (
                <section key={si} className={`py-16 px-4 border-t ${si % 2 === 0 ? 'bg-muted/30' : ''}`}>
                    <div className="container mx-auto max-w-6xl">
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold tracking-tight mb-2">{section.category}</h2>
                            <p className="text-muted-foreground">{section.description}</p>
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                    <p className="text-lg text-muted-foreground mb-8">Join the schools and students already using Stockify.</p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Button size="lg" onClick={() => navigate({ to: "/auth" })} className="rounded-full gradient-brand text-white shadow-lg px-8">
                            Start Free <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                        <Button size="lg" variant="outline" onClick={() => window.location.href = 'mailto:hello@stockify.app?subject=Demo Request'} className="rounded-full px-8">
                            Request a Demo
                        </Button>
                    </div>
                </div>
            </section>
            <PublicFooter />
        </div>
    )
}
