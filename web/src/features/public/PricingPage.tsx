import { useNavigate } from "@tanstack/react-router"
import { Check, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PublicNav } from "./PublicNav"
import { PublicFooter } from "./PublicFooter"

const PLANS = [
    {
        name: "Free",
        price: "$0",
        period: "forever",
        description: "Perfect for individual students exploring investing.",
        features: [
            "1 personal portfolio",
            "Paper trading with real data",
            "5 interactive lessons",
            "Basic portfolio analytics",
            "Behavioral Finance Lab access",
            "Community support",
        ],
        cta: "Get Started Free",
        popular: false,
    },
    {
        name: "Classroom",
        price: "$9",
        period: "per student / semester",
        description: "Full-featured classroom experience for teachers and schools.",
        features: [
            "Unlimited personal portfolios",
            "Competition portfolios",
            "All interactive lessons & quizzes",
            "AI Mentor access",
            "Teacher dashboard & analytics",
            "Configurable competition rules",
            "Trade journaling & process scores",
            "Export reports & gradebook",
            "Priority support",
        ],
        cta: "Start Free Trial",
        popular: true,
    },
    {
        name: "District",
        price: "Custom",
        period: "annual contract",
        description: "Enterprise features for school districts and large organizations.",
        features: [
            "Everything in Classroom",
            "SSO / SAML integration",
            "District-wide analytics",
            "Custom curriculum alignment",
            "Dedicated account manager",
            "SLA & uptime guarantees",
            "Data residency options",
            "Professional development training",
        ],
        cta: "Contact Sales",
        popular: false,
    },
]

export function PricingPage() {
    const navigate = useNavigate()
    return (
        <div className="min-h-screen bg-background text-foreground font-sans">
            <PublicNav />
            <section className="pt-24 pb-16 px-4 relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 rounded-full blur-[120px] -z-10" />
                <div className="container mx-auto max-w-4xl text-center">
                    <Badge variant="outline" className="mb-6 border-primary/20 bg-primary/5 text-primary">Pricing</Badge>
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">Simple, transparent pricing</h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Start free. Scale when you're ready. No hidden fees.</p>
                </div>
            </section>

            <section className="pb-24 px-4">
                <div className="container mx-auto max-w-6xl">
                    <div className="grid md:grid-cols-3 gap-8">
                        {PLANS.map((plan, i) => (
                            <Card key={i} className={`relative overflow-hidden ${plan.popular ? 'border-primary shadow-xl ring-2 ring-primary/20' : 'border-border'}`}>
                                {plan.popular && (
                                    <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">Most Popular</div>
                                )}
                                <CardContent className="p-8">
                                    <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                                    <div className="flex items-baseline gap-1 mb-1">
                                        <span className="text-4xl font-extrabold">{plan.price}</span>
                                        {plan.period !== "annual contract" && <span className="text-muted-foreground text-sm">/ {plan.period}</span>}
                                    </div>
                                    {plan.period === "annual contract" && <span className="text-sm text-muted-foreground">{plan.period}</span>}
                                    <p className="text-sm text-muted-foreground mt-2 mb-6">{plan.description}</p>
                                    <Button
                                        className={`w-full rounded-full mb-6 ${plan.popular ? 'gradient-brand text-white' : ''}`}
                                        variant={plan.popular ? "default" : "outline"}
                                        onClick={() => navigate({ to: "/auth" })}
                                    >
                                        {plan.cta} <ChevronRight className="ml-1 h-4 w-4" />
                                    </Button>
                                    <ul className="space-y-3">
                                        {plan.features.map((f, fi) => (
                                            <li key={fi} className="flex items-start gap-2 text-sm">
                                                <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                                {f}
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>
            <PublicFooter />
        </div>
    )
}
