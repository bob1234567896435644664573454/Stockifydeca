import { useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useNavigate } from "@tanstack/react-router"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { supabase } from "@/lib/api"
import { useAuth } from "@/features/auth/AuthContextObject"
import { toast } from "sonner"
import { validateAndReportInvariants } from "@/lib/portfolio-invariants"
import {
    Sparkles, GraduationCap, Target, Zap, Loader2,
    CheckCircle2, ArrowRight, Shield, PenLine, BarChart3
} from "lucide-react"

const EXPERIENCE_LEVELS = [
    { id: "beginner", label: "I'm Brand New", description: "Never traded before. Teach me everything!", icon: "🌱" },
    { id: "intermediate", label: "I Know the Basics", description: "I understand stocks and orders, but want to improve.", icon: "📈" },
    { id: "advanced", label: "I'm Experienced", description: "I know my way around. Show me the advanced tools.", icon: "🧠" },
]

const GOALS = [
    { id: "learn", label: "Learn the Basics", icon: GraduationCap, description: "Understand how markets work" },
    { id: "compete", label: "Win Competitions", icon: Target, description: "Beat my classmates" },
    { id: "build", label: "Build a Portfolio", icon: Sparkles, description: "Practice real investing" },
    { id: "explore", label: "Just Explore", icon: Zap, description: "See what this is all about" },
]

