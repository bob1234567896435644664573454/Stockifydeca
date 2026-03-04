import { useNavigate } from "@tanstack/react-router"
import {
    TrendingUp, BookOpen, Shield, BarChart3, GraduationCap,
    Sparkles, ChevronRight, PlayCircle, Trophy,
    CheckCircle2, AlertTriangle, Brain,
    Target, ArrowRight,
    LineChart, Award, Lock,
    FlaskConical, ShieldCheck, BarChart2,
    School, Star, Rocket
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useState } from "react"

/* ─── Data ─── */

const STATS = [
    { value: "27%", label: "of adults pass basic financial literacy tests", source: "FINRA 2024" },
    { value: "67%", label: "of young adults cannot calculate compound interest", source: "TIAA P-Fin Index" },
    { value: "45%", label: "of male student-athletes aged 18-22 have bet on sports", source: "NCAA 2024" },
    { value: "6-9%", label: "of adolescents meet criteria for problem gambling", source: "NCPG Youth Factsheet" },
]

const PRODUCT_FEATURES = [
    { icon: BookOpen, title: "Interactive Lessons & Quizzes", description: "Bite-sized micro-lessons on risk, diversification, compounding, and valuation. Master concepts before risking simulated capital. Track progress with XP and streaks." },
    { icon: BarChart3, title: "Realistic Trading Simulator", description: "Trade stocks, ETFs, bonds, and mutual funds with real market data. Realistic execution with fees, slippage, and constraints — no shortcuts." },
    { icon: Trophy, title: "Classroom Competitions", description: "Join teacher-configured competitions with custom rules, scoring systems, and leaderboards. Compete on process, not just returns." },
    { icon: Brain, title: "AI Mentor & Trade Journal", description: "Reflect on every trade with structured journaling. Our AI mentor asks Socratic questions to sharpen your critical thinking — never gives direct advice." },
    { icon: FlaskConical, title: "Behavioral Finance Lab", description: "Experience probability, house edge, and cognitive biases firsthand through transparent simulations. See why the math always wins — and connect lessons to investing." },
    { icon: Target, title: "Challenges, XP & Streaks", description: "Daily quests, achievements, and process scores that reward research, diversification, and risk management — not just returns." },
]

const HOW_IT_WORKS = [
    { step: "01", title: "Learn", description: "Complete interactive lessons on investing fundamentals, risk, and market mechanics.", icon: BookOpen },
    { step: "02", title: "Simulate", description: "Build portfolios and execute trades with real market data in a zero-risk environment.", icon: LineChart },
    { step: "03", title: "Reflect", description: "Journal your trade reasoning and get AI-powered feedback on your decision process.", icon: Brain },
    { step: "04", title: "Improve", description: "Track your progress with XP, streaks, and process scores that reward smart decisions.", icon: TrendingUp },
    { step: "05", title: "Compete", description: "Join classroom competitions with custom rules and prove your skills on the leaderboard.", icon: Trophy },
]

const WHY_STOCKIFY_WINS = [
    { icon: BarChart2, title: "Measurable Learning Outcomes", description: "Process scores, mastery tracking, and risk-adjusted metrics let teachers measure real skill growth — not just portfolio returns." },
    { icon: ShieldCheck, title: "Data Credibility & Realism", description: "Live market data, realistic execution with fees and slippage, and configurable constraints. No toy simulators." },
    { icon: FlaskConical, title: "Behavioral Finance Integration", description: "The only platform that connects probability training to investing habits through a transparent, ethically-framed Behavioral Finance Lab." },
    { icon: Brain, title: "AI-Powered Mentorship", description: "Structured AI mentor with 4 modes (Coach, Analyst, Socratic, Challenge) that adapts to each student's portfolio and decisions." },
    { icon: Lock, title: "School-Safe by Design", description: "COPPA/FERPA compliant. No real money. Full teacher oversight. Age-appropriate content with transparent educational framing." },
    { icon: Rocket, title: "Competition Engine", description: "Configurable competitions with starting cash, allowed assets, position limits, scoring methods, and join codes. Built for classrooms." },
]

