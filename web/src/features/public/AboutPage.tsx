import { useNavigate } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PublicNav } from "./PublicNav"
import { PublicFooter } from "./PublicFooter"
import {
    TrendingUp, Users, GraduationCap, Shield, Brain,
    FlaskConical, BarChart3, Target, Eye, Lightbulb,
    CheckCircle2, ChevronRight, Heart, Zap, BookOpen,
    Lock, Award, Rocket
} from "lucide-react"

const WHO_WE_SERVE = [
    { icon: Users, title: "Students", description: "High school and college students learning to invest for the first time. Build real skills before risking real money." },
    { icon: GraduationCap, title: "Teachers & Advisors", description: "Economics, business, and personal finance educators who need a modern, engaging classroom tool with full control." },
    { icon: Target, title: "Schools & Districts", description: "Institutions seeking COPPA/FERPA compliant financial literacy programs with measurable learning outcomes." },
    { icon: Award, title: "DECA & Business Clubs", description: "Competition teams that need realistic trading simulation, portfolio analytics, and presentation-ready data." },
]

const PHILOSOPHY = [
    { icon: Eye, title: "Transparency", description: "Every house edge, every fee, every risk metric is disclosed. We never hide the math. Students learn by seeing the truth." },
    { icon: Brain, title: "Process Over Outcomes", description: "We grade students on their reasoning, risk management, and journaling — not just returns. Good process leads to good outcomes." },
    { icon: BookOpen, title: "Education First", description: "Every feature exists to teach. The Behavioral Finance Lab teaches probability. The AI Mentor teaches critical thinking. The journal teaches reflection." },
    { icon: Lock, title: "Safety & Compliance", description: "COPPA/FERPA compliant. No real money. Age-appropriate content. Full teacher oversight. School-safe by design." },
]

const DIFFERENTIATORS = [
    "AI-powered mentorship with 4 modes (Coach, Analyst, Socratic, Challenge) that adapts to each student",
    "Behavioral Finance Lab that connects probability training to investing habits — ethically and transparently",
    "Competition engine with configurable rules, scoring methods, and join codes built for classrooms",
    "Structured trade journaling with reflection prompts and AI-powered pattern insights",
    "Risk analytics dashboard with concentration (HHI), max drawdown, volatility, and beta metrics",
    "Process scores that measure learning outcomes, not just portfolio returns",
    "Real market data with realistic execution including fees, slippage, and constraints",
    "Full teacher dashboard with roster management, rules editor, analytics, and export tools",
]