export function OnboardingPage() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [step, setStep] = useState(0)
    const [experience, setExperience] = useState("")
    const [goal, setGoal] = useState("")
    const [classCode, setClassCode] = useState("")
    const [joinError, setJoinError] = useState("")

    const validateInitializedAccount = useCallback(async () => {
        if (!user?.id) return
        const { data, error } = await supabase
            .from("trading_accounts")
            .select("id,cash_balance")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()

        if (error || !data) return

        const cash = Number(data.cash_balance ?? 0)
        validateAndReportInvariants({
            positions: [],
            cash,
            equity: cash,
            scope: "onboarding.account_init",
            metadata: {
                accountId: data.id,
                userId: user.id,
            },
        })
    }, [user?.id])

    const steps = [
        { title: "Welcome to Stockify", subtitle: "Let's personalize your experience" },
        { title: "What's your goal?", subtitle: "We'll tailor your journey" },
        { title: "How you're graded", subtitle: "Process-first — not just profit" },
        { title: "Join your class", subtitle: "Enter the code from your teacher" },
        { title: "You're all set!", subtitle: "Let's start your first lesson" },
    ]

    // Persist preferences to Supabase
    const savePreferences = useMutation({
        mutationFn: async () => {
            if (!user?.id) throw new Error("Not authenticated")
            const { error } = await supabase.from("user_preferences").upsert({
                user_id: user.id,
                experience_level: experience,
                goal,
                onboarding_completed: true,
                xp: 50, // welcome bonus
            })
            if (error) throw error
        },
        onError: (err: Error) => {
            // Don't block — preferences are nice-to-have
            console.warn("Failed to save preferences:", err.message)
        },
    })

    // Join class via API (reuses existing JoinClassWizard logic)
    const joinClass = useMutation({
        mutationFn: async (code: string) => {
            return api.post("/class/resolve-code", { code })
        },
        onSuccess: async (data: any) => {
            // Found the class — now join it
            try {
                await api.post("/class/join", { class_id: data.id })
                await validateInitializedAccount()
                queryClient.invalidateQueries({ queryKey: ["student", "classes"] })
                toast.success(`Joined ${data.name}!`)
            } catch (err: any) {
                toast.error(err?.message || "Failed to join class")
            }
            setStep(4)
        },
        onError: (err: Error) => {
            setJoinError(err.message || "Invalid class code. Check with your teacher.")
        },
    })

    const handleContinueToStep4 = useCallback(async () => {
        // Save preferences before moving to step 4 (class join)
        savePreferences.mutate()
        if (classCode.length >= 4) {
            setJoinError("")
            joinClass.mutate(classCode)
        } else {
            // Skipped class join
            setStep(4)
        }
    }, [classCode, savePreferences, joinClass])

    const handleFinish = useCallback(async () => {
        // If preferences haven't been saved yet (e.g., skipped class), save now
        if (!savePreferences.isSuccess) {
            savePreferences.mutate()
        }
        await validateInitializedAccount()
        navigate({ to: "/app/learn" })
    }, [navigate, savePreferences, validateInitializedAccount])

    const isPending = savePreferences.isPending || joinClass.isPending

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-lg animate-fade-in">
                {/* Progress indicator */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    {steps.map((_, i) => (
                        <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i <= step ? 'w-8 bg-primary' : 'w-4 bg-muted'}`} />
                    ))}
                </div>

                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold tracking-tight">{steps[step].title}</h1>
                    <p className="text-sm text-muted-foreground mt-1">{steps[step].subtitle}</p>
                </div>

                {/* Step 0: Experience Level */}
                {step === 0 && (
                    <div className="space-y-3 animate-slide-up">
                        {EXPERIENCE_LEVELS.map(level => (
                            <Card
                                key={level.id}
                                className={`cursor-pointer transition-all ${experience === level.id ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50'}`}
                                onClick={() => setExperience(level.id)}
                            >
                                <CardContent className="p-4 flex items-center gap-4">
                                    <span className="text-3xl">{level.icon}</span>
                                    <div className="flex-1">
                                        <div className="font-semibold text-sm">{level.label}</div>
                                        <div className="text-xs text-muted-foreground">{level.description}</div>
                                    </div>
                                    {experience === level.id && <CheckCircle2 className="h-5 w-5 text-primary" />}
                                </CardContent>
                            </Card>
                        ))}
                        <Button className="w-full mt-4" disabled={!experience} onClick={() => setStep(1)}>
                            Continue <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                )}

                {/* Step 1: Goal */}
                {step === 1 && (
                    <div className="space-y-3 animate-slide-up">
                        <div className="grid grid-cols-2 gap-3">
                            {GOALS.map(g => {
                                const Icon = g.icon
                                return (
                                    <Card
                                        key={g.id}
                                        className={`cursor-pointer transition-all ${goal === g.id ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50'}`}
                                        onClick={() => setGoal(g.id)}
                                    >
                                        <CardContent className="p-4 text-center">
                                            <Icon className="h-8 w-8 mx-auto mb-2 text-primary" />
                                            <div className="font-semibold text-sm">{g.label}</div>
                                            <div className="text-[10px] text-muted-foreground mt-0.5">{g.description}</div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                        <Button className="w-full mt-4" disabled={!goal} onClick={() => setStep(2)}>
                            Continue <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                )}

                {/* Step 2: Learning Culture — Process-First */}
                {step === 2 && (
                    <div className="space-y-3 animate-slide-up">
                        {[
                            {
                                icon: BarChart3,
                                title: "Process-first scoring",
                                desc: "You're graded on diversification, journaling quality, and thesis strength — not just profits.",
                                color: "#8b5cf6",
                            },
                            {
                                icon: Shield,
                                title: "Risk preview before every trade",
                                desc: "Before you submit, you'll see exactly how each trade changes your portfolio concentration, cash, and risk.",
                                color: "#10b981",
                            },
                            {
                                icon: PenLine,
                                title: "Journaling builds real skill",
                                desc: "After every trade, you'll reflect: What was your thesis? What would make you wrong? This is where real learning happens.",
                                color: "#06b6d4",
                            },
                        ].map((item) => (
                            <Card key={item.title} className="border-muted">
                                <CardContent className="p-4 flex items-start gap-3">
                                    <div
                                        className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                                        style={{ backgroundColor: item.color + "18" }}
                                    >
                                        <item.icon className="h-4 w-4" style={{ color: item.color }} />
                                    </div>
                                    <div>
                                        <div className="font-semibold text-sm">{item.title}</div>
                                        <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        <Button className="w-full mt-4" onClick={() => setStep(3)}>
                            Got it — let's go <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                )}

                {/* Step 3: Join Class */}
                {step === 3 && (
                    <div className="space-y-4 animate-slide-up">
                        <Card>
                            <CardContent className="p-6 text-center space-y-4">
                                <div className="h-16 w-16 rounded-2xl gradient-brand flex items-center justify-center mx-auto">
                                    <GraduationCap className="h-8 w-8 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Enter your class code</p>
                                    <p className="text-xs text-muted-foreground">Your teacher will give you a 6-character code.</p>
                                </div>
                                <Input
                                    value={classCode}
                                    onChange={e => {
                                        setClassCode(e.target.value.toUpperCase())
                                        setJoinError("")
                                    }}
                                    placeholder="ABC123"
                                    className="text-center text-2xl font-bold tracking-[0.3em] h-14"
                                    maxLength={8}
                                />
                                {joinError && (
                                    <p className="text-xs text-destructive animate-slide-up">{joinError}</p>
                                )}
                            </CardContent>
                        </Card>
                        <Button
                            className="w-full"
                            disabled={isPending}
                            onClick={handleContinueToStep4}
                        >
                            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {classCode.length >= 4 ? "Join Class" : "Continue"} <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                        {classCode.length >= 4 && (
                            <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => { setClassCode(""); setStep(4); savePreferences.mutate(); }}>
                                Skip for now
                            </Button>
                        )}
                        {classCode.length < 4 && (
                            <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => { setStep(4); savePreferences.mutate(); }}>
                                Skip — I don't have a code
                            </Button>
                        )}
                    </div>
                )}

                {/* Step 4: Ready! */}
                {step === 4 && (
                    <div className="text-center space-y-6 animate-scale-in">
                        <div className="text-6xl">🚀</div>
                        <div>
                            <Badge className="bg-[hsl(var(--chart-up))]/10 text-[hsl(var(--chart-up))] border-0 mb-3">+50 XP Welcome Bonus</Badge>
                            <p className="text-sm text-muted-foreground">
                                Your simulation account is ready with $100,000 in virtual cash.<br />
                                Let's start with your first lesson!
                            </p>
                        </div>
                        <Button size="lg" className="gradient-brand text-white border-0 shadow-lg glow-primary" onClick={handleFinish}>
                            <Zap className="h-4 w-4 mr-2" /> Start Learning
                        </Button>
                    </div>
                )}
            </div>
        </div >
    )
}
