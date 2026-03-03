import { useNavigate } from "@tanstack/react-router"
import { TrendingUp, ChevronRight, Heart, Shield, Eye, Users, BookOpen, Target, BarChart3, Lightbulb } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PublicNav } from "./PublicNav"
import { PublicFooter } from "./PublicFooter"

const VALUES = [
    { icon: Eye, title: "Transparency Over Hype", description: "Every game, every simulation, every calculation is transparent. We show the math, the odds, and the reasoning behind every feature." },
    { icon: Shield, title: "Process Over Luck", description: "We reward good decision-making processes — research, diversification, risk management — not lucky outcomes or reckless bets." },
    { icon: Heart, title: "Education First", description: "Stockify exists to teach, not to entertain. Every feature serves a learning objective. Even our Casino Math Room is designed to educate." },
    { icon: Users, title: "School-Safe by Design", description: "Built from the ground up to be COPPA/FERPA compliant, age-appropriate, and teacher-controlled. No real money, no real risk." },
]

const PILLARS = [
    { icon: BookOpen, title: "Learn", description: "Interactive micro-lessons on investing fundamentals: risk, compounding, diversification, valuation, and market mechanics." },
    { icon: BarChart3, title: "Simulate", description: "Paper trading with real market data, realistic constraints, and multi-asset support. Build portfolios that matter." },
    { icon: Lightbulb, title: "Reflect", description: "Trade journaling with AI-powered Socratic questioning. Understand why you made each decision." },
    { icon: Target, title: "Improve", description: "XP systems, streaks, and challenges that reward process quality. Get better every day." },
    { icon: TrendingUp, title: "Compete", description: "Classroom competitions with configurable rules, risk-adjusted scoring, and transparent leaderboards." },
]

export function AboutPage() {
    const navigate = useNavigate()

    return (
        <div className="min-h-screen bg-background text-foreground font-sans">
            <PublicNav />

            {/* Hero */}
            <section className="pt-24 pb-16 px-4 relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 rounded-full blur-[120px] -z-10" />
                <div className="container mx-auto max-w-4xl text-center">
                    <Badge variant="outline" className="mb-6 border-primary/20 bg-primary/5 text-primary">About Stockify</Badge>
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-[1.1]">
                        Teaching financial literacy through
                        <span className="bg-gradient-to-r from-primary to-[hsl(var(--accent-indigo))] bg-clip-text text-transparent"> doing, not lecturing.</span>
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                        Stockify is a school-ready financial literacy platform that teaches investing through realistic simulation, interactive lessons, and AI-powered mentorship.
                    </p>
                </div>
            </section>

            {/* Mission */}
            <section className="py-16 px-4 border-t bg-muted/30">
                <div className="container mx-auto max-w-4xl">
                    <h2 className="text-3xl font-bold tracking-tight mb-6">Our Mission</h2>
                    <div className="prose prose-lg max-w-none text-muted-foreground space-y-4">
                        <p className="text-lg leading-relaxed">
                            Financial illiteracy is one of the most widespread and consequential knowledge gaps in modern society. According to FINRA's 2024 National Financial Capability Study, only about 27% of respondents answered at least 5 of 7 basic financial knowledge questions correctly. Meanwhile, youth gambling exposure is accelerating through always-on apps, sports betting culture, and casino-like mechanics embedded in everyday entertainment.
                        </p>
                        <p className="text-lg leading-relaxed">
                            Stockify exists to bridge this gap. We believe that the best way to learn about risk, reward, and long-term thinking is by doing — in a safe, transparent, and educationally rigorous environment. Our platform combines interactive lessons, realistic paper trading, AI mentorship, and classroom competition tools to create a comprehensive financial literacy experience.
                        </p>
                    </div>
                </div>
            </section>

            {/* Who We Serve */}
            <section className="py-16 px-4 border-t">
                <div className="container mx-auto max-w-4xl">
                    <h2 className="text-3xl font-bold tracking-tight mb-8">Who We Serve</h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        {[
                            { title: "Students", desc: "High school and college students learning investing fundamentals, risk management, and financial decision-making in a zero-risk environment." },
                            { title: "Teachers & Educators", desc: "Economics, business, and personal finance teachers who need classroom-ready tools with full control over rules, scoring, and student oversight." },
                            { title: "Schools & Districts", desc: "Educational institutions seeking COPPA/FERPA compliant financial literacy programs that integrate with existing curricula." },
                            { title: "Clubs & Competitions", desc: "Investment clubs, DECA chapters, and finance competitions that need configurable trading simulations with leaderboards." },
                        ].map((item, i) => (
                            <Card key={i} className="bg-card/50">
                                <CardContent className="p-6">
                                    <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Core Values */}
            <section className="py-16 px-4 border-t bg-muted/30">
                <div className="container mx-auto max-w-6xl">
                    <h2 className="text-3xl font-bold tracking-tight mb-8 text-center">Core Philosophy</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {VALUES.map((v, i) => (
                            <Card key={i} className="bg-background/50 hover:shadow-lg transition-all">
                                <CardContent className="p-6">
                                    <v.icon className="h-8 w-8 text-primary mb-4" />
                                    <h3 className="font-bold mb-2">{v.title}</h3>
                                    <p className="text-sm text-muted-foreground">{v.description}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Gambling vs Investing Perspective */}
            <section className="py-16 px-4 border-t">
                <div className="container mx-auto max-w-4xl">
                    <h2 className="text-3xl font-bold tracking-tight mb-6">The Gambling vs. Investing Perspective</h2>
                    <div className="space-y-4 text-muted-foreground">
                        <p className="text-lg leading-relaxed">
                            Many teens today learn about "risk" through gambling-style products that reward randomness, not skill. Sports betting apps, loot boxes, and crypto speculation create a distorted understanding of probability and expected value.
                        </p>
                        <p className="text-lg leading-relaxed">
                            Stockify takes a different approach. Our Casino Math Room doesn't hide the house edge — it exposes it. Students play common casino games and watch their balance erode over time, viscerally experiencing why negative expected value guarantees long-term loss. Then they compare this to investing, where positive expected value, compounding, and diversification create wealth over time.
                        </p>
                        <p className="text-lg leading-relaxed">
                            We don't demonize gambling or moralize about it. We simply show the math. Education through transparency is more powerful than prohibition through fear.
                        </p>
                    </div>
                </div>
            </section>

            {/* How the Product is Built */}
            <section className="py-16 px-4 border-t bg-muted/30">
                <div className="container mx-auto max-w-6xl">
                    <h2 className="text-3xl font-bold tracking-tight mb-8 text-center">How Stockify is Built</h2>
                    <div className="grid md:grid-cols-5 gap-6">
                        {PILLARS.map((p, i) => (
                            <div key={i} className="text-center">
                                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                    <p.icon className="h-7 w-7 text-primary" />
                                </div>
                                <h3 className="font-bold mb-2">{p.title}</h3>
                                <p className="text-xs text-muted-foreground">{p.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 px-4 border-t">
                <div className="container mx-auto max-w-4xl text-center">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">Ready to bring financial literacy to your classroom?</h2>
                    <p className="text-lg text-muted-foreground mb-8">Join hundreds of schools using Stockify to teach investing, risk, and long-term thinking.</p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Button size="lg" onClick={() => navigate({ to: "/auth" })} className="rounded-full gradient-brand text-white shadow-lg px-8">
                            Get Started Free <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                        <Button size="lg" variant="outline" className="rounded-full px-8">
                            Contact Sales
                        </Button>
                    </div>
                </div>
            </section>

            <PublicFooter />
        </div>
    )
}