export function AboutPage() {
    const navigate = useNavigate()

    return (
        <div className="min-h-screen bg-background text-foreground">
            <PublicNav />

            {/* Hero */}
            <section className="relative pt-24 pb-20 px-4 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 rounded-full blur-[120px] -z-10 pointer-events-none" />
                <div className="container mx-auto max-w-4xl text-center">
                    <Badge variant="outline" className="mb-6 py-1.5 px-4 text-xs font-medium rounded-full border-primary/20 bg-primary/5 text-primary">
                        Our Mission
                    </Badge>
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-8 leading-[1.1]">
                        Empowering the next generation of{" "}
                        <span className="bg-gradient-to-r from-primary via-[hsl(var(--accent-indigo))] to-primary bg-clip-text text-transparent">
                            informed investors
                        </span>
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                        Stockify exists because financial literacy should not be learned through losses. We built the platform we wish existed when we were students — one that teaches investing through doing, not just reading.
                    </p>
                </div>
            </section>

            {/* Why Now */}
            <section className="py-20 px-4 bg-muted/30 border-t">
                <div className="container mx-auto max-w-6xl">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <Badge variant="outline" className="mb-4 border-destructive/30 text-destructive bg-destructive/5">
                                <Zap className="h-3 w-3 mr-2" /> Why Now
                            </Badge>
                            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
                                A generation at risk
                            </h2>
                            <div className="space-y-4 text-muted-foreground leading-relaxed">
                                <p>
                                    Youth gambling has exploded. Sports betting apps, crypto speculation, and casino-like interfaces are teaching young people that "risk" means "excitement" — not something to be managed.
                                </p>
                                <p>
                                    Meanwhile, only 27% of adults can pass a basic financial literacy test. Students graduate without understanding compound interest, diversification, or the difference between positive and negative expected value.
                                </p>
                                <p className="font-medium text-foreground">
                                    Stockify bridges this gap. We use the same engagement mechanics that make gambling apps addictive — but redirect them toward education, transparency, and measurable skill-building.
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { value: "73%", label: "of adults fail basic financial literacy tests", color: "destructive" },
                                { value: "45%", label: "of young male athletes have gambled on sports", color: "destructive" },
                                { value: "$0", label: "real money at risk on Stockify", color: "primary" },
                                { value: "100%", label: "transparent math in every simulation", color: "primary" },
                            ].map((stat, i) => (
                                <Card key={i} className="text-center">
                                    <CardContent className="p-6">
                                        <div className={`text-3xl font-extrabold mb-2 ${stat.color === 'destructive' ? 'text-destructive' : 'text-primary'}`}>{stat.value}</div>
                                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Who We Serve */}
            <section className="py-20 px-4 border-t">
                <div className="container mx-auto max-w-6xl">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Who We Serve</h2>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Stockify is built for everyone in the financial education ecosystem.</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {WHO_WE_SERVE.map((item, i) => (
                            <Card key={i} className="hover:shadow-lg transition-all hover:-translate-y-1">
                                <CardContent className="p-6 text-center">
                                    <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                        <item.icon className="h-7 w-7 text-primary" />
                                    </div>
                                    <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                                    <p className="text-sm text-muted-foreground">{item.description}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Philosophy */}
            <section className="py-20 px-4 bg-muted/30 border-t">
                <div className="container mx-auto max-w-6xl">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Our Philosophy</h2>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Four principles that guide every feature we build.</p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        {PHILOSOPHY.map((item, i) => (
                            <Card key={i} className="bg-background">
                                <CardContent className="p-8 flex gap-5">
                                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                        <item.icon className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                                        <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* What Makes Stockify Different */}
            <section className="py-20 px-4 border-t">
                <div className="container mx-auto max-w-4xl">
                    <div className="text-center mb-12">
                        <Badge variant="outline" className="mb-4 border-primary/30 text-primary bg-primary/5">
                            <Rocket className="h-3 w-3 mr-2" /> Competitive Edge
                        </Badge>
                        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">What Makes Stockify Different</h2>
                        <p className="text-lg text-muted-foreground">Features that map directly to measurable learning outcomes.</p>
                    </div>
                    <div className="space-y-4">
                        {DIFFERENTIATORS.map((item, i) => (
                            <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-card border hover:shadow-md transition-all">
                                <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                <span className="text-sm font-medium">{item}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* The Behavioral Finance Perspective */}
            <section className="py-20 px-4 bg-muted/30 border-t">
                <div className="container mx-auto max-w-4xl">
                    <h2 className="text-3xl font-bold tracking-tight mb-6">The Behavioral Finance Perspective</h2>
                    <div className="space-y-4 text-muted-foreground">
                        <p className="text-lg leading-relaxed">
                            Many teens today learn about "risk" through gambling-style products that reward randomness, not skill. Sports betting apps, loot boxes, and crypto speculation create a distorted understanding of probability and expected value.
                        </p>
                        <p className="text-lg leading-relaxed">
                            Stockify takes a different approach. Our Behavioral Finance Lab does not hide the house edge — it exposes it. Students experience common probability scenarios and watch their balance erode over time, viscerally understanding why negative expected value guarantees long-term loss. Then they connect this to investing, where positive expected value, compounding, and diversification create wealth over time.
                        </p>
                        <p className="text-lg leading-relaxed">
                            We do not demonize gambling or moralize about it. We simply show the math. Education through transparency is more powerful than prohibition through fear.
                        </p>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 px-4 bg-primary/5 border-t">
                <div className="container mx-auto max-w-3xl text-center">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">Ready to transform financial education?</h2>
                    <p className="text-lg text-muted-foreground mb-8">Join the schools and students already using Stockify.</p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Button size="lg" onClick={() => navigate({ to: "/auth" })} className="rounded-full gradient-brand text-white shadow-md h-14 px-8">
                            Start Free <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                        <Button size="lg" variant="outline" onClick={() => window.location.href = 'mailto:hello@stockify.app?subject=Demo Request'} className="rounded-full h-14 px-8">
                            Request a Demo
                        </Button>
                    </div>
                </div>
            </section>

            <PublicFooter />
        </div>
    )
}
