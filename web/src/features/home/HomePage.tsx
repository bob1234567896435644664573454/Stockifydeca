import { useNavigate } from "@tanstack/react-router"
import {
    TrendingUp, BookOpen, Shield, BarChart3, GraduationCap,
    Sparkles, ChevronRight, PlayCircle, Trophy,
    MessageSquare, CheckCircle2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const PRODUCT_FEATURES = [
    {
        icon: BookOpen,
        title: "Learn the Fundamentals",
        description: "Bite-sized micro-lessons on investing mechanics. Master concepts before risking simulated capital.",
    },
    {
        icon: BarChart3,
        title: "Simulate Live Markets",
        description: "Trade stocks and crypto with real-time data, advanced charting, and realistic execution constraints.",
    },
    {
        icon: Trophy,
        title: "Compete & Climb",
        description: "Join class leaderboards. Build your streak, complete daily quests, and earn XP for sound decisions.",
    }
]

const FAQS = [
    {
        q: "Do I trade with real money?",
        a: "No, Stockify is a simulated environment using live market data. It’s strictly for educational purposes."
    },
    {
        q: "How does the AI coaching work?",
        a: "Our AI Mentor reviews your portfolio and trade journal, asking Socratic questions to improve your critical thinking rather than giving direct advice."
    },
    {
        q: "Can teachers control what students trade?",
        a: "Yes. Classroom Mode allows teachers to restrict certain asset classes, set position limits, and define trading windows."
    }
]

export function HomePage() {
    const navigate = useNavigate()

    const openApp = () => navigate({ to: "/auth" })

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
            {/* Top Navigation */}
            <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-7xl">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate({ to: "/" })}>
                        <div className="h-8 w-8 rounded-lg gradient-brand shadow-sm flex items-center justify-center">
                            <TrendingUp className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-bold text-xl tracking-tight">Stockify</span>
                    </div>

                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
                        <a href="#product" className="hover:text-foreground transition-colors">Product</a>
                        <a href="#classroom" className="hover:text-foreground transition-colors">Classroom</a>
                        <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
                    </div>

                    <div className="flex items-center gap-4">
                        <Button variant="ghost" className="hidden sm:inline-flex" onClick={openApp}>
                            Login
                        </Button>
                        <Button onClick={openApp} className="gradient-brand text-white border-0 shadow-md hover:shadow-lg transition-all rounded-full px-6">
                            Open App <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-24 pb-32 px-4 overflow-hidden">
                {/* Ambient Backgrounds */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-primary/10 rounded-full blur-[120px] -z-10 pointer-events-none" />
                <div className="absolute top-40 right-0 w-[500px] h-[500px] bg-[hsl(var(--accent-indigo))]/10 rounded-full blur-[100px] -z-10 pointer-events-none" />

                <div className="container mx-auto max-w-6xl text-center relative z-10">
                    <Badge variant="outline" className="mb-8 py-1.5 px-4 text-xs font-medium rounded-full border-primary/20 bg-primary/5 text-primary">
                        <Sparkles className="h-3 w-3 mr-2" />
                        The #1 simulated trading platform for students
                    </Badge>

                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1]">
                        Master the markets.<br />
                        <span className="bg-gradient-to-r from-primary via-[hsl(var(--accent-indigo))] to-primary bg-clip-text text-transparent animate-gradient-x">
                            Zero risk involved.
                        </span>
                    </h1>

                    <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed font-light">
                        Learn investing fundamentals, build your simulated portfolio, and get real-time feedback from our AI mentor. Process over profit.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Button size="lg" onClick={openApp} className="w-full sm:w-auto text-base h-14 px-8 rounded-full gradient-brand text-white shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
                            Start Trading Now
                        </Button>
                        <Button size="lg" variant="outline" className="w-full sm:w-auto text-base h-14 px-8 rounded-full bg-background/50 backdrop-blur-sm border-2">
                            <PlayCircle className="h-5 w-5 mr-2" />
                            See How It Works
                        </Button>
                    </div>
                </div>

                {/* Dashboard App Screenshot Placeholder */}
                <div className="mt-20 container mx-auto max-w-5xl animate-slide-up delay-300">
                    <div className="relative rounded-2xl border bg-background/40 backdrop-blur-xl shadow-2xl p-2 md:p-4 ring-1 ring-border/50">
                        {/* Fake browser top */}
                        <div className="flex items-center gap-2 mb-4 px-2">
                            <div className="w-3 h-3 rounded-full bg-red-500/80" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                            <div className="w-3 h-3 rounded-full bg-green-500/80" />
                        </div>
                        {/* App representation */}
                        <div className="h-[400px] md:h-[600px] rounded-xl bg-gradient-to-br from-muted/50 to-muted/20 border border-border/50 flex flex-col items-center justify-center overflow-hidden relative">
                            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjA1KSIvPjwvc3ZnPg==')] opacity-50" />

                            {/* Abstract App UI */}
                            <div className="w-full h-full max-w-4xl p-6 flex gap-6 z-10">
                                <div className="hidden md:flex w-48 flex-col gap-4">
                                    <div className="h-8 bg-muted rounded-md w-full" />
                                    <div className="h-8 bg-muted rounded-md w-full" />
                                    <div className="h-8 bg-muted rounded-md w-3/4" />
                                </div>
                                <div className="flex-1 flex flex-col gap-6">
                                    <div className="flex gap-4">
                                        <div className="h-24 flex-1 bg-background/80 backdrop-blur rounded-xl border p-4 shadow-sm flex flex-col justify-between">
                                            <div className="w-20 h-3 bg-muted rounded-full" />
                                            <div className="w-32 h-6 bg-primary/20 rounded-md" />
                                        </div>
                                        <div className="h-24 flex-1 bg-background/80 backdrop-blur rounded-xl border p-4 shadow-sm flex flex-col justify-between">
                                            <div className="w-20 h-3 bg-muted rounded-full" />
                                            <div className="w-32 h-6 bg-primary/20 rounded-md" />
                                        </div>
                                        <div className="hidden sm:flex h-24 flex-1 bg-background/80 backdrop-blur rounded-xl border p-4 shadow-sm flex flex-col justify-between">
                                            <div className="w-20 h-3 bg-muted rounded-full" />
                                            <div className="w-32 h-6 bg-[hsl(var(--chart-up))]/20 rounded-md" />
                                        </div>
                                    </div>
                                    <div className="flex-1 bg-background/80 backdrop-blur rounded-xl border p-6 flex flex-col gap-4 shadow-sm">
                                        <div className="w-40 h-4 bg-muted rounded-full" />
                                        <div className="flex-1 border-b-2 border-dashed border-primary/30 w-full relative">
                                            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                                                <path d="M0,100 Q25,20 50,50 T100,0" fill="none" stroke="currentColor" className="text-primary" strokeWidth="2" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Product Features Matrix */}
            <section id="product" className="py-24 px-4 bg-muted/30 border-t relative">
                <div className="container mx-auto max-w-6xl">
                    <div className="text-center mb-16 max-w-2xl mx-auto">
                        <h2 className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">The Platform</h2>
                        <h3 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Learn. Simulate. Compete.</h3>
                        <p className="text-muted-foreground text-lg">We gamified the learning process so students build habits that stick.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {PRODUCT_FEATURES.map((feature, idx) => (
                            <Card key={idx} className="bg-background/50 backdrop-blur-sm border-muted/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                                <CardContent className="p-8">
                                    <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                                        <feature.icon className="h-7 w-7 text-primary" />
                                    </div>
                                    <h4 className="text-xl font-bold mb-3">{feature.title}</h4>
                                    <p className="text-muted-foreground leading-relaxed">
                                        {feature.description}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Classroom Mode Section */}
            <section id="classroom" className="py-24 px-4 border-t overflow-hidden relative">
                <div className="container mx-auto max-w-6xl flex flex-col lg:flex-row items-center gap-16">
                    <div className="flex-1 space-y-8 z-10">
                        <Badge variant="outline" className="border-[hsl(var(--accent-indigo))]/30 text-[hsl(var(--accent-indigo))] bg-[hsl(var(--accent-indigo))]/5">
                            <GraduationCap className="h-3 w-3 mr-2" /> For Educators
                        </Badge>
                        <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
                            Total classroom control.
                        </h2>
                        <p className="text-xl text-muted-foreground leading-relaxed">
                            Stockify gives teachers the ultimate dashboard. Grade students on their rationale and risk management, not just raw P&L out-performance.
                        </p>

                        <ul className="space-y-4">
                            {[
                                "Set initial cash and margin requirements.",
                                "Disable specific assets or sectors (e.g. no crypto).",
                                "Require trade journaling for every execution.",
                                "Track 'Process Scores' computed by AI."
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 font-medium">
                                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                                    {item}
                                </li>
                            ))}
                        </ul>

                        <Button size="lg" variant="outline" className="rounded-full shadow-sm mt-4">
                            Explore Teacher Dashboard <ChevronRight className="ml-2 w-4 h-4" />
                        </Button>
                    </div>

                    <div className="flex-1 relative z-10 w-full max-w-md lg:max-w-none">
                        {/* Abstract Teacher Dashboard Graphic */}
                        <div className="aspect-square md:aspect-[4/3] rounded-2xl bg-card border shadow-2xl overflow-hidden flex flex-col">
                            <div className="p-4 border-b bg-muted/20 flex gap-4">
                                <div className="h-8 w-24 bg-muted rounded" />
                                <div className="h-8 w-24 bg-primary/20 rounded" />
                            </div>
                            <div className="flex-1 p-6 space-y-4">
                                <div className="flex gap-4">
                                    <div className="h-12 w-12 rounded-full bg-muted" />
                                    <div className="flex-1 space-y-2 py-1">
                                        <div className="h-4 w-1/3 bg-muted rounded" />
                                        <div className="h-3 w-1/2 bg-muted/60 rounded" />
                                    </div>
                                    <div className="h-8 w-16 bg-green-500/20 rounded text-green-500 text-xs flex items-center justify-center font-bold">A+</div>
                                </div>
                                <div className="h-px w-full bg-border" />
                                <div className="flex gap-4">
                                    <div className="h-12 w-12 rounded-full bg-muted" />
                                    <div className="flex-1 space-y-2 py-1">
                                        <div className="h-4 w-1/4 bg-muted rounded" />
                                        <div className="h-3 w-2/3 bg-muted/60 rounded" />
                                    </div>
                                    <div className="h-8 w-16 bg-yellow-500/20 rounded text-yellow-500 text-xs flex items-center justify-center font-bold">B-</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Testimonials (Placeholder) */}
            <section className="py-24 px-4 bg-muted/30 border-t">
                <div className="container mx-auto max-w-6xl text-center">
                    <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-16">Trusted by 500+ schools.</h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            { quote: "It transformed my econ class. The AI coach asks questions I wish I had time to ask every student.", author: "Sarah J.", role: "Economics Teacher" },
                            { quote: "Way better than the clunky 90s simulators. The students actually want to log in and learn.", author: "Mark T.", role: "High School Admin" },
                            { quote: "I finally understand how options work, safely. The risk preview saved my simulated portfolio.", author: "Alex D.", role: "Student" }
                        ].map((t, i) => (
                            <Card key={i} className="text-left bg-background">
                                <CardContent className="p-8">
                                    <MessageSquare className="h-8 w-8 text-primary/20 mb-6" />
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

            {/* FAQ */}
            <section className="py-24 px-4 border-t">
                <div className="container mx-auto max-w-3xl">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Frequently Asked Questions</h2>
                    </div>
                    <div className="space-y-6">
                        {FAQS.map((faq, i) => (
                            <div key={i} className="border rounded-xl p-6 bg-card/50">
                                <h3 className="text-lg font-bold mb-2">{faq.q}</h3>
                                <p className="text-muted-foreground">{faq.a}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-24 px-4 border-t relative overflow-hidden">
                <div className="absolute inset-0 bg-primary/5 -z-10" />
                <div className="container mx-auto max-w-4xl text-center relative z-10">
                    <Shield className="h-12 w-12 text-primary mx-auto mb-6" />
                    <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Start your risk-free journey.</h2>
                    <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
                        Whether you are a student hungry to learn or a teacher ready to engage your classroom, Stockify takes minutes to start.
                    </p>
                    <Button size="lg" onClick={openApp} className="h-16 px-10 text-lg rounded-full gradient-brand text-white shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all">
                        Open Stockify App
                    </Button>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t py-12 px-4 bg-background">
                <div className="container mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
                            <TrendingUp className="h-3 w-3 text-primary-foreground" />
                        </div>
                        <span className="font-bold text-lg">Stockify</span>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-muted-foreground font-medium">
                        <a href="#" className="hover:text-foreground transition-colors">Terms</a>
                        <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
                        <a href="#" className="hover:text-foreground transition-colors">Help</a>
                    </div>
                    <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Stockify Inc. All rights reserved.</p>
                </div>
            </footer>
        </div>
    )
}