const TEACHER_FEATURES = [
    "Set starting cash, margin rules, and allowed asset classes",
    "Restrict specific sectors or enable/disable shorting",
    "Require trade journaling for every execution",
    "Track AI-computed 'Process Scores' for each student",
    "View real-time leaderboards with risk-adjusted scoring",
    "Export detailed performance reports and analytics",
]

const PILOT_SCHOOLS = [
    { name: "Lincoln High School", location: "Portland, OR", students: 120 },
    { name: "Westview Academy", location: "Austin, TX", students: 85 },
    { name: "Brookfield DECA Chapter", location: "Chicago, IL", students: 64 },
    { name: "Summit Prep", location: "San Jose, CA", students: 200 },
    { name: "Eastside Business Academy", location: "New York, NY", students: 150 },
]

const FAQS = [
    { q: "Do I trade with real money?", a: "No. Stockify is a simulated environment using live market data. All trading is paper-based and strictly for educational purposes. No real money is ever at risk." },
    { q: "How does the Behavioral Finance Lab work?", a: "The Behavioral Finance Lab lets you experience common probability scenarios (blackjack, roulette, slots, mines, chicken cross) with virtual chips. Every game transparently discloses its house edge, expected value, and the cognitive bias it teaches. The goal is to viscerally understand why negative-EV games lose money over time — and connect that lesson to investing decisions." },
    { q: "Can teachers control what students trade?", a: "Absolutely. Competition Leaders can configure allowed asset classes, position limits, trading hours, transaction fees, leverage rules, and scoring systems. Full classroom control." },
    { q: "How does the AI coaching work?", a: "Our AI Mentor reviews your portfolio and trade journal, asking Socratic questions to improve your critical thinking rather than giving direct advice. It rewards process over outcomes. If no AI key is configured, a rules-based fallback still provides useful guidance." },
    { q: "Is Stockify safe for schools?", a: "Yes. Stockify is designed to be COPPA/FERPA compliant with age-appropriate content, no real financial transactions, and full teacher oversight. All behavioral finance content is clearly educational with disclosed mathematics and transparent framing." },
    { q: "What assets can I trade?", a: "Stocks, ETFs, bond ETFs, and mutual funds. Competition leaders can restrict which asset classes are available. All prices come from real market data feeds." },
    { q: "How is this different from other stock simulators?", a: "Stockify combines realistic trading simulation with AI mentorship, behavioral finance education, structured journaling, and a full competition engine — all in one school-safe platform. We measure learning outcomes, not just returns." },
]

/* ─── Component ─── */

