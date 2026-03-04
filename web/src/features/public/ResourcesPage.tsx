import { useNavigate } from "@tanstack/react-router"
import { BookOpen, FileText, ExternalLink, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PublicNav } from "./PublicNav"
import { PublicFooter } from "./PublicFooter"

const RESOURCES = [
    {
        category: "Getting Started Guides",
        items: [
            { title: "Student Quick Start", description: "Learn how to set up your account, join a class, and make your first trade in under 5 minutes.", icon: BookOpen, type: "Guide" },
            { title: "Teacher Onboarding", description: "Step-by-step guide to creating classes, setting competition rules, and managing your roster.", icon: BookOpen, type: "Guide" },
            { title: "Competition Leader Handbook", description: "Configure scoring systems, trading constraints, and leaderboard rules for your competition.", icon: FileText, type: "PDF" },
        ]
    },
    {
        category: "Curriculum Resources",
        items: [
            { title: "Introduction to Investing", description: "A 10-lesson curriculum covering stocks, bonds, ETFs, risk, diversification, and portfolio construction.", icon: BookOpen, type: "Curriculum" },
            { title: "Understanding Risk & Reward", description: "Interactive lesson plans on probability, expected value, and the mathematics of gambling vs. investing.", icon: FileText, type: "Lesson Plan" },
            { title: "Behavioral Finance Lab: Why the House Always Wins", description: "Classroom activity guide for using the Behavioral Finance Lab to teach expected value, house edge, and cognitive biases.", icon: FileText, type: "Activity" },
        ]
    },
    {
        category: "Research & Reports",
        items: [
            { title: "FINRA Financial Capability Study 2024", description: "National survey data on financial literacy rates among American adults.", icon: ExternalLink, type: "External" },
            { title: "NCAA Student-Athlete Gambling Study", description: "Research on gambling prevalence among college student-athletes.", icon: ExternalLink, type: "External" },
            { title: "NCPG Youth Gambling Factsheet", description: "National Council on Problem Gambling data on adolescent gambling rates.", icon: ExternalLink, type: "External" },
        ]
    },
]

export function ResourcesPage() {
    const navigate = useNavigate()
    return (
        <div className="min-h-screen bg-background text-foreground font-sans">
            <PublicNav />
            <section className="pt-24 pb-16 px-4 relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 rounded-full blur-[120px] -z-10" />
                <div className="container mx-auto max-w-4xl text-center">
                    <Badge variant="outline" className="mb-6 border-primary/20 bg-primary/5 text-primary">Resources</Badge>
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">Guides, curriculum, and research</h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Everything you need to get started and make the most of Stockify in your classroom.</p>
                </div>
            </section>

            {RESOURCES.map((section, si) => (
                <section key={si} className={`py-16 px-4 border-t ${si % 2 === 0 ? 'bg-muted/30' : ''}`}>
                    <div className="container mx-auto max-w-6xl">
                        <h2 className="text-2xl font-bold tracking-tight mb-8">{section.category}</h2>
                        <div className="grid md:grid-cols-3 gap-6">
                            {section.items.map((r, ri) => (
                                <Card key={ri} className="bg-background/50 hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer">
                                    <CardContent className="p-6">
                                        <div className="flex items-center gap-3 mb-4">
                                            <r.icon className="h-6 w-6 text-primary" />
                                            <Badge variant="secondary" className="text-xs">{r.type}</Badge>
                                        </div>
                                        <h3 className="font-bold text-lg mb-2">{r.title}</h3>
                                        <p className="text-sm text-muted-foreground">{r.description}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>
            ))}

            <section className="py-20 px-4 border-t">
                <div className="container mx-auto max-w-4xl text-center">
                    <h2 className="text-3xl font-bold tracking-tight mb-6">Need something specific?</h2>
                    <p className="text-lg text-muted-foreground mb-8">Contact us for custom curriculum alignment, professional development, or district-wide implementation support.</p>
                    <Button size="lg" onClick={() => navigate({ to: "/auth" })} className="rounded-full gradient-brand text-white shadow-lg px-8">
                        Get Started <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                </div>
            </section>
            <PublicFooter />
        </div>
    )
}