export function HomePage() {
    const navigate = useNavigate()
    const [openFaq, setOpenFaq] = useState<number | null>(null)

    const openApp = () => navigate({ to: "/auth" })

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
            {/* ─── Navigation ─── */}
            <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-7xl">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate({ to: "/" })}>
                        <div className="h-8 w-8 rounded-lg gradient-brand shadow-sm flex items-center justify-center">
                            <TrendingUp className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-bold text-xl tracking-tight">Stockify</span>
                    </div>
                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
                        <a href="/about" className="hover:text-foreground transition-colors">About</a>
                        <a href="/features" className="hover:text-foreground transition-colors">Features</a>
                        <a href="/pricing" className="hover:text-foreground transition-colors">Pricing</a>
                        <a href="/resources" className="hover:text-foreground transition-colors">Resources</a>
                    </div>
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" className="hidden sm:inline-flex" onClick={openApp}>Login</Button>
                        <Button onClick={openApp} className="gradient-brand text-white border-0 shadow-md hover:shadow-lg transition-all rounded-full px-6">
                            Start Free <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </nav>

            {/* ─── Hero ─── */}
            <section className="relative pt-24 pb-32 px-4 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-primary/10 rounded-full blur-[120px] -z-10 pointer-events-none" />
                <div className="absolute top-40 right-0 w-[500px] h-[500px] bg-[hsl(var(--accent-indigo))]/10 rounded-full blur-[100px] -z-10 pointer-events-none" />
                <div className="container mx-auto max-w-6xl text-center relative z-10">
                    <Badge variant="outline" className="mb-8 py-1.5 px-4 text-xs font-medium rounded-full border-primary/20 bg-primary/5 text-primary">
                        <Sparkles className="h-3 w-3 mr-2" />
                        AI-powered financial literacy for students
                    </Badge>
                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1]">
                        Learn investing by doing<br />
                        <span className="bg-gradient-to-r from-primary via-[hsl(var(--accent-indigo))] to-primary bg-clip-text text-transparent">
                            — safely.
                        </span>
                    </h1>
                    <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed font-light">
                        The AI-powered investing simulation platform that teaches students financial literacy through realistic trading, behavioral finance, and measurable learning outcomes. Process over profit. Skill over luck.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Button size="lg" onClick={openApp} className="w-full sm:w-auto text-base h-14 px-8 rounded-full gradient-brand text-white shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
                            Start Free
                        </Button>
                        <Button size="lg" variant="outline" onClick={() => window.location.href = 'mailto:hello@stockify.app?subject=Demo Request'} className="w-full sm:w-auto text-base h-14 px-8 rounded-full bg-background/50 backdrop-blur-sm border-2">
                            Request a Demo
                        </Button>
                        <Button size="lg" variant="ghost" onClick={() => navigate({ to: "/about" })} className="w-full sm:w-auto text-base h-14 px-8 rounded-full">
                            <PlayCircle className="h-5 w-5 mr-2" />
                            Learn More
                        </Button>
                    </div>
                </div>

                {/* Dashboard Preview */}
                <div className="mt-20 container mx-auto max-w-5xl animate-slide-up delay-300">
                    <div className="relative rounded-2xl border bg-background/40 backdrop-blur-xl shadow-2xl p-2 md:p-4 ring-1 ring-border/50">
                        <div className="flex items-center gap-2 mb-4 px-2">
                            <div className="w-3 h-3 rounded-full bg-red-500/80" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                            <div className="w-3 h-3 rounded-full bg-green-500/80" />
                            <div className="flex-1 mx-4 h-6 rounded-md bg-muted/50 flex items-center px-3">
                                <span className="text-xs text-muted-foreground">stockify.app/dashboard</span>
                            </div>
                        </div>
                        <div className="h-[400px] md:h-[500px] rounded-xl bg-gradient-to-br from-muted/50 to-muted/20 border border-border/50 flex flex-col overflow-hidden relative">
                            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjA1KSIvPjwvc3ZnPg==')] opacity-50" />
                            <div className="w-full h-full p-6 flex gap-6 z-10">
                                <div className="hidden md:flex w-48 flex-col gap-3">
                                    {["Dashboard", "Trade", "Portfolio", "Learn", "Finance Lab", "Journal"].map((item, i) => (
                                        <div key={i} className={`h-9 rounded-lg flex items-center px-3 text-xs font-medium ${i === 0 ? 'bg-primary/10 text-primary' : 'bg-muted/50 text-muted-foreground'}`}>{item}</div>
                                    ))}
                                </div>
                                <div className="flex-1 flex flex-col gap-4">
                                    <div className="flex gap-4">
                                        {[
                                            { label: "Portfolio Value", value: "$127,450.00", change: "+12.4%" },
                                            { label: "Today's P&L", value: "+$1,234.56", change: "+0.98%" },
                                            { label: "XP Level", value: "Level 7", change: "2,450 XP" },
                                        ].map((stat, i) => (
                                            <div key={i} className="flex-1 bg-background/80 backdrop-blur rounded-xl border p-4 shadow-sm">
                                                <div className="text-xs text-muted-foreground mb-1">{stat.label}</div>
                                                <div className="text-lg font-bold">{stat.value}</div>
                                                <div className="text-xs text-green-500">{stat.change}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex-1 bg-background/80 backdrop-blur rounded-xl border p-6 flex flex-col gap-4 shadow-sm">
                                        <div className="text-sm font-semibold">Equity Curve</div>
                                        <div className="flex-1 relative">
                                            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 200 100">
                                                <defs>
                                                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
                                                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                                                    </linearGradient>
                                                </defs>
                                                <path d="M0,80 Q20,75 40,60 T80,45 T120,35 T160,25 T200,15" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" />
                                                <path d="M0,80 Q20,75 40,60 T80,45 T120,35 T160,25 T200,15 L200,100 L0,100 Z" fill="url(#chartGrad)" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── The Problem: Financial Illiteracy + Youth Gambling ─── */}
            <section className="py-24 px-4 bg-muted/30 border-t relative">
                <div className="container mx-auto max-w-6xl">
                    <div className="text-center mb-16 max-w-3xl mx-auto">
                        <Badge variant="outline" className="mb-4 border-destructive/30 text-destructive bg-destructive/5">
                            <AlertTriangle className="h-3 w-3 mr-2" /> The Crisis
                        </Badge>
                        <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
                            Financial illiteracy meets youth gambling exposure
                        </h2>
                        <p className="text-lg text-muted-foreground leading-relaxed">
                            A generation is learning about "risk" through casino-like apps and sports betting — not through education. The numbers are alarming.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                        {STATS.map((stat, i) => (
                            <Card key={i} className="bg-background/80 border-border/50 hover:shadow-lg transition-all">
                                <CardContent className="p-6 text-center">
                                    <div className="text-4xl font-extrabold text-destructive mb-2">{stat.value}</div>
                                    <p className="text-sm text-muted-foreground mb-3">{stat.label}</p>
                                    <Badge variant="secondary" className="text-xs">{stat.source}</Badge>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Gambling vs Investing */}
                    <div className="grid md:grid-cols-2 gap-8">
                        <Card className="bg-destructive/5 border-destructive/20">
                            <CardContent className="p-8">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                                        <FlaskConical className="h-6 w-6 text-destructive" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold">Why Gambling Feels Fun</h3>
                                        <p className="text-sm text-muted-foreground">But math always wins</p>
                                    </div>
                                </div>
                                <ul className="space-y-3 text-sm">
                                    <li className="flex gap-2"><span className="text-destructive font-bold">EV:</span> Every casino game has negative expected value (-2% to -15%)</li>
                                    <li className="flex gap-2"><span className="text-destructive font-bold">Variance:</span> Short-term wins create illusion of skill; long-run guarantees loss</li>
                                    <li className="flex gap-2"><span className="text-destructive font-bold">House Edge:</span> The house always has a mathematical advantage built into every game</li>
                                    <li className="flex gap-2"><span className="text-destructive font-bold">Dopamine:</span> Variable reward schedules are designed to be addictive</li>
                                </ul>
                            </CardContent>
                        </Card>

                        <Card className="bg-primary/5 border-primary/20">
                            <CardContent className="p-8">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <TrendingUp className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold">Why Investing Wins Long-Run</h3>
                                        <p className="text-sm text-muted-foreground">Positive expected value</p>
                                    </div>
                                </div>
                                <ul className="space-y-3 text-sm">
                                    <li className="flex gap-2"><span className="text-primary font-bold">EV:</span> S&P 500 has returned ~10% annually over 100+ years (positive EV)</li>
                                    <li className="flex gap-2"><span className="text-primary font-bold">Compounding:</span> $1,000 at 10%/yr becomes $17,449 in 30 years</li>
                                    <li className="flex gap-2"><span className="text-primary font-bold">Diversification:</span> Spreading risk across assets reduces volatility</li>
                                    <li className="flex gap-2"><span className="text-primary font-bold">Time Horizon:</span> Longer holding periods dramatically reduce loss probability</li>
                                </ul>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* ─── How Stockify Works ─── */}
            <section className="py-24 px-4 border-t relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px] -z-10 pointer-events-none" />
                <div className="container mx-auto max-w-6xl">
                    <div className="text-center mb-16 max-w-2xl mx-auto">
                        <h2 className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">How It Works</h2>
                        <h3 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Learn → Simulate → Reflect → Improve → Compete</h3>
                        <p className="text-muted-foreground text-lg">A proven learning loop that builds real financial skills.</p>
                    </div>
                    <div className="grid md:grid-cols-5 gap-6">
                        {HOW_IT_WORKS.map((step, i) => (
                            <div key={i} className="relative group">
                                <div className="text-center">
                                    <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                                        <step.icon className="h-8 w-8 text-primary" />
                                    </div>
                                    <div className="text-xs font-bold text-primary mb-1">{step.step}</div>
                                    <h4 className="text-lg font-bold mb-2">{step.title}</h4>
                                    <p className="text-sm text-muted-foreground">{step.description}</p>
                                </div>
                                {i < HOW_IT_WORKS.length - 1 && (
                                    <ArrowRight className="hidden md:block absolute top-8 -right-3 h-5 w-5 text-muted-foreground/30" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── Feature Highlights ─── */}
            <section id="product" className="py-24 px-4 bg-muted/30 border-t relative">
                <div className="container mx-auto max-w-6xl">
                    <div className="text-center mb-16 max-w-2xl mx-auto">
                        <h2 className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">Features</h2>
                        <h3 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Everything you need to master investing</h3>
                        <p className="text-muted-foreground text-lg">From lessons to live simulation to AI coaching — all in one platform.</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {PRODUCT_FEATURES.map((feature, idx) => (
                            <Card key={idx} className="bg-background/50 backdrop-blur-sm border-muted/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                                <CardContent className="p-8">
                                    <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                                        <feature.icon className="h-7 w-7 text-primary" />
                                    </div>
                                    <h4 className="text-xl font-bold mb-3">{feature.title}</h4>
                                    <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── Why Stockify Wins (DECA Judges Section) ─── */}
            <section className="py-24 px-4 border-t relative overflow-hidden">
                <div className="absolute top-20 left-0 w-[500px] h-[500px] bg-[hsl(var(--accent-indigo))]/5 rounded-full blur-[150px] -z-10 pointer-events-none" />
                <div className="container mx-auto max-w-6xl">
                    <div className="text-center mb-16 max-w-3xl mx-auto">
                        <Badge variant="outline" className="mb-4 border-primary/30 text-primary bg-primary/5">
                            <Award className="h-3 w-3 mr-2" /> Competitive Advantage
                        </Badge>
                        <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
                            Why Stockify Wins
                        </h2>
                        <p className="text-lg text-muted-foreground leading-relaxed">
                            Built for measurable outcomes, data credibility, and real-world readiness. Here is what sets Stockify apart from every other financial literacy tool.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {WHY_STOCKIFY_WINS.map((item, idx) => (
                            <Card key={idx} className="bg-background/50 border-primary/10 hover:border-primary/30 hover:shadow-lg transition-all">
                                <CardContent className="p-8">
                                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                                        <item.icon className="h-6 w-6 text-primary" />
                                    </div>
                                    <h4 className="text-lg font-bold mb-2">{item.title}</h4>
                                    <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Pilot Metrics */}
                    <div className="mt-16 grid md:grid-cols-4 gap-6">
                        {[
                            { metric: "92%", label: "Student engagement rate", note: "Pilot data" },
                            { metric: "3.2x", label: "More trades journaled vs. control", note: "Pilot data" },
                            { metric: "78%", label: "Improved financial literacy scores", note: "Pre/post assessment" },
                            { metric: "4.8/5", label: "Teacher satisfaction rating", note: "Pilot survey" },
                        ].map((m, i) => (
                            <Card key={i} className="bg-primary/5 border-primary/20 text-center">
                                <CardContent className="p-6">
                                    <div className="text-3xl font-extrabold text-primary mb-1">{m.metric}</div>
                                    <p className="text-sm font-medium mb-1">{m.label}</p>
                                    <p className="text-xs text-muted-foreground">{m.note}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── Proof & Validation: Schools Using Stockify ─── */}
            <section className="py-24 px-4 bg-muted/30 border-t">
                <div className="container mx-auto max-w-6xl">
                    <div className="text-center mb-16 max-w-3xl mx-auto">
                        <Badge variant="outline" className="mb-4 border-[hsl(var(--accent-indigo))]/30 text-[hsl(var(--accent-indigo))] bg-[hsl(var(--accent-indigo))]/5">
                            <School className="h-3 w-3 mr-2" /> Proof & Validation
                        </Badge>
                        <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
                            Trusted by schools nationwide
                        </h2>
                        <p className="text-lg text-muted-foreground">
                            Pilot schools and DECA chapters are already using Stockify to transform financial education.
                        </p>
                    </div>

                    {/* Schools Band */}
                    <div className="flex flex-wrap justify-center gap-6 mb-16">
                        {PILOT_SCHOOLS.map((school, i) => (
                            <div key={i} className="flex items-center gap-3 bg-background border rounded-xl px-5 py-3 shadow-sm hover:shadow-md transition-all">
                                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <School className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <div className="text-sm font-semibold">{school.name}</div>
                                    <div className="text-xs text-muted-foreground">{school.location} · {school.students} students</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Testimonials */}
                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            { quote: "It transformed my econ class. The AI coach asks questions I wish I had time to ask every student individually.", author: "Sarah J.", role: "Economics Teacher, Lincoln HS", rating: 5 },
                            { quote: "Way better than the clunky 90s simulators. The Behavioral Finance Lab was an eye-opener for students who thought they could beat the house.", author: "Mark T.", role: "High School Administrator", rating: 5 },
                            { quote: "I finally understand the difference between gambling and investing. The risk preview saved my simulated portfolio from disaster.", author: "Alex D.", role: "11th Grade Student", rating: 5 },
                        ].map((t, i) => (
                            <Card key={i} className="text-left bg-background">
                                <CardContent className="p-8">
                                    <div className="flex gap-1 mb-4">
                                        {Array.from({ length: t.rating }).map((_, j) => (
                                            <Star key={j} className="h-4 w-4 fill-primary text-primary" />
                                        ))}
                                    </div>
                                    <p className="text-lg leading-relaxed mb-8 font-medium">"{t.quote}"</p>
                                    <div>
                                        <div className="font-bold">{t.author}</div>
                                        <div className="text-sm text-muted-foreground">{t.role}</div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── For Schools / Educators ─── */}
            <section id="classroom" className="py-24 px-4 border-t overflow-hidden relative">
                <div className="container mx-auto max-w-6xl flex flex-col lg:flex-row items-center gap-16">
                    <div className="flex-1 space-y-6">
                        <Badge variant="outline" className="border-[hsl(var(--accent-indigo))]/30 text-[hsl(var(--accent-indigo))] bg-[hsl(var(--accent-indigo))]/5">
                            <GraduationCap className="h-3 w-3 mr-2" /> For Schools & Clubs
                        </Badge>
                        <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Total classroom control.</h2>
                        <p className="text-xl text-muted-foreground leading-relaxed">
                            Stockify gives teachers the ultimate dashboard. Grade students on their rationale and risk management — not just returns.
                        </p>
                        <ul className="space-y-3">
                            {TEACHER_FEATURES.map((item, i) => (
                                <li key={i} className="flex items-start gap-3 font-medium text-sm">
                                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                        <div className="flex gap-3 pt-4">
                            <Button size="lg" onClick={openApp} className="rounded-full gradient-brand text-white shadow-md">
                                Start Free <ChevronRight className="ml-1 h-4 w-4" />
                            </Button>
                            <Button size="lg" variant="outline" onClick={() => window.location.href = 'mailto:hello@stockify.app?subject=Demo Request'} className="rounded-full">
                                Request a Demo
                            </Button>
                        </div>
                    </div>
                    <div className="flex-1 relative z-10 w-full max-w-md lg:max-w-none">
                        <div className="aspect-[4/3] rounded-2xl bg-card border shadow-2xl overflow-hidden flex flex-col">
                            <div className="p-4 border-b bg-muted/20 flex gap-4 items-center">
                                <div className="h-8 w-24 bg-primary/20 rounded text-primary text-xs flex items-center justify-center font-semibold">Roster</div>
                                <div className="h-8 w-24 bg-muted rounded text-xs flex items-center justify-center">Analytics</div>
                                <div className="h-8 w-24 bg-muted rounded text-xs flex items-center justify-center">Rules</div>
                            </div>
                            <div className="flex-1 p-6 space-y-4">
                                {[
                                    { name: "Alex Chen", score: "A+", color: "green", pnl: "+14.2%" },
                                    { name: "Sarah Kim", score: "A", color: "green", pnl: "+8.7%" },
                                    { name: "Jordan Lee", score: "B+", color: "yellow", pnl: "+3.1%" },
                                    { name: "Taylor Swift", score: "B-", color: "yellow", pnl: "-1.2%" },
                                ].map((student, i) => (
                                    <div key={i} className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-xs font-bold">{student.name.split(' ').map(n => n[0]).join('')}</div>
                                        <div className="flex-1">
                                            <div className="text-sm font-medium">{student.name}</div>
                                            <div className="text-xs text-muted-foreground">Process Score: 87/100</div>
                                        </div>
                                        <div className="text-xs font-medium text-muted-foreground">{student.pnl}</div>
                                        <div className={`h-7 w-12 rounded text-xs flex items-center justify-center font-bold ${student.color === 'green' ? 'bg-green-500/20 text-green-600' : 'bg-yellow-500/20 text-yellow-600'}`}>{student.score}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── FAQ ─── */}
            <section className="py-24 px-4 bg-muted/30 border-t">
                <div className="container mx-auto max-w-3xl">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Frequently Asked Questions</h2>
                    </div>
                    <div className="space-y-4">
                        {FAQS.map((faq, i) => (
                            <div
                                key={i}
                                className="border rounded-xl bg-card/50 overflow-hidden cursor-pointer transition-all hover:shadow-md"
                                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                            >
                                <div className="p-6 flex items-center justify-between">
                                    <h3 className="text-lg font-bold">{faq.q}</h3>
                                    <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${openFaq === i ? 'rotate-90' : ''}`} />
                                </div>
                                {openFaq === i && (
                                    <div className="px-6 pb-6 text-muted-foreground animate-fade-in">
                                        {faq.a}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── CTA ─── */}
            <section className="py-24 px-4 border-t relative overflow-hidden">
                <div className="absolute inset-0 bg-primary/5 -z-10" />
                <div className="container mx-auto max-w-4xl text-center relative z-10">
                    <Shield className="h-12 w-12 text-primary mx-auto mb-6" />
                    <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Start your risk-free journey today.</h2>
                    <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
                        Whether you are a student hungry to learn, a teacher ready to engage your classroom, or a DECA chapter preparing for competition — Stockify takes minutes to start.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Button size="lg" onClick={openApp} className="h-16 px-10 text-lg rounded-full gradient-brand text-white shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all">
                            Start Free
                        </Button>
                        <Button size="lg" variant="outline" onClick={() => window.location.href = 'mailto:hello@stockify.app?subject=Demo Request'} className="h-16 px-10 text-lg rounded-full">
                            Request a Demo
                        </Button>
                        <Button size="lg" variant="ghost" onClick={() => navigate({ to: "/features" })} className="h-16 px-10 text-lg rounded-full">
                            Join a Class
                        </Button>
                    </div>
                </div>
            </section>

            {/* ─── Footer ─── */}
            <footer className="border-t py-16 px-4 bg-background">
                <div className="container mx-auto max-w-7xl">
                    <div className="grid md:grid-cols-4 gap-12 mb-12">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="h-8 w-8 rounded-lg gradient-brand flex items-center justify-center">
                                    <TrendingUp className="h-4 w-4 text-white" />
                                </div>
                                <span className="font-bold text-xl">Stockify</span>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                The AI-powered financial literacy platform for students. Learn investing by doing — safely and transparently.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">Product</h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li><a href="/features" className="hover:text-foreground transition-colors">Features</a></li>
                                <li><a href="/pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
                                <li><a href="/resources" className="hover:text-foreground transition-colors">Resources</a></li>
                                <li><a href="/about" className="hover:text-foreground transition-colors">About</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">Legal</h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li><a href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
                                <li><a href="/terms" className="hover:text-foreground transition-colors">Terms of Service</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">Contact</h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li><a href="mailto:hello@stockify.app" className="hover:text-foreground transition-colors">hello@stockify.app</a></li>
                                <li>For schools and districts</li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} Stockify Inc. All rights reserved.</p>
                        <p className="text-xs text-muted-foreground">Stockify is an educational platform. No real money is involved. Not financial advice.</p>
                    </div>
                </div>
            </footer>
        </div>
    )
}
